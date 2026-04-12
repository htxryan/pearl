import { test, expect, createTestIssue, deleteTestIssue } from "./fixtures";

test.describe("Dependency Autocomplete", () => {
  let parentId: string;
  let childId: string;

  test.beforeEach(async ({ seededPage: page }) => {
    parentId = await createTestIssue(page, { title: `E2E-Parent-${Date.now()}` });
    childId = await createTestIssue(page, { title: `E2E-Child-${Date.now()}` });
  });

  test.afterEach(async ({ seededPage: page }) => {
    await deleteTestIssue(page, parentId);
    await deleteTestIssue(page, childId);
  });

  test("add dependency via autocomplete search", async ({ seededPage: page }) => {
    await page.goto(`/issues/${parentId}`);
    await expect(page.getByText("Dependencies")).toBeVisible({ timeout: 15_000 });

    // Click "+ Add" button
    const addBtn = page.getByRole("button", { name: /\+ add/i });
    await addBtn.click();

    // Autocomplete input should appear
    const searchInput = page.getByPlaceholder("Search issues by title or ID...");
    await expect(searchInput).toBeVisible();

    // Type the child issue title
    await searchInput.fill("E2E-Child-");

    // Wait for dropdown results
    const dropdown = page.locator("#dep-autocomplete-list");
    await expect(dropdown).toBeVisible({ timeout: 10_000 });

    // Click on the child issue in the dropdown
    await dropdown.getByText("E2E-Child-").first().click();

    // Dependency should now appear in the list
    await expect(page.getByText(childId)).toBeVisible({ timeout: 5_000 });
  });

  test("dependency autocomplete shows search results", async ({ seededPage: page }) => {
    await page.goto(`/issues/${parentId}`);
    await expect(page.getByText("Dependencies")).toBeVisible({ timeout: 15_000 });

    const addBtn = page.getByRole("button", { name: /\+ add/i });
    await addBtn.click();

    const searchInput = page.getByPlaceholder("Search issues by title or ID...");
    await searchInput.fill("E2E");

    // Should show results
    const dropdown = page.locator("#dep-autocomplete-list");
    await expect(dropdown).toBeVisible({ timeout: 10_000 });

    // Should have at least one option
    const options = dropdown.getByRole("option");
    await expect(options.first()).toBeVisible();
  });
});
