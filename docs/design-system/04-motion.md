# 04 — Motion

Motion in Pearl is functional, not decorative. Its job is to make state changes legible — to tell the user *what just happened* and *where something came from* — without stealing time or attention.

**North star:** if removing an animation would make the UI confusing, it earns its keep. If removing it would make the UI faster and no less clear, remove it.

## Duration scale

Three rungs. Pick the shortest one that still communicates.

| Duration | Use |
|---|---|
| **100ms** | Page exit, hover state, button press, tooltip reveal |
| **150–200ms** | Page enter, modal enter, dropdown open, toast slide-in, drawer slide |
| **300ms** | Staggered list entrance (`fade-up`), skeleton-to-content swap |

Never exceed 300ms for UI state changes. Longer animations are reserved for illustrative moments (onboarding, empty-state hero art) and should be opt-in, not ambient.

## Easing

| Curve | Use | CSS |
|---|---|---|
| `ease-out` | Things entering / revealing | `cubic-bezier(0, 0, 0.2, 1)` |
| `ease-in` | Things leaving / dismissing | `cubic-bezier(0.4, 0, 1, 1)` |
| `ease-out` (bouncy tail) | Playful moments (check toggle, cmd-palette spring) | custom keyframes |
| Linear | Progress indicators, shimmer | — |

Enter with `ease-out`, exit with `ease-in`. This mimics physical momentum and is nearly invisible until you try the reverse, which feels wrong.

## Named animations

All defined in `packages/frontend/src/index.css`. Use these instead of inventing new keyframes.

### Content entrance

| Name | Duration | What it does | Where |
|---|---|---|---|
| `fade-up` | 300ms | Opacity 0→1, translateY 8px→0 | List items entering after data load; use staggered (50ms delay per item) |
| `animate-in slide-in-from-right-full` | 200ms | TranslateX 100%→0 + fade | Toasts |
| `animate-slide-in-left` | 200ms | TranslateX -100%→0 | Mobile drawer |
| `animate-slide-in-right` | 200ms | TranslateX 100%→0 | Right-edge slide-over panels |

### Page transitions

Handled by `components/page-transition.tsx`. Exit (100ms) + enter (200ms) based on navigation direction:

| Class | Use |
|---|---|
| `page-enter-fade` / `page-exit-fade` | Sibling route changes (list → list) |
| `page-enter-from-right` / `page-exit-left` | Forward navigation in a sequence |
| `page-enter-from-left` / `page-exit-right` | Back navigation |
| `page-enter-drill` / `page-exit-drill` | List → detail (100px offset for "drill-down" feel) |

Exits are shorter than enters (100ms vs 200ms) so the user isn't waiting during navigation — the old page steps out quickly, the new one comes in at a readable pace.

### Modal / dialog

| Name | Use |
|---|---|
| `animate-modal-enter` | Modal body scale 0.95→1 + fade, 200ms |
| `modal-backdrop-enter` | Backdrop fade-in, 200ms — applied automatically to `dialog[open]::backdrop` |

### Command palette

| Name | Use |
|---|---|
| `cmd-spring-in` | Slight overshoot (scale to 1.02, settle to 1.0), 60% keyframe for spring feel |
| `cmd-fade-out` | Scale 1→0.98 + fade, for dismiss |

The spring on cmd-palette is the one place Pearl allows overshoot — it signals "this is your keyboard command surface" and gives the palette a distinct feel from modals.

### Skeleton / loading

| Name | Use |
|---|---|
| `.skeleton-shimmer` | Gradient sweep on muted background, 1.5s loop, `ease-in-out` — applied to skeleton boxes |

### Micro

| Name | Use |
|---|---|
| `check-pop` | Checkbox toggle (0.8→1.1→1 scale), 200ms, fires only on `:focus-visible:checked` so it doesn't run on initial render |

## Composition rules

- **One motion per state change.** Don't fade *and* slide *and* scale. Pick the one that best communicates the change.
- **No ambient animation.** Nothing should move unprompted. Background gradients, floating particles, auto-rotating carousels — all banned.
- **Stagger for lists, not everything.** A fresh list of 5–20 items benefits from 50ms staggered `fade-up`. Don't stagger a list of 200 rows (it becomes latency) or 2 rows (it's imperceptible).
- **Press feedback is instant.** Buttons use `active:scale-[0.97] active:transition-none` — the scale-down is immediate, only the release animates.
- **Exits cannot block user action.** If the user triggers something during an exit animation, the enter begins immediately. Never queue.

## Reduced motion

Global override in `index.css`:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

This means: **all the named animations above automatically become instant for users who request it.** You never need to write reduced-motion variants at the component level.

The exception is structural motion that encodes information (e.g., a list item physically moving to indicate a drag-drop reorder). If you ever add one, provide a non-motion equivalent (a brief outline highlight) for reduced-motion users.

## When adding a new animation

1. Can you use an existing named animation from the table above? If yes, do that.
2. If no, define the keyframes in `index.css` with a descriptive name (`slide-panel-up`, not `anim-1`).
3. Stay within the duration scale (100 / 200 / 300ms).
4. Default easing: `ease-out` for enter, `ease-in` for exit.
5. Add it to the table in this doc in the same PR.
