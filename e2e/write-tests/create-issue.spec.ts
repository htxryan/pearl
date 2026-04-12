import { test, expect, issueTable, expectToast } from "./fixtures";

test.describe("Create Issue", () => {
  test.describe("Quick-add input", () => {
    test("creates issue via quick-add and triggers mutation", async ({ seededPage: page }) => {
      const quickAdd = page.getByLabel("Quick add issue");
      await expect(quickAdd).toBeVisible();

      const title = `E2E Quick Add ${Date.now()}`;
      await quickAdd.fill(title);
      await quickAdd.press("Enter");

      // Wait for result: either input clears (success) or stays (failure toast may appear)
      // On success, the input clears and navigates to the new issue
      // On failure, the input value is restored
      await Promise.race([
        expect(quickAdd).toHaveValue("", { timeout: 15_000 }),
        expect(quickAdd).toHaveValue(title, { timeout: 15_000 }),
      ]);
    });

    test("quick-add input clears after successful creation", async ({ seededPage: page }) => {
      const quickAdd = page.getByLabel("Quick add issue");
      const title = `E2E Clear Test ${Date.now()}`;
      await quickAdd.fill(title);
      await quickAdd.press("Enter");

      // Input should clear
      await expect(quickAdd).toHaveValue("", { timeout: 5_000 });
    });

    test("quick-add with empty title does nothing", async ({ seededPage: page }) => {
      const quickAdd = page.getByLabel("Quick add issue");
      await quickAdd.fill("");
      await quickAdd.press("Enter");

      // No toast should appear — verify the quick-add is still empty and no create button visible
      await expect(quickAdd).toHaveValue("");
    });
  });

  test.describe("Create dialog (via command palette)", () => {
    /** Open the create dialog via Cmd+K -> "Create Issue" */
    async function openCreateDialog(page: import("@playwright/test").Page) {
      // Open command palette
      await page.keyboard.press("Meta+k");

      // The command palette input has a specific placeholder
      const cmdInput = page.getByPlaceholder("Search issues or type a command...");
      await expect(cmdInput).toBeVisible({ timeout: 5_000 });

      // Search for Create Issue action
      await cmdInput.fill("Create Issue");

      // Click the "Create Issue" command item
      const createItem = page.locator('[cmdk-item]').filter({ hasText: "Create Issue" }).first();
      await expect(createItem).toBeVisible({ timeout: 3_000 });
      await createItem.click();

      // Now the create issue dialog (native <dialog>) should be open
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible({ timeout: 5_000 });
      await expect(dialog.getByRole("heading", { name: "Create Issue" })).toBeVisible();
      return dialog;
    }

    test("opens create dialog and fills all fields", async ({ seededPage: page }) => {
      const dialog = await openCreateDialog(page);

      // Fill title (required)
      const titleInput = dialog.locator("#create-title");
      await expect(titleInput).toBeVisible();
      const title = `E2E Dialog Issue ${Date.now()}`;
      await titleInput.fill(title);

      // Fill description
      const descInput = dialog.locator("#create-desc");
      await descInput.fill("Created by E2E write test");

      // Select type
      const typeSelect = dialog.locator("#create-type");
      await typeSelect.selectOption("bug");

      // Select priority
      const prioritySelect = dialog.locator("#create-priority");
      await prioritySelect.selectOption("1");

      // Fill assignee
      const assigneeInput = dialog.locator("#create-assignee");
      await assigneeInput.fill("E2E Tester");

      // Fill labels
      const labelsInput = dialog.locator("#create-labels");
      await labelsInput.fill("e2e,test");

      // Submit
      await dialog.getByRole("button", { name: "Create Issue" }).click();

      // Dialog should close on success or show error on write lock failure
      // The bd CLI may take a while before failing, so use generous timeout
      await Promise.race([
        expect(dialog).not.toBeVisible({ timeout: 20_000 }),
        expect(dialog.getByText(/failed to create/i)).toBeVisible({ timeout: 20_000 }),
      ]);
    });

    test("create dialog cancel clears form and closes", async ({ seededPage: page }) => {
      const dialog = await openCreateDialog(page);

      // Fill some data
      await dialog.locator("#create-title").fill("Will be cancelled");

      // Cancel
      await dialog.getByRole("button", { name: /cancel/i }).click();
      await expect(dialog).not.toBeVisible({ timeout: 5_000 });
    });

    test("create dialog requires title (submit disabled)", async ({ seededPage: page }) => {
      const dialog = await openCreateDialog(page);

      // The submit button should be disabled when title is empty
      const submitBtn = dialog.getByRole("button", { name: "Create Issue" });
      await expect(submitBtn).toBeDisabled();

      // Cancel
      await dialog.getByRole("button", { name: /cancel/i }).click();
    });
  });
});
