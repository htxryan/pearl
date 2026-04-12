import { test, expect, createTestIssue, deleteTestIssue } from "./fixtures";

test.describe("Command Palette", () => {
  test("opens with Cmd+K", async ({ seededPage: page }) => {
    await page.keyboard.press("Meta+k");

    // Command palette input should be visible
    const input = page.getByPlaceholder("Search issues or type a command...");
    await expect(input).toBeVisible({ timeout: 5_000 });
  });

  test("closes with Escape", async ({ seededPage: page }) => {
    await page.keyboard.press("Meta+k");
    const input = page.getByPlaceholder("Search issues or type a command...");
    await expect(input).toBeVisible({ timeout: 5_000 });

    await page.keyboard.press("Escape");
    await expect(input).not.toBeVisible({ timeout: 5_000 });
  });

  test("shows recent issues by default", async ({ seededPage: page }) => {
    await page.keyboard.press("Meta+k");
    const input = page.getByPlaceholder("Search issues or type a command...");
    await expect(input).toBeVisible({ timeout: 5_000 });

    // Should show "Recent issues" group heading
    await expect(page.getByText("Recent issues")).toBeVisible({ timeout: 5_000 });
  });

  test("shows navigation commands", async ({ seededPage: page }) => {
    await page.keyboard.press("Meta+k");
    await expect(page.getByPlaceholder("Search issues or type a command...")).toBeVisible({ timeout: 5_000 });

    // Should show navigation commands
    await expect(page.getByText("Go to List View")).toBeVisible();
    await expect(page.getByText("Go to Board View")).toBeVisible();
    await expect(page.getByText("Go to Graph View")).toBeVisible();
  });

  test("search filters issues", async ({ seededPage: page }) => {
    const title = `E2E-CmdSearch-${Date.now()}`;
    const issueId = await createTestIssue(page, { title });

    try {
      await page.keyboard.press("Meta+k");
      const input = page.getByPlaceholder("Search issues or type a command...");
      await expect(input).toBeVisible({ timeout: 5_000 });

      await input.fill(title);

      // Should show matching issue
      await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 });
    } finally {
      await deleteTestIssue(page, issueId);
    }
  });

  test("selecting an issue navigates to detail", async ({ seededPage: page }) => {
    const title = `E2E-CmdNav-${Date.now()}`;
    const issueId = await createTestIssue(page, { title });

    try {
      await page.keyboard.press("Meta+k");
      const input = page.getByPlaceholder("Search issues or type a command...");
      await expect(input).toBeVisible({ timeout: 5_000 });

      await input.fill(title);
      await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 });

      // Click the issue item
      await page.getByText(title).click();

      // Should navigate to detail view
      await page.waitForURL(`**/issues/${issueId}`, { timeout: 10_000 });
    } finally {
      await deleteTestIssue(page, issueId);
    }
  });

  test("navigate command: Go to Board View", async ({ seededPage: page }) => {
    await page.keyboard.press("Meta+k");
    await expect(page.getByPlaceholder("Search issues or type a command...")).toBeVisible({ timeout: 5_000 });

    await page.getByText("Go to Board View").click();
    await page.waitForURL("**/board");
  });
});
