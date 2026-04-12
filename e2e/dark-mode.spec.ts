import { test, expect } from "./fixtures";

test.describe("Dark Mode", () => {
  test("toggle theme button switches between light and dark", async ({ seededPage: page }) => {
    const toggleBtn = page.getByLabel("Toggle theme");
    await expect(toggleBtn).toBeVisible();

    // Get the initial state of the html element
    const htmlElement = page.locator("html");
    const initialClass = await htmlElement.getAttribute("class") ?? "";
    const startsAsDark = initialClass.includes("dark");

    // Click toggle
    await toggleBtn.click();

    // Class should change
    if (startsAsDark) {
      await expect(htmlElement).not.toHaveClass(/dark/, { timeout: 3_000 });
    } else {
      await expect(htmlElement).toHaveClass(/dark/, { timeout: 3_000 });
    }

    // Click again to revert
    await toggleBtn.click();
    if (startsAsDark) {
      await expect(htmlElement).toHaveClass(/dark/, { timeout: 3_000 });
    } else {
      await expect(htmlElement).not.toHaveClass(/dark/, { timeout: 3_000 });
    }
  });

  test("theme persists after reload", async ({ seededPage: page }) => {
    const toggleBtn = page.getByLabel("Toggle theme");

    // Toggle to dark mode
    await toggleBtn.click();
    const htmlClass = await page.locator("html").getAttribute("class") ?? "";
    const isDarkAfterToggle = htmlClass.includes("dark");

    // Reload the page
    await page.reload();
    await expect(page.getByLabel("Issue list")).toBeVisible({ timeout: 15_000 });

    // Check that the class persisted
    const htmlClassAfter = await page.locator("html").getAttribute("class") ?? "";
    const isDarkAfterReload = htmlClassAfter.includes("dark");
    expect(isDarkAfterReload).toBe(isDarkAfterToggle);
  });
});
