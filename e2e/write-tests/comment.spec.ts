import { expect, expectToast, navigateToIssue, test } from "./fixtures";

test.describe("Comments", () => {
  // Use an issue that has existing comments
  const ISSUE_WITH_COMMENTS = "sample-project-6rs"; // "Login form crashes on empty email" - has 2 comments

  test("existing comments are visible", async ({ seededPage: page }) => {
    await navigateToIssue(page, ISSUE_WITH_COMMENTS);

    const commentsHeading = page.getByRole("heading", { name: /comments/i });
    await commentsHeading.scrollIntoViewIfNeeded();
    await expect(commentsHeading).toBeVisible({ timeout: 15_000 });

    // Should show comment count (at least the seed comments; may grow from prior test runs)
    const headingText = await commentsHeading.textContent();
    const match = headingText!.match(/\((\d+)\)/);
    expect(match).toBeTruthy();
    expect(Number(match![1])).toBeGreaterThanOrEqual(2);

    // Comment text should be visible
    await expect(page.getByText(/empty email throws TypeError/i)).toBeVisible();
  });

  test("add comment via form submission", async ({ seededPage: page }) => {
    await navigateToIssue(page, ISSUE_WITH_COMMENTS);

    const commentsHeading = page.getByRole("heading", { name: /comments/i });
    await commentsHeading.scrollIntoViewIfNeeded();
    await expect(commentsHeading).toBeVisible({ timeout: 15_000 });

    // Find the comment textarea
    const commentTextarea = page.getByPlaceholder("Add a comment...");
    await expect(commentTextarea).toBeVisible();

    const commentText = `E2E test comment ${Date.now()}`;
    await commentTextarea.fill(commentText);

    // Submit button should be enabled
    const submitBtn = page.getByRole("button", { name: "Comment" });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Textarea should clear after successful comment submission
    await expect(commentTextarea).toHaveValue("", { timeout: 30_000 });
  });

  test("comment submit button disabled when empty", async ({ seededPage: page }) => {
    await navigateToIssue(page, ISSUE_WITH_COMMENTS);

    const commentsHeading = page.getByRole("heading", { name: /comments/i });
    await commentsHeading.scrollIntoViewIfNeeded();
    await expect(commentsHeading).toBeVisible({ timeout: 15_000 });

    const commentTextarea = page.getByPlaceholder("Add a comment...");
    await expect(commentTextarea).toBeVisible();

    // Ensure textarea is empty
    await commentTextarea.fill("");

    // Submit button should be disabled
    const submitBtn = page.getByRole("button", { name: "Comment" });
    await expect(submitBtn).toBeDisabled();
  });

  test("Cmd+Enter submits comment", async ({ seededPage: page }) => {
    await navigateToIssue(page, ISSUE_WITH_COMMENTS);

    const commentsHeading = page.getByRole("heading", { name: /comments/i });
    await commentsHeading.scrollIntoViewIfNeeded();
    await expect(commentsHeading).toBeVisible({ timeout: 15_000 });

    const commentTextarea = page.getByPlaceholder("Add a comment...");
    await commentTextarea.fill(`Keyboard shortcut test ${Date.now()}`);

    // Use Cmd+Enter (Meta+Enter on macOS, Control+Enter on Linux)
    await commentTextarea.press("ControlOrMeta+Enter");

    // Textarea should clear after successful submission
    await expect(commentTextarea).toHaveValue("", { timeout: 15_000 });
  });

  test("empty state shows no comments message", async ({ seededPage: page }) => {
    // Navigate to an issue with no comments
    const NO_COMMENTS_ISSUE = "sample-project-3gr"; // "Add data export feature"
    await navigateToIssue(page, NO_COMMENTS_ISSUE);

    const commentsHeading = page.getByRole("heading", { name: /comments/i });
    await commentsHeading.scrollIntoViewIfNeeded();
    await expect(commentsHeading).toBeVisible({ timeout: 15_000 });

    // Should show 0 comments
    await expect(commentsHeading).toContainText("0");

    // "No comments yet" message
    await expect(page.getByText(/no comments yet/i)).toBeVisible();
  });
});
