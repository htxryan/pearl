import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useScrollReveal } from "./use-scroll-reveal";

// ---------------------------------------------------------------------------
// IntersectionObserver mock
// ---------------------------------------------------------------------------
type IOCallback = (entries: Partial<IntersectionObserverEntry>[]) => void;

let ioInstances: Array<{
  callback: IOCallback;
  elements: Set<Element>;
  disconnect: ReturnType<typeof vi.fn>;
}>;

function installIntersectionObserverMock() {
  ioInstances = [];

  const MockIO = vi.fn((callback: IOCallback) => {
    const instance = {
      callback,
      elements: new Set<Element>(),
      disconnect: vi.fn(() => instance.elements.clear()),
    };
    ioInstances.push(instance);

    return {
      observe: vi.fn((el: Element) => instance.elements.add(el)),
      unobserve: vi.fn((el: Element) => instance.elements.delete(el)),
      disconnect: instance.disconnect,
    };
  });

  vi.stubGlobal("IntersectionObserver", MockIO);
}

function removeIntersectionObserverMock() {
  vi.stubGlobal("IntersectionObserver", undefined);
}

/** Simulate the observer firing for the most recent instance. */
function fireIntersection(isIntersecting: boolean) {
  const instance = ioInstances[ioInstances.length - 1];
  if (!instance) throw new Error("No IntersectionObserver instance");

  const entry: Partial<IntersectionObserverEntry> = { isIntersecting };
  act(() => instance.callback([entry]));
}

// ---------------------------------------------------------------------------
// matchMedia helpers
// ---------------------------------------------------------------------------

function mockMatchMedia(reducedMotion: boolean) {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: query === "(prefers-reduced-motion: reduce)" && reducedMotion,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }) as unknown as MediaQueryList,
  );
}

// ---------------------------------------------------------------------------
// getBoundingClientRect helpers
// ---------------------------------------------------------------------------

/**
 * Simulate an element that is within the viewport.
 * top=100 and the viewport height is 768, so the element is visible.
 */
function mockInViewport(el: HTMLElement) {
  vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
    top: 100,
    bottom: 200,
    left: 0,
    right: 100,
    width: 100,
    height: 100,
    x: 0,
    y: 100,
    toJSON: () => {},
  });
}

/**
 * Simulate an element that is below the viewport.
 * top=2000, well past the default jsdom viewport height of 768.
 */
