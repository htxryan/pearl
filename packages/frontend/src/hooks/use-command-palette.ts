import { useEffect, useRef, useSyncExternalStore } from "react";

export interface CommandAction {
  id: string;
  label: string;
  shortcut?: string;
  group?: string;
  handler: () => void;
}

// ─── Command palette state ──────────────────────────────
let isOpen = false;
const listeners = new Set<() => void>();
const registeredActions = new Map<string, CommandAction[]>();
let actionsVersion = 0;

function notify() {
  actionsVersion++;
  const snapshot = [...listeners];
  snapshot.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function openCommandPalette() {
  isOpen = true;
  notify();
}

export function closeCommandPalette() {
  isOpen = false;
  notify();
}

export function toggleCommandPalette() {
  isOpen = !isOpen;
  notify();
}

export function useCommandPaletteOpen() {
  return useSyncExternalStore(subscribe, () => isOpen);
}

// ─── Search palette state ───────────────────────────────
let isSearchOpen = false;

export function openSearchPalette() {
  isSearchOpen = true;
  notify();
}

export function closeSearchPalette() {
  isSearchOpen = false;
  notify();
}

export function toggleSearchPalette() {
  isSearchOpen = !isSearchOpen;
  notify();
}

export function useSearchPaletteOpen() {
  return useSyncExternalStore(subscribe, () => isSearchOpen);
}

// ─── Action Registration ────────────────────────────────
export function useCommandPaletteActions(sourceId: string, actions: CommandAction[]) {
  const sourceIdRef = useRef(sourceId);
  const mountedRef = useRef(false);

  // Register on mount, cleanup on unmount — avoids double-notify on re-registration
  useEffect(() => {
    sourceIdRef.current = sourceId;
    registeredActions.set(sourceId, actions);
    notify();

    return () => {
      registeredActions.delete(sourceIdRef.current);
      notify();
    };
    // Only re-register when sourceId changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceId]);

  // Update actions in-place without cleanup/setup cycle (single notify).
  // Skip the first run — Effect 1 already handled initial registration.
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    registeredActions.set(sourceIdRef.current, actions);
    notify();
  }, [actions]);
}

export function useAllCommandActions(): CommandAction[] {
  useSyncExternalStore(subscribe, () => actionsVersion);
  const all: CommandAction[] = [];
  for (const actions of registeredActions.values()) {
    all.push(...actions);
  }
  return all;
}
