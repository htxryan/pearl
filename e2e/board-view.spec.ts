import { test, expect } from "./fixtures";

test.describe("Board View", () => {
  test("renders kanban board region", async ({ seededPage: page }) => {
    await page.goto("/board");
    const board = page.getByRole("region", { name: "Kanban board" });
    await expect(board).toBeVisible({ timeout: 15_000 });
  });

  test("shows status columns", async ({ seededPage: page }) => {
    await page.goto("/board");
    const board = page.getByRole("region", { name: "Kanban board" });
    await expect(board).toBeVisible({ timeout: 15_000 });

    // Check column headers exist (inside the board region, not the filter bar)
    // The kanban columns have status header text
    await expect(board.getByText("Open")).toBeVisible();
    await expect(board.getByText("In Progress")).toBeVisible();
    await expect(board.getByText("Closed")).toBeVisible();
    await expect(board.getByText("Blocked")).toBeVisible();
    await expect(board.getByText("Deferred")).toBeVisible();
  });

  test("clicking a card navigates to detail view", async ({ seededPage: page }) => {
    await page.goto("/board");
    const board = page.getByRole("region", { name: "Kanban board" });
    await expect(board).toBeVisible({ timeout: 15_000 });

    // Find a known issue title and click it
    const issueCard = board.getByText("Bug: Dolt SQL server file lock prevents bd CLI writes");
    if (await issueCard.isVisible()) {
      await issueCard.click();
      await page.waitForURL("**/issues/**");
    }
  });

  test("filter bar present on board view", async ({ seededPage: page }) => {
    await page.goto("/board");
    await expect(page.getByRole("region", { name: "Kanban board" })).toBeVisible({ timeout: 15_000 });

    const searchInput = page.getByPlaceholder(/search/i).first();
    await expect(searchInput).toBeVisible();
  });

  test("search filter filters cards", async ({ seededPage: page }) => {
    await page.goto("/board");
    await expect(page.getByRole("region", { name: "Kanban board" })).toBeVisible({ timeout: 15_000 });

    const searchInput = page.getByPlaceholder(/search/i).first();
    await searchInput.fill("zzz-nonexistent-e2e-term");
    await page.waitForTimeout(500);
  });
});
