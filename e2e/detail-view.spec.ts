import { test, expect, issueTable, navigateToFirstIssue } from "./fixtures";

test.describe("Detail View", () => {
  test("navigate to detail view via table row click", async ({ seededPage: page }) => {
    const table = issueTable(page);
    const firstRow = table.locator("tbody tr").first();

    await firstRow.locator("td").nth(2).click();
    await page.waitForURL("**/issues/**");
    await expect(page.getByLabel("Breadcrumb")).toBeVisible();
  });

  test("breadcrumb shows issue ID", async ({ seededPage: page }) => {
    const issueId = await navigateToFirstIssue(page);
    await expect(page.getByLabel("Breadcrumb")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(issueId)).toBeVisible();
  });

  test("breadcrumb navigates back to list", async ({ seededPage: page }) => {
    await navigateToFirstIssue(page);
    await expect(page.getByLabel("Breadcrumb")).toBeVisible({ timeout: 15_000 });

    await page.getByLabel("Breadcrumb").getByText("List").click();
    await page.waitForURL("**/list");
  });

  test("shows issue fields section", async ({ seededPage: page }) => {
    await navigateToFirstIssue(page);

    // "Fields" heading
    await expect(page.getByRole("heading", { name: "Fields" })).toBeVisible({ timeout: 15_000 });

    // Field labels inside the grid
    await expect(page.getByText("Status", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Priority", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Type", { exact: true }).first()).toBeVisible();
  });

  test("status select field is present and has value", async ({ seededPage: page }) => {
    await navigateToFirstIssue(page);
    await expect(page.getByRole("heading", { name: "Fields" })).toBeVisible({ timeout: 15_000 });

    const statusSelect = page.getByLabel("Status");
    await expect(statusSelect).toBeVisible();
    // Verify it has some value (data-agnostic — don't assume a specific status)
    const value = await statusSelect.inputValue();
    expect(value.length).toBeGreaterThan(0);
  });

  test("priority select field is present", async ({ seededPage: page }) => {
    await navigateToFirstIssue(page);
    await expect(page.getByRole("heading", { name: "Fields" })).toBeVisible({ timeout: 15_000 });

    const prioritySelect = page.getByLabel("Priority");
    await expect(prioritySelect).toBeVisible();
  });

  test("description section renders", async ({ seededPage: page }) => {
    await navigateToFirstIssue(page);
    // Use heading to find the section
    await expect(page.getByRole("heading", { name: "Description" })).toBeVisible({ timeout: 15_000 });
  });

  test("markdown edit button toggles editor", async ({ seededPage: page }) => {
    await navigateToFirstIssue(page);
    await expect(page.getByRole("heading", { name: "Description" })).toBeVisible({ timeout: 15_000 });

    // Click "Edit" button near Description section
    const editBtn = page.getByRole("button", { name: /edit/i }).first();
    await expect(editBtn).toBeVisible();
    await editBtn.click();
    const editor = page.locator("textarea").first();
    await expect(editor).toBeVisible({ timeout: 5_000 });

    // Cancel
    const cancelBtn = page.getByRole("button", { name: /cancel/i }).first();
    await expect(cancelBtn).toBeVisible();
    await cancelBtn.click();
  });

  test("dependencies section is visible", async ({ seededPage: page }) => {
    await navigateToFirstIssue(page);
    // Use heading role for strict matching
    const depHeading = page.getByRole("heading", { name: /dependencies/i });
    await depHeading.scrollIntoViewIfNeeded();
    await expect(depHeading).toBeVisible({ timeout: 15_000 });
  });

  test("comments section is visible", async ({ seededPage: page }) => {
    await navigateToFirstIssue(page);
    const heading = page.getByRole("heading", { name: /comments/i });
    await heading.scrollIntoViewIfNeeded();
    await expect(heading).toBeVisible({ timeout: 15_000 });
  });

  test("activity timeline section is visible", async ({ seededPage: page }) => {
    await navigateToFirstIssue(page);
    const heading = page.getByRole("heading", { name: /activity/i });
    await heading.scrollIntoViewIfNeeded();
    await expect(heading).toBeVisible({ timeout: 15_000 });
  });

  test("close button triggers confirmation dialog", async ({ seededPage: page }) => {
    await navigateToFirstIssue(page);
    await expect(page.getByLabel("Breadcrumb")).toBeVisible({ timeout: 15_000 });

    const closeBtn = page.getByRole("button", { name: "Close" }).first();
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Cancel
    await dialog.getByRole("button", { name: /cancel/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5_000 });
  });

  test("issue not found shows error state", async ({ seededPage: page }) => {
    await page.goto("/issues/nonexistent-issue-id");
    await expect(page.getByRole("heading", { name: /not found/i })).toBeVisible({ timeout: 15_000 });
  });
});
