import { useCallback, useSyncExternalStore } from "react";
import type { FilterState } from "@/lib/query-syntax";
import { SHOW_ALL_FILTERS } from "@/lib/query-syntax";

export interface FilterPreset {
  id: string;
  name: string;
  filters: FilterState;
}

const STORAGE_KEY = "pearl-filter-presets";
const ACTIVE_PRESET_KEY = "pearl-active-preset-id";

// ─── External store ────────────────────────────────────
let presets: FilterPreset[] = loadFromStorage();
let activePresetId: string | null = loadActivePresetId();
let version = 0;
const listeners = new Set<() => void>();

function notify() {
  version++;
  for (const l of [...listeners]) l();
}

function loadActivePresetId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_PRESET_KEY);
  } catch {
    return null;
  }
}

function saveActivePresetId(id: string | null) {
  try {
    if (id) {
      localStorage.setItem(ACTIVE_PRESET_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_PRESET_KEY);
    }
  } catch {
    // localStorage unavailable
  }
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
    saveActivePresetId(id);
    notify();
    return id;
  }, []);

  const remove = useCallback((id: string) => {
    presets = presets.filter((p) => p.id !== id);
    if (activePresetId === id) {
      activePresetId = null;
      saveActivePresetId(null);
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
    saveActivePresetId(id);
    notify();
  }, []);

  return { presets, activePresetId, save, remove, rename, update, selectPreset };
}

export function _resetForTesting() {
  presets = defaultPresets();
  activePresetId = null;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(ACTIVE_PRESET_KEY);
  version = 0;
  notify();
}
