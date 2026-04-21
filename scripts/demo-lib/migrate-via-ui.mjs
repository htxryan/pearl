#!/usr/bin/env node
// One-shot: open the app, click the Pearl-managed migration button, wait for
// the reload to complete and the list view to render. Use this only when the
// backend is in deprecated embedded mode and the demo runner needs a working app.
import { chromium } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('console', (m) => {
    if (['error', 'warning'].includes(m.type())) console.log(`[browser ${m.type()}] ${m.text()}`);
  });

  console.log('Opening app...');
  await page.goto(`${BASE_URL}/list`, { waitUntil: 'networkidle' });

  const btn = page.locator('[data-testid="migrate-managed-btn"]');
  console.log('Waiting for migration modal...');
  const appeared = await btn.waitFor({ state: 'visible', timeout: 20_000 }).then(() => true).catch(() => false);
  if (!appeared) {
    // Dump state to help diagnose.
    const bodyText = (await page.locator('body').innerText().catch(() => '')).slice(0, 400);
    console.log('Modal never appeared. Body text preview:', bodyText);
    await page.screenshot({ path: '/tmp/pearl-no-modal.png' });
    console.log('Screenshot: /tmp/pearl-no-modal.png');
    await browser.close();
    process.exit(1);
  }

  console.log('Clicking "Start Pearl-managed server"...');
  await btn.click();

  // The modal fires POST /api/migrate and schedules a reload at +3s.
  console.log('Waiting for reload + list view...');
  await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
  // After reload, modal should be gone and the issue table should render.
  const tableReady = await page
    .waitForSelector('table', { timeout: 30_000 })
    .then(() => true)
    .catch(() => false);

  if (!tableReady) {
    console.error('Table never rendered after migration.');
    await page.screenshot({ path: '/tmp/pearl-migration-failure.png' });
    console.error('Screenshot: /tmp/pearl-migration-failure.png');
    await browser.close();
    process.exit(1);
  }

  console.log('Migration complete. List view rendering.');
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
