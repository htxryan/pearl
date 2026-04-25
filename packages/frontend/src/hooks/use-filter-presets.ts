import { useCallback, useSyncExternalStore } from "react";
import type { FilterState } from "@/lib/query-syntax";
import { SHOW_ALL_FILTERS } from "@/lib/query-syntax";

export interface FilterPreset {
  id: string;
  name: string;
  filters: FilterState;
}

const STORAGE_KEY = "pearl-filter-presets";

// ─── External store ────────────────────────────────────
let presets: FilterPreset[] = loadFromStorage();
let activePresetId: string | null = null;
let version = 0;
const listeners = new Set<() => void>();

function notify() {
  version++;
  for (const l of [...listeners]) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function normalizePresetFilters(filters: Record<string, unknown>): FilterState {
  return {
    status: (filters.status ?? []) as FilterState["status"],
    priority: (filters.priority ?? []) as FilterState["priority"],
    issue_type: (filters.issue_type ?? []) as FilterState["issue_type"],
    assignee: (filters.assignee ?? "") as string,
    search: (filters.search ?? "") as string,
    labels: (filters.labels ?? []) as string[],
    dateRanges: (filters.dateRanges ?? []) as FilterState["dateRanges"],
    structural: (filters.structural ?? []) as FilterState["structural"],
    groupBy: (filters.groupBy ?? null) as FilterState["groupBy"],
  };
}

function loadFromStorage(): FilterPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPresets();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return defaultPresets();
    // Normalize to ensure new fields are present
    return parsed.map((p: FilterPreset) => ({
      ...p,
      filters: normalizePresetFilters(p.filters as unknown as Record<string, unknown>),
    }));
  } catch {
    return defaultPresets();
  }
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

function defaultPresets(): FilterPreset[] {
  return [
    {
      id: "preset-all",
      name: "All Issues",
      filters: SHOW_ALL_FILTERS,
    },
    {
      id: "preset-blocked",
      name: "Blocked",
      filters: {
        status: ["blocked"],
        priority: [],
        issue_type: [],
        assignee: "",
        search: "",
        labels: [],
        dateRanges: [],
        structural: [],
        groupBy: null,
      },
    },
    {
      id: "preset-high-priority",
      name: "High Priority",
      filters: {
        status: ["open", "in_progress"],
        priority: [0, 1],
        issue_type: [],
        assignee: "",
        search: "",
        labels: [],
        dateRanges: [],
        structural: [],
        groupBy: null,
      },
    },
    {
      id: "preset-overdue",
      name: "Overdue",
      filters: {
        status: [],
        priority: [],
        issue_type: [],
        assignee: "",
        search: "",
        labels: [],
        dateRanges: ["overdue"],
        structural: [],
        groupBy: null,
      },
    },
    {
      id: "preset-unassigned",
      name: "Unassigned",
      filters: {
        status: ["open", "in_progress"],
        priority: [],
        issue_type: [],
        assignee: "",
        search: "",
        labels: [],
        dateRanges: [],
        structural: ["no_assignee"],
        groupBy: null,
      },
    },
    {
      id: "preset-ready",
      name: "Ready",
      filters: {
        status: ["open", "in_progress"],
        priority: [],
        issue_type: [],
        assignee: "",
        search: "",
        labels: [],
        dateRanges: [],
        structural: ["not_blocked"],
        groupBy: null,
      },
    },
    {
      id: "preset-ready-no-parent",
      name: "Ready, No Parent",
      filters: {
        status: ["open", "in_progress"],
        priority: [],
        issue_type: [],
        assignee: "",
        search: "",
        labels: [],
        dateRanges: [],
        structural: ["not_blocked", "no_parent"],
        groupBy: null,
      },
    },
  ];
}

let idCounter = Date.now();

export function useFilterPresets() {
  useSyncExternalStore(subscribe, () => version);

  const save = useCallback((name: string, filters: FilterState) => {
    const id = `preset-${++idCounter}`;
    presets = [...presets, { id, name, filters }];
    activePresetId = id;
    saveToStorage();
    notify();
    return id;
  }, []);

  const remove = useCallback((id: string) => {
    presets = presets.filter((p) => p.id !== id);
    if (activePresetId === id) {
      activePresetId = null;
    }
    saveToStorage();
    notify();
  }, []);

  const rename = useCallback((id: string, name: string) => {
    presets = presets.map((p) => (p.id === id ? { ...p, name } : p));
    saveToStorage();
    notify();
  }, []);

  const update = useCallback((id: string, filters: FilterState) => {
    presets = presets.map((p) => (p.id === id ? { ...p, filters } : p));
    saveToStorage();
    notify();
  }, []);

  const selectPreset = useCallback((id: string | null) => {
    activePresetId = id;
    notify();
  }, []);

  return { presets, activePresetId, save, remove, rename, update, selectPreset };
}

export function _resetForTesting() {
  presets = defaultPresets();
  activePresetId = null;
  localStorage.removeItem(STORAGE_KEY);
  version = 0;
  notify();
}
