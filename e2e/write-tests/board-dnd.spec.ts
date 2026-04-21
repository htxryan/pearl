import { expect, expectToast, test } from "./fixtures";

test.describe("Board Drag-and-Drop", () => {
  test("board columns are visible", async ({ seededPage: page }) => {
    await page.goto("/board");
    const board = page.getByRole("region", { name: "Kanban board" });
    await expect(board).toBeVisible({ timeout: 15_000 });

    // Blocked is no longer a settable status (derived from dependencies),
    // so the board renders 4 columns. Use list aria-labels to avoid matching
    // "Blocked" badges inside issue cards.
    await expect(board.getByRole("list", { name: /open issues/i })).toBeVisible();
    await expect(board.getByRole("list", { name: /in_progress issues/i })).toBeVisible();
    await expect(board.getByRole("list", { name: /closed issues/i })).toBeVisible();
    await expect(board.getByRole("list", { name: /deferred issues/i })).toBeVisible();
  });

  test("dragging card between columns updates status", async ({ seededPage: page }) => {
    await page.goto("/board");
    const board = page.getByRole("region", { name: "Kanban board" });
    await expect(board).toBeVisible({ timeout: 15_000 });

    // Find the "Open" column card list
    const openColumnList = board.getByRole("list", { name: /open issues/i });
    await expect(openColumnList).toBeVisible();

    // Get a card from the Open column
    const cards = openColumnList.locator('[aria-roledescription="draggable issue card"]');
    const cardCount = await cards.count();
    if (cardCount === 0) {
      test.skip(true, "No cards in Open column");
      return;
    }

    const firstCard = cards.first();
    await expect(firstCard).toBeVisible();

    // Get card bounding box for drag coordinates
    const cardBox = await firstCard.boundingBox();
    if (!cardBox) {
      test.skip(true, "Could not get card bounding box");
      return;
    }

    // Find the "In Progress" column to drop onto
    const inProgressList = board.getByRole("list", { name: /in_progress issues/i });
    const targetBox = await inProgressList.boundingBox();
    if (!targetBox) {
      test.skip(true, "Could not get In Progress column bounding box");
      return;
    }

    // Record original card count in In Progress
    const inProgressCards = inProgressList.locator('[aria-roledescription="draggable issue card"]');
    const inProgressCountBefore = await inProgressCards.count();

    // Perform drag from card center to target column center
    const startX = cardBox.x + cardBox.width / 2;
    const startY = cardBox.y + cardBox.height / 2;
    const endX = targetBox.x + targetBox.width / 2;
    const endY = targetBox.y + targetBox.height / 2;

    // Execute drag with proper mouse events
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    // Move slowly to trigger drag detection (requires >5px movement per sensor config)
    await page.mouse.move(startX + 10, startY, { steps: 5 });
    await page.mouse.move(endX, endY, { steps: 20 });
    await page.mouse.up();

    // Card should have moved to In Progress column (auto-retries until timeout)
    await expect(inProgressCards).toHaveCount(inProgressCountBefore + 1, { timeout: 5_000 });
  });

  test("quick-add from board column creates issue", async ({ seededPage: page }) => {
    await page.goto("/board");
    const board = page.getByRole("region", { name: "Kanban board" });
    await expect(board).toBeVisible({ timeout: 15_000 });

    // Find quick-add input in the "Open" column
    const quickAdd = page.getByLabel(/quick add issue to open/i);
    await expect(quickAdd).toBeVisible();

    const title = `Board Quick Add ${Date.now()}`;
    await quickAdd.fill(title);
    await quickAdd.press("Enter");

    // Verify success toast appears
    await expectToast(page, /Created/, 15_000);
  });

  // Removed: "cannot drag to blocked column" — Blocked is no longer a settable
  // status or a kanban column; it is derived from open dependencies, so there
  // is no blocked drop target to test against.
});
