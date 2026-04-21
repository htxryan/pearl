# Pearl Demo Library

Bite-sized, feature-focused walkthrough videos. Each demo lives in its own folder with a `scene.mjs` script so it can be re-recorded on demand without re-recording the entire library.

## Recording

Prerequisites: dev servers running on `http://localhost:5173`, Playwright Chromium installed, and ffmpeg with `drawtext`/libfreetype available.

```bash
pnpm exec playwright install chromium        # once
brew install homebrew-ffmpeg/ffmpeg/ffmpeg    # once (for drawtext)

# Record one demo
node scripts/record-demo.mjs 03
node scripts/record-demo.mjs 03-keyboard-navigation

# Record every demo
node scripts/record-demo.mjs --all

# List the library
node scripts/record-demo.mjs --list
```

Output is written to `docs/demos/<id>/video.webm` (captions burned in with ffmpeg).

## Library

| ID | Title | Focus |
| --- | --- | --- |
| [01-list-view](./01-list-view/video.webm) | List View | Issue table + sidebar navigation |
| [02-quick-add](./02-quick-add/video.webm) | Quick Add | Inline issue creation from list |
| [03-keyboard-navigation](./03-keyboard-navigation/video.webm) | Keyboard Navigation | j/k row movement + x bulk select |
| [04-filters-and-presets](./04-filters-and-presets/video.webm) | Filters & Presets | Filter controls + save/recall views |
| [05-column-visibility](./05-column-visibility/video.webm) | Column Visibility | Toggle columns, persists in localStorage |
| [06-command-palette](./06-command-palette/video.webm) | Command Palette | Cmd+K commands + issue search |
| [07-keyboard-shortcuts](./07-keyboard-shortcuts/video.webm) | Keyboard Shortcuts | `?` shortcut reference overlay |
| [08-detail-view](./08-detail-view/video.webm) | Detail View | Inline fields, markdown, deps, activity |
| [09-board-view](./09-board-view/video.webm) | Board View | Kanban columns + drag-and-drop |
| [10-graph-view](./10-graph-view/video.webm) | Graph View | Dependency graph (Dagre) + zoom/pan |
| [11-theme-picker](./11-theme-picker/video.webm) | Theme Picker | Settings theme picker → Monokai |
| [12-theme-switcher-palette](./12-theme-switcher-palette/video.webm) | Theme Switcher | Cmd+K → Switch Theme → Solarized Light |
| [13-high-contrast-theme](./13-high-contrast-theme/video.webm) | High Contrast | HC Dark → reset to Light+ |
| [14-404-page](./14-404-page/video.webm) | 404 Page | Designed not-found page |
| [15-onboarding-tour](./15-onboarding-tour/video.webm) | Onboarding Tour | First-visit 5-step welcome |

## Adding a new demo

1. `mkdir docs/demos/NN-descriptive-name` (use an unclaimed number — gaps are fine).
2. Create `scene.mjs` exporting `meta` (`title`, `description`, `startPath`, optional `showOnboarding`, optional `viewport`) and a default async function `({ page, cap, helpers }) => { ... }`.
3. `helpers` provides `hl`, `hlLocator`, `hlOff`, `moveTo`, `scrollToHeading`, `sleep`, `injectOverlays`. Use `cap.mark('...')` to timestamp a caption; then hold with `sleep(4000-6000)` so viewers can follow.
4. `node scripts/record-demo.mjs NN` to record, then extract frames and visually verify before committing (see SKILL.md for validation steps).
5. Add a row to the table above.

## Scene authoring pitfalls (learned the hard way)

- **Click title cells, not rows.** `tbody tr` hits the checkbox column. Use `page.locator('tbody tr td').nth(2).first()` — the title is the 3rd cell.
- **Use `scrollIntoView`, not fixed pixel offsets.** Issue content varies in length; use `helpers.scrollToHeading('Dependencies')`.
- **Escape does NOT close the keyboard-shortcut overlay.** Click `[aria-label="Close"]` instead.
- **No `:has-text()` inside `page.evaluate`.** That pseudo-selector only works in Playwright locators, not `querySelector`. Use `hlLocator(locator)` with a locator's bounding box.
- **Re-inject overlays after `page.goto`.** Navigation clears injected JS. Call `helpers.injectOverlays()` after each new page load inside a scene.
- **Verify detail navigation.** After clicking a title cell, check `page.url().includes('/issues/')` before proceeding.
