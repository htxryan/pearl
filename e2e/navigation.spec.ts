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
    // Click Board link in sidebar nav
    const sidebar = page.locator("aside");
    await sidebar.getByRole("link", { name: /board/i }).click();
    await page.waitForURL("**/board");

    await sidebar.getByRole("link", { name: /graph/i }).click();
    await page.waitForURL("**/graph");

    await sidebar.getByRole("link", { name: /list/i }).click();
    await page.waitForURL("**/list");
  });

  test("sidebar highlights active route", async ({ seededPage: page }) => {
    const sidebar = page.locator("aside");
    // On /list, the List link should be highlighted
    const listLink = sidebar.getByRole("link", { name: /list/i });
    await expect(listLink).toHaveClass(/text-primary/);

    // Navigate to board
    await page.goto("/board");
    await page.waitForURL("**/board");
    const boardLink = sidebar.getByRole("link", { name: /board/i });
    await expect(boardLink).toHaveClass(/text-primary/);
  });

  test("sidebar shows Beads branding", async ({ seededPage: page }) => {
    const sidebar = page.locator("aside");
    await expect(sidebar.getByText("Beads")).toBeVisible();
  });

  test("header shows command palette hint", async ({ seededPage: page }) => {
    const header = page.locator("header");
    await expect(header.getByText(/command palette/i)).toBeVisible();
  });
});
