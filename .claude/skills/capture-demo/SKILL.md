---
name: Capture Demo
description: Capture comprehensive screenshots and an annotated walkthrough video of the beads-gui app showcasing EVERY feature, with cursor tracking, keystroke display, region highlights, and ffmpeg captions. Validates output before delivering.
---

# Capture Demo

Captures screenshots and a fully-annotated walkthrough video of the beads-gui app, validates the output, commits to git, pushes, and returns GitHub links.

## Key Principles

**Showcase EVERY feature** — not just the basic views. The screenshots and video must demonstrate each capability the app has. When new features are added, update the scripts to include them.

**Slow pacing** — each feature segment should hold for 4-6 seconds so a viewer can follow. Never rush through actions.

**Visual annotations** — the video includes:
- Blue cursor ring that follows the mouse
- Red click pulse animation on every click
- Floating keystroke display showing pressed keys
- Blue highlight box drawing attention to the active region
- ffmpeg caption overlay at the bottom identifying each feature

**Validate before delivering** — after recording, extract frames at key timestamps with ffmpeg and visually inspect them. Never deliver a video without verifying the content matches the captions.

## Prerequisites

- Playwright: `pnpm exec playwright install chromium`
- ffmpeg with libfreetype (for drawtext captions): `brew install homebrew-ffmpeg/ffmpeg/ffmpeg`
- Dev servers running or will be started temporarily

## Workflow

### Step 1: Ensure servers are running

```bash
curl -s -o /dev/null -w '%{http_code}' http://localhost:5173 2>/dev/null
```

If not 200, start them:

```bash
(cd packages/backend && pnpm dev &) 2>/dev/null
(cd packages/frontend && pnpm dev &) 2>/dev/null
# Poll until ready
for i in 1 2 3 4 5 6 7 8 9 10; do
  curl -s -o /dev/null -w '%{http_code}' http://localhost:5173 | grep -q 200 && break || sleep 1
done
```

Set `STARTED_SERVERS=true` so you know to stop them at the end.

### Step 2: Ensure Playwright + ffmpeg are available

```bash
pnpm exec playwright install chromium 2>/dev/null || true
ffmpeg -filters 2>&1 | grep -q drawtext || echo "WARN: ffmpeg drawtext not available"
```

### Step 3: Capture screenshots

```bash
node scripts/capture-screenshots.mjs
```

The screenshot script covers every major feature/view. When new features are added, update this script to include them.

### Step 4: Record walkthrough video

```bash
rm -rf docs/demo/_raw/ && mkdir -p docs/demo/_raw
node scripts/record-demo.mjs
```

The recording script:
1. Injects visual overlays (cursor, click effects, keystroke display, highlight box) into the page
2. Walks through every feature with deliberate pacing (4-6s per segment)
3. Tracks timestamps for each caption
4. After recording, applies ffmpeg drawtext captions to the raw video
5. Cleans up the raw directory

### Step 5: VALIDATE the video (MANDATORY)

**Never skip this step.** Extract frames at key timestamps and visually verify:

```bash
mkdir -p docs/demo/_validate
# Extract frames at ~10 evenly-spaced points through the video
DURATION=$(ffprobe -v error -show_entries format=duration -of csv=p=0 docs/demo/beads-gui-demo.webm | cut -d. -f1)
for pct in 10 20 30 40 50 60 70 80 90; do
  ts=$((DURATION * pct / 100))
  ffmpeg -y -ss "$ts" -i docs/demo/beads-gui-demo.webm -frames:v 1 "docs/demo/_validate/frame-${ts}s.png" 2>/dev/null
done
```

Then **read each frame image** and verify:
- The caption text matches what's actually shown on screen
- The screen is not frozen/blank
- Overlays (cursor, highlights) are visible where expected
- Each major section of the app is represented

If any frame shows a mismatch (e.g., caption says "Detail View" but screen shows list), **fix the script and re-record**. Do not deliver broken video.

```bash
rm -rf docs/demo/_validate  # Clean up after validation
```

### Step 6: Stop servers (if we started them)

