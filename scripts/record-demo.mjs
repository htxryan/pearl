import { chromium } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function demo() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: {
      dir: './docs/demo/',
      size: { width: 1440, height: 900 },
    },
  });
  const page = await context.newPage();

  // ── 1. List View ──
  console.log('1. List View — full table with issues');
  await page.goto(`${BASE_URL}/list`);
  await page.waitForSelector('tbody tr', { timeout: 10000 });
  await sleep(3000);

  // Scroll down to show more issues
  console.log('2. Scrolling through issues');
  await page.mouse.wheel(0, 250);
  await sleep(2000);
  await page.mouse.wheel(0, -250);
  await sleep(1500);

  // ── 2. Sort by priority ──
  console.log('3. Sorting by priority');
  const priorityHeader = page.locator('th').filter({ hasText: /priority/i }).first();
  if (await priorityHeader.isVisible().catch(() => false)) {
    await priorityHeader.click();
    await sleep(2000);
  }

  // ── 3. Click an issue to open detail ──
  console.log('4. Opening issue detail panel');
  const bugRow = page.locator('tbody tr').filter({ hasText: /Login form crashes/ }).first();
  if (await bugRow.isVisible().catch(() => false)) {
    await bugRow.click();
  } else {
    await page.locator('tbody tr').first().click();
  }
  await sleep(3000);

  // Scroll detail to see description, comments
  console.log('5. Reading issue detail — description, fields, comments');
  const detailScroll = page.locator('main, [role="main"], .detail-panel, aside').last();
  await detailScroll.evaluate(el => el.scrollBy(0, 300)).catch(() => {});
  await sleep(2000);
  await detailScroll.evaluate(el => el.scrollBy(0, 300)).catch(() => {});
  await sleep(2000);

  // Close detail
  console.log('6. Closing detail');
  await page.keyboard.press('Escape');
  await sleep(1500);

  // ── 4. Command Palette ──
  console.log('7. Opening command palette (Cmd+K)');
  await page.keyboard.press('Meta+k');
  await sleep(2000);
  await page.keyboard.type('board', { delay: 150 });
  await sleep(2000);
  await page.keyboard.press('Escape');
  await sleep(1000);

  // ── 5. Board View ──
  console.log('8. Navigating to Board View');
  await page.goto(`${BASE_URL}/board`);
  await page.waitForLoadState('networkidle');
  await sleep(3500);

  // Pan to see all columns
  console.log('9. Viewing kanban columns — Open, In Progress, Closed, Blocked');
  await page.mouse.wheel(400, 0);
  await sleep(2000);
  await page.mouse.wheel(-400, 0);
  await sleep(2000);

  // ── 6. Graph View ──
  console.log('10. Navigating to Dependency Graph');
  await page.goto(`${BASE_URL}/graph`);
  await page.waitForLoadState('networkidle');
  await sleep(4000);

  // Zoom in to see node detail
  console.log('11. Zooming into graph');
  for (let i = 0; i < 3; i++) {
    await page.mouse.wheel(0, -100);
    await sleep(500);
  }
  await sleep(2000);

  // Pan around
  console.log('12. Panning the graph');
  await page.mouse.move(720, 450);
  await page.mouse.down();
  await page.mouse.move(500, 300, { steps: 30 });
  await page.mouse.up();
  await sleep(2000);

  // Zoom back out
  console.log('13. Zooming out');
  for (let i = 0; i < 4; i++) {
    await page.mouse.wheel(0, 100);
    await sleep(400);
  }
  await sleep(2000);

  // ── 7. Dark Mode ──
  console.log('14. Toggling dark mode');
  const themeBtn = page.locator('button').filter({ hasText: /🌙|☀|theme|dark|light/i }).first();
  if (await themeBtn.isVisible().catch(() => false)) {
    await themeBtn.click();
    await sleep(3000);
    // Toggle back
    await themeBtn.click();
    await sleep(2000);
  } else {
    // Try aria-label
    const ariaBtn = page.locator('[aria-label*="theme"], [aria-label*="Theme"], [aria-label*="dark"], [aria-label*="mode"]').first();
    if (await ariaBtn.isVisible().catch(() => false)) {
      await ariaBtn.click();
      await sleep(3000);
      await ariaBtn.click();
      await sleep(2000);
    }
  }

  // ── 8. Back to list for final view ──
  console.log('15. Final — back to list view');
  await page.goto(`${BASE_URL}/list`);
  await page.waitForLoadState('networkidle');
  await sleep(3000);

  // Done
  console.log('Recording complete.');
  await page.close();
  await context.close();
  await browser.close();

  // Rename the video
  const fs = await import('fs');
  const files = fs.readdirSync('./docs/demo/').filter(f => f.endsWith('.webm'));
  const latest = files.sort().pop();
  if (latest && latest !== 'beads-gui-demo.webm') {
    fs.renameSync(`./docs/demo/${latest}`, './docs/demo/beads-gui-demo.webm');
  }
  console.log('Video saved as docs/demo/beads-gui-demo.webm');
}

demo().catch(e => {
  console.error('Demo failed:', e.message);
  process.exit(1);
});
