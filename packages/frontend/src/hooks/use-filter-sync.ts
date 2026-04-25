import { useEffect, useRef } from "react";
import { useLocation, useSearchParams } from "react-router";

const STORAGE_KEY = "pearl:filter-params";
const NON_FILTER_KEYS = new Set(["sort", "dir", "item"]);

export const VIEW_PATHS = new Set(["/list", "/board", "/graph"]);

export function isViewPath(pathname: string): boolean {
  return VIEW_PATHS.has(pathname);
}

export function hasFilterParams(params: URLSearchParams): boolean {
  for (const key of params.keys()) {
    if (!NON_FILTER_KEYS.has(key)) return true;
  }
  return false;
}

function filterOnlyParams(params: URLSearchParams): string {
  const filtered = new URLSearchParams();
  for (const [key, value] of params) {
    if (!NON_FILTER_KEYS.has(key)) {
      filtered.append(key, value);
    }
  }
  return filtered.toString();
}

export function saveFilterParams(params: string) {
  try {
    localStorage.setItem(STORAGE_KEY, params);
  } catch {
    // localStorage full or unavailable
  }
}

export function clearFilterParams() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage unavailable
  }
}

export function loadFilterParams(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Syncs URL filter params to localStorage. On navigation to a view
 * path with no filter params, restores from localStorage.
 * Must be called once in AppShell.
 */
export function useFilterSync() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const prevPathRef = useRef("");

  useEffect(() => {
    const wasViewPath = isViewPath(prevPathRef.current);
    const isNowViewPath = isViewPath(location.pathname);
    prevPathRef.current = location.pathname;

    if (!isNowViewPath) return;
    if (hasFilterParams(searchParams)) return;
    if (wasViewPath) return;

    const saved = loadFilterParams();
    if (saved) {
      const merged = new URLSearchParams(saved);
      // Preserve any non-filter params already on the URL (e.g., ?item= from a deep link).
      for (const [key, value] of searchParams) {
        if (NON_FILTER_KEYS.has(key)) merged.set(key, value);
      }
      setSearchParams(merged, { replace: true });
    }
  }, [location.pathname, searchParams, setSearchParams]);

  useEffect(() => {
    if (!isViewPath(location.pathname)) return;
    if (hasFilterParams(searchParams)) {
      saveFilterParams(filterOnlyParams(searchParams));
    } else {
      clearFilterParams();
    }
  }, [searchParams, location.pathname]);
}
