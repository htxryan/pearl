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
