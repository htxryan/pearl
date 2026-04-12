import { useSyncExternalStore, useCallback } from "react";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
  action?: { label: string; onClick: () => void };
}

type AddToastInput = Omit<Toast, "id" | "duration"> & { duration?: number };

// ─── External store ────────────────────────────────────
let toasts: Toast[] = [];
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

function getSnapshot(): Toast[] {
  return toasts;
}

const timers = new Map<string, ReturnType<typeof setTimeout>>();

let idCounter = 0;

export function addToast(input: AddToastInput): string {
  const id = `toast-${++idCounter}`;
  const duration = input.duration ?? 3000;
  const toast: Toast = { ...input, id, duration };
  toasts = [...toasts, toast];
  notify();

  if (duration > 0) {
    const timer = setTimeout(() => dismissToast(id), duration);
    timers.set(id, timer);
  }

  return id;
}

export function dismissToast(id: string) {
  const timer = timers.get(id);
  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }
  toasts = toasts.filter((t) => t.id !== id);
  notify();
}

// ─── Hook ──────────────────────────────────────────────
export function useToasts(): Toast[] {
  return useSyncExternalStore(subscribe, getSnapshot);
}

// ─── Convenience hook for mutations ────────────────────
export function useToastActions() {
  const success = useCallback(
    (message: string, action?: Toast["action"]) =>
      addToast({ message, variant: "success", action }),
    [],
  );
  const error = useCallback(
    (message: string, action?: Toast["action"]) =>
      addToast({ message, variant: "error", duration: 5000, action }),
    [],
  );
  const warning = useCallback(
    (message: string, action?: Toast["action"]) =>
      addToast({ message, variant: "warning", action }),
    [],
  );
  const info = useCallback(
    (message: string, action?: Toast["action"]) =>
      addToast({ message, variant: "info", action }),
    [],
  );

  return { success, error, warning, info };
}
