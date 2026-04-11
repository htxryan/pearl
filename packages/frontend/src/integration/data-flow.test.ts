import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider, useIsMutating } from "@tanstack/react-query";
import React from "react";
import type { Issue, IssueListItem, MutationResponse, InvalidationHint } from "@beads-gui/shared";
import {
  issueKeys,
  statsKeys,
  healthKeys,
  dependencyKeys,
  useIssues,
  useUpdateIssue,
  useCreateIssue,
  useCloseIssue,
  useAddComment,
  useAddDependency,
  useRemoveDependency,
} from "@/hooks/use-issues";

// ─── Mock the API client ────────────────────────────────────────
vi.mock("@/lib/api-client", () => ({
  fetchIssues: vi.fn().mockResolvedValue([]),
  fetchIssue: vi.fn().mockResolvedValue({}),
  createIssue: vi.fn().mockResolvedValue({ success: true, invalidationHints: [] }),
  updateIssue: vi.fn().mockResolvedValue({ success: true, invalidationHints: [] }),
  closeIssue: vi.fn().mockResolvedValue({ success: true, invalidationHints: [] }),
  addComment: vi.fn().mockResolvedValue({ success: true, invalidationHints: [] }),
  removeDependency: vi.fn().mockResolvedValue({ success: true, invalidationHints: [] }),
  addDependency: vi.fn().mockResolvedValue({ success: true, invalidationHints: [] }),
  fetchComments: vi.fn().mockResolvedValue([]),
  fetchEvents: vi.fn().mockResolvedValue([]),
  fetchIssueDependencies: vi.fn().mockResolvedValue([]),
  fetchStats: vi.fn().mockResolvedValue({}),
  fetchHealth: vi.fn().mockResolvedValue({}),
  fetchAllDependencies: vi.fn().mockResolvedValue([]),
}));

import * as api from "@/lib/api-client";

// ─── Test helpers ───────────────────────────────────────────────

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
}

function createWrapper(queryClient?: QueryClient) {
  const qc = queryClient ?? createTestQueryClient();
  return {
    queryClient: qc,
    wrapper: ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: qc }, children),
  };
}

function makeIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    id: "issue-1",
    title: "Test Issue",
    description: "A test issue",
    design: "",
    acceptance_criteria: "",
    notes: "",
    status: "open",
    priority: 1,
    issue_type: "task",
    assignee: null,
    owner: "tester",
    estimated_minutes: null,
    created_at: "2025-01-01T00:00:00Z",
    created_by: "tester",
    updated_at: "2025-01-01T00:00:00Z",
    closed_at: null,
    due_at: null,
    defer_until: null,
    external_ref: null,
    spec_id: null,
    pinned: false,
    is_template: false,
    labels: [],
    metadata: {},
    ...overrides,
  };
}

