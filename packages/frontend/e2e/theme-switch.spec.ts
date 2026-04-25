import { test, expect } from "./fixtures";

test.describe("Theme switch — token update within next paint frame", () => {
  test("applyTheme updates --background synchronously before next rAF", async ({ page }) => {
    const bgBefore = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--background").trim(),
    );

    const result = await page.evaluate(() => {
      return new Promise<{ applied: string; afterRaf: string }>((resolve) => {
        (window as any).__pearlSetTheme("vscode-monokai");

        const root = document.documentElement;
        const applied = getComputedStyle(root).getPropertyValue("--background").trim();

        requestAnimationFrame(() => {
          const afterRaf = getComputedStyle(root).getPropertyValue("--background").trim();
          resolve({ applied, afterRaf });
        });
      });
    });

    expect(result.applied).not.toBe("");
    expect(result.afterRaf).toBe(result.applied);
    expect(result.applied).not.toBe(bgBefore);
  });

  test("SPA theme switch updates tokens without page reload", async ({ page }) => {
    const original = await page.evaluate(() => {
      const root = document.documentElement;
      return {
        bg: getComputedStyle(root).getPropertyValue("--background").trim(),
        fg: getComputedStyle(root).getPropertyValue("--foreground").trim(),
        theme: localStorage.getItem("pearl-theme"),
      };
    });

    await page.evaluate(() => {
      (window as any).__pearlSetTheme("vscode-monokai");
    });

    const monokai = await page.evaluate(() => {
      const root = document.documentElement;
      return {
        bg: getComputedStyle(root).getPropertyValue("--background").trim(),
        fg: getComputedStyle(root).getPropertyValue("--foreground").trim(),
        theme: localStorage.getItem("pearl-theme"),
      };
    });

    expect(monokai.bg).not.toBe(original.bg);
    expect(monokai.theme).toBe("vscode-monokai");

    const restoreTheme = original.theme ?? "vscode-light-plus";
    await page.evaluate((id) => {
      (window as any).__pearlSetTheme(id);
    }, restoreTheme);

    const restored = await page.evaluate(() => {
      const root = document.documentElement;
      return {
        bg: getComputedStyle(root).getPropertyValue("--background").trim(),
        fg: getComputedStyle(root).getPropertyValue("--foreground").trim(),
      };
    });

    expect(restored.bg).toBe(original.bg);
    expect(restored.fg).toBe(original.fg);
  });

  test("theme persists across page reload", async ({ page }) => {
    const original = await page.evaluate(() => {
      const root = document.documentElement;
      return {
        bg: getComputedStyle(root).getPropertyValue("--background").trim(),
        fg: getComputedStyle(root).getPropertyValue("--foreground").trim(),
        theme: localStorage.getItem("pearl-theme"),
      };
    });

    await page.evaluate(() => {
      (window as any).__pearlSetTheme("vscode-monokai");
    });
    await page.reload();
    await page.waitForSelector('[data-testid="primitive-showcase"]');

    const monokai = await page.evaluate(() => {
      const root = document.documentElement;
      return {
        bg: getComputedStyle(root).getPropertyValue("--background").trim(),
        fg: getComputedStyle(root).getPropertyValue("--foreground").trim(),
      };
    });

    expect(monokai.bg).not.toBe(original.bg);

    const restoreTheme = original.theme ?? "vscode-light-plus";
    await page.evaluate((id) => {
      (window as any).__pearlSetTheme(id);
    }, restoreTheme);
    await page.reload();
    await page.waitForSelector('[data-testid="primitive-showcase"]');

    const restored = await page.evaluate(() => {
      const root = document.documentElement;
      return {
        bg: getComputedStyle(root).getPropertyValue("--background").trim(),
        fg: getComputedStyle(root).getPropertyValue("--foreground").trim(),
      };
    });

    expect(restored.bg).toBe(original.bg);
    expect(restored.fg).toBe(original.fg);
  });
});
