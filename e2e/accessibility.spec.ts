import { test, expect, issueTable } from "./fixtures";

test.describe("Accessibility", () => {
  test("skip-to-content link is present", async ({ seededPage: page }) => {
    const skipLink = page.getByText("Skip to content");
    await expect(skipLink).toBeAttached();
  });

  test("main content area is a landmark", async ({ seededPage: page }) => {
    const main = page.locator("main#main-content");
    await expect(main).toBeAttached();
  });

  test("issue table has aria-label", async ({ seededPage: page }) => {
    // Use role-based locator for strictness
    const table = page.getByRole("table", { name: "Issue list" });
    await expect(table).toBeVisible();
  });

  test("board view has aria-label region", async ({ seededPage: page }) => {
    await page.goto("/board");
    const board = page.getByRole("region", { name: "Kanban board" });
    await expect(board).toBeVisible({ timeout: 15_000 });
  });

  test("confirm dialog uses native dialog element", async ({ seededPage: page }) => {
    const table = issueTable(page);
    const firstCheckbox = table.locator("tbody tr").first().getByRole("checkbox");
    await firstCheckbox.click();

    await page.getByRole("button", { name: /close selected/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Cancel it
    await dialog.getByRole("button", { name: /cancel/i }).click();
  });

  test("route announcer exists for screen readers", async ({ seededPage: page }) => {
    const announcer = page.locator('[role="status"][aria-live="polite"]');
    await expect(announcer).toBeAttached();
  });

  test("breadcrumb navigation has aria-label", async ({ seededPage: page }) => {
    const table = issueTable(page);
    await table.locator("tbody tr").first().locator("td").nth(2).click();
    await page.waitForURL("**/issues/**");

    const breadcrumb = page.getByLabel("Breadcrumb");
    await expect(breadcrumb).toBeVisible();
  });

  test("theme picker has accessible labels", async ({ seededPage: page }) => {
    await page.goto("/settings");
    const themePicker = page.getByRole("group", { name: "Available themes" });
    await expect(themePicker).toBeVisible({ timeout: 15_000 });

    // Each theme card should have an aria-label and aria-pressed
    const firstThemeBtn = themePicker.getByRole("button").first();
    await expect(firstThemeBtn).toHaveAttribute("aria-label", /.+theme/);
    await expect(firstThemeBtn).toHaveAttribute("aria-pressed", /(true|false)/);
  });

  test("search input has placeholder text", async ({ seededPage: page }) => {
    const searchInput = page.getByPlaceholder(/search/i).first();
    await expect(searchInput).toBeVisible();
  });

  test("quick add input has aria-label", async ({ seededPage: page }) => {
    const quickAdd = page.getByLabel("Quick add issue");
    await expect(quickAdd).toBeVisible();
  });

  test("sort indicators have accessible labels", async ({ seededPage: page }) => {
    const table = issueTable(page);
    const priorityHeader = table.getByRole("columnheader", { name: /priority/i });
    await priorityHeader.click();

    const sortIndicator = page.getByLabel(/sorted/i).first();
    await expect(sortIndicator).toBeVisible({ timeout: 3_000 });
  });
});
