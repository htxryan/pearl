import type { SortingState } from "@tanstack/react-table";
import { describe, expect, it } from "vitest";
import type { FilterState } from "@/components/issue-table/filter-bar";
import { buildApiParams } from "./use-url-filters";

const baseFilters: FilterState = {
  status: [],
  priority: [],
  issue_type: [],
  assignee: "",
  search: "",
  labels: [],
  dateRanges: [],
  structural: [],
  groupBy: null,
};

describe("buildApiParams", () => {
  it("defaults to active statuses when no status filter set", () => {
    const params = buildApiParams(baseFilters, []);
    expect(params.get("status")).toBe("open,in_progress,deferred,blocked");
  });

  it("encodes status filter", () => {
    const filters: FilterState = {
      ...baseFilters,
      status: ["open", "in_progress"],
    };
    const params = buildApiParams(filters, []);
    expect(params.get("status")).toBe("open,in_progress");
  });

  it("encodes priority filter", () => {
    const filters: FilterState = {
      ...baseFilters,
      priority: [0, 1],
    };
    const params = buildApiParams(filters, []);
    expect(params.get("priority")).toBe("0,1");
  });

  it("encodes sorting", () => {
    const sorting: SortingState = [{ id: "created_at", desc: true }];
    const params = buildApiParams(baseFilters, sorting);
    expect(params.get("sort")).toBe("created_at");
    expect(params.get("direction")).toBe("desc");
  });

  it("encodes search", () => {
    const filters: FilterState = {
      ...baseFilters,
      search: "login bug",
    };
    const params = buildApiParams(filters, []);
    expect(params.get("search")).toBe("login bug");
  });

  it("encodes labels filter", () => {
    const filters: FilterState = {
      ...baseFilters,
      labels: ["urgent", "frontend"],
    };
    const params = buildApiParams(filters, []);
    expect(params.get("labels")).toBe("urgent,frontend");
  });

  it("encodes all filters together", () => {
    const filters: FilterState = {
      ...baseFilters,
      status: ["open"],
      priority: [1],
      issue_type: ["bug"],
      assignee: "alice",
      search: "fix",
    };
    const sorting: SortingState = [{ id: "priority", desc: false }];
    const params = buildApiParams(filters, sorting);
    expect(params.get("status")).toBe("open");
    expect(params.get("priority")).toBe("1");
    expect(params.get("issue_type")).toBe("bug");
    expect(params.get("assignee")).toBe("alice");
    expect(params.get("search")).toBe("fix");
    expect(params.get("sort")).toBe("priority");
    expect(params.get("direction")).toBe("asc");
  });

  it("encodes date range filters", () => {
    const filters: FilterState = {
      ...baseFilters,
      dateRanges: ["overdue", "due_today"],
    };
    const params = buildApiParams(filters, []);
    expect(params.get("date_ranges")).toBe("overdue,due_today");
  });

  it("encodes structural filters", () => {
    const filters: FilterState = {
      ...baseFilters,
      structural: ["has_dependency", "no_assignee"],
    };
    const params = buildApiParams(filters, []);
    expect(params.get("structural")).toBe("has_dependency,no_assignee");
  });
});
