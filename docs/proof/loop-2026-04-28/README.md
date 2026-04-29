# Loop 2026-04-28 — Proof of 9 Closed Epics

Autonomous loop run on 2026-04-28 closed 9 epics in 1 attempt each, no
failures, total runtime ~98 min. This folder captures end-to-end evidence.

## Epic-by-epic verification

| ID        | Type | Verified by                                       |
|-----------|------|---------------------------------------------------|
| o4vj      | docs | `docs/design-system/{01..06}-*.md` + README       |
| 9y9y      | docs | `docs/{architecture,api-reference,data-model,setup-guide}.md` |
| 8g1i      | docs | `docs/troubleshooting.md` + `.claude/lessons/index.jsonl` |
| g2c0.14   | bug  | Playwright screenshots: `g2c0.14/404-buttons-{320,768}.png` |
| g2c0.15   | bug  | Playwright screenshots: `g2c0.15/{settings-tabs-320,notifications-page-320}.png` |
| g2c0.16   | bug  | Code diff (see "Graph view caveat" below)         |
| 0yyo      | bug  | Playwright screenshot: `0yyo/embedded-mode-board.png` |
| 0u06      | task | Test suite: 982 frontend + 230 backend tests pass |
| 5px       | feat | Playwright screenshots: `5px/issue-detail-{activity,comments-tab}.png` |

## Quality gates

- `pnpm typecheck` — clean across all packages.
- `pnpm test` — 982 / 982 frontend, 230 / 230 backend, 0 failures.
- `pnpm exec playwright test loop-2026-04-28-evidence` — 7 passed, 1 skipped.

## Graph view caveat (g2c0.16)

The end-to-end test for the Graph toolbar fix is intentionally skipped. The
Graph view triggers a pre-existing `xyflow` "Maximum update depth exceeded"
crash on the dev DB at all viewports. That crash is unrelated to this fix
(`graph-view.tsx` was not modified by this loop run).

The fix itself is a 2-token CSS change in `graph-toolbar.tsx`:

```diff
- <div className="flex items-center gap-2 shrink-0">
+ <div className="flex flex-wrap items-center gap-2">
```

Removing `shrink-0` and adding `flex-wrap` lets the toolbar buttons wrap to
a new line at narrow viewports instead of being clipped off-screen. The
`min-h-[44px] md:min-h-0` class on each button preserves a 44px touch
target on mobile/tablet, dropping back to the natural height on desktop.

## Reproduce

```bash
pnpm typecheck
pnpm test
pnpm exec playwright test loop-2026-04-28-evidence --project=chromium --reporter=list
```

The Playwright spec (`e2e/loop-2026-04-28-evidence.spec.ts`) drives a real
backend (port 3456) and a real frontend (port 5173) — no mocks.
