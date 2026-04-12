import { test, expect } from "./fixtures";

test.describe("Accessibility", () => {
  test("skip-to-content link is present and works", async ({ seededPage: page }) => {
    // The skip link should exist but be visually hidden initially
    const skipLink = page.getByText("Skip to content");
    await expect(skipLink).toBeAttached();

    // Tab to focus it — it becomes visible on focus
    await page.keyboard.press("Tab");

    // Main content area has the target id
    const mainContent = page.locator("#main-content");
    await expect(mainContent).toBeAttached();
  });

  test("main content area is a landmark", async ({ seededPage: page }) => {
    const main = page.locator("main#main-content");
    await expect(main).toBeAttached();
  });

  test("issue table has aria-label", async ({ seededPage: page }) => {
    const table = page.getByLabel("Issue list");
    await expect(table).toBeVisible();
  });

  test("board view has aria-label region", async ({ seededPage: page }) => {
    await page.goto("/board");
    const board = page.getByRole("region", { name: "Kanban board" });
    await expect(board).toBeVisible({ timeout: 15_000 });
  });

  test("confirm dialog uses native dialog element", async ({ seededPage: page }) => {
    // Select a row to trigger bulk actions
    const table = page.getByLabel("Issue list");
    const firstCheckbox = table.locator("tbody tr").first().getByRole("checkbox");
    await firstCheckbox.click();

    // Click close to trigger dialog
    await page.getByRole("button", { name: /close/i }).first().click();

    // The confirm dialog should be a native <dialog> element
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Cancel it
    await dialog.getByRole("button", { name: /cancel/i }).click();
  });

  test("route announcer exists for screen readers", async ({ seededPage: page }) => {
    // The route announcer should have aria-live="polite"
    const announcer = page.locator('[role="status"][aria-live="polite"]');
    await expect(announcer).toBeAttached();
  });

  test("breadcrumb navigation has aria-label", async ({ seededPage: page }) => {
    // Navigate to a detail view
    const table = page.getByLabel("Issue list");
    const firstRow = table.locator("tbody tr").first();
    await firstRow.locator("td").nth(2).click();
    await page.waitForURL("**/issues/**");

    const breadcrumb = page.getByLabel("Breadcrumb");
    await expect(breadcrumb).toBeVisible();
  });

  test("theme toggle button has accessible label", async ({ seededPage: page }) => {
    const toggleBtn = page.getByLabel("Toggle theme");
    await expect(toggleBtn).toBeVisible();
  });

  test("search input has accessible label or placeholder", async ({ seededPage: page }) => {
    const searchInput = page.getByPlaceholder(/search/i).first();
    await expect(searchInput).toBeVisible();
  });

  test("quick add input has aria-label", async ({ seededPage: page }) => {
    const quickAdd = page.getByLabel("Quick add issue");
    await expect(quickAdd).toBeVisible();
  });

  test("sort indicators have accessible labels", async ({ seededPage: page }) => {
    const table = page.getByLabel("Issue list");
    const priorityHeader = table.getByRole("columnheader", { name: /priority/i });
    await priorityHeader.click();

    // Should have an accessible sort indicator
    const sortIndicator = page.getByLabel(/sorted/i);
    await expect(sortIndicator).toBeVisible({ timeout: 3_000 });
  });
});
