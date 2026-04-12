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
import { AppError } from "./errors.js";

export async function createServer(config: Config) {
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
        app.log.info("[replica] Syncing replica after write...");
        const start = Date.now();
        beginSync();
        try {
          await destroyPool();
          await doltManager!.stop();

          // Guard against cp or start() hanging indefinitely (P2)
          const syncOp = async () => {
            await syncReplica(config.doltDbPath, config.replicaPath);
            await doltManager!.start();
          };
          const timeout = new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error("Replica sync timed out")),
              SYNC_TIMEOUT_MS
            )
          );
          await Promise.race([syncOp(), timeout]);

          if (doltManager!.getState() === "running") {
            createDoltPool(config);
          }
          app.log.info(`[replica] Sync completed in ${Date.now() - start}ms`);
        } catch (err) {
          // Recovery: ensure the server and pool are restored so reads
          // don't stay permanently broken (P0).
          app.log.error({ err }, "[replica] Sync failed, attempting recovery...");
          try {
            if (doltManager!.getState() !== "running") {
              await doltManager!.start();
            }
            if (doltManager!.getState() === "running") {
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

  // ─── Register Routes ─────────────────────────────────
  registerIssueRoutes(app, config, writeService);
  registerDependencyRoutes(app, config, writeService);
  registerStatsRoutes(app, config);
  registerHealthRoutes(app, doltManager, config);

  // ─── Lifecycle ────────────────────────────────────────
  const startup = async () => {
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
    if (isEmbedded) {
      app.log.info("[replica] Cleaning up replica directory...");
      await cleanupReplica(config.replicaPath);
    }
  };

  return { app, startup, shutdown, doltManager };
}
