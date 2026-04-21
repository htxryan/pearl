import { expect, test } from "./fixtures";

/** Platform-aware shortcut for opening the command palette. */
const CMD_K = process.platform === "darwin" ? "Meta+k" : "Control+k";

test.describe("Command Palette", () => {
  test("opens with Cmd+K", async ({ seededPage: page }) => {
    // Wait for app to be fully settled before triggering keyboard shortcut
    await page.waitForLoadState("networkidle");
    await page.keyboard.press(CMD_K);
    const input = page.getByPlaceholder("Search issues or type > for commands...");
    await expect(input).toBeVisible({ timeout: 5_000 });
  });

  test("closes with Escape", async ({ seededPage: page }) => {
    // Ensure page is fully settled before triggering keyboard shortcut
    await page.waitForLoadState("networkidle");
    await page.keyboard.press(CMD_K);
    const input = page.getByPlaceholder("Search issues or type > for commands...");
    await expect(input).toBeVisible({ timeout: 5_000 });

    await page.keyboard.press("Escape");
    await expect(input).not.toBeVisible({ timeout: 5_000 });
  });

  test("shows recent issues by default", async ({ seededPage: page }) => {
    await page.waitForLoadState("networkidle");
    await page.keyboard.press(CMD_K);
    await expect(page.getByPlaceholder("Search issues or type > for commands...")).toBeVisible({
      timeout: 5_000,
    });

    await expect(page.getByText("Recent issues")).toBeVisible({ timeout: 5_000 });
  });

  test("shows navigation commands", async ({ seededPage: page }) => {
    await page.waitForLoadState("networkidle");
    await page.keyboard.press(CMD_K);
    await expect(page.getByPlaceholder("Search issues or type > for commands...")).toBeVisible({
      timeout: 5_000,
    });

    await expect(page.getByText("Go to List View")).toBeVisible();
    await expect(page.getByText("Go to Board View")).toBeVisible();
    await expect(page.getByText("Go to Graph View")).toBeVisible();
  });

  test("search filters issues by query", async ({ seededPage: page }) => {
    // Wait for app to be fully settled before triggering keyboard shortcut
    await page.waitForLoadState("networkidle");
    await page.keyboard.press(CMD_K);
    const input = page.getByPlaceholder("Search issues or type > for commands...");
    await expect(input).toBeVisible({ timeout: 5_000 });

    await input.fill("dashboard");

    // Should show "Issues matching" heading
    await expect(page.getByText(/issues matching/i)).toBeVisible({ timeout: 10_000 });
  });

  test("selecting an issue navigates to detail", async ({ seededPage: page }) => {
    await page.waitForLoadState("networkidle");
    await page.keyboard.press(CMD_K);
    const input = page.getByPlaceholder("Search issues or type > for commands...");
    await expect(input).toBeVisible({ timeout: 5_000 });

    // Wait for recent issues to load
    await expect(page.getByText("Recent issues")).toBeVisible({ timeout: 5_000 });

    // Click the first cmdk item
    const firstItem = page.locator("[cmdk-item]").first();
    await firstItem.click();

    await page.waitForURL("**/issues/**", { timeout: 10_000 });
  });

  test("navigate command: Go to Board View", async ({ seededPage: page }) => {
    await page.waitForLoadState("networkidle");
    await page.keyboard.press(CMD_K);
    await expect(page.getByPlaceholder("Search issues or type > for commands...")).toBeVisible({
      timeout: 5_000,
    });

    await page.getByText("Go to Board View").click();
    await page.waitForURL("**/board");
  });

  test("navigate command: Go to Graph View", async ({ seededPage: page }) => {
    await page.waitForLoadState("networkidle");
    await page.keyboard.press(CMD_K);
    await expect(page.getByPlaceholder("Search issues or type > for commands...")).toBeVisible({
      timeout: 5_000,
    });

    await page.getByText("Go to Graph View").click();
    await page.waitForURL("**/graph");
  });
});
