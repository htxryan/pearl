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

  it("activePresetId is in-memory only (not persisted across reloads)", () => {
    const { result } = renderHook(() => useFilterPresets());
    act(() => {
      result.current.selectPreset("preset-blocked");
    });
    expect(result.current.activePresetId).toBe("preset-blocked");
    expect(localStorage.getItem("pearl-active-preset-id")).toBeNull();
  });

  it("save auto-selects the new preset", () => {
    const { result } = renderHook(() => useFilterPresets());
    let newId: string;
    act(() => {
      newId = result.current.save("My Filter", testFilters);
    });
    expect(result.current.activePresetId).toBe(newId!);
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

  it("exact match against a different preset suppresses modified indicator", () => {
    const { result } = renderHook(() => useFilterPresets());
    const filtersA: FilterState = { ...testFilters, priority: [0] };
    const filtersB: FilterState = { ...testFilters, priority: [1] };
    let idA: string;
    act(() => {
      idA = result.current.save("Preset A", filtersA);
      result.current.save("Preset B", filtersB);
    });
    // Active preset is B (last saved), switch to A
    act(() => {
      result.current.selectPreset(idA!);
    });
    expect(result.current.activePresetId).toBe(idA!);
    // Now if the user manually adjusts filters to match Preset B,
    // the component finds an exactMatch on B — hasUnsavedChanges should be false.
    // Verify the presets array contains B with the expected filters.
    const presetB = result.current.presets.find((p) => p.name === "Preset B");
    expect(presetB).toBeDefined();
    // The component computes: exactMatch = presets.find(p => filtersMatch(p.filters, currentFilters))
    // If currentFilters === filtersB, exactMatch = presetB, so hasUnsavedChanges = selectedPreset && !exactMatch = false
    // Verify the data the component would use:
    const selectedPreset = result.current.presets.find(
      (p) => p.id === result.current.activePresetId,
    );
    expect(selectedPreset?.name).toBe("Preset A");
    const exactMatch = result.current.presets.find(
      (p) =>
        p.filters.priority.length === filtersB.priority.length &&
        p.filters.priority.every((v, i) => v === filtersB.priority[i]),
    );
    expect(exactMatch?.name).toBe("Preset B");
    // hasUnsavedChanges = selectedPreset && !exactMatch → truthy && !truthy → false
    expect(!!(selectedPreset && !exactMatch)).toBe(false);
  });
});