```bash
pkill -f 'tsx watch' 2>/dev/null || true
pkill -f 'node.*src/index' 2>/dev/null || true
pkill -f 'dolt sql-server' 2>/dev/null || true
pkill -f 'vite' 2>/dev/null || true
sleep 2
ps aux | grep -E 'tsx|dolt|vite' | grep -v grep || echo "All clean"
```

### Step 7: Commit, push, and generate links

```bash
git add docs/demo/ scripts/capture-screenshots.mjs scripts/record-demo.mjs
git commit -m "docs: update demo screenshots and annotated walkthrough video

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
git push
```

### Step 8: Return GitHub links

Get the current branch and construct URLs:

```bash
BRANCH=$(git branch --show-current)
```

Output all screenshot and video links as a formatted table.

## Playwright Script Pitfalls (Learned the Hard Way)

These are mandatory rules for the recording/screenshot scripts. Violating them produces broken output.

### 1. Click title cells, not table rows
Clicking `tbody tr` hits the checkbox column. Always click the specific cell:
```js
// WRONG: await page.locator('tbody tr').first().click()
// RIGHT:
await page.locator('tbody tr td').nth(2).first().click()  // title is 3rd column
```

### 2. Use scrollIntoView, not fixed pixel offsets
Issue content varies in length. `scrollBy(0, 400)` won't reach Dependencies on a long issue.
```js
// WRONG: await main.evaluate(el => el.scrollBy(0, 400))
// RIGHT:
await page.evaluate((text) => {
  const headings = document.querySelectorAll('h2');
  for (const h of headings) {
    if (h.textContent?.includes(text)) {
      h.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
  }
}, 'Dependencies');
```

### 3. Test overlay dismissal — don't assume Escape works
The keyboard help overlay does NOT close with Escape. Use the close button:
```js
// WRONG: await page.keyboard.press('Escape')
// RIGHT:
const closeBtn = page.locator('[aria-label="Close"]').first();
if (await closeBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
  await closeBtn.click();
}
```

### 4. Don't use :has-text() in page.evaluate selectors
Playwright's `:has-text()` pseudo-selector works in locators but NOT in `querySelector`. Use bounding boxes instead:
```js
// WRONG: await page.evaluate(() => window.__hl('button:has-text("Edit")'))
// RIGHT:
const box = await editBtn.boundingBox();
if (box) await page.evaluate(([x,y,w,h]) => window.__hlRect(x-6,y-6,w+12,h+12), [box.x,box.y,box.width,box.height]);
```

### 5. Re-inject overlays after page.goto
Navigating to a new page clears injected JS. Call `injectOverlays(page)` after every `page.goto()`.

### 6. Run a diagnostic script first when debugging
Before re-recording, write a quick diagnostic that takes a screenshot after every action:
```js
async function snap(page, label) { await page.screenshot({ path: `_diag/${label}.png` }); }
```
This reveals exactly where the script fails without watching a 3-minute video.

### 7. Verify detail view navigation succeeded
After clicking to open detail, check the URL before proceeding:
```js
const inDetail = page.url().includes('/issues/');
console.log(`Verified detail view: ${inDetail}`);
if (!inDetail) { /* handle failure */ }
```

## Adding New Features to the Demo

When new features are added to the app:

1. **Screenshots** (`scripts/capture-screenshots.mjs`): Add a new numbered section that navigates to the feature and captures a screenshot
2. **Video** (`scripts/record-demo.mjs`): Add a new `cap.mark('Feature Name — Description')` call, perform the interaction with 4-6s of dwell time, and use `hlLocator()` to highlight the relevant region
3. **Re-record and validate** following Steps 4-5 above

## Important Notes

- ALWAYS stop servers you started before finishing (prevents Dolt lock issues)
- Scripts use headless Chromium at 1440x900 viewport
- Video is WebM format with VP9 encoding
- ffmpeg captions use drawtext filter — requires libfreetype
- Screenshots overwrite previous versions in docs/demo/
- Dismiss the onboarding banner at start: `localStorage.setItem('beads-gui-onboarding-complete', 'true')`
