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
| `TypePill` | `type-pill.tsx` | Issue type chip (task, bug, feature, …) with icon and color. |
| `PriorityIndicator` | `priority-indicator.tsx` | Priority dot/label (P0–P4). |
| `LabelBadge` / `LabelPicker` | `label-badge.tsx`, `label-picker.tsx` | Issue labels with user-defined colors. |
| `AssigneePicker` | `assignee-picker.tsx` | Avatar + name picker. |
| `Select` | `select.tsx` | Themed replacement for `<select>` built on Base UI. Use for non-trivial selects. |
| `DatePicker` | `date-picker.tsx` | Date input with calendar popover. |
| `RelativeTime` | `relative-time.tsx` | "3h ago" with `<time datetime>` for accessibility. |
| `EmptyState` | `empty-state.tsx` | Standard empty-state layout (icon + title + description + optional CTA). |
| `ConfirmDialog` | `confirm-dialog.tsx` | Destructive-action confirmation modal. |
| `Card` | `card.tsx` | Surface container with border and padding. Variants: default. |
| `Dialog` | `dialog.tsx` | Modal dialog with backdrop, focus trap, and close handling. |
| `AlertDialog` | `alert-dialog.tsx` | Confirmation dialog for destructive actions (wraps Dialog). |
| `Tooltip` | `tooltip.tsx` | Hover/focus tooltip built on Base UI. Use for keyboard shortcut hints and non-essential context. |
| `Command` / `Combobox` | `command.tsx`, `combobox.tsx` | Command palette and searchable combobox primitives. |
| `DropdownMenu` | `dropdown-menu.tsx` | Context menu / action menu. |
| `Popover` | `popover.tsx` | Positioned popup container for non-modal content. |
| `Input` / `Textarea` | `input.tsx`, `textarea.tsx` | Themed text inputs with consistent border/focus styling. |
| `Checkbox` / `Switch` / `RadioGroup` | `checkbox.tsx`, `switch.tsx`, `radio-group.tsx` | Form toggle controls. |
| `Avatar` | `avatar.tsx` | User avatar with fallback initial. |
| `Badge` | `badge.tsx` | Generic badge (distinct from `StatusBadge` — used for counts, tags). |
| `Skeleton` | `skeleton.tsx` | Loading placeholder shape with shimmer animation. |
| `Progress` | `progress.tsx` | Determinate progress bar. |
| `Separator` | `separator.tsx` | Horizontal/vertical divider. |
| `Sheet` | `sheet.tsx` | Slide-in panel from screen edge (mobile drawer, side panels). |
| `Sidebar` | `sidebar.tsx` | App-level navigation sidebar. |
| `BeadId` | `bead-id.tsx` | Monospace issue identifier display (`beads-gui-xxxx`). |
| `AttachmentIcon` | `attachment-icon.tsx` | File-type icon for attachments. |
| `DomainIcons` | `domain-icons.tsx` | Domain-specific icon set (issue types, priorities). |

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

Use the `<Card>` primitive (`card.tsx`) for surface containers:

```tsx
<Card className="p-4">
  <CardHeader>...</CardHeader>
  <CardContent>...</CardContent>
</Card>
```

The Card provides `rounded-[var(--radius)] border border-border bg-card` by default. Sub-components (`CardHeader`, `CardContent`, `CardFooter`, `CardTitle`, `CardDescription`) are exported for structured layouts.

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

- `Tabs` — no multi-tab view exists yet; reach for router segments first
- `Toast` primitive — toasts use `sonner` directly (`Toaster` in `app.tsx`, `use-toasts.ts` hook) but no Pearl-specific primitive wrapper exists yet
- `Breadcrumb` — navigation doesn't go deep enough yet to justify
- `Accordion` — no collapsible sections needed currently
