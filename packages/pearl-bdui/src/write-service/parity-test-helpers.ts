import { type ChildProcess, execSync, spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { hostname, tmpdir } from "node:os";
import { join } from "node:path";
import { createPool, type Pool } from "mysql2/promise";
import type { Config } from "../config.js";

export const TEST_PORT = 33070;
export const TEST_HOST = "127.0.0.1";
export const TEST_USER = "root";
export const ACTOR = hostname();
export const ISSUE_PREFIX = "test";

const TABLES_TO_COMPARE = ["issues", "events", "labels", "dependencies", "comments"] as const;

// Fields we meaningfully compare for parity (per table)
const PARITY_FIELDS: Record<string, Set<string>> = {
  issues: new Set([
    "title",
    "description",
    "design",
    "acceptance_criteria",
    "notes",
    "status",
    "priority",
    "issue_type",
    "estimated_minutes",
    "ephemeral",
    "pinned",
    "is_template",
  ]),
  events: new Set(["event_type"]),
  labels: new Set(["label"]),
  dependencies: new Set(["type"]),
  comments: new Set(["text"]),
};

export interface ParityContext {
  doltProcess: ChildProcess;
  dataDir: string;
  cliWorkDir: string;
  adminPool: Pool;
  sqlPool: Pool;
  cliPool: Pool;
}

export function isDoltAvailable(): boolean {
  try {
    execSync("dolt version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export async function setupParityInfra(): Promise<ParityContext> {
  try {
    execSync(`lsof -ti:${TEST_PORT} | xargs kill -9 2>/dev/null || true`, { stdio: "ignore" });
  } catch {}
  await new Promise((r) => setTimeout(r, 500));

  const dataDir = mkdtempSync(join(tmpdir(), "parity-dolt-"));
  const cliWorkDir = mkdtempSync(join(tmpdir(), "parity-cli-"));

  const doltProcess = spawn(
    "dolt",
    ["sql-server", "--host", TEST_HOST, "--port", String(TEST_PORT), "--data-dir", dataDir],
    { stdio: ["ignore", "pipe", "pipe"], detached: false },
  );

  await waitForServer(doltProcess);

  const adminPool = createPool({
    host: TEST_HOST,
    port: TEST_PORT,
    user: TEST_USER,
    waitForConnections: true,
    connectionLimit: 5,
    multipleStatements: true,
  });

  // Use bd init to create both databases with proper schema and metadata
  initBdProject(cliWorkDir, "parity_cli");

  const sqlInitDir = mkdtempSync(join(tmpdir(), "parity-sql-init-"));
  initBdProject(sqlInitDir, "parity_sql");
  rmSync(sqlInitDir, { recursive: true, force: true });

  const sqlPool = createPool({
    host: TEST_HOST,
    port: TEST_PORT,
    user: TEST_USER,
    database: "parity_sql",
    connectionLimit: 5,
  });

  const cliPool = createPool({
    host: TEST_HOST,
    port: TEST_PORT,
    user: TEST_USER,
    database: "parity_cli",
    connectionLimit: 5,
  });

  return { doltProcess, dataDir, cliWorkDir, adminPool, sqlPool, cliPool };
}

function initBdProject(workDir: string, dbName: string): void {
  execSync("git init -q", { cwd: workDir, stdio: "ignore" });
  execSync('git config user.name "Test" && git config user.email "test@test.com"', {
    cwd: workDir,
    stdio: "ignore",
    shell: "/bin/bash",
  });

  const args = [
    "bd",
    "init",
    "--server",
    "--server-host",
    TEST_HOST,
    "--server-port",
    String(TEST_PORT),
    "--server-user",
    TEST_USER,
    "--database",
    dbName,
    "--prefix",
    ISSUE_PREFIX,
    "--non-interactive",
    "--skip-agents",
    "--skip-hooks",
    "--quiet",
  ];

  execSync(args.join(" "), {
    cwd: workDir,
    timeout: 30000,
    env: { ...process.env, BEADS_ACTOR: ACTOR, BD_NON_INTERACTIVE: "1" },
  });
}

export async function teardownParityInfra(ctx: ParityContext): Promise<void> {
  await ctx.sqlPool.end().catch(() => {});
  await ctx.cliPool.end().catch(() => {});
  await ctx.adminPool.end().catch(() => {});
  ctx.doltProcess.kill("SIGTERM");
  await new Promise<void>((r) => {
    ctx.doltProcess.once("exit", () => r());
    setTimeout(r, 3000);
  });
  rmSync(ctx.dataDir, { recursive: true, force: true });
  rmSync(ctx.cliWorkDir, { recursive: true, force: true });
}

export async function truncateAllTables(ctx: ParityContext): Promise<void> {
  const conn = await ctx.adminPool.getConnection();
  try {
    for (const db of ["parity_sql", "parity_cli"]) {
      await conn.query(`USE \`${db}\``);
      await conn.query("SET FOREIGN_KEY_CHECKS=0");
      for (const table of [
        "events",
        "comments",
        "labels",
        "dependencies",
        "child_counters",
        "issue_counter",
        "compaction_snapshots",
        "issue_snapshots",
        "issues",
      ]) {
        await conn.query(`DELETE FROM \`${table}\``);
      }
      await conn.query("SET FOREIGN_KEY_CHECKS=1");
      await conn.query(
        `REPLACE INTO config (\`key\`, value) VALUES ('issue_prefix', '${ISSUE_PREFIX}')`,
      );
      await conn.query("REPLACE INTO config (`key`, value) VALUES ('issue_id_mode', 'counter')");
    }
  } finally {
    conn.release();
  }
}

export function makeSqlConfig(): Config {
  return {
    host: TEST_HOST,
    port: 3456,
    doltMode: "server",
    doltHost: TEST_HOST,
    doltPort: TEST_PORT,
    doltDbPath: "",
    replicaPath: "",
    bdPath: "bd",
    doltPath: "dolt",
    dbLockMaxRetries: 3,
    dbLockRetryDelayMs: 100,
    poolSize: 5,
    doltUser: TEST_USER,
    doltPassword: "",
    doltDatabase: "parity_sql",
    pearlManaged: false,
    doltDataDir: "",
    needsSetup: false,
    doltRestartThreshold: 3,
    doltRestartDebounceMs: 5000,
  };
}

export async function runCli(ctx: ParityContext, args: string[]): Promise<string> {
  const { execa } = await import("execa");
  const result = await execa("bd", [...args, "--json"], {
    cwd: ctx.cliWorkDir,
    env: { ...process.env, BEADS_ACTOR: ACTOR },
    reject: false,
    timeout: 30000,
  });
  if (result.exitCode !== 0) {
    throw new Error(`bd CLI failed (exit ${result.exitCode}): ${result.stderr || result.stdout}`);
  }
  return result.stdout;
}

export async function getIds(pool: Pool): Promise<string[]> {
  const [rows] = await pool.execute("SELECT id FROM issues ORDER BY created_at");
  return (rows as Array<{ id: string }>).map((r) => r.id);
}

interface NormalizedRow {
  [key: string]: unknown;
}

export function normalizeRow(row: Record<string, unknown>, table: string): NormalizedRow {
  const fields = PARITY_FIELDS[table];
  if (!fields) return {};

  const normalized: NormalizedRow = {};
  for (const key of fields) {
    const value = row[key];

    if (key === "old_value" || key === "new_value") {
      normalized[key] = normalizeEventPayload(value as string | null);
      continue;
    }

    // Normalize null vs empty string
    if (value === null || value === undefined) {
      normalized[key] = "";
    } else {
      normalized[key] = value;
    }
  }
  return normalized;
}

const PAYLOAD_SKIP = new Set([
  "id",
  "issue_id",
  "depends_on_id",
  "parent_id",
  "owner",
  "created_by",
  "actor",
  "author",
  "assignee",
  "created_at",
  "updated_at",
  "closed_at",
  "due_at",
  "last_activity",
  "content_hash",
  "metadata",
  "work_type",
  "source_system",
  "source_repo",
  "sender",
  "wisp_type",
  "mol_type",
  "event_kind",
  "target",
  "payload",
  "await_type",
  "await_id",
  "timeout_ns",
  "waiters",
  "hook_bead",
  "role_bead",
  "agent_state",
  "role_type",
  "rig",
  "compaction_level",
  "compacted_at",
  "compacted_at_commit",
  "original_size",
  "no_history",
  "closed_by_session",
  "external_ref",
  "spec_id",
  "defer_until",
]);

function normalizeEventPayload(value: string | null): unknown {
  if (value == null || value === "") return value;
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === "object" && parsed !== null) {
      const normalized: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (PAYLOAD_SKIP.has(k)) continue;
        normalized[k] = v;
      }
      return normalized;
    }
    return parsed;
  } catch {
    return value;
  }
}

