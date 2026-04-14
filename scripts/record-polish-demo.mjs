import { chromium } from '@playwright/test';
import { execSync } from 'child_process';

const BASE_URL = 'http://localhost:5173';
const FINAL_VIDEO = './docs/demo/polish-demo.webm';

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
    if (document.getElementById('demo-cursor')) return;
    const cursor = document.createElement('div');
    cursor.id = 'demo-cursor';
    Object.assign(cursor.style, {
      position: 'fixed', zIndex: '99999', pointerEvents: 'none',
      width: '28px', height: '28px', borderRadius: '50%',
      border: '3px solid rgba(59,130,246,0.9)', background: 'rgba(59,130,246,0.15)',
      transform: 'translate(-50%,-50%)', transition: 'width 0.1s,height 0.1s',
      left: '-100px', top: '-100px'
    });
    document.body.appendChild(cursor);
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
    const hl = document.createElement('div');
    hl.id = 'demo-highlight';
    Object.assign(hl.style, {
      position: 'fixed', zIndex: '99997', pointerEvents: 'none',
      border: '3px solid rgba(59,130,246,0.7)', borderRadius: '8px',
      background: 'rgba(59,130,246,0.06)',
      boxShadow: '0 0 0 4px rgba(59,130,246,0.15)',
      transition: 'all 0.3s ease-out', opacity: '0'
    });
    document.body.appendChild(hl);
    document.addEventListener('mousemove', e => {
      cursor.style.left = e.clientX + 'px'; cursor.style.top = e.clientY + 'px';
    });
    document.addEventListener('mousedown', e => {
      cursor.style.width = '22px'; cursor.style.height = '22px';
      cursor.style.borderColor = 'rgba(239,68,68,0.9)';
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
    });
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

