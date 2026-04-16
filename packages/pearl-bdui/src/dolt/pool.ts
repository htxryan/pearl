import { createPool, type Pool, type PoolConnection } from "mysql2/promise";
import type { Config } from "../config.js";
import { databaseLockedError, doltUnavailableError } from "../errors.js";

let pool: Pool | null = null;

// ─── Sync Barrier ───────────────────────────────────────
// During replica sync the SQL server is down. Rather than letting
// reads fail immediately with "pool not initialized", they wait
// for the sync to finish and then proceed normally.
let syncBarrier: { promise: Promise<void>; resolve: () => void } | null = null;

/** Signal that a replica sync has started. Reads will wait. */
export function beginSync(): void {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  syncBarrier = { promise, resolve };
}

/** Signal that a replica sync has finished. Waiting reads proceed. */
export function endSync(): void {
  syncBarrier?.resolve();
  syncBarrier = null;
}

/**
 * Wait for an in-progress replica sync to complete.
 * Returns immediately if no sync is in progress.
 */
export async function awaitSync(timeoutMs = 30_000): Promise<void> {
  if (!syncBarrier) return;
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(doltUnavailableError("Replica sync timed out")), timeoutMs),
  );
  await Promise.race([syncBarrier.promise, timeout]);
}

export function createDoltPool(config: Config): Pool {
  // Destroy any existing pool to prevent connection leaks
  if (pool) {
    pool.end().catch((err) => {
      console.warn("[pool] Error closing previous pool:", err);
    });
    pool = null;
  }

  pool = createPool({
    host: config.doltHost,
    port: config.doltPort,
    user: config.doltUser,
    password: config.doltPassword || undefined,
    database: config.doltDatabase,
    waitForConnections: true,
    connectionLimit: config.poolSize,
    queueLimit: 0,
    connectTimeout: 5000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
  });
  return pool;
}

export function getPool(): Pool {
  if (!pool) {
    throw doltUnavailableError("Connection pool not initialized");
  }
  return pool;
}

export async function destroyPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Execute a query with database lock retry logic.
 * Retries up to config.dbLockMaxRetries times on lock errors.
 */
export async function queryWithRetry<T>(
  config: Config,
  queryFn: (conn: PoolConnection) => Promise<T>,
): Promise<T> {
  // If a replica sync is in progress, wait for it to finish
  // rather than failing immediately with "pool not initialized".
  await awaitSync();
  const p = getPool();

  for (let attempt = 0; attempt <= config.dbLockMaxRetries; attempt++) {
    let conn: PoolConnection | null = null;
    try {
      conn = await p.getConnection();
      const result = await queryFn(conn);
      return result;
    } catch (err: unknown) {
      if (isLockError(err) && attempt < config.dbLockMaxRetries) {
        console.warn(
          `[db] Database lock detected, retry ${attempt + 1}/${config.dbLockMaxRetries}`,
        );
        const jitteredDelay = config.dbLockRetryDelayMs * (attempt + 1) + Math.random() * 200;
        await new Promise((r) => setTimeout(r, jitteredDelay));
        continue;
      }
      if (isConnectionError(err)) {
        throw doltUnavailableError(err instanceof Error ? err.message : "Connection failed");
      }
      if (isLockError(err)) {
        throw databaseLockedError();
      }
      throw err;
    } finally {
      conn?.release();
    }
  }

  throw databaseLockedError();
}

function isLockError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const errno = (err as { errno?: number }).errno;
  return errno === 1205 || errno === 1213; // ER_LOCK_WAIT_TIMEOUT, ER_LOCK_DEADLOCK
}

function isConnectionError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const code = (err as { code?: string }).code;
  return (
    code === "ECONNREFUSED" ||
    code === "PROTOCOL_CONNECTION_LOST" ||
    code === "ENOTFOUND" ||
    code === "ER_ACCESS_DENIED_ERROR"
  );
}
