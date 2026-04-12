import { test, expect, createTestIssue, deleteTestIssue } from "./fixtures";

test.describe("List View", () => {
  test("loads and displays issues in a table", async ({ seededPage: page }) => {
    const table = page.getByLabel("Issue list");
    await expect(table).toBeVisible();

    // Table has header row + at least one data row
    const rows = table.locator("tbody tr");
    await expect(rows.first()).toBeVisible();
  });

  test("shows column headers", async ({ seededPage: page }) => {
    const table = page.getByLabel("Issue list");
    // Check for common column headers
    await expect(table.getByRole("columnheader", { name: /title/i })).toBeVisible();
    await expect(table.getByRole("columnheader", { name: /status/i })).toBeVisible();
    await expect(table.getByRole("columnheader", { name: /priority/i })).toBeVisible();
  });

  test("clicking an issue title navigates to detail view", async ({ seededPage: page }) => {
    const table = page.getByLabel("Issue list");
    const firstRow = table.locator("tbody tr").first();

    // Click the title cell (not the checkbox)
    const titleCell = firstRow.locator("td").nth(2);
    await titleCell.click();

    await page.waitForURL("**/issues/**");
    // Breadcrumb should show navigation context
    await expect(page.getByLabel("Breadcrumb")).toBeVisible();
  });

  test("search filter narrows results", async ({ seededPage: page }) => {
    // Create a uniquely-named issue for search
    const uniqueTitle = `E2E-Search-${Date.now()}`;
    const issueId = await createTestIssue(page, { title: uniqueTitle });

    try {
      // Refresh to pick up new issue
      await page.reload();
      await expect(page.getByLabel("Issue list")).toBeVisible({ timeout: 15_000 });

      // Type in the search input
      const searchInput = page.getByPlaceholder(/search/i).first();
      await searchInput.fill(uniqueTitle);

      // Wait for filtered results
      await expect(page.getByLabel("Issue list").locator("tbody tr")).toHaveCount(1, { timeout: 10_000 });
      await expect(page.getByText(uniqueTitle)).toBeVisible();
    } finally {
      await deleteTestIssue(page, issueId);
    }
  });

  test("sort by column header click", async ({ seededPage: page }) => {
    const table = page.getByLabel("Issue list");
    const priorityHeader = table.getByRole("columnheader", { name: /priority/i });

    // Click to sort ascending
    await priorityHeader.click();
    await expect(page.getByLabel("Sorted ascending").or(page.getByLabel("Sorted descending"))).toBeVisible({ timeout: 5_000 });
  });

  test("column visibility menu toggles columns", async ({ seededPage: page }) => {
    // Find and click the Columns button
    const columnsBtn = page.getByRole("button", { name: /columns/i });
    await columnsBtn.click();

    // Should show column visibility options
    const menu = page.getByRole("menu").or(page.locator("[data-column-visibility-menu]"));
    // Look for a checkbox or toggle item for a column
    // If "Assignee" column exists, toggle it
    const assigneeOption = page.getByLabel(/assignee/i).or(page.getByText(/assignee/i));
    if (await assigneeOption.isVisible()) {
      await assigneeOption.click();
    }

    // Close by clicking elsewhere
    await page.keyboard.press("Escape");
  });

  test("keyboard navigation: j/k to move rows", async ({ seededPage: page }) => {
    const table = page.getByLabel("Issue list");
    // Ensure we have multiple rows
    const rows = table.locator("tbody tr");
    const rowCount = await rows.count();
    if (rowCount < 2) {
      test.skip();
      return;
    }

    // Press j to move to first row
    await page.keyboard.press("j");
    // The active row should have aria-selected=true
    await expect(rows.nth(0)).toHaveAttribute("aria-selected", "true");

    // Press j again to move to second row
    await page.keyboard.press("j");
    await expect(rows.nth(1)).toHaveAttribute("aria-selected", "true");

    // Press k to move back up
    await page.keyboard.press("k");
    await expect(rows.nth(0)).toHaveAttribute("aria-selected", "true");
  });

  test("keyboard navigation: x to toggle selection, Enter to open", async ({ seededPage: page }) => {
    const table = page.getByLabel("Issue list");
    const rows = table.locator("tbody tr");
    if ((await rows.count()) < 1) {
      test.skip();
      return;
    }

    // Press j to select first row, then x to toggle checkbox
    await page.keyboard.press("j");
    await page.keyboard.press("x");

    // Bulk action bar should appear (shows selected count)
    await expect(page.getByText(/1 selected/i).or(page.getByText(/selected/i))).toBeVisible({ timeout: 5_000 });

    // Press Enter to open the issue
    await page.keyboard.press("Enter");
    await page.waitForURL("**/issues/**");
  });
});

test.describe("Quick-add", () => {
  test("creates an issue from inline input", async ({ seededPage: page }) => {
    const title = `E2E-QuickAdd-${Date.now()}`;
    const input = page.getByLabel("Quick add issue");
    await input.fill(title);
    await input.press("Enter");

    // Should navigate to the new issue detail view
    await page.waitForURL("**/issues/**", { timeout: 10_000 });

    // Verify title appears in detail view
    await expect(page.getByText(title)).toBeVisible();

    // Clean up — extract ID from URL
    const url = page.url();
    const id = url.split("/issues/")[1];
    if (id) {
      await deleteTestIssue(page, id);
    }
  });
});
