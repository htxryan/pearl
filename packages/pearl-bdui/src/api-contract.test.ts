/**
 * API Contract Test (EARS-13, AC-13, beads-gui-0n3t)
 *
 * Validates that pearl-bdui's actual route handlers emit responses whose shapes
 * conform to schemas derived from `@pearl/shared` types. Every schema is built
 * from the canonical TypeScript interface — if either side drifts, this test
 * catches it.
 *
 * Approach
 * --------
 * The shipping `createServer()` requires a real Dolt pool. To keep this a
 * unit-level test we boot only the route registration we want to exercise,
 * with `queryWithRetry` mocked to return canned rows. This means the test
 * drives the real handler logic (column projection, NULL handling, label
 * enrichment, etc.) and validates the runtime shape against Zod schemas
 * mirroring the shared types.
 */

import type {
  HealthResponse,
  IssueListItem,
  IssueStatus,
  IssueType,
  LabelColor,
  Priority,
} from "@pearl/shared";
import { ISSUE_PRIORITIES, ISSUE_STATUSES, ISSUE_TYPES, LABEL_COLORS } from "@pearl/shared";
import Fastify from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { Config } from "../src/config.js";

// queryWithRetry is mocked at module-load time so route handlers see our stub.
const queryWithRetryMock = vi.fn();
vi.mock("./dolt/pool.js", () => ({
  queryWithRetry: (...args: unknown[]) => queryWithRetryMock(...args),
  getPool: () => ({
    query: vi.fn().mockResolvedValue([[{ "1": 1 }]]),
  }),
}));

// Now import the route registration functions — these import dolt/pool.js
// which is mocked above.
const { registerHealthRoutes } = await import("./routes/health.js");
const { registerIssueRoutes } = await import("./routes/issues.js");
const { registerLabelRoutes } = await import("./routes/labels.js");

// ─── Zod schemas mirroring @pearl/shared ────────────────────────

const IssueStatusSchema = z.enum(ISSUE_STATUSES as [IssueStatus, ...IssueStatus[]]);
const IssueTypeSchema = z.enum(ISSUE_TYPES as [IssueType, ...IssueType[]]);
const PrioritySchema = z.union(
  ISSUE_PRIORITIES.map((p) => z.literal(p)) as unknown as readonly [
    z.ZodLiteral<Priority>,
    z.ZodLiteral<Priority>,
    ...z.ZodLiteral<Priority>[],
  ],
);
const LabelColorSchema = z.enum(LABEL_COLORS as [LabelColor, ...LabelColor[]]);

/**
 * GET /api/health — mirrors `HealthResponse` from @pearl/shared.
 * `.strict()` so unknown fields fail loudly.
 */
const HealthResponseSchema = z
  .object({
    status: z.enum(["healthy", "degraded", "unhealthy"]),
    dolt_server: z.enum(["running", "starting", "stopped", "error"]),
    uptime_seconds: z.number(),
    version: z.string(),
    project_prefix: z.string().optional(),
    dolt_mode: z.enum(["embedded", "server"]),
  })
  .strict();

/**
 * GET /api/issues (default field set) — mirrors `IssueListItem` from
 * @pearl/shared exactly. `.strict()` enforces that no unexpected fields
 * leak into the response.
 *
 * The handler does column projection via `ISSUE_LIST_FIELDS`. With no
 * `?fields=` query param it returns ALL fields in `IssueListItem`, so
 * the schema is fully strict on the default request.
 */
const IssueListItemSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    status: IssueStatusSchema,
    priority: PrioritySchema,
    issue_type: IssueTypeSchema,
    assignee: z.string().nullable(),
    owner: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    due_at: z.string().nullable(),
    pinned: z.boolean(),
    has_attachments: z.boolean(),
    labels: z.array(z.string()),
    labelColors: z.record(z.string(), LabelColorSchema),
  })
  .strict();

const IssueListSchema = z.array(IssueListItemSchema);

/**
 * GET /api/labels — `LabelDefinition` plus a `count` field returned by
 * the actual handler. `color` can be NULL when a label is used but has
 * no definition row. `.strict()` locks the shape.
 */
