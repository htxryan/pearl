import { chromium } from '@playwright/test';
import { execSync } from 'child_process';

const BASE_URL = 'http://localhost:5173';
const FINAL_VIDEO = './docs/demo/beads-gui-demo.webm';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ─── Caption tracker ──────────────────────────────────
class CaptionTracker {
  constructor() { this.captions = []; this.startTime = Date.now(); }
  mark(text) {
    const t = (Date.now() - this.startTime) / 1000;
    this.captions.push({ time: t, text });
    console.log(`  [${t.toFixed(1)}s] ${text}`);
  }
  buildFilter() {
    return this.captions.map((c, i) => {
      const start = c.time;
      const end = i + 1 < this.captions.length ? this.captions[i + 1].time : start + 10;
      const text = c.text.replace(/'/g, "\u2019").replace(/:/g, "\\:").replace(/\\/g, "\\\\");
      return `drawtext=text='${text}':fontsize=26:fontcolor=white:borderw=2:bordercolor=black@0.9:` +
        `box=1:boxcolor=black@0.7:boxborderw=14:x=(w-text_w)/2:y=h-th-50:` +
        `enable='between(t,${start.toFixed(2)},${end.toFixed(2)})'`;
    }).join(',');
  }
}

// ─── Overlay injection ────────────────────────────────
async function injectOverlays(page) {
  await page.evaluate(() => {
    if (document.getElementById('demo-cursor')) return; // already injected

    // Cursor ring
    const cursor = document.createElement('div');
    cursor.id = 'demo-cursor';
    Object.assign(cursor.style, {
      position: 'fixed', zIndex: '99999', pointerEvents: 'none',
      width: '28px', height: '28px', borderRadius: '50%',
      border: '3px solid rgba(59,130,246,0.9)', background: 'rgba(59,130,246,0.15)',
      transform: 'translate(-50%,-50%)', transition: 'width 0.1s,height 0.1s,border-color 0.1s,background 0.1s',
      left: '-100px', top: '-100px'
    });
    document.body.appendChild(cursor);

    // Click pulse
    const ring = document.createElement('div');
    ring.id = 'demo-click-ring';
    Object.assign(ring.style, {
      position: 'fixed', zIndex: '99998', pointerEvents: 'none',
      width: '28px', height: '28px', borderRadius: '50%',
      border: '2px solid rgba(59,130,246,0.8)',
      transform: 'translate(-50%,-50%) scale(1)', opacity: '0',
      left: '-100px', top: '-100px'
    });
    document.body.appendChild(ring);

    // Keystroke display
    const keyBox = document.createElement('div');
    keyBox.id = 'demo-keys';
    Object.assign(keyBox.style, {
      position: 'fixed', zIndex: '99999', pointerEvents: 'none',
      bottom: '100px', left: '50%', transform: 'translateX(-50%)',
      display: 'flex', gap: '6px', alignItems: 'center',
      transition: 'opacity 0.2s', opacity: '0'
    });
    document.body.appendChild(keyBox);

    // Highlight box
    const hl = document.createElement('div');
    hl.id = 'demo-highlight';
    Object.assign(hl.style, {
      position: 'fixed', zIndex: '99997', pointerEvents: 'none',
      border: '3px solid rgba(59,130,246,0.7)', borderRadius: '8px',
      background: 'rgba(59,130,246,0.06)',
      boxShadow: '0 0 0 4px rgba(59,130,246,0.15), 0 0 20px rgba(59,130,246,0.1)',
      transition: 'all 0.3s ease-out', opacity: '0'
    });
    document.body.appendChild(hl);

    // Mouse tracking
    document.addEventListener('mousemove', e => {
      cursor.style.left = e.clientX + 'px'; cursor.style.top = e.clientY + 'px';
    });
    document.addEventListener('mousedown', e => {
      cursor.style.width = '22px'; cursor.style.height = '22px';
      cursor.style.borderColor = 'rgba(239,68,68,0.9)';
      cursor.style.background = 'rgba(239,68,68,0.25)';
      ring.style.left = e.clientX + 'px'; ring.style.top = e.clientY + 'px';
      ring.style.opacity = '1'; ring.style.transform = 'translate(-50%,-50%) scale(1)';
      ring.style.transition = 'none';
      requestAnimationFrame(() => {
        ring.style.transition = 'transform 0.4s ease-out, opacity 0.4s ease-out';
        ring.style.transform = 'translate(-50%,-50%) scale(3)'; ring.style.opacity = '0';
      });
    });
    document.addEventListener('mouseup', () => {
      cursor.style.width = '28px'; cursor.style.height = '28px';
      cursor.style.borderColor = 'rgba(59,130,246,0.9)';
      cursor.style.background = 'rgba(59,130,246,0.15)';
    });

    // Keystroke display
    let keyTimeout = null;
    document.addEventListener('keydown', e => {
      const parts = [];
      if (e.metaKey) parts.push('Cmd');
      if (e.ctrlKey) parts.push('Ctrl');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey && e.key !== 'Shift') parts.push('Shift');
      const map = { Escape:'Esc', Enter:'Enter', ArrowUp:'\u2191', ArrowDown:'\u2193',
        Backspace:'\u232B', Tab:'Tab', ' ':'Space', Meta:'Cmd', Control:'Ctrl', Shift:'Shift' };
      let k = map[e.key] || e.key;
      if (k.length === 1) k = k.toUpperCase();
      if (!['Cmd','Ctrl','Alt','Shift'].includes(k)) parts.push(k);
      if (!parts.length) return;
      keyBox.innerHTML = parts.map(p =>
        '<span style="display:inline-flex;align-items:center;justify-content:center;min-width:36px;height:36px;' +
        'padding:0 10px;border-radius:8px;background:rgba(0,0,0,0.8);color:white;font-size:16px;font-weight:600;' +
        'font-family:system-ui;border:1px solid rgba(255,255,255,0.2);box-shadow:0 2px 8px rgba(0,0,0,0.3);">' +
        p + '</span>'
      ).join('<span style="color:rgba(255,255,255,0.5);font-size:14px;font-weight:bold;">+</span>');
      keyBox.style.opacity = '1';
      clearTimeout(keyTimeout);
      keyTimeout = setTimeout(() => keyBox.style.opacity = '0', 1200);
    });

    // Highlight helpers
    window.__hl = (sel, pad=10) => {
      const el = document.querySelector(sel);
      if (!el) return;
      const r = el.getBoundingClientRect();
      Object.assign(hl.style, { left:(r.left-pad)+'px', top:(r.top-pad)+'px',
        width:(r.width+pad*2)+'px', height:(r.height+pad*2)+'px', opacity:'1' });
    };
    window.__hlRect = (x,y,w,h) => Object.assign(hl.style, {
      left:x+'px', top:y+'px', width:w+'px', height:h+'px', opacity:'1'
    });
    window.__hlOff = () => hl.style.opacity = '0';
  });
}

