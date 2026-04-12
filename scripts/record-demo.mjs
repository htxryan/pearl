import { chromium } from '@playwright/test';
import { execSync } from 'child_process';

const BASE_URL = 'http://localhost:5173';
const RAW_VIDEO = './docs/demo/raw-demo.webm';
const FINAL_VIDEO = './docs/demo/beads-gui-demo.webm';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/** Track captions with timestamps */
class CaptionTracker {
  constructor() {
    this.captions = [];
    this.startTime = Date.now();
  }
  mark(text) {
    const elapsed = (Date.now() - this.startTime) / 1000;
    this.captions.push({ time: elapsed, text });
    console.log(`  [${elapsed.toFixed(1)}s] ${text}`);
  }
  /** Build ffmpeg drawtext filter chain */
  buildFilter() {
    if (this.captions.length === 0) return '';
    const filters = [];
    for (let i = 0; i < this.captions.length; i++) {
      const start = this.captions[i].time;
      const end = i + 1 < this.captions.length ? this.captions[i + 1].time : start + 10;
      const text = this.captions[i].text
        .replace(/'/g, "\u2019")  // curly quote
        .replace(/:/g, "\\:")
        .replace(/\\/g, "\\\\");
      // White text on semi-transparent dark banner at bottom
      filters.push(
        `drawtext=text='${text}':` +
        `fontsize=24:fontcolor=white:` +
        `borderw=2:bordercolor=black@0.8:` +
        `box=1:boxcolor=black@0.65:boxborderw=12:` +
        `x=(w-text_w)/2:y=h-th-40:` +
        `enable='between(t,${start.toFixed(2)},${end.toFixed(2)})'`
      );
    }
    return filters.join(',');
  }
}

async function demo() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: {
      dir: './docs/demo/_raw/',
      size: { width: 1440, height: 900 },
    },
  });
  const page = await context.newPage();
  const cap = new CaptionTracker();

  // ── Setup: dismiss onboarding first, then re-enable for demo ──
  await page.goto(`${BASE_URL}/list`);
  await page.evaluate(() => localStorage.setItem('beads-gui-onboarding-complete', 'true'));
  await page.evaluate(() => localStorage.removeItem('beads:col-visibility'));
  await page.evaluate(() => localStorage.removeItem('beads:col-order'));
  await page.evaluate(() => localStorage.removeItem('beads:col-sizing'));
  await page.reload();
  await page.waitForSelector('table', { timeout: 10000 });
  await sleep(1500);

  // ═══════════════════════════════════════════════
  // SECTION 1: LIST VIEW & NAVIGATION
  // ═══════════════════════════════════════════════

  cap.mark('List View \u2014 Full issue table with custom typography');
  await sleep(3000);

  // Sidebar icons
  cap.mark('Sidebar \u2014 Navigation icons with keyboard shortcuts');
  await sleep(2500);

  // Scroll to show more issues
  cap.mark('Custom font pairing \u2014 Geist Sans + Geist Mono');
  await page.mouse.wheel(0, 300);
  await sleep(2000);
  await page.mouse.wheel(0, -300);
  await sleep(1500);

  // ── Quick-add ──
  cap.mark('Quick Add \u2014 Create issues with just a title');
  const quickAdd = page.locator('input[aria-label="Quick add issue"], input[placeholder*="Quick add"]').first();
  if (await quickAdd.isVisible({ timeout: 2000 }).catch(() => false)) {
    await quickAdd.click();
    await sleep(300);
    await quickAdd.fill('Demo: quick-add issue creation');
    await sleep(1500);
    // Don't actually submit, just show the UI
    await quickAdd.fill('');
    await sleep(500);
  }

  // ── Keyboard navigation ──
  cap.mark('Keyboard Navigation \u2014 j/k to move, Enter to open');
  await page.keyboard.press('j');
  await sleep(400);
  await page.keyboard.press('j');
  await sleep(400);
  await page.keyboard.press('j');
  await sleep(400);
  await page.keyboard.press('k');
  await sleep(1500);

  // ── Row selection & bulk actions ──
  cap.mark('Row Selection \u2014 Press x to toggle, bulk actions appear');
  await page.keyboard.press('x');
  await sleep(400);
  await page.keyboard.press('j');
  await sleep(200);
  await page.keyboard.press('x');
  await sleep(400);
  await page.keyboard.press('j');
  await sleep(200);
  await page.keyboard.press('x');
  await sleep(1500);

  cap.mark('Bulk Actions \u2014 Reassign, Set Priority, Close Selected');
  await sleep(3000);

  // Clear selection
  const clearSel = page.locator('button', { hasText: /Clear selection/i }).first();
  if (await clearSel.isVisible({ timeout: 1000 }).catch(() => false)) {
    await clearSel.click();
    await sleep(500);
  }

  // ── Filters ──
  cap.mark('Filters \u2014 Status, Priority, Type, Assignee, Search');
  const statusSelect = page.locator('select[aria-label="Filter by status"]');
  if (await statusSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
    await statusSelect.selectOption('open');
    await sleep(1500);
  }
  await sleep(1500);

  // Filter presets
  cap.mark('Filter Presets \u2014 Save and recall filter combinations');
  const saveViewBtn = page.locator('button', { hasText: /Save view/i }).first();
  if (await saveViewBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    await saveViewBtn.click();
    await sleep(1500);
    await page.keyboard.press('Escape');
  }
  await sleep(1500);

  // Clear filters
  const clearAll = page.locator('button', { hasText: /Clear all/i }).first();
  if (await clearAll.isVisible({ timeout: 1000 }).catch(() => false)) {
    await clearAll.click();
    await sleep(500);
  }

  // ── Column visibility ──
  cap.mark('Column Visibility \u2014 Toggle columns, persists across sessions');
  const colBtn = page.locator('button[aria-label="Toggle column visibility"]').first();
  if (await colBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await colBtn.click();
    await sleep(2000);
    await colBtn.click();
    await sleep(500);
  }

  // ═══════════════════════════════════════════════
  // SECTION 2: COMMAND PALETTE & KEYBOARD
  // ═══════════════════════════════════════════════

  cap.mark('Command Palette \u2014 Cmd+K to search issues and commands');
  await page.keyboard.press('Meta+k');
  await sleep(2000);

  cap.mark('Issue Search \u2014 Find any issue by title or ID');
  await page.keyboard.type('rock solid', { delay: 100 });
  await sleep(2500);
  await page.keyboard.press('Escape');
  await sleep(800);

  // Keyboard help
  cap.mark('Keyboard Shortcuts \u2014 Press ? for full reference');
  await page.keyboard.press('Shift+?');
  await sleep(3000);
  // Close via backdrop click or close button (Escape may not work with keyboard-help)
  const kbCloseBtn = page.locator('[aria-label="Close"]').first();
  if (await kbCloseBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await kbCloseBtn.click();
  } else {
    // Click backdrop
    await page.locator('.fixed.inset-0.bg-black\\/50').first().click({ position: { x: 10, y: 10 } }).catch(() => {});
  }
  await sleep(800);
  // Ensure overlay is gone
  await page.evaluate(() => {
    const overlay = document.querySelector('.fixed.inset-0.z-50');
    if (overlay) overlay.remove();
  }).catch(() => {});
  await sleep(500);

  // ═══════════════════════════════════════════════
  // SECTION 3: DETAIL VIEW
  // ═══════════════════════════════════════════════

  cap.mark('Detail View \u2014 Click issue to open with breadcrumbs');
  const firstRow = page.locator('tbody tr').first();
  if (await firstRow.isVisible()) {
    await firstRow.click();
    await sleep(2500);
  }

  cap.mark('Breadcrumb Navigation \u2014 Shows origin view path');
  await sleep(2000);

  cap.mark('Inline Field Editing \u2014 Click any field to edit in place');
  await sleep(2000);

  // Scroll to show fields
  const mainContent = page.locator('main');
  await mainContent.evaluate(el => el.scrollBy(0, 200));
  await sleep(1500);

  cap.mark('Status Badges & Priority Indicators \u2014 Semantic color system');
  await sleep(2000);

  // Scroll to markdown section
  await mainContent.evaluate(el => el.scrollBy(0, 250));
  await sleep(1000);

  // Edit markdown
  cap.mark('Markdown Editor \u2014 Write/Preview tabs with formatting toolbar');
  const editBtn = page.locator('button', { hasText: /^Edit$/ }).first();
  if (await editBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await editBtn.click();
    await sleep(2000);
    // Show preview tab if available
    const previewTab = page.locator('button', { hasText: /^Preview$/ }).first();
    if (await previewTab.isVisible({ timeout: 1000 }).catch(() => false)) {
      await previewTab.click();
      await sleep(1500);
    }
    // Cancel
    const cancelBtn = page.locator('button', { hasText: /^Cancel$/ }).first();
    if (await cancelBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await cancelBtn.click();
      await sleep(500);
    }
  }

  // Scroll to dependencies
  await mainContent.evaluate(el => el.scrollBy(0, 300));
  await sleep(1000);

  cap.mark('Dependency Autocomplete \u2014 Search issues by title to link');
  const addDepBtn = page.locator('button', { hasText: /Add/i }).first();
  if (await addDepBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await addDepBtn.click();
    await sleep(500);
    const depInput = page.locator('input[role="combobox"]').first();
    if (await depInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await depInput.fill('epic');
      await sleep(2000);
      await page.keyboard.press('Escape');
      await sleep(500);
    }
  }

  // Scroll to comments/activity
  await mainContent.evaluate(el => el.scrollBy(0, 400));
  await sleep(1000);

  cap.mark('Activity Timeline \u2014 Event history with field change diffs');
  await sleep(2500);

  // Close detail
  cap.mark('Close Detail \u2014 Escape key returns to previous view');
  await page.keyboard.press('Escape');
  await sleep(1500);

  // ═══════════════════════════════════════════════
  // SECTION 4: BOARD VIEW
  // ═══════════════════════════════════════════════

  cap.mark('Board View \u2014 Kanban columns with drag-and-drop');
  await page.goto(`${BASE_URL}/board`);
  await page.waitForLoadState('networkidle');
  await sleep(3000);

  cap.mark('Kanban Cards \u2014 Status color bars, priority heat, assignee avatars');
  await sleep(2500);

  // Pan to see all columns
  await page.mouse.wheel(400, 0);
  await sleep(1500);
  await page.mouse.wheel(-400, 0);
  await sleep(1500);

  cap.mark('Drag-and-Drop \u2014 Move cards between status columns');
  // Demonstrate a drag (if cards exist)
  const card = page.locator('[aria-roledescription="draggable issue card"]').first();
  if (await card.isVisible({ timeout: 2000 }).catch(() => false)) {
    const box = await card.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + 300, box.y, { steps: 20 });
      await sleep(1000);
      await page.mouse.up();
      await sleep(1500);
    }
  }

  // ═══════════════════════════════════════════════
  // SECTION 5: GRAPH VIEW
  // ═══════════════════════════════════════════════

  cap.mark('Graph View \u2014 Dependency visualization with Dagre layout');
  await page.goto(`${BASE_URL}/graph`);
  await page.waitForLoadState('networkidle');
  await sleep(4000);

  cap.mark('Color-coded Edges \u2014 blocks (red), depends_on (blue), relates (purple)');
  await sleep(2500);

  // Zoom in
  cap.mark('Interactive Graph \u2014 Zoom, pan, click to highlight chains');
  for (let i = 0; i < 3; i++) {
    await page.mouse.wheel(0, -100);
    await sleep(400);
  }
  await sleep(1500);

  // Pan
  await page.mouse.move(720, 450);
  await page.mouse.down();
  await page.mouse.move(500, 300, { steps: 20 });
  await page.mouse.up();
  await sleep(1500);

  // Zoom out
  for (let i = 0; i < 4; i++) {
    await page.mouse.wheel(0, 100);
    await sleep(300);
  }
  await sleep(1500);

  // ═══════════════════════════════════════════════
  // SECTION 6: DARK MODE
  // ═══════════════════════════════════════════════

  cap.mark('Dark Mode \u2014 Refined dark theme, not just inverted grays');
  const themeBtn = page.locator('[aria-label*="theme"], [aria-label*="Theme"], [aria-label*="dark"], [aria-label*="mode"]').first();
  if (await themeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await themeBtn.click();
    await sleep(2500);

    // Show dark mode board
    cap.mark('Dark Mode Board \u2014 Card shadows, status bars, accent colors');
    await page.goto(`${BASE_URL}/board`);
    await page.waitForLoadState('networkidle');
    await sleep(3000);

    // Show dark mode list
    cap.mark('Dark Mode List \u2014 Subtle background layers, refined contrast');
    await page.goto(`${BASE_URL}/list`);
    await page.waitForLoadState('networkidle');
    await sleep(3000);

    // Toggle back
    await themeBtn.click();
    await sleep(1500);
  }

  // ═══════════════════════════════════════════════
  // SECTION 7: SPECIAL PAGES & FEATURES
  // ═══════════════════════════════════════════════

  // 404 page
  cap.mark('404 Page \u2014 Designed not-found page with navigation');
  await page.goto(`${BASE_URL}/nonexistent-page`);
  await sleep(2500);

  // Onboarding
  cap.mark('Onboarding \u2014 Progressive 5-step welcome tour');
  await page.evaluate(() => localStorage.removeItem('beads-gui-onboarding-complete'));
  await page.goto(`${BASE_URL}/list`);
  await sleep(3000);
  // Click through a couple steps
  const nextBtn = page.locator('button', { hasText: /Next|Get started/i }).first();
  if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await nextBtn.click();
    await sleep(1500);
    if (await nextBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await nextBtn.click();
      await sleep(1500);
    }
  }
  // Dismiss
  const skipBtn = page.locator('button', { hasText: /Skip/i }).first();
  if (await skipBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await skipBtn.click();
    await sleep(500);
  }
  await page.evaluate(() => localStorage.setItem('beads-gui-onboarding-complete', 'true'));

  // Toast notification
  cap.mark('Toast Notifications \u2014 Action feedback with undo support');
  await sleep(2500);

  // ── Final: back to list ──
  cap.mark('Beads GUI \u2014 Built with React, Fastify, Dolt, and love');
  await page.goto(`${BASE_URL}/list`);
  await sleep(3000);

  // ═══════════════════════════════════════════════
  // DONE — close and process video
  // ═══════════════════════════════════════════════
  console.log('\nRecording complete. Processing video...');
  await page.close();
  await context.close();
  await browser.close();

  // Find the raw video file
  const fs = await import('fs');
  const rawDir = './docs/demo/_raw/';
  const files = fs.readdirSync(rawDir).filter(f => f.endsWith('.webm'));
  const latest = files.sort().pop();
  if (!latest) {
    console.error('No video file found!');
    process.exit(1);
  }
  const rawPath = `${rawDir}${latest}`;
  console.log(`Raw video: ${rawPath}`);

  // Apply ffmpeg captions
  const filter = cap.buildFilter();
  if (filter) {
    console.log(`Applying ${cap.captions.length} caption overlays with ffmpeg...`);
    try {
      execSync(
        `ffmpeg -y -i "${rawPath}" -vf "${filter}" -c:a copy "${FINAL_VIDEO}"`,
        { stdio: 'inherit', timeout: 120000 }
      );
      console.log(`Captioned video: ${FINAL_VIDEO}`);
    } catch (e) {
      console.error('ffmpeg failed, copying raw video instead:', e.message);
      fs.copyFileSync(rawPath, FINAL_VIDEO);
    }
  } else {
    fs.copyFileSync(rawPath, FINAL_VIDEO);
  }

  // Clean up raw directory
  fs.rmSync(rawDir, { recursive: true, force: true });

  console.log(`\nFinal video: ${FINAL_VIDEO}`);
  console.log(`Captions: ${cap.captions.length} segments`);
}

demo().catch(e => {
  console.error('Demo failed:', e.message);
  process.exit(1);
});
