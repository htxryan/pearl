import { test as base, expect, type Page } from "@playwright/test";

/** Selector for a data-loaded row (skeleton rows don't have aria-label on checkboxes). */
const DATA_ROW = 'table[aria-label="Issue list"] tbody tr:has(input[type="checkbox"][aria-label])';

/**
 * Shared fixtures for read-only E2E tests.
 *
 * - `seededPage`: a Page with onboarding dismissed and the app loaded.
 *
 * These tests work with the existing seed data set. Write operations
 * are tested separately in the write-tests project.
 */
export const test = base.extend<{
  seededPage: Page;
}>({
  seededPage: async ({ page }, use) => {
    // Dismiss onboarding banner and suppress migration modal for read-only tests
    await page.addInitScript(() => {
      localStorage.setItem("pearl-onboarding-complete", "true");
      (window as any).__PEARL_TEST_SUPPRESS_MIGRATION_MODAL__ = true;
    });

    // Navigate to app root (redirects to /list)
    await page.goto("/");
    await page.waitForURL("**/list");

    // Wait for data to actually load (not just skeleton rows)
    await page.waitForSelector(DATA_ROW, { timeout: 15_000 });

    await use(page);
  },
});

export { expect };

/** Get the issue table locator (strict). */
export function issueTable(page: Page) {
  return page.getByRole("table", { name: "Issue list" });
}

/**
 * Navigate to the first issue's detail view from the list.
 * Returns the issue ID extracted from the URL.
 */
export async function navigateToFirstIssue(page: Page): Promise<string> {
  // Ensure data rows are present
  await page.waitForSelector(DATA_ROW, { timeout: 15_000 });
  // Click the title cell (nth(2)) — avoid checkbox (nth(0)) which has stopPropagation
  const firstDataRow = page.locator(DATA_ROW).first();
  await firstDataRow.locator("td").nth(2).click();
  await page.waitForURL("**/issues/**", { timeout: 10_000 });
  const url = page.url();
  return url.split("/issues/")[1];
}
