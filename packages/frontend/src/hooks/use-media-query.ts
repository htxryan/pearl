import { useSyncExternalStore } from "react";

/** Standard responsive breakpoints */
export const MOBILE_BREAKPOINT = 768;
export const TABLET_BREAKPOINT = 1024;

/**
 * Subscribe to a CSS media query. Returns true when the query matches.
 * Uses useSyncExternalStore for tear-free reads during concurrent renders.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (callback) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", callback);
      return () => mql.removeEventListener("change", callback);
    },
    () => window.matchMedia(query).matches,
    () => false, // SSR fallback — always false on server
  );
}

/** True when viewport width < 768px */
export function useIsMobile(): boolean {
  return useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
}

/** True when viewport width < 1024px */
export function useIsTablet(): boolean {
  return useMediaQuery(`(max-width: ${TABLET_BREAKPOINT - 1}px)`);
}
