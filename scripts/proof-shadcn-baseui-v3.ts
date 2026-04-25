// v3 — focused proof script for the gaps left by v1/v2:
// - Tooltip on icon button
// - Notification popover
// - AlertDialog (confirm delete)
// - Theme actually applied (re-rendered list view)
// - Sonner toast
//
// Strategy: hard-navigate (full page load) between scenarios to ensure no stale portal state.

import { chromium, type Browser, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "fs";
import { join, resolve } from "path";

const REPO_ROOT = resolve(__dirname, "..");
const PROOF_DIR = join(REPO_ROOT, "docs", "proof", "beads-gui-yf3a");
const APP = "http://localhost:5173";

mkdirSync(PROOF_DIR, { recursive: true });
const log = (m: string) => console.log(`[proof-v3] ${m}`);

async function shot(page: Page, name: string) {
  await page.screenshot({
    path: join(PROOF_DIR, `${name}.png`),
    animations: "disabled",
  });
  log(`saved ${name}.png`);
}

async function freshLoad(page: Page, url = APP) {
  await page.goto(url);
  await page.waitForLoadState("networkidle");
  // Skip onboarding overlay if present
  const skip = page.getByRole("button", { name: /^skip$/i }).first();
  if (await skip.isVisible({ timeout: 800 }).catch(() => false)) {
    await skip.click().catch(() => {});
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(400);
}

interface Step {
  name: string;
  fn: (page: Page) => Promise<void>;
}

const steps: Step[] = [
  {
    name: "v3-01-tooltip-on-bell",
    fn: async (page) => {
      await freshLoad(page);
      const bell = page.locator('button[aria-label="Notifications"]').first();
      await bell.hover();
      // Tooltip default delay is ~700ms, give it time + a bit
      await page.waitForTimeout(1500);
      await shot(page, "v3-01-tooltip-on-bell");
    },
  },
  {
    name: "v3-02-notification-popover",
    fn: async (page) => {
      await freshLoad(page);
      const bell = page.locator('button[aria-label="Notifications"]').first();
      await bell.click();
      await page.waitForTimeout(600);
      await shot(page, "v3-02-notification-popover");
    },
  },
  {
    name: "v3-03-issue-detail",
    fn: async (page) => {
      await freshLoad(page);
      // Click the first issue's title link in the table
      const link = page.locator('table tbody tr a[href^="/i/"]').first();
      await link.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(800);
      await shot(page, "v3-03-issue-detail");
    },
  },
  {
    name: "v3-04-actions-menu-open",
    fn: async (page) => {
      // Continue from previous (still on issue detail)
      const actions = page.getByRole("button", { name: /actions/i }).first();
      await actions.click();
      await page.waitForTimeout(500);
      await shot(page, "v3-04-actions-menu-open");
    },
  },
  {
    name: "v3-05-alert-dialog-delete",
    fn: async (page) => {
      // From open menu, click Delete → AlertDialog
      const del = page.getByRole("menuitem", { name: /^delete$/i }).first();
      await del.click();
      await page.waitForTimeout(700);
      await shot(page, "v3-05-alert-dialog-delete");
      // Cancel the AlertDialog (do NOT confirm deletion)
      const cancel = page.getByRole("button", { name: /^cancel$/i }).first();
      if (await cancel.isVisible().catch(() => false)) {
        await cancel.click();
      } else {
        await page.keyboard.press("Escape");
      }
      await page.waitForTimeout(500);
    },
  },
  {
    name: "v3-06-detail-status-select",
    fn: async (page) => {
      // Click the Status select in metadata sidebar
      const statusBtn = page.locator('button:has-text("Open"), button:has-text("In Progress"), button:has-text("Closed")').last();
      if (await statusBtn.isVisible().catch(() => false)) {
        await statusBtn.click();
        await page.waitForTimeout(600);
      }
      await shot(page, "v3-06-detail-status-select");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    },
  },
  {
    name: "v3-07-quick-add-toast",
    fn: async (page) => {
      // Try to trigger a Sonner toast via Quick-add issue + Enter
      await freshLoad(page);
      const quickAdd = page.locator('input[placeholder*="Quick add" i], input[placeholder*="Enter to create" i]').first();
      // Or click the row text "Quick add issue..."
      const row = page.locator('text=Quick add issue').first();
      if (await row.isVisible().catch(() => false)) {
        await row.click();
        await page.waitForTimeout(300);
      }
      // Type a title and press Enter
      await page.keyboard.type(`Proof-it test ${Date.now()}`);
      await page.waitForTimeout(200);
      await page.keyboard.press("Enter");
      // Toast should appear briefly (auto-dismissable). Capture quickly.
      await page.waitForTimeout(800);
      await shot(page, "v3-07-quick-add-toast");
    },
  },
  {
    name: "v3-08-theme-pick-monokai",
    fn: async (page) => {
      await freshLoad(page, `${APP}/settings`);
      // Theme tiles are likely buttons or divs with the theme name as text. Find by exact name.
      // Try clicking by text content with a parent that's clickable
      const tile = page.locator('[role="button"], button').filter({ hasText: /^Monokai$/ }).first();
      if (await tile.isVisible().catch(() => false)) {
        await tile.click();
      } else {
        // Fallback: click any element containing "Monokai" text (the parent card is likely clickable)
        await page.locator('text="Monokai"').first().click({ force: true });
      }
      await page.waitForTimeout(800);
      await shot(page, "v3-08-theme-pick-monokai");
    },
  },
  {
    name: "v3-09-list-view-monokai",
    fn: async (page) => {
      await page.goto(APP);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(800);
      await shot(page, "v3-09-list-view-monokai");
    },
  },
  {
    name: "v3-10-create-dialog-monokai",
    fn: async (page) => {
      const create = page.getByRole("button", { name: /^Create Issue$/ }).first();
      await create.click();
      await page.waitForTimeout(700);
      await shot(page, "v3-10-create-dialog-monokai");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(400);
    },
  },
  {
    name: "v3-11-detail-monokai",
    fn: async (page) => {
      const link = page.locator('table tbody tr a[href^="/i/"]').first();
      await link.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(800);
      await shot(page, "v3-11-detail-monokai");
    },
  },
  {
    name: "v3-12-board-monokai",
    fn: async (page) => {
      await page.goto(`${APP}/board`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1200);
      await shot(page, "v3-12-board-monokai");
    },
  },
  {
    name: "v3-13-graph-monokai",
    fn: async (page) => {
      await page.goto(`${APP}/graph`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1500);
      await shot(page, "v3-13-graph-monokai");
    },
  },
  {
    name: "v3-14-command-palette-monokai",
    fn: async (page) => {
      await page.goto(APP);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);
      await page.keyboard.press("Meta+k");
      await page.waitForTimeout(600);
      await shot(page, "v3-14-command-palette-monokai");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    },
  },
  {
    name: "v3-15-restore-default-light",
    fn: async (page) => {
      await page.goto(`${APP}/settings`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);
      const tile = page.locator('text=/Light\\+|Default Light/').first();
      if (await tile.isVisible().catch(() => false)) {
        await tile.click({ force: true });
      }
      await page.waitForTimeout(700);
      await shot(page, "v3-15-restore-default-light");
    },
  },
];

(async () => {
  const browser: Browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => log(`PAGE ERROR: ${e.message}`));

  const results: { name: string; status: "ok" | "error"; error?: string }[] = [];
  for (const step of steps) {
    try {
      await step.fn(page);
      results.push({ name: step.name, status: "ok" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      log(`STEP FAILED: ${step.name} — ${msg.split("\n")[0]}`);
      try { await shot(page, `${step.name}-FAILED`); } catch {}
      results.push({ name: step.name, status: "error", error: msg.split("\n")[0] });
    }
  }
  await browser.close();

  const sum = [
    "# Proof-it run summary (v3) — focused gaps fix",
    "",
    `Date: ${new Date().toISOString()}`,
    "",
    "| # | Step | Status | Notes |",
    "|---|---|---|---|",
    ...results.map((r, i) => `| ${i + 1} | ${r.name} | ${r.status === "ok" ? "✓" : "🔴"} | ${r.error ?? ""} |`),
  ].join("\n");
  writeFileSync(join(PROOF_DIR, "_run-summary-v3.md"), sum);
  const failed = results.filter((r) => r.status === "error").length;
  log(`v3 done — ${results.length - failed}/${results.length} steps green`);
  process.exit(failed > 0 ? 1 : 0);
})();
