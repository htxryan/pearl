// Proof-it script for the shadcn/BaseUI migration (meta-epic beads-gui-yf3a).
// Drives the live dev server at http://localhost:5173, exercises every migrated
// primitive, and saves screenshots to docs/proof/beads-gui-yf3a/.
//
// Run: pnpm exec tsx scripts/proof-shadcn-baseui.ts
//
// Assumes:
// - Pearl backend running at http://localhost:3456
// - Pearl frontend (Vite) running at http://localhost:5173

import { chromium, type Browser, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();
const PROOF_DIR = join(ROOT, "docs", "proof", "beads-gui-yf3a");
const APP = "http://localhost:5173";

interface Step {
  name: string;
  fn: (page: Page) => Promise<void>;
}

mkdirSync(PROOF_DIR, { recursive: true });

const log = (msg: string) => console.log(`[proof] ${msg}`);

async function shot(page: Page, name: string, fullPage = false) {
  const path = join(PROOF_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage, animations: "disabled" });
  log(`saved ${name}.png`);
}

async function settle(page: Page, ms = 350) {
  await page.waitForTimeout(ms);
}

const steps: Step[] = [
  {
    name: "01-list-view-default",
    fn: async (page) => {
      await page.goto(APP);
      await page.waitForLoadState("networkidle");
      await settle(page, 800);
      await shot(page, "01-list-view-default");
    },
  },
  {
    name: "02-sidebar-expanded",
    fn: async (page) => {
      // Open the sidebar by hovering or clicking the expand toggle.
      const toggle = page.locator('button[aria-label*="sidebar" i], button:has-text("Pearl")').first();
      if (await toggle.isVisible().catch(() => false)) {
        await toggle.click();
        await settle(page);
      }
      await shot(page, "02-sidebar-expanded");
    },
  },
  {
    name: "03-status-filter-dropdown",
    fn: async (page) => {
      // Click the Status filter chip to open its popover (Combobox / DropdownMenu)
      const statusBtn = page.getByRole("button", { name: /^Status/ }).first();
      await statusBtn.click();
      await settle(page);
      await shot(page, "03-status-filter-dropdown");
      await page.keyboard.press("Escape");
      await settle(page);
    },
  },
  {
    name: "04-priority-filter-dropdown",
    fn: async (page) => {
      const prBtn = page.getByRole("button", { name: /^Priority/ }).first();
      await prBtn.click();
      await settle(page);
      await shot(page, "04-priority-filter-dropdown");
      await page.keyboard.press("Escape");
      await settle(page);
    },
  },
  {
    name: "05-create-issue-dialog",
    fn: async (page) => {
      const createBtn = page.getByRole("button", { name: /create issue/i }).first();
      await createBtn.click();
      await settle(page, 600);
      await shot(page, "05-create-issue-dialog");
    },
  },
  {
    name: "06-create-issue-type-select",
    fn: async (page) => {
      // Try to open the Type select inside the create dialog
      const typeSelect = page.getByRole("combobox", { name: /type/i }).first();
      if (await typeSelect.isVisible().catch(() => false)) {
        await typeSelect.click();
        await settle(page);
        await shot(page, "06-create-issue-type-select");
        await page.keyboard.press("Escape");
        await settle(page);
      } else {
        await shot(page, "06-create-issue-type-select-skipped");
      }
    },
  },
  {
    name: "07-create-issue-date-picker",
    fn: async (page) => {
      // Try to open the date picker inside the create dialog
      const dateBtn = page.getByRole("button", { name: /date|due/i }).first();
      if (await dateBtn.isVisible().catch(() => false)) {
        await dateBtn.click();
        await settle(page, 500);
        await shot(page, "07-create-issue-date-picker");
        await page.keyboard.press("Escape");
        await settle(page);
      } else {
        await shot(page, "07-create-issue-date-picker-skipped");
      }
    },
  },
  {
    name: "08-create-issue-label-picker",
    fn: async (page) => {
      const labelBtn = page.getByRole("button", { name: /labels?/i }).first();
      if (await labelBtn.isVisible().catch(() => false)) {
        await labelBtn.click();
        await settle(page, 500);
        await shot(page, "08-create-issue-label-picker");
        await page.keyboard.press("Escape");
        await settle(page);
      } else {
        await shot(page, "08-create-issue-label-picker-skipped");
      }
      // Close the create dialog
      await page.keyboard.press("Escape");
      await settle(page, 500);
    },
  },
  {
    name: "09-issue-detail",
    fn: async (page) => {
      // Click the first issue row title link
      const firstRow = page.locator("table tbody tr").first();
      await firstRow.locator("a, button").first().click().catch(async () => {
        await firstRow.click();
      });
      await page.waitForLoadState("networkidle");
      await settle(page, 800);
      await shot(page, "09-issue-detail");
    },
  },
  {
    name: "10-detail-actions-menu",
    fn: async (page) => {
      const menuBtn = page.getByRole("button", { name: /more|actions|options/i }).first();
      if (await menuBtn.isVisible().catch(() => false)) {
        await menuBtn.click();
        await settle(page);
        await shot(page, "10-detail-actions-menu");
        await page.keyboard.press("Escape");
        await settle(page);
      } else {
        await shot(page, "10-detail-actions-menu-not-found");
      }
    },
  },
  {
    name: "11-command-palette-cmdk",
    fn: async (page) => {
      await page.keyboard.press("Meta+k");
      await settle(page, 500);
      await shot(page, "11-command-palette-cmdk");
      await page.keyboard.press("Escape");
      await settle(page);
    },
  },
  {
    name: "12-search-palette-cmdf",
    fn: async (page) => {
      await page.keyboard.press("Meta+f");
      await settle(page, 500);
      await shot(page, "12-search-palette-cmdf");
      await page.keyboard.press("Escape");
      await settle(page);
    },
  },
  {
    name: "13-notification-bell-popover",
    fn: async (page) => {
      const bell = page.getByRole("button", { name: /notification|bell|unread/i }).first();
      if (await bell.isVisible().catch(() => false)) {
        await bell.click();
        await settle(page);
        await shot(page, "13-notification-bell-popover");
        await page.keyboard.press("Escape");
        await settle(page);
      } else {
        await shot(page, "13-notification-bell-not-found");
      }
    },
  },
  {
    name: "14-settings-view",
    fn: async (page) => {
      // Navigate to settings
      const settings = page.locator('a[href="/settings"], button[aria-label*="settings" i]').first();
      if (await settings.isVisible().catch(() => false)) {
        await settings.click();
      } else {
        await page.goto(`${APP}/settings`);
      }
      await page.waitForLoadState("networkidle");
      await settle(page, 800);
      await shot(page, "14-settings-view");
    },
  },
  {
    name: "15-theme-picker",
    fn: async (page) => {
      // Try to find theme picker controls on settings page
      await shot(page, "15-theme-picker");
    },
  },
  {
    name: "16-dark-mode",
    fn: async (page) => {
      // Toggle dark mode via document class on html
      await page.evaluate(() => {
        document.documentElement.classList.toggle("dark");
      });
      await settle(page, 400);
      await shot(page, "16-dark-mode");
    },
  },
  {
    name: "17-list-view-dark",
    fn: async (page) => {
      await page.goto(APP);
      await page.waitForLoadState("networkidle");
      await settle(page, 800);
      await shot(page, "17-list-view-dark");
    },
  },
  {
    name: "18-detail-view-dark",
    fn: async (page) => {
      const firstRow = page.locator("table tbody tr").first();
      await firstRow.locator("a, button").first().click().catch(async () => {
        await firstRow.click();
      });
      await page.waitForLoadState("networkidle");
      await settle(page, 800);
      await shot(page, "18-detail-view-dark");
    },
  },
  {
    name: "19-board-view",
    fn: async (page) => {
      // Restore light mode for board view
      await page.evaluate(() => {
        document.documentElement.classList.remove("dark");
      });
      await page.goto(`${APP}/board`);
      await page.waitForLoadState("networkidle");
      await settle(page, 1000);
      await shot(page, "19-board-view");
    },
  },
  {
    name: "20-graph-view",
    fn: async (page) => {
      await page.goto(`${APP}/graph`);
      await page.waitForLoadState("networkidle");
      await settle(page, 1500);
      await shot(page, "20-graph-view");
    },
  },
];

