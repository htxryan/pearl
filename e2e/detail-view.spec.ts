import { test, expect, createTestIssue, deleteTestIssue } from "./fixtures";

test.describe("Detail View", () => {
  let issueId: string;

  test.beforeEach(async ({ seededPage: page }) => {
    issueId = await createTestIssue(page, {
      title: `E2E-Detail-${Date.now()}`,
      description: "Test description for E2E",
      priority: 2,
      issue_type: "task",
    });
  });

  test.afterEach(async ({ seededPage: page }) => {
    if (issueId) {
      await deleteTestIssue(page, issueId);
    }
  });

  test("navigate to detail view via title click", async ({ seededPage: page }) => {
    await page.reload();
    await expect(page.getByLabel("Issue list")).toBeVisible({ timeout: 15_000 });

    // Click on the issue title
    await page.getByText(`E2E-Detail-`).first().click();
    await page.waitForURL(`**/issues/${issueId}`);

    // Verify breadcrumb
    await expect(page.getByLabel("Breadcrumb")).toBeVisible();
    await expect(page.getByText(issueId)).toBeVisible();
  });

  test("breadcrumb navigates back to list", async ({ seededPage: page }) => {
    await page.goto(`/issues/${issueId}`);
    await expect(page.getByLabel("Breadcrumb")).toBeVisible({ timeout: 15_000 });

    // Click the "List" breadcrumb link
    const breadcrumb = page.getByLabel("Breadcrumb");
    await breadcrumb.getByText("List").click();

    await page.waitForURL("**/list");
  });

  test("shows issue fields section", async ({ seededPage: page }) => {
    await page.goto(`/issues/${issueId}`);
    await expect(page.getByText("Fields")).toBeVisible({ timeout: 15_000 });

    // Check for field labels
    await expect(page.getByText("Status")).toBeVisible();
    await expect(page.getByText("Priority")).toBeVisible();
    await expect(page.getByText("Type")).toBeVisible();
  });

  test("inline field editing: change status via select", async ({ seededPage: page }) => {
    await page.goto(`/issues/${issueId}`);
    await expect(page.getByText("Fields")).toBeVisible({ timeout: 15_000 });

    // Find the status select field
    const statusSelect = page.getByLabel("Status");
    await statusSelect.selectOption("in_progress");

    // Verify the change persists — reload and check
    await page.reload();
    await expect(page.getByText("Fields")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByLabel("Status")).toHaveValue("in_progress");
  });

  test("inline field editing: change priority", async ({ seededPage: page }) => {
    await page.goto(`/issues/${issueId}`);
    await expect(page.getByText("Fields")).toBeVisible({ timeout: 15_000 });

    const prioritySelect = page.getByLabel("Priority");
    await prioritySelect.selectOption("0");

    await page.reload();
    await expect(page.getByText("Fields")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByLabel("Priority")).toHaveValue("0");
  });

  test("description section shows markdown content", async ({ seededPage: page }) => {
    await page.goto(`/issues/${issueId}`);
    await expect(page.getByText("Description")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Test description for E2E")).toBeVisible();
  });

  test("markdown edit/preview toggle", async ({ seededPage: page }) => {
    await page.goto(`/issues/${issueId}`);
    await expect(page.getByText("Description")).toBeVisible({ timeout: 15_000 });

    // Click "Edit" button on the Description section
    const editBtn = page.getByRole("button", { name: /edit/i }).first();
    await editBtn.click();

    // A textarea should appear for editing
    const textarea = page.getByRole("textbox").first();
    await expect(textarea).toBeVisible();

    // Type additional content
    await textarea.fill("Updated description content");

    // Click "Save" or "Done"
    const saveBtn = page.getByRole("button", { name: /save|done/i }).first();
    await saveBtn.click();

    // The markdown preview should show the updated content
    await expect(page.getByText("Updated description content")).toBeVisible({ timeout: 5_000 });
  });

  test("close issue from detail view", async ({ seededPage: page }) => {
    await page.goto(`/issues/${issueId}`);
    await expect(page.getByLabel("Breadcrumb")).toBeVisible({ timeout: 15_000 });

    // Click the Close button
    const closeBtn = page.getByRole("button", { name: /^close$/i });
    await closeBtn.click();

    // Confirmation dialog
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Confirm
    await dialog.getByRole("button", { name: /close issue/i }).click();

    // Should navigate back to list
    await page.waitForURL("**/list", { timeout: 10_000 });
  });
});
