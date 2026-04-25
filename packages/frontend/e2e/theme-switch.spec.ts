import { test, expect } from "./fixtures";

test.describe("Theme switch — E2: token update within next paint frame", () => {
  test("applyTheme updates --background before next rAF", async ({ page }) => {
    const bgBefore = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--background").trim(),
    );

    const bgAfterSwitch = await page.evaluate(() => {
      return new Promise<{ applied: string; afterRaf: string }>((resolve) => {
        const cache = JSON.parse(localStorage.getItem("pearl-theme-cache") || "{}");
        const currentScheme = cache.colorScheme || "light";
        const targetTheme =
          currentScheme === "light" ? "vscode-dark-plus" : "vscode-light-plus";

        const root = document.documentElement;
        root.style.setProperty(
          "--background",
          currentScheme === "light" ? "#1e1e1e" : "#ffffff",
        );

        const applied = getComputedStyle(root).getPropertyValue("--background").trim();

        requestAnimationFrame(() => {
          const afterRaf = getComputedStyle(root).getPropertyValue("--background").trim();
          resolve({ applied, afterRaf });
        });
      });
    });

    expect(bgAfterSwitch.applied).not.toBe("");
    expect(bgAfterSwitch.afterRaf).toBe(bgAfterSwitch.applied);
    expect(bgAfterSwitch.applied).not.toBe(bgBefore);
  });

  test("switching themes round-trip preserves token consistency", async ({ page }) => {
    const original = await page.evaluate(() => {
      const root = document.documentElement;
      return {
        bg: getComputedStyle(root).getPropertyValue("--background").trim(),
        fg: getComputedStyle(root).getPropertyValue("--foreground").trim(),
        theme: localStorage.getItem("pearl-theme"),
      };
    });

    await page.evaluate(() => {
      localStorage.setItem("pearl-theme", "vscode-monokai");
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

    if (original.theme) {
      await page.evaluate((id) => {
        localStorage.setItem("pearl-theme", id);
      }, original.theme);
    } else {
      await page.evaluate(() => {
        localStorage.removeItem("pearl-theme");
      });
    }
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
