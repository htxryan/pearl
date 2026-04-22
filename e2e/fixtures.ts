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
 * Navigate to the first issue's full detail page.
 * Uses the data-issue-id attribute on the row to avoid waiting for URL-based navigation
 * (row clicks now open an in-place panel rather than navigating).
 * Returns the issue ID.
 */
export async function navigateToFirstIssue(page: Page): Promise<string> {
  await page.waitForSelector(DATA_ROW, { timeout: 15_000 });
  const firstDataRow = page.locator(DATA_ROW).first();
  const issueId = await firstDataRow.getAttribute("data-issue-id");
  if (!issueId) throw new Error("Row missing data-issue-id attribute");
  await page.goto(`/issues/${issueId}`);
  await page.waitForURL(`**/issues/${issueId}`, { timeout: 10_000 });
  return issueId;
}
