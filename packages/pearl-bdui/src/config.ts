import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";

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
  /** True when no .beads/ directory found — backend runs in setup-only mode */
  needsSetup: boolean;
}

export function loadConfig(): Config {
  const cwd = process.cwd();

  // Check if .beads/ directory exists anywhere up the tree
  const needsSetup = !findBeadsDir(cwd);

  // In setup mode, return safe defaults — no Dolt paths or host validation
  if (needsSetup) {
    return {
      host: "127.0.0.1",
      port: parseInt(process.env.PORT || "3456", 10),
      doltMode: "embedded",
      doltHost: "127.0.0.1",
      doltPort: 3307,
      doltDbPath: cwd,
      replicaPath: "",
      bdPath: process.env.BD_PATH || "bd",
      doltPath: process.env.DOLT_PATH || "dolt",
      dbLockMaxRetries: 3,
      dbLockRetryDelayMs: 1000,
      doltRestartThreshold: 3,
      doltRestartDebounceMs: 5000,
      poolSize: 5,
      doltUser: process.env.DOLT_USER || "root",
      doltPassword: process.env.DOLT_PASSWORD || "",
      doltDatabase: "beads_gui",
      needsSetup: true,
    };
  }

  // Auto-discover the .beads database path
  const doltDbPath = process.env.BEADS_DB_PATH || findBeadsDbPath(cwd);

  // Read .beads/metadata.json for mode detection
  const metadata = readBeadsMetadata(cwd);
  const doltMode: DoltMode = metadata?.dolt_mode === "server" ? "server" : "embedded";

  let doltHost: string;
  if (doltMode === "server") {
    doltHost = process.env.DOLT_HOST || metadata?.dolt_host || metadata?.dolt_server_host || "";
    if (!doltHost) {
      throw new Error(
        "dolt_mode is 'server' but no dolt_host configured. " +
          "Set DOLT_HOST env var or dolt_host/dolt_server_host in .beads/metadata.json.",
      );
    }
  } else {
    doltHost = "127.0.0.1";
  }

  const doltPort = parseInt(
    process.env.DOLT_PORT ||
      String(
        metadata?.dolt_port ||
          (doltMode === "server" ? metadata?.dolt_server_port : undefined) ||
          3307,
      ),
    10,
  );

  // Derive replica path for embedded mode: sibling __replica__/<dbname>/
  let replicaPath = "";
  if (doltMode === "embedded") {
    const dbName = basename(doltDbPath) || "beads_gui";
    replicaPath = resolve(dirname(doltDbPath), "..", "__replica__", dbName);
  }

  // Database name: in server mode, prefer explicit metadata; in embedded, derive from path
  const doltDatabase =
    process.env.DOLT_DATABASE || metadata?.dolt_database || basename(doltDbPath) || "beads_gui";

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
    doltUser: process.env.DOLT_USER || String(metadata?.dolt_user || "") || "root",
    doltPassword: process.env.DOLT_PASSWORD || String(metadata?.dolt_password || ""),
    doltDatabase,
    needsSetup: false,
  };
}

interface BeadsMetadata {
  dolt_mode?: string;
  dolt_host?: string;
  dolt_port?: number;
  /** Written by `bd dolt set host` */
  dolt_server_host?: string;
  /** Written by `bd dolt set port` */
  dolt_server_port?: number;
  dolt_database?: string;
  [key: string]: unknown;
}

export function readBeadsMetadata(startDir: string): BeadsMetadata | null {
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

/** Returns the path to the .beads/ directory, or null if not found. */
export function findBeadsDir(startDir: string): string | null {
  let dir = startDir;
  for (let i = 0; i < 10; i++) {
    const beadsDir = resolve(dir, ".beads");
    if (existsSync(beadsDir)) {
      return beadsDir;
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
      const dbDir = entries.find((e) => e.isDirectory() && !e.name.startsWith("."));
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
