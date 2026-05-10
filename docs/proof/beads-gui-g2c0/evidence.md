---
title: evidence
type: note
permalink: pearl/proof/beads-gui-g2c0/evidence
---

# Proof: Polish 2 (beads-gui-g2c0)

**Date**: 2026-04-26
**Epic**: Polish 2 — second polish wave (12 closed children + 1 failed audit task)
**Driver**: `packages/frontend/e2e/proof-polish-2.spec.ts` (run via `packages/frontend/playwright.proof.config.ts`)

Captured against the running dev server at `localhost:5173` after the infinity-loop pushed all 12 successful child commits to `origin/main`. Screenshot PNGs are gitignored per project policy (`.gitignore`: `docs/proof/**/*.png`); regenerate locally with the reproduction command at the bottom of this file.

## Summary

| Bead | Title | Screenshot(s) | Verdict |
|---|---|---|---|
| g2c0.2 | Attachments fail to load | `g2c0.2-attachments.png` | ✅ Refs render as indigo pills (no red error icons); attachments cards present |
| g2c0.13 | Issue modal width | `g2c0.13-modal-content-width.png` | ✅ Full-page modal main content fills width; refs + attachments visible |
| g2c0.1 | Resizable side panel | `g2c0.1-side-panel-default.png` | ✅ Panel renders at default width (~440px) |
| g2c0.1 + g2c0.3 | Narrow panel + FIELDS | `g2c0.1-3-side-panel-narrow.png` | ✅ Panel width persists from localStorage; FIELDS render without overflow at narrow width (Owner email visible in full) |
| g2c0.4 | Labels combobox | `g2c0.4-labels-combobox-open.png`, `g2c0.4-labels-combobox-arrow-nav.png` | ✅ Single clean focus ring; ArrowDown highlights options (epic-series highlighted after 2× ↓) |
| g2c0.6 | Filter dropdown anchor | `g2c0.6-priority-dropdown-anchor.png` | ✅ Priority dropdown anchored directly under its trigger button |
| g2c0.8 | Search modal overflow | `g2c0.8-search-modal-default.png`, `g2c0.8-search-modal-short-viewport.png` | ✅ Modal stays inside viewport at default + at 600px-tall viewport |
| g2c0.11 | Board sort | `g2c0.11-board-default.png` | ✅ Per-column "Modified" sort selected; items ordered by modified_at desc (see note below) |
| g2c0.5 | Date picker chevrons | `g2c0.5-date-picker-open.png` | ✅ Chevrons sit on the same row as "April 2026" header — no overlap with natural-language input |
| g2c0.9 | Create Issue modal size | `g2c0.9-create-issue-modal.png` | ✅ Modal ~50% wider than original; Description textarea ~2× taller |
| g2c0.10 | Toast on create | `g2c0.10-toast-on-create.png` | ✅ Toast shows "Issue created: [BeadId pill]" with linkable id (6zl2 in this run) |
| g2c0.12 | List column order | `g2c0.12-list-column-order.png` | ✅ Default order: ID, TYPE, TITLE, STATUS, PRIORITY, ASSIGNEE, CREATED, DUE, LABELS |

## Observations / possible follow-ups

These were noticed during proof inspection but are NOT failures of the 12 closed beads — they're either pre-existing or cosmetic.

1. **"No matching labels" empty-state shows alongside populated label list** in `g2c0.4-labels-combobox-open.png` — the label dropdown displays 7 options AND an empty-state message at the bottom. Empty state should only show when there are zero matches. (Worth filing as a follow-up bug; not part of g2c0.4's scope which was focus ring + keyboard nav.)

2. **`alem` Epic row shows overlapping "Open(s done"** in screenshots where the side panel is open. The progress badge ("0/33 done") and the Status badge ("Open") collide when the list area is squeezed. Not a regression of the 12 closed beads — it's a row-rendering issue when columns are narrow.

3. **Onboarding banner persists across pageloads** — visible in many screenshots ("Step 1 of 5: Welcome to Pearl"). It's expected first-run UX; the proof spec dismisses it via localStorage but a few screenshots still show it (some tests don't dismiss before navigating). Cosmetic.

4. **g2c0.11 board sort by Modified** — the proof screenshot shows the audit-spawned beads (g2c0.14/15/16) at the top of the Open column, with `efbj` (a P2 issue created in an earlier test run) below them. This is the **correct** sort order given the issues' stored `modified_at` values: g2c0.14/15/16 were updated at ~18:50–18:51Z while `efbj` was created at 17:45Z. The sort itself is functional. The toast-test issue (`6zl2`) does not appear in the visible top of the column because it was created AFTER the board screenshot was taken (test ordering: board sort runs at step 8, toast runs at step 11).

## Reproduction

```bash
# From the repo root, with the dev server running on :5173:
cd packages/frontend
pnpm exec playwright test --config=playwright.proof.config.ts
```

Screenshots are written to this directory.

## Files

```
docs/proof/beads-gui-g2c0/
├── README.md  (this file)
├── g2c0.1-3-side-panel-narrow.png
├── g2c0.1-side-panel-default.png
├── g2c0.10-toast-on-create.png
├── g2c0.11-board-default.png
├── g2c0.12-list-column-order.png
├── g2c0.13-modal-content-width.png
├── g2c0.2-attachments.png
├── g2c0.4-labels-combobox-arrow-nav.png
├── g2c0.4-labels-combobox-open.png
├── g2c0.5-date-picker-open.png
├── g2c0.6-priority-dropdown-anchor.png
├── g2c0.8-search-modal-default.png
├── g2c0.8-search-modal-short-viewport.png
└── g2c0.9-create-issue-modal.png
```