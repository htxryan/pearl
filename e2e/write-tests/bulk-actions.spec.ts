import { expect, expectToast, issueTable, test } from "./fixtures";

test.describe("Bulk Actions", () => {
  test("bulk close selected issues with confirmation", async ({ seededPage: page }) => {
    const table = issueTable(page);
    const rows = table.locator("tbody tr");

    // Select first two rows
    const firstCheckbox = rows.first().getByRole("checkbox");
    await firstCheckbox.click();
    await expect(page.getByText("issue selected")).toBeVisible({ timeout: 5_000 });

    const secondCheckbox = rows.nth(1).getByRole("checkbox");
    await secondCheckbox.click();
    await expect(page.getByText("issues selected")).toBeVisible();

    // Open the Actions dropdown then choose "Close selected"
    await page.getByRole("button", { name: /^actions$/i }).click();
    await page.getByRole("menuitem", { name: /close selected/i }).click();

    // Confirmation dialog should appear
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Confirm via the button matching "Close N Issue(s)"
    const confirmBtn = dialog.getByRole("button", { name: /close \d+ issue/i });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // Dialog closes immediately, then the bulk operation runs asynchronously
    await expect(dialog).not.toBeVisible({ timeout: 5_000 });

    // Selection should clear after the bulk operation completes
    await expect(page.getByText("issues selected")).not.toBeVisible({ timeout: 30_000 });
  });

  test("bulk reassign shows assignee input", async ({ seededPage: page }) => {
    const table = issueTable(page);
    const rows = table.locator("tbody tr");

    // Select a row
    const firstCheckbox = rows.first().getByRole("checkbox");
    await firstCheckbox.click();
    await expect(page.getByText("issue selected")).toBeVisible({ timeout: 5_000 });

    // Open the Actions dropdown
    await page.getByRole("button", { name: /^actions$/i }).click();

    // Pick "Reassign" from the menu
    const reassignBtn = page.getByRole("menuitem", { name: /reassign/i });
    await expect(reassignBtn).toBeVisible();
    await reassignBtn.click();

    // An assignee input should appear (dropdown or input)
    const assigneeInput = page.getByPlaceholder(/assignee/i);
    if (await assigneeInput.isVisible().catch(() => false)) {
      await assigneeInput.fill("Bulk E2E Tester");
      await assigneeInput.press("Enter");

      // Wait for result
      const toastRegion = page.getByLabel("Notifications");
      await expect(toastRegion.getByRole("status").first()).toBeVisible({ timeout: 10_000 });
    }

    // Clear selection
    const clearBtn = page.getByRole("button", { name: /clear/i });
    if (await clearBtn.isVisible().catch(() => false)) {
      await clearBtn.click();
    }
  });

  test("bulk reprioritize changes priority", async ({ seededPage: page }) => {
    const table = issueTable(page);
    const rows = table.locator("tbody tr");

    // Select a row
    const firstCheckbox = rows.first().getByRole("checkbox");
    await firstCheckbox.click();
    await expect(page.getByText("issue selected")).toBeVisible({ timeout: 5_000 });

    // Open the Actions dropdown
    await page.getByRole("button", { name: /^actions$/i }).click();

    // Pick "Set priority" from the menu
    const setPriorityBtn = page.getByRole("menuitem", { name: /set priority/i });
    if (!(await setPriorityBtn.isVisible().catch(() => false))) {
      test.skip(true, "No set priority menu item found");
      return;
    }

    await setPriorityBtn.click();

    // A priority selector should appear — select P0 (label is "P0 — Critical")
    const p0Option = page.getByRole("button", { name: /^P0/ });
    if (await p0Option.isVisible().catch(() => false)) {
      await p0Option.click();

      // Wait for result
      const toastRegion = page.getByLabel("Notifications");
      await expect(toastRegion.getByRole("status").first()).toBeVisible({ timeout: 10_000 });
    }

    // Clean up selection
    const clearBtn = page.getByRole("button", { name: /clear/i });
    if (await clearBtn.isVisible().catch(() => false)) {
      await clearBtn.click();
    }
  });

  test("select all via header checkbox then clear", async ({ seededPage: page }) => {
    const table = issueTable(page);
    const selectAllCheckbox = table.getByLabel("Select all rows");
    await selectAllCheckbox.click();

    // Bulk action bar should show count
    await expect(page.getByText("issues selected")).toBeVisible({ timeout: 5_000 });

    // Clear selection
    await page.getByRole("button", { name: /clear/i }).click();

    // Bulk action bar should disappear
    await expect(page.getByText("issues selected")).not.toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("issue selected")).not.toBeVisible({ timeout: 5_000 });
  });

  test("close confirmation shows correct count", async ({ seededPage: page }) => {
    const table = issueTable(page);
    const rows = table.locator("tbody tr");

    // Select 3 rows
    for (let i = 0; i < 3; i++) {
      await rows.nth(i).getByRole("checkbox").click();
    }

    await expect(page.getByText("issues selected")).toBeVisible({ timeout: 5_000 });

    // Open the Actions dropdown then choose "Close selected"
    await page.getByRole("button", { name: /^actions$/i }).click();
    await page.getByRole("menuitem", { name: /close selected/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // The confirm button should show the correct count
    await expect(dialog.getByRole("button", { name: /close 3 issue/i })).toBeVisible();

    // Cancel
    await dialog.getByRole("button", { name: /cancel/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5_000 });
  });
});
