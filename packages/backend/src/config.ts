import { resolve, dirname, basename } from "node:path";
import { readdirSync, readFileSync } from "node:fs";

export type DoltMode = "embedded" | "server";

export interface Config {
  /** Host to bind the server to — always 127.0.0.1 for security */
  host: string;
  /** Port for the Fastify server */
  port: number;
  /** Dolt operation mode: embedded (local) or server (remote) */
  doltMode: DoltMode;
  /** Host for the Dolt SQL server */
  doltHost: string;
  /** Port for the Dolt SQL server */
  doltPort: number;
  /** Path to the Dolt database directory */
  doltDbPath: string;
  /** Path to the replica database (embedded mode only) */
  replicaPath: string;
  /** Path to the bd CLI binary */
  bdPath: string;
  /** Path to the dolt binary */
  doltPath: string;
  /** Max retries for database lock */
  dbLockMaxRetries: number;
  /** Delay between lock retries in ms */
  dbLockRetryDelayMs: number;
  /** Consecutive failures before restart */
  doltRestartThreshold: number;
  /** Debounce window for restart in ms */
  doltRestartDebounceMs: number;
  /** mysql2 connection pool size */
  poolSize: number;
  /** Dolt SQL user (default: "root") */
  doltUser: string;
  /** Dolt SQL password (default: "") */
  doltPassword: string;
  /** Dolt database name (server mode: from metadata; embedded: from path) */
  doltDatabase: string;
}

export function loadConfig(): Config {
  const cwd = process.cwd();

  // Auto-discover the .beads database path
  const doltDbPath =
    process.env.BEADS_DB_PATH || findBeadsDbPath(cwd);

  // Read .beads/metadata.json for mode detection
  const metadata = readBeadsMetadata(cwd);
  const doltMode: DoltMode =
    metadata?.dolt_mode === "server" ? "server" : "embedded";

  let doltHost: string;
  if (doltMode === "server") {
    doltHost = process.env.DOLT_HOST || metadata?.dolt_host || "";
    if (!doltHost) {
      throw new Error(
        "dolt_mode is 'server' but no dolt_host configured. " +
          "Set DOLT_HOST env var or dolt_host in .beads/metadata.json."
      );
    }
  } else {
    doltHost = "127.0.0.1";
  }

  const doltPort = parseInt(
    process.env.DOLT_PORT || String(metadata?.dolt_port || 3307),
    10
  );

  // Derive replica path for embedded mode: sibling __replica__/<dbname>/
  let replicaPath = "";
  if (doltMode === "embedded") {
    const dbName = basename(doltDbPath) || "beads_gui";
    replicaPath = resolve(dirname(doltDbPath), "..", "__replica__", dbName);
  }

  // Database name: in server mode, prefer explicit metadata; in embedded, derive from path
  const doltDatabase =
    process.env.DOLT_DATABASE ||
    metadata?.dolt_database ||
    basename(doltDbPath) ||
    "beads_gui";

  return {
    host: "127.0.0.1",
    port: parseInt(process.env.PORT || "3456", 10),
    doltMode,
    doltHost,
    doltPort,
    doltDbPath,
    replicaPath,
    bdPath: process.env.BD_PATH || "bd",
    doltPath: process.env.DOLT_PATH || "dolt",
    dbLockMaxRetries: 3,
    dbLockRetryDelayMs: 1000,
    doltRestartThreshold: 3,
    doltRestartDebounceMs: 5000,
    poolSize: 5,
    doltUser: process.env.DOLT_USER || "root",
    doltPassword: process.env.DOLT_PASSWORD || "",
    doltDatabase,
  };
}

interface BeadsMetadata {
  dolt_mode?: string;
  dolt_host?: string;
  dolt_port?: number;
  dolt_database?: string;
  [key: string]: unknown;
}

export function readBeadsMetadata(
  startDir: string
): BeadsMetadata | null {
  let dir = startDir;
  for (let i = 0; i < 10; i++) {
    const metadataPath = resolve(dir, ".beads", "metadata.json");
    try {
      const raw = readFileSync(metadataPath, "utf-8");
      return JSON.parse(raw) as BeadsMetadata;
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
      // Not found at this level, go up
    }
    const parent = resolve(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function findBeadsDbPath(startDir: string): string {
  // Walk up looking for .beads/embeddeddolt/*/
  let dir = startDir;
  for (let i = 0; i < 10; i++) {
    const beadsDir = resolve(dir, ".beads", "embeddeddolt");
    try {
      const entries = readdirSync(beadsDir, { withFileTypes: true });
      const dbDir = entries.find(
        (e) => e.isDirectory() && !e.name.startsWith(".")
      );
      if (dbDir) {
        return resolve(beadsDir, dbDir.name);
      }
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
      // Not found at this level, go up
    }
    const parent = resolve(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  // Fallback: assume CWD is the db path
  return startDir;
}
