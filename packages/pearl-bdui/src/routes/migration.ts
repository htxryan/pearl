import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { cp, mkdir, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import type {
  MigrateRequest,
  MigrateResponse,
  TestServerRequest,
  TestServerResponse,
} from "@pearl/shared";
import type { FastifyInstance } from "fastify";
import type { Config } from "../config.js";
import { findBeadsDir } from "../config.js";
import { validationError } from "../errors.js";

export interface MigrationContext {
  getConfig: () => Config;
  onMigrationComplete: (newConfig: Config) => Promise<void>;
}

export function registerMigrationRoutes(app: FastifyInstance, ctx: MigrationContext): void {
  let isMigrating = false;

  app.post("/api/migration/test-server", async (request, reply) => {
    const body = request.body as TestServerRequest;

    if (!body.host || !body.port) {
      throw validationError("host and port are required");
    }

    const user = body.user || "root";
    const password = body.password || "";

    const result = await testConnection(body.host, body.port, user, password);
    const response: TestServerResponse = result;
    return reply.send(response);
  });

  app.post("/api/migration/migrate", async (request, reply) => {
    const config = ctx.getConfig();
    const body = request.body as MigrateRequest;

    if (!body.target || (body.target !== "managed" && body.target !== "external")) {
      throw validationError("target must be 'managed' or 'external'");
    }

    if (config.doltMode !== "embedded") {
      return reply.code(400).send({
        ok: false,
        error: "Migration is only available in embedded mode",
      });
    }

    if (isMigrating) {
      return reply.code(409).send({
        ok: false,
        error: "Migration already in progress",
      });
    }

    isMigrating = true;
    try {
      const beadsDir = findBeadsDir(process.cwd());
      if (!beadsDir) {
        return reply.code(500).send({
          ok: false,
          error: "No .beads directory found",
        });
      }

      const metadataPath = resolve(beadsDir, "metadata.json");
      const originalMetadata = readFileSync(metadataPath, "utf-8");

      if (body.target === "managed") {
        const result = await migrateToPearlManaged(
          config,
          beadsDir,
          metadataPath,
          originalMetadata,
        );
        if (!result.ok) {
          return reply.code(500).send(result);
        }
        return reply.send(result);
      }

      if (!body.host || !body.port) {
        throw validationError("host and port are required for external migration");
      }

      const connResult = await testConnection(
        body.host,
        body.port,
        body.user || "root",
        body.password || "",
      );
      if (!connResult.ok) {
        return reply.code(400).send({
          ok: false,
          error: `Cannot connect to server: ${connResult.error}`,
        });
      }

      const result = await migrateToExternal(
        config,
        beadsDir,
        metadataPath,
        originalMetadata,
        body.host,
        body.port,
        body.user || "root",
        body.password || "",
      );
      if (!result.ok) {
        return reply.code(500).send(result);
      }
      return reply.send(result);
    } finally {
      isMigrating = false;
    }
  });
}

async function testConnection(
  host: string,
  port: number,
  user: string,
  password: string,
): Promise<TestServerResponse> {
  try {
    const mysql2 = await import("mysql2/promise");
    const conn = await mysql2.createConnection({
      host,
      port,
      user,
      password: password || undefined,
      connectTimeout: 5000,
    });
    await conn.query("SELECT 1");
    await conn.end();
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Connection failed",
    };
  }
}

async function migrateToPearlManaged(
  config: Config,
  beadsDir: string,
  metadataPath: string,
  originalMetadata: string,
): Promise<MigrateResponse | { ok: false; error: string }> {
  const managedPort = 3307;
  const managedDataDir = resolve(beadsDir, "doltdb");

  if (existsSync(managedDataDir)) {
    const entries = readdirSync(managedDataDir);
    if (entries.length > 0) {
      return {
        ok: false,
        error:
          "Managed data directory already exists and is not empty. Use force: true to overwrite.",
      };
    }
  }

  try {
    await mkdir(managedDataDir, { recursive: true });
    await cp(config.doltDbPath, managedDataDir, { recursive: true });

    const metadata = JSON.parse(originalMetadata);
    metadata.dolt_mode = "server";
    metadata.dolt_host = "127.0.0.1";
    metadata.dolt_port = managedPort;
    metadata.pearl_managed = true;
    metadata.dolt_data_dir = managedDataDir;
    delete metadata.dolt_server_host;
    delete metadata.dolt_server_port;

    const tmpPath = `${metadataPath}.tmp`;
    await writeFile(tmpPath, JSON.stringify(metadata, null, 2));
    await rename(tmpPath, metadataPath);

    const { execa } = await import("execa");
    const serverProc = execa(
      config.doltPath,
      ["sql-server", "--host", "127.0.0.1", "--port", String(managedPort), "--no-auto-commit"],
      {
        cwd: managedDataDir,
        reject: false,
        stdio: ["ignore", "pipe", "pipe"],
        detached: true,
      },
    );
    serverProc.unref();

    const ready = await waitForServer("127.0.0.1", managedPort);
    if (!ready) {
      writeFileSync(metadataPath, originalMetadata);
      serverProc.kill("SIGTERM");
      return { ok: false, error: "Pearl-managed dolt sql-server failed to start" };
    }

    return {
      ok: true,
      dolt_mode: "server",
      dolt_host: "127.0.0.1",
      dolt_port: managedPort,
    };
  } catch (err) {
    writeFileSync(metadataPath, originalMetadata);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Migration failed",
    };
  }
}

async function migrateToExternal(
  config: Config,
  beadsDir: string,
  metadataPath: string,
  originalMetadata: string,
  host: string,
  port: number,
  user: string,
  password: string,
): Promise<MigrateResponse | { ok: false; error: string }> {
  try {
    const dbName = basename(config.doltDbPath) || config.doltDatabase;
    const mysql2 = await import("mysql2/promise");
    const conn = await mysql2.createConnection({
      host,
      port,
      user,
      password: password || undefined,
      connectTimeout: 5000,
    });

    const [rows] = (await conn.query("SHOW DATABASES")) as [Array<Record<string, string>>, unknown];
    const databases = rows.map((r: Record<string, string>) => Object.values(r)[0]);
    if (databases.includes(dbName)) {
      const [tables] = (await conn.query(`SHOW TABLES FROM \`${dbName}\``)) as [
        Array<Record<string, string>>,
        unknown,
      ];
      if ((tables as unknown[]).length > 0) {
        await conn.end();
        return {
          ok: false,
          error: `Database '${dbName}' already exists on the target server with tables. Use force: true to overwrite.`,
        };
      }
    }
    await conn.end();

    const metadata = JSON.parse(originalMetadata);
    metadata.dolt_mode = "server";
    metadata.dolt_host = host;
    metadata.dolt_port = port;
    metadata.dolt_user = user;
    if (password) metadata.dolt_password = password;
    delete metadata.pearl_managed;
    delete metadata.dolt_server_host;
    delete metadata.dolt_server_port;

    const tmpPath = `${metadataPath}.tmp`;
    await writeFile(tmpPath, JSON.stringify(metadata, null, 2));
    await rename(tmpPath, metadataPath);

    return {
      ok: true,
      dolt_mode: "server",
      dolt_host: host,
      dolt_port: port,
    };
  } catch (err) {
    writeFileSync(metadataPath, originalMetadata);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Migration failed",
    };
  }
}

async function waitForServer(host: string, port: number, maxWaitMs = 15000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      const mysql2 = await import("mysql2/promise");
      const conn = await mysql2.createConnection({
        host,
        port,
        user: "root",
        connectTimeout: 2000,
      });
      await conn.query("SELECT 1");
      await conn.end();
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  return false;
}