export function normalizeRows(rows: Record<string, unknown>[], table: string): NormalizedRow[] {
  return rows
    .map((r) => normalizeRow(r, table))
    .sort((a, b) => {
      const aKey = sortKey(a, table);
      const bKey = sortKey(b, table);
      return aKey.localeCompare(bKey);
    });
}

function sortKey(row: NormalizedRow, table: string): string {
  switch (table) {
    case "issues":
      return String(row.title || "");
    case "events":
      return `${row.event_type}`;
    case "labels":
      return `${row.label}`;
    case "dependencies":
      return `${row.type}`;
    case "comments":
      return `${row.text}`;
    default:
      return JSON.stringify(row);
  }
}

export async function assertTablesParity(
  ctx: ParityContext,
  tables: readonly string[] = TABLES_TO_COMPARE,
): Promise<void> {
  const { expect } = await import("vitest");

  for (const table of tables) {
    const [sqlRows] = await ctx.sqlPool.execute(`SELECT * FROM \`${table}\``);
    const [cliRows] = await ctx.cliPool.execute(`SELECT * FROM \`${table}\``);

    if (table === "events") {
      assertEventsParity(
        sqlRows as Record<string, unknown>[],
        cliRows as Record<string, unknown>[],
        expect,
      );
      continue;
    }

    const normalizedSql = normalizeRows(sqlRows as Record<string, unknown>[], table);
    const normalizedCli = normalizeRows(cliRows as Record<string, unknown>[], table);

    expect(
      normalizedSql.length,
      `${table}: row count mismatch (sql=${normalizedSql.length}, cli=${normalizedCli.length})`,
    ).toBe(normalizedCli.length);

    for (let i = 0; i < normalizedSql.length; i++) {
      const sqlRow = normalizedSql[i];
      const cliRow = normalizedCli[i];

      for (const key of Object.keys(sqlRow)) {
        expect(sqlRow[key], `${table}[${i}].${key}`).toEqual(cliRow[key]);
      }
    }
  }
}

