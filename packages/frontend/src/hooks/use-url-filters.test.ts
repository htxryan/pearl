import { describe, it, expect } from "vitest";
import { buildApiParams } from "./use-url-filters";
import type { FilterState } from "@/components/issue-table/filter-bar";
import type { SortingState } from "@tanstack/react-table";

describe("buildApiParams", () => {
  it("returns empty params for default filters", () => {
    const filters: FilterState = {
      status: [],
      priority: [],
      issue_type: [],
      assignee: "",
      search: "",
      labels: [],
    };
    const sorting: SortingState = [];
    const params = buildApiParams(filters, sorting);
    expect(params.toString()).toBe("");
  });

  it("encodes status filter", () => {
    const filters: FilterState = {
      status: ["open", "in_progress"],
      priority: [],
      issue_type: [],
      assignee: "",
      search: "",
      labels: [],
    };
    const params = buildApiParams(filters, []);
    expect(params.get("status")).toBe("open,in_progress");
  });

  it("encodes priority filter", () => {
    const filters: FilterState = {
      status: [],
      priority: [0, 1],
      issue_type: [],
      assignee: "",
      search: "",
      labels: [],
    };
    const params = buildApiParams(filters, []);
    expect(params.get("priority")).toBe("0,1");
  });

  it("encodes sorting", () => {
    const filters: FilterState = {
      status: [],
      priority: [],
      issue_type: [],
      assignee: "",
      search: "",
      labels: [],
    };
    const sorting: SortingState = [{ id: "created_at", desc: true }];
    const params = buildApiParams(filters, sorting);
    expect(params.get("sort")).toBe("created_at");
    expect(params.get("direction")).toBe("desc");
  });

  it("encodes search", () => {
    const filters: FilterState = {
      status: [],
      priority: [],
      issue_type: [],
      assignee: "",
      search: "login bug",
      labels: [],
    };
    const params = buildApiParams(filters, []);
    expect(params.get("search")).toBe("login bug");
  });

  it("encodes labels filter", () => {
    const filters: FilterState = {
      status: [],
      priority: [],
      issue_type: [],
      assignee: "",
      search: "",
      labels: ["urgent", "frontend"],
    };
    const params = buildApiParams(filters, []);
    expect(params.get("labels")).toBe("urgent,frontend");
  });

  it("encodes all filters together", () => {
    const filters: FilterState = {
      status: ["open"],
      priority: [1],
      issue_type: ["bug"],
      assignee: "alice",
      search: "fix",
      labels: [],
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
});
