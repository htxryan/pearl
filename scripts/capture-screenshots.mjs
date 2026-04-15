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

  // Clear onboarding so it doesn't cover the UI
  await page.goto(`${BASE_URL}/list`);
  await page.evaluate(() => localStorage.setItem('pearl-onboarding-complete', 'true'));
  await page.reload();
  await page.waitForSelector('table', { timeout: 10000 });
  await sleep(2000);

  // ── 1. List View with sidebar icons, quick-add, filter bar ──
  console.log('1. List View (sidebar icons, quick-add, filters)...');
  await page.screenshot({ path: 'docs/demo/01-list-view.png', fullPage: false });

  // ── 2. Filter presets — set a filter then save as preset ──
  console.log('2. Filter presets...');
  const statusSelect = page.locator('select[aria-label="Filter by status"]');
  if (await statusSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
    await statusSelect.selectOption('open');
    await sleep(1000);
  }
  // Look for "Save view" button
  const saveViewBtn = page.locator('button', { hasText: /Save view/i }).first();
  if (await saveViewBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await saveViewBtn.click();
    await sleep(500);
  }
  await page.screenshot({ path: 'docs/demo/02-filter-presets.png', fullPage: false });
  // Clear filters
  const clearAll = page.locator('button', { hasText: /Clear all/i }).first();
  if (await clearAll.isVisible({ timeout: 1000 }).catch(() => false)) {
    await clearAll.click();
    await sleep(500);
  }

  // ── 3. Bulk actions (select rows, show bulk bar) ──
  console.log('3. Bulk actions bar...');
  // Select a few rows via checkboxes
  const checkboxes = page.locator('tbody input[type="checkbox"]');
  const checkCount = await checkboxes.count();
  for (let i = 0; i < Math.min(3, checkCount); i++) {
    await checkboxes.nth(i).click();
    await sleep(200);
  }
  await sleep(500);
  await page.screenshot({ path: 'docs/demo/03-bulk-actions.png', fullPage: false });
  // Clear selection
  const clearSel = page.locator('button', { hasText: /Clear selection/i }).first();
  if (await clearSel.isVisible({ timeout: 1000 }).catch(() => false)) {
    await clearSel.click();
    await sleep(300);
  }

  // ── 4. Column visibility menu ──
  console.log('4. Column visibility...');
  const colBtn = page.locator('button[aria-label="Toggle column visibility"]').first();
  if (await colBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await colBtn.click();
    await sleep(800);
    await page.screenshot({ path: 'docs/demo/04-column-visibility.png', fullPage: false });
    await colBtn.click(); // close
    await sleep(300);
  }

  // ── 5. Click a row to open detail view (breadcrumbs, fields, markdown) ──
  console.log('5. Issue Detail (breadcrumbs, inline edit, fields)...');
  const row = page.locator('tbody tr').first();
  if (await row.isVisible()) {
    await row.click();
    await sleep(2000);
    await page.screenshot({ path: 'docs/demo/05-detail-view.png', fullPage: false });
  }

  // ── 6. Scroll detail to show markdown section with edit toolbar ──
  console.log('6. Markdown editor with preview...');
  const mainContent = page.locator('main');
  await mainContent.evaluate(el => el.scrollBy(0, 400));
  await sleep(500);
  // Click edit on a markdown section
  const editBtn = page.locator('button', { hasText: /^Edit$/ }).first();
  if (await editBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await editBtn.click();
    await sleep(800);
    await page.screenshot({ path: 'docs/demo/06-markdown-editor.png', fullPage: false });
    // Cancel edit
    const cancelBtn = page.locator('button', { hasText: /^Cancel$/ }).first();
    if (await cancelBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await cancelBtn.click();
      await sleep(300);
    }
  }

  // ── 7. Scroll to dependencies section with autocomplete ──
  console.log('7. Dependency autocomplete...');
  await mainContent.evaluate(el => el.scrollBy(0, 400));
  await sleep(500);
  const addDepBtn = page.locator('button', { hasText: /Add/i }).first();
  if (await addDepBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await addDepBtn.click();
    await sleep(500);
    const depInput = page.locator('input[role="combobox"]').first();
    if (await depInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await depInput.fill('epic');
      await sleep(1500);
      await page.screenshot({ path: 'docs/demo/07-dependency-autocomplete.png', fullPage: false });
      await page.keyboard.press('Escape');
      await sleep(300);
    }
  }

  // Go back
  await page.keyboard.press('Escape');
  await sleep(1000);

  // ── 8. Command Palette with issue search ──
  console.log('8. Command Palette (issue search)...');
  await page.keyboard.press('Meta+k');
  await sleep(800);
  await page.screenshot({ path: 'docs/demo/08-command-palette-empty.png', fullPage: false });
  // Type to search issues
  await page.keyboard.type('rock solid', { delay: 80 });
  await sleep(1500);
  await page.screenshot({ path: 'docs/demo/09-command-palette-search.png', fullPage: false });
  await page.keyboard.press('Escape');
  await sleep(500);

  // ── 9. Keyboard shortcut help overlay ──
  console.log('9. Keyboard shortcuts overlay (?key)...');
  await page.keyboard.press('Shift+?');
  await sleep(1000);
  await page.screenshot({ path: 'docs/demo/10-keyboard-shortcuts.png', fullPage: false });
  await page.keyboard.press('Escape');
  await sleep(500);

  // ── 10. Board View (kanban cards with status bars, assignee avatars) ──
  console.log('10. Board View (kanban cards, status bars)...');
  await page.goto(`${BASE_URL}/board`);
  await page.waitForLoadState('networkidle');
  await sleep(2000);
  await page.screenshot({ path: 'docs/demo/11-board-view.png', fullPage: false });

  // ── 11. Quick-add in board column ──
  console.log('11. Quick-add in board...');
  const boardQuickAdd = page.locator('input[placeholder*="Quick add"]').first();
  if (await boardQuickAdd.isVisible({ timeout: 2000 }).catch(() => false)) {
    await boardQuickAdd.fill('Demo quick-add issue');
    await sleep(500);
    await page.screenshot({ path: 'docs/demo/12-board-quick-add.png', fullPage: false });
    await boardQuickAdd.fill('');
  }

  // ── 12. Graph View ──
  console.log('12. Graph View (dependency visualization)...');
  await page.goto(`${BASE_URL}/graph`);
  await page.waitForLoadState('networkidle');
  await sleep(3000);
  await page.screenshot({ path: 'docs/demo/13-graph-view.png', fullPage: false });

  // ── 13. Settings page with theme picker ──
  console.log('13. Settings — Theme Picker...');
  await page.goto(`${BASE_URL}/settings`);
  await page.waitForLoadState('networkidle');
  await sleep(2000);
  await page.screenshot({ path: 'docs/demo/14-settings-theme-picker.png', fullPage: false });

  // ── 14. Apply Monokai theme ──
  console.log('14. Monokai theme on board...');
  const monokaiCard = page.locator('button[aria-label*="Monokai theme"]').first();
  if (await monokaiCard.isVisible({ timeout: 2000 }).catch(() => false)) {
    await monokaiCard.click();
    await sleep(1000);
  }
  await page.goto(`${BASE_URL}/board`);
  await page.waitForLoadState('networkidle');
  await sleep(2000);
  await page.screenshot({ path: 'docs/demo/15-monokai-board.png', fullPage: false });

  // ── 15. Solarized Light via command palette ──
  console.log('15. Solarized Light via Command Palette...');
  await page.keyboard.press('Meta+k');
  await sleep(500);
  await page.keyboard.type('Solarized Light', { delay: 60 });
  await sleep(1500);
  await page.screenshot({ path: 'docs/demo/16-cmd-palette-switch-theme.png', fullPage: false });
  await page.keyboard.press('Enter');
  await sleep(1500);
  await page.goto(`${BASE_URL}/list`);
  await page.waitForLoadState('networkidle');
  await sleep(2000);
  await page.screenshot({ path: 'docs/demo/17-solarized-light-list.png', fullPage: false });

  // Reset to default theme
  const defaultThemeCard = page.locator('button[aria-label*="Light+"], button[aria-label*="Default Light"]').first();
  await page.goto(`${BASE_URL}/settings`);
  await sleep(1500);
  if (await defaultThemeCard.isVisible({ timeout: 2000 }).catch(() => false)) {
    await defaultThemeCard.click();
    await sleep(500);
  }

  // ── 16. 404 page ──
  console.log('16. 404 Page...');
  await page.goto(`${BASE_URL}/nonexistent-page`);
  await sleep(1500);
  await page.screenshot({ path: 'docs/demo/18-404-page.png', fullPage: false });

  // ── 17. Create issue dialog ──
  console.log('17. Create issue dialog...');
  await page.goto(`${BASE_URL}/list`);
  await sleep(1500);
  await page.keyboard.press('Meta+k');
  await sleep(500);
  await page.keyboard.type('create', { delay: 80 });
  await sleep(500);
  await page.keyboard.press('Enter');
  await sleep(1000);
  await page.screenshot({ path: 'docs/demo/19-create-issue-dialog.png', fullPage: false });
  await page.keyboard.press('Escape');
  await sleep(500);

  // ── 18. Onboarding banner (clear storage to show it) ──
  console.log('18. Onboarding banner...');
  await page.evaluate(() => localStorage.removeItem('pearl-onboarding-complete'));
  await page.reload();
  await sleep(2000);
  await page.screenshot({ path: 'docs/demo/20-onboarding-banner.png', fullPage: false });
  // Dismiss onboarding
  await page.evaluate(() => localStorage.setItem('pearl-onboarding-complete', 'true'));

  console.log(`Done! ${20} screenshots in docs/demo/`);
  await browser.close();
}

capture().catch(e => {
  console.error('Capture failed:', e);
  process.exit(1);
});
