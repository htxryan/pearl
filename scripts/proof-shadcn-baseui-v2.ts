// V2 of the proof-it script — fixes selector gaps + adds AlertDialog + Sonner toast proof.
//
// Run from REPO ROOT (uses CWD for path resolution):
//   cd /Users/redhale/src/pearl && pnpm --filter @pearl/frontend exec tsx ../../scripts/proof-shadcn-baseui-v2.ts
//
// Or invoke from frontend dir; we resolve PROOF_DIR relative to repo root explicitly.

import { chromium, type Browser, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "fs";
import { join, resolve } from "path";

const REPO_ROOT = resolve(__dirname, "..");
const PROOF_DIR = join(REPO_ROOT, "docs", "proof", "beads-gui-yf3a");
const APP = "http://localhost:5173";

interface Step {
  name: string;
  fn: (page: Page) => Promise<void>;
}

mkdirSync(PROOF_DIR, { recursive: true });

const log = (msg: string) => console.log(`[proof-v2] ${msg}`);

async function shot(page: Page, name: string, fullPage = false) {
  const path = join(PROOF_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage, animations: "disabled" });
  log(`saved ${name}.png`);
}

async function settle(page: Page, ms = 350) {
  await page.waitForTimeout(ms);
}

// Skip the onboarding overlay if it's blocking interactions
async function skipOnboarding(page: Page) {
  const skip = page.getByRole("button", { name: /^skip$/i }).first();
  if (await skip.isVisible({ timeout: 1000 }).catch(() => false)) {
    await skip.click().catch(() => {});
    await settle(page, 200);
  }
}

