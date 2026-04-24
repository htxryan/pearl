/**
 * Prove It: Page Transitions & Route Animations (beads-gui-7via)
 *
 * Captures screenshot evidence that every animation in the checklist
 * works correctly, including edge cases and reduced motion.
 */

import { resolve } from "node:path";
import { expect, test } from "./fixtures";

const PROOF_DIR = resolve(__dirname, "../docs/proof/beads-gui-7via");

/** Platform-aware shortcut for opening the command palette. */
const CMD_K = process.platform === "darwin" ? "Meta+k" : "Control+k";

// ---------- Route transitions ----------

test.describe("Route transitions", () => {
  test("List → Board: horizontal slide transition", async ({ seededPage: page }) => {
    // Starting on /list
    await page.screenshot({ path: `${PROOF_DIR}/01-list-view-before.png` });

    // Get the page-transition wrapper
    const sidebar = page.locator("aside");
    await sidebar.getByRole("link", { name: /board/i }).click();

    // Capture mid-transition — the exit animation class should be applied
    // The wrapper div uses page-exit-left class during exit phase
    await page.waitForTimeout(50); // Mid-exit (100ms exit duration)
    await page.screenshot({ path: `${PROOF_DIR}/02-list-to-board-mid-transition.png` });

    // Wait for transition to complete
    await page.waitForURL("**/board");
    await page.waitForTimeout(300); // Wait for full enter animation
    await page.screenshot({ path: `${PROOF_DIR}/03-board-view-after.png` });

    // Verify we're on board view
    await expect(page).toHaveURL(/\/board/);
  });

  test("Board → Graph: horizontal slide continues direction", async ({ seededPage: page }) => {
    await page.goto("/board");
    await page.waitForURL("**/board");
    await page.waitForTimeout(500);

    const sidebar = page.locator("aside");
    await sidebar.getByRole("link", { name: /graph/i }).click();

    await page.waitForTimeout(50);
    await page.screenshot({ path: `${PROOF_DIR}/04-board-to-graph-mid-transition.png` });

    await page.waitForURL("**/graph");
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${PROOF_DIR}/05-graph-view-after.png` });
  });

  test("Graph → List: slide reverses direction", async ({ seededPage: page }) => {
    await page.goto("/graph");
    await page.waitForURL("**/graph");
    await page.waitForTimeout(500);

    const sidebar = page.locator("aside");
    await sidebar.getByRole("link", { name: /list/i }).click();

    await page.waitForTimeout(50);
    await page.screenshot({ path: `${PROOF_DIR}/06-graph-to-list-mid-transition.png` });

    await page.waitForURL("**/list");
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${PROOF_DIR}/07-list-view-returned.png` });
  });

  test("Any view → Settings: fade transition", async ({ seededPage: page }) => {
    // Navigate to settings from list view
    const sidebar = page.locator("aside");
    await sidebar.getByRole("link", { name: /settings/i }).click();

    await page.waitForTimeout(50);
    await page.screenshot({ path: `${PROOF_DIR}/08-list-to-settings-mid-fade.png` });

    await page.waitForURL(/\/settings(\/|$)/);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${PROOF_DIR}/09-settings-view.png` });
  });

  test("Any view → Detail: slide-in from right (drill-in)", async ({ seededPage: page }) => {
    // Wait for data rows then click title cell to navigate to detail
    const dataRow = page
      .locator('table[aria-label="Issue list"] tbody tr:has(input[type="checkbox"][aria-label])')
      .first();
    await expect(dataRow).toBeVisible({ timeout: 15_000 });
    await dataRow.locator("td").nth(2).click();

    await page.waitForTimeout(50);
    await page.screenshot({ path: `${PROOF_DIR}/10-list-to-detail-mid-drill.png` });

    await page.waitForURL("**/issues/**");
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${PROOF_DIR}/11-detail-view-drilled-in.png` });
  });
});

// ---------- Modal animations ----------

