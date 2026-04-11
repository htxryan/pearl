import { chromium } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function capture() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  // ── 1. List View ──
  console.log('1. List View...');
  await page.goto(`${BASE_URL}/list`);
  await page.waitForSelector('table', { timeout: 10000 });
  await sleep(2000);
  await page.screenshot({ path: 'docs/demo/01-list-view.png', fullPage: false });

  // ── 2. Click a row to open detail ──
  console.log('2. Issue Detail Panel...');
  const row = page.locator('tbody tr').first();
  if (await row.isVisible()) {
    await row.click();
    await sleep(2000);
    await page.screenshot({ path: 'docs/demo/02-detail-panel.png', fullPage: false });
  }

  // Close detail
  await page.keyboard.press('Escape');
  await sleep(500);

  // ── 3. Command Palette ──
  console.log('3. Command Palette...');
  await page.keyboard.press('Meta+k');
  await sleep(1000);
  await page.screenshot({ path: 'docs/demo/03-command-palette.png', fullPage: false });
  await page.keyboard.press('Escape');
  await sleep(500);

  // ── 4. Board View ──
  console.log('4. Board View...');
  await page.goto(`${BASE_URL}/board`);
  await page.waitForLoadState('networkidle');
  await sleep(2000);
  await page.screenshot({ path: 'docs/demo/04-board-view.png', fullPage: false });

  // ── 5. Graph View ──
  console.log('5. Graph View...');
  await page.goto(`${BASE_URL}/graph`);
  await page.waitForLoadState('networkidle');
  await sleep(3000); // let dagre layout settle
  await page.screenshot({ path: 'docs/demo/05-graph-view.png', fullPage: false });

  // ── 6. Dark mode (if available) ──
  console.log('6. Dark mode...');
  const darkToggle = page.locator('[data-theme-toggle], button:has-text("dark"), button:has-text("theme"), [aria-label*="theme"], [aria-label*="dark"], [aria-label*="Theme"]').first();
  if (await darkToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
    await darkToggle.click();
    await sleep(1000);
    await page.screenshot({ path: 'docs/demo/06-dark-mode.png', fullPage: false });
  } else {
    console.log('  (no dark mode toggle found, skipping)');
  }

  console.log('Done! Screenshots in docs/demo/');
  await browser.close();
}

capture().catch(e => {
  console.error('Capture failed:', e);
  process.exit(1);
});
