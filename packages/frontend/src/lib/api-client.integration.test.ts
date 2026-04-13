import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchIssues,
  fetchIssue,
  createIssue,
  updateIssue,
  closeIssue,
  fetchComments,
  addComment,
  fetchEvents,
  fetchAllDependencies,
  addDependency,
  removeDependency,
  fetchHealth,
  fetchStats,
  ApiClientError,
} from "./api-client";

// ─── Helpers ────────────────────────────────────────────────

function mockFetchOk(data: unknown, status = 200) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    status,
    json: () => Promise.resolve(data),
  } as Response);
}

function mockFetchError(status: number, body: unknown) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: false,
    status,
    statusText: "Error",
    json: () => Promise.resolve(body),
  } as Response);
}

function mockFetchNonJsonError(status: number, statusText: string) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: false,
    status,
    statusText,
    json: () => Promise.reject(new SyntaxError("Unexpected token")),
  } as Response);
}

function calledUrl(): string {
  return (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
}

function calledInit(): RequestInit {
  return (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1];
}

// ─── Tests ──────────────────────────────────────────────────

describe("API client integration contracts", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ─── fetchIssues ────────────────────────────────────────

  describe("fetchIssues", () => {
    it("should call GET /api/issues with no params when none provided", async () => {
      mockFetchOk([]);

      await fetchIssues();

      expect(calledUrl()).toBe("/api/issues");
      expect(calledInit().method).toBeUndefined(); // default GET
    });

    it("should append status query param", async () => {
      mockFetchOk([]);

      await fetchIssues(new URLSearchParams({ status: "open" }));

      expect(calledUrl()).toBe("/api/issues?status=open");
    });

    it("should append priority query param", async () => {
      mockFetchOk([]);

      await fetchIssues(new URLSearchParams({ priority: "1" }));

      expect(calledUrl()).toBe("/api/issues?priority=1");
    });

    it("should append multiple query params", async () => {
      mockFetchOk([]);

      const params = new URLSearchParams();
      params.set("status", "open");
      params.set("priority", "2");
      params.set("issue_type", "bug");
      params.set("assignee", "alice");
      params.set("search", "login");
      params.set("sort", "priority");
      params.set("direction", "asc");
      params.set("limit", "25");
      params.set("offset", "10");
      params.set("fields", "id,title,status");
      await fetchIssues(params);

      const url = new URL(calledUrl(), "http://localhost");
      expect(url.pathname).toBe("/api/issues");
      expect(url.searchParams.get("status")).toBe("open");
      expect(url.searchParams.get("priority")).toBe("2");
      expect(url.searchParams.get("issue_type")).toBe("bug");
      expect(url.searchParams.get("assignee")).toBe("alice");
      expect(url.searchParams.get("search")).toBe("login");
      expect(url.searchParams.get("sort")).toBe("priority");
      expect(url.searchParams.get("direction")).toBe("asc");
      expect(url.searchParams.get("limit")).toBe("25");
      expect(url.searchParams.get("offset")).toBe("10");
      expect(url.searchParams.get("fields")).toBe("id,title,status");
    });

    it("should return empty array for empty results", async () => {
      mockFetchOk([]);

      const result = await fetchIssues();

      expect(result).toEqual([]);
    });

    it("should return IssueListItem array shape", async () => {
      const mockItems = [
        {
          id: "ISS-1",
          title: "First",
          status: "open",
          priority: 1,
          issue_type: "task",
          assignee: null,
          owner: "bob",
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
          due_at: null,
          pinned: false,
          labels: [],
    labelColors: {},
        },
      ];
      mockFetchOk(mockItems);

      const result = await fetchIssues();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "ISS-1",
        title: "First",
        status: "open",
        priority: 1,
      });
    });

    it("should not set Content-Type header for GET requests", async () => {
      mockFetchOk([]);

      await fetchIssues();

      const headers = calledInit().headers as Record<string, string>;
      expect(headers["Content-Type"]).toBeUndefined();
    });

    it("should throw ApiClientError on error response", async () => {
      mockFetchError(500, {
        code: "INTERNAL_ERROR",
        message: "Server error",
        retryable: true,
      });

      await expect(fetchIssues()).rejects.toThrow(ApiClientError);
    });
  });

  // ─── fetchIssue ─────────────────────────────────────────

  describe("fetchIssue", () => {
    it("should call GET /api/issues/:id with encoded id", async () => {
      const mockIssue = { id: "ISS-1", title: "Test" };
      mockFetchOk(mockIssue);

      await fetchIssue("ISS-1");

      expect(calledUrl()).toBe("/api/issues/ISS-1");
    });

    it("should URL-encode special characters in id", async () => {
      mockFetchOk({ id: "feat/login", title: "Feature" });

      await fetchIssue("feat/login");

      expect(calledUrl()).toBe("/api/issues/feat%2Flogin");
    });

    it("should URL-encode spaces in id", async () => {
      mockFetchOk({ id: "my issue", title: "Spaced" });

      await fetchIssue("my issue");

      expect(calledUrl()).toBe("/api/issues/my%20issue");
    });

    it("should return full Issue shape", async () => {
      const fullIssue = {
        id: "ISS-1",
        title: "Test Issue",
        description: "A description",
        design: "",
        acceptance_criteria: "",
        notes: "",
        status: "open",
        priority: 1,
        issue_type: "task",
        assignee: null,
        owner: "alice",
        estimated_minutes: null,
        created_at: "2025-01-01T00:00:00Z",
        created_by: "alice",
        updated_at: "2025-01-01T00:00:00Z",
        closed_at: null,
        due_at: null,
        defer_until: null,
        external_ref: null,
        spec_id: null,
        pinned: false,
        is_template: false,
        labels: [],
    labelColors: {},
        metadata: {},
      };
      mockFetchOk(fullIssue);

      const result = await fetchIssue("ISS-1");

      expect(result).toEqual(fullIssue);
    });

    it("should throw ApiClientError with NOT_FOUND for 404", async () => {
      mockFetchError(404, {
        code: "NOT_FOUND",
        message: "Issue not found",
        retryable: false,
      });

      try {
        await fetchIssue("nonexistent");
        expect.fail("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ApiClientError);
        const apiErr = err as InstanceType<typeof ApiClientError>;
        expect(apiErr.status).toBe(404);
        expect(apiErr.apiError.code).toBe("NOT_FOUND");
        expect(apiErr.apiError.message).toBe("Issue not found");
        expect(apiErr.apiError.retryable).toBe(false);
      }
    });
  });

  // ─── createIssue ────────────────────────────────────────

  describe("createIssue", () => {
    it("should call POST /api/issues with JSON body", async () => {
      const mutationResponse = {
        success: true,
        data: { id: "ISS-NEW", title: "New Issue" },
        invalidationHints: [{ entity: "issues" }, { entity: "stats" }],
      };
      mockFetchOk(mutationResponse);

      await createIssue({ title: "New Issue" });

      expect(calledUrl()).toBe("/api/issues");
      expect(calledInit().method).toBe("POST");
    });

    it("should set Content-Type to application/json", async () => {
      mockFetchOk({ success: true, invalidationHints: [] });

      await createIssue({ title: "Test" });

      const headers = calledInit().headers as Record<string, string>;
      expect(headers["Content-Type"]).toBe("application/json");
    });

    it("should send CreateIssueRequest body as JSON string", async () => {
      mockFetchOk({ success: true, invalidationHints: [] });

      const req = {
        title: "Bug Report",
        description: "Something broke",
        issue_type: "bug" as const,
        priority: 1 as const,
        assignee: "alice",
        labels: ["frontend", "urgent"],
        due: "2025-06-01",
        estimated_minutes: 60,
      };
      await createIssue(req);

      const body = JSON.parse(calledInit().body as string);
      expect(body.title).toBe("Bug Report");
      expect(body.description).toBe("Something broke");
      expect(body.issue_type).toBe("bug");
      expect(body.priority).toBe(1);
      expect(body.assignee).toBe("alice");
      expect(body.labels).toEqual(["frontend", "urgent"]);
      expect(body.due).toBe("2025-06-01");
      expect(body.estimated_minutes).toBe(60);
    });

    it("should return MutationResponse with invalidationHints", async () => {
      const response = {
        success: true,
        data: { id: "ISS-42", title: "Created" },
        invalidationHints: [
          { entity: "issues" },
          { entity: "stats" },
        ],
      };
      mockFetchOk(response);

      const result = await createIssue({ title: "Created" });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.invalidationHints).toHaveLength(2);
      expect(result.invalidationHints[0].entity).toBe("issues");
      expect(result.invalidationHints[1].entity).toBe("stats");
    });

    it("should send minimal body with only title", async () => {
      mockFetchOk({ success: true, invalidationHints: [] });

      await createIssue({ title: "Minimal" });

      const body = JSON.parse(calledInit().body as string);
      expect(body).toEqual({ title: "Minimal" });
    });
  });

  // ─── updateIssue ────────────────────────────────────────

  describe("updateIssue", () => {
    it("should call PATCH /api/issues/:id with JSON body", async () => {
      mockFetchOk({ success: true, invalidationHints: [] });

      await updateIssue("ISS-1", { title: "Updated" });

      expect(calledUrl()).toBe("/api/issues/ISS-1");
      expect(calledInit().method).toBe("PATCH");
    });

    it("should set Content-Type header for body", async () => {
      mockFetchOk({ success: true, invalidationHints: [] });

      await updateIssue("ISS-1", { status: "in_progress" });

      const headers = calledInit().headers as Record<string, string>;
      expect(headers["Content-Type"]).toBe("application/json");
    });

    it("should URL-encode id in path", async () => {
      mockFetchOk({ success: true, invalidationHints: [] });

      await updateIssue("feat/auth", { title: "Updated Auth" });

      expect(calledUrl()).toBe("/api/issues/feat%2Fauth");
    });

    it("should send UpdateIssueRequest as JSON body", async () => {
      mockFetchOk({ success: true, invalidationHints: [] });

      await updateIssue("ISS-1", {
        status: "in_progress",
        priority: 0,
        assignee: "bob",
        pinned: true,
      });

      const body = JSON.parse(calledInit().body as string);
      expect(body.status).toBe("in_progress");
      expect(body.priority).toBe(0);
      expect(body.assignee).toBe("bob");
      expect(body.pinned).toBe(true);
    });

    it("should return MutationResponse", async () => {
      const response = {
        success: true,
        data: { id: "ISS-1", title: "Updated" },
        invalidationHints: [{ entity: "issues", id: "ISS-1" }],
      };
      mockFetchOk(response);

      const result = await updateIssue("ISS-1", { title: "Updated" });

      expect(result.success).toBe(true);
      expect(result.invalidationHints).toEqual([{ entity: "issues", id: "ISS-1" }]);
    });
  });

  // ─── closeIssue ─────────────────────────────────────────

  describe("closeIssue", () => {
    it("should call DELETE /api/issues/:id", async () => {
      mockFetchOk({ success: true, invalidationHints: [] });

      await closeIssue("ISS-1");

      expect(calledUrl()).toBe("/api/issues/ISS-1");
      expect(calledInit().method).toBe("DELETE");
    });

    it("should append reason as query param when provided", async () => {
      mockFetchOk({ success: true, invalidationHints: [] });

      await closeIssue("ISS-1", "completed");

      expect(calledUrl()).toBe("/api/issues/ISS-1?reason=completed");
    });

    it("should URL-encode reason with special characters", async () => {
      mockFetchOk({ success: true, invalidationHints: [] });

      await closeIssue("ISS-1", "won't fix & duplicate");

      const url = calledUrl();
      expect(url).toContain("reason=won't%20fix%20%26%20duplicate");
    });

    it("should URL-encode id in path", async () => {
      mockFetchOk({ success: true, invalidationHints: [] });

      await closeIssue("feat/login");

      expect(calledUrl()).toBe("/api/issues/feat%2Flogin");
    });

    it("should not append reason query when reason is undefined", async () => {
      mockFetchOk({ success: true, invalidationHints: [] });

      await closeIssue("ISS-1");

      expect(calledUrl()).toBe("/api/issues/ISS-1");
      expect(calledUrl()).not.toContain("?");
    });

    it("should not send body with DELETE request", async () => {
      mockFetchOk({ success: true, invalidationHints: [] });

      await closeIssue("ISS-1");

      expect(calledInit().body).toBeUndefined();
    });

    it("should not set Content-Type for DELETE without body", async () => {
      mockFetchOk({ success: true, invalidationHints: [] });

      await closeIssue("ISS-1");

      const headers = calledInit().headers as Record<string, string>;
      expect(headers["Content-Type"]).toBeUndefined();
    });

    it("should return MutationResponse", async () => {
      const response = {
        success: true,
        invalidationHints: [{ entity: "issues" }, { entity: "stats" }],
      };
      mockFetchOk(response);

      const result = await closeIssue("ISS-1");

      expect(result.success).toBe(true);
      expect(result.invalidationHints).toHaveLength(2);
    });
  });

  // ─── fetchComments ──────────────────────────────────────

  describe("fetchComments", () => {
    it("should call GET /api/issues/:id/comments", async () => {
      mockFetchOk([]);

      await fetchComments("ISS-1");

      expect(calledUrl()).toBe("/api/issues/ISS-1/comments");
    });

    it("should URL-encode issueId", async () => {
      mockFetchOk([]);

      await fetchComments("feat/auth");

      expect(calledUrl()).toBe("/api/issues/feat%2Fauth/comments");
    });

    it("should return Comment array shape", async () => {
      const comments = [
        {
          id: "CMT-1",
          issue_id: "ISS-1",
          author: "alice",
          text: "Looks good",
          created_at: "2025-01-01T00:00:00Z",
        },
      ];
      mockFetchOk(comments);

      const result = await fetchComments("ISS-1");

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "CMT-1",
        issue_id: "ISS-1",
        author: "alice",
        text: "Looks good",
      });
    });
  });

  // ─── addComment ─────────────────────────────────────────

  describe("addComment", () => {
    it("should call POST /api/issues/:id/comments with JSON body", async () => {
      mockFetchOk({
        success: true,
        data: { id: "CMT-1" },
        invalidationHints: [{ entity: "comments", id: "ISS-1" }],
      });

      await addComment("ISS-1", { text: "A comment" });

      expect(calledUrl()).toBe("/api/issues/ISS-1/comments");
      expect(calledInit().method).toBe("POST");
    });

    it("should set Content-Type header", async () => {
      mockFetchOk({ success: true, invalidationHints: [] });

      await addComment("ISS-1", { text: "test" });

      const headers = calledInit().headers as Record<string, string>;
      expect(headers["Content-Type"]).toBe("application/json");
    });

    it("should send CreateCommentRequest body", async () => {
      mockFetchOk({ success: true, invalidationHints: [] });

      await addComment("ISS-1", { text: "This is my comment" });

      const body = JSON.parse(calledInit().body as string);
      expect(body).toEqual({ text: "This is my comment" });
    });

    it("should URL-encode issueId in path", async () => {
      mockFetchOk({ success: true, invalidationHints: [] });

      await addComment("feat/auth", { text: "test" });

      expect(calledUrl()).toBe("/api/issues/feat%2Fauth/comments");
    });

    it("should return MutationResponse with Comment data", async () => {
      const response = {
        success: true,
        data: {
          id: "CMT-42",
          issue_id: "ISS-1",
          author: "bob",
          text: "Done",
          created_at: "2025-01-01T12:00:00Z",
        },
        invalidationHints: [{ entity: "comments", id: "ISS-1" }],
      };
      mockFetchOk(response);

      const result = await addComment("ISS-1", { text: "Done" });

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe("CMT-42");
      expect(result.invalidationHints[0].entity).toBe("comments");
    });
  });

  // ─── fetchEvents ────────────────────────────────────────

  describe("fetchEvents", () => {
    it("should call GET /api/issues/:id/events", async () => {
      mockFetchOk([]);

      await fetchEvents("ISS-1");

      expect(calledUrl()).toBe("/api/issues/ISS-1/events");
    });

    it("should URL-encode issueId", async () => {
      mockFetchOk([]);

      await fetchEvents("bug/crash#1");

      expect(calledUrl()).toBe("/api/issues/bug%2Fcrash%231/events");
    });

    it("should return Event array shape", async () => {
      const events = [
        {
          id: "EVT-1",
          issue_id: "ISS-1",
          event_type: "status_change",
          actor: "alice",
          old_value: "open",
          new_value: "in_progress",
          comment: null,
          created_at: "2025-01-01T00:00:00Z",
        },
      ];
      mockFetchOk(events);

      const result = await fetchEvents("ISS-1");

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "EVT-1",
        event_type: "status_change",
        old_value: "open",
        new_value: "in_progress",
      });
    });
  });

  // ─── fetchAllDependencies ───────────────────────────────

  describe("fetchAllDependencies", () => {
    it("should call GET /api/dependencies", async () => {
      mockFetchOk([]);

      await fetchAllDependencies();

      expect(calledUrl()).toBe("/api/dependencies");
    });

    it("should return Dependency array shape (full DAG)", async () => {
      const deps = [
        {
          issue_id: "ISS-2",
          depends_on_id: "ISS-1",
          type: "blocks",
          created_at: "2025-01-01T00:00:00Z",
          created_by: "alice",
        },
        {
          issue_id: "ISS-3",
          depends_on_id: "ISS-1",
          type: "depends_on",
          created_at: "2025-01-02T00:00:00Z",
          created_by: "bob",
        },
      ];
      mockFetchOk(deps);

      const result = await fetchAllDependencies();

      expect(result).toHaveLength(2);
      expect(result[0].issue_id).toBe("ISS-2");
      expect(result[0].depends_on_id).toBe("ISS-1");
      expect(result[0].type).toBe("blocks");
      expect(result[1].type).toBe("depends_on");
    });
  });

  // ─── addDependency ──────────────────────────────────────

  describe("addDependency", () => {
    it("should call POST /api/dependencies with JSON body", async () => {
      mockFetchOk({
        success: true,
        invalidationHints: [{ entity: "dependencies" }],
      });

      await addDependency({
        issue_id: "ISS-2",
        depends_on_id: "ISS-1",
        type: "blocks",
      });

      expect(calledUrl()).toBe("/api/dependencies");
      expect(calledInit().method).toBe("POST");
    });

    it("should set Content-Type header", async () => {
      mockFetchOk({ success: true, invalidationHints: [] });

      await addDependency({ issue_id: "A", depends_on_id: "B" });

      const headers = calledInit().headers as Record<string, string>;
      expect(headers["Content-Type"]).toBe("application/json");
    });

    it("should send CreateDependencyRequest body", async () => {
      mockFetchOk({ success: true, invalidationHints: [] });

      await addDependency({
        issue_id: "ISS-5",
        depends_on_id: "ISS-3",
        type: "relates_to",
      });

      const body = JSON.parse(calledInit().body as string);
      expect(body.issue_id).toBe("ISS-5");
      expect(body.depends_on_id).toBe("ISS-3");
      expect(body.type).toBe("relates_to");
    });

    it("should allow omitting optional type field", async () => {
      mockFetchOk({ success: true, invalidationHints: [] });

      await addDependency({ issue_id: "A", depends_on_id: "B" });

      const body = JSON.parse(calledInit().body as string);
      expect(body.issue_id).toBe("A");
      expect(body.depends_on_id).toBe("B");
      expect(body.type).toBeUndefined();
    });

    it("should return MutationResponse with Dependency data", async () => {
      const response = {
        success: true,
        data: {
          issue_id: "ISS-2",
          depends_on_id: "ISS-1",
          type: "blocks",
          created_at: "2025-01-01T00:00:00Z",
          created_by: "alice",
        },
        invalidationHints: [{ entity: "dependencies" }],
      };
      mockFetchOk(response);

      const result = await addDependency({
        issue_id: "ISS-2",
        depends_on_id: "ISS-1",
        type: "blocks",
      });

      expect(result.success).toBe(true);
      expect(result.data?.issue_id).toBe("ISS-2");
      expect(result.invalidationHints[0].entity).toBe("dependencies");
    });
  });

  // ─── removeDependency ───────────────────────────────────

  describe("removeDependency", () => {
    it("should call DELETE /api/dependencies/:issueId/:dependsOnId", async () => {
      mockFetchOk({ success: true, invalidationHints: [] });

      await removeDependency("ISS-2", "ISS-1");

      expect(calledUrl()).toBe("/api/dependencies/ISS-2/ISS-1");
      expect(calledInit().method).toBe("DELETE");
    });

    it("should URL-encode both path params", async () => {
      mockFetchOk({ success: true, invalidationHints: [] });

      await removeDependency("feat/a", "feat/b");

      expect(calledUrl()).toBe("/api/dependencies/feat%2Fa/feat%2Fb");
    });

    it("should not send a body", async () => {
      mockFetchOk({ success: true, invalidationHints: [] });

      await removeDependency("A", "B");

      expect(calledInit().body).toBeUndefined();
    });

    it("should return MutationResponse", async () => {
      const response = {
        success: true,
        invalidationHints: [{ entity: "dependencies" }, { entity: "issues" }],
      };
      mockFetchOk(response);

      const result = await removeDependency("ISS-2", "ISS-1");

      expect(result.success).toBe(true);
      expect(result.invalidationHints).toHaveLength(2);
    });
  });

  // ─── fetchHealth ────────────────────────────────────────

  describe("fetchHealth", () => {
    it("should call GET /api/health", async () => {
      mockFetchOk({
        status: "healthy",
        dolt_server: "running",
        uptime_seconds: 120,
        version: "1.0.0",
      });

      await fetchHealth();

      expect(calledUrl()).toBe("/api/health");
    });

    it("should return HealthResponse shape", async () => {
      const health = {
        status: "healthy",
        dolt_server: "running",
        uptime_seconds: 3600,
        version: "2.1.0",
      };
      mockFetchOk(health);

      const result = await fetchHealth();

      expect(result.status).toBe("healthy");
      expect(result.dolt_server).toBe("running");
      expect(result.uptime_seconds).toBe(3600);
      expect(result.version).toBe("2.1.0");
    });

    it("should handle degraded status", async () => {
      mockFetchOk({
        status: "degraded",
        dolt_server: "starting",
        uptime_seconds: 5,
        version: "1.0.0",
      });

      const result = await fetchHealth();

      expect(result.status).toBe("degraded");
      expect(result.dolt_server).toBe("starting");
    });
  });

  // ─── fetchStats ─────────────────────────────────────────

  describe("fetchStats", () => {
    it("should call GET /api/stats", async () => {
      mockFetchOk({
        total: 0,
        by_status: {},
        by_priority: {},
        by_type: {},
        recently_updated: 0,
      });

      await fetchStats();

      expect(calledUrl()).toBe("/api/stats");
    });

    it("should return StatsResponse shape", async () => {
      const stats = {
        total: 42,
        by_status: {
          open: 20,
          in_progress: 10,
          closed: 8,
          blocked: 3,
          deferred: 1,
        },
        by_priority: { "0": 5, "1": 15, "2": 12, "3": 8, "4": 2 },
        by_type: { task: 20, bug: 10, feature: 8, chore: 4 },
        recently_updated: 7,
      };
      mockFetchOk(stats);

      const result = await fetchStats();

      expect(result.total).toBe(42);
      expect(result.by_status.open).toBe(20);
      expect(result.by_status.closed).toBe(8);
      expect(result.by_priority["0"]).toBe(5);
      expect(result.by_type.task).toBe(20);
      expect(result.recently_updated).toBe(7);
    });
  });

  // ─── Error handling ─────────────────────────────────────

  describe("error handling", () => {
    it("should construct ApiClientError with status and apiError from JSON response", async () => {
      mockFetchError(400, {
        code: "VALIDATION_ERROR",
        message: "Title is required",
        retryable: false,
      });

      try {
        await createIssue({ title: "" });
        expect.fail("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ApiClientError);
        const apiErr = err as InstanceType<typeof ApiClientError>;
        expect(apiErr.status).toBe(400);
        expect(apiErr.apiError.code).toBe("VALIDATION_ERROR");
        expect(apiErr.apiError.message).toBe("Title is required");
        expect(apiErr.apiError.retryable).toBe(false);
        expect(apiErr.message).toBe("Title is required");
        expect(apiErr.name).toBe("ApiClientError");
      }
    });

    it("should handle retryable errors", async () => {
      mockFetchError(503, {
        code: "DOLT_UNAVAILABLE",
        message: "Database is starting",
        retryable: true,
      });

      try {
        await fetchHealth();
        expect.fail("should have thrown");
      } catch (err) {
        const apiErr = err as InstanceType<typeof ApiClientError>;
        expect(apiErr.status).toBe(503);
        expect(apiErr.apiError.code).toBe("DOLT_UNAVAILABLE");
        expect(apiErr.apiError.retryable).toBe(true);
      }
    });

    it("should handle DATABASE_LOCKED error", async () => {
      mockFetchError(423, {
        code: "DATABASE_LOCKED",
        message: "Database is locked",
        retryable: true,
      });

      try {
        await updateIssue("ISS-1", { title: "Update" });
        expect.fail("should have thrown");
      } catch (err) {
        const apiErr = err as InstanceType<typeof ApiClientError>;
        expect(apiErr.status).toBe(423);
        expect(apiErr.apiError.code).toBe("DATABASE_LOCKED");
      }
    });

    it("should fallback to INTERNAL_ERROR when response body is not JSON", async () => {
      mockFetchNonJsonError(502, "Bad Gateway");

      try {
        await fetchIssues();
        expect.fail("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ApiClientError);
        const apiErr = err as InstanceType<typeof ApiClientError>;
        expect(apiErr.status).toBe(502);
        expect(apiErr.apiError.code).toBe("INTERNAL_ERROR");
        expect(apiErr.apiError.message).toBe("Bad Gateway");
        expect(apiErr.apiError.retryable).toBe(false);
      }
    });

    it("should propagate network errors as-is (not wrapped in ApiClientError)", async () => {
      const networkError = new TypeError("Failed to fetch");
      vi.spyOn(globalThis, "fetch").mockRejectedValue(networkError);

      try {
        await fetchHealth();
        expect.fail("should have thrown");
      } catch (err) {
        expect(err).not.toBeInstanceOf(ApiClientError);
        expect(err).toBeInstanceOf(TypeError);
        expect((err as TypeError).message).toBe("Failed to fetch");
      }
    });

    it("should propagate AbortError for cancelled requests", async () => {
      const abortError = new DOMException("The operation was aborted", "AbortError");
      vi.spyOn(globalThis, "fetch").mockRejectedValue(abortError);

      try {
        await fetchIssues();
        expect.fail("should have thrown");
      } catch (err) {
        expect(err).not.toBeInstanceOf(ApiClientError);
        expect((err as DOMException).name).toBe("AbortError");
      }
    });

    it("should set error message from apiError.message", async () => {
      mockFetchError(404, {
        code: "NOT_FOUND",
        message: "Dependency not found",
        retryable: false,
      });

      try {
        await removeDependency("A", "B");
        expect.fail("should have thrown");
      } catch (err) {
        const apiErr = err as InstanceType<typeof ApiClientError>;
        // The Error.message should be set from apiError.message
        expect(apiErr.message).toBe("Dependency not found");
      }
    });
  });
});
