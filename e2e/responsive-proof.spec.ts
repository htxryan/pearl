/**
 * Prove It: Mobile & Responsive Layout Verification
 * Epic: beads-gui-idt3
 *
 * Captures screenshot evidence at multiple viewports for every responsive
 * feature listed in the verification checklist.
 */
import { test, expect, type Page } from "@playwright/test";
import { resolve } from "node:path";

const PROOF_DIR = resolve(__dirname, "../docs/proof/beads-gui-idt3");

const VIEWPORTS = {
  mobile: { width: 375, height: 812 },
  small_mobile: { width: 320, height: 568 },
  tablet: { width: 768, height: 1024 },
  desktop_sm: { width: 1024, height: 768 },
  desktop_lg: { width: 1440, height: 900 },
};

/** Seed localStorage and navigate; call AFTER setViewportSize. */
async function seedAndNavigate(page: Page, path: string) {
  await page.addInitScript(() => {
    localStorage.setItem("beads-gui-onboarding-complete", "true");
  });
  await page.goto(path);
}

// ─── Sidebar Responsiveness ─────────────────────────────

test.describe("Sidebar responsiveness", () => {
  test("375px: sidebar hidden, hamburger visible", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await seedAndNavigate(page, "/list");
    await expect(
      page.getByRole("list", { name: "Issues" }).or(page.getByRole("table", { name: "Issue list" })),
    ).toBeVisible({ timeout: 15_000 });

    // Sidebar nav should NOT be visible on mobile
    await expect(page.locator("aside").filter({ hasText: "Beads" }).first()).not.toBeVisible();
    await expect(page.getByLabel("Open navigation menu")).toBeVisible();

    await page.screenshot({ path: `${PROOF_DIR}/sidebar-375-hamburger.png`, fullPage: false });
  });

  test("375px: hamburger opens drawer with nav items", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await seedAndNavigate(page, "/list");
    await expect(page.getByRole("list", { name: "Issues" })).toBeVisible({ timeout: 15_000 });

    // Open the drawer
    await page.getByLabel("Open navigation menu").click();
    await expect(page.getByRole("dialog", { name: "Navigation menu" })).toBeVisible();

    // Verify nav items exist in drawer
    await expect(page.getByRole("link", { name: "List" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Board" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Graph" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Settings" })).toBeVisible();

    await page.screenshot({ path: `${PROOF_DIR}/sidebar-375-drawer-open.png`, fullPage: false });

    // Close drawer
    await page.getByLabel("Close navigation menu").click();
    await expect(page.getByRole("dialog", { name: "Navigation menu" })).not.toBeVisible();
  });

  test("768px: sidebar visible, no hamburger", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.tablet);
    await seedAndNavigate(page, "/list");
    await expect(page.getByRole("table", { name: "Issue list" })).toBeVisible({ timeout: 15_000 });

    // Sidebar visible at 768px
    await expect(page.locator("aside").filter({ hasText: "Beads" }).first()).toBeVisible();
    // Hamburger should NOT be visible
    await expect(page.getByLabel("Open navigation menu")).not.toBeVisible();

    await page.screenshot({ path: `${PROOF_DIR}/sidebar-768-visible.png`, fullPage: false });
  });
});

// ─── List View Mobile ───────────────────────────────────

test.describe("List view mobile", () => {
  test("375px: table transforms to card list", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await seedAndNavigate(page, "/list");
    await expect(page.getByRole("list", { name: "Issues" })).toBeVisible({ timeout: 15_000 });

    // Table should NOT be visible on mobile
    await expect(page.getByRole("table", { name: "Issue list" })).not.toBeVisible();

    // Card list should be visible
    const cardList = page.getByRole("list", { name: "Issues" });
    await expect(cardList).toBeVisible();

    // Verify cards show: title, status, priority
    const firstCard = cardList.getByRole("listitem").first();
    await expect(firstCard).toBeVisible();

    await page.screenshot({ path: `${PROOF_DIR}/list-375-card-layout.png`, fullPage: false });
  });

  test("375px: card is tappable to open detail", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await seedAndNavigate(page, "/list");
    await expect(page.getByRole("list", { name: "Issues" })).toBeVisible({ timeout: 15_000 });

    const cardList = page.getByRole("list", { name: "Issues" });
    const firstCard = cardList.getByRole("listitem").first().locator("button");
    await firstCard.click();

    // Should navigate to detail view
    await page.waitForURL("**/issues/**");
    await page.screenshot({ path: `${PROOF_DIR}/list-375-card-to-detail.png`, fullPage: false });
  });
});

