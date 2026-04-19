---
name: Capture Demo
description: Record bite-sized, feature-focused walkthrough videos from the pearl demo library (docs/demos/). Each demo has its own scene script so it can be re-recorded individually. Keeps overlays (cursor, click pulse, keystrokes, region highlight) and ffmpeg captions from the original. Validates output before delivering.
---

# Capture Demo

Records one or more walkthrough videos from the library at `docs/demos/`. Each folder is a self-contained demo: `docs/demos/<NN-slug>/scene.mjs` defines the scene, and recording produces `docs/demos/<NN-slug>/video.webm` with overlays + ffmpeg captions.

## Key Principles

**One feature per demo.** Each video is short (30-90s) and focuses on a single capability. The library is the showcase, not any single video.

**Re-record on demand.** You can re-record a single demo without touching the others: `node scripts/record-demo.mjs 03`.

**Slow pacing.** Each feature segment should hold for 4-6 seconds so a viewer can follow.

**Visual annotations** (injected by `scripts/demo-lib/recorder.mjs`):
- Blue cursor ring that follows the mouse
- Red click pulse animation on every click
- Floating keystroke display showing pressed keys
- Blue highlight box drawing attention to the active region
- ffmpeg `drawtext` caption overlay identifying each feature

**Validate before delivering.** Never commit a video without extracting frames and visually verifying the captions match what's on screen.

## Prerequisites

```bash
pnpm exec playwright install chromium
ffmpeg -filters 2>&1 | grep -q drawtext || brew install homebrew-ffmpeg/ffmpeg/ffmpeg
```

## Workflow

### Step 1 — Ensure dev servers are running

```bash
curl -s -o /dev/null -w '%{http_code}' http://localhost:5173
```

If not `200`, start them and mark `STARTED_SERVERS=true` so you know to stop them at the end:

```bash
(cd packages/pearl-bdui && pnpm dev &) 2>/dev/null
(cd packages/frontend && pnpm dev &) 2>/dev/null
for i in 1 2 3 4 5 6 7 8 9 10; do
  curl -s -o /dev/null -w '%{http_code}' http://localhost:5173 | grep -q 200 && break || sleep 1
done
```

### Step 2 — Decide scope

```bash
# See what's in the library
node scripts/record-demo.mjs --list
```

Record a single demo (by exact id, number prefix, or substring):

```bash
node scripts/record-demo.mjs 03
node scripts/record-demo.mjs 03-keyboard-navigation
```

Record the entire library:

```bash
node scripts/record-demo.mjs --all
```

The runner handles per-demo state reset (localStorage for onboarding, column prefs, and theme) so each demo records identically regardless of order.

### Step 3 — VALIDATE each recorded video (MANDATORY)

**Never skip this step.** For every video you recorded, extract frames and read them:

```bash
DEMO=03-keyboard-navigation  # substitute the id you just recorded
VIDEO="docs/demos/$DEMO/video.webm"
VALIDATE_DIR="docs/demos/$DEMO/_validate"
mkdir -p "$VALIDATE_DIR"
DURATION=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$VIDEO" | cut -d. -f1)
for pct in 10 25 40 55 70 85; do
  ts=$((DURATION * pct / 100))
  ffmpeg -y -ss "$ts" -i "$VIDEO" -frames:v 1 "$VALIDATE_DIR/frame-${ts}s.png" 2>/dev/null
done
```

Then **read each frame image** and verify:

- Caption text matches what's on screen
- The screen isn't frozen or blank
- Overlays (cursor, highlights) are visible where expected

If anything is off, fix the scene script and re-record **just that demo**. Do not deliver a broken video.

```bash
rm -rf "$VALIDATE_DIR"  # clean up after validation
```

### Step 4 — Stop servers (if we started them)

```bash
pkill -f 'tsx watch' 2>/dev/null || true
pkill -f 'node.*src/index' 2>/dev/null || true
pkill -f 'dolt sql-server' 2>/dev/null || true
pkill -f 'vite' 2>/dev/null || true
sleep 2
ps aux | grep -E 'tsx|dolt|vite' | grep -v grep || echo "All clean"
```

### Step 5 — Commit, push, return links

```bash
git add docs/demos/ scripts/record-demo.mjs scripts/demo-lib/
git commit -m "docs: re-record demo(s): <id>, <id>

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push
```

Return a table of GitHub links for each recorded `docs/demos/<id>/video.webm` on the current branch.

## Adding a new demo

1. `mkdir docs/demos/NN-descriptive-slug` using the next unclaimed number (gaps are fine for inserting later).
2. Create `scene.mjs`:
   ```js
   export const meta = {
     title: 'Short title',
     description: 'One-line description for the README table.',
     startPath: '/list',          // optional, defaults to /list
     showOnboarding: false,       // set true to clear pearl-onboarding-complete
     viewport: { width: 1440, height: 900 }, // optional
   };

   export default async function scene({ page, cap, helpers }) {
     const { hl, hlLocator, hlOff, moveTo, scrollToHeading, sleep, injectOverlays } = helpers;
     cap.mark('My Feature \u2014 What it does');
     // interactions with 4-6s dwell
     await sleep(5000);
   }
   ```
3. `node scripts/record-demo.mjs NN` and validate per Step 3 above.
4. Add a row to `docs/demos/README.md`.

## Scene authoring pitfalls (mandatory rules — violating them produces broken output)

### 1. Click title cells, not table rows
Clicking `tbody tr` hits the checkbox column. Always click the title cell:
```js
// WRONG: await page.locator('tbody tr').first().click()
// RIGHT:
await page.locator('tbody tr td').nth(2).first().click()
```

### 2. Use scrollIntoView, not fixed pixel offsets
```js
// WRONG: await main.evaluate(el => el.scrollBy(0, 400))
// RIGHT:
await helpers.scrollToHeading('Dependencies');
```

### 3. Escape does NOT close the keyboard-shortcut overlay
Use the close button:
```js
const closeBtn = page.locator('[aria-label="Close"]').first();
if (await closeBtn.isVisible({ timeout: 1500 }).catch(() => false)) await closeBtn.click();
```

### 4. Don't use `:has-text()` inside `page.evaluate`
Playwright's `:has-text()` only works in locators, not `querySelector`. Use `hlLocator(locator)` which uses the bounding box:
```js
// WRONG: await page.evaluate(() => window.__hl('button:has-text("Edit")'))
// RIGHT:
await helpers.hlLocator(page.locator('button', { hasText: /^Edit$/ }).first());
```

### 5. Re-inject overlays after page.goto
Navigation clears injected JS. After any `page.goto()` inside a scene, call `helpers.injectOverlays()`.

### 6. Verify detail view navigation succeeded
```js
const inDetail = page.url().includes('/issues/');
if (!inDetail) return;
```

### 7. When debugging, write a diagnostic script first
Before re-recording, a diagnostic script that screenshots after every action reveals exactly where things fail without watching video.

## Important Notes

- ALWAYS stop servers you started before finishing (prevents Dolt lock issues)
- Scripts use headless Chromium at 1440x900 viewport by default
- Video is WebM format with VP9 encoding
- ffmpeg captions use the `drawtext` filter (requires libfreetype)
- The runner resets `localStorage` for onboarding, column prefs, and theme between demos, so scenes are order-independent
- Screenshots (`scripts/capture-screenshots.mjs`) are no longer part of this skill — they live on as an independent tool
