# Epic: Playwright E2E Test Suite — Verification Evidence

**Issue**: beads-gui-g3b
**Date**: 2026-04-12
**Result**: ALL ACCEPTANCE CRITERIA MET

## Test Run Summary

```
88 passed (50.3s)
0 failed
0 flaky
```

Full output: [test-run-output.txt](./test-run-output.txt)

## Acceptance Criteria Verification

### 1. playwright.config.ts with webServer config to auto-start backend+frontend

**PASS** — `playwright.config.ts` configures:
- Two webServer entries: backend (port 3456, health check endpoint) and frontend (port 5173)
- Backend runs from `./sample-project` directory (correct CWD for Dolt database)
- `reuseExistingServer: !process.env.CI` for local development convenience
- Chromium-only project for speed, retries=2 in CI

### 2. At least 30 E2E test cases covering all views and key interactions

**PASS** — 88 test cases across 13 test files:

| Test File | Count | Coverage Area |
|-----------|-------|---------------|
| accessibility.spec.ts | 11 | Skip-to-content, ARIA labels, landmarks, dialog elements |
| board-view.spec.ts | 5 | Kanban columns, cards, navigation, filtering |
| bulk-actions.spec.ts | 4 | Row selection, bulk close dialog, clear selection |
| command-palette.spec.ts | 8 | Open/close, search, navigation commands, issue selection |
| dark-mode.spec.ts | 2 | Toggle theme, persistence after reload |
| dependency.spec.ts | 5 | Dependencies section, autocomplete search, ARIA combobox |
| detail-view.spec.ts | 13 | Navigation, breadcrumbs, fields, markdown editor, sections |
| graph-view.spec.ts | 8 | ReactFlow canvas, controls, minimap, legend, zoom, nodes |
| keyboard-shortcuts.spec.ts | 8 | ? overlay, close button, backdrop click, 1/2/3 nav, / focus |
| list-view.spec.ts | 11 | Table load, columns, search, sort, j/k/x/Enter keyboard nav |
| navigation.spec.ts | 5 | Root redirect, sidebar links, active highlights, branding |
| not-found.spec.ts | 3 | 404 page, navigation buttons, redirect |
| onboarding.spec.ts | 5 | Banner display, Next/Skip/Get Started, persistence |

### 3. Tests run headless and pass reliably (no flaky tests)

**PASS** — All 88 tests pass consistently in headless Chromium. Run time: ~50 seconds.

### 4. CI job runs Playwright tests after unit tests pass

**PASS** — `.github/workflows/ci.yml` includes `e2e` job:
- `needs: [test, build]` — runs after unit tests AND build succeed
- Installs Playwright browsers and system dependencies
- Runs `pnpm test:e2e`

### 5. Test results reported in CI with failure screenshots as artifacts

**PASS** — CI workflow uploads:
- `playwright-report/` as artifact (always, 14-day retention)
- `test-results/` as artifact on failure (screenshots, traces, 7-day retention)

## Views & Interactions Covered

- **List view**: load, columns, row click, search filter, sort, column visibility toggle, keyboard j/k/x/Enter
- **Quick-add**: input presence and placeholder
- **Bulk actions**: row selection, select-all, close confirmation dialog, clear
- **Detail view**: title click navigation, breadcrumbs, fields, status/priority selects, markdown editor, dependencies, comments, activity timeline, close dialog, 404 error state
- **Dependency autocomplete**: add button, search with dropdown, ARIA combobox, cancel
- **Command palette**: Cmd+K open/Escape close, recent issues, navigation commands, search, issue selection
- **Board view**: kanban columns, card click, filter bar
- **Graph view**: ReactFlow canvas, controls, minimap, legend, auto layout, zoom, nodes
- **Dark mode**: toggle, persistence
- **404 page**: designed page, navigation buttons
- **Keyboard shortcuts**: ? overlay, close button, backdrop click, 1/2/3 navigation, / search focus
- **Onboarding**: banner appears, step progression, skip, persistence, completion
- **Accessibility**: skip-to-content, main landmark, ARIA labels, route announcer, dialog element

## Technical Notes

- Uses Playwright locators (getByRole, getByLabel, getByPlaceholder) for resilience
- Title cells clicked at nth(2) to avoid checkbox interception
- scrollIntoViewIfNeeded() for detail view sections
- Keyboard help overlay opened via dispatched KeyboardEvent (Playwright limitation with Shift+?)
- Onboarding dismissed via localStorage in fixture
- All tests read-only against existing 100+ issue dataset (bd CLI write lock constraint)
