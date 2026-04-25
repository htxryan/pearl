import { expect, issueTable, navigateToFirstIssue, test } from "./fixtures";

test.describe("Detail View", () => {
  test("navigate to detail view via table row click", async ({ seededPage: page }) => {
    const table = issueTable(page);
    const firstRow = table.locator("tbody tr").first();

    await firstRow.locator("td").nth(2).click();
    // Row click opens an in-place panel; wait for the panel close button to confirm it opened
    await expect(page.getByRole("button", { name: "Close panel" })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("breadcrumb shows issue ID", async ({ seededPage: page }) => {
    const issueId = await navigateToFirstIssue(page);
    await expect(page.getByLabel("Breadcrumb")).toBeVisible({ timeout: 15_000 });
    // UI strips the project prefix (e.g. "sample-project-6kq" → "6kq")
    const shortId = issueId.includes("-") ? issueId.split("-").pop()! : issueId;
    await expect(page.getByLabel("Breadcrumb").getByText(shortId)).toBeVisible();
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
    // Verify it displays a value (custom dropdown uses a button, not a native select)
    const text = await statusSelect.textContent();
    expect(text!.trim().length).toBeGreaterThan(0);
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
    await expect(page.getByRole("heading", { name: "Description" })).toBeVisible({
      timeout: 15_000,
    });
  });

  test("markdown edit button toggles editor", async ({ seededPage: page }) => {
    await navigateToFirstIssue(page);
    const descriptionHeading = page.getByRole("heading", { name: "Description" });
    await expect(descriptionHeading).toBeVisible({ timeout: 15_000 });

    // Target the Edit button adjacent to the Description heading, not the
    // first Edit on the page (which may be the title inline editor).
    const descriptionSection = descriptionHeading.locator("..").locator("..");
    const editBtn = descriptionSection.getByRole("button", { name: /^edit$/i }).first();
    await expect(editBtn).toBeVisible();
    await editBtn.click();
    const editor = descriptionSection.locator("textarea").first();
    await expect(editor).toBeVisible({ timeout: 5_000 });

    const cancelBtn = descriptionSection.getByRole("button", { name: /cancel/i }).first();
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

    await page
      .getByRole("button", { name: /actions/i })
      .first()
      .click();
    const closeItem = page.getByRole("menuitem", { name: "Close", exact: true });
    await expect(closeItem).toBeVisible();
    await closeItem.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Cancel
    await dialog.getByRole("button", { name: /cancel/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5_000 });
  });

  test("issue not found shows error state", async ({ seededPage: page }) => {
    await page.goto("/issues/nonexistent-issue-id");
    await expect(page.getByRole("heading", { name: /not found/i })).toBeVisible({
      timeout: 15_000,
    });
  });
});
