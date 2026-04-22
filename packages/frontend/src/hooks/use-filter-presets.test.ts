import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FilterState } from "@/lib/query-syntax";
import { SHOW_ALL_FILTERS } from "@/lib/query-syntax";
import { _resetForTesting, useFilterPresets } from "./use-filter-presets";

const testFilters: FilterState = {
  status: ["open"],
  priority: [0, 1],
  issue_type: [],
  assignee: "",
  search: "",
  labels: [],
  dateRanges: [],
  structural: [],
  groupBy: null,
};

describe("useFilterPresets", () => {
  beforeEach(() => {
    _resetForTesting();
  });

  afterEach(() => {
    _resetForTesting();
  });

  it("returns default presets", () => {
    const { result } = renderHook(() => useFilterPresets());
    expect(result.current.presets.length).toBeGreaterThan(0);
    expect(result.current.presets[0].name).toBe("All Issues");
  });

  it("activePresetId is null initially", () => {
    const { result } = renderHook(() => useFilterPresets());
    expect(result.current.activePresetId).toBeNull();
  });

  it("selectPreset sets activePresetId", () => {
    const { result } = renderHook(() => useFilterPresets());
    act(() => {
      result.current.selectPreset("preset-all");
    });
    expect(result.current.activePresetId).toBe("preset-all");
  });

  it("selectPreset(null) clears activePresetId", () => {
    const { result } = renderHook(() => useFilterPresets());
    act(() => {
      result.current.selectPreset("preset-all");
    });
    expect(result.current.activePresetId).toBe("preset-all");
    act(() => {
      result.current.selectPreset(null);
    });
    expect(result.current.activePresetId).toBeNull();
  });

  it("selectPreset persists to localStorage", () => {
    const { result } = renderHook(() => useFilterPresets());
    act(() => {
      result.current.selectPreset("preset-blocked");
    });
    expect(localStorage.getItem("pearl-active-preset-id")).toBe("preset-blocked");
  });

  it("selectPreset(null) removes from localStorage", () => {
    const { result } = renderHook(() => useFilterPresets());
    act(() => {
      result.current.selectPreset("preset-blocked");
    });
    act(() => {
      result.current.selectPreset(null);
    });
    expect(localStorage.getItem("pearl-active-preset-id")).toBeNull();
  });

  it("save auto-selects the new preset", () => {
    const { result } = renderHook(() => useFilterPresets());
    let newId: string;
    act(() => {
      newId = result.current.save("My Filter", testFilters);
    });
    expect(result.current.activePresetId).toBe(newId!);
    expect(localStorage.getItem("pearl-active-preset-id")).toBe(newId!);
  });

  it("remove clears activePresetId when removing the active preset", () => {
    const { result } = renderHook(() => useFilterPresets());
    let newId: string;
    act(() => {
      newId = result.current.save("My Filter", testFilters);
    });
    expect(result.current.activePresetId).toBe(newId!);
    act(() => {
      result.current.remove(newId!);
    });
    expect(result.current.activePresetId).toBeNull();
  });

  it("remove does not clear activePresetId when removing a different preset", () => {
    const { result } = renderHook(() => useFilterPresets());
    let id1: string;
    let id2: string;
    act(() => {
      id1 = result.current.save("Filter 1", testFilters);
      id2 = result.current.save("Filter 2", SHOW_ALL_FILTERS);
    });
    expect(result.current.activePresetId).toBe(id2!);
    act(() => {
      result.current.remove(id1!);
    });
    expect(result.current.activePresetId).toBe(id2!);
  });

  it("update modifies preset filters", () => {
    const { result } = renderHook(() => useFilterPresets());
    let newId: string;
    act(() => {
      newId = result.current.save("My Filter", testFilters);
    });
    const updatedFilters: FilterState = { ...testFilters, priority: [2, 3] };
    act(() => {
      result.current.update(newId!, updatedFilters);
    });
    const preset = result.current.presets.find((p) => p.id === newId!);
    expect(preset?.filters.priority).toEqual([2, 3]);
  });
});
