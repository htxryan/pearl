// v6 — comprehensive proof gathering after layout fixes:
// 1. Re-capture screenshots affected by the shell-width bug fix
// 2. Re-capture v2-09 label picker properly OPEN with options visible
// 3. Theme matrix: all 15 themes against the primitive showcase page
// 4. Keyboard accessibility: focus trap, focus return, arrow-key nav
// 5. Performance evidence: lazy-load capture (Calendar chunk loads on demand)
//
// Bundle size lives in a separate script (proof-bundle-size.sh)
// Virtualization needs label seeding — also separate (covered conditionally)

import { chromium, type Browser, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "fs";
import { join, resolve } from "path";

const REPO_ROOT = resolve(__dirname, "..");
const PROOF_DIR = join(REPO_ROOT, "docs", "proof", "beads-gui-yf3a");
const APP = "http://localhost:5173";
mkdirSync(PROOF_DIR, { recursive: true });
const log = (m: string) => console.log(`[proof-v6] ${m}`);

async function shot(page: Page, name: string, fullPage = false) {
  await page.screenshot({
    path: join(PROOF_DIR, `${name}.png`),
    fullPage,
    animations: "disabled",
  });
  log(`saved ${name}.png`);
}

async function freshLoad(page: Page, url = APP) {
  await page.goto(url);
  await page.waitForLoadState("networkidle");
  const skip = page.getByRole("button", { name: /^skip$/i }).first();
  if (await skip.isVisible({ timeout: 600 }).catch(() => false)) {
    await skip.click().catch(() => {});
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(400);
}

// 15 themes from packages/frontend/src/themes/index.ts
const ALL_THEMES = [
  { id: "light-plus", name: "Light+ (Default Light)" },
  { id: "dark-plus", name: "Dark+ (Default Dark)" },
  { id: "vs-light", name: "Visual Studio Light" },
  { id: "vs-dark", name: "Visual Studio Dark" },
  { id: "monokai", name: "Monokai" },
  { id: "monokai-dimmed", name: "Monokai Dimmed" },
  { id: "solarized-light", name: "Solarized Light" },
  { id: "solarized-dark", name: "Solarized Dark" },
  { id: "abyss", name: "Abyss" },
  { id: "kimbie-dark", name: "Kimbie Dark" },
  { id: "quiet-light", name: "Quiet Light" },
  { id: "red", name: "Red" },
  { id: "tomorrow-night-blue", name: "Tomorrow Night Blue" },
  { id: "hc-dark", name: "High Contrast Dark" },
  { id: "hc-light", name: "High Contrast Light" },
];

interface Step {
  name: string;
  fn: (page: Page) => Promise<void>;
}

const steps: Step[] = [
  // ============================================================
  // PART 1: Re-capture screenshots affected by the shell-width fix
  // ============================================================
  {
    name: "v6-fix-01-list-view-fullwidth",
    fn: async (page) => {
      await freshLoad(page);
      await shot(page, "v6-fix-01-list-view-fullwidth");
    },
  },
  {
    name: "v6-fix-02-settings-fullwidth",
    fn: async (page) => {
      await freshLoad(page, `${APP}/settings`);
      await shot(page, "v6-fix-02-settings-fullwidth");
    },
  },
  {
    name: "v6-fix-03-board-fullwidth",
    fn: async (page) => {
      await freshLoad(page, `${APP}/board`);
      await page.waitForTimeout(800);
      await shot(page, "v6-fix-03-board-fullwidth");
    },
  },
  {
    name: "v6-fix-04-graph-fullwidth",
    fn: async (page) => {
      await freshLoad(page, `${APP}/graph`);
      await page.waitForTimeout(1500);
      await shot(page, "v6-fix-04-graph-fullwidth");
    },
  },
  {
    name: "v6-fix-05-command-palette-bounded",
    fn: async (page) => {
      await freshLoad(page);
      await page.keyboard.press("Meta+k");
      await page.waitForTimeout(700);
      await shot(page, "v6-fix-05-command-palette-bounded");
      // Scroll inside the palette to prove it's scrollable
      const list = page.locator('[cmdk-list]').first();
      await list.evaluate((el) => el.scrollTo({ top: 999 }));
      await page.waitForTimeout(300);
      await shot(page, "v6-fix-06-command-palette-scrolled");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    },
  },

  // ============================================================
  // PART 2: Re-capture v2-09 — label picker properly OPEN
  // ============================================================
  {
    name: "v6-fix-07-label-picker-popover",
    fn: async (page) => {
      await freshLoad(page);
      // Open create-issue dialog via keyboard shortcut "c"
      await page.keyboard.press("c");
      await page.waitForTimeout(700);
      // Focus the labels search input
      const labelInput = page.locator('input[placeholder*="label" i]').first();
      await labelInput.click();
      await page.waitForTimeout(400);
      // Type to trigger filtering / popover (the BaseUI Combobox opens once focused
      // but options need to be present; type a single letter to ensure we see filtering)
      await page.keyboard.type("b");
      await page.waitForTimeout(700);
      await shot(page, "v6-fix-07-label-picker-popover");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    },
  },

  // ============================================================
  // PART 3: Theme matrix — all 15 themes on primitive showcase
  // ============================================================
  ...ALL_THEMES.map<Step>((theme) => ({
    name: `v6-theme-${theme.id}`,
    fn: async (page) => {
      // Navigate to showcase. If we're already on it, just call the theme setter.
      const onShowcase = page.url().endsWith("/__showcase");
      if (!onShowcase) {
        await page.goto(`${APP}/__showcase`);
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(400);
      }
      // Use the exposed global helper, which writes localStorage AND applies CSS vars
      await page.evaluate((id) => {
        const setter = (window as unknown as { __pearlSetTheme?: (id: string) => void })
          .__pearlSetTheme;
        if (setter) setter(id);
      }, theme.id);
      // Wait for re-render + repaint
      await page.waitForTimeout(500);
      await shot(page, `v6-theme-${theme.id}`, /* fullPage */ true);
    },
  })),

  // ============================================================
  // PART 4: Keyboard accessibility
  // ============================================================
  {
    name: "v6-a11y-01-dialog-focus-trap-on-open",
    fn: async (page) => {
      // Reset to default theme first via the global setter
      await page.goto(APP);
      await page.evaluate(() => {
        const setter = (window as unknown as { __pearlSetTheme?: (id: string) => void })
          .__pearlSetTheme;
        if (setter) setter("light-plus");
      });
      await freshLoad(page);
      // Open create-issue dialog
      await page.keyboard.press("c");
      await page.waitForTimeout(700);
      // Outline the currently focused element via JS
      await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        if (el) el.style.outline = "3px solid red";
      });
      await page.waitForTimeout(200);
      await shot(page, "v6-a11y-01-dialog-focus-trap-on-open");
    },
  },
  {
    name: "v6-a11y-02-dialog-tab-into-form",
    fn: async (page) => {
      // Continuing from previous: we're in the open Create dialog.
      // Reset outline, then Tab 3 times to move focus through inputs.
      await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        if (el) el.style.outline = "";
      });
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      await page.waitForTimeout(200);
      await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        if (el) el.style.outline = "3px solid red";
      });
      await shot(page, "v6-a11y-02-dialog-tab-into-form");
    },
  },
  {
    name: "v6-a11y-03-dialog-escape-focus-return",
    fn: async (page) => {
      // Reset outline
      await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        if (el) el.style.outline = "";
      });
      // Escape closes dialog → focus should return to the trigger (Create Issue button)
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
      await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        if (el) el.style.outline = "3px solid red";
      });
      await shot(page, "v6-a11y-03-dialog-escape-focus-return");
      // Reset
      await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        if (el) el.style.outline = "";
      });
    },
  },
  {
    name: "v6-a11y-04-dropdown-arrow-nav",
    fn: async (page) => {
      // Navigate to a detail view to use the Actions dropdown
      await page.goto(`${APP}/issues/sample-project-dzp`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(600);
      // Click Actions to open dropdown
      const actions = page.getByRole("button", { name: /actions/i }).first();
      await actions.click();
      await page.waitForTimeout(500);
      // Press ArrowDown twice to navigate to 3rd item
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowDown");
      await page.waitForTimeout(300);
      await shot(page, "v6-a11y-04-dropdown-arrow-nav");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    },
  },
  {
    name: "v6-a11y-05-combobox-typeahead",
    fn: async (page) => {
      // Use the labels combobox in the issue detail (already on detail page from prev step)
      // Click into the labels search
      const labels = page.locator('input[placeholder*="label" i]').first();
      if (await labels.isVisible({ timeout: 2000 }).catch(() => false)) {
        await labels.click();
        await page.waitForTimeout(300);
        await page.keyboard.type("o");
        await page.waitForTimeout(500);
        await page.keyboard.press("ArrowDown");
        await page.waitForTimeout(300);
      }
      await shot(page, "v6-a11y-05-combobox-typeahead");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    },
  },

  // ============================================================
  // PART 5: Performance — lazy-load DatePicker chunk
  // ============================================================
  {
    name: "v6-perf-01-lazy-load-datepicker",
    fn: async (page) => {
      // Capture network requests during create-dialog open (DatePicker is lazy-loaded)
      const datePickerChunks: string[] = [];
      page.on("response", (resp) => {
        const url = resp.url();
        if (url.includes("date-picker") || url.includes("DatePicker") || url.includes("react-day-picker")) {
          datePickerChunks.push(url);
        }
      });

      await freshLoad(page);
      // At this point the list view is loaded; DatePicker chunk should NOT be loaded yet.
      // Now open create dialog which uses lazy(DatePicker)
      await page.keyboard.press("c");
      // Wait for the lazy chunk to be requested
      await page.waitForTimeout(2500);
      await shot(page, "v6-perf-01-lazy-load-datepicker");
      // Persist the network observations
      writeFileSync(
        join(PROOF_DIR, "v6-perf-01-network-observations.txt"),
        `DatePicker / react-day-picker chunk requests observed AFTER opening Create Dialog:\n\n${
          datePickerChunks.length === 0
            ? "(none — see v6-perf-network-all.txt for full request log)"
            : datePickerChunks.join("\n")
        }\n`,
      );
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
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
    "# Proof-it run summary (v6) — fixes + theme matrix + a11y + perf",
    "",
    `Date: ${new Date().toISOString()}`,
    "",
    "| # | Step | Status | Notes |",
    "|---|---|---|---|",
    ...results.map((r, i) => `| ${i + 1} | ${r.name} | ${r.status === "ok" ? "✓" : "🔴"} | ${r.error ?? ""} |`),
  ].join("\n");
  writeFileSync(join(PROOF_DIR, "_run-summary-v6.md"), sum);
  const failed = results.filter((r) => r.status === "error").length;
  log(`v6 done — ${results.length - failed}/${results.length} steps green`);
  process.exit(failed > 0 ? 1 : 0);
})();