// ─── Board View Mobile ──────────────────────────────────

test.describe("Board view mobile", () => {
  test("375px: columns stack vertically", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await seedAndNavigate(page, "/board");
    const board = page.getByRole("region", { name: "Kanban board" });
    await expect(board).toBeVisible({ timeout: 15_000 });

    // Verify columns are stacked (flex-direction: column)
    await expect(board).toHaveCSS("flex-direction", "column");

    await page.screenshot({ path: `${PROOF_DIR}/board-375-columns-stacked.png`, fullPage: true });
  });

  test("desktop: columns side by side", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop_lg);
    await seedAndNavigate(page, "/board");
    const board = page.getByRole("region", { name: "Kanban board" });
    await expect(board).toBeVisible({ timeout: 15_000 });

    // Verify columns are horizontal (flex-direction: row)
    await expect(board).toHaveCSS("flex-direction", "row");

    await page.screenshot({ path: `${PROOF_DIR}/board-1440-side-by-side.png`, fullPage: false });
  });
});

// ─── Detail View ────────────────────────────────────────

test.describe("Detail view responsive", () => {
  test("mobile: full-screen detail view", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await seedAndNavigate(page, "/list");
    await expect(page.getByRole("list", { name: "Issues" })).toBeVisible({ timeout: 15_000 });

    // Navigate to first issue
    const cardList = page.getByRole("list", { name: "Issues" });
    await cardList.getByRole("listitem").first().locator("button").click();
    await page.waitForURL("**/issues/**");

    // Fields should be visible
    await expect(page.getByText("Fields")).toBeVisible({ timeout: 10_000 });

    await page.screenshot({ path: `${PROOF_DIR}/detail-375-fullscreen.png`, fullPage: true });
  });

  test("desktop: detail view with fields visible", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop_lg);
    await page.addInitScript(() => {
      localStorage.setItem("beads-gui-onboarding-complete", "true");
      // Ensure panel mode is off so clicks navigate
      localStorage.removeItem("beads:panel-mode");
    });
    await page.goto("/list");
    await expect(page.getByRole("table", { name: "Issue list" })).toBeVisible({ timeout: 15_000 });

    // Click the title cell of the first row (title has .truncate class)
    const firstRow = page.getByRole("table", { name: "Issue list" }).locator("tbody tr").first();
    await firstRow.getByRole("cell").filter({ has: page.locator(".truncate") }).click();
    await page.waitForURL("**/issues/**", { timeout: 15_000 });
    await expect(page.getByText("Fields")).toBeVisible({ timeout: 10_000 });

    await page.screenshot({ path: `${PROOF_DIR}/detail-1440-desktop.png`, fullPage: false });
  });
});

// ─── Touch Targets ──────────────────────────────────────

test.describe("Touch targets", () => {
  test("mobile nav items meet 44px minimum height", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await seedAndNavigate(page, "/list");
    await expect(page.getByRole("list", { name: "Issues" })).toBeVisible({ timeout: 15_000 });

    // Open drawer
    const hamburger = page.getByLabel("Open navigation menu");
    const hamburgerBox = await hamburger.boundingBox();
    expect(hamburgerBox).toBeTruthy();
    expect(hamburgerBox!.height).toBeGreaterThanOrEqual(44);
    expect(hamburgerBox!.width).toBeGreaterThanOrEqual(44);

    await hamburger.click();
    await expect(page.getByRole("dialog", { name: "Navigation menu" })).toBeVisible();

    // Check nav link heights
    const navLinks = page.getByRole("dialog", { name: "Navigation menu" }).getByRole("link");
    const count = await navLinks.count();
    for (let i = 0; i < count; i++) {
      const box = await navLinks.nth(i).boundingBox();
      expect(box).toBeTruthy();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }

    await page.screenshot({ path: `${PROOF_DIR}/touch-targets-drawer-navitems.png`, fullPage: false });
  });

  test("mobile filter button meets 44px minimum", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await seedAndNavigate(page, "/list");
    await expect(page.getByRole("list", { name: "Issues" })).toBeVisible({ timeout: 15_000 });

    const filterBtn = page.getByLabel("Toggle filters");
    const filterBox = await filterBtn.boundingBox();
    expect(filterBox).toBeTruthy();
    expect(filterBox!.height).toBeGreaterThanOrEqual(44);

    await page.screenshot({ path: `${PROOF_DIR}/touch-targets-filter-button.png`, fullPage: false });
  });

  test("mobile cards meet 44px minimum height", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await seedAndNavigate(page, "/list");
    await expect(page.getByRole("list", { name: "Issues" })).toBeVisible({ timeout: 15_000 });

    const cardList = page.getByRole("list", { name: "Issues" });
    const firstCardBtn = cardList.getByRole("listitem").first().locator("button");
    const cardBox = await firstCardBtn.boundingBox();
    expect(cardBox).toBeTruthy();
    expect(cardBox!.height).toBeGreaterThanOrEqual(44);

    await page.screenshot({ path: `${PROOF_DIR}/touch-targets-card-height.png`, fullPage: false });
  });
});

