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
  buildFilter() {
    if (this.captions.length === 0) return '';
    const filters = [];
    for (let i = 0; i < this.captions.length; i++) {
      const start = this.captions[i].time;
      const end = i + 1 < this.captions.length ? this.captions[i + 1].time : start + 10;
      const text = this.captions[i].text
        .replace(/'/g, "\u2019")
        .replace(/:/g, "\\:")
        .replace(/\\/g, "\\\\");
      filters.push(
        `drawtext=text='${text}':` +
        `fontsize=26:fontcolor=white:` +
        `borderw=2:bordercolor=black@0.9:` +
        `box=1:boxcolor=black@0.7:boxborderw=14:` +
        `x=(w-text_w)/2:y=h-th-50:` +
        `enable='between(t,${start.toFixed(2)},${end.toFixed(2)})'`
      );
    }
    return filters.join(',');
  }
}

/**
 * Inject visual overlays into the page:
 * - Custom cursor follower (yellow ring with trail)
 * - Click pulse animation
 * - Keystroke display (floating keys at bottom-left)
 * - Region highlight annotation helper
 */
async function injectOverlays(page) {
  await page.evaluate(() => {
    // ── Cursor follower ──
    const cursor = document.createElement('div');
    cursor.id = 'demo-cursor';
    cursor.style.cssText = `
      position: fixed; z-index: 99999; pointer-events: none;
      width: 28px; height: 28px; border-radius: 50%;
      border: 3px solid rgba(59, 130, 246, 0.9);
      background: rgba(59, 130, 246, 0.15);
      transform: translate(-50%, -50%);
      transition: width 0.1s, height 0.1s, border-color 0.1s, background 0.1s;
      left: -100px; top: -100px;
    `;
    document.body.appendChild(cursor);

    // ── Click pulse ring ──
    const clickRing = document.createElement('div');
    clickRing.id = 'demo-click-ring';
    clickRing.style.cssText = `
      position: fixed; z-index: 99998; pointer-events: none;
      width: 28px; height: 28px; border-radius: 50%;
      border: 2px solid rgba(59, 130, 246, 0.8);
      transform: translate(-50%, -50%) scale(1);
      opacity: 0; left: -100px; top: -100px;
    `;
    document.body.appendChild(clickRing);

    // ── Keystroke display ──
    const keyBox = document.createElement('div');
    keyBox.id = 'demo-keys';
    keyBox.style.cssText = `
      position: fixed; z-index: 99999; pointer-events: none;
      bottom: 100px; left: 50%; transform: translateX(-50%);
      display: flex; gap: 6px; align-items: center;
      transition: opacity 0.2s;
      opacity: 0;
    `;
    document.body.appendChild(keyBox);

    // ── Highlight annotation box ──
    const highlight = document.createElement('div');
    highlight.id = 'demo-highlight';
    highlight.style.cssText = `
      position: fixed; z-index: 99997; pointer-events: none;
      border: 3px solid rgba(59, 130, 246, 0.7);
      border-radius: 8px;
      background: rgba(59, 130, 246, 0.06);
      box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15), 0 0 20px rgba(59, 130, 246, 0.1);
      transition: all 0.3s ease-out;
      opacity: 0;
    `;
    document.body.appendChild(highlight);

    // Track mouse
    document.addEventListener('mousemove', (e) => {
      cursor.style.left = e.clientX + 'px';
      cursor.style.top = e.clientY + 'px';
    });

    // Click effect
    document.addEventListener('mousedown', (e) => {
      cursor.style.width = '22px';
      cursor.style.height = '22px';
      cursor.style.borderColor = 'rgba(239, 68, 68, 0.9)';
      cursor.style.background = 'rgba(239, 68, 68, 0.25)';

      clickRing.style.left = e.clientX + 'px';
      clickRing.style.top = e.clientY + 'px';
      clickRing.style.opacity = '1';
      clickRing.style.transform = 'translate(-50%, -50%) scale(1)';
      clickRing.style.transition = 'none';
      requestAnimationFrame(() => {
        clickRing.style.transition = 'transform 0.4s ease-out, opacity 0.4s ease-out';
        clickRing.style.transform = 'translate(-50%, -50%) scale(3)';
        clickRing.style.opacity = '0';
      });
    });

    document.addEventListener('mouseup', () => {
      cursor.style.width = '28px';
      cursor.style.height = '28px';
      cursor.style.borderColor = 'rgba(59, 130, 246, 0.9)';
      cursor.style.background = 'rgba(59, 130, 246, 0.15)';
    });

    // Keystroke display
    let keyTimeout = null;
    document.addEventListener('keydown', (e) => {
      const parts = [];
      if (e.metaKey) parts.push('Cmd');
      if (e.ctrlKey) parts.push('Ctrl');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey && e.key !== 'Shift') parts.push('Shift');

      let keyName = e.key;
      const keyMap = {
        'Escape': 'Esc', 'Enter': 'Enter', 'ArrowUp': '\u2191',
        'ArrowDown': '\u2193', 'ArrowLeft': '\u2190', 'ArrowRight': '\u2192',
        'Backspace': '\u232B', 'Tab': 'Tab', ' ': 'Space',
        'Meta': 'Cmd', 'Control': 'Ctrl', 'Shift': 'Shift'
      };
      if (keyMap[keyName]) keyName = keyMap[keyName];
      if (keyName.length === 1) keyName = keyName.toUpperCase();
      if (!['Cmd', 'Ctrl', 'Alt', 'Shift'].includes(keyName)) {
        parts.push(keyName);
      }
      if (parts.length === 0) return;

      keyBox.innerHTML = parts.map(k =>
        '<span style="display:inline-flex;align-items:center;justify-content:center;' +
        'min-width:36px;height:36px;padding:0 10px;border-radius:8px;' +
        'background:rgba(0,0,0,0.8);color:white;font-size:16px;font-weight:600;' +
        'font-family:system-ui;border:1px solid rgba(255,255,255,0.2);' +
        'box-shadow:0 2px 8px rgba(0,0,0,0.3);">' + k + '</span>'
      ).join('<span style="color:rgba(255,255,255,0.5);font-size:14px;font-weight:bold;">+</span>');

      keyBox.style.opacity = '1';
      clearTimeout(keyTimeout);
      keyTimeout = setTimeout(() => {
        keyBox.style.opacity = '0';
      }, 1200);
    });

    // Global helpers for highlight annotations
    window.__demoHighlight = (selector, padding = 8) => {
      const el = document.querySelector(selector);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      highlight.style.left = (rect.left - padding) + 'px';
      highlight.style.top = (rect.top - padding) + 'px';
      highlight.style.width = (rect.width + padding * 2) + 'px';
      highlight.style.height = (rect.height + padding * 2) + 'px';
      highlight.style.opacity = '1';
    };
    window.__demoHighlightRect = (x, y, w, h) => {
      highlight.style.left = x + 'px';
      highlight.style.top = y + 'px';
      highlight.style.width = w + 'px';
      highlight.style.height = h + 'px';
      highlight.style.opacity = '1';
    };
    window.__demoHighlightOff = () => {
      highlight.style.opacity = '0';
    };
  });
}

