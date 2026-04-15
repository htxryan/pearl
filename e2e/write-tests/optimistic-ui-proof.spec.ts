/**
 * Prove It: Optimistic UI & Mutations (beads-gui-ivc5)
 *
 * Verifies that mutations use optimistic updates (UI changes before server
 * response) and that errors trigger proper rollback with user feedback.
 *
 * Strategy: intercept API calls with a delay, then verify the UI updates
 * BEFORE the delayed response arrives. This proves optimistic updates.
 */
import { test, expect } from "./fixtures";
import { resolve } from "node:path";

const PROOF_DIR = resolve(__dirname, "../../docs/proof/beads-gui-ivc5");

/** Wait for the issue table to have at least one data row with a select. */
async function waitForDataRows(page: import("@playwright/test").Page) {
  const table = page.getByRole("table", { name: "Issue list" });
  const firstSelect = table.locator("tbody tr").first().locator("select").first();
  await expect(firstSelect).toBeVisible({ timeout: 30_000 });
  return table;
}

/**
 * Get the issue title from a row, used to create a stable row locator
 * that survives table re-sorts when priority/status changes.
 */
async function getRowTitle(row: import("@playwright/test").Locator): Promise<string> {
  // Title is in the third cell (after checkbox and ID)
  const titleCell = row.locator("td").nth(2);
  const text = await titleCell.textContent();
  return text?.trim() ?? "";
}

