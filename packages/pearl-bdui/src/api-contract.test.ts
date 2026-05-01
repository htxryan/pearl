/**
 * API Contract Test (EARS-13, AC-13, beads-gui-0n3t)
 *
 * Validates that the canonical API responses conform to schemas derived
 * manually from `@pearl/shared` types. The test uses Zod schemas as the
 * runtime contract: if someone changes a `@pearl/shared` type without
 * updating the runtime response shape (or vice versa), the parse will
 * fail and the test will catch it.
 *
 * Approach
 * --------
 * The shipping `createServer()` requires a real Config + Dolt pool. To keep
 * this a unit-level contract test, we build a minimal Fastify app per case
 * and register fake handlers that return canned fixtures shaped like the
 * real responses. We then parse those fixtures with Zod schemas mirroring
 * `@pearl/shared` types.
 *
 * Gap (documented for future work): this validates that the *fixture* matches
 * the schema. To validate the actual route handlers, the route modules would
 * need to expose their handler logic without requiring a live Dolt pool. The
 * label and health routes both pull from the pool, and `registerIssueRoutes`
 * needs both Config and a WriteService. A follow-up could refactor route
 * registration to accept an injectable data source so this test can drive
 * the real handlers with a mock layer instead of canned fixtures.
 */

import type {
  HealthResponse,
  Issue,
  IssueStatus,
  IssueType,
  LabelColor,
  LabelDefinition,
  Priority,
} from "@pearl/shared";
import { ISSUE_PRIORITIES, ISSUE_STATUSES, ISSUE_TYPES, LABEL_COLORS } from "@pearl/shared";
import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { z } from "zod";

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
 * GET /api/issues — mirrors `Issue` from @pearl/shared.
 *
 * Uses `.passthrough()` because the list endpoint applies column projection
 * (`ISSUE_LIST_FIELDS`) and may return only a subset of fields rather than
 * a full `Issue`. We assert that any present field matches the shared type's
 * shape; absent fields are allowed for projection-friendliness.
 *
 * NOTE: `.passthrough()` is intentional here — the list response is a
 * *projection* of `Issue`, not the full type. The strict-shape contract
 * is enforced on `GET /api/issues/:id` (full detail), which we do NOT
 * exercise in this test because it needs a real DB.
 */
const IssueListItemSchema = z
  .object({
    id: z.string(),
    title: z.string().optional(),
    status: IssueStatusSchema.optional(),
    priority: PrioritySchema.optional(),
    issue_type: IssueTypeSchema.optional(),
    assignee: z.string().nullable().optional(),
    owner: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    due_at: z.string().nullable().optional(),
    pinned: z.boolean().optional(),
    has_attachments: z.boolean().optional(),
    labels: z.array(z.string()),
    labelColors: z.record(z.string(), LabelColorSchema),
  })
  .passthrough();

const IssueListSchema = z.array(IssueListItemSchema);

/**
 * GET /api/labels — mirrors `LabelDefinition` from @pearl/shared, plus
 * a `count` field returned by the actual handler (LabelWithCount). The
 * `color` field can be NULL when a label is used but has no definition
 * (the route falls back to a SELECT that returns `NULL` color), so we
 * permit nullable here. We use `.strict()` to lock the shape.
 */
const LabelWithCountSchema = z
  .object({
    name: z.string(),
    color: LabelColorSchema.nullable(),
    count: z.number(),
  })
  .strict();

const LabelListSchema = z.array(LabelWithCountSchema);

// ─── Fixtures shaped like real responses ────────────────────────

const healthFixture: HealthResponse = {
  status: "healthy",
  dolt_server: "running",
  uptime_seconds: 42,
  version: "0.1.0",
  project_prefix: "sample-project",
  dolt_mode: "embedded",
};

