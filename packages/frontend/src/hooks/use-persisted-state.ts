import { useState, useCallback, useRef } from "react";

/**
 * Like useState but persists to localStorage.
 * Falls back to defaultValue if localStorage is empty or invalid.
 */
export function usePersistedState<T>(
  key: string,
  defaultValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const keyRef = useRef(key);
  keyRef.current = key;

  const [state, setState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(keyRef.current);
      if (stored !== null) {
        return JSON.parse(stored) as T;
      }
    } catch {
      // Invalid JSON — fall through to default
    }
    return defaultValue;
  });

  const setPersistedState = useCallback(
    (value: T | ((prev: T) => T)) => {
      setState((prev) => {
        const next = typeof value === "function" ? (value as (prev: T) => T)(prev) : value;
        try {
          localStorage.setItem(keyRef.current, JSON.stringify(next));
        } catch {
          // localStorage full or unavailable — state still updates in memory
        }
        return next;
      });
    },
    [],
  );

  return [state, setPersistedState];
}
