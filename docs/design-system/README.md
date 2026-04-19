# Pearl Design System

This is the source of truth for how Pearl looks, moves, and feels. It exists so the product stays coherent as features accumulate and so anyone — human or agent — can make a change without first guessing the rules.

Pearl is a local-first, keyboard-driven issue tracker (beads). The UI is dense, data-heavy, and often multi-panel. The design system is built around that reality: a disciplined token scale, a curated set of primitives, and motion that stays out of the user's way.

## Philosophy

Three ideas underpin every decision in this directory. If you are making a call the docs don't cover, fall back to these.

1. **Constrained decision spaces over open aesthetic judgment** (Refactoring UI). Every visual property — spacing, color, elevation, radius, motion duration — is a finite scale. Picking from a scale is reliable; picking from infinity is how UIs drift.
2. **Deep modules, simple interfaces** (Ousterhout). A component's API surface should be small even when its internals are substantial. If a new prop can be avoided by a better default, avoid it.
3. **Hierarchy through all three channels** (Treisman). Size, weight, and color work in parallel preattentively — use all three, and prefer *de-emphasizing* secondary content over emphasizing primary.

## Structure

| Doc | Scope |
|---|---|
| [01 — Foundation](01-foundation.md) | Brand voice, typography system, writing tone |
| [02 — Tokens](02-tokens.md) | Color, spacing, elevation, radius, motion tokens — the atomic layer |
| [03 — Components](03-components.md) | UI primitives (`Button`, `StatusBadge`, `EmptyState`, …) and composition patterns |
| [04 — Motion](04-motion.md) | Animation durations, easings, named animations, reduced-motion policy |
| [05 — States](05-states.md) | Loading, empty, error, partial, offline — every view's non-happy paths |
| [06 — Accessibility](06-accessibility.md) | Contrast targets, focus, keyboard model, screen-reader patterns |

## Source of truth

The tokens in these docs mirror `packages/frontend/src/index.css` (`@theme` block) and the theme definitions in `packages/frontend/src/themes/definitions/`. If a doc and the code disagree, the code wins and the doc is stale — fix it.

## When to update these docs

- A new token is added or renamed (`--color-*`, `--shadow-*`, `--spacing-*`, `--animate-*`)
- A new `components/ui/*` primitive lands, or an existing one gains/loses a variant
- A new motion pattern is introduced (new `@keyframes` or class)
- A pattern is promoted from one-off to reusable (empty state copy style, error boundary tone, etc.)

Update the doc in the same PR as the change. Docs that trail code by weeks stop being trusted.
