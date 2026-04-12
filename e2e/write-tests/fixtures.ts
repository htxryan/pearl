import { test as base, expect, type Page } from "@playwright/test";

/**
 * Shared fixtures for write-operation E2E tests.
 *
 * - `seededPage`: a Page with onboarding dismissed and the app loaded.
 *
 * Write operations go through the UI -> API -> backend write queue -> bd CLI.
 * The backend manages its own bd CLI serialization, so UI-driven writes work
 * as long as nothing else tries to use bd concurrently.
 */
export const test = base.extend<{
  seededPage: Page;
}>({
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

/**
 * Navigate to the first issue's detail view from the list.
 * Returns the issue ID extracted from the URL.
 */
export async function navigateToFirstIssue(page: Page): Promise<string> {
  const table = page.getByRole("table", { name: "Issue list" });
  await expect(table).toBeVisible({ timeout: 15_000 });
  const firstRow = table.locator("tbody tr").first();
  await firstRow.locator("td").nth(2).click();
  await page.waitForURL("**/issues/**");
  const url = page.url();
  return url.split("/issues/")[1];
}

/**
 * Navigate to a specific issue's detail view by its ID.
 */
export async function navigateToIssue(page: Page, id: string): Promise<void> {
  await page.goto(`/issues/${id}`);
  await expect(page.getByLabel("Breadcrumb")).toBeVisible({ timeout: 15_000 });
}

/**
 * Wait for a toast notification with the given text pattern.
 * Toasts use role="status" inside an aria-live region.
 */
export async function expectToast(page: Page, textPattern: string | RegExp, timeout = 10_000) {
  const toastRegion = page.getByLabel("Notifications");
  const toast = toastRegion.getByRole("status").filter({ hasText: textPattern });
  await expect(toast).toBeVisible({ timeout });
  return toast;
}