/** Highlight a region of the screen around a selector */
async function highlight(page, selector, padding = 10) {
  await page.evaluate(([sel, pad]) => window.__demoHighlight?.(sel, pad), [selector, padding]);
}

/** Clear highlight */
async function highlightOff(page) {
  await page.evaluate(() => window.__demoHighlightOff?.());
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

  // Setup: dismiss onboarding, clear saved state
  await page.goto(`${BASE_URL}/list`);
  await page.evaluate(() => {
    localStorage.setItem('beads-gui-onboarding-complete', 'true');
    localStorage.removeItem('beads:col-visibility');
    localStorage.removeItem('beads:col-order');
    localStorage.removeItem('beads:col-sizing');
  });
  await page.reload();
  await page.waitForSelector('table', { timeout: 10000 });
  await sleep(1000);

  // Inject visual overlays (cursor, click effects, keystroke display, highlight box)
  await injectOverlays(page);
  // Move cursor to center initially
  await page.mouse.move(720, 450);
  await sleep(1500);

  // ═══════════════════════════════════════════════
  // SECTION 1: LIST VIEW & NAVIGATION
  // ═══════════════════════════════════════════════

  cap.mark('List View \u2014 Full issue table with custom typography');
  await highlight(page, 'main');
  await sleep(5000);
  await highlightOff(page);

  // Sidebar icons
  cap.mark('Sidebar \u2014 Navigation icons with keyboard shortcuts');
  await highlight(page, 'aside, nav');
  await page.mouse.move(100, 200, { steps: 15 });
  await sleep(4000);
  await highlightOff(page);

  // Typography
  cap.mark('Custom Typography \u2014 Distinctive font pairing');
  await highlight(page, 'tbody tr:first-child');
  await page.mouse.move(500, 200, { steps: 15 });
  await sleep(4000);
  await page.mouse.wheel(0, 250);
  await sleep(2000);
  await page.mouse.wheel(0, -250);
  await sleep(2000);
  await highlightOff(page);

  // ── Quick-add ──
  cap.mark('Quick Add \u2014 Create issues with just a title');
  const quickAdd = page.locator('input[aria-label="Quick add issue"], input[placeholder*="Quick add"]').first();
  if (await quickAdd.isVisible({ timeout: 2000 }).catch(() => false)) {
    await highlight(page, 'input[aria-label="Quick add issue"], input[placeholder*="Quick add"]');
    const box = await quickAdd.boundingBox();
    if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 15 });
    await sleep(1500);
    await quickAdd.click();
    await sleep(500);
    await page.keyboard.type('Demo: quick-add issue creation', { delay: 60 });
    await sleep(3000);
    // Clear without submitting
    await page.keyboard.press('Escape');
    await sleep(1000);
    await highlightOff(page);
  }

  // ── Keyboard navigation ──
  cap.mark('Keyboard Navigation \u2014 j/k to move, Enter to open');
  await highlight(page, 'tbody');
  await sleep(1000);
  await page.keyboard.press('j');
  await sleep(800);
  await page.keyboard.press('j');
  await sleep(800);
  await page.keyboard.press('j');
  await sleep(800);
  await page.keyboard.press('k');
  await sleep(2500);
  await highlightOff(page);

  // ── Row selection & bulk actions ──
  cap.mark('Row Selection \u2014 Press x to toggle selection');
  await sleep(1000);
  await page.keyboard.press('x');
  await sleep(1000);
  await page.keyboard.press('j');
  await sleep(500);
  await page.keyboard.press('x');
  await sleep(1000);
  await page.keyboard.press('j');
  await sleep(500);
  await page.keyboard.press('x');
  await sleep(2000);

  cap.mark('Bulk Actions \u2014 Reassign, Set Priority, Close Selected');
  // Highlight the bulk action bar area
  await page.evaluate(() => {
    // Find the bulk action bar by looking for the selection count text
    const els = document.querySelectorAll('div');
    for (const el of els) {
      if (el.textContent?.includes('selected') && el.querySelector('button')) {
        const r = el.getBoundingClientRect();
        window.__demoHighlightRect?.(r.left - 6, r.top - 6, r.width + 12, r.height + 12);
        break;
      }
    }
  });
  await sleep(5000);
  await highlightOff(page);

  // Clear selection
  const clearSel = page.locator('button', { hasText: /Clear selection/i }).first();
  if (await clearSel.isVisible({ timeout: 1000 }).catch(() => false)) {
    const box = await clearSel.boundingBox();
    if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 });
    await sleep(500);
    await clearSel.click();
    await sleep(1000);
  }

  // ── Filters ──
  cap.mark('Filters \u2014 Status, Priority, Type, Assignee, Search');
  await highlight(page, 'select[aria-label="Filter by status"]', 100);
  const statusSelect = page.locator('select[aria-label="Filter by status"]');
  if (await statusSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
    const box = await statusSelect.boundingBox();
    if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 });
    await sleep(1500);
    await statusSelect.selectOption('open');
    await sleep(3000);
  }
  await highlightOff(page);

  // Filter presets
  cap.mark('Filter Presets \u2014 Save and recall filter combinations');
  const saveViewBtn = page.locator('button', { hasText: /Save view/i }).first();
  if (await saveViewBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    // Highlight via bounding box instead of selector
    const svBox = await saveViewBtn.boundingBox();
    if (svBox) {
      await page.evaluate(([x, y, w, h]) => window.__demoHighlightRect?.(x-6, y-6, w+12, h+12), [svBox.x, svBox.y, svBox.width, svBox.height]);
      await page.mouse.move(svBox.x + svBox.width / 2, svBox.y + svBox.height / 2, { steps: 10 });
    }
    await sleep(1500);
    await saveViewBtn.click();
    await sleep(3000);
    await page.keyboard.press('Escape');
    await highlightOff(page);
  }
  await sleep(1500);

  // Clear filters
  const clearAll = page.locator('button', { hasText: /Clear all/i }).first();
  if (await clearAll.isVisible({ timeout: 1000 }).catch(() => false)) {
    await clearAll.click();
    await sleep(1000);
  }

  // ── Column visibility ──
  cap.mark('Column Visibility \u2014 Toggle columns, persists in localStorage');
  const colBtn = page.locator('button[aria-label="Toggle column visibility"]').first();
  if (await colBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await highlight(page, 'button[aria-label="Toggle column visibility"]', 6);
    const box = await colBtn.boundingBox();
    if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 });
    await sleep(1000);
    await colBtn.click();
    await sleep(4000);
    await colBtn.click();
    await sleep(1000);
    await highlightOff(page);
  }

  // ═══════════════════════════════════════════════
  // SECTION 2: COMMAND PALETTE & KEYBOARD
  // ═══════════════════════════════════════════════

  cap.mark('Command Palette \u2014 Cmd+K to search issues and commands');
  await sleep(1000);
  await page.keyboard.press('Meta+k');
  await sleep(3000);

  cap.mark('Issue Search \u2014 Find any issue by title or ID');
  await page.keyboard.type('dependency', { delay: 80 });
  await sleep(4000);
  await page.keyboard.press('Escape');
  await sleep(1500);

  // Keyboard help
  cap.mark('Keyboard Shortcuts \u2014 Press ? for full shortcut reference');
  await sleep(1000);
  await page.keyboard.press('Shift+?');
  await sleep(5000);
  // Close via close button or force remove
  const kbCloseBtn = page.locator('[aria-label="Close"]').first();
  if (await kbCloseBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    const box = await kbCloseBtn.boundingBox();
    if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 });
    await sleep(500);
    await kbCloseBtn.click();
  } else {
    await page.evaluate(() => {
      document.querySelector('.fixed.inset-0.z-50')?.remove();
    }).catch(() => {});
  }
  await sleep(1500);

  // ═══════════════════════════════════════════════
  // SECTION 3: DETAIL VIEW
  // ═══════════════════════════════════════════════

  cap.mark('Detail View \u2014 Click any issue to open full detail');
  const firstRow = page.locator('tbody tr').first();
  if (await firstRow.isVisible()) {
    const box = await firstRow.boundingBox();
    if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 15 });
    await sleep(1000);
    await firstRow.click();
    await sleep(4000);
  }

  cap.mark('Breadcrumb Navigation \u2014 Shows origin view for easy return');
  await highlight(page, 'nav[aria-label="Breadcrumb"]', 8);
  await sleep(4000);
  await highlightOff(page);

  cap.mark('Inline Field Editing \u2014 Click any field to edit in place');
  await highlight(page, '.grid-cols-2', 8);
  await sleep(4000);
  await highlightOff(page);

  cap.mark('Status Badges & Priority Indicators \u2014 Brand accent color system');
  await sleep(3000);

  // Scroll to markdown section
  const mainContent = page.locator('main');
  await mainContent.evaluate(el => el.scrollBy(0, 300));
  await sleep(1500);

  // Edit markdown
  cap.mark('Markdown Editor \u2014 Write/Preview tabs + formatting toolbar');
  const editBtn = page.locator('button', { hasText: /^Edit$/ }).first();
  if (await editBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    const ebBox = await editBtn.boundingBox();
    if (ebBox) await page.evaluate(([x, y, w, h]) => window.__demoHighlightRect?.(x-6, y-6, w+12, h+12), [ebBox.x, ebBox.y, ebBox.width, ebBox.height]);
    const box = ebBox || await editBtn.boundingBox();
    if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 });
    await sleep(1000);
    await editBtn.click();
    await sleep(3000);
    // Show preview tab if available
    const previewTab = page.locator('button', { hasText: /^Preview$/ }).first();
    if (await previewTab.isVisible({ timeout: 1000 }).catch(() => false)) {
      const pbox = await previewTab.boundingBox();
      if (pbox) await page.mouse.move(pbox.x + pbox.width / 2, pbox.y + pbox.height / 2, { steps: 10 });
      await sleep(500);
      await previewTab.click();
      await sleep(2500);
    }
    await highlightOff(page);
    const cancelBtn = page.locator('button', { hasText: /^Cancel$/ }).first();
    if (await cancelBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await cancelBtn.click();
      await sleep(800);
    }
  }

  // Scroll to dependencies
  await mainContent.evaluate(el => el.scrollBy(0, 350));
  await sleep(1000);

  cap.mark('Dependency Autocomplete \u2014 Search issues by title to link');
  const addDepBtn = page.locator('button', { hasText: /Add/i }).first();
  if (await addDepBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    const adBox = await addDepBtn.boundingBox();
    if (adBox) await page.evaluate(([x, y, w, h]) => window.__demoHighlightRect?.(x-6, y-6, w+12, h+12), [adBox.x, adBox.y, adBox.width, adBox.height]);
    const box = adBox || await addDepBtn.boundingBox();
    if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 });
    await sleep(1000);
    await addDepBtn.click();
    await sleep(800);
    const depInput = page.locator('input[role="combobox"]').first();
    if (await depInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await page.keyboard.type('epic', { delay: 80 });
      await sleep(3500);
      await page.keyboard.press('Escape');
      await sleep(800);
    }
    await highlightOff(page);
  }

  // Scroll to activity
  await mainContent.evaluate(el => el.scrollBy(0, 400));
  await sleep(1000);

  cap.mark('Activity Timeline \u2014 Event history with field change diffs');
  await sleep(4000);

  // Close detail
  cap.mark('Close Detail \u2014 Press Escape to return to list');
  await sleep(1000);
  await page.keyboard.press('Escape');
  await sleep(2500);

  // ═══════════════════════════════════════════════
  // SECTION 4: BOARD VIEW
  // ═══════════════════════════════════════════════

  cap.mark('Board View \u2014 Kanban columns with drag-and-drop');
  await page.goto(`${BASE_URL}/board`);
  await page.waitForLoadState('networkidle');
  await injectOverlays(page);
  await page.mouse.move(720, 450);
  await sleep(5000);

  cap.mark('Kanban Cards \u2014 Status color bars, priority heat, avatars');
  // Hover over a card to show the hover effect
  const card = page.locator('[aria-roledescription="draggable issue card"]').first();
  if (await card.isVisible({ timeout: 2000 }).catch(() => false)) {
    await highlight(page, '[aria-roledescription="draggable issue card"]', 6);
    const box = await card.boundingBox();
    if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 15 });
    await sleep(4000);
    await highlightOff(page);
  }

  // Pan to see all columns
  await page.mouse.move(800, 500);
  await page.mouse.wheel(400, 0);
  await sleep(2500);
  await page.mouse.wheel(-400, 0);
  await sleep(2500);

  cap.mark('Drag-and-Drop \u2014 Move cards between status columns');
  if (await card.isVisible({ timeout: 2000 }).catch(() => false)) {
    const box = await card.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 });
      await sleep(500);
      await page.mouse.down();
      await sleep(300);
      await page.mouse.move(box.x + 300, box.y, { steps: 30 });
      await sleep(1500);
      await page.mouse.up();
      await sleep(2500);
    }
  }

  // ═══════════════════════════════════════════════
  // SECTION 5: GRAPH VIEW
  // ═══════════════════════════════════════════════

  cap.mark('Graph View \u2014 Dependency visualization with Dagre layout');
  await page.goto(`${BASE_URL}/graph`);
  await page.waitForLoadState('networkidle');
  await injectOverlays(page);
  await page.mouse.move(720, 450);
  await sleep(6000);

  cap.mark('Color-coded Edges \u2014 blocks (red), depends_on (blue), relates (purple)');
  await sleep(4000);

  cap.mark('Interactive Graph \u2014 Zoom, pan, click to highlight chains');
  for (let i = 0; i < 3; i++) {
    await page.mouse.wheel(0, -100);
    await sleep(600);
  }
  await sleep(2000);

  // Pan
  await page.mouse.move(720, 450);
  await page.mouse.down();
  await page.mouse.move(500, 300, { steps: 25 });
  await page.mouse.up();
  await sleep(2000);

  // Zoom out
  for (let i = 0; i < 4; i++) {
    await page.mouse.wheel(0, 100);
    await sleep(400);
  }
  await sleep(2500);

  // ═══════════════════════════════════════════════
  // SECTION 6: DARK MODE
  // ═══════════════════════════════════════════════

  cap.mark('Dark Mode \u2014 Refined dark theme with proper depth layers');
  const themeBtn = page.locator('[aria-label*="theme"], [aria-label*="Theme"], [aria-label*="dark"], [aria-label*="mode"]').first();
  if (await themeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await highlight(page, '[aria-label*="theme"], [aria-label*="Theme"]', 6);
    const box = await themeBtn.boundingBox();
    if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 });
    await sleep(1500);
    await themeBtn.click();
    await sleep(3000);
    await highlightOff(page);

    cap.mark('Dark Mode Board \u2014 Card shadows and accent colors');
    await page.goto(`${BASE_URL}/board`);
    await page.waitForLoadState('networkidle');
    await injectOverlays(page);
    await page.mouse.move(720, 450);
    await sleep(5000);

    cap.mark('Dark Mode List \u2014 Subtle background layers, refined contrast');
    await page.goto(`${BASE_URL}/list`);
    await page.waitForLoadState('networkidle');
    await injectOverlays(page);
    await page.mouse.move(720, 450);
    await sleep(5000);

    // Toggle back
    const themeBtn2 = page.locator('[aria-label*="theme"], [aria-label*="Theme"], [aria-label*="dark"], [aria-label*="mode"]').first();
    await themeBtn2.click();
    await sleep(2000);
  }

  // ═══════════════════════════════════════════════
  // SECTION 7: SPECIAL PAGES & FEATURES
  // ═══════════════════════════════════════════════

  // 404 page
  cap.mark('404 Page \u2014 Designed not-found page with navigation links');
  await page.goto(`${BASE_URL}/nonexistent-page`);
  await injectOverlays(page);
  await page.mouse.move(720, 450);
  await sleep(5000);

  // Onboarding
  cap.mark('Onboarding Tour \u2014 Progressive 5-step welcome for new users');
  await page.evaluate(() => localStorage.removeItem('beads-gui-onboarding-complete'));
  await page.goto(`${BASE_URL}/list`);
  await injectOverlays(page);
  await page.mouse.move(720, 300);
  await sleep(4000);
  // Click through steps
  const nextBtn = page.locator('button', { hasText: /Next|Get started/i }).first();
  if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    const box = await nextBtn.boundingBox();
    if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 });
    await sleep(1000);
    await nextBtn.click();
    await sleep(2500);
    if (await nextBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await nextBtn.click();
      await sleep(2500);
    }
  }
  // Dismiss
  const skipBtn = page.locator('button', { hasText: /Skip/i }).first();
  if (await skipBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await skipBtn.click();
    await sleep(1000);
  }
  await page.evaluate(() => localStorage.setItem('beads-gui-onboarding-complete', 'true'));

  // Toast
  cap.mark('Toast Notifications \u2014 Action feedback with undo support');
  await sleep(4000);

  // ── Final ──
  cap.mark('Beads GUI \u2014 Built with React, Fastify, Dolt, and love');
  await page.goto(`${BASE_URL}/list`);
  await injectOverlays(page);
  await page.mouse.move(720, 450);
  await sleep(5000);

  // ═══════════════════════════════════════════════
  // DONE
  // ═══════════════════════════════════════════════
  console.log('\nRecording complete. Processing video...');
  await page.close();
  await context.close();
  await browser.close();

  // Find raw video
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
        { stdio: 'inherit', timeout: 180000 }
      );
      console.log(`Captioned video: ${FINAL_VIDEO}`);
    } catch (e) {
      console.error('ffmpeg caption overlay failed, copying raw video:', e.message);
      fs.copyFileSync(rawPath, FINAL_VIDEO);
    }
  } else {
    fs.copyFileSync(rawPath, FINAL_VIDEO);
  }

  // Clean up
  fs.rmSync(rawDir, { recursive: true, force: true });
  console.log(`\nFinal video: ${FINAL_VIDEO}`);
  console.log(`Duration: ~${Math.ceil(cap.captions[cap.captions.length - 1]?.time || 0)}s`);
  console.log(`Captions: ${cap.captions.length} segments`);
}

demo().catch(e => {
  console.error('Demo failed:', e.message);
  process.exit(1);
});
