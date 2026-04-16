import { expect, issueTable, test } from "./fixtures";

test.describe("Bulk Actions", () => {
  test("selecting rows shows bulk action bar", async ({ seededPage: page }) => {
    const table = issueTable(page);
    const rows = table.locator("tbody tr");

    // Click checkbox on first row (stopPropagation prevents row click)
    const firstCheckbox = rows.first().getByRole("checkbox");
    await firstCheckbox.click();
    await expect(page.getByText("issue selected")).toBeVisible({ timeout: 5_000 });

    const secondCheckbox = rows.nth(1).getByRole("checkbox");
    await secondCheckbox.click();
    await expect(page.getByText("issues selected")).toBeVisible();
  });

  test("select all rows via header checkbox", async ({ seededPage: page }) => {
    const table = issueTable(page);
    const selectAllCheckbox = table.getByLabel("Select all rows");
    await selectAllCheckbox.click();

    await expect(page.getByText("issues selected")).toBeVisible({ timeout: 5_000 });
  });

  test("bulk close button opens confirmation dialog", async ({ seededPage: page }) => {
    const table = issueTable(page);
    const firstCheckbox = table.locator("tbody tr").first().getByRole("checkbox");
    await firstCheckbox.click();
    await expect(page.getByText("issue selected")).toBeVisible({ timeout: 5_000 });

    // Click "Close selected" in bulk action bar
    await page.getByRole("button", { name: /close selected/i }).click();

    // Confirmation dialog
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Cancel (don't mutate data)
    await dialog.getByRole("button", { name: /cancel/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5_000 });
  });

  test("clear selection removes bulk action bar", async ({ seededPage: page }) => {
    const table = issueTable(page);
    const firstCheckbox = table.locator("tbody tr").first().getByRole("checkbox");
    await firstCheckbox.click();
    await expect(page.getByText("issue selected")).toBeVisible({ timeout: 5_000 });

    await page.getByRole("button", { name: /clear/i }).click();

    // Bulk bar should disappear — no "selected" text
    await expect(page.getByText("issue selected")).not.toBeVisible({ timeout: 5_000 });
  });
});