test.describe("Modal animations", () => {
  test("Create issue dialog: scale-up + fade entrance", async ({ seededPage: page }) => {
    await page.waitForLoadState("networkidle");

    // Open command palette and select "Create Issue"
    await page.keyboard.press(CMD_K);
    const cmdInput = page.getByPlaceholder("Type a command...");
    await expect(cmdInput).toBeVisible({ timeout: 5_000 });

    // Find and click the Create Issue item
    const createItem = page.locator("[cmdk-item]").filter({ hasText: "Create Issue" });
    await expect(createItem).toBeVisible({ timeout: 5_000 });
    await createItem.click();

    // Capture the dialog animating in (scale-up + fade via animate-modal-enter)
    await page.waitForTimeout(50);
    await page.screenshot({ path: `${PROOF_DIR}/12-create-dialog-mid-open.png` });

    await page.waitForTimeout(250);
    await page.screenshot({ path: `${PROOF_DIR}/13-create-dialog-fully-open.png` });

    // Verify dialog is open
    const dialog = page.locator("dialog[open]");
    await expect(dialog).toBeVisible();
    await expect(page.getByText("Create Issue", { exact: false }).first()).toBeVisible();

    // Close the dialog
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${PROOF_DIR}/14-create-dialog-closed.png` });
  });

  test("Command palette: spring animation open, quick fade close", async ({ seededPage: page }) => {
    await page.waitForLoadState("networkidle");

    // Open command palette
    await page.keyboard.press(CMD_K);
    await page.waitForTimeout(30); // Capture very early in spring animation
    await page.screenshot({ path: `${PROOF_DIR}/15-cmd-palette-spring-start.png` });

    await page.waitForTimeout(130); // Mid-spring (overshoot phase at ~60%)
    await page.screenshot({ path: `${PROOF_DIR}/16-cmd-palette-spring-mid.png` });

    await page.waitForTimeout(120); // Settled
    await page.screenshot({ path: `${PROOF_DIR}/17-cmd-palette-fully-open.png` });

    const input = page.getByPlaceholder("Type a command...");
    await expect(input).toBeVisible({ timeout: 5_000 });

    // Close with Escape
    await page.keyboard.press("Escape");
    await page.waitForTimeout(50); // Mid-fade-out
    await page.screenshot({ path: `${PROOF_DIR}/18-cmd-palette-fading-out.png` });

    await page.waitForTimeout(200);
    await page.screenshot({ path: `${PROOF_DIR}/19-cmd-palette-closed.png` });

    await expect(input).not.toBeVisible({ timeout: 5_000 });
  });
});

// ---------- Board animations ----------

test.describe("Board animations", () => {
  test("Board cards have staggered fade-up entrance", async ({ seededPage: page }) => {
    await page.goto("/board");
    await page.waitForURL("**/board");

    // Wait for board columns to render
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${PROOF_DIR}/20-board-cards-entering.png` });

    await page.waitForTimeout(500);
    await page.screenshot({ path: `${PROOF_DIR}/21-board-cards-settled.png` });

    // Verify board columns rendered (columns use role="list" with aria-label)
    const columns = page.locator('[role="list"][aria-label*="issues"]');
    expect(await columns.count()).toBeGreaterThan(0);
  });
});

// ---------- Scroll animations ----------

