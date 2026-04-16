import { describe, expect, it } from "vitest";
import { hasQuerySyntax, parseQuerySyntax } from "./query-syntax";

describe("hasQuerySyntax", () => {
  it("detects key:value pairs", () => {
    expect(hasQuerySyntax("status:open")).toBe(true);
    expect(hasQuerySyntax("priority:0 assignee:ryan")).toBe(true);
  });

  it("returns false for plain text", () => {
    expect(hasQuerySyntax("fix the login bug")).toBe(false);
    expect(hasQuerySyntax("")).toBe(false);
  });
});

describe("parseQuerySyntax", () => {
  it("parses status filter", () => {
    const result = parseQuerySyntax("status:open");
    expect(result.filters.status).toEqual(["open"]);
    expect(result.freeText).toBe("");
  });

  it("parses comma-separated statuses", () => {
    const result = parseQuerySyntax("status:open,in_progress");
    expect(result.filters.status).toEqual(["open", "in_progress"]);
  });

  it("parses priority filter", () => {
    const result = parseQuerySyntax("priority:0");
    expect(result.filters.priority).toEqual([0]);
  });

  it("parses p: shorthand for priority", () => {
    const result = parseQuerySyntax("p:1");
    expect(result.filters.priority).toEqual([1]);
  });

  it("parses type filter", () => {
    const result = parseQuerySyntax("type:bug");
    expect(result.filters.issue_type).toEqual(["bug"]);
  });

  it("parses assignee filter", () => {
    const result = parseQuerySyntax("assignee:ryan");
    expect(result.filters.assignee).toBe("ryan");
  });

  it("parses label filter", () => {
    const result = parseQuerySyntax("label:urgent");
    expect(result.filters.labels).toEqual(["urgent"]);
  });

  it("parses quoted values", () => {
    const result = parseQuerySyntax('assignee:"Ryan Henderson"');
    expect(result.filters.assignee).toBe("Ryan Henderson");
  });

  it("preserves free text", () => {
    const result = parseQuerySyntax("status:open fix the login bug");
    expect(result.filters.status).toEqual(["open"]);
    expect(result.freeText).toBe("fix the login bug");
  });

  it("parses multiple filters", () => {
    const result = parseQuerySyntax("status:open priority:0 type:bug");
    expect(result.filters.status).toEqual(["open"]);
    expect(result.filters.priority).toEqual([0]);
    expect(result.filters.issue_type).toEqual(["bug"]);
  });

  it("parses due date filters", () => {
    const result = parseQuerySyntax("due:today");
    expect(result.dateRanges).toContain("due_today");
  });

  it("parses due:overdue", () => {
    const result = parseQuerySyntax("due:overdue");
    expect(result.dateRanges).toContain("overdue");
  });

  it("parses created date filters", () => {
    const result = parseQuerySyntax("created:today");
    expect(result.dateRanges).toContain("created_today");
  });

  it("parses has:dependency", () => {
    const result = parseQuerySyntax("has:dependency");
    expect(result.structural).toContain("has_dependency");
  });

  it("parses is:blocked", () => {
    const result = parseQuerySyntax("is:blocked");
    expect(result.structural).toContain("is_blocked");
  });

  it("parses is:epic", () => {
    const result = parseQuerySyntax("is:epic");
    expect(result.structural).toContain("is_epic");
  });

  it("parses no:assignee", () => {
    const result = parseQuerySyntax("no:assignee");
    expect(result.structural).toContain("no_assignee");
  });

  it("parses no:due", () => {
    const result = parseQuerySyntax("no:due");
    expect(result.dateRanges).toContain("no_due_date");
  });

  it("ignores invalid values", () => {
    const result = parseQuerySyntax("status:invalid_status");
    expect(result.filters.status).toBeUndefined();
    // The unrecognized token stays in the original text (not consumed)
    expect(result.freeText).toContain("status:invalid_status");
  });

  it("parses complex query with free text", () => {
    const result = parseQuerySyntax("status:open priority:1 fix login is:blocked");
    expect(result.filters.status).toEqual(["open"]);
    expect(result.filters.priority).toEqual([1]);
    expect(result.structural).toContain("is_blocked");
    expect(result.freeText).toBe("fix login");
  });
});
