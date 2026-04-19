import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createDoltPool, destroyPool } from "../dolt/pool.js";
import {
  assertTablesParity,
  getIds,
  isDoltAvailable,
  makeSqlConfig,
  type ParityContext,
  runCli,
  setupParityInfra,
  teardownParityInfra,
  truncateAllTables,
} from "./parity-test-helpers.js";
import {
  sqlAddComment,
  sqlAddDependency,
  sqlCloseIssue,
  sqlCreateIssue,
  sqlRemoveDependency,
  sqlUpdateIssue,
} from "./sql-writer.js";

const SKIP = !isDoltAvailable();

describe.skipIf(SKIP)("SQL Writer Parity Tests", () => {
  let ctx: ParityContext;
  let config: ReturnType<typeof makeSqlConfig>;

  beforeAll(async () => {
    ctx = await setupParityInfra();
    config = makeSqlConfig();
    createDoltPool(config);
  }, 60000);

  afterAll(async () => {
    await destroyPool();
    if (ctx) await teardownParityInfra(ctx);
  }, 15000);

  beforeEach(async () => {
    await destroyPool();
    await truncateAllTables(ctx);
    createDoltPool(config);
  }, 15000);

  // ─── Core Operations ──────────────────────────────────

  describe("create", () => {
    it("basic issue creation produces identical rows", async () => {
      await sqlCreateIssue(config, {
        title: "Test Issue",
        description: "A description",
        priority: 1,
        issue_type: "task",
      });
      await runCli(ctx, [
        "create",
        "Test Issue",
        "--description",
        "A description",
        "--priority",
        "P1",
        "--type",
        "task",
      ]);

      await assertTablesParity(ctx, ["issues", "events"]);
    });
  });

  describe("update", () => {
    it("update title and description produces identical rows", async () => {
      await sqlCreateIssue(config, { title: "Original", description: "Original desc" });
      await runCli(ctx, ["create", "Original", "--description", "Original desc"]);

      const sqlId = (await getIds(ctx.sqlPool))[0];
      const cliId = (await getIds(ctx.cliPool))[0];

      await sqlUpdateIssue(config, sqlId, { title: "Updated Title", description: "Updated desc" });
      await runCli(ctx, [
        "update",
        cliId,
        "--title",
        "Updated Title",
        "--description",
        "Updated desc",
      ]);

      await assertTablesParity(ctx, ["issues", "events"]);
    });

    it("update status produces identical rows", async () => {
      await sqlCreateIssue(config, { title: "Status Test" });
      await runCli(ctx, ["create", "Status Test"]);

      const sqlId = (await getIds(ctx.sqlPool))[0];
      const cliId = (await getIds(ctx.cliPool))[0];

      await sqlUpdateIssue(config, sqlId, { status: "in_progress" });
      await runCli(ctx, ["update", cliId, "--status", "in_progress"]);

      await assertTablesParity(ctx, ["issues", "events"]);
    });

    it("claim produces identical rows", async () => {
      await sqlCreateIssue(config, { title: "Claim Test" });
      await runCli(ctx, ["create", "Claim Test"]);

      const sqlId = (await getIds(ctx.sqlPool))[0];
      const cliId = (await getIds(ctx.cliPool))[0];

      await sqlUpdateIssue(config, sqlId, { claim: true });
      await runCli(ctx, ["update", cliId, "--claim"]);

      await assertTablesParity(ctx, ["issues", "events"]);
    });
  });

  describe("close", () => {
    it("close without reason produces identical rows", async () => {
      await sqlCreateIssue(config, { title: "Close Test" });
      await runCli(ctx, ["create", "Close Test"]);

      const sqlId = (await getIds(ctx.sqlPool))[0];
      const cliId = (await getIds(ctx.cliPool))[0];

      await sqlCloseIssue(config, sqlId);
      await runCli(ctx, ["close", cliId]);

      await assertTablesParity(ctx, ["issues", "events"]);
    });

    it("close with reason produces identical rows", async () => {
      await sqlCreateIssue(config, { title: "Close Reason Test" });
      await runCli(ctx, ["create", "Close Reason Test"]);

      const sqlId = (await getIds(ctx.sqlPool))[0];
      const cliId = (await getIds(ctx.cliPool))[0];

      await sqlCloseIssue(config, sqlId, "Done and dusted");
      await runCli(ctx, ["close", cliId, "--reason", "Done and dusted"]);

      await assertTablesParity(ctx, ["issues", "events"]);
    });
  });

  describe("comment", () => {
    it("add comment produces identical rows", async () => {
      await sqlCreateIssue(config, { title: "Comment Test" });
      await runCli(ctx, ["create", "Comment Test"]);

      const sqlId = (await getIds(ctx.sqlPool))[0];
      const cliId = (await getIds(ctx.cliPool))[0];

      await sqlAddComment(config, sqlId, "This is a test comment");
      await runCli(ctx, ["comment", cliId, "This is a test comment"]);

      await assertTablesParity(ctx, ["issues", "events", "comments"]);
    });
  });

  describe("dependency", () => {
    it("add dependency produces identical rows", async () => {
      await sqlCreateIssue(config, { title: "Blocker" });
      await sqlCreateIssue(config, { title: "Blocked" });
      await runCli(ctx, ["create", "Blocker"]);
      await runCli(ctx, ["create", "Blocked"]);

      const sqlIds = await getIds(ctx.sqlPool);
      const cliIds = await getIds(ctx.cliPool);
      expect(sqlIds).toHaveLength(2);
      expect(cliIds).toHaveLength(2);

      await sqlAddDependency(config, sqlIds[1], sqlIds[0]);
      await runCli(ctx, ["dep", "add", cliIds[1], cliIds[0]]);

      await assertTablesParity(ctx, ["issues", "events", "dependencies"]);
    });

    it("remove dependency produces identical rows", async () => {
      await sqlCreateIssue(config, { title: "Blocker" });
      await sqlCreateIssue(config, { title: "Blocked" });
      await runCli(ctx, ["create", "Blocker"]);
      await runCli(ctx, ["create", "Blocked"]);

      const sqlIds = await getIds(ctx.sqlPool);
      const cliIds = await getIds(ctx.cliPool);

      await sqlAddDependency(config, sqlIds[1], sqlIds[0]);
      await runCli(ctx, ["dep", "add", cliIds[1], cliIds[0]]);

      await sqlRemoveDependency(config, sqlIds[1], sqlIds[0]);
      await runCli(ctx, ["dep", "remove", cliIds[1], cliIds[0]]);

      await assertTablesParity(ctx, ["issues", "events", "dependencies"]);
    });
  });

  // ─── Edge Cases ───────────────────────────────────────

  describe("edge cases", () => {
    it("title with quotes and special characters", async () => {
      const title = `O'Brien "quoted" <tag> & ampersand`;
      await sqlCreateIssue(config, { title });
      await runCli(ctx, ["create", title]);

      await assertTablesParity(ctx, ["issues", "events"]);
    });

    it("multi-line markdown description", async () => {
      const description = `# Heading

Some **bold** text and _italic_ text.

- List item 1
- List item 2

\`\`\`typescript
const x = 42;
\`\`\``;
      await sqlCreateIssue(config, { title: "Markdown Test", description });
      await runCli(ctx, ["create", "Markdown Test", "--description", description]);

      await assertTablesParity(ctx, ["issues", "events"]);
    });

    it("multiple labels", async () => {
      await sqlCreateIssue(config, { title: "Labels Test", labels: ["bug", "frontend", "urgent"] });
      await runCli(ctx, ["create", "Labels Test", "--labels", "bug,frontend,urgent"]);

      await assertTablesParity(ctx, ["issues", "events", "labels"]);
    });

    it("estimate", async () => {
      await sqlCreateIssue(config, { title: "Estimate Test", estimated_minutes: 120 });
      await runCli(ctx, ["create", "Estimate Test", "--estimate", "120"]);

      await assertTablesParity(ctx, ["issues", "events"]);
    });

    it("due date", async () => {
      const due = "2026-12-31";
      await sqlCreateIssue(config, { title: "Due Date Test", due });
      await runCli(ctx, ["create", "Due Date Test", "--due", due]);

      await assertTablesParity(ctx, ["issues", "events"]);
    });

    it("parent issue (hierarchical child)", async () => {
      await sqlCreateIssue(config, { title: "Parent Issue" });
      await runCli(ctx, ["create", "Parent Issue"]);

      const sqlParentId = (await getIds(ctx.sqlPool))[0];
      const cliParentId = (await getIds(ctx.cliPool))[0];

      await sqlCreateIssue(config, { title: "Child Issue", parent: sqlParentId });
      await runCli(ctx, ["create", "Child Issue", "--parent", cliParentId]);

      await assertTablesParity(ctx, ["issues", "events", "dependencies"]);
    });
  });

  // ─── Regression Tests ─────────────────────────────────

  describe("regression", () => {
    it("blocking chain: close middle issue", async () => {
      await sqlCreateIssue(config, { title: "Issue A" });
      await sqlCreateIssue(config, { title: "Issue B" });
      await sqlCreateIssue(config, { title: "Issue C" });
      await runCli(ctx, ["create", "Issue A"]);
      await runCli(ctx, ["create", "Issue B"]);
      await runCli(ctx, ["create", "Issue C"]);

      const sqlIds = await getIds(ctx.sqlPool);
      const cliIds = await getIds(ctx.cliPool);
      expect(sqlIds).toHaveLength(3);
      expect(cliIds).toHaveLength(3);

      await sqlAddDependency(config, sqlIds[0], sqlIds[1]);
      await sqlAddDependency(config, sqlIds[1], sqlIds[2]);
      await runCli(ctx, ["dep", "add", cliIds[0], cliIds[1]]);
      await runCli(ctx, ["dep", "add", cliIds[1], cliIds[2]]);

      await sqlCloseIssue(config, sqlIds[1]);
      await runCli(ctx, ["close", cliIds[1], "--force"]);

      await assertTablesParity(ctx, ["issues", "events", "dependencies"]);
    });

    it("reverse dependency cleanup on delete (regression for eb2b4ad)", async () => {
      await sqlCreateIssue(config, { title: "Depends On This" });
      await sqlCreateIssue(config, { title: "Depends On That" });
      await runCli(ctx, ["create", "Depends On This"]);
      await runCli(ctx, ["create", "Depends On That"]);

      const sqlIds = await getIds(ctx.sqlPool);
      const cliIds = await getIds(ctx.cliPool);

      await sqlAddDependency(config, sqlIds[1], sqlIds[0]);
      await runCli(ctx, ["dep", "add", cliIds[1], cliIds[0]]);

      // Delete via SQL (mirroring the server-mode delete logic from issue-writer.ts)
      await ctx.sqlPool.execute("DELETE FROM parity_sql.dependencies WHERE depends_on_id = ?", [
        sqlIds[0],
      ]);
      await ctx.sqlPool.execute("DELETE FROM parity_sql.issues WHERE id = ?", [sqlIds[0]]);
      await runCli(ctx, ["delete", cliIds[0], "--force"]);

      await assertTablesParity(ctx, ["issues", "dependencies"]);
    });
  });

  // ─── Performance ──────────────────────────────────────

  describe("performance", () => {
    it("SQL path operations complete in <500ms", async () => {
      const WARMUP_ITERATIONS = 1;
      const SAMPLE_COUNT = 10;
      const timings: Record<string, number[]> = {
        create: [],
        update: [],
        close: [],
        comment: [],
        depAdd: [],
        depRemove: [],
      };

      for (let i = 0; i < WARMUP_ITERATIONS + SAMPLE_COUNT; i++) {
        await truncateAllTables(ctx);
        await destroyPool();
        createDoltPool(config);

        const isWarmup = i < WARMUP_ITERATIONS;

        let start = performance.now();
        const result = await sqlCreateIssue(config, {
          title: `Perf ${i}`,
          description: "Perf test",
        });
        if (!isWarmup) timings.create.push(performance.now() - start);

        const id = (result.data as { id: string }).id;

        start = performance.now();
        await sqlUpdateIssue(config, id, { title: `Perf Updated ${i}` });
        if (!isWarmup) timings.update.push(performance.now() - start);

        start = performance.now();
        await sqlAddComment(config, id, "Perf comment");
        if (!isWarmup) timings.comment.push(performance.now() - start);

        const depResult = await sqlCreateIssue(config, { title: `Perf Dep ${i}` });
        const depId = (depResult.data as { id: string }).id;

        start = performance.now();
        await sqlAddDependency(config, id, depId);
        if (!isWarmup) timings.depAdd.push(performance.now() - start);

        start = performance.now();
        await sqlRemoveDependency(config, id, depId);
        if (!isWarmup) timings.depRemove.push(performance.now() - start);

        start = performance.now();
        await sqlCloseIssue(config, id);
        if (!isWarmup) timings.close.push(performance.now() - start);
      }

      for (const [op, times] of Object.entries(timings)) {
        const sorted = times.sort((a, b) => a - b);
        const p95Idx = Math.floor(sorted.length * 0.95);
        const p95 = sorted[p95Idx];
        expect(p95, `${op} p95 should be <500ms, got ${p95.toFixed(1)}ms`).toBeLessThan(500);
      }
    });
  });
});
