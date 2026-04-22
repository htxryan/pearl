import { renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockNavigate = vi.fn();
vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return { ...actual, useNavigate: () => mockNavigate };
});

import { useViewNavigate } from "./use-view-navigate";

function wrapper(initialEntry: string) {
  return ({ children }: { children: ReactNode }) =>
    createElement(MemoryRouter, { initialEntries: [initialEntry] }, children);
}

describe("useViewNavigate", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it("navigates to view path without params when URL has no search params", () => {
    const { result } = renderHook(() => useViewNavigate(), {
      wrapper: wrapper("/list"),
    });
    result.current("/board");
    expect(mockNavigate).toHaveBeenCalledWith("/board");
  });

  it("carries search params when navigating between view paths", () => {
    const { result } = renderHook(() => useViewNavigate(), {
      wrapper: wrapper("/list?status=open&priority=0,1"),
    });
    result.current("/board");
    expect(mockNavigate).toHaveBeenCalledWith("/board?status=open&priority=0%2C1");
  });

  it("does not carry params for non-view paths like /settings", () => {
    const { result } = renderHook(() => useViewNavigate(), {
      wrapper: wrapper("/list?status=open&priority=0"),
    });
    result.current("/settings");
    expect(mockNavigate).toHaveBeenCalledWith("/settings");
  });

  it("carries all filter params including sorting", () => {
    const { result } = renderHook(() => useViewNavigate(), {
      wrapper: wrapper("/list?status=blocked&sort=created_at&dir=desc"),
    });
    result.current("/graph");
    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining("/graph?"));
    const call = mockNavigate.mock.calls[0][0] as string;
    const params = new URLSearchParams(call.split("?")[1]);
    expect(params.get("status")).toBe("blocked");
    expect(params.get("sort")).toBe("created_at");
    expect(params.get("dir")).toBe("desc");
  });
});
