import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import fastifyStatic from "@fastify/static";
import Fastify, { type FastifyError } from "fastify";
import type { Config } from "./config.js";
import { beginSync, createDoltPool, destroyPool, endSync } from "./dolt/pool.js";
import { cleanupReplica, createReplica, syncReplica } from "./dolt/replica-sync.js";
import { DoltServerManager } from "./dolt/server-manager.js";
import { AppError } from "./errors.js";
import { registerDependencyRoutes } from "./routes/dependencies.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerIssueRoutes } from "./routes/issues.js";
import { ensureLabelDefinitionsTable, registerLabelRoutes } from "./routes/labels.js";
import { registerMigrationRoutes } from "./routes/migration.js";
import { registerSetupRoutes } from "./routes/setup.js";
import { registerStatsRoutes } from "./routes/stats.js";
import { WriteService } from "./write-service/write-service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Find the frontend dist directory for static file serving.
 * Only returns a path when running from an installed package (not in dev mode).
 * In dev mode (workspace detected), Vite dev server handles the frontend.
 */
export function findFrontendDist(startDir: string = __dirname): string | null {
  // Skip static serving in dev mode — Vite handles it.
  // Walk upward from startDir looking for pnpm-workspace.yaml with Pearl's
  // frontend package, which indicates we're in the dev workspace.
  if (isPearlWorkspace(startDir)) return null;

  // Published package layout: pearl-bdui/frontend-dist/
  const publishedPath = resolve(startDir, "..", "frontend-dist");
  if (existsSync(resolve(publishedPath, "index.html"))) return publishedPath;

  return null;
}

/**
 * Detect the Pearl development workspace by walking upward to find
 * pnpm-workspace.yaml AND the Pearl frontend package at the expected path.
 * The two-condition check avoids false positives when pearl-bdui is installed
 * inside any other pnpm monorepo.
 */
