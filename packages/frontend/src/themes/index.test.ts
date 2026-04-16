import { beforeEach, describe, expect, it, vi } from "vitest";
import { COLOR_TOKENS, getAllThemes, getDefaultTheme, getTheme } from "./index";

describe("Theme Registry", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("getAllThemes returns all 15 themes", () => {
    expect(getAllThemes()).toHaveLength(15);
  });

  it("each theme has all 21 color tokens", () => {
    const themes = getAllThemes();
    for (const theme of themes) {
      for (const token of COLOR_TOKENS) {
        expect(
          theme.colors[token],
          `Theme "${theme.name}" is missing color token: ${token}`,
        ).toBeDefined();
      }
    }
  });

  it("getTheme returns correct theme by ID", () => {
    expect(getTheme("vscode-monokai")?.name).toBe("Monokai");
  });

  it("getTheme returns undefined for unknown ID", () => {
    expect(getTheme("nonexistent")).toBeUndefined();
  });

  it("getDefaultTheme returns Dark+ when system prefers dark", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: true,
    } as MediaQueryList);
    expect(getDefaultTheme().id).toBe("vscode-dark-plus");
  });

  it("getDefaultTheme returns Light+ when system prefers light", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: false,
    } as MediaQueryList);
    expect(getDefaultTheme().id).toBe("vscode-light-plus");
  });

  it("Light+ colors match expected defaults", () => {
    const lightPlus = getTheme("vscode-light-plus");
    expect(lightPlus).toBeDefined();
    expect(lightPlus!.colors.background).toBe("#ffffff");
    expect(lightPlus!.colors.foreground).toBe("#0a0a0a");
  });

  it("Dark+ colors match expected defaults", () => {
    const darkPlus = getTheme("vscode-dark-plus");
    expect(darkPlus).toBeDefined();
    expect(darkPlus!.colors.background).toBe("#111113");
    expect(darkPlus!.colors.foreground).toBe("#ececef");
  });

  it("all theme IDs are unique", () => {
    const themes = getAllThemes();
    const ids = themes.map((t) => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("each theme has valid colorScheme", () => {
    const themes = getAllThemes();
    for (const theme of themes) {
      expect(
        ["light", "dark"],
        `Theme "${theme.name}" has invalid colorScheme: ${theme.colorScheme}`,
      ).toContain(theme.colorScheme);
    }
  });
});
