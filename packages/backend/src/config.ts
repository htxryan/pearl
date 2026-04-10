import { resolve } from "node:path";
import { readdirSync } from "node:fs";

export interface Config {
  /** Host to bind the server to — always 127.0.0.1 for security */
  host: string;
  /** Port for the Fastify server */
  port: number;
  /** Port for the Dolt SQL server */
  doltPort: number;
  /** Path to the Dolt database directory */
  doltDbPath: string;
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
}

export function loadConfig(): Config {
  const cwd = process.cwd();

  // Auto-discover the .beads database path
  const doltDbPath =
    process.env.BEADS_DB_PATH || findBeadsDbPath(cwd);

  return {
    host: "127.0.0.1",
    port: parseInt(process.env.PORT || "3456", 10),
    doltPort: parseInt(process.env.DOLT_PORT || "3307", 10),
    doltDbPath,
    bdPath: process.env.BD_PATH || "bd",
    doltPath: process.env.DOLT_PATH || "dolt",
    dbLockMaxRetries: 3,
    dbLockRetryDelayMs: 1000,
    doltRestartThreshold: 3,
    doltRestartDebounceMs: 5000,
    poolSize: 5,
  };
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
    } catch {
      // Not found at this level, go up
    }
    const parent = resolve(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  // Fallback: assume CWD is the db path
  return startDir;
}