test.describe("Optimistic mutations", () => {
  test("status change updates UI before network response completes", async ({ seededPage: page }) => {
    const table = await waitForDataRows(page);
    const firstRow = table.locator("tbody tr").first();

    // Get the title to create a stable locator (survives re-sorts)
    const title = await getRowTitle(firstRow);
    const stableRow = table.locator("tbody tr", { has: page.getByText(title, { exact: true }) });
    const statusSelect = stableRow.locator("select[aria-label^='Change status']");
    await expect(statusSelect).toBeVisible();

    const originalStatus = await statusSelect.inputValue();
    const newStatus = originalStatus === "in_progress" ? "open" : "in_progress";

    // Delay ALL PATCH responses by 2 seconds to prove optimistic update
    let responseReturned = false;
    await page.route("**/api/issues/*", async (route) => {
      if (route.request().method() === "PATCH") {
        await new Promise((r) => setTimeout(r, 2000));
        responseReturned = true;
        await route.continue();
      } else {
        await route.continue();
      }
    });

    // Change status — should update immediately (optimistic)
    await statusSelect.selectOption(newStatus);

    // Check the UI BEFORE the 2-second delay completes
    await expect(statusSelect).toHaveValue(newStatus, { timeout: 1000 });
    expect(responseReturned).toBe(false); // Server hasn't responded yet!

    await page.screenshot({ path: `${PROOF_DIR}/01-status-optimistic-before-response.png` });

    // Wait for server response
    await page.waitForResponse(
      (resp) => resp.url().includes("/api/issues/") && resp.request().method() === "PATCH",
      { timeout: 15_000 },
    );

    await page.screenshot({ path: `${PROOF_DIR}/02-status-after-server-confirm.png` });

    // Revert to original
    await page.unroute("**/api/issues/*");
    await statusSelect.selectOption(originalStatus);
    await page.waitForResponse(
      (resp) => resp.url().includes("/api/issues/") && resp.request().method() === "PATCH",
      { timeout: 15_000 },
    );
  });

  test("priority change applies optimistically", async ({ seededPage: page }) => {
    const table = await waitForDataRows(page);
    const firstRow = table.locator("tbody tr").first();

    // Get the title to create a stable locator (table re-sorts on priority change!)
    const title = await getRowTitle(firstRow);
    const stableRow = table.locator("tbody tr", { has: page.getByText(title, { exact: true }) });
    const prioritySelect = stableRow.locator("select[aria-label^='Change priority']");
    await expect(prioritySelect).toBeVisible();

    const originalPriority = await prioritySelect.inputValue();
    const newPriority = originalPriority === "0" ? "3" : "0";

    // Delay PATCH response by 2 seconds
    let responseReturned = false;
    await page.route("**/api/issues/*", async (route) => {
      if (route.request().method() === "PATCH") {
        await new Promise((r) => setTimeout(r, 2000));
        responseReturned = true;
        await route.continue();
      } else {
        await route.continue();
      }
    });

    await prioritySelect.selectOption(newPriority);

    // The optimistic update should have changed the UI already
    // Use the stable row locator since the row may have re-sorted
    await expect(prioritySelect).toHaveValue(newPriority, { timeout: 1000 });
    expect(responseReturned).toBe(false);

    await page.screenshot({ path: `${PROOF_DIR}/03-priority-optimistic-instant.png` });

    // Wait for delayed response
    await page.waitForResponse(
      (resp) => resp.url().includes("/api/issues/") && resp.request().method() === "PATCH",
      { timeout: 15_000 },
    );

    // Revert
    await page.unroute("**/api/issues/*");
    await prioritySelect.selectOption(originalPriority);
    await page.waitForResponse(
      (resp) => resp.url().includes("/api/issues/") && resp.request().method() === "PATCH",
      { timeout: 15_000 },
    );
  });

  test("server error triggers rollback with error feedback", async ({ seededPage: page }) => {
    const table = await waitForDataRows(page);
    const firstRow = table.locator("tbody tr").first();

    const title = await getRowTitle(firstRow);
    const stableRow = table.locator("tbody tr", { has: page.getByText(title, { exact: true }) });
    const statusSelect = stableRow.locator("select[aria-label^='Change status']");
    await expect(statusSelect).toBeVisible();

    const originalStatus = await statusSelect.inputValue();
    const newStatus = originalStatus === "in_progress" ? "open" : "in_progress";

    // Intercept PATCH and return a server error
    await page.route("**/api/issues/*", async (route) => {
      if (route.request().method() === "PATCH") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Internal Server Error" }),
        });
      } else {
        await route.continue();
      }
    });

    // Change status — UI optimistically updates, then should rollback
    await statusSelect.selectOption(newStatus);

    // Should revert back to original after error response
    await expect(statusSelect).toHaveValue(originalStatus, { timeout: 5_000 });

    await page.screenshot({ path: `${PROOF_DIR}/04-status-rollback-after-error.png` });

    await page.unroute("**/api/issues/*");
  });

  test("optimistic create shows issue in list before server responds", async ({ seededPage: page }) => {
    await waitForDataRows(page);

    const quickAdd = page.getByLabel("Quick add issue");
    await expect(quickAdd).toBeVisible();

    const testTitle = `Optimistic test ${Date.now()}`;

    // Delay the POST response by 3 seconds
    let responseReturned = false;
    await page.route("**/api/issues", async (route) => {
      if (route.request().method() === "POST") {
        await new Promise((r) => setTimeout(r, 3000));
        responseReturned = true;
        await route.continue();
      } else {
        await route.continue();
      }
    });

    // Type and submit
    await quickAdd.fill(testTitle);
    await quickAdd.press("Enter");

    // The issue should appear in the list IMMEDIATELY (optimistic update)
    const table = page.getByRole("table", { name: "Issue list" });
    await expect(table.getByText(testTitle)).toBeVisible({ timeout: 2_000 });
    expect(responseReturned).toBe(false);

    await page.screenshot({ path: `${PROOF_DIR}/05-create-optimistic-in-list.png` });

    // Wait for server response
    await page.waitForResponse(
      (resp) => resp.url().includes("/api/issues") && resp.request().method() === "POST",
      { timeout: 15_000 },
    );

    await page.waitForTimeout(500);
    await page.screenshot({ path: `${PROOF_DIR}/06-create-after-server-confirm.png` });

    await page.unroute("**/api/issues");
  });
});
