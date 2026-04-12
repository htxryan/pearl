import { test, expect, navigateToIssue } from "./fixtures";

test.describe("Close Issue", () => {
  // Use an open issue that we can close — P3 task with no critical dependencies
  const CLOSEABLE_ISSUE_ID = "sample-project-7v4"; // "Dark mode support" - open, P3, feature

  test("close button shows confirmation dialog", async ({ seededPage: page }) => {
    await navigateToIssue(page, CLOSEABLE_ISSUE_ID);

    const closeBtn = page.getByRole("button", { name: "Close" }).first();
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();

    // Confirmation dialog should appear
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await expect(dialog.getByText("Close issue?")).toBeVisible();
    await expect(dialog.getByText(/are you sure/i)).toBeVisible();
  });

  test("cancel on confirmation dialog does not close issue", async ({ seededPage: page }) => {
    await navigateToIssue(page, CLOSEABLE_ISSUE_ID);

    const closeBtn = page.getByRole("button", { name: "Close" }).first();
    await closeBtn.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Cancel
    await dialog.getByRole("button", { name: /cancel/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5_000 });

    // Issue should still be on the detail page (not navigated away)
    await expect(page.getByLabel("Breadcrumb")).toBeVisible();
    // Close button should still be present (issue not closed)
    await expect(closeBtn).toBeVisible();
  });

  test("confirming close navigates back to list", async ({ seededPage: page }) => {
    await navigateToIssue(page, CLOSEABLE_ISSUE_ID);

    const closeBtn = page.getByRole("button", { name: "Close" }).first();
    await closeBtn.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Confirm close
    await dialog.getByRole("button", { name: /close issue/i }).click();

    // Should navigate back to list view after successful close
    await page.waitForURL("**/list", { timeout: 15_000 });
    await expect(page.getByRole("table", { name: "Issue list" })).toBeVisible({ timeout: 15_000 });
  });

  test("closed issue does not show close button", async ({ seededPage: page }) => {
    // Navigate to the already-closed issue
    const CLOSED_ISSUE_ID = "sample-project-elb"; // "Set up OAuth2 provider integration" - closed
    await navigateToIssue(page, CLOSED_ISSUE_ID);

    await expect(page.getByLabel("Breadcrumb")).toBeVisible({ timeout: 15_000 });

    // Close and Claim buttons should NOT be visible for closed issues
    const closeBtn = page.getByRole("button", { name: "Close" });
    await expect(closeBtn).not.toBeVisible({ timeout: 3_000 });
  });
});
