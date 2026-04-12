import { useSyncExternalStore, useCallback } from "react";
import type { FilterState } from "@/components/issue-table/filter-bar";

export interface FilterPreset {
  id: string;
  name: string;
  filters: FilterState;
}

const STORAGE_KEY = "beads-gui-filter-presets";

// ─── External store ────────────────────────────────────
let presets: FilterPreset[] = loadFromStorage();
let version = 0;
const listeners = new Set<() => void>();

function notify() {
  version++;
  for (const l of [...listeners]) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function loadFromStorage(): FilterPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPresets();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return defaultPresets();
    return parsed;
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
      id: "preset-my-issues",
      name: "My Issues",
      filters: { status: ["open", "in_progress"], priority: [], issue_type: [], assignee: "", search: "", labels: [] },
    },
    {
      id: "preset-blocked",
      name: "Blocked",
      filters: { status: ["blocked"], priority: [], issue_type: [], assignee: "", search: "", labels: [] },
    },
    {
      id: "preset-high-priority",
      name: "High Priority",
      filters: { status: ["open", "in_progress"], priority: [0, 1], issue_type: [], assignee: "", search: "", labels: [] },
    },
  ];
}

let idCounter = Date.now();

export function useFilterPresets() {
  useSyncExternalStore(subscribe, () => version);

  const save = useCallback((name: string, filters: FilterState) => {
    const id = `preset-${++idCounter}`;
    presets = [...presets, { id, name, filters }];
    saveToStorage();
    notify();
    return id;
  }, []);

  const remove = useCallback((id: string) => {
    presets = presets.filter((p) => p.id !== id);
    saveToStorage();
    notify();
  }, []);

  const rename = useCallback((id: string, name: string) => {
    presets = presets.map((p) => (p.id === id ? { ...p, name } : p));
    saveToStorage();
    notify();
  }, []);

  return { presets, save, remove, rename };
}
