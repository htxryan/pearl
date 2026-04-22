import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearFilterParams,
  hasFilterParams,
  isViewPath,
  loadFilterParams,
  saveFilterParams,
  VIEW_PATHS,
} from "./use-filter-sync";

describe("filter sync localStorage helpers", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("saveFilterParams stores and loadFilterParams retrieves", () => {
    saveFilterParams("status=open,in_progress&priority=0,1");
    expect(loadFilterParams()).toBe("status=open,in_progress&priority=0,1");
  });

  it("loadFilterParams returns null when nothing stored", () => {
    expect(loadFilterParams()).toBeNull();
  });

  it("overwrites previous value", () => {
    saveFilterParams("status=open");
    saveFilterParams("status=blocked");
    expect(loadFilterParams()).toBe("status=blocked");
  });

  it("clearFilterParams removes stored value", () => {
    saveFilterParams("status=open");
    clearFilterParams();
    expect(loadFilterParams()).toBeNull();
  });
});

describe("hasFilterParams", () => {
  it("returns true for filter params", () => {
    expect(hasFilterParams(new URLSearchParams("status=open"))).toBe(true);
    expect(hasFilterParams(new URLSearchParams("priority=0&status=open"))).toBe(true);
  });

  it("returns false for sort-only params", () => {
    expect(hasFilterParams(new URLSearchParams("sort=created_at&dir=desc"))).toBe(false);
    expect(hasFilterParams(new URLSearchParams("sort=title"))).toBe(false);
    expect(hasFilterParams(new URLSearchParams("dir=asc"))).toBe(false);
  });

  it("returns false for empty params", () => {
    expect(hasFilterParams(new URLSearchParams(""))).toBe(false);
  });

  it("returns true when filter params mixed with sort", () => {
    expect(hasFilterParams(new URLSearchParams("sort=title&status=open"))).toBe(true);
  });
});

describe("isViewPath", () => {
  it("recognizes view paths", () => {
    for (const path of VIEW_PATHS) {
      expect(isViewPath(path)).toBe(true);
    }
  });

  it("rejects non-view paths", () => {
    expect(isViewPath("/settings")).toBe(false);
    expect(isViewPath("/issues/beads-abc")).toBe(false);
    expect(isViewPath("/")).toBe(false);
  });
});