function makeListItem(overrides: Partial<IssueListItem> = {}): IssueListItem {
  return {
    id: "issue-1",
    title: "Test Issue",
    status: "open",
    priority: 1,
    issue_type: "task",
    assignee: null,
    owner: "tester",
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    due_at: null,
    pinned: false,
    labels: [],
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────

describe("Query Key Structure", () => {
  it("issueKeys.all = ['issues']", () => {
    expect(issueKeys.all).toEqual(["issues"]);
  });

  it("issueKeys.lists() = ['issues', 'list']", () => {
    expect(issueKeys.lists()).toEqual(["issues", "list"]);
  });

  it("issueKeys.list() without params = ['issues', 'list', '']", () => {
    expect(issueKeys.list()).toEqual(["issues", "list", ""]);
  });

  it("issueKeys.list(params) includes the serialized param string", () => {
    const params = new URLSearchParams({ status: "open" });
    expect(issueKeys.list(params)).toEqual(["issues", "list", "status=open"]);
  });

  it("issueKeys.detail(id) = ['issues', 'detail', id]", () => {
    expect(issueKeys.detail("abc-123")).toEqual(["issues", "detail", "abc-123"]);
  });

  it("issueKeys.comments(id) = ['issues', 'comments', id]", () => {
    expect(issueKeys.comments("abc-123")).toEqual(["issues", "comments", "abc-123"]);
  });

  it("issueKeys.events(id) = ['issues', 'events', id]", () => {
    expect(issueKeys.events("abc-123")).toEqual(["issues", "events", "abc-123"]);
  });

  it("issueKeys.dependencies(id) = ['issues', 'dependencies', id]", () => {
    expect(issueKeys.dependencies("abc-123")).toEqual(["issues", "dependencies", "abc-123"]);
  });

  it("statsKeys.all = ['stats']", () => {
    expect(statsKeys.all).toEqual(["stats"]);
  });

  it("healthKeys.all = ['health']", () => {
    expect(healthKeys.all).toEqual(["health"]);
  });

  it("dependencyKeys.all = ['dependencies']", () => {
    expect(dependencyKeys.all).toEqual(["dependencies"]);
  });
});

describe("STPA H1: Poll suppression during pending mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.fetchIssues as Mock).mockResolvedValue([]);
  });

  it("sets refetchInterval to 2000 when no mutations are pending", async () => {
    const { queryClient, wrapper } = createWrapper();

    const { result } = renderHook(() => useIssues(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess || result.current.isError).toBe(true);
    });

    // Inspect the query's options in the cache
    const queryState = queryClient.getQueryCache().find({
      queryKey: issueKeys.list(),
    });
    expect(queryState).toBeDefined();
    // The refetchInterval on the observer should be 2000 when no mutations are pending
    const observers = queryState!.observers;
    expect(observers.length).toBeGreaterThan(0);
    const observerOptions = observers[0].options;
    expect(observerOptions.refetchInterval).toBe(2000);
  });

  it("suppresses polling when an issue mutation is pending", async () => {
    const { queryClient, wrapper } = createWrapper();

    // Seed the issues list so it's loaded
    (api.fetchIssues as Mock).mockResolvedValue([makeListItem()]);

    // Create a deferred mutation that won't resolve until we say so
    let resolveMutation!: (value: MutationResponse<Issue>) => void;
    (api.updateIssue as Mock).mockImplementation(
      () =>
        new Promise<MutationResponse<Issue>>((resolve) => {
          resolveMutation = resolve;
        })
    );

    // Render both hooks in the same component context
    const { result } = renderHook(
      () => {
        const issues = useIssues();
        const updateIssue = useUpdateIssue();
        const pendingCount = useIsMutating({ mutationKey: ["issues"] });
        return { issues, updateIssue, pendingCount };
      },
      { wrapper }
    );

    // Wait for list to load
    await waitFor(() => {
      expect(result.current.issues.isSuccess).toBe(true);
    });

    // Trigger mutation (it will hang because we haven't resolved the promise)
    act(() => {
      result.current.updateIssue.mutate({ id: "issue-1", data: { title: "Updated" } });
    });

    // Wait for the mutation to be in-flight
    await waitFor(() => {
      expect(result.current.pendingCount).toBeGreaterThan(0);
    });

    // Now check the observer's refetchInterval - should be false (polling suppressed)
    const queryState = queryClient.getQueryCache().find({
      queryKey: issueKeys.list(),
    });
    const observerOptions = queryState!.observers[0].options;
    expect(observerOptions.refetchInterval).toBe(false);

    // Resolve the mutation
    act(() => {
      resolveMutation({ success: true, invalidationHints: [] });
    });

    // After mutation settles, polling should resume
    await waitFor(() => {
      expect(result.current.pendingCount).toBe(0);
    });

    await waitFor(() => {
      const qs = queryClient.getQueryCache().find({ queryKey: issueKeys.list() });
      expect(qs!.observers[0].options.refetchInterval).toBe(2000);
    });
  });

  it("suppresses polling when a dependency mutation is pending", async () => {
    const { queryClient, wrapper } = createWrapper();

    let resolveMutation!: (value: MutationResponse) => void;
    (api.addDependency as Mock).mockImplementation(
      () =>
        new Promise<MutationResponse>((resolve) => {
          resolveMutation = resolve;
        })
    );

    const { result } = renderHook(
      () => {
        const issues = useIssues();
        const addDep = useAddDependency();
        const pendingDeps = useIsMutating({ mutationKey: ["dependencies"] });
        return { issues, addDep, pendingDeps };
      },
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.issues.isSuccess).toBe(true);
    });

    act(() => {
      result.current.addDep.mutate({
        issue_id: "issue-1",
        depends_on_id: "issue-2",
        type: "blocks",
      });
    });

    await waitFor(() => {
      expect(result.current.pendingDeps).toBeGreaterThan(0);
    });

    const queryState = queryClient.getQueryCache().find({ queryKey: issueKeys.list() });
    expect(queryState!.observers[0].options.refetchInterval).toBe(false);

    act(() => {
      resolveMutation({ success: true, invalidationHints: [] });
    });

    await waitFor(() => {
      expect(result.current.pendingDeps).toBe(0);
    });

    await waitFor(() => {
      const qs = queryClient.getQueryCache().find({ queryKey: issueKeys.list() });
      expect(qs!.observers[0].options.refetchInterval).toBe(2000);
    });
  });
});

