import { test, expect } from "./fixtures";

test.describe("Keyboard Shortcuts", () => {
  test("? opens keyboard shortcuts overlay", async ({ seededPage: page }) => {
    await page.keyboard.press("Shift+?");

    // Overlay should appear with title
    await expect(page.getByText("Keyboard Shortcuts")).toBeVisible({ timeout: 5_000 });

    // Should show shortcut groups
    await expect(page.getByText("Global")).toBeVisible();
    await expect(page.getByText("List View")).toBeVisible();
  });

  test("keyboard help overlay shows all shortcut groups", async ({ seededPage: page }) => {
    await page.keyboard.press("Shift+?");
    await expect(page.getByText("Keyboard Shortcuts")).toBeVisible({ timeout: 5_000 });

    // Verify shortcut groups
    await expect(page.getByText("Global")).toBeVisible();
    await expect(page.getByText("List View")).toBeVisible();
    await expect(page.getByText("Board View")).toBeVisible();
    await expect(page.getByText("Detail View")).toBeVisible();
  });

  test("keyboard help overlay closes via close button", async ({ seededPage: page }) => {
    await page.keyboard.press("Shift+?");
    await expect(page.getByText("Keyboard Shortcuts")).toBeVisible({ timeout: 5_000 });

    // Close via the close button (×)
    const closeBtn = page.getByLabel("Close");
    await closeBtn.click();

    await expect(page.getByText("Keyboard Shortcuts")).not.toBeVisible({ timeout: 5_000 });
  });

  test("keyboard help overlay closes via Escape", async ({ seededPage: page }) => {
    await page.keyboard.press("Shift+?");
    await expect(page.getByText("Keyboard Shortcuts")).toBeVisible({ timeout: 5_000 });

    await page.keyboard.press("Escape");
    await expect(page.getByText("Keyboard Shortcuts")).not.toBeVisible({ timeout: 5_000 });
  });

  test("pressing 1 navigates to list view", async ({ seededPage: page }) => {
    // Navigate away first
    await page.goto("/board");
    await expect(page.getByRole("region", { name: "Kanban board" })).toBeVisible({ timeout: 15_000 });

    await page.keyboard.press("1");
    await page.waitForURL("**/list");
  });

  test("pressing 2 navigates to board view", async ({ seededPage: page }) => {
    await page.keyboard.press("2");
    await page.waitForURL("**/board");
  });

  test("pressing 3 navigates to graph view", async ({ seededPage: page }) => {
    await page.keyboard.press("3");
    await page.waitForURL("**/graph");
  });

  test("/ focuses search input in list view", async ({ seededPage: page }) => {
    await page.keyboard.press("/");

    // Search input should be focused
    const searchInput = page.getByPlaceholder(/search/i).first();
    await expect(searchInput).toBeFocused({ timeout: 3_000 });
  });
});
