import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMediaQuery, useIsMobile, useIsCompact, useIsTablet, MOBILE_BREAKPOINT, TABLET_BREAKPOINT } from "./use-media-query";

describe("useMediaQuery", () => {
  let listeners: Map<string, Set<() => void>>;
  let matchState: Map<string, boolean>;

  beforeEach(() => {
    listeners = new Map();
    matchState = new Map();

    vi.spyOn(window, "matchMedia").mockImplementation((query: string) => {
      if (!listeners.has(query)) listeners.set(query, new Set());
      if (!matchState.has(query)) matchState.set(query, false);

      return {
        // Getter so the cached mql instance reflects current state
        get matches() { return matchState.get(query)!; },
        media: query,
        addEventListener: (_: string, cb: () => void) => {
          listeners.get(query)!.add(cb);
        },
        removeEventListener: (_: string, cb: () => void) => {
          listeners.get(query)!.delete(cb);
        },
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } as unknown as MediaQueryList;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function setMatch(query: string, matches: boolean) {
    matchState.set(query, matches);
    const cbs = listeners.get(query);
    if (cbs) cbs.forEach((cb) => cb());
  }

  it("returns false initially when query does not match", () => {
    const { result } = renderHook(() => useMediaQuery("(max-width: 767px)"));
    expect(result.current).toBe(false);
  });

  it("returns true when query matches", () => {
    matchState.set("(max-width: 767px)", true);
    const { result } = renderHook(() => useMediaQuery("(max-width: 767px)"));
    expect(result.current).toBe(true);
  });

  it("updates when match state changes", () => {
    const { result } = renderHook(() => useMediaQuery("(max-width: 767px)"));
    expect(result.current).toBe(false);

    act(() => setMatch("(max-width: 767px)", true));
    expect(result.current).toBe(true);

    act(() => setMatch("(max-width: 767px)", false));
    expect(result.current).toBe(false);
  });

  it("cleans up listener on unmount", () => {
    const query = "(max-width: 767px)";
    const { unmount } = renderHook(() => useMediaQuery(query));
    expect(listeners.get(query)!.size).toBe(1);
    unmount();
    expect(listeners.get(query)!.size).toBe(0);
  });
});

describe("useIsMobile", () => {
  it("uses correct breakpoint", () => {
    expect(MOBILE_BREAKPOINT).toBe(768);

    vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
      matches: query === `(max-width: ${MOBILE_BREAKPOINT - 1}px)`,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }) as unknown as MediaQueryList);

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });
});

describe("useIsCompact", () => {
  it("uses correct breakpoint", () => {
    expect(TABLET_BREAKPOINT).toBe(1024);

    vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
      matches: query === `(max-width: ${TABLET_BREAKPOINT - 1}px)`,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }) as unknown as MediaQueryList);

    const { result } = renderHook(() => useIsCompact());
    expect(result.current).toBe(true);
  });

  it("useIsTablet is a deprecated alias for useIsCompact", () => {
    expect(useIsTablet).toBe(useIsCompact);
  });
});
