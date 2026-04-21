import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type {
  SetupInitializeRequest,
  SetupInitializeResponse,
  SetupStatusResponse,
} from "@pearl/shared";
import type { FastifyInstance } from "fastify";
import type { Config } from "../config.js";
import { type DoltMode, findBeadsDir, loadConfig } from "../config.js";
import { validationError } from "../errors.js";

export interface SetupContext {
  getConfig: () => Config;
  onSetupComplete: (newConfig: Config) => Promise<void>;
}

export function registerSetupRoutes(app: FastifyInstance, ctx: SetupContext): void {
  let isInitializing = false;
  // GET /api/setup/status
  app.get("/api/setup/status", async (_request, reply) => {
    const config = ctx.getConfig();

    if (config.needsSetup) {
      const response: SetupStatusResponse = {
        configured: false,
        mode: null,
      };
      return reply.send(response);
    }

    const response: SetupStatusResponse = {
      configured: true,
      mode: config.doltMode,
    };
    return reply.send(response);
  });

  // POST /api/setup/initialize
  app.post("/api/setup/initialize", async (request, reply) => {
    const config = ctx.getConfig();

    if (!config.needsSetup) {
      const response: SetupInitializeResponse = {
        success: true,
        message: "Already configured",
      };
      return reply.send(response);
    }

    if (isInitializing) {
      throw validationError("Setup is already in progress");
    }
    isInitializing = true;

    try {
      const body = request.body as SetupInitializeRequest;

      if (!body.mode || (body.mode !== "embedded" && body.mode !== "server")) {
        throw validationError("mode must be 'embedded' or 'server'");
      }

      if (body.mode === "embedded") {
        throw validationError("Embedded mode is deprecated. Please use 'server' mode instead.");
      }

      if (body.mode === "server") {
        if (!body.server_host) {
          throw validationError("server_host is required for server mode");
        }
        // Validate connection before saving
        const port = body.server_port || 3307;
        const isReachable = await testServerConnection(
          body.server_host,
          port,
          body.database || "beads_gui",
          body.server_user || "root",
          body.server_password || "",
        );
        if (!isReachable) {
          throw validationError(
            `Cannot connect to Dolt server at ${body.server_host}:${port}. ` +
              "Ensure the server is running and accessible.",
          );
        }
      }

      const cwd = process.cwd();
      const beadsDir = resolve(cwd, ".beads");

      // Server mode: create .beads/metadata.json
      if (!existsSync(beadsDir)) {
        mkdirSync(beadsDir, { recursive: true });
      }
      const metadata = {
        database: "dolt",
        backend: "dolt",
        dolt_mode: "server" as DoltMode,
        dolt_host: body.server_host,
        dolt_port: body.server_port || 3307,
        dolt_user: body.server_user || "root",
        dolt_password: body.server_password || "",
        dolt_database: body.database || "beads_gui",
        project_id: crypto.randomUUID(),
      };
      writeFileSync(resolve(beadsDir, "metadata.json"), JSON.stringify(metadata, null, 2));

      // Verify .beads/ was created
      if (!findBeadsDir(cwd)) {
        const response: SetupInitializeResponse = {
          success: false,
          message: "Setup failed: .beads directory was not created",
        };
        return reply.code(500).send(response);
      }

      // Reload config with the new .beads/ directory
      const newConfig = loadConfig();

      // Trigger the server to re-initialize with the new config
      await ctx.onSetupComplete(newConfig);

      const response: SetupInitializeResponse = {
        success: true,
        message: `Initialized in ${newConfig.doltMode} mode`,
      };
      return reply.send(response);
    } finally {
      isInitializing = false;
    }
  });
}

async function testServerConnection(
  host: string,
  port: number,
  database: string,
  user: string,
  password: string,
): Promise<boolean> {
  try {
    const mysql2 = await import("mysql2/promise");
    const conn = await mysql2.createConnection({
      host,
      port,
      user,
      password: password || undefined,
      database,
      connectTimeout: 5000,
    });
    await conn.query("SELECT 1");
    await conn.end();
    return true;
  } catch {
    return false;
  }
}
