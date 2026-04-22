import { expect, test } from "./fixtures";

/** Platform-aware shortcut for opening the command palette (navigation commands). */
const CMD_K = process.platform === "darwin" ? "Meta+k" : "Control+k";
/**
 * Keyboard shortcut for the search palette. Uses Shift to avoid Chromium's
 * native Ctrl+F find-in-page dialog intercepting the event on Linux/Windows.
 */
const CMD_SHIFT_F = process.platform === "darwin" ? "Meta+Shift+f" : "Control+Shift+f";

test.describe("Command Palette", () => {
  test("opens with Cmd+K", async ({ seededPage: page }) => {
    await page.waitForLoadState("networkidle");
    await page.keyboard.press(CMD_K);
    const input = page.getByPlaceholder("Type a command...");
    await expect(input).toBeVisible({ timeout: 5_000 });
  });

  test("closes with Escape", async ({ seededPage: page }) => {
    await page.waitForLoadState("networkidle");
    await page.keyboard.press(CMD_K);
    const input = page.getByPlaceholder("Type a command...");
    await expect(input).toBeVisible({ timeout: 5_000 });

    await page.keyboard.press("Escape");
    await expect(input).not.toBeVisible({ timeout: 5_000 });
  });

  test("shows navigation commands", async ({ seededPage: page }) => {
    await page.waitForLoadState("networkidle");
    await page.keyboard.press(CMD_K);
    await expect(page.getByPlaceholder("Type a command...")).toBeVisible({ timeout: 5_000 });

    await expect(page.getByText("Go to List View")).toBeVisible();
    await expect(page.getByText("Go to Board View")).toBeVisible();
    await expect(page.getByText("Go to Graph View")).toBeVisible();
  });

  test("navigate command: Go to Board View", async ({ seededPage: page }) => {
    await page.waitForLoadState("networkidle");
    await page.keyboard.press(CMD_K);
    await expect(page.getByPlaceholder("Type a command...")).toBeVisible({ timeout: 5_000 });

    await page.getByText("Go to Board View").click();
    await page.waitForURL("**/board");
  });

  test("navigate command: Go to Graph View", async ({ seededPage: page }) => {
    await page.waitForLoadState("networkidle");
    await page.keyboard.press(CMD_K);
    await expect(page.getByPlaceholder("Type a command...")).toBeVisible({ timeout: 5_000 });

    await page.getByText("Go to Graph View").click();
    await page.waitForURL("**/graph");
  });
});

test.describe("Search Palette", () => {
  // Ctrl+F / Cmd+F is intercepted by Chromium's native Find dialog in CI, so we
  // open the search palette via the header button instead of the keyboard shortcut.
  async function openSearchPalette(page: Parameters<typeof test>[1]) {
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Open search" }).click();
    // Wait for the palette dialog to appear before returning
    await expect(page.getByRole("dialog", { name: "Search issues" })).toBeVisible({
      timeout: 5_000,
    });
  }

  /** The search palette dialog — scopes all locators away from the filter-bar input. */
  function searchDialog(page: Parameters<typeof test>[1]) {
    return page.getByRole("dialog", { name: "Search issues" });
  }

  test("opens via header search button", async ({ seededPage: page }) => {
    await openSearchPalette(page);
    const input = searchDialog(page).getByPlaceholder("Search issues...");
    await expect(input).toBeVisible({ timeout: 5_000 });
  });

  test("opens with Cmd+Shift+F shortcut", async ({ seededPage: page }) => {
    await page.waitForLoadState("networkidle");
    await page.keyboard.press(CMD_SHIFT_F);
    await expect(searchDialog(page)).toBeVisible({ timeout: 5_000 });
  });

  test("closes with Escape", async ({ seededPage: page }) => {
    await openSearchPalette(page);
    const dialog = searchDialog(page);
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible({ timeout: 5_000 });
  });

  test("shows recent issues by default", async ({ seededPage: page }) => {
    await openSearchPalette(page);
    const dialog = searchDialog(page);

    await expect(dialog.getByText("Recent issues")).toBeVisible({ timeout: 5_000 });
  });

  test("search filters issues by query", async ({ seededPage: page }) => {
    await openSearchPalette(page);
    const dialog = searchDialog(page);
    const input = dialog.getByPlaceholder("Search issues...");

    await input.fill("dashboard");

    await expect(dialog.getByText(/issues matching/i)).toBeVisible({ timeout: 10_000 });
  });

  test("selecting an issue navigates to detail", async ({ seededPage: page }) => {
    await openSearchPalette(page);
    const dialog = searchDialog(page);

    await expect(dialog.getByText("Recent issues")).toBeVisible({ timeout: 5_000 });

    const firstItem = dialog.locator("[cmdk-item]").first();
    await firstItem.click();

    await page.waitForURL("**/issues/**", { timeout: 10_000 });
  });
});
