// v4 — final 2 missing screenshots: tooltip + AlertDialog
import { chromium, type Browser, type Page } from "@playwright/test";
import { mkdirSync } from "fs";
import { join, resolve } from "path";

const REPO_ROOT = resolve(__dirname, "..");
const PROOF_DIR = join(REPO_ROOT, "docs", "proof", "beads-gui-yf3a");
const APP = "http://localhost:5173";
mkdirSync(PROOF_DIR, { recursive: true });
const log = (m: string) => console.log(`[proof-v4] ${m}`);
const shot = (page: Page, name: string) => page.screenshot({ path: join(PROOF_DIR, `${name}.png`), animations: "disabled" }).then(() => log(`saved ${name}.png`));

async function freshLoad(page: Page, url = APP) {
  await page.goto(url);
  await page.waitForLoadState("networkidle");
  const skip = page.getByRole("button", { name: /^skip$/i }).first();
  if (await skip.isVisible({ timeout: 800 }).catch(() => false)) {
    await skip.click().catch(() => {});
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(500);
}

(async () => {
  const browser: Browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  page.on("pageerror", (e) => log(`PAGE ERROR: ${e.message}`));

  // 1. Tooltip — hover the sidebar collapse-toggle (chevron arrow). It's an icon button.
  // From screenshots, the sidebar shows a chevron-left at the top-right of the expanded sidebar
  // OR a chevron-right when collapsed.
  await freshLoad(page);
  // The sidebar might not have a tooltip on its toggle. Try the Notifications bell tooltip
  // via JavaScript-driven hover (not playwright hover) which avoids portal interception
  await page.evaluate(() => {
    const bell = document.querySelector('button[aria-label="Notifications"]');
    if (bell) {
      bell.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      bell.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    }
  });
  await page.waitForTimeout(1200);
  await shot(page, "v4-01-tooltip-on-bell");

  // 2. Issue detail — list-view URL pattern is /issues/<id> per react-router. Try clicking
  // the title link directly via locator.
  await freshLoad(page);
  // The link path could be /issues/<id> or /i/<id>. Let's discover the URL pattern first.
  const links = await page.locator("table tbody tr a").evaluateAll((els) =>
    (els as HTMLAnchorElement[]).map((a) => a.href).slice(0, 3),
  );
  log(`first 3 anchor hrefs: ${links.join(", ")}`);
  if (links[0]) {
    await page.goto(links[0]);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);
    await shot(page, "v4-02-issue-detail-direct");

    // Open Actions menu
    const actions = page.getByRole("button", { name: /actions/i }).first();
    if (await actions.isVisible().catch(() => false)) {
      await actions.click();
      await page.waitForTimeout(500);
      await shot(page, "v4-03-actions-menu");

      // Click Delete to trigger AlertDialog
      const del = page.getByRole("menuitem", { name: /^delete$/i }).first();
      if (await del.isVisible().catch(() => false)) {
        await del.click();
        await page.waitForTimeout(700);
        await shot(page, "v4-04-alert-dialog-delete");
      }
    }
  }

  // 3. Sonner toast — change the Status select on the detail page
  await freshLoad(page);
  if (links[0]) {
    await page.goto(links[0]);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);
    // Find the Status select in the metadata sidebar — has text "Open" or "In Progress"
    // The metadata Status select is identified by being inside the FIELDS section
    const statusBtn = page.locator('button').filter({ hasText: /^Open$|^In Progress$|^Closed$/ }).last();
    if (await statusBtn.isVisible().catch(() => false)) {
      await statusBtn.click();
      await page.waitForTimeout(500);
      await shot(page, "v4-05-status-select-popover");
      // Pick a different status to trigger a mutation + toast
      const closedOpt = page.getByRole("option", { name: /^Closed$/ }).first();
      const inProgressOpt = page.getByRole("option", { name: /^In Progress$/ }).first();
      const opt = (await closedOpt.isVisible().catch(() => false)) ? closedOpt : inProgressOpt;
      if (await opt.isVisible().catch(() => false)) {
        await opt.click();
        // Capture quickly — Sonner toasts are short
        await page.waitForTimeout(400);
        await shot(page, "v4-06-toast-after-status-change");
        await page.waitForTimeout(1200);
        await shot(page, "v4-07-toast-late");
      }
    }
  }

  await browser.close();
  log("v4 done");
})();
