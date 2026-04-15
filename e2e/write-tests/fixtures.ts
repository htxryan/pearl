import { test as base, expect, type Page } from "@playwright/test";

/** Selector for a data-loaded row (skeleton rows don't have aria-label on checkboxes). */
const DATA_ROW = 'table[aria-label="Issue list"] tbody tr:has(input[type="checkbox"][aria-label])';

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
      localStorage.setItem("pearl-onboarding-complete", "true");
    });

    // Navigate to app root (redirects to /list)
    await page.goto("/");
    await page.waitForURL("**/list");

    // Wait for data to actually load (not just skeleton rows)
    await page.waitForSelector(DATA_ROW, { timeout: 30_000 });

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
  await page.waitForSelector(DATA_ROW, { timeout: 30_000 });
  const firstDataRow = page.locator(DATA_ROW).first();
  await firstDataRow.locator("td").nth(2).click();
  await page.waitForURL("**/issues/**", { timeout: 15_000 });
  const url = page.url();
  return url.split("/issues/")[1];
}

/**
 * Navigate to a specific issue's detail view by its ID.
 * Retries on transient connection errors that can occur while the
 * embedded Dolt server restarts during replica sync after a write.
 */
export async function navigateToIssue(page: Page, id: string): Promise<void> {
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    await page.goto(`/issues/${id}`);
    const breadcrumb = page.getByLabel("Breadcrumb");
    const errorText = page.getByText("Issue not found");
    const result = await Promise.race([
      breadcrumb.waitFor({ state: "visible", timeout: 15_000 }).then(() => "ok" as const),
      errorText.waitFor({ state: "visible", timeout: 15_000 }).then(() => "error" as const),
    ]).catch(() => "timeout" as const);

    if (result === "ok") return;

    if (attempt < maxRetries) {
      // Wait for replica sync to complete before retrying
      await page.waitForTimeout(3_000);
    }
  }
  // Final attempt — assert normally so Playwright reports the actual failure
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
