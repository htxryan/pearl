// v5 — capture the Tooltip primitive in headless Playwright by mimicking the
// path I confirmed manually in chrome MCP: navigate to detail, hover the
// "Edit Description" pencil button, wait long enough for the BaseUI Tooltip
// default delay (~700ms), screenshot.

import { chromium, type Browser, type Page } from "@playwright/test";
import { mkdirSync } from "fs";
import { join, resolve } from "path";

const REPO_ROOT = resolve(__dirname, "..");
const PROOF_DIR = join(REPO_ROOT, "docs", "proof", "beads-gui-yf3a");
const APP = "http://localhost:5173";
mkdirSync(PROOF_DIR, { recursive: true });
const log = (m: string) => console.log(`[proof-v5] ${m}`);
const shot = (page: Page, name: string) =>
  page.screenshot({ path: join(PROOF_DIR, `${name}.png`), animations: "disabled" })
    .then(() => log(`saved ${name}.png`));

(async () => {
  const browser: Browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => log(`PAGE ERROR: ${e.message}`));

  // Direct nav to a known issue id (verified to exist)
  await page.goto(`${APP}/issues/sample-project-dzp`);
  await page.waitForLoadState("networkidle");
  // Skip onboarding if shown
  const skip = page.getByRole("button", { name: /^skip$/i }).first();
  if (await skip.isVisible({ timeout: 600 }).catch(() => false)) {
    await skip.click().catch(() => {});
    await page.waitForTimeout(400);
  }

  // Hover the "Edit Description" button (aria-label set on the pencil icon button)
  const editBtn = page.getByRole("button", { name: "Edit Description" });
  await editBtn.waitFor({ state: "visible", timeout: 10000 });
  await editBtn.hover();
  // BaseUI Tooltip default delay is ~700ms; give 2s for safety
  await page.waitForTimeout(2000);
  await shot(page, "v5-01-tooltip-edit-description");

  // Bonus: try other tooltip-bearing buttons in the detail view
  // Hover the Actions dropdown trigger (sometimes wrapped in tooltip)
  const actions = page.getByRole("button", { name: /actions/i }).first();
  await actions.hover();
  await page.waitForTimeout(1500);
  await shot(page, "v5-02-actions-button-state");

  await browser.close();
  log("v5 done");
})();
