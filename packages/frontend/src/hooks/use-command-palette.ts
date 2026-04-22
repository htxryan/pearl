import { useEffect, useRef, useSyncExternalStore } from "react";

export interface CommandAction {
  id: string;
  label: string;
  shortcut?: string;
  group?: string;
  handler: () => void;
}

// ─── Separate listener sets ────────────────────────────
const openListeners = new Set<() => void>();
const actionListeners = new Set<() => void>();
let actionsVersion = 0;

function notifyOpen() {
  for (const l of [...openListeners]) l();
}

function notifyActions() {
  actionsVersion++;
  for (const l of [...actionListeners]) l();
}

function subscribeOpen(listener: () => void) {
  openListeners.add(listener);
  return () => {
    openListeners.delete(listener);
  };
}

function subscribeActions(listener: () => void) {
  actionListeners.add(listener);
  return () => {
    actionListeners.delete(listener);
  };
}

// ─── Command palette state ─────────────────────────────
let isOpen = false;

const registeredActions = new Map<string, CommandAction[]>();

export function openCommandPalette() {
  if (isSearchOpen) {
    isSearchOpen = false;
  }
  isOpen = true;
  notifyOpen();
}

export function closeCommandPalette() {
  isOpen = false;
  notifyOpen();
}

export function toggleCommandPalette() {
  if (isSearchOpen) {
    isSearchOpen = false;
  }
  isOpen = !isOpen;
  notifyOpen();
}

export function useCommandPaletteOpen() {
  return useSyncExternalStore(subscribeOpen, () => isOpen);
}

// ─── Search palette state ──────────────────────────────
let isSearchOpen = false;

export function openSearchPalette() {
  if (isOpen) {
    isOpen = false;
  }
  isSearchOpen = true;
  notifyOpen();
}

export function closeSearchPalette() {
  isSearchOpen = false;
  notifyOpen();
}

export function toggleSearchPalette() {
  if (isOpen) {
    isOpen = false;
  }
  isSearchOpen = !isSearchOpen;
  notifyOpen();
}

export function useSearchPaletteOpen() {
  return useSyncExternalStore(subscribeOpen, () => isSearchOpen);
}

// ─── Action Registration ───────────────────────────────
export function useCommandPaletteActions(sourceId: string, actions: CommandAction[]) {
  const sourceIdRef = useRef(sourceId);
  const mountedRef = useRef(false);

  useEffect(() => {
    sourceIdRef.current = sourceId;
    registeredActions.set(sourceId, actions);
    notifyActions();

    return () => {
      registeredActions.delete(sourceIdRef.current);
      notifyActions();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceId]);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    registeredActions.set(sourceIdRef.current, actions);
    notifyActions();
  }, [actions]);
}

export function useAllCommandActions(): CommandAction[] {
  useSyncExternalStore(subscribeActions, () => actionsVersion);
  const all: CommandAction[] = [];
  for (const actions of registeredActions.values()) {
    all.push(...actions);
  }
  return all;
}
