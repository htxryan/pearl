import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadFilterParams, saveFilterParams } from "./use-filter-sync";

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
});
