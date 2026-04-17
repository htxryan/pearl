/**
 * Proof gap fixes for beads-gui-7qf (mobile responsive layout)
 * - Re-captures desktop detail view showing 2-col field grid (original #7 was mislabeled)
 * - Re-captures mobile screenshots with onboarding dismissed
 * - Measures touch targets with concrete pixel values and writes a report
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { type Page, test } from "@playwright/test";

const PROOF_DIR = resolve(__dirname, "../docs/proof/beads-gui-7qf");
mkdirSync(PROOF_DIR, { recursive: true });

const MOBILE = { width: 375, height: 812 };
const DESKTOP = { width: 1440, height: 900 };

async function seedAndGoto(page: Page, path: string) {
  // reducedMotion triggers useScrollReveal's instant-reveal path so fade-up
  // sections don't capture mid-animation
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    localStorage.setItem("pearl-onboarding-complete", "true");
    localStorage.removeItem("beads:panel-mode");
  });
  await page.goto(path);
}

test("desktop detail view: 2-col field grid (replaces mislabeled 07)", async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await seedAndGoto(page, "/issues/beads-gui-7qf");

  // Wait for the fields grid
  const grid = page.locator(".grid.grid-cols-1.sm\\:grid-cols-2").first();
  await grid.waitFor({ state: "visible", timeout: 15_000 });

  // Verify it's actually rendering as 2 columns
  const cols = await grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns);
  const colCount = cols.trim().split(/\s+/).length;
  if (colCount !== 2) {
    throw new Error(`Expected 2 grid columns on desktop, got ${colCount} (${cols})`);
  }

  await page.screenshot({
    path: `${PROOF_DIR}/07-detail-desktop-2col-grid.png`,
    fullPage: false,
  });
});

test("mobile detail view: 1-col field grid (no onboarding overlay)", async ({ page }) => {
  await page.setViewportSize(MOBILE);
  await seedAndGoto(page, "/issues/beads-gui-7qf");

  const grid = page.locator(".grid.grid-cols-1.sm\\:grid-cols-2").first();
  await grid.waitFor({ state: "visible", timeout: 15_000 });

  const cols = await grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns);
  const colCount = cols.trim().split(/\s+/).length;
  if (colCount !== 1) {
    throw new Error(`Expected 1 grid column on mobile, got ${colCount} (${cols})`);
  }

  await page.screenshot({
    path: `${PROOF_DIR}/05-detail-mobile-1col-grid.png`,
    fullPage: false,
  });
});

test("mobile detail view: collapsible sections (no onboarding overlay)", async ({ page }) => {
  await page.setViewportSize(MOBILE);
  await seedAndGoto(page, "/issues/beads-gui-7qf");

  // Scroll to the sections area
  await page.locator("text=DESIGN NOTES").first().waitFor({ state: "attached", timeout: 15_000 });
  await page.locator("text=DESIGN NOTES").first().scrollIntoViewIfNeeded();

  await page.screenshot({
    path: `${PROOF_DIR}/06-detail-mobile-collapsible-sections.png`,
    fullPage: false,
  });
});

test("mobile board view: tab navigation (no onboarding overlay)", async ({ page }) => {
  await page.setViewportSize(MOBILE);
  await seedAndGoto(page, "/board");

  await page.getByRole("region", { name: "Kanban board" }).waitFor({
    state: "visible",
    timeout: 15_000,
  });
  await page.screenshot({ path: `${PROOF_DIR}/01-board-mobile-tab-open.png`, fullPage: false });
});

test("mobile header & sidebar drawer (no onboarding overlay)", async ({ page }) => {
  await page.setViewportSize(MOBILE);
  await seedAndGoto(page, "/list");
  await page.getByRole("list", { name: "Issues" }).waitFor({ state: "visible", timeout: 15_000 });

  await page.screenshot({
    path: `${PROOF_DIR}/10-header-mobile-touch-targets.png`,
    fullPage: false,
  });

  const hamburger = page.getByLabel("Open navigation menu");
  await hamburger.click();
  await page
    .getByRole("dialog", { name: "Navigation menu" })
    .waitFor({ state: "visible", timeout: 5_000 });

  await page.screenshot({ path: `${PROOF_DIR}/11-sidebar-mobile-drawer.png`, fullPage: false });
});

test("touch targets: measure and record pixel sizes", async ({ page }) => {
  await page.setViewportSize(MOBILE);
  await seedAndGoto(page, "/list");
  await page.getByRole("list", { name: "Issues" }).waitFor({ state: "visible", timeout: 15_000 });

  const report: string[] = [];
  const record = (label: string, box: { width: number; height: number } | null) => {
    if (!box) {
      report.push(`${label}: NOT FOUND`);
      return;
    }
    const w = Math.round(box.width);
    const h = Math.round(box.height);
    const pass = h >= 44 && w >= 44 ? "PASS" : "FAIL";
    report.push(`${label}: ${w}x${h}px  [${pass} 44x44]`);
  };

  record("Hamburger (menu button)", await page.getByLabel("Open navigation menu").boundingBox());
  record("Header notification bell", await page.getByLabel("Notifications").boundingBox());
  record("Filters toggle button", await page.getByLabel("Toggle filters").boundingBox());

  const firstCard = page
    .getByRole("list", { name: "Issues" })
    .getByRole("listitem")
    .first()
    .locator("button")
    .first();
  record("Issue card (tap target)", await firstCard.boundingBox());

  // Open drawer and measure each nav link
  await page.getByLabel("Open navigation menu").click();
  await page
    .getByRole("dialog", { name: "Navigation menu" })
    .waitFor({ state: "visible", timeout: 5_000 });
  const drawer = page.getByRole("dialog", { name: "Navigation menu" });
  const links = drawer.getByRole("link");
  const linkCount = await links.count();
  for (let i = 0; i < linkCount; i++) {
    const name = (await links.nth(i).innerText()).split("\n")[0];
    record(`Drawer nav link "${name}"`, await links.nth(i).boundingBox());
  }

  const lines = [
    "=== Touch Target Measurements (beads-gui-7qf) ===",
    `Captured: ${new Date().toISOString()}`,
    `Viewport: ${MOBILE.width}x${MOBILE.height}px`,
    `Minimum target: 44x44px (WCAG 2.5.5 / iOS HIG)`,
    "",
    ...report,
  ];
  writeFileSync(`${PROOF_DIR}/touch-target-measurements.txt`, `${lines.join("\n")}\n`);

  await page.screenshot({
    path: `${PROOF_DIR}/touch-targets-measured.png`,
    fullPage: false,
  });
});