// ─── No Horizontal Overflow ─────────────────────────────

test.describe("No horizontal overflow", () => {
  for (const [name, vp] of Object.entries(VIEWPORTS)) {
    test(`${name} (${vp.width}px): no horizontal scroll on /list`, async ({ page }) => {
      await page.setViewportSize(vp);
      await seedAndNavigate(page, "/list");
      // Wait for either card list or table depending on viewport
      await expect(
        page.getByRole("list", { name: "Issues" }).or(page.getByRole("table", { name: "Issue list" })),
      ).toBeVisible({ timeout: 15_000 });

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // +1 for rounding

      await page.screenshot({ path: `${PROOF_DIR}/overflow-list-${vp.width}.png`, fullPage: false });
    });

    test(`${name} (${vp.width}px): no horizontal scroll on /settings`, async ({ page }) => {
      await page.setViewportSize(vp);
      await seedAndNavigate(page, "/settings");
      await expect(page.getByText("Appearance")).toBeVisible({ timeout: 15_000 });

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);

      await page.screenshot({ path: `${PROOF_DIR}/overflow-settings-${vp.width}.png`, fullPage: false });
    });
  }
});

// ─── Settings Theme Grid ────────────────────────────────

test.describe("Settings theme grid adapts", () => {
  test("375px: theme cards single column", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await seedAndNavigate(page, "/settings");
    await expect(page.getByText("Appearance")).toBeVisible({ timeout: 15_000 });

    // Verify theme grid renders as single column at 375px
    const themeGrid = page.getByRole("group", { name: "Available themes" });
    await expect(themeGrid).toBeVisible();
    const themeCards = themeGrid.locator("button");
    const count = await themeCards.count();
    expect(count).toBeGreaterThan(1);
    // All cards should share the same x offset in a single-column layout
    const firstBox = await themeCards.first().boundingBox();
    const secondBox = await themeCards.nth(1).boundingBox();
    expect(firstBox).toBeTruthy();
    expect(secondBox).toBeTruthy();
    expect(secondBox!.x).toBe(firstBox!.x);

    await page.screenshot({ path: `${PROOF_DIR}/settings-375-theme-grid.png`, fullPage: true });
  });

  test("1440px: theme cards multi-column", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop_lg);
    await seedAndNavigate(page, "/settings");
    await expect(page.getByText("Appearance")).toBeVisible({ timeout: 15_000 });

    // Verify theme grid renders multiple columns at 1440px
    const themeGrid = page.getByRole("group", { name: "Available themes" });
    await expect(themeGrid).toBeVisible();
    const themeCards = themeGrid.locator("button");
    const count = await themeCards.count();
    expect(count).toBeGreaterThan(1);
    // At least two cards should share the same y offset (same row = multi-column)
    const firstBox = await themeCards.first().boundingBox();
    const secondBox = await themeCards.nth(1).boundingBox();
    expect(firstBox).toBeTruthy();
    expect(secondBox).toBeTruthy();
    expect(secondBox!.y).toBe(firstBox!.y);

    await page.screenshot({ path: `${PROOF_DIR}/settings-1440-theme-grid.png`, fullPage: false });
  });
});

// ─── Filter Bar Mobile ──────────────────────────────────

test.describe("Filter bar mobile collapse", () => {
  test("375px: filters collapsed behind button, expandable", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await seedAndNavigate(page, "/list");
    await expect(page.getByRole("list", { name: "Issues" })).toBeVisible({ timeout: 15_000 });

    // Filters button visible
    const filterBtn = page.getByLabel("Toggle filters");
    await expect(filterBtn).toBeVisible();

    // Filter controls should be hidden initially
    await expect(page.getByLabel("Search issues")).not.toBeVisible();

    await page.screenshot({ path: `${PROOF_DIR}/filter-375-collapsed.png`, fullPage: false });

    // Expand filters
    await filterBtn.click();
    await expect(page.getByLabel("Search issues")).toBeVisible();

    await page.screenshot({ path: `${PROOF_DIR}/filter-375-expanded.png`, fullPage: false });
  });
});
