import { test, expect, createTestIssue, deleteTestIssue } from "./fixtures";

test.describe("Bulk Actions", () => {
  let issueIds: string[] = [];

  test.beforeEach(async ({ seededPage: page }) => {
    // Create 3 test issues for bulk operations
    issueIds = await Promise.all([
      createTestIssue(page, { title: `E2E-Bulk-A-${Date.now()}` }),
      createTestIssue(page, { title: `E2E-Bulk-B-${Date.now()}` }),
      createTestIssue(page, { title: `E2E-Bulk-C-${Date.now()}` }),
    ]);

    // Reload to see new issues
    await page.reload();
    await expect(page.getByLabel("Issue list")).toBeVisible({ timeout: 15_000 });
  });

  test.afterEach(async ({ seededPage: page }) => {
    for (const id of issueIds) {
      await deleteTestIssue(page, id);
    }
    issueIds = [];
  });

  test("select rows and show bulk action bar", async ({ seededPage: page }) => {
    const table = page.getByLabel("Issue list");
    const rows = table.locator("tbody tr");

    // Click checkboxes on first two rows
    const firstCheckbox = rows.first().getByRole("checkbox");
    const secondCheckbox = rows.nth(1).getByRole("checkbox");

    await firstCheckbox.click();
    await expect(page.getByText(/1 selected/i)).toBeVisible();

    await secondCheckbox.click();
    await expect(page.getByText(/2 selected/i)).toBeVisible();
  });

  test("bulk close with confirmation dialog", async ({ seededPage: page }) => {
    const table = page.getByLabel("Issue list");
    const rows = table.locator("tbody tr");

    // Select first row
    const firstCheckbox = rows.first().getByRole("checkbox");
    await firstCheckbox.click();

    // Click "Close" button in bulk action bar
    const closeBtn = page.getByRole("button", { name: /close/i }).first();
    await closeBtn.click();

    // Confirmation dialog appears
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/close/i)).toBeVisible();

    // Confirm the action
    const confirmBtn = dialog.getByRole("button", { name: /close/i });
    await confirmBtn.click();

    // Dialog should close
    await expect(dialog).not.toBeVisible({ timeout: 10_000 });
  });

  test("clear selection removes bulk action bar", async ({ seededPage: page }) => {
    const table = page.getByLabel("Issue list");
    const firstCheckbox = table.locator("tbody tr").first().getByRole("checkbox");

    await firstCheckbox.click();
    await expect(page.getByText(/selected/i)).toBeVisible();

    // Click "Clear" button
    const clearBtn = page.getByRole("button", { name: /clear/i });
    await clearBtn.click();

    // Bulk action bar should disappear
    await expect(page.getByText(/selected/i)).not.toBeVisible({ timeout: 5_000 });
  });
});
