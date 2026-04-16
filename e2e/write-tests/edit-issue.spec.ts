import { expect, navigateToIssue, test } from "./fixtures";

test.describe("Edit Issue", () => {
  // Use an open issue with known state for editing
  const OPEN_ISSUE_ID = "sample-project-6kq"; // "Implement session management" - open, P1, task

  test("change status via select dropdown", async ({ seededPage: page }) => {
    await navigateToIssue(page, OPEN_ISSUE_ID);

    const statusSelect = page.getByLabel("Status");
    await expect(statusSelect).toBeVisible();

    // Get original value
    const originalStatus = await statusSelect.inputValue();

    // Change to a different status
    const newStatus = originalStatus === "in_progress" ? "open" : "in_progress";
    await statusSelect.selectOption(newStatus);

    // Verify the select now shows the new value (optimistic update)
    await expect(statusSelect).toHaveValue(newStatus);

    // Revert to original to avoid polluting other tests
    await statusSelect.selectOption(originalStatus);
    await expect(statusSelect).toHaveValue(originalStatus);
  });

  test("change priority via select dropdown", async ({ seededPage: page }) => {
    await navigateToIssue(page, OPEN_ISSUE_ID);

    const prioritySelect = page.getByLabel("Priority");
    await expect(prioritySelect).toBeVisible();

    const originalPriority = await prioritySelect.inputValue();

    // Change priority
    const newPriority = originalPriority === "0" ? "3" : "0";
    await prioritySelect.selectOption(newPriority);

    await expect(prioritySelect).toHaveValue(newPriority);

    // Revert
    await prioritySelect.selectOption(originalPriority);
    await expect(prioritySelect).toHaveValue(originalPriority);
  });

  test("change issue type via select dropdown", async ({ seededPage: page }) => {
    await navigateToIssue(page, OPEN_ISSUE_ID);

    // Scope to the Fields section to avoid matching "Filter events by type" select
    const fieldsSection = page.getByRole("heading", { name: "Fields" }).locator("..");
    const typeSelect = fieldsSection.getByLabel("Type");
    await expect(typeSelect).toBeVisible();

    const originalType = await typeSelect.inputValue();

    // Change type
    const newType = originalType === "bug" ? "feature" : "bug";
    await typeSelect.selectOption(newType);

    await expect(typeSelect).toHaveValue(newType);

    // Revert
    await typeSelect.selectOption(originalType);
    await expect(typeSelect).toHaveValue(originalType);
  });

  test("edit title inline with click-to-edit", async ({ seededPage: page }) => {
    await navigateToIssue(page, OPEN_ISSUE_ID);

    // Title uses FieldEditor — click the h1 to enter edit mode
    const titleHeading = page.locator("h1").first();
    await expect(titleHeading).toBeVisible({ timeout: 15_000 });
    const originalTitle = (await titleHeading.textContent()) ?? "Implement session management";

    // Click to start editing
    await titleHeading.click();

    // The FieldEditor renders an input[name="title"] in edit mode
    const titleInput = page.locator('input[name="title"]');
    await expect(titleInput).toBeVisible({ timeout: 3_000 });

    // Type new title
    await titleInput.fill(`${originalTitle} (edited)`);
    await titleInput.press("Enter");

    // Verify title updated (optimistic)
    await expect(page.locator("h1").first()).toContainText("(edited)", { timeout: 5_000 });

    // Revert — click to edit again
    await page.locator("h1").first().click();
    const titleInputAgain = page.locator('input[name="title"]');
    await expect(titleInputAgain).toBeVisible({ timeout: 3_000 });
    await titleInputAgain.fill(originalTitle);
    await titleInputAgain.press("Enter");
  });

  test("edit assignee inline", async ({ seededPage: page }) => {
    await navigateToIssue(page, OPEN_ISSUE_ID);

    await expect(page.getByRole("heading", { name: "Fields" })).toBeVisible({ timeout: 15_000 });

    // The assignee FieldEditor shows "Unassigned" (italic) or the name
    // Click on the assignee value area to enter edit mode
    const assigneeDisplay = page.getByText("Unassigned").first();
    if (await assigneeDisplay.isVisible().catch(() => false)) {
      await assigneeDisplay.click();
    } else {
      // Already has an assignee — find the FieldEditor by input name
      const existingAssignee = page
        .locator('[role="button"]')
        .filter({ has: page.locator("text=Assignee").locator("..") });
      // Fallback: click on the text after the "Assignee" label
      const assigneeLabel = page.getByText("Assignee", { exact: true }).first();
      // Click the sibling content area
      await assigneeLabel.locator("..").locator('[role="button"]').first().click();
    }

    // The FieldEditor renders an input[name="assignee"] in edit mode
    const assigneeInput = page.locator('input[name="assignee"]');
    await expect(assigneeInput).toBeVisible({ timeout: 3_000 });

    await assigneeInput.fill("E2E Test User");
    await assigneeInput.press("Enter");

    // Verify the update (optimistic)
    await expect(page.getByText("E2E Test User")).toBeVisible({ timeout: 5_000 });

    // Revert — click to edit again
    await page.getByText("E2E Test User").click();
    const assigneeInputAgain = page.locator('input[name="assignee"]');
    await expect(assigneeInputAgain).toBeVisible({ timeout: 3_000 });
    await assigneeInputAgain.clear();
    await assigneeInputAgain.press("Enter");
  });

  test("due date field is interactive", async ({ seededPage: page }) => {
    await navigateToIssue(page, OPEN_ISSUE_ID);

    await expect(page.getByRole("heading", { name: "Fields" })).toBeVisible({ timeout: 15_000 });

    // The DatePicker renders a button with aria-label "Set date" (no date)
    // or "Change date, currently ..." (when a date is set)
    const dateButton = page.getByLabel(/set date|change date/i);
    await expect(dateButton).toBeVisible();

    // Click to open the date picker popover
    await dateButton.click();

    // The popover should show a relative date input and calendar
    const relativeInput = page.getByPlaceholder(/tomorrow|next friday/i);
    await expect(relativeInput).toBeVisible({ timeout: 3_000 });

    // Close the popover with Escape
    await page.keyboard.press("Escape");
    await expect(relativeInput).not.toBeVisible({ timeout: 3_000 });
  });

  test("edit description markdown section", async ({ seededPage: page }) => {
    await navigateToIssue(page, OPEN_ISSUE_ID);

    const descHeading = page.getByRole("heading", { name: "Description" });
    await descHeading.scrollIntoViewIfNeeded();
    await expect(descHeading).toBeVisible({ timeout: 15_000 });

    // The MarkdownSection wraps everything in a <section> — heading's grandparent
    const descSection = descHeading.locator("xpath=ancestor::section");

    // Click Edit button
    const editBtn = descSection.getByRole("button", { name: /edit/i });
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    // Textarea should appear (name="description" from the MarkdownSection field prop)
    const textarea = page.locator('textarea[name="description"]');
    await expect(textarea).toBeVisible({ timeout: 5_000 });

    // Verify textarea has content (the issue has a description)
    const content = await textarea.inputValue();
    expect(content.length).toBeGreaterThan(0);

    // Cancel to avoid triggering a write (Cancel button is also inside the section)
    const cancelBtn = descSection.getByRole("button", { name: /cancel/i });
    await expect(cancelBtn).toBeVisible();
    await cancelBtn.click();

    // Textarea should be hidden after cancel
    await expect(textarea).not.toBeVisible({ timeout: 3_000 });
  });
});
