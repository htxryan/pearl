import { expect, test } from "./fixtures";

/** Platform-aware shortcut for opening the command palette (navigation commands). */
const CMD_K = process.platform === "darwin" ? "Meta+k" : "Control+k";
/** Platform-aware shortcut for opening the issue search palette. */
const CMD_F = process.platform === "darwin" ? "Meta+f" : "Control+f";

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
  }

  test("opens via header search button", async ({ seededPage: page }) => {
    await openSearchPalette(page);
    const input = page.getByPlaceholder("Search issues...");
    await expect(input).toBeVisible({ timeout: 5_000 });
  });

  test("closes with Escape", async ({ seededPage: page }) => {
    await openSearchPalette(page);
    const input = page.getByPlaceholder("Search issues...");
    await expect(input).toBeVisible({ timeout: 5_000 });

    await page.keyboard.press("Escape");
    await expect(input).not.toBeVisible({ timeout: 5_000 });
  });

  test("shows recent issues by default", async ({ seededPage: page }) => {
    await openSearchPalette(page);
    await expect(page.getByPlaceholder("Search issues...")).toBeVisible({ timeout: 5_000 });

    await expect(page.getByText("Recent issues")).toBeVisible({ timeout: 5_000 });
  });

  test("search filters issues by query", async ({ seededPage: page }) => {
    await openSearchPalette(page);
    const input = page.getByPlaceholder("Search issues...");
    await expect(input).toBeVisible({ timeout: 5_000 });

    await input.fill("dashboard");

    await expect(page.getByText(/issues matching/i)).toBeVisible({ timeout: 10_000 });
  });

  test("selecting an issue navigates to detail", async ({ seededPage: page }) => {
    await openSearchPalette(page);
    const input = page.getByPlaceholder("Search issues...");
    await expect(input).toBeVisible({ timeout: 5_000 });

    await expect(page.getByText("Recent issues")).toBeVisible({ timeout: 5_000 });

    const firstItem = page.locator("[cmdk-item]").first();
    await firstItem.click();

    await page.waitForURL("**/issues/**", { timeout: 10_000 });
  });
});