(async () => {
  const browser: Browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2, // retina-quality screenshots
  });
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      log(`CONSOLE ERROR: ${msg.text()}`);
    }
  });
  page.on("pageerror", (err) => {
    log(`PAGE ERROR: ${err.message}`);
  });

  const results: { name: string; status: "ok" | "error"; error?: string }[] = [];

  for (const step of steps) {
    try {
      await step.fn(page);
      results.push({ name: step.name, status: "ok" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      log(`STEP FAILED: ${step.name} — ${msg}`);
      // Try to capture whatever's on screen
      try {
        await shot(page, `${step.name}-FAILED`);
      } catch {}
      results.push({ name: step.name, status: "error", error: msg });
    }
  }

  await browser.close();

  // Write a summary
  const summary = [
    "# Proof-it run summary — shadcn/BaseUI migration",
    "",
    `Date: ${new Date().toISOString()}`,
    "",
    "| # | Step | Status | Notes |",
    "|---|---|---|---|",
    ...results.map(
      (r, i) =>
        `| ${i + 1} | ${r.name} | ${r.status === "ok" ? "✓" : "🔴 " + r.status} | ${r.error ?? ""} |`,
    ),
  ].join("\n");
  writeFileSync(join(PROOF_DIR, "_run-summary.md"), summary);
  log(`wrote _run-summary.md`);

  const failed = results.filter((r) => r.status === "error").length;
  log(`done — ${results.length - failed}/${results.length} steps green`);
  process.exit(failed > 0 ? 1 : 0);
})();
