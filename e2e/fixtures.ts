import { test as base, expect, type Page } from "@playwright/test";

/**
 * Shared fixtures for E2E tests.
 *
 * - `seededPage`: a Page with onboarding dismissed and the app loaded.
 * - `apiUrl`: base URL for the backend API.
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
    await expect(page.getByLabel("Issue list")).toBeVisible({ timeout: 15_000 });

    await use(page);
  },
});

export { expect };

/**
 * Create a test issue via the API and return its ID.
 */
export async function createTestIssue(
  page: Page,
  data: { title: string; description?: string; priority?: number; issue_type?: string; status?: string },
): Promise<string> {
  const response = await page.request.post("/api/issues", { data });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  return body.data.id;
}

/**
 * Clean up a test issue via the API.
 */
export async function deleteTestIssue(page: Page, id: string): Promise<void> {
  await page.request.delete(`/api/issues/${id}?reason=e2e-cleanup`);
}
