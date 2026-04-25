import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NavListProvider, useNavList, useSetNavList } from "./use-nav-list";

function makeWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <NavListProvider>{children}</NavListProvider>;
  };
}

describe("useNavList", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });
  afterEach(() => {
    sessionStorage.clear();
  });

  it("getNext returns the id immediately after currentId", () => {
    const { result } = renderHook(() => useNavList(), { wrapper: makeWrapper() });
    act(() => {
      result.current.setIds(["a", "b", "c"]);
    });
    expect(result.current.getNext("a")).toBe("b");
    expect(result.current.getNext("b")).toBe("c");
  });

  it("getNext returns null at the end of the list", () => {
    const { result } = renderHook(() => useNavList(), { wrapper: makeWrapper() });
    act(() => {
      result.current.setIds(["a", "b", "c"]);
    });
    expect(result.current.getNext("c")).toBeNull();
  });

  it("getPrev returns the id immediately before currentId", () => {
    const { result } = renderHook(() => useNavList(), { wrapper: makeWrapper() });
    act(() => {
      result.current.setIds(["a", "b", "c"]);
    });
    expect(result.current.getPrev("c")).toBe("b");
    expect(result.current.getPrev("b")).toBe("a");
  });

  it("getPrev returns null at the start of the list", () => {
    const { result } = renderHook(() => useNavList(), { wrapper: makeWrapper() });
    act(() => {
      result.current.setIds(["a", "b", "c"]);
    });
    expect(result.current.getPrev("a")).toBeNull();
  });

  it("getNext/getPrev return null when the id is not in the list", () => {
    const { result } = renderHook(() => useNavList(), { wrapper: makeWrapper() });
    act(() => {
      result.current.setIds(["a", "b", "c"]);
    });
    expect(result.current.getNext("zzz")).toBeNull();
    expect(result.current.getPrev("zzz")).toBeNull();
  });

  it("getNext/getPrev return null for null currentId", () => {
    const { result } = renderHook(() => useNavList(), { wrapper: makeWrapper() });
    act(() => {
      result.current.setIds(["a", "b", "c"]);
    });
    expect(result.current.getNext(null)).toBeNull();
    expect(result.current.getPrev(null)).toBeNull();
  });

  it("getNext/getPrev return null when the list is empty", () => {
    const { result } = renderHook(() => useNavList(), { wrapper: makeWrapper() });
    expect(result.current.getNext("a")).toBeNull();
    expect(result.current.getPrev("a")).toBeNull();
  });

  it("setIds replaces the previous list", () => {
    const { result } = renderHook(() => useNavList(), { wrapper: makeWrapper() });
    act(() => {
      result.current.setIds(["a", "b", "c"]);
    });
    expect(result.current.getNext("a")).toBe("b");
    act(() => {
      result.current.setIds(["x", "y", "z"]);
    });
    expect(result.current.getNext("a")).toBeNull();
    expect(result.current.getNext("x")).toBe("y");
  });

  it("persists ids to sessionStorage so the full-page detail route can navigate", () => {
    const { result, unmount } = renderHook(() => useNavList(), { wrapper: makeWrapper() });
    act(() => {
      result.current.setIds(["one", "two", "three"]);
    });
    unmount();
    // New provider instance — should restore from sessionStorage.
    const { result: result2 } = renderHook(() => useNavList(), { wrapper: makeWrapper() });
    expect(result2.current.getNext("one")).toBe("two");
    expect(result2.current.getPrev("three")).toBe("two");
  });

  it("returns a no-op fallback when no provider is mounted", () => {
    const { result } = renderHook(() => useNavList());
    // Should not throw
    expect(() => result.current.setIds(["a", "b"])).not.toThrow();
    expect(result.current.getNext("a")).toBeNull();
    expect(result.current.getPrev("a")).toBeNull();
  });
});

describe("useSetNavList", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });
  afterEach(() => {
    sessionStorage.clear();
  });

  it("populates the nav list and updates getNext/getPrev", () => {
    function Combined() {
      useSetNavList(["a", "b", "c"]);
      return useNavList();
    }
    const { result } = renderHook(() => Combined(), { wrapper: makeWrapper() });
    expect(result.current.getNext("a")).toBe("b");
    expect(result.current.getPrev("c")).toBe("b");
  });

  it("is safe to call without a provider (no-op)", () => {
    function Combined() {
      useSetNavList(["a", "b"]);
      return null;
    }
    expect(() => renderHook(() => Combined())).not.toThrow();
  });
});
