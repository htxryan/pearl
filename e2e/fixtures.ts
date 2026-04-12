import { test as base, expect, type Page } from "@playwright/test";

/**
 * Shared fixtures for E2E tests.
 *
 * - `seededPage`: a Page with onboarding dismissed and the app loaded.
 * - `apiUrl`: base URL for the backend API.
 *
 * NOTE: Write operations (POST/PATCH/DELETE) are unavailable because
 * the bd CLI cannot write while the Dolt SQL server holds the embedded
 * lock. All tests work with the existing data set (100+ issues).
 */
export const test = base.extend<{
  seededPage: Page;
  apiUrl: string;
}>({
  apiUrl: ["http://127.0.0.1:3456/api", { option: true }],

  seededPage: async ({ page }, use) => {
    // Dismiss onboarding banner so it doesn't interfere with tests
    await page.addInitScript(() => {
      localStorage.setItem("beads-gui-onboarding-complete", "true");
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
