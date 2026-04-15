import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTheme } from "./use-theme";

describe("useTheme", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    document.documentElement.style.cssText = "";
  });

  it("returns a themeId and theme object", () => {
    const { result } = renderHook(() => useTheme());

    expect(typeof result.current.themeId).toBe("string");
    expect(result.current.themeId.length).toBeGreaterThan(0);

    const { theme } = result.current;
    expect(theme).toHaveProperty("id");
    expect(theme).toHaveProperty("name");
    expect(theme).toHaveProperty("colorScheme");
    expect(theme).toHaveProperty("colors");
    expect(["light", "dark"]).toContain(theme.colorScheme);
  });

  it("setTheme applies CSS variables on :root", () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme("vscode-monokai");
    });

    expect(
      document.documentElement.style.getPropertyValue("--color-background"),
    ).toBe("#272822");
  });

  it("setTheme toggles .dark class for dark themes", () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme("vscode-monokai");
    });

    expect(document.documentElement.classList.contains("dark")).toBe(true);

    act(() => {
      result.current.setTheme("vscode-light-plus");
    });

    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("setTheme persists theme ID to localStorage", () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme("vscode-monokai");
    });

    expect(localStorage.getItem("pearl-theme")).toBe("vscode-monokai");
  });

  it("setTheme caches theme data to localStorage", () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme("vscode-monokai");
    });

    const raw = localStorage.getItem("pearl-theme-cache");
    expect(raw).not.toBeNull();

    const cached = JSON.parse(raw!);
    expect(cached).toHaveProperty("colorScheme");
    expect(cached).toHaveProperty("colors");
    expect(cached.colorScheme).toBe("dark");
  });

  it("stale theme ID falls back to system default", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: false,
    } as unknown as MediaQueryList);

    const { result } = renderHook(() => useTheme());

    // Setting a nonexistent theme exercises the fallback path in setTheme
    act(() => {
      result.current.setTheme("nonexistent-theme");
    });

    expect(result.current.themeId).not.toBe("nonexistent-theme");
    expect(typeof result.current.themeId).toBe("string");
    expect(result.current.theme.id).toBe(result.current.themeId);
  });

  it("setTheme with invalid ID falls back to default", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: false,
    } as unknown as MediaQueryList);

    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme("nonexistent");
    });

    expect(result.current.themeId).not.toBe("nonexistent");
    expect(result.current.theme.colorScheme).toBeDefined();
  });

  it("functions without localStorage (graceful degradation)", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("unavailable");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("unavailable");
    });

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBeDefined();
    expect(typeof result.current.themeId).toBe("string");

    // setTheme should not throw even when localStorage is broken
    act(() => {
      result.current.setTheme("vscode-monokai");
    });

    expect(result.current.theme).toBeDefined();
  });
});
