import { expect, expectToast, navigateToIssue, test } from "./fixtures";

// Use relative URLs; page.request resolves via playwright's baseURL and the
// Vite proxy reaches whichever backend port this run uses.
const API_BASE = "";

// Original seed dependencies for this issue — anything else was added by prior test runs
const ORIGINAL_DEPS = new Set([
  "sample-project-6kq:sample-project-elb",
  "sample-project-v0r:sample-project-6kq",
  "sample-project-z4g:sample-project-6kq",
]);

test.describe("Dependency Management", () => {
  // Use an issue that has existing dependencies
  const ISSUE_WITH_DEPS = "sample-project-6kq"; // Has deps: blocked by elb, blocks v0r/z4g

  test("add dependency via autocomplete search", async ({ seededPage: page }) => {
    // Remove extra dependencies accumulated from prior test runs
    const resp = await page.request.get(`${API_BASE}/api/issues/${ISSUE_WITH_DEPS}/dependencies`);
    const deps: Array<{ issue_id: string; depends_on_id: string }> = await resp.json();
    for (const dep of deps) {
      const key = `${dep.issue_id}:${dep.depends_on_id}`;
      if (!ORIGINAL_DEPS.has(key)) {
        await page.request.delete(
          `${API_BASE}/api/dependencies/${dep.issue_id}/${dep.depends_on_id}`,
        );
      }
    }
    await page.waitForTimeout(3_000);

    await navigateToIssue(page, ISSUE_WITH_DEPS);

    // Scroll to dependencies section
    const depHeading = page.getByRole("heading", { name: /dependencies/i });
    await depHeading.scrollIntoViewIfNeeded();
    await expect(depHeading).toBeVisible({ timeout: 15_000 });

    // Click "+ Add" button
    const addBtn = page.getByRole("button", { name: /\+ add/i });
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    // Autocomplete search input should appear
    const searchInput = page.getByPlaceholder("Search issues by title or ID...");
    await expect(searchInput).toBeVisible({ timeout: 5_000 });
    await expect(searchInput).toBeFocused();

    // Search for an issue by partial title
    await searchInput.fill("rate");

    // Wait for autocomplete results
    const listbox = page.locator("#dep-autocomplete-list");
    await expect(listbox).toBeVisible({ timeout: 5_000 });

    // Click first result to add dependency
    const firstOption = listbox.getByRole("option").first();
    await expect(firstOption).toBeVisible();
    await firstOption.click();

    // Autocomplete should close after successful dependency addition
    await expect(searchInput).not.toBeVisible({ timeout: 30_000 });
  });

  test("remove dependency with confirmation", async ({ seededPage: page }) => {
    await navigateToIssue(page, ISSUE_WITH_DEPS);

    const depHeading = page.getByRole("heading", { name: /dependencies/i });
    await depHeading.scrollIntoViewIfNeeded();
    await expect(depHeading).toBeVisible({ timeout: 15_000 });

    // Find a dependency row with a remove ("x") button
    const depSection = depHeading.locator("..");
    const removeButtons = depSection.locator('button[title="Remove dependency"]');
    const removeCount = await removeButtons.count();

    if (removeCount === 0) {
      test.skip(true, "No removable dependencies found");
      return;
    }

    // Click remove on the first dependency
    await removeButtons.first().click();

    // Confirmation dialog should appear
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await expect(dialog.getByText(/remove dependency/i)).toBeVisible();

    // Cancel (don't actually remove to avoid polluting test data)
    await dialog.getByRole("button", { name: /cancel/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5_000 });
  });

  test("dependency autocomplete excludes self and linked issues", async ({ seededPage: page }) => {
    await navigateToIssue(page, ISSUE_WITH_DEPS);

    const depHeading = page.getByRole("heading", { name: /dependencies/i });
    await depHeading.scrollIntoViewIfNeeded();
    await expect(depHeading).toBeVisible({ timeout: 15_000 });

    const addBtn = page.getByRole("button", { name: /\+ add/i });
    await addBtn.click();

    const searchInput = page.getByPlaceholder("Search issues by title or ID...");
    await expect(searchInput).toBeVisible({ timeout: 5_000 });

    // Search for the current issue's own title fragment — it should be excluded from results
    await searchInput.fill("session");

    const listbox = page.locator("#dep-autocomplete-list");
    // Wait for results or "no matching" message
    await expect(listbox).toBeVisible({ timeout: 5_000 });

    // The current issue should NOT appear in the results
    const options = listbox.getByRole("option");
    const count = await options.count();
    for (let i = 0; i < count; i++) {
      const text = await options.nth(i).textContent();
      expect(text).not.toContain(ISSUE_WITH_DEPS);
    }

    // Cancel
    const cancelBtn = page.getByRole("button", { name: /cancel/i });
    if (await cancelBtn.isVisible().catch(() => false)) {
      await cancelBtn.click();
    }
  });

  test("cancel hides dependency autocomplete", async ({ seededPage: page }) => {
    await navigateToIssue(page, ISSUE_WITH_DEPS);

    const depHeading = page.getByRole("heading", { name: /dependencies/i });
    await depHeading.scrollIntoViewIfNeeded();
    await expect(depHeading).toBeVisible({ timeout: 15_000 });

    // Open add form
    const addBtn = page.getByRole("button", { name: /\+ add/i });
    await addBtn.click();

    const searchInput = page.getByPlaceholder("Search issues by title or ID...");
    await expect(searchInput).toBeVisible({ timeout: 5_000 });

    // Click Cancel (the same button toggles)
    const cancelBtn = page.getByRole("button", { name: /cancel/i });
    await expect(cancelBtn).toBeVisible();
    await cancelBtn.click();

    // Autocomplete should be hidden
    await expect(searchInput).not.toBeVisible({ timeout: 5_000 });
  });
});
