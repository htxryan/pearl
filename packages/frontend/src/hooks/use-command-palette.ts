import { useSyncExternalStore, useEffect, useRef } from "react";

export interface CommandAction {
  id: string;
  label: string;
  shortcut?: string;
  group?: string;
  handler: () => void;
}

// ─── Command palette state ──────────────────────────────
let isOpen = false;
let listeners: Array<() => void> = [];
const registeredActions = new Map<string, CommandAction[]>();
let actionsVersion = 0;

function notify() {
  actionsVersion++;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
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

// ─── Action Registration ────────────────────────────────
export function useCommandPaletteActions(sourceId: string, actions: CommandAction[]) {
  const sourceIdRef = useRef(sourceId);

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

  // Update actions in-place without cleanup/setup cycle (single notify)
  useEffect(() => {
    if (sourceIdRef.current) {
      registeredActions.set(sourceIdRef.current, actions);
      notify();
    }
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
