import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import fastifyStatic from "@fastify/static";
import Fastify, { type FastifyError } from "fastify";
import type { Config } from "./config.js";
import { findBeadsDir } from "./config.js";
import { createDoltPool, destroyPool, getPool } from "./dolt/pool.js";
import { DoltServerManager } from "./dolt/server-manager.js";
import { AppError } from "./errors.js";
import { createScrubSerializer } from "./log-scrub.js";
import { OrphanSweep } from "./orphan-sweep.js";
import { registerAttachmentRoutes, resolveAttachmentBase } from "./routes/attachments.js";
import { registerDependencyRoutes } from "./routes/dependencies.js";
import { registerHealthRoutes } from "./routes/health.js";
import { ensureHasAttachmentsColumn, registerIssueRoutes } from "./routes/issues.js";
import { ensureLabelDefinitionsTable, registerLabelRoutes } from "./routes/labels.js";
import { registerMigrationRoutes } from "./routes/migration.js";
import { registerSettingsRoutes, SettingsEventBus } from "./routes/settings.js";
import { registerSetupRoutes } from "./routes/setup.js";
import { registerStatsRoutes } from "./routes/stats.js";
import { loadSettings } from "./settings-loader.js";
import { WriteService } from "./write-service/write-service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function findFrontendDist(startDir: string = __dirname): string | null {
  if (isPearlWorkspace(startDir)) return null;
  const publishedPath = resolve(startDir, "..", "frontend-dist");
  if (existsSync(resolve(publishedPath, "index.html"))) return publishedPath;
  return null;
}

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
  let config = initialConfig;
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || "info",
      serializers: createScrubSerializer(),
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

  let doltManager: DoltServerManager | null = null;
  let initialStartupDone = false;

  const writeService = new WriteService(config);

  // ─── Error Handler ────────────────────────────────────
  app.setErrorHandler((error: FastifyError | AppError, _request, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send(error.toApiError());
    }

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
  app.addHook("onRequest", async (request, reply) => {
    reply.header("Access-Control-Allow-Origin", "*");
    reply.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    reply.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (request.method === "OPTIONS") {
      return reply.code(204).send();
    }
  });

  // ─── Content type ─────────────────────────────────────
  app.addContentTypeParser(
    "application/json",
    // 8MB caps inline-attachment PATCH bodies (base64 image + prose) without
    // letting pathological payloads through. See FIELD_MAX_LENGTH in routes/issues.ts.
    { parseAs: "string", bodyLimit: 8 * 1024 * 1024 },
    (_req, body, done) => {
      try {
        const json = body ? JSON.parse(body as string) : {};
        done(null, json);
      } catch (err) {
        done(err as Error, undefined);
      }
    },
  );

  // Multipart parser for /api/attachments upload (busboy parses from buffer in handler)
  app.addContentTypeParser(
    "multipart/form-data",
    { parseAs: "buffer", bodyLimit: 10 * 1024 * 1024 },
    (_req, body, done) => {
      done(null, body);
    },
  );

  // ─── Setup Mode Guard ─────────────────────────────────
  let setupMode = config.needsSetup;

  app.addHook("onRequest", async (request, reply) => {
    if (!setupMode) return;
    const url = request.url;
    if (url.startsWith("/api/setup") || url.startsWith("/api/health")) return;
    if (url.startsWith("/api/")) {
      return reply.code(503).send({
        code: "SETUP_REQUIRED",
        message: "Project setup required. Visit /setup to configure.",
        retryable: false,
      });
    }
  });

  // ─── Embedded Mode Guard (REQ-UW3) ────────────────────
  // When in embedded mode, block all mutation routes but allow health
  // and migration endpoints so the frontend can render the migration modal.
  app.addHook("onRequest", async (request, reply) => {
    if (config.doltMode !== "embedded") return;
    const url = request.url;
    if (
      url.startsWith("/api/health") ||
      url.startsWith("/api/migration") ||
      url.startsWith("/api/setup") ||
      (url.startsWith("/api/settings") && request.method === "GET")
    )
      return;
    if (url.startsWith("/api/") && request.method !== "GET") {
      return reply.code(503).send({
        code: "EMBEDDED_DEPRECATED",
        message:
          "Embedded mode is deprecated. Please complete the migration to server mode via the migration modal.",
        retryable: false,
      });
    }
  });

  // ─── Register Routes ─────────────────────────────────
  registerSetupRoutes(app, {
    getConfig: () => config,
    onSetupComplete: async (newConfig: Config) => {
      config = newConfig;

      if (newConfig.doltMode === "server") {
        app.log.info(
          `[setup] Connecting to Dolt at ${newConfig.doltHost}:${newConfig.doltPort}...`,
        );
        createDoltPool(newConfig);
      }

      writeService.updateConfig(newConfig);
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

  const settingsEventBus = new SettingsEventBus();
  registerSettingsRoutes(app, settingsEventBus);
  registerAttachmentRoutes(app, settingsEventBus);
  registerMigrationRoutes(app, {
    getConfig,
    onMigrationComplete: async (newConfig: Config) => {
      config = newConfig;

      if (doltManager) {
        await doltManager.stop();
        doltManager = null;
      }
      await destroyPool();

      if (newConfig.pearlManaged) {
        const dataDir = newConfig.doltDataDir || newConfig.doltDbPath;
        app.log.info(`[migration] Starting pearl-managed dolt sql-server on ${dataDir}...`);

        doltManager = new DoltServerManager(newConfig, dataDir);
        doltManager.onStateChange(async (state) => {
          app.log.info(`[dolt] Managed server state: ${state}`);
          if (state === "running") {
            app.log.info("Managed dolt server recovered, recreating connection pool...");
            await destroyPool();
            createDoltPool(newConfig);
            await ensureHasAttachmentsColumn(getConfig, app.log);
          }
        });

        await doltManager.start();
        if (doltManager.getState() !== "running") {
          app.log.warn("[migration] Pearl-managed dolt sql-server failed to start after migration");
        } else {
          // Pool is created by the onStateChange handler above; run schema
          // migrations now that the pool is alive. This is the first moment a
          // fresh bd-initialized DB can pick up pearl-bdui's `has_attachments`
          // column — `onReady` already fired while we were still in embedded
          // mode with no pool.
          await ensureHasAttachmentsColumn(getConfig, app.log);
        }
      } else {
        app.log.info(
          `[migration] Connecting to Dolt at ${newConfig.doltHost}:${newConfig.doltPort}...`,
        );
        createDoltPool(newConfig);
        await ensureHasAttachmentsColumn(getConfig, app.log);
      }

      writeService.updateConfig(newConfig);

      app.log.info("[migration] Migration complete, running in server mode");
    },
  });

  // ─── Static File Serving (Production) ─────────────────
  const frontendDist = findFrontendDist();
  if (frontendDist) {
    app.log.info(`[static] Serving frontend from ${frontendDist}`);
    await app.register(fastifyStatic, {
      root: frontendDist,
      prefix: "/",
    });

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

  // ─── Orphan Sweep ─────────────────────────────────────
  const beadsDir = findBeadsDir(process.cwd());
  const projectRoot = beadsDir ? dirname(beadsDir) : process.cwd();

  const orphanSweep = new OrphanSweep({
    resolveAttachmentBase,
    projectRoot,
    getSettings: () => loadSettings(projectRoot),
    isRefReferenced: async (ref: string) => {
      try {
        const pool = getPool();
        const escaped = ref.replace(/[%_\\]/g, "\\$&");
        const pattern = `%${escaped}%`;
        const [rows] = await pool.execute(
          "SELECT 1 FROM issues WHERE description LIKE ? ESCAPE '\\\\' OR notes LIKE ? ESCAPE '\\\\' OR design LIKE ? ESCAPE '\\\\' OR acceptance_criteria LIKE ? ESCAPE '\\\\' LIMIT 1",
          [pattern, pattern, pattern, pattern],
        );
        return (rows as unknown[]).length > 0;
      } catch {
        return true;
      }
    },
    logger: {
      info: (msg: string) => app.log.info(msg),
      warn: (msg: string) => app.log.warn(msg),
      error: (msg: string) => app.log.error(msg),
    },
  });

  // ─── Lifecycle ────────────────────────────────────────
  const startup = async () => {
    if (config.needsSetup) {
      app.log.info("No .beads/ directory found — running in setup mode");
      app.log.info("Visit /setup to configure your project");
      initialStartupDone = true;
      return;
    }

    if (isEmbedded) {
      app.log.warn(
        "Embedded mode is deprecated. The frontend will show a migration modal. " +
          "Only health and migration endpoints are active until migration completes.",
      );
      initialStartupDone = true;
      return;
    }

    if (config.pearlManaged) {
      const dataDir = config.doltDataDir || config.doltDbPath;
      app.log.info(`[managed] Starting pearl-managed dolt sql-server on ${dataDir}...`);

      doltManager = new DoltServerManager(config, dataDir);
      doltManager.onStateChange(async (state) => {
        app.log.info(`[dolt] Managed server state: ${state}`);
        if (state === "running" && initialStartupDone) {
          app.log.info("Managed dolt server recovered, recreating connection pool...");
          await destroyPool();
          createDoltPool(config);
          await ensureHasAttachmentsColumn(getConfig, app.log);
        }
      });

      await doltManager.start();
      if (doltManager.getState() === "running") {
        createDoltPool(config);
        app.log.info("[managed] Pearl-managed dolt sql-server running, pool created");
      } else {
        app.log.warn("[managed] Pearl-managed dolt sql-server failed to start — degraded mode");
      }
    } else {
      app.log.info(
        `Connecting to external Dolt SQL server at ${config.doltHost}:${config.doltPort}...`,
      );
      createDoltPool(config);
      app.log.info("Connection pool created for external Dolt server");
    }

    initialStartupDone = true;

    if (config.doltMode === "server") {
      // Run any deferred schema migrations now that the pool is up. The
      // `onReady` hook fires before startup(), so a freshly-initialized DB
      // needs this second pass to pick up pearl-bdui's schema additions.
      await ensureHasAttachmentsColumn(getConfig, app.log);

      const settings = await loadSettings(projectRoot);
      orphanSweep.start(settings.attachments.sweep.intervalSeconds);
    }
  };

  const shutdown = async () => {
    app.log.info("Shutting down...");
    orphanSweep.stop();
    await destroyPool();

    if (doltManager) {
      await doltManager.stop();
    }
  };

  return { app, startup, shutdown, doltManager, orphanSweep };
}
