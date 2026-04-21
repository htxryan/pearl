import { chromium } from '@playwright/test';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export const BASE_URL = 'http://localhost:5173';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class CaptionTracker {
  constructor() {
    this.captions = [];
    this.startTime = Date.now();
  }
  mark(text) {
    const t = (Date.now() - this.startTime) / 1000;
    this.captions.push({ time: t, text });
    console.log(`  [${t.toFixed(1)}s] ${text}`);
  }
  buildFilter() {
    return this.captions
      .map((c, i) => {
        const start = c.time;
        const end = i + 1 < this.captions.length ? this.captions[i + 1].time : start + 10;
        const text = c.text.replace(/'/g, '\u2019').replace(/:/g, '\\:').replace(/\\/g, '\\\\');
        return (
          `drawtext=text='${text}':fontsize=26:fontcolor=white:borderw=2:bordercolor=black@0.9:` +
          `box=1:boxcolor=black@0.7:boxborderw=14:x=(w-text_w)/2:y=h-th-50:` +
          `enable='between(t,${start.toFixed(2)},${end.toFixed(2)})'`
        );
      })
      .join(',');
  }
}

export async function injectOverlays(page) {
  await page.evaluate(() => {
    if (document.getElementById('demo-cursor')) return;

    const cursor = document.createElement('div');
    cursor.id = 'demo-cursor';
    Object.assign(cursor.style, {
      position: 'fixed', zIndex: '99999', pointerEvents: 'none',
      width: '28px', height: '28px', borderRadius: '50%',
      border: '3px solid rgba(59,130,246,0.9)', background: 'rgba(59,130,246,0.15)',
      transform: 'translate(-50%,-50%)',
      transition: 'width 0.1s,height 0.1s,border-color 0.1s,background 0.1s',
      left: '-100px', top: '-100px',
    });
    document.body.appendChild(cursor);

    const ring = document.createElement('div');
    ring.id = 'demo-click-ring';
    Object.assign(ring.style, {
      position: 'fixed', zIndex: '99998', pointerEvents: 'none',
      width: '28px', height: '28px', borderRadius: '50%',
      border: '2px solid rgba(59,130,246,0.8)',
      transform: 'translate(-50%,-50%) scale(1)', opacity: '0',
      left: '-100px', top: '-100px',
    });
    document.body.appendChild(ring);

    const keyBox = document.createElement('div');
    keyBox.id = 'demo-keys';
    Object.assign(keyBox.style, {
      position: 'fixed', zIndex: '99999', pointerEvents: 'none',
      bottom: '100px', left: '50%', transform: 'translateX(-50%)',
      display: 'flex', gap: '6px', alignItems: 'center',
      transition: 'opacity 0.2s', opacity: '0',
    });
    document.body.appendChild(keyBox);

    const hl = document.createElement('div');
    hl.id = 'demo-highlight';
    Object.assign(hl.style, {
      position: 'fixed', zIndex: '99997', pointerEvents: 'none',
      border: '3px solid rgba(59,130,246,0.7)', borderRadius: '8px',
      background: 'rgba(59,130,246,0.06)',
      boxShadow: '0 0 0 4px rgba(59,130,246,0.15), 0 0 20px rgba(59,130,246,0.1)',
      transition: 'all 0.3s ease-out', opacity: '0',
    });
    document.body.appendChild(hl);

    document.addEventListener('mousemove', (e) => {
      cursor.style.left = `${e.clientX}px`;
      cursor.style.top = `${e.clientY}px`;
    });
    document.addEventListener('mousedown', (e) => {
      cursor.style.width = '22px';
      cursor.style.height = '22px';
      cursor.style.borderColor = 'rgba(239,68,68,0.9)';
      cursor.style.background = 'rgba(239,68,68,0.25)';
      ring.style.left = `${e.clientX}px`;
      ring.style.top = `${e.clientY}px`;
      ring.style.opacity = '1';
      ring.style.transform = 'translate(-50%,-50%) scale(1)';
      ring.style.transition = 'none';
      requestAnimationFrame(() => {
        ring.style.transition = 'transform 0.4s ease-out, opacity 0.4s ease-out';
        ring.style.transform = 'translate(-50%,-50%) scale(3)';
        ring.style.opacity = '0';
      });
    });
    document.addEventListener('mouseup', () => {
      cursor.style.width = '28px';
      cursor.style.height = '28px';
      cursor.style.borderColor = 'rgba(59,130,246,0.9)';
      cursor.style.background = 'rgba(59,130,246,0.15)';
    });

    let keyTimeout = null;
    document.addEventListener('keydown', (e) => {
      const parts = [];
      if (e.metaKey) parts.push('Cmd');
      if (e.ctrlKey) parts.push('Ctrl');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey && e.key !== 'Shift') parts.push('Shift');
      const map = {
        Escape: 'Esc', Enter: 'Enter', ArrowUp: '\u2191', ArrowDown: '\u2193',
        Backspace: '\u232B', Tab: 'Tab', ' ': 'Space', Meta: 'Cmd', Control: 'Ctrl', Shift: 'Shift',
      };
      let k = map[e.key] || e.key;
      if (k.length === 1) k = k.toUpperCase();
      if (!['Cmd', 'Ctrl', 'Alt', 'Shift'].includes(k)) parts.push(k);
      if (!parts.length) return;
      keyBox.innerHTML = parts
        .map(
          (p) =>
            '<span style="display:inline-flex;align-items:center;justify-content:center;min-width:36px;height:36px;' +
            'padding:0 10px;border-radius:8px;background:rgba(0,0,0,0.8);color:white;font-size:16px;font-weight:600;' +
            'font-family:system-ui;border:1px solid rgba(255,255,255,0.2);box-shadow:0 2px 8px rgba(0,0,0,0.3);">' +
            p + '</span>'
        )
        .join('<span style="color:rgba(255,255,255,0.5);font-size:14px;font-weight:bold;">+</span>');
      keyBox.style.opacity = '1';
      clearTimeout(keyTimeout);
      keyTimeout = setTimeout(() => (keyBox.style.opacity = '0'), 1200);
    });

    window.__hl = (sel, pad = 10) => {
      const el = document.querySelector(sel);
      if (!el) return;
      const r = el.getBoundingClientRect();
      Object.assign(hl.style, {
        left: `${r.left - pad}px`, top: `${r.top - pad}px`,
        width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px`, opacity: '1',
      });
    };
    window.__hlRect = (x, y, w, h) =>
      Object.assign(hl.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px`, opacity: '1' });
    window.__hlOff = () => (hl.style.opacity = '0');
  });
}

export async function hlLocator(page, locator, pad = 10) {
  const box = await locator.boundingBox().catch(() => null);
  if (box)
    await page.evaluate(([x, y, w, h]) => window.__hlRect?.(x, y, w, h), [
      box.x - pad, box.y - pad, box.width + pad * 2, box.height + pad * 2,
    ]);
}
export async function hlOff(page) {
  await page.evaluate(() => window.__hlOff?.());
}
export async function hl(page, sel, pad = 10) {
  await page.evaluate(([s, p]) => window.__hl?.(s, p), [sel, pad]);
}
export async function moveTo(page, locator) {
  const box = await locator.boundingBox().catch(() => null);
  if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 15 });
}
export async function scrollToHeading(page, headingText) {
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

export function makeHelpers(page) {
  return {
    sleep,
    hl: (sel, pad) => hl(page, sel, pad),
    hlLocator: (loc, pad) => hlLocator(page, loc, pad),
    hlOff: () => hlOff(page),
    moveTo: (loc) => moveTo(page, loc),
    scrollToHeading: (t) => scrollToHeading(page, t),
    injectOverlays: () => injectOverlays(page),
  };
}

async function resetState(page, meta) {
  await page.evaluate((m) => {
    localStorage.removeItem('beads:col-visibility');
    localStorage.removeItem('beads:col-order');
    localStorage.removeItem('beads:col-sizing');
    localStorage.removeItem('pearl-theme');
    localStorage.removeItem('pearl-theme-cache');
    if (m.showOnboarding) {
      localStorage.removeItem('pearl-onboarding-complete');
    } else {
      localStorage.setItem('pearl-onboarding-complete', 'true');
    }
  }, meta);
}

export async function runScene({ id, folder, scene, meta }) {
  const step = (msg) => console.log(`  · ${msg}`);
  const rawDir = path.join(folder, '_raw');
  fs.rmSync(rawDir, { recursive: true, force: true });
  fs.mkdirSync(rawDir, { recursive: true });

  const viewport = meta.viewport ?? { width: 1440, height: 900 };
  step('launch browser');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport,
    recordVideo: { dir: rawDir, size: viewport },
  });
  const page = await context.newPage();
  const cap = new CaptionTracker();

  const startPath = meta.startPath ?? '/list';
  step(`goto ${startPath}`);
  await page.goto(`${BASE_URL}${startPath}`);
  step('reset state');
  await resetState(page, meta);
  step('reload');
  await page.reload();
  // Don't wait for 'networkidle' — vite HMR websocket + react-query polling
  // keep the connection "busy" indefinitely. Wait for 'load' instead.
  await page.waitForLoadState('load').catch(() => {});
  await sleep(800);
  step('inject overlays');
  await injectOverlays(page);
  await page.mouse.move(720, 450);
  await sleep(1000);

  step('run scene');
  const helpers = makeHelpers(page);
  let sceneError = null;
  try {
    await scene({ page, cap, helpers });
  } catch (e) {
    sceneError = e;
    console.error(`Scene "${id}" threw:`, e.message);
  }

  step('close page');
  await page.close();
  step('close context (flushes video)');
  await context.close();
  step('close browser');
  await browser.close();

  const files = fs.readdirSync(rawDir).filter((f) => f.endsWith('.webm'));
  const latest = files.sort().pop();
  if (!latest) {
    if (sceneError) throw sceneError;
    throw new Error(`No raw video produced for ${id}`);
  }
  const rawPath = path.join(rawDir, latest);
  const outPath = path.join(folder, 'video.webm');

  const filter = cap.buildFilter();
  if (filter) {
    try {
      execSync(`ffmpeg -y -i "${rawPath}" -vf "${filter}" -c:a copy "${outPath}"`, {
        stdio: 'inherit', timeout: 180_000,
      });
    } catch (e) {
      console.error('ffmpeg failed, copying raw:', e.message);
      fs.copyFileSync(rawPath, outPath);
    }
  } else {
    fs.copyFileSync(rawPath, outPath);
  }

  fs.rmSync(rawDir, { recursive: true, force: true });
  const duration = cap.captions[cap.captions.length - 1]?.time ?? 0;
  console.log(`\n✓ ${id}: ${outPath} (~${Math.ceil(duration)}s, ${cap.captions.length} captions)`);
  if (sceneError) throw sceneError;
  return { id, outPath, duration, captions: cap.captions };
}