async function hlLocator(page, locator, pad = 10) {
  const box = await locator.boundingBox().catch(() => null);
  if (box) await page.evaluate(([x,y,w,h]) => window.__hlRect?.(x,y,w,h),
    [box.x - pad, box.y - pad, box.width + pad*2, box.height + pad*2]);
}
async function hlOff(page) { await page.evaluate(() => window.__hlOff?.()); }
async function moveTo(page, locator) {
  const box = await locator.boundingBox().catch(() => null);
  if (box) await page.mouse.move(box.x + box.width/2, box.y + box.height/2, { steps: 15 });
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
  });
  await page.reload();
  await page.waitForSelector('table', { timeout: 10000 });
  await sleep(1000);
  await injectOverlays(page);
  await page.mouse.move(720, 450);
  await sleep(1500);

  // ════════════════════════════════════════════════
  // 1. LABEL COLORS
  // ════════════════════════════════════════════════
  cap.mark('Label Colors \u2014 Colored pills with per-label palette');
  // Look for any colored label badges in the table
  const labelBadge = page.locator('[class*="label-badge"], span[style*="background-color"]').first();
  if (await labelBadge.isVisible({ timeout: 3000 }).catch(() => false)) {
    await hlLocator(page, labelBadge, 6);
    await moveTo(page, labelBadge);
  }
  await sleep(5000);
  await hlOff(page);

  // ════════════════════════════════════════════════
  // 2. INLINE EDITING
  // ════════════════════════════════════════════════
  cap.mark('Inline Title Edit \u2014 Double-click any title to edit in place');
  const titleCell = page.locator('tbody tr td').nth(2).first();
  if (await titleCell.isVisible({ timeout: 3000 }).catch(() => false)) {
    await moveTo(page, titleCell);
    await sleep(500);
    await titleCell.dblclick();
    await sleep(3000);
    await page.keyboard.press('Escape');
    await sleep(1000);
  }
  await hlOff(page);

  cap.mark('Inline Date Picker \u2014 Click due date for popover calendar');
  const dateCell = page.locator('button[aria-label*="date"], button[aria-label*="Date"]').first();
  if (await dateCell.isVisible({ timeout: 3000 }).catch(() => false)) {
    await hlLocator(page, dateCell, 6);
    await moveTo(page, dateCell);
    await sleep(1000);
    await dateCell.click();
    await sleep(4000);
    await page.keyboard.press('Escape');
    await sleep(1000);
  }
  await hlOff(page);

  // ════════════════════════════════════════════════
  // 3. FILTER QUERY SYNTAX + CHIPS
  // ════════════════════════════════════════════════
  cap.mark('Query Syntax \u2014 Type status\\:open to auto-apply filters');
  const searchInput = page.locator('input[placeholder*="Search"]').first();
  if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await hlLocator(page, searchInput, 6);
    await moveTo(page, searchInput);
    await sleep(500);
    await searchInput.click();
    await sleep(300);
    await page.keyboard.type('status:open', { delay: 60 });
    await sleep(4000);
  }
  await hlOff(page);

  cap.mark('Filter Chips \u2014 Active filters shown as removable tags');
  // Look for filter chips
  const filterChip = page.locator('[class*="chip"], [class*="Chip"], button:has-text("status")').first();
  if (await filterChip.isVisible({ timeout: 2000 }).catch(() => false)) {
    await hlLocator(page, filterChip, 6);
  }
  await sleep(5000);
  await hlOff(page);

  // Clear search
  await searchInput.fill('');
  await sleep(500);
  const clearAll = page.locator('button', { hasText: /Clear all/i }).first();
  if (await clearAll.isVisible({ timeout: 1000 }).catch(() => false)) {
    await clearAll.click();
    await sleep(500);
  }

  // ════════════════════════════════════════════════
  // 4. NOTIFICATION BELL
  // ════════════════════════════════════════════════
  cap.mark('Notification Bell \u2014 Unread badge + dropdown panel');
  const bellBtn = page.locator('button[aria-label*="Notification"], button[aria-label*="notification"]').first();
  if (await bellBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await hlLocator(page, bellBtn, 8);
    await moveTo(page, bellBtn);
    await sleep(1500);
    await bellBtn.click();
    await sleep(4000);
    // Close dropdown
    await page.keyboard.press('Escape');
    await sleep(1000);
  }
  await hlOff(page);

  // ════════════════════════════════════════════════
  // 5. PAGE TRANSITIONS (navigate between views)
  // ════════════════════════════════════════════════
  cap.mark('Page Transitions \u2014 Directional slides between views');
  // Navigate List → Board (slide right)
  const boardLink = page.locator('a[href="/board"]').first();
  if (await boardLink.isVisible({ timeout: 2000 }).catch(() => false)) {
    await moveTo(page, boardLink);
    await sleep(800);
    await boardLink.click();
  }
  await sleep(3000);
  await injectOverlays(page);

  cap.mark('Board View \u2014 Slide transition from List');
  await page.mouse.move(720, 450);
  await sleep(3000);

  // Board → Graph (slide right)
  cap.mark('Graph View \u2014 Continues slide direction');
  const graphLink = page.locator('a[href="/graph"]').first();
  if (await graphLink.isVisible({ timeout: 2000 }).catch(() => false)) {
    await moveTo(page, graphLink);
    await sleep(500);
    await graphLink.click();
  }
  await sleep(3000);
  await injectOverlays(page);
  await page.mouse.move(720, 450);

  // ════════════════════════════════════════════════
  // 6. GRAPH VIEW POLISH
  // ════════════════════════════════════════════════
  cap.mark('Rich Graph Nodes \u2014 Status colors, priority, labels on each node');
  await sleep(5000);

  cap.mark('Node Hover \u2014 Tooltip with full issue metadata');
  // Hover over a graph node
  const graphNode = page.locator('[class*="graph-node"], [data-testid*="node"], .react-flow__node').first();
  if (await graphNode.isVisible({ timeout: 3000 }).catch(() => false)) {
    await moveTo(page, graphNode);
    await sleep(4000);
  }

  cap.mark('Dependency Highlighting \u2014 Click to trace the full chain');
  if (await graphNode.isVisible({ timeout: 1000 }).catch(() => false)) {
    // Force click to avoid sidebar interception
    await graphNode.click({ force: true });
    await sleep(4000);
    // Click graph background to deselect
    await page.mouse.click(720, 450);
    await sleep(1500);
  }

  // ════════════════════════════════════════════════
  // 7. SETTINGS — NOTIFICATION PREFERENCES
  // ════════════════════════════════════════════════
  cap.mark('Settings \u2014 Notification Preferences section');
  await page.goto(`${BASE_URL}/settings`);
  await page.waitForLoadState('networkidle');
  await injectOverlays(page);
  await page.mouse.move(720, 450);
  await sleep(2000);

  // Scroll to notifications section
  await page.evaluate(() => {
    const headings = document.querySelectorAll('h2');
    for (const h of headings) {
      if (h.textContent?.includes('Notification')) {
        h.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
  });
  await sleep(4000);

  // Toggle a notification preference
  cap.mark('Toggle Preferences \u2014 Enable/disable notification types');
  const toggle = page.locator('input[type="checkbox"]').first();
  if (await toggle.isVisible({ timeout: 2000 }).catch(() => false)) {
    await hlLocator(page, toggle, 20);
    await moveTo(page, toggle);
    await sleep(1000);
    await toggle.click();
    await sleep(2000);
    await toggle.click(); // Toggle back
    await sleep(2000);
  }
  await hlOff(page);

  // ════════════════════════════════════════════════
  // 8. MOBILE RESPONSIVE
  // ════════════════════════════════════════════════
  cap.mark('Mobile Layout \u2014 Responsive at 375px width');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`${BASE_URL}/list`);
  await page.waitForLoadState('networkidle');
  await injectOverlays(page);
  await sleep(4000);

  cap.mark('Hamburger Menu \u2014 Sidebar collapses to drawer');
  const hamburger = page.locator('button[aria-label*="menu"], button[aria-label*="Menu"]').first();
  if (await hamburger.isVisible({ timeout: 3000 }).catch(() => false)) {
    await moveTo(page, hamburger);
    await sleep(800);
    await hamburger.click();
    await sleep(3000);
    // Close drawer
    await page.keyboard.press('Escape');
    await sleep(1000);
  }

  cap.mark('Card List \u2014 Issues as tappable cards on mobile');
  await sleep(4000);

  cap.mark('Collapsible Filters \u2014 Filter bar behind expandable button');
  const filterToggle = page.locator('button', { hasText: /Filter/i }).first();
  if (await filterToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
    await hlLocator(page, filterToggle, 6);
    await moveTo(page, filterToggle);
    await sleep(1000);
    await filterToggle.click();
    await sleep(3000);
  }
  await hlOff(page);

  // Reset viewport
  await page.setViewportSize({ width: 1440, height: 900 });
  await sleep(500);

  // Final
  cap.mark('Polish Complete \u2014 Linear-quality UI across all devices');
  await page.goto(`${BASE_URL}/list`);
  await page.waitForLoadState('networkidle');
  await injectOverlays(page);
  await page.mouse.move(720, 450);
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
