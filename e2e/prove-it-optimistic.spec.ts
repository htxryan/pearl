/**
 * Prove It: Optimistic mutations (beads-gui-eo8j)
 *
 * Verifies that the UI reflects status/priority changes immediately — before
 * the API response arrives — and correctly rolls back on network failure.
 */

import { expect, test } from "./fixtures";

const DATA_ROW = 'table[aria-label="Issue list"] tbody tr:has(input[type="checkbox"][aria-label])';

test.describe("Optimistic mutations", () => {
  test("status change updates UI before network responds", async ({ seededPage: page }) => {
    const firstRow = page.locator(DATA_ROW).first();
    await expect(firstRow).toBeVisible();

    // Capture the current status shown in the row's combobox trigger
    const statusCombobox = firstRow.getByRole("combobox");
    const originalStatus = await statusCombobox.textContent();
    expect(originalStatus).toBeTruthy();

    // Intercept the PATCH with a 3s delay so we can assert before it resolves
    let releaseHold!: () => void;
    const holdPromise = new Promise<void>((resolve) => {
      releaseHold = resolve;
    });
    await page.route("**/api/issues/**", async (route) => {
      if (route.request().method() === "PATCH") {
        await holdPromise; // block until we release
        await route.continue();
      } else {
        await route.continue();
      }
    });

    // Open the status combobox and pick a different status
    await statusCombobox.click();
    const listbox = page.getByRole("listbox");
    await expect(listbox).toBeVisible({ timeout: 3_000 });

    // Pick the first option that differs from the current value
    const options = listbox.getByRole("option");
    const count = await options.count();
    let clicked = false;
    for (let i = 0; i < count; i++) {
      const opt = options.nth(i);
      const text = await opt.textContent();
      if (text && !originalStatus?.includes(text.trim())) {
        await opt.click();
        clicked = true;
        break;
      }
    }
    expect(clicked).toBe(true);

    // IMMEDIATELY check that the UI reflects the new value (optimistic update)
    // The API hold is still in place — no network response has come back yet.
    const updatedStatus = await statusCombobox.textContent();
    expect(updatedStatus).not.toBe(originalStatus);

    // Release the held request and let it complete normally
    releaseHold();
    await page.unrouteAll();
  });

  test("failed status change rolls back to original value", async ({ seededPage: page }) => {
    const firstRow = page.locator(DATA_ROW).first();
    await expect(firstRow).toBeVisible();

    const statusCombobox = firstRow.getByRole("combobox");
    const originalStatus = await statusCombobox.textContent();
    expect(originalStatus).toBeTruthy();

    // Intercept PATCH and return a server error
    await page.route("**/api/issues/**", async (route) => {
      if (route.request().method() === "PATCH") {
        await route.fulfill({ status: 500, body: "Internal Server Error" });
      } else {
        await route.continue();
      }
    });

    // Change status to something different
    await statusCombobox.click();
    const listbox = page.getByRole("listbox");
    await expect(listbox).toBeVisible({ timeout: 3_000 });

    const options = listbox.getByRole("option");
    const count = await options.count();
    for (let i = 0; i < count; i++) {
      const opt = options.nth(i);
      const text = await opt.textContent();
      if (text && !originalStatus?.includes(text.trim())) {
        await opt.click();
        break;
      }
    }

    // Wait for the error toast (the mutation's onError fires)
    const errorToast = page.getByText(/failed to update/i);
    await expect(errorToast).toBeVisible({ timeout: 10_000 });

    // The optimistic update should have been rolled back to the original value
    await expect(statusCombobox).toHaveText(originalStatus!, { timeout: 5_000 });

    await page.unrouteAll();
  });

  test("priority change updates UI before network responds", async ({ seededPage: page }) => {
    const firstRow = page.locator(DATA_ROW).first();
    await expect(firstRow).toBeVisible();

    // Find the priority combobox in this row
    const priorityCombobox = firstRow.getByRole("combobox").nth(1);
    const originalPriority = await priorityCombobox.textContent();

    // Hold the PATCH response
    let releaseHold!: () => void;
    const holdPromise = new Promise<void>((resolve) => {
      releaseHold = resolve;
    });
    await page.route("**/api/issues/**", async (route) => {
      if (route.request().method() === "PATCH") {
        await holdPromise;
        await route.continue();
      } else {
        await route.continue();
      }
    });

    // Open priority picker and select a different priority
    await priorityCombobox.click();
    const listbox = page.getByRole("listbox");
    await expect(listbox).toBeVisible({ timeout: 3_000 });

    const options = listbox.getByRole("option");
    const count = await options.count();
    let clicked = false;
    for (let i = 0; i < count; i++) {
      const opt = options.nth(i);
      const text = await opt.textContent();
      if (text && !originalPriority?.includes(text.trim())) {
        await opt.click();
        clicked = true;
        break;
      }
    }
    expect(clicked).toBe(true);

    // UI should already reflect the new priority (optimistic update)
    const updatedPriority = await priorityCombobox.textContent();
    expect(updatedPriority).not.toBe(originalPriority);

    releaseHold();
    await page.unrouteAll();
  });
});