describe("Invalidation from hints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("useCreateIssue invalidates issue lists and detail from hints", async () => {
    const { queryClient, wrapper } = createWrapper();

    const hints: InvalidationHint[] = [
      { entity: "issues", id: "new-1" },
      { entity: "stats" },
    ];
    (api.createIssue as Mock).mockResolvedValue({
      success: true,
      data: makeIssue({ id: "new-1" }),
      invalidationHints: hints,
    });

    // Seed some cache entries to track invalidation
    queryClient.setQueryData(issueKeys.lists(), []);
    queryClient.setQueryData(issueKeys.detail("new-1"), makeIssue({ id: "new-1" }));
    queryClient.setQueryData(statsKeys.all, { total: 0 });

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCreateIssue(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ title: "New Issue" });
    });

    // Should have invalidated: detail(new-1), lists(), stats
    const invalidatedKeys = invalidateSpy.mock.calls.map((call) => call[0].queryKey);
    expect(invalidatedKeys).toContainEqual(issueKeys.detail("new-1"));
    expect(invalidatedKeys).toContainEqual(issueKeys.lists());
    expect(invalidatedKeys).toContainEqual(statsKeys.all);
  });

  it("useUpdateIssue invalidates from response hints on success", async () => {
    const { queryClient, wrapper } = createWrapper();

    const hints: InvalidationHint[] = [
      { entity: "issues", id: "issue-1" },
      { entity: "events", id: "issue-1" },
    ];
    (api.updateIssue as Mock).mockResolvedValue({
      success: true,
      data: makeIssue({ id: "issue-1", title: "Updated" }),
      invalidationHints: hints,
    });

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useUpdateIssue(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: "issue-1", data: { title: "Updated" } });
    });

    const invalidatedKeys = invalidateSpy.mock.calls.map((call) => call[0].queryKey);
    expect(invalidatedKeys).toContainEqual(issueKeys.detail("issue-1"));
    expect(invalidatedKeys).toContainEqual(issueKeys.lists());
    expect(invalidatedKeys).toContainEqual(issueKeys.events("issue-1"));
  });

  it("useCloseIssue invalidates from response hints", async () => {
    const { queryClient, wrapper } = createWrapper();

    const hints: InvalidationHint[] = [
      { entity: "issues", id: "issue-1" },
      { entity: "stats" },
    ];
    (api.closeIssue as Mock).mockResolvedValue({
      success: true,
      invalidationHints: hints,
    });

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCloseIssue(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: "issue-1", reason: "done" });
    });

    const invalidatedKeys = invalidateSpy.mock.calls.map((call) => call[0].queryKey);
    expect(invalidatedKeys).toContainEqual(issueKeys.detail("issue-1"));
    expect(invalidatedKeys).toContainEqual(issueKeys.lists());
    expect(invalidatedKeys).toContainEqual(statsKeys.all);
  });

  it("useAddComment invalidates comments from hints", async () => {
    const { queryClient, wrapper } = createWrapper();

    const hints: InvalidationHint[] = [
      { entity: "comments", id: "issue-1" },
      { entity: "events", id: "issue-1" },
    ];
    (api.addComment as Mock).mockResolvedValue({
      success: true,
      invalidationHints: hints,
    });

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useAddComment(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        issueId: "issue-1",
        data: { text: "A comment" },
      });
    });

    const invalidatedKeys = invalidateSpy.mock.calls.map((call) => call[0].queryKey);
    expect(invalidatedKeys).toContainEqual(issueKeys.comments("issue-1"));
    expect(invalidatedKeys).toContainEqual(issueKeys.events("issue-1"));
  });

  it("useAddDependency invalidates dependency keys from hints", async () => {
    const { queryClient, wrapper } = createWrapper();

    const hints: InvalidationHint[] = [
      { entity: "dependencies", id: "issue-1" },
      { entity: "issues" }, // no id - lists only
    ];
    (api.addDependency as Mock).mockResolvedValue({
      success: true,
      invalidationHints: hints,
    });

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useAddDependency(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        issue_id: "issue-1",
        depends_on_id: "issue-2",
        type: "blocks",
      });
    });

    const invalidatedKeys = invalidateSpy.mock.calls.map((call) => call[0].queryKey);
    expect(invalidatedKeys).toContainEqual(dependencyKeys.all);
    expect(invalidatedKeys).toContainEqual(issueKeys.dependencies("issue-1"));
    expect(invalidatedKeys).toContainEqual(issueKeys.lists());
  });

  it("useRemoveDependency invalidates dependency keys from hints", async () => {
    const { queryClient, wrapper } = createWrapper();

    const hints: InvalidationHint[] = [
      { entity: "dependencies" }, // no id - all only
    ];
    (api.removeDependency as Mock).mockResolvedValue({
      success: true,
      invalidationHints: hints,
    });

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useRemoveDependency(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        issueId: "issue-1",
        dependsOnId: "issue-2",
      });
    });

    const invalidatedKeys = invalidateSpy.mock.calls.map((call) => call[0].queryKey);
    expect(invalidatedKeys).toContainEqual(dependencyKeys.all);
  });

  it("issues hint without id only invalidates lists, not a specific detail", async () => {
    const { queryClient, wrapper } = createWrapper();

    const hints: InvalidationHint[] = [{ entity: "issues" }];
    (api.createIssue as Mock).mockResolvedValue({
      success: true,
      invalidationHints: hints,
    });

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCreateIssue(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ title: "No-id hint" });
    });

    const invalidatedKeys = invalidateSpy.mock.calls.map((call) => call[0].queryKey);
    // Should invalidate lists()
    expect(invalidatedKeys).toContainEqual(issueKeys.lists());
    // Should NOT have called invalidate with any detail key
    const detailCalls = invalidatedKeys.filter(
      (key) => Array.isArray(key) && key.length >= 2 && key[1] === "detail"
    );
    expect(detailCalls).toHaveLength(0);
  });
});