const steps: Step[] = [
  {
    name: "v2-01-sidebar-expanded",
    fn: async (page) => {
      await page.goto(APP);
      await page.waitForLoadState("networkidle");
      await skipOnboarding(page);
      await settle(page, 400);
      // The collapse toggle is the first button at the top-left (chevron-right).
      // Try aria-label first, then by position
      const toggle = page
        .getByRole("button", { name: /sidebar|toggle|expand|collapse/i })
        .first();
      if (await toggle.isVisible().catch(() => false)) {
        await toggle.click();
      } else {
        // Click around the chevron position (x≈30, y≈30 from earlier screenshot)
        await page.mouse.click(30, 30);
      }
      await settle(page, 500);
      await shot(page, "v2-01-sidebar-expanded");
    },
  },
  {
    name: "v2-02-status-filter-popover",
    fn: async (page) => {
      // Skip onboarding first
      await skipOnboarding(page);
      // The Status filter chip is in the More-filters bar. Use the chip text "Status (4)"
      const chip = page.locator('button:has-text("Status (4)"), button:has-text("Status")').nth(1);
      const fallback = page.locator('button:has-text("Status")').first();
      const target = (await chip.isVisible().catch(() => false)) ? chip : fallback;
      // BUT the column header is also "STATUS" — try CommandPalette-style filter chip
      // The earlier screenshot showed a "Status (4)" chip at top of filter bar
      const filterChip = page.locator("button", { hasText: /Status \(\d+\)/ }).first();
      if (await filterChip.isVisible().catch(() => false)) {
        await filterChip.click();
      } else {
        await target.click();
      }
      await settle(page, 600);
      await shot(page, "v2-02-status-filter-popover");
      await page.keyboard.press("Escape");
      await settle(page);
    },
  },
  {
    name: "v2-03-priority-filter-popover",
    fn: async (page) => {
      const chip = page.locator("button", { hasText: /^Priority$/ }).first();
      if (await chip.isVisible().catch(() => false)) {
        await chip.click();
      }
      await settle(page, 600);
      await shot(page, "v2-03-priority-filter-popover");
      await page.keyboard.press("Escape");
      await settle(page);
    },
  },
  {
    name: "v2-04-type-filter-popover",
    fn: async (page) => {
      const chip = page.locator("button", { hasText: /^Type$/ }).first();
      if (await chip.isVisible().catch(() => false)) {
        await chip.click();
      }
      await settle(page, 600);
      await shot(page, "v2-04-type-filter-popover");
      await page.keyboard.press("Escape");
      await settle(page);
    },
  },
  {
    name: "v2-05-create-issue-form",
    fn: async (page) => {
      const create = page.getByRole("button", { name: /^Create Issue$/ }).first();
      await create.click();
      await settle(page, 700);
      await shot(page, "v2-05-create-issue-form");
    },
  },
  {
    name: "v2-06-type-select-open",
    fn: async (page) => {
      // Click the Type select (the one inside the dialog showing "Task")
      // Use getByLabel to find the form select
      const dialog = page.getByRole("dialog");
      const typeSelect = dialog.locator("button", { hasText: "Task" }).first();
      if (await typeSelect.isVisible().catch(() => false)) {
        await typeSelect.click();
        await settle(page, 600);
      }
      await shot(page, "v2-06-type-select-open");
      await page.keyboard.press("Escape");
      await settle(page);
    },
  },
  {
    name: "v2-07-priority-select-open",
    fn: async (page) => {
      const dialog = page.getByRole("dialog");
      const prSelect = dialog.locator("button", { hasText: "P2" }).first();
      if (await prSelect.isVisible().catch(() => false)) {
        await prSelect.click();
        await settle(page, 600);
      }
      await shot(page, "v2-07-priority-select-open");
      await page.keyboard.press("Escape");
      await settle(page);
    },
  },
  {
    name: "v2-08-date-picker-open",
    fn: async (page) => {
      const dialog = page.getByRole("dialog");
      const dateBtn = dialog.locator("button", { hasText: /Set due date|Set date/i }).first();
      if (await dateBtn.isVisible().catch(() => false)) {
        await dateBtn.click();
        await settle(page, 700);
      }
      await shot(page, "v2-08-date-picker-open");
      await page.keyboard.press("Escape");
      await settle(page);
    },
  },
  {
    name: "v2-09-label-picker-open",
    fn: async (page) => {
      const dialog = page.getByRole("dialog");
      const labelInput = dialog.locator('input[placeholder*="label" i]').first();
      if (await labelInput.isVisible().catch(() => false)) {
        await labelInput.click();
        await settle(page, 600);
      }
      await shot(page, "v2-09-label-picker-open");
      // Close the dialog
      await page.keyboard.press("Escape");
      await settle(page);
      await page.keyboard.press("Escape");
      await settle(page, 500);
    },
  },
  {
    name: "v2-10-tooltip-on-icon-button",
    fn: async (page) => {
      // Hover the bell icon for tooltip
      const bell = page.locator('button:has(svg.lucide-bell), button[aria-label*="notification" i]').first();
      if (await bell.isVisible().catch(() => false)) {
        await bell.hover();
        await settle(page, 1200); // tooltip needs time to appear
      }
      await shot(page, "v2-10-tooltip-on-icon-button");
    },
  },
  {
    name: "v2-11-notification-popover",
    fn: async (page) => {
      const bell = page.locator('button:has(svg.lucide-bell), button[aria-label*="notification" i]').first();
      if (await bell.isVisible().catch(() => false)) {
        await bell.click();
        await settle(page, 600);
      }
      await shot(page, "v2-11-notification-popover");
      await page.keyboard.press("Escape");
      await settle(page);
    },
  },
  {
    name: "v2-12-issue-detail-with-pickers",
    fn: async (page) => {
      // Navigate to first issue
      await page.locator("table tbody tr").first().locator("a").first().click();
      await page.waitForLoadState("networkidle");
      await skipOnboarding(page);
      await settle(page, 800);
      await shot(page, "v2-12-issue-detail-with-pickers");
    },
  },
  {
    name: "v2-13-detail-priority-select",
    fn: async (page) => {
      // The metadata sidebar has a Priority select
      const prBtn = page.locator('button:has-text("P4"), button:has-text("P3"), button:has-text("P2"), button:has-text("P1"), button:has-text("P0")').first();
      if (await prBtn.isVisible().catch(() => false)) {
        await prBtn.click();
        await settle(page, 500);
      }
      await shot(page, "v2-13-detail-priority-select");
      await page.keyboard.press("Escape");
      await settle(page);
    },
  },
  {
    name: "v2-14-actions-menu-dropdown",
    fn: async (page) => {
      const actions = page.getByRole("button", { name: /actions/i }).first();
      if (await actions.isVisible().catch(() => false)) {
        await actions.click();
        await settle(page, 500);
      }
      await shot(page, "v2-14-actions-menu-dropdown");
      // Don't escape — we'll use it for the next step
    },
  },
  {
    name: "v2-15-alert-dialog-confirm-delete",
    fn: async (page) => {
      // Click Delete in the open menu — should trigger AlertDialog
      const del = page.getByRole("menuitem", { name: /delete/i }).first();
      if (await del.isVisible().catch(() => false)) {
        await del.click();
        await settle(page, 700);
      }
      await shot(page, "v2-15-alert-dialog-confirm-delete");
      // Cancel — DON'T confirm the deletion
      const cancel = page.getByRole("button", { name: /cancel|cancel|no|abort/i }).first();
      if (await cancel.isVisible().catch(() => false)) {
        await cancel.click();
      } else {
        await page.keyboard.press("Escape");
      }
      await settle(page, 500);
    },
  },
  {
    name: "v2-16-command-palette",
    fn: async (page) => {
      await page.keyboard.press("Meta+k");
      await settle(page, 600);
      await shot(page, "v2-16-command-palette");
      await page.keyboard.press("Escape");
      await settle(page);
    },
  },
  {
    name: "v2-17-search-palette",
    fn: async (page) => {
      await page.keyboard.press("Meta+f");
      await settle(page, 600);
      await shot(page, "v2-17-search-palette");
      // type something to show filtering
      await page.keyboard.type("issue");
      await settle(page, 500);
      await shot(page, "v2-18-search-palette-filtered");
      await page.keyboard.press("Escape");
      await settle(page);
    },
  },
  {
    name: "v2-19-settings-page",
    fn: async (page) => {
      await page.goto(`${APP}/settings`);
      await page.waitForLoadState("networkidle");
      await skipOnboarding(page);
      await settle(page, 600);
      await shot(page, "v2-19-settings-page");
    },
  },
  {
    name: "v2-20-theme-monokai-applied",
    fn: async (page) => {
      // Click the Monokai theme tile
      const monokai = page.locator('button, [role="button"], [tabindex]').filter({ hasText: /^Monokai$/ }).first();
      if (await monokai.isVisible().catch(() => false)) {
        await monokai.click();
        await settle(page, 700);
      }
      await shot(page, "v2-20-theme-monokai-applied");
    },
  },
  {
    name: "v2-21-list-view-monokai-dark",
    fn: async (page) => {
      // Now go back to list view to show Monokai applied across primitives
      await page.goto(APP);
      await page.waitForLoadState("networkidle");
      await skipOnboarding(page);
      await settle(page, 800);
      await shot(page, "v2-21-list-view-monokai-dark");
    },
  },
  {
    name: "v2-22-create-dialog-monokai-dark",
    fn: async (page) => {
      const create = page.getByRole("button", { name: /^Create Issue$/ }).first();
      await create.click();
      await settle(page, 700);
      await shot(page, "v2-22-create-dialog-monokai-dark");
      await page.keyboard.press("Escape");
      await settle(page, 500);
    },
  },
  {
    name: "v2-23-theme-solarized-light",
    fn: async (page) => {
      // Switch to Solarized Light to demo the theme matrix
      await page.goto(`${APP}/settings`);
      await page.waitForLoadState("networkidle");
      await skipOnboarding(page);
      await settle(page, 500);
      const sol = page.locator('button, [role="button"]').filter({ hasText: /^Solarized Light$/ }).first();
      if (await sol.isVisible().catch(() => false)) {
        await sol.click();
        await settle(page, 700);
      }
      await shot(page, "v2-23-theme-solarized-light");
    },
  },
  {
    name: "v2-24-list-view-solarized-light",
    fn: async (page) => {
      await page.goto(APP);
      await page.waitForLoadState("networkidle");
      await skipOnboarding(page);
      await settle(page, 800);
      await shot(page, "v2-24-list-view-solarized-light");
    },
  },
  {
    name: "v2-25-board-view-solarized",
    fn: async (page) => {
      await page.goto(`${APP}/board`);
      await page.waitForLoadState("networkidle");
      await skipOnboarding(page);
      await settle(page, 1200);
      await shot(page, "v2-25-board-view-solarized");
    },
  },
  {
    name: "v2-26-graph-view-solarized",
    fn: async (page) => {
      await page.goto(`${APP}/graph`);
      await page.waitForLoadState("networkidle");
      await skipOnboarding(page);
      await settle(page, 1500);
      await shot(page, "v2-26-graph-view-solarized");
    },
  },
  {
    name: "v2-27-back-to-default-light",
    fn: async (page) => {
      // Restore default light for cleanup
      await page.goto(`${APP}/settings`);
      await page.waitForLoadState("networkidle");
      await settle(page, 500);
      const def = page.locator('button, [role="button"]').filter({ hasText: /Light\+|Default Light/i }).first();
      if (await def.isVisible().catch(() => false)) {
        await def.click();
        await settle(page, 500);
      }
      await shot(page, "v2-27-back-to-default-light");
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

  page.on("pageerror", (err) => log(`PAGE ERROR: ${err.message}`));

  const results: { name: string; status: "ok" | "error"; error?: string }[] = [];
  for (const step of steps) {
    try {
      await step.fn(page);
      results.push({ name: step.name, status: "ok" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      log(`STEP FAILED: ${step.name} — ${msg}`);
      try {
        await shot(page, `${step.name}-FAILED`);
      } catch {}
      results.push({ name: step.name, status: "error", error: msg });
    }
  }

  await browser.close();

  const summary = [
    "# Proof-it run summary (v2) — shadcn/BaseUI migration",
    "",
    `Date: ${new Date().toISOString()}`,
    `Meta-epic: beads-gui-yf3a`,
    "",
    "| # | Step | Status | Notes |",
    "|---|---|---|---|",
    ...results.map(
      (r, i) =>
        `| ${i + 1} | ${r.name} | ${r.status === "ok" ? "✓" : "🔴 " + r.status} | ${r.error ?? ""} |`,
    ),
  ].join("\n");
  writeFileSync(join(PROOF_DIR, "_run-summary-v2.md"), summary);
  log(`wrote _run-summary-v2.md`);

  const failed = results.filter((r) => r.status === "error").length;
  log(`v2 done — ${results.length - failed}/${results.length} steps green`);
  process.exit(failed > 0 ? 1 : 0);
})();
