import { useState, useCallback, useEffect, useRef } from "react";

export interface DraftState {
  title: string;
  description: string;
  issueType: string;
  priority: number;
  assignee: string;
  labels: string[];
  due: string;
}

interface UseDraftReturn {
  draft: DraftState | null;
  saveDraft: (state: DraftState) => void;
  clearDraft: () => void;
  hasDraft: boolean;
}

function loadDraft(key: string): DraftState | null {
  try {
    const stored = localStorage.getItem(key);
    if (stored !== null) {
      const parsed = JSON.parse(stored) as DraftState;
      // Validate it has at least one non-empty field
      if (
        parsed.title ||
        parsed.description ||
        parsed.assignee ||
        parsed.due ||
        (parsed.labels && parsed.labels.length > 0)
      ) {
        return parsed;
      }
    }
  } catch {
    // Invalid JSON or localStorage unavailable
  }
  return null;
}

export function useDraft(key: string): UseDraftReturn {
  const [draft, setDraft] = useState<DraftState | null>(() => loadDraft(key));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<DraftState | null>(null);
  const keyRef = useRef(key);
  keyRef.current = key;

  // Flush pending draft on unmount instead of discarding it
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (pendingRef.current) {
        try {
          localStorage.setItem(keyRef.current, JSON.stringify(pendingRef.current));
        } catch {
          // localStorage full or unavailable
        }
        pendingRef.current = null;
      }
    };
  }, []);

  const saveDraft = useCallback((state: DraftState) => {
    setDraft(state);
    pendingRef.current = state;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(keyRef.current, JSON.stringify(state));
      } catch {
        // localStorage full or unavailable
      }
      pendingRef.current = null;
      timerRef.current = null;
    }, 500);
  }, []);

  const clearDraft = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pendingRef.current = null;
    setDraft(null);
    try {
      localStorage.removeItem(keyRef.current);
    } catch {
      // localStorage unavailable
    }
  }, []);

  const hasDraft = draft !== null;

  return { draft, saveDraft, clearDraft, hasDraft };
}