describe("Optimistic updates (useUpdateIssue)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("optimistically updates the detail cache during mutation", async () => {
    const { queryClient, wrapper } = createWrapper();

    const originalIssue = makeIssue({ id: "issue-1", title: "Original Title" });
    const listItem = makeListItem({ id: "issue-1", title: "Original Title" });

    // Seed cache
    queryClient.setQueryData(issueKeys.detail("issue-1"), originalIssue);
    queryClient.setQueryData(issueKeys.list(), [listItem]);

    // Make mutation hang so we can inspect optimistic state
    let resolveMutation!: (value: MutationResponse<Issue>) => void;
    (api.updateIssue as Mock).mockImplementation(
      () =>
        new Promise<MutationResponse<Issue>>((resolve) => {
          resolveMutation = resolve;
        })
    );

    const { result } = renderHook(() => useUpdateIssue(), { wrapper });

    // Fire mutation
    act(() => {
      result.current.mutate({ id: "issue-1", data: { title: "Optimistic Title" } });
    });

    // Wait for onMutate to complete
    await waitFor(() => {
      const detail = queryClient.getQueryData<Issue>(issueKeys.detail("issue-1"));
      expect(detail?.title).toBe("Optimistic Title");
    });

    // Also check list was optimistically updated
    const list = queryClient.getQueryData<IssueListItem[]>(issueKeys.list());
    expect(list?.[0]?.title).toBe("Optimistic Title");

    // Resolve to clean up
    act(() => {
      resolveMutation({ success: true, invalidationHints: [] });
    });

    await waitFor(() => {
      expect(result.current.isIdle || result.current.isSuccess).toBe(true);
    });
  });

  it("rolls back detail and list cache on mutation error", async () => {
    const { queryClient, wrapper } = createWrapper();

    const originalIssue = makeIssue({ id: "issue-1", title: "Original Title" });
    const listItem = makeListItem({ id: "issue-1", title: "Original Title" });

    // Seed cache
    queryClient.setQueryData(issueKeys.detail("issue-1"), originalIssue);
    queryClient.setQueryData(issueKeys.list(), [listItem]);

    // Make mutation reject
    (api.updateIssue as Mock).mockRejectedValue(new Error("Server error"));

    // Suppress console.error for expected error
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { result } = renderHook(() => useUpdateIssue(), { wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync({
          id: "issue-1",
          data: { title: "Will Fail" },
        });
      } catch {
        // Expected
      }
    });

    // Should have rolled back to original values
    const detail = queryClient.getQueryData<Issue>(issueKeys.detail("issue-1"));
    expect(detail?.title).toBe("Original Title");

    const list = queryClient.getQueryData<IssueListItem[]>(issueKeys.list());
    expect(list?.[0]?.title).toBe("Original Title");

    consoleSpy.mockRestore();
  });

  it("cancels outgoing refetches for detail and lists on mutate", async () => {
    const { queryClient, wrapper } = createWrapper();

    const cancelSpy = vi.spyOn(queryClient, "cancelQueries");

    queryClient.setQueryData(issueKeys.detail("issue-1"), makeIssue());
    queryClient.setQueryData(issueKeys.list(), [makeListItem()]);

    (api.updateIssue as Mock).mockResolvedValue({
      success: true,
      invalidationHints: [],
    });

    const { result } = renderHook(() => useUpdateIssue(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        id: "issue-1",
        data: { title: "Cancel check" },
      });
    });

    // onMutate should have cancelled queries for detail(id) and lists()
    const cancelledKeys = cancelSpy.mock.calls.map((call) => call[0].queryKey);
    expect(cancelledKeys).toContainEqual(issueKeys.detail("issue-1"));
    expect(cancelledKeys).toContainEqual(issueKeys.lists());
  });

  it("snapshots previous values and returns them from onMutate context", async () => {
    const { queryClient, wrapper } = createWrapper();

    const originalIssue = makeIssue({ id: "issue-1", title: "Snapshot Me" });
    const listItems = [makeListItem({ id: "issue-1", title: "Snapshot Me" })];

    queryClient.setQueryData(issueKeys.detail("issue-1"), originalIssue);
    queryClient.setQueryData(issueKeys.list(), listItems);

    // Make mutation fail so we can verify rollback uses correct snapshots
    (api.updateIssue as Mock).mockRejectedValue(new Error("fail"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { result } = renderHook(() => useUpdateIssue(), { wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync({
          id: "issue-1",
          data: { title: "Changed" },
        });
      } catch {
        // Expected
      }
    });

    // After rollback, values should match original snapshots exactly
    const detail = queryClient.getQueryData<Issue>(issueKeys.detail("issue-1"));
    expect(detail).toEqual(originalIssue);

    const list = queryClient.getQueryData<IssueListItem[]>(issueKeys.list());
    expect(list).toEqual(listItems);

    consoleSpy.mockRestore();
  });

  it("sets updated_at on optimistic update", async () => {
    const { queryClient, wrapper } = createWrapper();

    const oldDate = "2020-01-01T00:00:00Z";
    queryClient.setQueryData(
      issueKeys.detail("issue-1"),
      makeIssue({ id: "issue-1", updated_at: oldDate })
    );
    queryClient.setQueryData(issueKeys.list(), [
      makeListItem({ id: "issue-1", updated_at: oldDate }),
    ]);

    let resolveMutation!: (value: MutationResponse<Issue>) => void;
    (api.updateIssue as Mock).mockImplementation(
      () => new Promise((resolve) => { resolveMutation = resolve; })
    );

    const { result } = renderHook(() => useUpdateIssue(), { wrapper });

    act(() => {
      result.current.mutate({ id: "issue-1", data: { title: "Time check" } });
    });

    await waitFor(() => {
      const detail = queryClient.getQueryData<Issue>(issueKeys.detail("issue-1"));
      expect(detail?.updated_at).not.toBe(oldDate);
      // Should be a recent ISO string
      const updatedDate = new Date(detail!.updated_at);
      expect(updatedDate.getTime()).toBeGreaterThan(new Date(oldDate).getTime());
    });

    act(() => {
      resolveMutation({ success: true, invalidationHints: [] });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});

describe("Invalidation hint entity routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("issues hint with id invalidates both detail(id) AND lists()", async () => {
    const { queryClient, wrapper } = createWrapper();

    (api.updateIssue as Mock).mockResolvedValue({
      success: true,
      invalidationHints: [{ entity: "issues", id: "issue-42" }],
    });

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useUpdateIssue(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: "issue-42", data: { title: "x" } });
    });

    const invalidatedKeys = invalidateSpy.mock.calls.map((c) => c[0].queryKey);
    expect(invalidatedKeys).toContainEqual(issueKeys.detail("issue-42"));
    expect(invalidatedKeys).toContainEqual(issueKeys.lists());
  });

  it("dependencies hint with id invalidates dependencyKeys.all AND dependencies(id)", async () => {
    const { queryClient, wrapper } = createWrapper();

    (api.addDependency as Mock).mockResolvedValue({
      success: true,
      invalidationHints: [{ entity: "dependencies", id: "issue-1" }],
    });

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useAddDependency(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        issue_id: "issue-1",
        depends_on_id: "issue-2",
      });
    });

    const invalidatedKeys = invalidateSpy.mock.calls.map((c) => c[0].queryKey);
    expect(invalidatedKeys).toContainEqual(dependencyKeys.all);
    expect(invalidatedKeys).toContainEqual(issueKeys.dependencies("issue-1"));
  });

  it("dependencies hint without id invalidates dependencyKeys.all only", async () => {
    const { queryClient, wrapper } = createWrapper();

    (api.removeDependency as Mock).mockResolvedValue({
      success: true,
      invalidationHints: [{ entity: "dependencies" }],
    });

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useRemoveDependency(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ issueId: "i1", dependsOnId: "i2" });
    });

    const invalidatedKeys = invalidateSpy.mock.calls.map((c) => c[0].queryKey);
    expect(invalidatedKeys).toContainEqual(dependencyKeys.all);
    // Should NOT have invalidated a specific dependencies(id)
    const depIdCalls = invalidatedKeys.filter(
      (key) => Array.isArray(key) && key.length >= 3 && key[1] === "dependencies"
    );
    expect(depIdCalls).toHaveLength(0);
  });

  it("comments hint with id invalidates comments(id)", async () => {
    const { queryClient, wrapper } = createWrapper();

    (api.addComment as Mock).mockResolvedValue({
      success: true,
      invalidationHints: [{ entity: "comments", id: "issue-5" }],
    });

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useAddComment(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        issueId: "issue-5",
        data: { text: "hello" },
      });
    });

    const invalidatedKeys = invalidateSpy.mock.calls.map((c) => c[0].queryKey);
    expect(invalidatedKeys).toContainEqual(issueKeys.comments("issue-5"));
  });

  it("events hint with id invalidates events(id)", async () => {
    const { queryClient, wrapper } = createWrapper();

    (api.updateIssue as Mock).mockResolvedValue({
      success: true,
      invalidationHints: [{ entity: "events", id: "issue-7" }],
    });

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useUpdateIssue(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: "issue-7", data: { title: "x" } });
    });

    const invalidatedKeys = invalidateSpy.mock.calls.map((c) => c[0].queryKey);
    expect(invalidatedKeys).toContainEqual(issueKeys.events("issue-7"));
  });

  it("stats hint invalidates statsKeys.all", async () => {
    const { queryClient, wrapper } = createWrapper();

    (api.closeIssue as Mock).mockResolvedValue({
      success: true,
      invalidationHints: [{ entity: "stats" }],
    });

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCloseIssue(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: "issue-1" });
    });

    const invalidatedKeys = invalidateSpy.mock.calls.map((c) => c[0].queryKey);
    expect(invalidatedKeys).toContainEqual(statsKeys.all);
  });

  it("processes multiple hints from a single response", async () => {
    const { queryClient, wrapper } = createWrapper();

    (api.closeIssue as Mock).mockResolvedValue({
      success: true,
      invalidationHints: [
        { entity: "issues", id: "issue-1" },
        { entity: "stats" },
        { entity: "events", id: "issue-1" },
        { entity: "dependencies", id: "issue-1" },
      ],
    });

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCloseIssue(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: "issue-1" });
    });

    const invalidatedKeys = invalidateSpy.mock.calls.map((c) => c[0].queryKey);
    expect(invalidatedKeys).toContainEqual(issueKeys.detail("issue-1"));
    expect(invalidatedKeys).toContainEqual(issueKeys.lists());
    expect(invalidatedKeys).toContainEqual(statsKeys.all);
    expect(invalidatedKeys).toContainEqual(issueKeys.events("issue-1"));
    expect(invalidatedKeys).toContainEqual(dependencyKeys.all);
    expect(invalidatedKeys).toContainEqual(issueKeys.dependencies("issue-1"));
  });
});
