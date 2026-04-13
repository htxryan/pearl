import { test, expect } from "./fixtures";

test.describe("Dark Mode", () => {
  test("selecting a dark theme via settings applies .dark class", async ({ seededPage: page }) => {
    await page.goto("/settings");
    const themePicker = page.getByRole("group", { name: "Available themes" });
    await expect(themePicker).toBeVisible({ timeout: 15_000 });

    // Select a known dark theme (Monokai)
    const monokaiBtn = page.getByRole("button", { name: /monokai theme/i }).first();
    await monokaiBtn.click();

    const htmlElement = page.locator("html");
    await expect(htmlElement).toHaveClass(/dark/, { timeout: 3_000 });

    // Switch to a light theme (Light+ Default Light)
    const lightBtn = page.getByRole("button", { name: /Light\+.*theme/i });
    await lightBtn.click();

    await expect(htmlElement).not.toHaveClass(/dark/, { timeout: 3_000 });
  });

  test("theme persists after reload", async ({ seededPage: page }) => {
    // Switch to Monokai (dark) via settings
    await page.goto("/settings");
    const themePicker = page.getByRole("group", { name: "Available themes" });
    await expect(themePicker).toBeVisible({ timeout: 15_000 });

    const monokaiBtn = page.getByRole("button", { name: /monokai theme/i }).first();
    await monokaiBtn.click();
    await expect(page.locator("html")).toHaveClass(/dark/, { timeout: 3_000 });

    // Reload the page
    await page.reload();
    await expect(themePicker).toBeVisible({ timeout: 15_000 });

    // Verify Monokai is still active (aria-pressed)
    const monokaiAfter = page.getByRole("button", { name: /monokai theme \(active\)/i }).first();
    await expect(monokaiAfter).toBeVisible({ timeout: 5_000 });
    await expect(page.locator("html")).toHaveClass(/dark/);
  });
});
