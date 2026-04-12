import { test, expect } from "./fixtures";

test.describe("Onboarding", () => {
  test("banner appears for new users (no localStorage)", async ({ page }) => {
    // Don't set the onboarding-complete flag
    await page.goto("/");
    await page.waitForURL("**/list");

    // Wait for the app to load
    await expect(page.getByLabel("Issue list")).toBeVisible({ timeout: 15_000 });

    // Onboarding banner should be visible
    await expect(page.getByText("Welcome to Beads")).toBeVisible();
    await expect(page.getByText("Step 1 of 5")).toBeVisible();
  });

  test("clicking Next progresses through steps", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL("**/list");
    await expect(page.getByLabel("Issue list")).toBeVisible({ timeout: 15_000 });

    await expect(page.getByText("Step 1 of 5")).toBeVisible();

    // Click Next
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("Step 2 of 5")).toBeVisible();

    // Click Next again
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("Step 3 of 5")).toBeVisible();
  });

  test("clicking Skip dismisses the banner", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL("**/list");
    await expect(page.getByLabel("Issue list")).toBeVisible({ timeout: 15_000 });

    await expect(page.getByText("Welcome to Beads")).toBeVisible();

    // Click Skip
    await page.getByRole("button", { name: "Skip" }).click();

    // Banner should disappear
    await expect(page.getByText("Welcome to Beads")).not.toBeVisible({ timeout: 3_000 });
  });

  test("dismissal persists after page reload", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL("**/list");
    await expect(page.getByLabel("Issue list")).toBeVisible({ timeout: 15_000 });

    // Skip onboarding
    await page.getByRole("button", { name: "Skip" }).click();
    await expect(page.getByText("Welcome to Beads")).not.toBeVisible({ timeout: 3_000 });

    // Reload
    await page.reload();
    await expect(page.getByLabel("Issue list")).toBeVisible({ timeout: 15_000 });

    // Banner should still be hidden
    await expect(page.getByText("Welcome to Beads")).not.toBeVisible();
  });

  test("completing all steps dismisses the banner", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL("**/list");
    await expect(page.getByLabel("Issue list")).toBeVisible({ timeout: 15_000 });

    // Click through all 5 steps
    for (let i = 0; i < 4; i++) {
      await page.getByRole("button", { name: "Next" }).click();
    }

    // Last step should show "Get started" button
    await expect(page.getByRole("button", { name: "Get started" })).toBeVisible();
    await page.getByRole("button", { name: "Get started" }).click();

    // Banner should disappear
    await expect(page.getByText("Welcome to Beads")).not.toBeVisible({ timeout: 3_000 });
  });
});