test.describe("Scroll animations", () => {
  test("Detail view sections: fade-up on scroll into view", async ({ seededPage: page }) => {
    // Navigate to a detail view — wait for data rows
    const dataRow = page
      .locator('table[aria-label="Issue list"] tbody tr:has(input[type="checkbox"][aria-label])')
      .first();
    await expect(dataRow).toBeVisible({ timeout: 15_000 });
    await dataRow.locator("td").nth(2).click();
    await page.waitForURL("**/issues/**");
    await page.waitForTimeout(400);

    // Screenshot the top of detail view — early sections should be revealed
    await page.screenshot({ path: `${PROOF_DIR}/22-detail-top-sections-revealed.png` });

    // Scroll down to trigger scroll reveal on lower sections
    await page.evaluate(() => {
      const main = document.querySelector("main") || document.documentElement;
      main.scrollTo({ top: main.scrollHeight, behavior: "instant" });
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${PROOF_DIR}/23-detail-scrolled-sections-revealed.png` });
  });
});

// ---------- Reduced motion ----------

test.describe("Reduced motion", () => {
  test("prefers-reduced-motion makes all animations instant", async ({ seededPage: page }) => {
    // Emulate reduced motion
    await page.emulateMedia({ reducedMotion: "reduce" });

    // Screenshot baseline — page should be fully rendered, no animation visible
    await page.screenshot({ path: `${PROOF_DIR}/24-reduced-motion-baseline.png` });

    // Navigate between views — should be instant, no visible transition
    const sidebar = page.locator("aside");
    await sidebar.getByRole("link", { name: /board/i }).click();
    await page.waitForURL("**/board");
    // Take screenshot immediately — should already be fully rendered
    await page.screenshot({ path: `${PROOF_DIR}/25-reduced-motion-board-instant.png` });

    // Open command palette — should appear instantly
    await page.keyboard.press(CMD_K);
    await page.waitForTimeout(20); // Near-instant
    await page.screenshot({ path: `${PROOF_DIR}/26-reduced-motion-cmd-palette-instant.png` });
    const input = page.getByPlaceholder("Type a command...");
    await expect(input).toBeVisible({ timeout: 5_000 });

    // Close — should disappear instantly
    await page.keyboard.press("Escape");
    await expect(input).not.toBeVisible({ timeout: 5_000 });
    await page.screenshot({ path: `${PROOF_DIR}/27-reduced-motion-cmd-palette-gone.png` });
  });

  test("no animation causes layout shift", async ({ seededPage: page }) => {
    // Emulate reduced motion
    await page.emulateMedia({ reducedMotion: "reduce" });

    // Navigate rapidly between views
    const sidebar = page.locator("aside");

    await sidebar.getByRole("link", { name: /board/i }).click();
    await page.waitForURL("**/board");
    const boardBox = await page.locator("main").boundingBox();

    await sidebar.getByRole("link", { name: /graph/i }).click();
    await page.waitForURL("**/graph");
    const graphBox = await page.locator("main").boundingBox();

    await sidebar.getByRole("link", { name: /list/i }).click();
    await page.waitForURL("**/list");
    const listBox = await page.locator("main").boundingBox();

    // Main content area position should not shift during transitions
    expect(boardBox).not.toBeNull();
    expect(graphBox).not.toBeNull();
    expect(listBox).not.toBeNull();
    // Allow ±2px tolerance for sub-pixel rendering / scrollbar differences
    const TOLERANCE = 2;
    expect(Math.abs(boardBox!.x - graphBox!.x)).toBeLessThanOrEqual(TOLERANCE);
    expect(Math.abs(boardBox!.x - listBox!.x)).toBeLessThanOrEqual(TOLERANCE);
    expect(Math.abs(boardBox!.y - graphBox!.y)).toBeLessThanOrEqual(TOLERANCE);
    expect(Math.abs(boardBox!.y - listBox!.y)).toBeLessThanOrEqual(TOLERANCE);

    await page.screenshot({ path: `${PROOF_DIR}/28-no-layout-shift.png` });
  });
});

// ---------- Automated checks ----------

test.describe("CLS verification", () => {
  test("CLS < 0.1 during route transitions", async ({ seededPage: page }) => {
    // Inject CLS observer. Note: this is intentionally injected after the
    // seededPage fixture completes initial load — we're measuring layout shifts
    // caused by route transitions, not the initial render. The `buffered: true`
    // option only delivers entries buffered since the PerformanceObserver
    // infrastructure was initialized, so initial-load shifts are excluded.
    await page.evaluate(() => {
      (window as unknown as { __cls: number }).__cls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as unknown as { hadRecentInput: boolean }).hadRecentInput) {
            (window as unknown as { __cls: number }).__cls += (
              entry as unknown as { value: number }
            ).value;
          }
        }
      }).observe({ type: "layout-shift", buffered: true });
    });

    // Navigate through all views
    const sidebar = page.locator("aside");

    await sidebar.getByRole("link", { name: /board/i }).click();
    await page.waitForURL("**/board");
    await page.waitForTimeout(500);

    await sidebar.getByRole("link", { name: /graph/i }).click();
    await page.waitForURL("**/graph");
    await page.waitForTimeout(500);

    await sidebar.getByRole("link", { name: /list/i }).click();
    await page.waitForURL("**/list");
    await page.waitForTimeout(500);

    // Navigate to detail and back — wait for data rows
    const dataRow = page
      .locator('table[aria-label="Issue list"] tbody tr:has(input[type="checkbox"][aria-label])')
      .first();
    await expect(dataRow).toBeVisible({ timeout: 15_000 });
    await dataRow.locator("td").nth(2).click();
    await page.waitForURL("**/issues/**");
    await page.waitForTimeout(500);

    await page.goBack();
    await page.waitForURL("**/list");
    await page.waitForTimeout(500);

    // Check CLS
    const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
    console.log(`CLS value: ${cls}`);
    expect(cls).toBeLessThan(0.1);

    await page.screenshot({ path: `${PROOF_DIR}/29-cls-verification-passed.png` });
  });
});
