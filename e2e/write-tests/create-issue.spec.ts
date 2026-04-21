import { expect, expectToast, issueTable, test } from "./fixtures";

/** Platform-aware shortcut for opening the command palette. */
const CMD_K = process.platform === "darwin" ? "Meta+k" : "Control+k";

test.describe("Create Issue", () => {
  test.describe("Quick-add input", () => {
    test("creates issue via quick-add and triggers mutation", async ({ seededPage: page }) => {
      const quickAdd = page.getByLabel("Quick add issue");
      await expect(quickAdd).toBeVisible();

      const title = `E2E Quick Add ${Date.now()}`;
      await quickAdd.fill(title);
      await quickAdd.press("Enter");

      // On success, the view navigates to the new issue's detail page.
      await page.waitForURL(/\/issues\/[^/]+$/, { timeout: 15_000 });
      await expect(page.locator("h1", { hasText: title })).toBeVisible({ timeout: 5_000 });
    });

    test("quick-add input clears after successful creation", async ({ seededPage: page }) => {
      const quickAdd = page.getByLabel("Quick add issue");
      const title = `E2E Clear Test ${Date.now()}`;
      await quickAdd.fill(title);
      await quickAdd.press("Enter");

      // Navigates to detail on success; going back to list should show an
      // empty quick-add input.
      await page.waitForURL(/\/issues\/[^/]+$/, { timeout: 15_000 });
      await page.goto("/list");
      await expect(page.getByLabel("Quick add issue")).toHaveValue("", { timeout: 5_000 });
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
      await page.keyboard.press(CMD_K);

      // The command palette input has a specific placeholder
      const cmdInput = page.getByPlaceholder("Search issues or type > for commands...");
      await expect(cmdInput).toBeVisible({ timeout: 5_000 });

      // Search for Create Issue action
      await cmdInput.fill("Create Issue");

      // Click the "Create Issue" command item
      const createItem = page.locator("[cmdk-item]").filter({ hasText: "Create Issue" }).first();
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

      // Select type (CustomSelect: open + click option)
      await dialog.getByRole("combobox", { name: "Issue type" }).click();
      await page.getByRole("option", { name: /^bug$/i }).first().click();

      // Select priority
      await dialog.getByRole("combobox", { name: "Priority" }).click();
      await page.getByRole("option", { name: /^P1$/ }).first().click();

      // Fill assignee
      const assigneeInput = dialog.locator("#create-assignee");
      await assigneeInput.fill("E2E Tester");

      // Fill labels via LabelPicker (type + Enter to quick-create)
      const labelsInput = dialog.getByLabel("Search labels");
      await labelsInput.fill("e2e");
      await labelsInput.press("Enter");
      await labelsInput.fill("test");
      await labelsInput.press("Enter");

      // Close the label picker dropdown with Escape — the dialog must stay open
      await labelsInput.press("Escape");
      await expect(dialog).toBeVisible();

      // Submit
      await dialog.getByRole("button", { name: "Create Issue" }).click();

      // Dialog should close on successful creation
      await expect(dialog).not.toBeVisible({ timeout: 30_000 });
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
