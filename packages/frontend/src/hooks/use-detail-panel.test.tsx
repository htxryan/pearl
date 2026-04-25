import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DetailPanelProvider, useDetailPanel } from "./use-detail-panel";

function makeWrapper(initialEntries: string[]) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={initialEntries}>
        <DetailPanelProvider>
          <Routes>
            <Route path="*" element={<>{children}</>} />
          </Routes>
        </DetailPanelProvider>
      </MemoryRouter>
    );
  };
}

function useDetailPanelWithLocation() {
  const panel = useDetailPanel();
  const location = useLocation();
  return { ...panel, location };
}

describe("useDetailPanel — URL reflection", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
  });

  it("reads openIssueId from ?item= query param on mount", () => {
    const { result } = renderHook(() => useDetailPanel(), {
      wrapper: makeWrapper(["/list?item=beads-abc"]),
    });
    expect(result.current.openIssueId).toBe("beads-abc");
  });

  it("openIssueId is null when ?item= absent", () => {
    const { result } = renderHook(() => useDetailPanel(), {
      wrapper: makeWrapper(["/list"]),
    });
    expect(result.current.openIssueId).toBeNull();
  });

  it("openDetail writes ?item= to the URL", () => {
    const { result } = renderHook(() => useDetailPanelWithLocation(), {
      wrapper: makeWrapper(["/list"]),
    });
    expect(result.current.openIssueId).toBeNull();
    act(() => {
      result.current.openDetail("beads-foo");
    });
    expect(result.current.openIssueId).toBe("beads-foo");
    expect(result.current.location.search).toBe("?item=beads-foo");
  });

  it("openDetail preserves other existing query params (filters)", () => {
    const { result } = renderHook(() => useDetailPanelWithLocation(), {
      wrapper: makeWrapper(["/list?status=open&priority=1"]),
    });
    act(() => {
      result.current.openDetail("beads-foo");
    });
    const params = new URLSearchParams(result.current.location.search);
    expect(params.get("item")).toBe("beads-foo");
    expect(params.get("status")).toBe("open");
    expect(params.get("priority")).toBe("1");
  });

  it("closeDetail removes the ?item= param but keeps other params", () => {
    const { result } = renderHook(() => useDetailPanelWithLocation(), {
      wrapper: makeWrapper(["/list?status=open&item=beads-foo"]),
    });
    expect(result.current.openIssueId).toBe("beads-foo");
    act(() => {
      result.current.closeDetail();
    });
    expect(result.current.openIssueId).toBeNull();
    const params = new URLSearchParams(result.current.location.search);
    expect(params.has("item")).toBe(false);
    expect(params.get("status")).toBe("open");
  });

  it("openDetail with the same id is a no-op", () => {
    const { result } = renderHook(() => useDetailPanelWithLocation(), {
      wrapper: makeWrapper(["/list?item=beads-foo"]),
    });
    const initialSearch = result.current.location.search;
    act(() => {
      result.current.openDetail("beads-foo");
    });
    expect(result.current.location.search).toBe(initialSearch);
  });

  it("switching items updates the ?item= param", () => {
    const { result } = renderHook(() => useDetailPanelWithLocation(), {
      wrapper: makeWrapper(["/list?item=beads-a"]),
    });
    act(() => {
      result.current.openDetail("beads-b");
    });
    expect(result.current.openIssueId).toBe("beads-b");
    expect(new URLSearchParams(result.current.location.search).get("item")).toBe("beads-b");
  });

  it("close guard cancels openDetail when guard returns false", () => {
    const { result } = renderHook(() => useDetailPanelWithLocation(), {
      wrapper: makeWrapper(["/list?item=beads-a"]),
    });
    act(() => {
      result.current.setCloseGuard(() => false);
    });
    act(() => {
      result.current.openDetail("beads-b");
    });
    // Guard blocked the switch — id stays as beads-a
    expect(result.current.openIssueId).toBe("beads-a");
  });

  it("close guard cancels closeDetail via guardedClose", () => {
    const { result } = renderHook(() => useDetailPanelWithLocation(), {
      wrapper: makeWrapper(["/list?item=beads-a"]),
    });
    act(() => {
      result.current.setCloseGuard(() => false);
    });
    let closed = true;
    act(() => {
      closed = result.current.guardedClose();
    });
    expect(closed).toBe(false);
    expect(result.current.openIssueId).toBe("beads-a");
  });
});