const issueFixture: Pick<
  Issue,
  | "id"
  | "title"
  | "status"
  | "priority"
  | "issue_type"
  | "assignee"
  | "owner"
  | "created_at"
  | "updated_at"
  | "due_at"
  | "pinned"
  | "has_attachments"
  | "labels"
  | "labelColors"
> = {
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
  has_attachments: false,
  labels: ["bug"],
  labelColors: { bug: "red" },
};

const labelFixture: LabelDefinition & { count: number } = {
  name: "bug",
  color: "red",
  count: 3,
};

// ─── Tests ──────────────────────────────────────────────────────

describe("API contract — response shapes match @pearl/shared types", () => {
  it("GET /api/health returns a HealthResponse-shaped body", async () => {
    const app = Fastify();
    app.get("/api/health", async (_req, reply) => reply.send(healthFixture));

    const response = await app.inject({ method: "GET", url: "/api/health" });
    expect(response.statusCode).toBe(200);

    const parsed = HealthResponseSchema.safeParse(response.json());
    if (!parsed.success) {
      throw new Error(`Health schema mismatch: ${JSON.stringify(parsed.error.format(), null, 2)}`);
    }

    await app.close();
  });

  it("GET /api/issues returns an array of Issue-projection-shaped rows", async () => {
    const app = Fastify();
    app.get("/api/issues", async (_req, reply) => reply.send([issueFixture]));

    const response = await app.inject({ method: "GET", url: "/api/issues" });
    expect(response.statusCode).toBe(200);

    const parsed = IssueListSchema.safeParse(response.json());
    if (!parsed.success) {
      throw new Error(
        `Issue list schema mismatch: ${JSON.stringify(parsed.error.format(), null, 2)}`,
      );
    }
    expect(parsed.data).toHaveLength(1);
    expect(parsed.data[0].id).toBe("test-001");

    await app.close();
  });

  it("GET /api/issues accepts an empty result set", async () => {
    const app = Fastify();
    app.get("/api/issues", async (_req, reply) => reply.send([]));

    const response = await app.inject({ method: "GET", url: "/api/issues" });
    const parsed = IssueListSchema.safeParse(response.json());
    expect(parsed.success).toBe(true);

    await app.close();
  });

  it("GET /api/labels returns an array of LabelWithCount-shaped rows", async () => {
    const app = Fastify();
    app.get("/api/labels", async (_req, reply) => reply.send([labelFixture]));

    const response = await app.inject({ method: "GET", url: "/api/labels" });
    expect(response.statusCode).toBe(200);

    const parsed = LabelListSchema.safeParse(response.json());
    if (!parsed.success) {
      throw new Error(`Labels schema mismatch: ${JSON.stringify(parsed.error.format(), null, 2)}`);
    }
    expect(parsed.data).toHaveLength(1);
    expect(parsed.data[0].name).toBe("bug");

    await app.close();
  });

  it("GET /api/labels permits null color (label used but no definition)", async () => {
    const app = Fastify();
    app.get("/api/labels", async (_req, reply) =>
      reply.send([{ name: "orphan", color: null, count: 1 }]),
    );

    const response = await app.inject({ method: "GET", url: "/api/labels" });
    const parsed = LabelListSchema.safeParse(response.json());
    expect(parsed.success).toBe(true);

    await app.close();
  });

  // Negative-path sanity: schema rejects bad shapes. This guards the
  // contract: if @pearl/shared evolves and the schema isn't updated to
  // match, the schema must still flag obviously-wrong runtime payloads.
  it("rejects an issue with an unknown status value", async () => {
    const bad = { ...issueFixture, status: "frobnicated" };
    const parsed = IssueListItemSchema.safeParse(bad);
    expect(parsed.success).toBe(false);
  });

  it("rejects a health response with extra unknown fields (strict)", async () => {
    const bad = { ...healthFixture, surprise: "field" };
    const parsed = HealthResponseSchema.safeParse(bad);
    expect(parsed.success).toBe(false);
  });
});
