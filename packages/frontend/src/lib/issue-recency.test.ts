import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  __resetIssueRecencyForTests,
  getIssueOpenedAt,
  markIssueOpened,
  mostRecentOpenedAt,
  sortByRecency,
} from "./issue-recency";

beforeEach(() => {
  __resetIssueRecencyForTests();
});

afterEach(() => {
  __resetIssueRecencyForTests();
});

describe("markIssueOpened / getIssueOpenedAt", () => {
  it("persists a timestamp for an issue", () => {
    const when = new Date("2026-04-24T12:00:00Z");
    markIssueOpened("beads-abc", when);
    expect(getIssueOpenedAt("beads-abc")).toBe(when.toISOString());
  });

  it("overwrites the prior timestamp on re-open", () => {
    markIssueOpened("beads-abc", new Date("2026-04-23T00:00:00Z"));
    markIssueOpened("beads-abc", new Date("2026-04-24T00:00:00Z"));
    expect(getIssueOpenedAt("beads-abc")).toBe("2026-04-24T00:00:00.000Z");
  });
});

describe("mostRecentOpenedAt", () => {
  it("returns updated_at when no local view recorded", () => {
    const issue = { id: "beads-x", updated_at: "2026-04-20T10:00:00.000Z" };
    expect(mostRecentOpenedAt(issue)).toBe("2026-04-20T10:00:00.000Z");
  });

  it("returns local view timestamp when newer than updated_at", () => {
    markIssueOpened("beads-x", new Date("2026-04-21T00:00:00Z"));
    const issue = { id: "beads-x", updated_at: "2026-04-20T10:00:00.000Z" };
    expect(mostRecentOpenedAt(issue)).toBe("2026-04-21T00:00:00.000Z");
  });

  it("returns updated_at when modification is newer than last view", () => {
    markIssueOpened("beads-x", new Date("2026-04-19T00:00:00Z"));
    const issue = { id: "beads-x", updated_at: "2026-04-20T10:00:00.000Z" };
    expect(mostRecentOpenedAt(issue)).toBe("2026-04-20T10:00:00.000Z");
  });
});

describe("sortByRecency", () => {
  it("sorts most-recently-opened first", () => {
    markIssueOpened("a", new Date("2026-04-24T00:00:00Z"));
    markIssueOpened("b", new Date("2026-04-22T00:00:00Z"));
    const issues = [
      { id: "a", updated_at: "2026-04-10T00:00:00.000Z" },
      { id: "b", updated_at: "2026-04-10T00:00:00.000Z" },
      { id: "c", updated_at: "2026-04-23T00:00:00.000Z" },
    ];
    const sorted = sortByRecency(issues);
    expect(sorted.map((i) => i.id)).toEqual(["a", "c", "b"]);
  });

  it("uses updated_at for issues never viewed locally", () => {
    const issues = [
      { id: "a", updated_at: "2026-04-10T00:00:00.000Z" },
      { id: "b", updated_at: "2026-04-23T00:00:00.000Z" },
      { id: "c", updated_at: "2026-04-15T00:00:00.000Z" },
    ];
    expect(sortByRecency(issues).map((i) => i.id)).toEqual(["b", "c", "a"]);
  });

  it("treats a modification newer than the last view as the recency", () => {
    markIssueOpened("a", new Date("2026-04-20T00:00:00Z"));
    const issues = [
      { id: "a", updated_at: "2026-04-24T00:00:00.000Z" }, // modified after last view
      { id: "b", updated_at: "2026-04-23T00:00:00.000Z" },
    ];
    expect(sortByRecency(issues).map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("does not mutate the input array", () => {
    const issues = [
      { id: "a", updated_at: "2026-04-10T00:00:00.000Z" },
      { id: "b", updated_at: "2026-04-23T00:00:00.000Z" },
    ];
    const original = [...issues];
    sortByRecency(issues);
    expect(issues).toEqual(original);
  });
});