function isPearlWorkspace(startDir: string): boolean {
  let dir = resolve(startDir);
  for (let i = 0; i < 10; i++) {
    if (
      existsSync(resolve(dir, "pnpm-workspace.yaml")) &&
      existsSync(resolve(dir, "packages", "frontend", "package.json"))
    )
      return true;
    const parent = resolve(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  return false;
}

export async function createServer(initialConfig: Config) {
  // Mutable config — updated after setup completes
  let config = initialConfig;
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || "info",
      ...(process.env.NODE_ENV === "production"
        ? {}
        : {
            transport: {
              target: "pino-pretty",
              options: { translateTime: "HH:mm:ss", ignore: "pid,hostname" },
            },
          }),
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

  // ─── Replica Sync (shared) ────────────────────────────
  // Single implementation used by both onAfterWrite and /api/sync.
  // beginSync() throws if a sync is already in progress, preventing
  // concurrent syncs from corrupting the barrier.
  const doReplicaSync = isEmbedded
    ? async (logPrefix: string): Promise<{ elapsedMs: number }> => {
        const manager = doltManager!;
        app.log.info(`${logPrefix} Syncing replica...`);
        const start = Date.now();

        // Throws "Sync already in progress" if another sync is running
        beginSync();
        try {
          await destroyPool();
          await manager.stop();

          const syncOp = async () => {
            await syncReplica(config.doltDbPath, config.replicaPath);
            await manager.start();
          };
          let timer: ReturnType<typeof setTimeout>;
          const timeout = new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error("Replica sync timed out")), SYNC_TIMEOUT_MS);
          });
          try {
            await Promise.race([syncOp(), timeout]);
          } finally {
            clearTimeout(timer!);
          }

          if (manager.getState() === "running") {
            const pool = createDoltPool(config);
            await ensureLabelDefinitionsTable(() => config, pool).catch((tableErr) => {
              app.log.warn(
                { err: tableErr },
                `${logPrefix} Failed to create label_definitions before endSync`,
              );
            });
          }
          const elapsedMs = Date.now() - start;
          app.log.info(`${logPrefix} Sync completed in ${elapsedMs}ms`);
          return { elapsedMs };
        } catch (err) {
          app.log.error({ err }, `${logPrefix} Sync failed, attempting recovery...`);
          try {
            if (manager.getState() !== "running") {
              await manager.start();
            }
            if (manager.getState() === "running") {
              const pool = createDoltPool(config);
              await ensureLabelDefinitionsTable(() => config, pool).catch((tableErr) => {
                app.log.warn(
                  { err: tableErr },
                  `${logPrefix} Failed to create label_definitions before endSync (recovery)`,
                );
              });
              app.log.info(`${logPrefix} Recovery successful`);
            }
          } catch (recoveryErr) {
            app.log.error({ err: recoveryErr }, `${logPrefix} Recovery failed`);
          }
          throw err;
        } finally {
          endSync();
        }
      }
    : null;

  const onAfterWrite = doReplicaSync
    ? async () => {
        try {
          await doReplicaSync("[replica]");
        } catch (err) {
          if (err instanceof Error && err.message === "Sync already in progress") {
            app.log.info("[replica] Skipping post-write sync — sync already in progress");
            return;
          }
          throw err;
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
    reply.header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    reply.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

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
    },
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
        app.log.info(
          `[setup] Connecting to Dolt at ${newConfig.doltHost}:${newConfig.doltPort}...`,
        );
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
  registerMigrationRoutes(app, {
    getConfig,
    onMigrationComplete: async (newConfig: Config) => {
      config = newConfig;

      // Stop old embedded mode infrastructure
      if (doltManager) {
        await doltManager.stop();
        doltManager = null;
      }
      await destroyPool();

      // Reconnect in server mode
      app.log.info(
        `[migration] Connecting to Dolt at ${newConfig.doltHost}:${newConfig.doltPort}...`,
      );
      createDoltPool(newConfig);
      writeService.updateConfig(newConfig);
      writeService.setAfterWriteHook(undefined);

      app.log.info("[migration] Migration complete, running in server mode");
    },
  });

  // ─── Replica Sync Endpoint ────────────────────────────
  app.post("/api/sync", async (_request, reply) => {
    if (!doReplicaSync) {
      return reply.code(400).send({
        code: "NOT_APPLICABLE",
        message: "Replica sync is only available in embedded mode",
        retryable: false,
      });
    }

    try {
      const result = await doReplicaSync("[replica]");
      return reply.code(200).send({
        ok: true,
        elapsed_ms: result.elapsedMs,
      });
    } catch (err) {
      if (err instanceof Error && err.message === "Sync already in progress") {
        return reply.code(409).send({
          code: "SYNC_IN_PROGRESS",
          message: "A sync operation is already running",
          retryable: true,
        });
      }
      app.log.error({ err }, "[api/sync] Sync failed");
      return reply.code(500).send({
        code: "SYNC_FAILED",
        message: err instanceof Error ? err.message : "Replica sync failed",
        retryable: true,
      });
    }
  });

  // ─── Static File Serving (Production) ─────────────────
  // Serve the built frontend when running from an installed package.
  // In dev mode (Vite dev server handles frontend), this is skipped.
  const frontendDist = findFrontendDist();
  if (frontendDist) {
    app.log.info(`[static] Serving frontend from ${frontendDist}`);
    await app.register(fastifyStatic, {
      root: frontendDist,
      prefix: "/",
    });

    // SPA fallback: serve index.html for non-API routes that don't match a file
    app.setNotFoundHandler(async (request, reply) => {
      if (request.url.startsWith("/api/")) {
        return reply.code(404).send({
          code: "NOT_FOUND",
          message: `Route ${request.method} ${request.url} not found`,
          retryable: false,
        });
      }
      return reply.sendFile("index.html");
    });
  }

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
        `Connecting to external Dolt SQL server at ${config.doltHost}:${config.doltPort}...`,
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
        app.log.warn("Dolt SQL server failed to start — running in degraded mode");
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
