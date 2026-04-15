import { test as base, expect, type Page } from "@playwright/test";

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
    // Dismiss onboarding banner so it doesn't interfere with tests
    await page.addInitScript(() => {
      localStorage.setItem("pearl-onboarding-complete", "true");
    });

    // Navigate to app root (redirects to /list)
    await page.goto("/");
    await page.waitForURL("**/list");

    // Wait for the issue table to be visible (data loaded)
    await expect(page.getByRole("table", { name: "Issue list" })).toBeVisible({ timeout: 15_000 });

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
  const table = page.getByRole("table", { name: "Issue list" });
  await expect(table).toBeVisible({ timeout: 15_000 });
  const firstRow = table.locator("tbody tr").first();
  await firstRow.click();
  await page.waitForURL("**/issues/**");
  const url = page.url();
  return url.split("/issues/")[1];
}