/** Highlight via locator bounding box (safe — no CSS selector issues) */
async function hlLocator(page, locator, pad = 10) {
  const box = await locator.boundingBox().catch(() => null);
  if (box) await page.evaluate(([x,y,w,h]) => window.__hlRect?.(x,y,w,h),
    [box.x - pad, box.y - pad, box.width + pad*2, box.height + pad*2]);
}
async function hlOff(page) { await page.evaluate(() => window.__hlOff?.()); }
async function hl(page, sel, pad=10) { await page.evaluate(([s,p]) => window.__hl?.(s,p), [sel,pad]); }

/** Move cursor smoothly to a locator */
async function moveTo(page, locator) {
  const box = await locator.boundingBox().catch(() => null);
  if (box) await page.mouse.move(box.x + box.width/2, box.y + box.height/2, { steps: 15 });
}

/** Scroll a section heading into view */
async function scrollToHeading(page, headingText) {
  await page.evaluate((text) => {
    const headings = document.querySelectorAll('h2');
    for (const h of headings) {
      if (h.textContent?.includes(text)) {
        h.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return true;
      }
    }
    return false;
  }, headingText);
  await sleep(800);
}

// ─── Main recording ──────────────────────────────────
async function demo() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: './docs/demo/_raw/', size: { width: 1440, height: 900 } },
  });
  const page = await context.newPage();
  const cap = new CaptionTracker();

  // Setup
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
  await injectOverlays(page);
  await page.mouse.move(720, 450);
  await sleep(1500);

  // ════════════════════════════════════════════════
  // LIST VIEW
  // ════════════════════════════════════════════════
  cap.mark('List View \u2014 Issue table with custom typography & accent color');
  await hl(page, 'main');
  await sleep(5000);
  await hlOff(page);

  cap.mark('Sidebar \u2014 Navigation icons with keyboard shortcut hints');
  await hl(page, 'aside, nav', 4);
  await moveTo(page, page.locator('a[href="/list"]').first());
  await sleep(4000);
  await hlOff(page);

  // Quick add
  cap.mark('Quick Add \u2014 Type a title and press Enter to create');
  const quickAdd = page.locator('input[placeholder*="Quick add"], input[aria-label*="Quick add"]').first();
  if (await quickAdd.isVisible({ timeout: 2000 }).catch(() => false)) {
    await hlLocator(page, quickAdd, 8);
    await moveTo(page, quickAdd);
    await sleep(1000);
    await quickAdd.click();
    await sleep(400);
    await page.keyboard.type('Demo: instant issue creation', { delay: 50 });
    await sleep(3000);
    await page.keyboard.press('Escape');
    await sleep(800);
    await hlOff(page);
  }

  // Keyboard nav
  cap.mark('Keyboard Navigation \u2014 j/k to move rows, x to select');
  await sleep(1000);
  for (const key of ['j','j','j','k']) {
    await page.keyboard.press(key);
    await sleep(700);
  }
  await sleep(2000);

  // Row selection + bulk actions
  cap.mark('Bulk Selection \u2014 Press x to toggle, bulk bar appears');
  for (const key of ['x','j','x','j','x']) {
    await page.keyboard.press(key);
    await sleep(600);
  }
  await sleep(2000);

  cap.mark('Bulk Actions \u2014 Reassign, Set Priority, Close with confirmation');
  await sleep(5000);

  // Clear
  const clearSel = page.locator('button', { hasText: /Clear selection/i }).first();
  if (await clearSel.isVisible({ timeout: 1000 }).catch(() => false)) {
    await moveTo(page, clearSel); await sleep(500); await clearSel.click(); await sleep(800);
  }

  // Filters
  cap.mark('Filters \u2014 Status, Priority, Type, Assignee, Labels, Search');
  const statusSel = page.locator('select[aria-label="Filter by status"]');
  if (await statusSel.isVisible({ timeout: 2000 }).catch(() => false)) {
    await hlLocator(page, statusSel, 80);
    await moveTo(page, statusSel); await sleep(1000);
    await statusSel.selectOption('open');
    await sleep(3000);
    await hlOff(page);
  }

  // Filter presets
  cap.mark('Filter Presets \u2014 Save and instantly recall filter combos');
  const saveBtn = page.locator('button', { hasText: /Save view/i }).first();
  if (await saveBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    await hlLocator(page, saveBtn, 6);
    await moveTo(page, saveBtn); await sleep(1000);
    await saveBtn.click(); await sleep(3000);
    await page.keyboard.press('Escape'); await sleep(800);
    await hlOff(page);
  }

  // Clear filters
  const clearAll = page.locator('button', { hasText: /Clear all/i }).first();
  if (await clearAll.isVisible({ timeout: 1000 }).catch(() => false)) {
    await clearAll.click(); await sleep(800);
  }

  // Column visibility
  cap.mark('Column Visibility \u2014 Toggle columns, persists in localStorage');
  const colBtn = page.locator('button[aria-label="Toggle column visibility"]').first();
  if (await colBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await hlLocator(page, colBtn, 6);
    await moveTo(page, colBtn); await sleep(1000);
    await colBtn.click(); await sleep(3500);
    await colBtn.click(); await sleep(1000);
    await hlOff(page);
  }

  // ════════════════════════════════════════════════
  // COMMAND PALETTE & KEYBOARD
  // ════════════════════════════════════════════════
  cap.mark('Command Palette \u2014 Press Cmd+K for commands & issue search');
  await sleep(800);
  await page.keyboard.press('Meta+k');
  await sleep(3500);

  cap.mark('Issue Search \u2014 Type to find any issue by title or ID');
  await page.keyboard.type('dependency', { delay: 80 });
  await sleep(4000);
  await page.keyboard.press('Escape');
  await sleep(1500);

  cap.mark('Keyboard Shortcuts \u2014 Press ? for full shortcut reference');
  await sleep(800);
  await page.keyboard.press('Shift+?');
  await sleep(5000);
  // Close via close button (Escape doesn't work for this overlay)
  const closeBtn = page.locator('[aria-label="Close"]').first();
  if (await closeBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    await moveTo(page, closeBtn); await sleep(500);
    await closeBtn.click();
  }
  await sleep(1500);

  // ════════════════════════════════════════════════
  // DETAIL VIEW
  // ════════════════════════════════════════════════
  cap.mark('Detail View \u2014 Click issue title to open full detail');
  // Click title cell (3rd td), not the row checkbox
  const titleCell = page.locator('tbody tr td').nth(2).first();
  await moveTo(page, titleCell); await sleep(1000);
  await titleCell.click();
  await sleep(3000);

  // Verify we're in detail view
  const inDetail = page.url().includes('/issues/');
  console.log(`  Verified detail view: ${inDetail}`);

  if (inDetail) {
    cap.mark('Breadcrumb Navigation \u2014 Shows origin view for quick return');
    await hl(page, 'nav[aria-label="Breadcrumb"]', 8);
    await sleep(4000);
    await hlOff(page);

    cap.mark('Inline Field Editing \u2014 Click any field to edit in place');
    await hl(page, '.grid-cols-2', 8);
    await sleep(4000);
    await hlOff(page);

    cap.mark('Status Badges & Priority \u2014 Brand accent color system');
    await sleep(3000);

    // Scroll to Description and edit
    cap.mark('Markdown Editor \u2014 Write/Preview tabs + formatting toolbar');
    await scrollToHeading(page, 'Description');
    await sleep(1000);
    const editBtn = page.locator('button', { hasText: /^Edit$/ }).first();
    if (await editBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await hlLocator(page, editBtn, 6);
      await moveTo(page, editBtn); await sleep(800);
      await editBtn.click(); await sleep(2500);
      await hlOff(page);
      // Preview tab
      const previewTab = page.locator('button', { hasText: /^Preview$/ }).first();
      if (await previewTab.isVisible({ timeout: 1000 }).catch(() => false)) {
        await moveTo(page, previewTab); await sleep(500);
        await previewTab.click(); await sleep(3000);
      }
      // Cancel
      const cancelBtn = page.locator('button', { hasText: /^Cancel$/ }).first();
      if (await cancelBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await cancelBtn.click(); await sleep(800);
      }
    }

    // Dependencies
    cap.mark('Dependency Autocomplete \u2014 Search issues by title to link');
    await scrollToHeading(page, 'Dependencies');
    await sleep(1000);
    const addBtn = page.locator('button', { hasText: '+ Add' }).first();
    if (await addBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await hlLocator(page, addBtn, 6);
      await moveTo(page, addBtn); await sleep(800);
      await addBtn.click(); await sleep(800);
      const depInput = page.locator('input[role="combobox"]').first();
      if (await depInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await page.keyboard.type('epic', { delay: 80 });
        await sleep(3500);
        await page.keyboard.press('Escape'); await sleep(500);
      }
      await hlOff(page);
    }

    // Activity
    cap.mark('Activity Timeline \u2014 Event history with field change diffs');
    await scrollToHeading(page, 'Activity');
    await sleep(4000);

    // Close detail
    cap.mark('Close Detail \u2014 Press Escape to return to list');
    await sleep(800);
    await page.keyboard.press('Escape');
    await sleep(2500);
  }

  // ════════════════════════════════════════════════
  // BOARD VIEW
  // ════════════════════════════════════════════════
  cap.mark('Board View \u2014 Kanban columns with drag-and-drop');
  await page.goto(`${BASE_URL}/board`);
  await page.waitForLoadState('networkidle');
  await injectOverlays(page);
  await page.mouse.move(720, 450);
  await sleep(5000);

  cap.mark('Kanban Cards \u2014 Status color bars, priority heat, avatars');
  const card = page.locator('[aria-roledescription="draggable issue card"]').first();
  if (await card.isVisible({ timeout: 2000 }).catch(() => false)) {
    await hlLocator(page, card, 6);
    await moveTo(page, card); await sleep(4000);
    await hlOff(page);
  }

  // Pan columns
  await page.mouse.wheel(400, 0); await sleep(2000);
  await page.mouse.wheel(-400, 0); await sleep(2000);

  cap.mark('Drag-and-Drop \u2014 Move cards between status columns');
  if (await card.isVisible({ timeout: 2000 }).catch(() => false)) {
    const box = await card.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width/2, box.y + box.height/2, { steps: 10 });
      await sleep(500); await page.mouse.down(); await sleep(300);
      await page.mouse.move(box.x + 300, box.y, { steps: 30 });
      await sleep(1500); await page.mouse.up(); await sleep(2500);
    }
  }

  // ════════════════════════════════════════════════
  // GRAPH VIEW
  // ════════════════════════════════════════════════
  cap.mark('Graph View \u2014 Dependency visualization with Dagre layout');
  await page.goto(`${BASE_URL}/graph`);
  await page.waitForLoadState('networkidle');
  await injectOverlays(page);
  await page.mouse.move(720, 450);
  await sleep(6000);

  cap.mark('Color-coded Edges \u2014 blocks (red), depends_on (blue), relates (purple)');
  await sleep(4000);

  cap.mark('Interactive Graph \u2014 Zoom, pan, click to highlight chains');
  for (let i = 0; i < 3; i++) { await page.mouse.wheel(0, -100); await sleep(500); }
  await sleep(1500);
  await page.mouse.move(720, 450); await page.mouse.down();
  await page.mouse.move(500, 300, { steps: 25 }); await page.mouse.up();
  await sleep(1500);
  for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, 100); await sleep(350); }
  await sleep(2000);

  // ════════════════════════════════════════════════
  // DARK MODE
  // ════════════════════════════════════════════════
  cap.mark('Dark Mode \u2014 Refined theme with proper depth and contrast');
  const themeBtn = page.locator('[aria-label*="theme"], [aria-label*="Theme"], [aria-label*="mode"]').first();
  if (await themeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await moveTo(page, themeBtn); await sleep(1000);
    await themeBtn.click(); await sleep(2500);

    cap.mark('Dark Mode Board \u2014 Card shadows and accent colors');
    await page.goto(`${BASE_URL}/board`);
    await page.waitForLoadState('networkidle');
    await injectOverlays(page); await page.mouse.move(720, 450);
    await sleep(5000);

    cap.mark('Dark Mode List \u2014 Subtle background layers, refined contrast');
    await page.goto(`${BASE_URL}/list`);
    await page.waitForLoadState('networkidle');
    await injectOverlays(page); await page.mouse.move(720, 450);
    await sleep(5000);

    // Toggle back
    const themeBtn2 = page.locator('[aria-label*="theme"], [aria-label*="Theme"], [aria-label*="mode"]').first();
    await themeBtn2.click(); await sleep(1500);
  }

  // ════════════════════════════════════════════════
  // SPECIAL FEATURES
  // ════════════════════════════════════════════════
  cap.mark('404 Page \u2014 Designed not-found page with navigation');
  await page.goto(`${BASE_URL}/nonexistent-page`);
  await injectOverlays(page); await page.mouse.move(720, 450);
  await sleep(5000);

  cap.mark('Onboarding Tour \u2014 Progressive 5-step welcome for new users');
  await page.evaluate(() => localStorage.removeItem('beads-gui-onboarding-complete'));
  await page.goto(`${BASE_URL}/list`);
  await injectOverlays(page); await page.mouse.move(720, 300);
  await sleep(4000);
  const nextBtn = page.locator('button', { hasText: /Next|Get started/i }).first();
  if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await moveTo(page, nextBtn); await sleep(800);
    await nextBtn.click(); await sleep(2500);
    if (await nextBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await nextBtn.click(); await sleep(2500);
    }
  }
  const skipBtn = page.locator('button', { hasText: /Skip/i }).first();
  if (await skipBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await skipBtn.click(); await sleep(800);
  }
  await page.evaluate(() => localStorage.setItem('beads-gui-onboarding-complete', 'true'));

  // Final
  cap.mark('Beads GUI \u2014 Built with React, Fastify, Dolt, and love');
  await page.goto(`${BASE_URL}/list`);
  await injectOverlays(page); await page.mouse.move(720, 450);
  await sleep(5000);

  // ════════════════════════════════════════════════
  // PROCESS VIDEO
  // ════════════════════════════════════════════════
  console.log('\nRecording complete. Processing video...');
  await page.close();
  await context.close();
  await browser.close();

  const fs = await import('fs');
  const rawDir = './docs/demo/_raw/';
  const files = fs.readdirSync(rawDir).filter(f => f.endsWith('.webm'));
  const latest = files.sort().pop();
  if (!latest) { console.error('No video file!'); process.exit(1); }
  const rawPath = `${rawDir}${latest}`;
  console.log(`Raw video: ${rawPath}`);

  const filter = cap.buildFilter();
  if (filter) {
    console.log(`Applying ${cap.captions.length} captions with ffmpeg...`);
    try {
      execSync(`ffmpeg -y -i "${rawPath}" -vf "${filter}" -c:a copy "${FINAL_VIDEO}"`,
        { stdio: 'inherit', timeout: 180000 });
      console.log(`Captioned video: ${FINAL_VIDEO}`);
    } catch (e) {
      console.error('ffmpeg failed, using raw:', e.message);
      fs.copyFileSync(rawPath, FINAL_VIDEO);
    }
  } else {
    fs.copyFileSync(rawPath, FINAL_VIDEO);
  }

  fs.rmSync(rawDir, { recursive: true, force: true });
  const duration = cap.captions[cap.captions.length - 1]?.time || 0;
  console.log(`\nFinal: ${FINAL_VIDEO} (~${Math.ceil(duration)}s, ${cap.captions.length} captions)`);
}

demo().catch(e => { console.error('Demo failed:', e.message); process.exit(1); });