const LabelWithCountSchema = z
  .object({
    name: z.string(),
    color: LabelColorSchema.nullable(),
    count: z.number(),
  })
  .strict();

const LabelListSchema = z.array(LabelWithCountSchema);

// ─── Mocks ──────────────────────────────────────────────────────

const stubConfig: Config = {
  doltMode: "embedded",
  doltDatabase: "sample_project",
  needsSetup: false,
} as Config;

// Real handler returns rows shaped like IssueListItem (the projection),
// but BEFORE the handler enriches `labels` and `labelColors`. We canon-
// icalize the SQL result so the handler's enrichment loop produces a
// strict `IssueListItem` from end to end.
const issueRowFromSql = {
  id: "test-001",
  title: "Test issue",
  status: "open",
  priority: 2,
  issue_type: "task",
  assignee: null,
  owner: "tester",
  created_at: "2026-05-01T00:00:00.000Z",
  updated_at: "2026-05-01T00:00:00.000Z",
  due_at: null,
  pinned: false,
  // Stored as TINYINT — handler coerces to boolean.
  has_attachments: 0,
};

const labelRowFromSql = {
  name: "bug",
  color: "red",
  count: 3,
};

// ─── Helpers ────────────────────────────────────────────────────

/**
 * Sequence the mock to return values for SPECIFIC SQL shapes. We can't
 * match by SQL text (the handler passes a callback, not the SQL string,
 * to queryWithRetry), so we count distinct response phases:
 *
 * - onReady setup hooks: drained as `[]` (no-op DDL operations)
 * - first call after onReady drains: returns the per-test seed
 * - subsequent calls in a single request: chained via `.mockResolvedValueOnce`
 */
function seedQueryResponses(...phases: unknown[]): void {
  // Default: empty array so onReady hooks succeed silently.
  queryWithRetryMock.mockResolvedValue([]);
  // Override with phase-specific responses (consumed in order).
  for (const phase of phases) {
    queryWithRetryMock.mockResolvedValueOnce(phase);
  }
}

async function buildIssuesApp() {
  const app = Fastify();
  registerIssueRoutes(
    app,
    () => stubConfig,
    // The GET /api/issues handler does not invoke writeService — empty stub OK.
    {} as Parameters<typeof registerIssueRoutes>[2],
  );
  await app.ready();
  // After onReady drains its 3 setup-call defaults, reset and seed the
  // GET path: SELECT issues, labels join, fetchLabelColors.
  queryWithRetryMock.mockReset();
  seedQueryResponses(
    [issueRowFromSql], // SELECT issues result
    [{ issue_id: "test-001", label: "bug" }], // labels join
    [{ name: "bug", color: "red" }], // fetchLabelColors
  );
  return app;
}

async function buildLabelsApp() {
  const app = Fastify();
  registerLabelRoutes(app, () => stubConfig);
  await app.ready();
  queryWithRetryMock.mockReset();
  seedQueryResponses([labelRowFromSql]);
  return app;
}

async function buildHealthApp() {
  const app = Fastify();
  // Embedded mode short-circuits before any pool access — no mock needed.
  registerHealthRoutes(
    app,
    () => null, // no DoltServerManager
    () => stubConfig,
  );
  await app.ready();
  return app;
}

// ─── Tests ──────────────────────────────────────────────────────

