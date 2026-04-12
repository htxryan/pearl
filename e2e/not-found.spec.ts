import { test, expect } from "./fixtures";

test.describe("404 Page", () => {
  test("shows 404 page for invalid route", async ({ page }) => {
    // Dismiss onboarding
    await page.addInitScript(() => {
      localStorage.setItem("beads-gui-onboarding-complete", "true");
    });

    await page.goto("/some-invalid-route");

    // Should show the 404 page content
    await expect(page.getByText("404")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Page not found")).toBeVisible();
  });

  test("404 page has navigation buttons", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("beads-gui-onboarding-complete", "true");
    });

    await page.goto("/does-not-exist");
    await expect(page.getByText("404")).toBeVisible({ timeout: 10_000 });

    // Should have buttons to navigate to views
    await expect(page.getByRole("button", { name: "List View" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Board View" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Graph View" })).toBeVisible();
  });

  test("404 navigation button goes to list view", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("beads-gui-onboarding-complete", "true");
    });

    await page.goto("/nope");
    await expect(page.getByText("404")).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: "List View" }).click();
    await page.waitForURL("**/list");
  });
});
