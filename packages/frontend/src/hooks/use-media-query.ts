import { useMemo, useSyncExternalStore } from "react";

/** Standard responsive breakpoints */
export const MOBILE_BREAKPOINT = 768;
export const TABLET_BREAKPOINT = 1024;

/**
 * Subscribe to a CSS media query. Returns true when the query matches.
 * Uses useSyncExternalStore for tear-free reads during concurrent renders.
 * A single matchMedia instance is shared between subscribe and getSnapshot.
 */
export function useMediaQuery(query: string): boolean {
  const store = useMemo(() => {
    const mql = window.matchMedia(query);
    return {
      subscribe: (callback: () => void) => {
        mql.addEventListener("change", callback);
        return () => mql.removeEventListener("change", callback);
      },
      getSnapshot: () => mql.matches,
    };
  }, [query]);

  return useSyncExternalStore(store.subscribe, store.getSnapshot, () => false);
}

/** True when viewport width < 768px */
export function useIsMobile(): boolean {
  return useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
}

/** True when viewport width < 1024px (mobile or tablet) */
export function useIsCompact(): boolean {
  return useMediaQuery(`(max-width: ${TABLET_BREAKPOINT - 1}px)`);
}

/** @deprecated Use useIsCompact instead */
export const useIsTablet = useIsCompact;
