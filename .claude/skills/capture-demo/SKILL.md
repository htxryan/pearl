---
name: Capture Demo
description: Capture screenshots of all views and a walkthrough video of the beads-gui app, commit them to git, push, and return GitHub raw URLs for each asset. Requires the frontend and backend dev servers to be running (or starts them temporarily).
---

# Capture Demo

Captures screenshots and a walkthrough video of the beads-gui app, commits to git, pushes, and returns GitHub links.

## Prerequisites

- Playwright must be installed: `pnpm exec playwright install chromium`
- The app must be running at http://localhost:5173 (frontend) with backend at http://localhost:3456

## Workflow

### Step 1: Ensure servers are running

Check if the dev servers are already running. If not, start them temporarily.

```bash
# Check if frontend is already serving
curl -s -o /dev/null -w '%{http_code}' http://localhost:5173 2>/dev/null
```

If not running (non-200), start them:

```bash
cd /Users/redhale/src/beads-gui
# Start backend in background
(cd packages/backend && pnpm dev &) 2>/dev/null
sleep 5
# Start frontend in background
(cd packages/frontend && pnpm dev &) 2>/dev/null
sleep 5
```

Set `STARTED_SERVERS=true` so you know to stop them at the end.

### Step 2: Ensure Playwright is available

```bash
pnpm exec playwright install chromium 2>/dev/null || true
```

### Step 3: Capture screenshots

Run the existing screenshot script:

```bash
node scripts/capture-screenshots.mjs
```

This produces:
- `docs/demo/01-list-view.png`
- `docs/demo/02-detail-panel.png`
- `docs/demo/03-command-palette.png`
- `docs/demo/04-board-view.png`
- `docs/demo/05-graph-view.png`
- `docs/demo/06-dark-mode.png`

### Step 4: Record walkthrough video

Run the existing video recording script:

```bash
node scripts/record-demo.mjs
```

This produces:
- `docs/demo/beads-gui-demo.webm`

### Step 5: Stop servers (if we started them)

If `STARTED_SERVERS=true`, clean up:

```bash
pkill -f 'tsx watch' 2>/dev/null || true
pkill -f 'node.*src/index' 2>/dev/null || true
pkill -f 'dolt sql-server' 2>/dev/null || true
pkill -f 'vite' 2>/dev/null || true
sleep 2
# Verify cleanup
ps aux | grep -E 'tsx|dolt|vite' | grep -v grep || echo "All clean"
```

### Step 6: Commit, push, and generate links

```bash
git add docs/demo/
git commit -m "docs: update demo screenshots and walkthrough video

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
git push
```

### Step 7: Return GitHub links

Construct raw GitHub URLs for each asset. The pattern is:

```
https://github.com/htxryan/beads-gui/blob/<branch>/docs/demo/<filename>?raw=true
```

Get the current branch:
```bash
git branch --show-current
```

Then output a formatted list:

```markdown
## Demo Assets

### Screenshots
- **List View**: https://github.com/htxryan/beads-gui/blob/<branch>/docs/demo/01-list-view.png?raw=true
- **Detail Panel**: https://github.com/htxryan/beads-gui/blob/<branch>/docs/demo/02-detail-panel.png?raw=true
- **Command Palette**: https://github.com/htxryan/beads-gui/blob/<branch>/docs/demo/03-command-palette.png?raw=true
- **Board View**: https://github.com/htxryan/beads-gui/blob/<branch>/docs/demo/04-board-view.png?raw=true
- **Graph View**: https://github.com/htxryan/beads-gui/blob/<branch>/docs/demo/05-graph-view.png?raw=true
- **Dark Mode**: https://github.com/htxryan/beads-gui/blob/<branch>/docs/demo/06-dark-mode.png?raw=true

### Video
- **Walkthrough**: https://github.com/htxryan/beads-gui/blob/<branch>/docs/demo/beads-gui-demo.webm?raw=true
```

## Error Handling

- If screenshots fail, check that the app is actually serving content at localhost:5173
- If video recording fails, screenshots are still valid — commit what you have
- If `record-demo.mjs` can't find specific UI elements (e.g., dark mode toggle), it will skip those steps gracefully
- If git push fails, run `git pull --rebase` and retry

## Important Notes

- ALWAYS stop servers you started before finishing (prevents Dolt lock issues)
- The scripts use headless Chromium at 1440x900 viewport
- Video is recorded as WebM format
- Screenshots overwrite previous versions in docs/demo/
