import type { IssueListItem } from "@pearl/shared";
import { describe, expect, it } from "vitest";
import {
  type BoardColumnSort,
  DEFAULT_BOARD_SORT,
  getColumnSort,
  sortIssuesForColumn,
} from "./board-sort";

function makeIssue(overrides: Partial<IssueListItem>): IssueListItem {
  return {
    id: "beads-x",
    title: "x",
    status: "open",
    priority: 2,
    issue_type: "task",
    assignee: null,
    owner: "alice",
    created_at: "2026-01-01T10:00:00Z",
    updated_at: "2026-01-01T10:00:00Z",
    due_at: null,
    pinned: false,
    has_attachments: false,
    labels: [],
    labelColors: {},
    ...overrides,
  };
}

describe("sortIssuesForColumn — modified", () => {
  it("sorts most-recently-updated first", () => {
    const a = makeIssue({ id: "a", updated_at: "2026-01-15T10:00:00Z" });
    const b = makeIssue({ id: "b", updated_at: "2026-01-20T10:00:00Z" });
    const c = makeIssue({ id: "c", updated_at: "2026-01-10T10:00:00Z" });
    const sorted = sortIssuesForColumn([a, b, c], "modified");
    expect(sorted.map((i) => i.id)).toEqual(["b", "a", "c"]);
  });

  it("falls back to created_at when items share an updated_at", () => {
    const same = "2026-01-10T10:00:00Z";
    const older = makeIssue({
      id: "older",
      created_at: "2026-01-01T10:00:00Z",
      updated_at: same,
    });
    const newer = makeIssue({
      id: "newer",
      created_at: "2026-01-05T10:00:00Z",
      updated_at: same,
    });
    const sorted = sortIssuesForColumn([older, newer], "modified");
    expect(sorted.map((i) => i.id)).toEqual(["newer", "older"]);
  });

  it("treats missing updated_at as created_at (newly-created items still surface)", () => {
    const newCreate = makeIssue({
      id: "new",
      created_at: "2026-02-01T10:00:00Z",
      updated_at: "" as unknown as string,
    });
    const oldEdit = makeIssue({
      id: "edited",
      created_at: "2026-01-01T10:00:00Z",
      updated_at: "2026-01-15T10:00:00Z",
    });
    const sorted = sortIssuesForColumn([oldEdit, newCreate], "modified");
    expect(sorted.map((i) => i.id)).toEqual(["new", "edited"]);
  });

  it("does not mutate the input array", () => {
    const input = [
      makeIssue({ id: "a", updated_at: "2026-01-01T10:00:00Z" }),
      makeIssue({ id: "b", updated_at: "2026-01-10T10:00:00Z" }),
    ];
    const beforeIds = input.map((i) => i.id);
    sortIssuesForColumn(input, "modified");
    expect(input.map((i) => i.id)).toEqual(beforeIds);
  });
});

describe("sortIssuesForColumn — priority", () => {
  it("orders by priority ascending (P0 first)", () => {
    const p0 = makeIssue({ id: "p0", priority: 0 });
    const p2 = makeIssue({ id: "p2", priority: 2 });
    const p4 = makeIssue({ id: "p4", priority: 4 });
    const sorted = sortIssuesForColumn([p2, p4, p0], "priority");
    expect(sorted.map((i) => i.id)).toEqual(["p0", "p2", "p4"]);
  });

  it("breaks priority ties by reverse-modified date", () => {
    const recent = makeIssue({
      id: "recent",
      priority: 2,
      updated_at: "2026-02-01T10:00:00Z",
    });
    const stale = makeIssue({
      id: "stale",
      priority: 2,
      updated_at: "2026-01-01T10:00:00Z",
    });
    const sorted = sortIssuesForColumn([stale, recent], "priority");
    expect(sorted.map((i) => i.id)).toEqual(["recent", "stale"]);
  });

  it("uses created_at as final fallback when priority and updated_at match", () => {
    const same = "2026-01-10T10:00:00Z";
    const newerCreate = makeIssue({
      id: "newer",
      priority: 2,
      created_at: "2026-01-05T10:00:00Z",
      updated_at: same,
    });
    const olderCreate = makeIssue({
      id: "older",
      priority: 2,
      created_at: "2026-01-01T10:00:00Z",
      updated_at: same,
    });
    const sorted = sortIssuesForColumn([olderCreate, newerCreate], "priority");
    expect(sorted.map((i) => i.id)).toEqual(["newer", "older"]);
  });
});