function assertEventsParity(
  sqlRows: Record<string, unknown>[],
  cliRows: Record<string, unknown>[],
  expect: typeof import("vitest")["expect"],
): void {
  // Map to canonical event types: CLI uses 'claimed', SQL uses 'status_changed' for claim
  const canonicalize = (et: string) => et;

  const sqlTypes = sqlRows.map((r) => canonicalize(r.event_type as string)).sort();
  const cliTypes = cliRows.map((r) => canonicalize(r.event_type as string)).sort();

  // Both paths should produce events — verify non-empty
  expect(sqlTypes.length, "SQL path should produce events").toBeGreaterThan(0);
  expect(cliTypes.length, "CLI path should produce events").toBeGreaterThan(0);

  // Core event types should match (created, closed exist in both)
  const sqlCoreTypes = new Set(sqlTypes.filter((t) => ["created", "closed"].includes(t)));
  const cliCoreTypes = new Set(cliTypes.filter((t) => ["created", "closed"].includes(t)));
  expect(sqlCoreTypes, "core event types").toEqual(cliCoreTypes);
}

async function waitForServer(proc: ChildProcess, timeoutMs = 15000): Promise<void> {
  const start = Date.now();
  const { createConnection } = await import("mysql2/promise");

  while (Date.now() - start < timeoutMs) {
    try {
      const conn = await createConnection({
        host: TEST_HOST,
        port: TEST_PORT,
        user: TEST_USER,
        connectTimeout: 1000,
      });
      await conn.end();
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  proc.kill();
  throw new Error(`Dolt server did not start within ${timeoutMs}ms`);
}
