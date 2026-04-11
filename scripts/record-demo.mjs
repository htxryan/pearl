import { chromium } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const SLOW = 800; // ms between actions for visibility

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function demo() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: './docs/demo/', size: { width: 1440, height: 900 } },
  });
  const page = await context.newPage();

  // ── List View ──
  console.log('1. Opening List View...');
  await page.goto(`${BASE_URL}/list`);
  await page.waitForSelector('table', { timeout: 10000 });
  await sleep(2000); // let user see the full table

  // Scroll down slowly to show all issues
  console.log('2. Scrolling through issues...');
  await page.mouse.wheel(0, 200);
  await sleep(1500);
  await page.mouse.wheel(0, 200);
  await sleep(1500);
  await page.mouse.wheel(0, -400); // scroll back up
  await sleep(1000);

  // Click on a filter or sort
  console.log('3. Filtering by status...');
  const statusFilter = page.locator('select, [data-filter="status"], [role="combobox"]').first();
  if (await statusFilter.isVisible()) {
    await statusFilter.click();
    await sleep(SLOW);
    // Try to select "open" if dropdown
    const openOption = page.locator('option[value="open"], [data-value="open"]').first();
    if (await openOption.isVisible()) {
      await openOption.click();
      await sleep(1500);
    }
  }
  await sleep(1000);

  // Click on a column header to sort
  console.log('4. Sorting by priority...');
  const priorityHeader = page.locator('th, [role="columnheader"]').filter({ hasText: /priority/i }).first();
  if (await priorityHeader.isVisible()) {
    await priorityHeader.click();
    await sleep(1500);
  }

  // Click on an issue to open detail
  console.log('5. Opening issue detail...');
  const firstRow = page.locator('tr[data-row-id], tbody tr').first();
  if (await firstRow.isVisible()) {
    await firstRow.click();
    await sleep(2500); // let detail panel open and render
  }

  // Scroll detail panel to see comments/timeline
  console.log('6. Scrolling detail panel...');
  const detailPanel = page.locator('[data-panel="detail"], .detail-panel, aside').first();
  if (await detailPanel.isVisible()) {
    await detailPanel.evaluate(el => el.scrollBy(0, 300));
    await sleep(1500);
    await detailPanel.evaluate(el => el.scrollBy(0, 300));
    await sleep(1500);
  }

  // Close detail and go back to list
  console.log('7. Closing detail panel...');
  await page.keyboard.press('Escape');
  await sleep(1000);

  // ── Command Palette ──
  console.log('8. Opening command palette (Cmd+K)...');
  await page.keyboard.press('Meta+k');
  await sleep(1500);
  // Type something
  await page.keyboard.type('create', { delay: 100 });
  await sleep(1500);
  await page.keyboard.press('Escape');
  await sleep(SLOW);

  // ── Board View ──
  console.log('9. Switching to Board View...');
  // Try keyboard shortcut first
  await page.keyboard.press('2');
  await sleep(500);
  // If that didn't work, try navigation
  const currentUrl = page.url();
  if (!currentUrl.includes('/board')) {
    await page.goto(`${BASE_URL}/board`);
  }
  await page.waitForLoadState('networkidle');
  await sleep(2500); // let kanban board render fully

  // Pan across columns
  console.log('10. Viewing kanban columns...');
  await page.mouse.wheel(300, 0);
  await sleep(1500);
  await page.mouse.wheel(-300, 0);
  await sleep(1000);

  // ── Graph View ──
  console.log('11. Switching to Graph View...');
  await page.keyboard.press('3');
  await sleep(500);
  const graphUrl = page.url();
  if (!graphUrl.includes('/graph')) {
    await page.goto(`${BASE_URL}/graph`);
  }
  await page.waitForLoadState('networkidle');
  await sleep(3000); // let graph layout settle

  // Zoom and pan on graph
  console.log('12. Exploring dependency graph...');
  // Zoom in
  await page.mouse.wheel(0, -200);
  await sleep(1000);
  // Pan
  await page.mouse.move(720, 450);
  await page.mouse.down();
  await page.mouse.move(520, 350, { steps: 20 });
  await page.mouse.up();
  await sleep(1500);
  // Zoom out
  await page.mouse.wheel(0, 200);
  await sleep(1500);

  // Click a node
  console.log('13. Clicking a graph node...');
  const graphNode = page.locator('.react-flow__node, [data-id]').first();
  if (await graphNode.isVisible()) {
    await graphNode.click();
    await sleep(2000);
  }

  // ── Back to List View ──
  console.log('14. Back to List View...');
  await page.keyboard.press('1');
  await sleep(500);
  if (!page.url().includes('/list')) {
    await page.goto(`${BASE_URL}/list`);
  }
  await page.waitForLoadState('networkidle');
  await sleep(2000);

  // ── Dark mode toggle ──
  console.log('15. Toggling dark mode...');
  const darkToggle = page.locator('[data-theme-toggle], button:has-text("dark"), button:has-text("theme"), [aria-label*="theme"], [aria-label*="dark"]').first();
  if (await darkToggle.isVisible()) {
    await darkToggle.click();
    await sleep(2000);
    await darkToggle.click();
    await sleep(1500);
  }

  // Final pause
  console.log('16. Final overview...');
  await sleep(2000);

  // Close
  console.log('Recording complete. Saving video...');
  await page.close();
  await context.close();
  await browser.close();

  console.log('Video saved to docs/demo/');
}

demo().catch(e => {
  console.error('Demo failed:', e);
  process.exit(1);
});