describe("sortIssuesForColumn — created", () => {
  it("sorts most-recently-created first", () => {
    const a = makeIssue({ id: "a", created_at: "2026-01-15T10:00:00Z" });
    const b = makeIssue({ id: "b", created_at: "2026-01-20T10:00:00Z" });
    const c = makeIssue({ id: "c", created_at: "2026-01-10T10:00:00Z" });
    const sorted = sortIssuesForColumn([a, b, c], "created");
    expect(sorted.map((i) => i.id)).toEqual(["b", "a", "c"]);
  });

  it("breaks ties using modified date", () => {
    const same = "2026-01-10T10:00:00Z";
    const recentlyEdited = makeIssue({
      id: "edited",
      created_at: same,
      updated_at: "2026-02-01T10:00:00Z",
    });
    const stale = makeIssue({
      id: "stale",
      created_at: same,
      updated_at: "2026-01-10T10:00:00Z",
    });
    const sorted = sortIssuesForColumn([stale, recentlyEdited], "created");
    expect(sorted.map((i) => i.id)).toEqual(["edited", "stale"]);
  });
});

describe("sortIssuesForColumn — title", () => {
  it("sorts alphabetically (case-insensitive)", () => {
    const a = makeIssue({ id: "a", title: "Banana" });
    const b = makeIssue({ id: "b", title: "apple" });
    const c = makeIssue({ id: "c", title: "cherry" });
    const sorted = sortIssuesForColumn([a, b, c], "title");
    expect(sorted.map((i) => i.id)).toEqual(["b", "a", "c"]);
  });

  it("breaks title ties by modified date (newest first)", () => {
    const recent = makeIssue({
      id: "recent",
      title: "Same title",
      updated_at: "2026-02-01T10:00:00Z",
    });
    const stale = makeIssue({
      id: "stale",
      title: "Same title",
      updated_at: "2026-01-01T10:00:00Z",
    });
    const sorted = sortIssuesForColumn([stale, recent], "title");
    expect(sorted.map((i) => i.id)).toEqual(["recent", "stale"]);
  });
});

describe("newly-created issue placement (regression)", () => {
  const existingIssues = [
    makeIssue({
      id: "old-1",
      title: "Existing bug",
      priority: 1,
      created_at: "2026-01-01T10:00:00Z",
      updated_at: "2026-01-20T10:00:00Z",
    }),
    makeIssue({
      id: "old-2",
      title: "Another task",
      priority: 2,
      created_at: "2026-01-05T10:00:00Z",
      updated_at: "2026-01-15T10:00:00Z",
    }),
    makeIssue({
      id: "old-3",
      title: "Oldest item",
      priority: 3,
      created_at: "2025-12-01T10:00:00Z",
      updated_at: "2026-01-10T10:00:00Z",
    }),
  ];

  const newIssue = makeIssue({
    id: "brand-new",
    title: "Just created",
    priority: 2,
    created_at: "2026-04-26T22:00:00Z",
    updated_at: "2026-04-26T22:00:00Z",
  });

  it("modified: newly created issue appears first", () => {
    const sorted = sortIssuesForColumn([...existingIssues, newIssue], "modified");
    expect(sorted[0].id).toBe("brand-new");
  });

  it("created: newly created issue appears first", () => {
    const sorted = sortIssuesForColumn([...existingIssues, newIssue], "created");
    expect(sorted[0].id).toBe("brand-new");
  });

  it("priority: newly created issue sorted by priority (not necessarily first)", () => {
    const sorted = sortIssuesForColumn([...existingIssues, newIssue], "priority");
    const p1Index = sorted.findIndex((i) => i.id === "old-1");
    const newIndex = sorted.findIndex((i) => i.id === "brand-new");
    expect(p1Index).toBeLessThan(newIndex);
    expect(sorted[newIndex].priority).toBe(2);
  });

  it("title: newly created issue sorted alphabetically", () => {
    const sorted = sortIssuesForColumn([...existingIssues, newIssue], "title");
    const titles = sorted.map((i) => i.title);
    expect(titles).toEqual(
      [...titles].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })),
    );
  });

  it("modified: optimistic issue with current timestamps sorts first", () => {
    const optimistic = makeIssue({
      id: "temp-1234",
      title: "Optimistic issue",
      priority: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    const sorted = sortIssuesForColumn([...existingIssues, optimistic], "modified");
    expect(sorted[0].id).toBe("temp-1234");
  });

  it("modified: issue with empty updated_at uses created_at for sort", () => {
    const cliCreated = makeIssue({
      id: "cli-created",
      title: "CLI issue",
      priority: 2,
      created_at: "2026-04-26T22:00:00Z",
      updated_at: "" as unknown as string,
    });
    const sorted = sortIssuesForColumn([...existingIssues, cliCreated], "modified");
    expect(sorted[0].id).toBe("cli-created");
  });
});

describe("getColumnSort", () => {
  it("returns the configured mode for a known column", () => {
    const state: BoardColumnSort = { open: "priority" };
    expect(getColumnSort(state, "open")).toBe("priority");
  });

  it("returns the default mode when a column is missing", () => {
    expect(getColumnSort({}, "in_progress")).toBe(DEFAULT_BOARD_SORT);
    expect(DEFAULT_BOARD_SORT).toBe("modified");
  });
});
