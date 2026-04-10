import Fastify, { type FastifyError } from "fastify";
import type { Config } from "./config.js";
import { DoltServerManager } from "./dolt/server-manager.js";
import { createDoltPool, destroyPool } from "./dolt/pool.js";
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

  // ─── Dolt SQL Server Lifecycle ─────────────────────────
  const doltManager = new DoltServerManager(config);

  doltManager.onStateChange((state) => {
    app.log.info(`[dolt] Server state: ${state}`);
  });

  // ─── Connection Pool ──────────────────────────────────
  // Pool is created after Dolt server starts

  // ─── Write Service ────────────────────────────────────
  const writeService = new WriteService(config);

  // ─── Error Handler ────────────────────────────────────
  app.setErrorHandler((error: FastifyError | AppError, _request, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send(error.toApiError());
    }

    // Fastify validation errors
    if ("validation" in error && error.validation) {
      return reply.code(400).send({
        code: "VALIDATION_ERROR",
        message: error.message,
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

  // ─── CORS (permissive — localhost only) ───────────────
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
    { parseAs: "string" },
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
  registerHealthRoutes(app, doltManager);

  // ─── Lifecycle ────────────────────────────────────────
  const startup = async () => {
    // Start Dolt SQL server
    app.log.info(`Starting Dolt SQL server on port ${config.doltPort}...`);
    app.log.info(`Database path: ${config.doltDbPath}`);
    await doltManager.start();

    if (doltManager.getState() === "running") {
      app.log.info("Dolt SQL server is running, creating connection pool...");
      createDoltPool(config);
    } else {
      app.log.warn(
        "Dolt SQL server failed to start — running in degraded mode"
      );
    }
  };

  const shutdown = async () => {
    app.log.info("Shutting down...");
    await destroyPool();
    await doltManager.stop();
  };

  return { app, startup, shutdown, doltManager };
}
