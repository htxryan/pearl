/**
 * Capture screenshot evidence for E2E write tests verification.
 * Run with: npx playwright test --config=docs/proof/beads-gui-2ll/capture-evidence.mjs
 * Or: node docs/proof/beads-gui-2ll/capture-evidence.mjs (uses Playwright API directly)
 */
import { chromium } from "@playwright/test";

const BASE = "http://localhost:5173";
const API = "http://127.0.0.1:3456";
const OUT = "docs/proof/beads-gui-2ll";

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });

  // Dismiss onboarding
  await ctx.addInitScript(() => {
    localStorage.setItem("pearl-onboarding-complete", "true");
  });

  const page = await ctx.newPage();

  // 1. List view with issues
  await page.goto(`${BASE}/list`);
  await page.waitForSelector('table[aria-label="Issue list"]', { timeout: 15000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/01-list-view.png`, fullPage: false });

  // 2. Issue detail with Close button visible
  await page.goto(`${BASE}/issues/sample-project-7v4`);
  await page.waitForSelector('nav[aria-label="Breadcrumb"]', { timeout: 15000 });
  // Wait for Close button to appear (may need replica sync)
  const closeBtn = page.getByRole("button", { name: "Close" }).first();
  try {
    await closeBtn.waitFor({ state: "visible", timeout: 10000 });
    await page.screenshot({ path: `${OUT}/02-detail-close-button.png`, fullPage: false });

    // 3. Close confirmation dialog
    await closeBtn.click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await page.screenshot({ path: `${OUT}/03-close-confirmation-dialog.png`, fullPage: false });
    // Cancel to not actually close
    await page.getByRole("button", { name: /cancel/i }).click();
    await page.waitForTimeout(300);
  } catch {
    console.log("Close button not visible (issue may still be syncing); capturing current state");
    await page.screenshot({ path: `${OUT}/02-detail-view.png`, fullPage: false });
  }

  // 4. Comments section
  await page.goto(`${BASE}/issues/sample-project-6rs`);
  await page.waitForSelector('nav[aria-label="Breadcrumb"]', { timeout: 15000 });
  const commentsHeading = page.getByRole("heading", { name: /comments/i });
  await commentsHeading.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/04-comments-section.png`, fullPage: false });

  // 5. Dependencies section
  await page.goto(`${BASE}/issues/sample-project-6kq`);
  await page.waitForSelector('nav[aria-label="Breadcrumb"]', { timeout: 15000 });
  const depHeading = page.getByRole("heading", { name: /dependencies/i });
  await depHeading.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/05-dependencies-section.png`, fullPage: false });

  // 6. Board view
  await page.goto(`${BASE}/board`);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/06-board-view.png`, fullPage: false });

  // 7. Edit fields - status dropdown
  await page.goto(`${BASE}/issues/sample-project-7v4`);
  await page.waitForSelector('nav[aria-label="Breadcrumb"]', { timeout: 15000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/07-edit-fields.png`, fullPage: false });

  await browser.close();
  console.log("Evidence screenshots captured successfully.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
