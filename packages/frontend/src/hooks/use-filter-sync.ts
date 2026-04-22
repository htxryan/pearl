import { useEffect, useRef } from "react";
import { useLocation, useSearchParams } from "react-router";

const STORAGE_KEY = "pearl:filter-params";

const VIEW_PATHS = new Set(["/list", "/board", "/graph"]);

function isViewPath(pathname: string): boolean {
  return VIEW_PATHS.has(pathname);
}

function hasFilterParams(params: URLSearchParams): boolean {
  for (const key of params.keys()) {
    if (key !== "sort" && key !== "dir") return true;
  }
  return false;
}

export function saveFilterParams(params: string) {
  try {
    localStorage.setItem(STORAGE_KEY, params);
  } catch {
    // localStorage full or unavailable
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

  // Restore from localStorage when arriving at a view path without filter params
  // from a non-view path (e.g., detail view → list view).
  useEffect(() => {
    const wasViewPath = isViewPath(prevPathRef.current);
    const isNowViewPath = isViewPath(location.pathname);
    prevPathRef.current = location.pathname;

    if (!isNowViewPath) return;
    if (hasFilterParams(searchParams)) return;

    // Only restore when first entering a view path (app load, or from non-view path)
    if (wasViewPath) return;

    const saved = loadFilterParams();
    if (saved) {
      setSearchParams(new URLSearchParams(saved), { replace: true });
    }
  }, [location.pathname, searchParams, setSearchParams]);

  // Save filter params to localStorage whenever they change on a view path
  useEffect(() => {
    if (!isViewPath(location.pathname)) return;
    if (hasFilterParams(searchParams)) {
      saveFilterParams(searchParams.toString());
    }
  }, [searchParams, location.pathname]);
}