function mockBelowViewport(el: HTMLElement) {
  vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
    top: 2000,
    bottom: 2100,
    left: 0,
    right: 100,
    width: 100,
    height: 100,
    x: 0,
    y: 2000,
    toJSON: () => {},
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useScrollReveal", () => {
  beforeEach(() => {
    installIntersectionObserverMock();
    mockMatchMedia(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a ref and a revealed boolean", () => {
    const { result } = renderHook(() => useScrollReveal<HTMLDivElement>());

    expect(result.current).toHaveLength(2);
    const [ref, revealed] = result.current;
    expect(ref).toHaveProperty("current");
    expect(typeof revealed).toBe("boolean");
  });

  // -----------------------------------------------------------------------
  // 1. Elements already in the viewport are revealed immediately (no flash)
  //
  // This test validates the FIX: the hook should use useLayoutEffect and
  // synchronously check getBoundingClientRect so that an element already
  // visible never goes through a revealed=false paint.
  //
  // With the CURRENT (buggy) implementation this test will FAIL because
  // revealed stays false until IntersectionObserver fires asynchronously.
  // -----------------------------------------------------------------------
  it("reveals immediately when element is already in the viewport", () => {
    const div = document.createElement("div");
    mockInViewport(div);

    const { result } = renderHook(() => {
      const [ref, revealed] = useScrollReveal<HTMLDivElement>();
      // Attach the real DOM element to the ref before the hook's effect runs.
      // biome-ignore lint/style/noParameterAssign: test helper
      (ref as React.MutableRefObject<HTMLDivElement | null>).current = div;
      return { ref, revealed };
    });

    // After the first render + layout effects, the element should be revealed.
    expect(result.current.revealed).toBe(true);
  });

  // -----------------------------------------------------------------------
  // 2. Elements below the viewport are NOT revealed until they scroll in
  // -----------------------------------------------------------------------
  it("does NOT reveal an element that is below the viewport", () => {
    const div = document.createElement("div");
    mockBelowViewport(div);

    const { result } = renderHook(() => {
      const [ref, revealed] = useScrollReveal<HTMLDivElement>();
      (ref as React.MutableRefObject<HTMLDivElement | null>).current = div;
      return { ref, revealed };
    });

    // Should remain hidden until intersection fires
    expect(result.current.revealed).toBe(false);
  });

  // -----------------------------------------------------------------------
  // 3. Off-screen elements are revealed when IntersectionObserver fires
  // -----------------------------------------------------------------------
  it("reveals when IntersectionObserver fires for an off-screen element", () => {
    const div = document.createElement("div");
    mockBelowViewport(div);

    const { result } = renderHook(() => {
      const [ref, revealed] = useScrollReveal<HTMLDivElement>();
      (ref as React.MutableRefObject<HTMLDivElement | null>).current = div;
      return { ref, revealed };
    });

    expect(result.current.revealed).toBe(false);

    // Simulate scrolling the element into view
    fireIntersection(true);

    expect(result.current.revealed).toBe(true);
  });

  it("does NOT reveal when IntersectionObserver fires with isIntersecting=false", () => {
    const div = document.createElement("div");
    mockBelowViewport(div);

    const { result } = renderHook(() => {
      const [ref, revealed] = useScrollReveal<HTMLDivElement>();
      (ref as React.MutableRefObject<HTMLDivElement | null>).current = div;
      return { ref, revealed };
    });

    fireIntersection(false);

    expect(result.current.revealed).toBe(false);
  });

  it("disconnects the observer after revealing", () => {
    const div = document.createElement("div");
    mockBelowViewport(div);

    renderHook(() => {
      const [ref] = useScrollReveal<HTMLDivElement>();
      (ref as React.MutableRefObject<HTMLDivElement | null>).current = div;
      return null;
    });

    const instance = ioInstances[ioInstances.length - 1];
    expect(instance.disconnect).not.toHaveBeenCalled();

    fireIntersection(true);

    expect(instance.disconnect).toHaveBeenCalled();
  });

  it("disconnects the observer on unmount", () => {
    const div = document.createElement("div");
    mockBelowViewport(div);

    const { unmount } = renderHook(() => {
      const [ref] = useScrollReveal<HTMLDivElement>();
      (ref as React.MutableRefObject<HTMLDivElement | null>).current = div;
      return null;
    });

    const instance = ioInstances[ioInstances.length - 1];
    unmount();

    expect(instance.disconnect).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 4. Reduced motion preference reveals immediately
  // -----------------------------------------------------------------------
  it("reveals immediately when prefers-reduced-motion is enabled", () => {
    mockMatchMedia(true);

    const div = document.createElement("div");
    mockBelowViewport(div);

    const { result } = renderHook(() => {
      const [ref, revealed] = useScrollReveal<HTMLDivElement>();
      (ref as React.MutableRefObject<HTMLDivElement | null>).current = div;
      return { ref, revealed };
    });

    expect(result.current.revealed).toBe(true);
  });

  // -----------------------------------------------------------------------
  // 5. Missing IntersectionObserver reveals immediately (graceful fallback)
  // -----------------------------------------------------------------------
  it("reveals immediately when IntersectionObserver is not available", () => {
    removeIntersectionObserverMock();

    const div = document.createElement("div");

    const { result } = renderHook(() => {
      const [ref, revealed] = useScrollReveal<HTMLDivElement>();
      (ref as React.MutableRefObject<HTMLDivElement | null>).current = div;
      return { ref, revealed };
    });

    expect(result.current.revealed).toBe(true);
  });

  // -----------------------------------------------------------------------
  // Additional edge cases
  // -----------------------------------------------------------------------
  it("stays revealed once set (one-shot behavior)", () => {
    const div = document.createElement("div");
    mockBelowViewport(div);

    const { result, rerender } = renderHook(() => {
      const [ref, revealed] = useScrollReveal<HTMLDivElement>();
      (ref as React.MutableRefObject<HTMLDivElement | null>).current = div;
      return { ref, revealed };
    });

    fireIntersection(true);
    expect(result.current.revealed).toBe(true);

    // Re-render should not reset revealed
    rerender();
    expect(result.current.revealed).toBe(true);
  });

  it("passes the threshold option to IntersectionObserver", () => {
    const div = document.createElement("div");
    mockBelowViewport(div);

    renderHook(() => {
      const [ref] = useScrollReveal<HTMLDivElement>(0.5);
      (ref as React.MutableRefObject<HTMLDivElement | null>).current = div;
      return null;
    });

    const MockIO = vi.mocked(IntersectionObserver);
    const lastCall = MockIO.mock.calls[MockIO.mock.calls.length - 1];
    expect(lastCall[1]).toEqual({ threshold: 0.5 });
  });
});
