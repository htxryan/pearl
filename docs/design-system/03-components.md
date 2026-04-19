# 03 — Components

Pearl's component layer has two tiers:

1. **Primitives** (`src/components/ui/*`) — small, composable, presentational. No data fetching, minimal state.
2. **Features** (`src/components/*`, `src/views/*`) — built from primitives, own their data and interactions.

This doc is about the primitives. Features are documented in code and the specs under `docs/specs/`.

## Design rules for primitives

Every primitive in `components/ui/` must satisfy these.

- **Deep interface.** The prop list is the interface; keep it small. Hide complexity in the implementation. If a component has more than 6 props, ask whether it's two components.
- **Forward refs and rest props.** Use `forwardRef`, spread `...props` onto the root so consumers can attach handlers, `aria-*`, and `data-*`. See `button.tsx` for the pattern.
- **Compose with `cn()`.** Accept a `className` and merge it last via `cn()` (`src/lib/utils.ts`) so consumers can override.
- **Token-only styling.** No hard-coded colors, spacing, radii, or shadows. Everything resolves to a token from [02 — Tokens](02-tokens.md).
- **Four interactive states.** Every interactive primitive has visible hover, active (press), focus-visible, and disabled states. No exceptions.
- **Reduced-motion safe.** If you animate, respect `prefers-reduced-motion` (global CSS handles the default; don't opt out).
- **Dark mode by default.** Never write `.dark` overrides in a component — use tokens that already remap in dark mode.

## Current primitives

| Primitive | File | What it's for |
|---|---|---|
| `Button` | `button.tsx` | All button actions. Variants: `default`, `outline`, `ghost`, `destructive`. Sizes: `default`, `sm`, `lg`, `icon`. |
| `StatusBadge` | `status-badge.tsx` | Issue status pill. Reads `IssueStatus` from `@pearl/shared`. |
| `TypeBadge` | `type-badge.tsx` | Issue type chip (task, bug, feature, …). |
| `PriorityIndicator` | `priority-indicator.tsx` | Priority dot/label (P0–P4). |
| `LabelBadge` / `LabelPicker` | `label-badge.tsx`, `label-picker.tsx` | Issue labels with user-defined colors. |
| `AssigneePicker` | `assignee-picker.tsx` | Avatar + name picker. |
| `CustomSelect` | `custom-select.tsx` | Themed replacement for `<select>`. Use this over native for non-trivial selects. |
| `DatePicker` | `date-picker.tsx` | Date input with calendar popover. |
| `RelativeTime` | `relative-time.tsx` | "3h ago" with `<time datetime>` for accessibility. |
| `EmptyState` | `empty-state.tsx` | Standard empty-state layout (icon + title + description + optional CTA). |
| `ConfirmDialog` | `confirm-dialog.tsx` | Destructive-action confirmation modal. |

### `Button` — the canonical example

```tsx
<Button variant="default" size="sm" onClick={handleSubmit} disabled={pending}>
  Save
</Button>
```

Key behaviors to preserve when editing:

- `active:scale-[0.97] active:transition-none` — tactile press feedback, instant (no transition on the scale-down)
- `hover:shadow-md hover:shadow-primary/25` on `default` — the button feels like it lifts
- `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` — always-visible keyboard focus
- `disabled:opacity-40 disabled:pointer-events-none` — disabled is obviously non-interactive

If a new variant is needed (e.g., `secondary`), add it to `variantStyles` and document the use case here.

### `StatusBadge` — the tinted-pill pattern

Use this pattern whenever a state has a semantic color:

```
background: bg-<token>/15  (15% alpha — recognizable, not overwhelming)
text:       text-<token>-foreground
shape:      rounded-full, px-2 py-0.5, text-xs font-medium
```

Any new badge component should follow this visual contract so the UI reads as one system.

### `EmptyState` — the non-happy path template

Every data-dependent view uses `EmptyState` when the collection is empty. The contract:

- **Icon** (emoji or SVG) at `text-5xl opacity-20` — present but quiet
- **Title** (`text-lg font-medium`) — one line, describes what the view *is*
- **Description** (`text-sm text-muted-foreground max-w-xs`) — one sentence explaining why empty and how to change that
- **Optional action** — a single CTA to create the missing thing

Copy tone: see [01 — Foundation](01-foundation.md#voice).

## Composition patterns

### `cn()` for conditional classes

Always merge via `cn()` (tailwind-merge + clsx). Never template-string class names with `${}` — tailwind-merge resolves conflicts that raw concatenation does not.

```tsx
<div className={cn("rounded-lg p-4", isActive && "bg-accent", className)} />
```

### Icon + label alignment

Use `inline-flex items-center gap-1.5` (for 14px text) or `gap-2` (for 16px+). Icons should be `h-4 w-4` inline with `text-sm`, `h-5 w-5` with `text-base`.

### Card pattern

Pearl doesn't have a `<Card>` primitive yet — the pattern is used inline:

```tsx
<div className="rounded-[var(--radius)] border border-border bg-surface-raised p-4">
  ...
</div>
```

If this pattern appears a fourth time with the same props, promote it to `components/ui/card.tsx`. Three occurrences is still better than a premature abstraction.

### Form field pattern

Label above input, `gap-1.5` between them, `gap-4` between adjacent fields. Inline validation (not just submit-time) — an invalid input shows a red border immediately when the user blurs.

## When to add a new primitive

A new file in `components/ui/` is justified when:

1. The same JSX + class-string appears in **three or more** places, *and*
2. Consolidating would let callers drop at least one concern (state, keyboard handling, aria wiring, or style coordination), *and*
3. The abstraction survives "design it twice" — sketch the prop API two different ways and pick the one that hides more complexity.

If any of these fails, keep the code inline. Shallow abstractions are worse than duplication.

## When to remove a primitive

- It has one caller and that caller could inline it without loss
- Its variants never overlap in use (two unrelated components in one file)
- It wraps a library primitive with no real addition — just use the library

## Deliberately missing primitives

These don't exist yet. If you need one, build it following the rules above and add it here:

- `Card` — use the inline pattern until the fourth occurrence
- `Tabs` — no multi-tab view exists yet; reach for router segments first
- `Tooltip` — native `title=` is acceptable for keyboard shortcut hints; build a real one when hover-only tooltips are needed
- `Toast` primitive — toasts exist (`toast-container.tsx`) but aren't split into a standalone primitive yet