describe("API contract — real handlers emit shapes that match @pearl/shared", () => {
  beforeEach(() => {
    queryWithRetryMock.mockReset();
  });

  afterEach(() => {
    queryWithRetryMock.mockReset();
  });

  it("GET /api/health returns a strict HealthResponse", async () => {
    const app = await buildHealthApp();
    try {
      const response = await app.inject({ method: "GET", url: "/api/health" });
      expect(response.statusCode).toBe(200);

      const parsed = HealthResponseSchema.safeParse(response.json());
      if (!parsed.success) {
        throw new Error(
          `Health schema mismatch: ${JSON.stringify(parsed.error.format(), null, 2)}`,
        );
      }
      const body = parsed.data;
      // Embedded mode without setup is "degraded" per the handler.
      expect(body.dolt_mode).toBe("embedded");
    } finally {
      await app.close();
    }
  });

  it("GET /api/issues returns strict IssueListItem rows (real handler)", async () => {
    const app = await buildIssuesApp();
    try {
      const response = await app.inject({ method: "GET", url: "/api/issues" });
      expect(response.statusCode).toBe(200);

      const parsed = IssueListSchema.safeParse(response.json());
      if (!parsed.success) {
        throw new Error(
          `Issue list schema mismatch: ${JSON.stringify(parsed.error.format(), null, 2)}`,
        );
      }
      expect(parsed.data).toHaveLength(1);
      const item: IssueListItem = parsed.data[0]!;
      expect(item.id).toBe("test-001");
      // Handler coerces TINYINT -> boolean
      expect(item.has_attachments).toBe(false);
      expect(item.labels).toEqual(["bug"]);
      expect(item.labelColors).toEqual({ bug: "red" });
    } finally {
      await app.close();
    }
  });

  it("GET /api/issues handles empty result set", async () => {
    const app = Fastify();
    registerIssueRoutes(app, () => stubConfig, {} as Parameters<typeof registerIssueRoutes>[2]);
    await app.ready();
    queryWithRetryMock.mockReset();
    seedQueryResponses([]); // empty issue list
    try {
      const response = await app.inject({ method: "GET", url: "/api/issues" });
      const parsed = IssueListSchema.safeParse(response.json());
      expect(parsed.success).toBe(true);
      expect(parsed.data).toEqual([]);
    } finally {
      await app.close();
    }
  });

  it("GET /api/labels returns LabelWithCount rows (real handler)", async () => {
    const app = await buildLabelsApp();
    try {
      const response = await app.inject({ method: "GET", url: "/api/labels" });
      expect(response.statusCode).toBe(200);

      const parsed = LabelListSchema.safeParse(response.json());
      if (!parsed.success) {
        throw new Error(
          `Labels schema mismatch: ${JSON.stringify(parsed.error.format(), null, 2)}`,
        );
      }
      expect(parsed.data).toHaveLength(1);
      expect(parsed.data[0]!.name).toBe("bug");
    } finally {
      await app.close();
    }
  });

  it("GET /api/labels permits null color (label used but no definition)", async () => {
    const app = Fastify();
    registerLabelRoutes(app, () => stubConfig);
    await app.ready();
    queryWithRetryMock.mockReset();
    seedQueryResponses([{ name: "orphan", color: null, count: 1 }]);
    try {
      const response = await app.inject({ method: "GET", url: "/api/labels" });
      const parsed = LabelListSchema.safeParse(response.json());
      expect(parsed.success).toBe(true);
    } finally {
      await app.close();
    }
  });
});

describe("API contract — schemas reject malformed payloads", () => {
  it("rejects an issue row with an unknown status value", () => {
    const bad = {
      ...issueRowFromSql,
      has_attachments: false,
      labels: [],
      labelColors: {},
      status: "frobnicated",
    };
    const parsed = IssueListItemSchema.safeParse(bad);
    expect(parsed.success).toBe(false);
  });

  it("rejects an issue row missing required IssueListItem fields", () => {
    const incomplete = { id: "x", title: "y", labels: [], labelColors: {} };
    const parsed = IssueListItemSchema.safeParse(incomplete);
    expect(parsed.success).toBe(false);
  });

  it("rejects an issue row with an extra unknown field (.strict)", () => {
    const extra = {
      ...issueRowFromSql,
      has_attachments: false,
      labels: [],
      labelColors: {},
      surprise: "field",
    };
    const parsed = IssueListItemSchema.safeParse(extra);
    expect(parsed.success).toBe(false);
  });

  it("rejects a health response with extra unknown fields (.strict)", () => {
    const bad: HealthResponse & { surprise: string } = {
      status: "healthy",
      dolt_server: "running",
      uptime_seconds: 1,
      version: "0.1.0",
      project_prefix: "x",
      dolt_mode: "embedded",
      surprise: "field",
    };
    const parsed = HealthResponseSchema.safeParse(bad);
    expect(parsed.success).toBe(false);
  });
});
