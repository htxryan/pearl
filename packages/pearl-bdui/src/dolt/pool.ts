import { createPool, type Pool, type PoolConnection } from "mysql2/promise";
import type { Config } from "../config.js";
import { databaseLockedError, doltUnavailableError } from "../errors.js";
import { logger } from "../logger.js";

let pool: Pool | null = null;

export function createDoltPool(config: Config): Pool {
  if (pool) {
    pool.end().catch((err) => {
      logger.warn({ err }, "Error closing previous pool");
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

export async function queryWithRetry<T>(
  config: Config,
  queryFn: (conn: PoolConnection) => Promise<T>,
): Promise<T> {
  const p = getPool();

  for (let attempt = 0; attempt <= config.dbLockMaxRetries; attempt++) {
    let conn: PoolConnection | null = null;
    try {
      conn = await p.getConnection();
      // Dolt pins each connection to the working-set snapshot at its last
      // transaction boundary. Without this ROLLBACK, pooled connections
      // return stale reads when another session (e.g. bd CLI, or a sibling
      // pool connection's COMMIT) advances the head between checkouts.
      // ROLLBACK is a safe no-op if no transaction is open and it forces
      // the connection to refresh its view before the caller's queries.
      await conn.query("ROLLBACK");
      const result = await queryFn(conn);
      return result;
    } catch (err: unknown) {
      if (isLockError(err) && attempt < config.dbLockMaxRetries) {
        logger.warn(
          { attempt: attempt + 1, maxRetries: config.dbLockMaxRetries, err },
          "Database lock detected, retrying",
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
  return errno === 1205 || errno === 1213;
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
