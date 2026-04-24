/**
 * Prove It: Optimistic mutations (beads-gui-eo8j)
 *
 * Verifies that the UI reflects status/priority changes immediately — before
 * the API response arrives — and correctly rolls back on network failure.
 */

import { expect, test } from "./fixtures";

const DATA_ROW = 'table[aria-label="Issue list"] tbody tr:has(input[type="checkbox"][aria-label])';

/** Hold all PATCH requests until the returned function is called. */
async function interceptPatch(page: import("@playwright/test").Page) {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/issues/**", async (route) => {
    if (route.request().method() === "PATCH") {
      await gate;
      await route.continue();
    } else {
      await route.continue();
    }
  });
  return release;
}

/** Pick the first listbox option that is NOT currently selected. */
async function pickDifferentOption(page: import("@playwright/test").Page) {
  const listbox = page.getByRole("listbox");
  await expect(listbox).toBeVisible({ timeout: 3_000 });
  const options = listbox.getByRole("option");
  const count = await options.count();
  for (let i = 0; i < count; i++) {
    const opt = options.nth(i);
    const selected = await opt.getAttribute("aria-selected");
    if (selected !== "true") {
      await opt.click();
      return;
    }
  }
  throw new Error("No unselected option found in listbox");
}

test.describe("Optimistic mutations", () => {
  test("status change updates UI before network responds", async ({ seededPage: page }) => {
    const firstRow = page.locator(DATA_ROW).first();
    await expect(firstRow).toBeVisible();

    const statusCombobox = firstRow.getByRole("combobox", { name: /Change status for/i });
    const originalStatus = await statusCombobox.textContent();

    const release = await interceptPatch(page);

    await statusCombobox.click();
    await pickDifferentOption(page);

    // IMMEDIATELY check the UI — PATCH is still held, no server response yet
    const updatedStatus = await statusCombobox.textContent();
    expect(updatedStatus).not.toBe(originalStatus);

    release();
    // No unrouteAll — each test has a fresh page; routes are torn down automatically.
  });

  test("failed status change rolls back to original value", async ({ seededPage: page }) => {
    const firstRow = page.locator(DATA_ROW).first();
    await expect(firstRow).toBeVisible();

    const statusCombobox = firstRow.getByRole("combobox", { name: /Change status for/i });
    const originalStatus = await statusCombobox.textContent();

    // Return a server error for the PATCH
    await page.route("**/api/issues/**", async (route) => {
      if (route.request().method() === "PATCH") {
        await route.fulfill({ status: 500, body: "Internal Server Error" });
      } else {
        await route.continue();
      }
    });

    await statusCombobox.click();
    await pickDifferentOption(page);

    // The mutation error toast should appear
    const errorToast = page.getByText(/failed to update/i);
    await expect(errorToast).toBeVisible({ timeout: 10_000 });

    // After rollback the combobox should show the original value again
    await expect(statusCombobox).toHaveText(originalStatus!, { timeout: 5_000 });
  });

  test("priority change updates UI before network responds", async ({ seededPage: page }) => {
    const firstRow = page.locator(DATA_ROW).first();
    await expect(firstRow).toBeVisible();

    const priorityCombobox = firstRow.getByRole("combobox", { name: /Change priority for/i });
    const originalPriority = await priorityCombobox.textContent();

    const release = await interceptPatch(page);

    await priorityCombobox.click();
    await pickDifferentOption(page);

    // IMMEDIATELY check — PATCH still held
    const updatedPriority = await priorityCombobox.textContent();
    expect(updatedPriority).not.toBe(originalPriority);

    release();
    // No unrouteAll — each test has a fresh page; routes are torn down automatically.
  });
});
