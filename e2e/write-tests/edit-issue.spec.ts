import { expect, navigateToIssue, test } from "./fixtures";

test.describe("Edit Issue", () => {
  // Use an open issue with known state for editing
  const OPEN_ISSUE_ID = "sample-project-6kq"; // "Implement session management" - open, P1, task

  // Status/Priority/Type now use a CustomSelect component (button[role=combobox]
  // that opens a div[role=listbox] of div[role=option]). Helper wraps the
  // open/select/verify pattern so tests stay readable.
  async function changeCombobox(
    page: import("@playwright/test").Page,
    label: string,
    newOptionName: RegExp | string,
  ): Promise<string> {
    const combo = page.getByRole("combobox", { name: label });
    await expect(combo).toBeVisible();
    const original = (await combo.textContent())?.trim() ?? "";
    await combo.click();
    await page.getByRole("option", { name: newOptionName }).first().click();
    await expect(combo).not.toHaveText(original, { timeout: 5_000 });
    return original;
  }

  async function revertCombobox(
    page: import("@playwright/test").Page,
    label: string,
    originalText: string,
  ) {
    const combo = page.getByRole("combobox", { name: label });
    await combo.click();
    await page.getByRole("option", { name: originalText }).first().click();
    await expect(combo).toHaveText(originalText, { timeout: 5_000 });
  }

  test("change status via select dropdown", async ({ seededPage: page }) => {
    await navigateToIssue(page, OPEN_ISSUE_ID);
    const combo = page.getByRole("combobox", { name: "Status" });
    const original = ((await combo.textContent()) ?? "").trim();
    const target = /^open$/i.test(original) ? /^in progress$/i : /^open$/i;
    await combo.click();
    await page.getByRole("option", { name: target }).first().click();
    await expect(combo).not.toHaveText(original, { timeout: 5_000 });
    await revertCombobox(page, "Status", original);
  });

  test("change priority via select dropdown", async ({ seededPage: page }) => {
    await navigateToIssue(page, OPEN_ISSUE_ID);
    const combo = page.getByRole("combobox", { name: "Priority" });
    const original = ((await combo.textContent()) ?? "").trim();
    const target = original === "P0" ? /^P3$/ : /^P0$/;
    await combo.click();
    await page.getByRole("option", { name: target }).first().click();
    await expect(combo).not.toHaveText(original, { timeout: 5_000 });
    await revertCombobox(page, "Priority", original);
  });

  test("change issue type via select dropdown", async ({ seededPage: page }) => {
    await navigateToIssue(page, OPEN_ISSUE_ID);
    // Scope to the Fields section to avoid matching "Filter events by type"
    const fieldsSection = page.getByRole("heading", { name: "Fields" }).locator("..");
    const combo = fieldsSection.getByRole("combobox", { name: "Type" });
    const original = ((await combo.textContent()) ?? "").trim();
    const target = /^bug$/i.test(original) ? /^feature$/i : /^bug$/i;
    await combo.click();
    await page.getByRole("option", { name: target }).first().click();
    await expect(combo).not.toHaveText(original, { timeout: 5_000 });
    await combo.click();
    await page.getByRole("option", { name: original }).first().click();
    await expect(combo).toHaveText(original, { timeout: 5_000 });
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

    const fieldsHeading = page.getByRole("heading", { name: "Fields" });
    await expect(fieldsHeading).toBeVisible({ timeout: 15_000 });
    const fieldsSection = fieldsHeading.locator("..");

    // Scope to the Assignee row — locate by the field's label span
    const assigneeRow = fieldsSection.getByText("Assignee", { exact: true }).locator("..");
    const assigneeDisplay = assigneeRow.locator('[role="button"]').first();
    await expect(assigneeDisplay).toBeVisible({ timeout: 5_000 });
    await assigneeDisplay.click();

    const assigneeInput = page.locator('input[name="assignee"]');
    await expect(assigneeInput).toBeVisible({ timeout: 3_000 });

    const testValue = `E2E Test User ${Date.now()}`;
    await assigneeInput.fill(testValue);
    await assigneeInput.press("Enter");

    // Verify within the assignee row only (activity timeline also mentions it)
    await expect(assigneeRow.getByText(testValue)).toBeVisible({ timeout: 5_000 });

    // Revert — click the row's display again and clear
    await assigneeRow.locator('[role="button"]').first().click();
    const assigneeInputAgain = page.locator('input[name="assignee"]');
    await expect(assigneeInputAgain).toBeVisible({ timeout: 3_000 });
    await assigneeInputAgain.fill("");
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
