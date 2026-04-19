# 06 — Accessibility

Accessibility is a design property, not an audit step. If it's not designed in from the token layer up, no amount of ARIA will make the UI usable. Pearl aims for WCAG 2.2 AA across the product, with higher bars for keyboard ergonomics.

## Contrast targets

| Content | Ratio | Where it matters |
|---|---|---|
| Body text (< 18px regular / < 14px bold) | **4.5:1** minimum | All `text-foreground` on `bg-background`, `bg-surface-raised`, etc. |
| Large text (≥ 18px regular / ≥ 14px bold) | **3:1** minimum | Page titles, `text-lg+` copy |
| Non-text (icons, focus rings, form borders) | **3:1** against adjacent color | Button outlines, input borders, focus indicators |
| Disabled text | **No minimum** (WCAG exempts disabled) — but aim for readable | `disabled:opacity-40` must still be parseable |

### Tokens to watch

When building a new theme or palette override, verify these pairs:

- `foreground` on `background`
- `foreground` on `surface-raised`
- `foreground` on `muted`
- `muted-foreground` on `background` — this is the one that fails most often
- `primary-foreground` on `primary`
- `info-foreground` on `info/15` (tinted badge pattern)
- Same for `success`, `warning`, `danger`

The High-Contrast themes (`hc-light`, `hc-dark`) exist as the strictest reference — if a pattern breaks there, it's a pattern problem, not a theme problem.

### How to check

Pearl doesn't ship a contrast-check script yet, but you can sanity-check locally with browser devtools (Accessibility pane → Contrast). For systematic audits, spin up axe DevTools on each primary view.

## Keyboard

Pearl is **keyboard-first** — see [01 — Foundation](01-foundation.md).

### Global shortcuts

Documented in `components/keyboard-help.tsx`. The shortcut help dialog is reachable via `?`. Every primary action must appear there.

### Focus management rules

- **Focus ring is always visible.** Don't remove `focus-visible:ring-*`. If the default ring clashes visually, change the ring color via `--color-ring`, don't hide it.
- **Trap focus in modals.** `<dialog>` handles this natively. Custom popovers (`command-palette.tsx`) trap focus manually.
- **Return focus on close.** When a modal closes, focus returns to the element that opened it.
- **Autofocus the first meaningful field.** Modals autofocus the primary input; cmd-palette autofocuses the search box.
- **Skip links.** Not yet implemented — TODO if we add more content before the main view.

### Interactive state coverage

Every interactive element must visually distinguish:

1. Default
2. `:hover`
3. `:active` (press feedback — usually `scale-[0.97]` or color shift)
4. `:focus-visible` (ring)
5. `:disabled`

`focus-visible` (not `focus`) — this only shows the ring for keyboard users, not mouse clicks. Using `:focus` puts rings on every mouse click, which reads as broken.

### Tab order

- DOM order = tab order. Don't use `tabIndex` beyond `0` and `-1`.
- `tabIndex="-1"` for programmatically-focusable non-interactive elements (a scroll container that receives focus on error)
- Never use positive `tabIndex` values — they break the natural order.

## ARIA

**Rule of least ARIA:** use the right HTML element first. Add ARIA only when semantics fall short.

### Prefer semantic HTML

- `<button>` for actions, not `<div onClick>`
- `<a href>` for navigation, not `<button>` + `navigate()`
- `<dialog>` for modals (it handles backdrop, focus trap, `Esc`)
- `<nav>`, `<main>`, `<aside>`, `<header>`, `<footer>` for landmarks
- `<ul>/<ol>/<li>` for lists, not `<div>` stacks

### When ARIA earns its keep

- `aria-label` for icon-only buttons (`<button aria-label="Close">×</button>`)
- `aria-describedby` to link form inputs to helper/error text
- `aria-live="polite"` for toast announcements and dynamic validation
- `aria-expanded`, `aria-controls` for custom disclosures
- `role="status"` for non-urgent live regions

### Anti-patterns

- `aria-hidden="true"` on visible interactive content
- `role="button"` on a `<div>` — just use `<button>`
- Empty `aria-label` "to silence" accessibility warnings
- Overuse of `aria-live` (every change becomes noise)

## Reduced motion

Globally handled (see [04 — Motion](04-motion.md#reduced-motion)). All named animations collapse to 0.01ms duration under `prefers-reduced-motion: reduce`.

## Screen reader patterns

### Dynamic content

Toast notifications and form validation use `aria-live="polite"` so screen readers announce changes without interrupting.

### Relative time

`<RelativeTime>` renders a `<time datetime="…">` element so screen readers announce the absolute time, not "3h ago."

### Icons

Decorative icons: `aria-hidden="true"` (e.g., the `📋` in `EmptyState`).
Informational icons: `aria-label="…"` or visible text beside the icon.

## Touch targets

Mobile minimum: **44×44 px** per WCAG 2.5.5.

- Buttons on mobile must be at least `h-11` (44px) and wide enough
- Tap targets in tables are acceptable at `h-10` on desktop but need padding extension on mobile
- Adjacent tap targets need at least 8px gap so fat-fingered taps don't misfire

## Color independence

No information conveyed by color alone. The `StatusBadge` uses color *and* text. Chart data uses color *and* shape/pattern. If you build a view where color is the only differentiator, add a second channel (icon, label, pattern).

## Forms

- Every `<input>` has a programmatic label (`<label htmlFor>` or `aria-label`)
- Required fields have `required` and a visible marker (not just color)
- Error messages are linked via `aria-describedby`
- Grouped inputs use `<fieldset>` + `<legend>`

## Accessibility checklist per view

- [ ] All text meets contrast targets against its background (including muted, accent, and status tints)
- [ ] Every interactive element reachable by keyboard in a logical order
- [ ] Every interactive element has visible `:focus-visible` state
- [ ] Icon-only buttons have `aria-label`
- [ ] Dynamic content (toasts, validation) announces via `aria-live`
- [ ] `prefers-reduced-motion` collapses animations (inherited from global CSS — don't override)
- [ ] No information conveyed by color alone
- [ ] Mobile tap targets ≥ 44×44 px
- [ ] Form inputs have labels, error-linked via `aria-describedby`
- [ ] Dialog / modal traps focus and restores on close
