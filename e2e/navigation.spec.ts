import { test, expect } from "./fixtures";

test.describe("Navigation", () => {
  test("root redirects to /list", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("beads-gui-onboarding-complete", "true");
    });

    await page.goto("/");
    await page.waitForURL("**/list");
  });

  test("sidebar nav links work", async ({ seededPage: page }) => {
    // Click Board nav link
    await page.getByRole("link", { name: /board/i }).click();
    await page.waitForURL("**/board");

    // Click Graph nav link
    await page.getByRole("link", { name: /graph/i }).click();
    await page.waitForURL("**/graph");

    // Click List nav link
    await page.getByRole("link", { name: /list/i }).click();
    await page.waitForURL("**/list");
  });

  test("sidebar highlights active route", async ({ seededPage: page }) => {
    // On /list, the List link should be active
    const listLink = page.getByRole("link", { name: /list/i });
    await expect(listLink).toHaveClass(/text-primary/);

    // Navigate to board
    await page.goto("/board");
    await page.waitForURL("**/board");
    const boardLink = page.getByRole("link", { name: /board/i });
    await expect(boardLink).toHaveClass(/text-primary/);
  });

  test("app shows Beads branding in sidebar", async ({ seededPage: page }) => {
    await expect(page.getByText("Beads")).toBeVisible();
  });

  test("header shows command palette hint", async ({ seededPage: page }) => {
    await expect(page.getByText(/command palette/i)).toBeVisible();
  });
});
