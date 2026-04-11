import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTheme } from "./use-theme";

describe("useTheme", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  it("should return a theme value", () => {
    const { result } = renderHook(() => useTheme());
    expect(["light", "dark"]).toContain(result.current.theme);
  });

  it("should toggle theme", () => {
    const { result } = renderHook(() => useTheme());
    const initial = result.current.theme;

    act(() => {
      result.current.toggleTheme();
    });

    const toggled = result.current.theme;
    expect(toggled).not.toBe(initial);
  });

  it("should persist theme to localStorage", () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme("dark");
    });

    expect(localStorage.getItem("beads-gui-theme")).toBe("dark");
  });

  it("should apply dark class to document", () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme("dark");
    });

    expect(document.documentElement.classList.contains("dark")).toBe(true);

    act(() => {
      result.current.setTheme("light");
    });

    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
