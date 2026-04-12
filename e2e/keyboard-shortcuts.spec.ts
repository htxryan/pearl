import { test, expect } from "./fixtures";

/**
 * Helper: trigger the ? keyboard shortcut for keyboard help overlay.
 * Playwright's keyboard.press("Shift+/") doesn't produce key="?" consistently,
 * so we dispatch the event directly.
 */
async function pressQuestionMark(page: import("@playwright/test").Page) {
  await page.evaluate(() => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "?",
        code: "Slash",
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
  });
}

test.describe("Keyboard Shortcuts", () => {
  test("? opens keyboard shortcuts overlay", async ({ seededPage: page }) => {
    await pressQuestionMark(page);

    await expect(page.getByRole("heading", { name: "Keyboard Shortcuts" })).toBeVisible({ timeout: 5_000 });
  });

  test("keyboard help overlay shows shortcut groups", async ({ seededPage: page }) => {
    await pressQuestionMark(page);
    await expect(page.getByRole("heading", { name: "Keyboard Shortcuts" })).toBeVisible({ timeout: 5_000 });

    await expect(page.getByRole("heading", { name: "Global" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "List View" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Board View" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Detail View" })).toBeVisible();
  });

  test("keyboard help closes via close button", async ({ seededPage: page }) => {
    await pressQuestionMark(page);
    await expect(page.getByRole("heading", { name: "Keyboard Shortcuts" })).toBeVisible({ timeout: 5_000 });

    await page.getByLabel("Close").click();
    await expect(page.getByRole("heading", { name: "Keyboard Shortcuts" })).not.toBeVisible({ timeout: 5_000 });
  });

  test("keyboard help closes via backdrop click", async ({ seededPage: page }) => {
    await pressQuestionMark(page);
    await expect(page.getByRole("heading", { name: "Keyboard Shortcuts" })).toBeVisible({ timeout: 5_000 });

    // Click the backdrop at a position that doesn't overlap the modal
    // The modal is centered and max-w-lg (~512px), so clicking at (10, 10) hits the backdrop
    await page.mouse.click(10, 10);
    await expect(page.getByRole("heading", { name: "Keyboard Shortcuts" })).not.toBeVisible({ timeout: 5_000 });
  });

  test("pressing 1 navigates to list view", async ({ seededPage: page }) => {
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
    const searchInput = page.getByPlaceholder(/search/i).first();
    await expect(searchInput).toBeFocused({ timeout: 3_000 });
  });
});
