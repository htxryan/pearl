import Fastify, { type FastifyError } from "fastify";
import type { Config } from "./config.js";
import { DoltServerManager } from "./dolt/server-manager.js";
import { createDoltPool, destroyPool, beginSync, endSync } from "./dolt/pool.js";
import { createReplica, syncReplica, cleanupReplica } from "./dolt/replica-sync.js";
import { WriteService } from "./write-service/write-service.js";
import { registerIssueRoutes } from "./routes/issues.js";
import { registerDependencyRoutes } from "./routes/dependencies.js";
import { registerStatsRoutes } from "./routes/stats.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerSetupRoutes } from "./routes/setup.js";
import { registerLabelRoutes } from "./routes/labels.js";
import { AppError } from "./errors.js";

export async function createServer(initialConfig: Config) {
  // Mutable config — updated after setup completes
  let config = initialConfig;
  const app = Fastify({
    logger: {
      level: "info",
      transport: {
        target: "pino-pretty",
        options: { translateTime: "HH:MM:ss", ignore: "pid,hostname" },
      },
    },
  });

  const isEmbedded = config.doltMode === "embedded";
  const isServerMode = config.doltMode === "server";

  // ─── Dolt SQL Server Lifecycle ─────────────────────────
  // In embedded mode, the SQL server runs on the REPLICA (not primary).
  // bd CLI writes to primary; replica is synced after each write.
  // In server mode, no subprocess — we connect to an external Dolt server.
  let doltManager: DoltServerManager | null = null;
  let initialStartupDone = false;

  if (!isServerMode) {
    const serverDbPath = isEmbedded ? config.replicaPath : undefined;
    doltManager = new DoltServerManager(config, serverDbPath);

    doltManager.onStateChange(async (state) => {
      app.log.info(`[dolt] Server state: ${state}`);
      if (state === "running" && initialStartupDone) {
        // Recovery path only — initial pool creation handled in startup()
        app.log.info("Dolt server recovered, recreating connection pool...");
        await destroyPool();
        createDoltPool(config);
      }
    });
  }

  // ─── Connection Pool ──────────────────────────────────
  // Pool is created after Dolt server starts (embedded) or immediately (server mode)

  // ─── Write Service ────────────────────────────────────
  // In embedded mode, sync the replica after each write:
  // stop SQL server → copy primary → replica → restart SQL → recreate pool
  //
  // The sync barrier (beginSync/endSync) makes concurrent reads wait
  // instead of failing immediately while the server is restarting.
  // Recovery logic ensures the server is always restarted, even on errors.
  //
  // In server mode, writes go through bd CLI which writes to the external
  // server directly — no sync hook needed.
  const SYNC_TIMEOUT_MS = 30_000;

  const onAfterWrite = isEmbedded
    ? async () => {
        // doltManager is guaranteed non-null when isEmbedded is true
        // (set in the `if (!isServerMode)` block above).
        const manager = doltManager!;

        app.log.info("[replica] Syncing replica after write...");
        const start = Date.now();
        beginSync();
        try {
          await destroyPool();
          await manager.stop();

          // Guard against cp or start() hanging indefinitely (P2)
          const syncOp = async () => {
            await syncReplica(config.doltDbPath, config.replicaPath);
            await manager.start();
          };
          const timeout = new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error("Replica sync timed out")),
              SYNC_TIMEOUT_MS
            )
          );
          await Promise.race([syncOp(), timeout]);

          if (manager.getState() === "running") {
            createDoltPool(config);
          }
          app.log.info(`[replica] Sync completed in ${Date.now() - start}ms`);
        } catch (err) {
          // Recovery: ensure the server and pool are restored so reads
          // don't stay permanently broken (P0).
          app.log.error({ err }, "[replica] Sync failed, attempting recovery...");
          try {
            if (manager.getState() !== "running") {
              await manager.start();
            }
            if (manager.getState() === "running") {
              createDoltPool(config);
              app.log.info("[replica] Recovery successful");
            }
          } catch (recoveryErr) {
            app.log.error({ err: recoveryErr }, "[replica] Recovery failed");
          }
          throw err;
        } finally {
          endSync();
        }
      }
    : undefined;

  const writeService = new WriteService(config, onAfterWrite);

  // ─── Error Handler ────────────────────────────────────
  app.setErrorHandler((error: FastifyError | AppError, _request, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send(error.toApiError());
    }

    // Fastify validation errors
    if ("validation" in error && error.validation) {
      app.log.warn({ validation: error.validation }, "Request validation failed");
      return reply.code(400).send({
        code: "VALIDATION_ERROR",
        message: "Invalid request parameters",
        retryable: false,
      });
    }

    app.log.error(error);
    return reply.code(500).send({
      code: "INTERNAL_ERROR",
      message: "An internal error occurred",
      retryable: false,
    });
  });

  // ─── CORS ─────────────────────────────────────────────
  // Server binds to 127.0.0.1 only, so wildcard origin is safe.
  // A restrictive origin would break frontend dev servers on different ports.
  app.addHook("onRequest", async (request, reply) => {
    reply.header("Access-Control-Allow-Origin", "*");
    reply.header(
      "Access-Control-Allow-Methods",
      "GET, POST, PATCH, DELETE, OPTIONS"
    );
    reply.header(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );

    if (request.method === "OPTIONS") {
      return reply.code(204).send();
    }
  });

  // ─── Content type ─────────────────────────────────────
  app.addContentTypeParser(
    "application/json",
    { parseAs: "string", bodyLimit: 1048576 },
    (_req, body, done) => {
      try {
        const json = body ? JSON.parse(body as string) : {};
        done(null, json);
      } catch (err) {
        done(err as Error, undefined);
      }
    }
  );

  // ─── Setup Mode Guard ─────────────────────────────────
  // When in setup mode, block all non-setup/health routes with a 503.
  // This flag is flipped to false after setup completes.
  let setupMode = config.needsSetup;

  app.addHook("onRequest", async (request, reply) => {
    if (!setupMode) return;
    const url = request.url;
    // Allow setup and health endpoints through
    if (url.startsWith("/api/setup") || url.startsWith("/api/health")) return;
    // Block all other API routes
    if (url.startsWith("/api/")) {
      return reply.code(503).send({
        code: "SETUP_REQUIRED",
        message: "Project setup required. Visit /setup to configure.",
        retryable: false,
      });
    }
  });

  // ─── Register Routes ─────────────────────────────────
  registerSetupRoutes(app, {
    getConfig: () => config,
    onSetupComplete: async (newConfig: Config) => {
      config = newConfig;

      // Initialize Dolt with the new config
      if (newConfig.doltMode === "embedded") {
        app.log.info(`[setup] Creating replica at ${newConfig.replicaPath}...`);
        await createReplica(newConfig.doltDbPath, newConfig.replicaPath);

        // Create a new DoltServerManager for the new config
        doltManager = new DoltServerManager(newConfig, newConfig.replicaPath);
        doltManager.onStateChange(async (state) => {
          app.log.info(`[dolt] Server state: ${state}`);
          if (state === "running" && initialStartupDone) {
            app.log.info("Dolt server recovered, recreating connection pool...");
            await destroyPool();
            createDoltPool(newConfig);
          }
        });

        app.log.info("[setup] Starting Dolt SQL server...");
        await doltManager.start();

        if (doltManager.getState() === "running") {
          createDoltPool(newConfig);
          app.log.info("[setup] Dolt SQL server running, pool created");
        }
      } else {
        // Server mode: just create the pool
        app.log.info(`[setup] Connecting to Dolt at ${newConfig.doltHost}:${newConfig.doltPort}...`);
        createDoltPool(newConfig);
      }

      // Update write service with new config and correct after-write hook
      writeService.updateConfig(newConfig);
      if (newConfig.doltMode === "server") {
        // Server mode: no replica sync needed
        writeService.setAfterWriteHook(undefined);
      }
      // For embedded mode, the existing onAfterWrite closure already reads
      // the current doltManager and config via lexical scope.

      initialStartupDone = true;
      setupMode = false;
      app.log.info("[setup] Setup complete, all routes active");
    },
  });
  const getConfig = () => config;
  const getDoltManager = () => doltManager;

  registerIssueRoutes(app, getConfig, writeService);
  registerDependencyRoutes(app, getConfig, writeService);
  registerStatsRoutes(app, getConfig);
  registerHealthRoutes(app, getDoltManager, getConfig);
  registerLabelRoutes(app, getConfig);

  // ─── Lifecycle ────────────────────────────────────────
  const startup = async () => {
    if (config.needsSetup) {
      app.log.info("No .beads/ directory found — running in setup mode");
      app.log.info("Visit /setup to configure your project");
      initialStartupDone = true;
      return;
    }

    if (isServerMode) {
      // Server mode: connect directly to external Dolt SQL server
      app.log.info(
        `Connecting to external Dolt SQL server at ${config.doltHost}:${config.doltPort}...`
      );
      createDoltPool(config);
      app.log.info("Connection pool created for external Dolt server");
    } else {
      // Embedded mode: manage our own Dolt SQL server process
      app.log.info(`Starting Dolt SQL server on port ${config.doltPort}...`);
      app.log.info(`Database path: ${config.doltDbPath}`);

      if (isEmbedded) {
        app.log.info(`[replica] Creating replica at ${config.replicaPath}...`);
        await createReplica(config.doltDbPath, config.replicaPath);
        app.log.info(`[replica] Replica created, starting SQL server on replica`);
      }

      await doltManager!.start();

      if (doltManager!.getState() === "running") {
        app.log.info("Dolt SQL server is running, creating connection pool...");
        createDoltPool(config);
      } else {
        app.log.warn(
          "Dolt SQL server failed to start — running in degraded mode"
        );
      }
    }

    initialStartupDone = true;
  };

  const shutdown = async () => {
    app.log.info("Shutting down...");
    await destroyPool();

    if (doltManager) {
      await doltManager.stop();
    }

    // In embedded mode, clean up the replica directory
    if (config.doltMode === "embedded" && config.replicaPath) {
      app.log.info("[replica] Cleaning up replica directory...");
      await cleanupReplica(config.replicaPath);
    }
  };

  return { app, startup, shutdown, doltManager };
}
