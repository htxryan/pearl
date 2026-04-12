import { test, expect, navigateToFirstIssue } from "./fixtures";

test.describe("Dependency Autocomplete", () => {
  test("dependencies section heading shows on detail view", async ({ seededPage: page }) => {
    await navigateToFirstIssue(page);
    const heading = page.getByRole("heading", { name: /dependencies/i });
    await heading.scrollIntoViewIfNeeded();
    await expect(heading).toBeVisible({ timeout: 15_000 });
  });

  test("+ Add button reveals autocomplete search input", async ({ seededPage: page }) => {
    await navigateToFirstIssue(page);
    const heading = page.getByRole("heading", { name: /dependencies/i });
    await heading.scrollIntoViewIfNeeded();
    await expect(heading).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: /\+ add/i }).click();

    const searchInput = page.getByPlaceholder("Search issues by title or ID...");
    await expect(searchInput).toBeVisible();
  });

  test("autocomplete shows results when typing", async ({ seededPage: page }) => {
    await navigateToFirstIssue(page);
    const heading = page.getByRole("heading", { name: /dependencies/i });
    await heading.scrollIntoViewIfNeeded();
    await expect(heading).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: /\+ add/i }).click();

    const searchInput = page.getByPlaceholder("Search issues by title or ID...");
    // Search for a term that matches multiple issues in the sample dataset
    await searchInput.fill("rate");

    const dropdown = page.locator("#dep-autocomplete-list");
    await expect(dropdown).toBeVisible({ timeout: 15_000 });

    const options = dropdown.getByRole("option");
    await expect(options.first()).toBeVisible({ timeout: 10_000 });
  });

  test("autocomplete has combobox ARIA attributes", async ({ seededPage: page }) => {
    await navigateToFirstIssue(page);
    const heading = page.getByRole("heading", { name: /dependencies/i });
    await heading.scrollIntoViewIfNeeded();

    await page.getByRole("button", { name: /\+ add/i }).click();

    const searchInput = page.getByPlaceholder("Search issues by title or ID...");
    await expect(searchInput).toHaveAttribute("role", "combobox");
    await expect(searchInput).toHaveAttribute("aria-autocomplete", "list");
  });

  test("cancel button hides the autocomplete", async ({ seededPage: page }) => {
    await navigateToFirstIssue(page);
    const heading = page.getByRole("heading", { name: /dependencies/i });
    await heading.scrollIntoViewIfNeeded();

    await page.getByRole("button", { name: /\+ add/i }).click();
    await expect(page.getByPlaceholder("Search issues by title or ID...")).toBeVisible();

    await page.getByRole("button", { name: /cancel/i }).click();
    await expect(page.getByPlaceholder("Search issues by title or ID...")).not.toBeVisible();
  });
});
