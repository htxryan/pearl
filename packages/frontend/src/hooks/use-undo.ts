import { useSyncExternalStore, useCallback } from "react";
import * as api from "@/lib/api-client";
import { addToast } from "./use-toast";

export interface UndoEntry {
  id: string;
  description: string;
  undo: () => Promise<void>;
  timestamp: number;
}

// ─── External store ──────────��─────────────────────────
let history: UndoEntry[] = [];
let version = 0;
const listeners = new Set<() => void>();
const MAX_HISTORY = 20;

function notify() {
  version++;
  for (const l of [...listeners]) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

let entryCounter = 0;

export function pushUndo(entry: Omit<UndoEntry, "id" | "timestamp">): void {
  const id = `undo-${++entryCounter}`;
  const fullEntry: UndoEntry = { ...entry, id, timestamp: Date.now() };
  history = [fullEntry, ...history].slice(0, MAX_HISTORY);
  notify();

  // Show toast with undo action
  addToast({
    message: entry.description,
    variant: "success",
    duration: 5000,
    action: {
      label: "Undo",
      onClick: () => performUndo(id),
    },
  });
}

async function performUndo(entryId: string): Promise<void> {
  const entry = history.find((e) => e.id === entryId);
  if (!entry) return;

  try {
    await entry.undo();
    history = history.filter((e) => e.id !== entryId);
    notify();
    addToast({ message: "Undone.", variant: "info", duration: 2000 });
  } catch {
    addToast({ message: "Undo failed. Please try again.", variant: "error" });
  }
}

export async function undoLast(): Promise<void> {
  if (history.length === 0) return;
  await performUndo(history[0].id);
}

export function __resetForTesting() {
  history = [];
  version = 0;
  listeners.clear();
  entryCounter = 0;
}

// ─── Hook ──────────────────────────────────────────────
export function useUndoHistory(): UndoEntry[] {
  return useSyncExternalStore(subscribe, () => history);
}

export function useCanUndo(): boolean {
  useSyncExternalStore(subscribe, () => version);
  return history.length > 0;
}

// ─── Undo-aware mutation helpers ───���───────────────────
export function useUndoActions() {
  const recordStatusChange = useCallback(
    (issueId: string, issueTitle: string, oldStatus: string, newStatus: string) => {
      pushUndo({
        description: `Changed "${issueTitle}" to ${newStatus}`,
        undo: async () => {
          await api.updateIssue(issueId, { status: oldStatus as never });
        },
      });
    },
    [],
  );

  const recordClose = useCallback(
    (issueId: string, issueTitle: string, previousStatus: string) => {
      pushUndo({
        description: `Closed "${issueTitle}"`,
        undo: async () => {
          await api.updateIssue(issueId, { status: previousStatus as never });
        },
      });
    },
    [],
  );

  const recordFieldEdit = useCallback(
    (issueId: string, issueTitle: string, field: string, oldValue: unknown) => {
      pushUndo({
        description: `Updated ${field} on "${issueTitle}"`,
        undo: async () => {
          await api.updateIssue(issueId, { [field]: oldValue } as never);
        },
      });
    },
    [],
  );

  return { recordStatusChange, recordClose, recordFieldEdit, undoLast };
}
