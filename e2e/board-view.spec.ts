import { expect, test } from "./fixtures";

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

    // Click the first visible card (data-agnostic)
    const firstCard = board.locator('[aria-roledescription="draggable issue card"]').first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();
    await page.waitForURL("**/issues/**");
  });

  test("filter bar present on board view", async ({ seededPage: page }) => {
    await page.goto("/board");
    await expect(page.getByRole("region", { name: "Kanban board" })).toBeVisible({
      timeout: 15_000,
    });

    const searchInput = page.getByPlaceholder(/search/i).first();
    await expect(searchInput).toBeVisible();
  });

  test("search filter filters cards", async ({ seededPage: page }) => {
    await page.goto("/board");
    const board = page.getByRole("region", { name: "Kanban board" });
    await expect(board).toBeVisible({ timeout: 15_000 });

    const cards = board.locator('[aria-roledescription="draggable issue card"]');
    // Verify cards exist before filtering
    await expect(cards.first()).toBeVisible();

    const searchInput = page.getByPlaceholder(/search/i).first();
    await searchInput.fill("zzz-nonexistent-e2e-term");

    // Wait for filter to take effect — poll instead of fixed timeout
    await expect
      .poll(() => cards.count(), {
        message: "Expected no cards after filtering with non-matching term",
        timeout: 5_000,
      })
      .toBe(0);
  });
});
