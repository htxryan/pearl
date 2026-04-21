# 02 — Tokens

The atomic layer. Every visual property in Pearl resolves to a token. This is the constrained decision space: pick from these scales; don't invent one-offs.

**Source of truth:** `packages/frontend/src/index.css` (the `@theme` block) and per-theme palettes in `packages/frontend/src/themes/definitions/*.ts`.

## Color

Pearl has a **semantic** color system, not a palette of raw hues. Components reference tokens by role, and themes remap those roles. This is why the same `<Button variant="default">` looks right in Solarized, Monokai, and High-Contrast Dark.

### Surface tokens

| Token | Role | Light default | Dark default |
|---|---|---|---|
| `background` | App canvas | `#ffffff` | `#111113` |
| `foreground` | Default text | `#0a0a0a` | `#ececef` |
| `surface` | Panel / card base | `#ffffff` | `#111113` |
| `surface-raised` | Elevated surface (modals, dropdowns) | `#fafafa` | `#1a1a1e` |
| `muted` | Subdued fills (skeletons, disabled) | `#f5f5f5` | `#1c1c1f` |
| `muted-foreground` | Secondary / meta text | `#737373` | `#9898a0` |
| `border` | Dividers, input borders | `#e5e5e5` | `#2a2a2e` |

### Interactive tokens

| Token | Role | Light default | Dark default |
|---|---|---|---|
| `primary` | Brand / primary action fill | `#4f46e5` | `#818cf8` |
| `primary-foreground` | Text on primary | `#ffffff` | `#0f0a2e` |
| `accent` | Hover / selection tint | `#eef2ff` | `#1e1b4b` |
| `accent-foreground` | Text on accent | `#3730a3` | `#c7d2fe` |
| `ring` | Focus ring | `#6366f1` | `#818cf8` |
| `destructive` | Destructive action fill | `#ef4444` | `#f87171` |

### Semantic status tokens

For states with shared meaning across the app (issue status, toasts, banners):

| Token | Meaning | Used in |
|---|---|---|
| `info` / `info-foreground` | Neutral notification | `StatusBadge` (open), info toasts |
| `success` / `success-foreground` | Positive outcome | `StatusBadge` (closed), success toasts |
| `warning` / `warning-foreground` | Attention needed | `StatusBadge` (in_progress), warning banners |
| `danger` / `danger-foreground` | Error or blocking | `StatusBadge` (blocked), error toasts |

**Pattern for tinted badges:** fill with `bg-<token>/15` (15% alpha), text in `<token>-foreground`. See `status-badge.tsx`. This gives the color semantic recognition without overwhelming saturation.

### Rules

- **Never hard-code hex in components.** Use the token. If the token doesn't exist for your use, add it to the `@theme` block and every theme definition.
- **Never use Tailwind's default palette classes** (`bg-blue-500`, `text-gray-700`) in app code. They bypass theming and break in custom palettes.
- **Reach for `color-mix()`** for alpha variants instead of adding new tokens (`color-mix(in srgb, var(--color-success) 10%, transparent)`).

## Spacing

Pearl uses a **geometric scale** (Weber-Fechner: perceptually uniform steps require multiplicative increments). Tailwind's default spacing is already geometric-ish at the useful sizes; we lean on it and add semantic aliases for common uses.

### Raw scale (Tailwind)

Use these directly for layout:

| Class | Pixels | Typical use |
|---|---|---|
| `gap-1` / `p-1` | 4px | Icon-text gaps, tight inline |
| `gap-2` / `p-2` | 8px | Form field internals, badge padding |
| `gap-3` / `p-3` | 12px | List item padding |
| `gap-4` / `p-4` | 16px | Card padding, default element spacing |
| `gap-6` / `p-6` | 24px | Section internal spacing |
| `gap-8` / `p-8` | 32px | Major section separation |
| `gap-12` / `p-12` | 48px | Page-level breathing room |
| `gap-16` / `p-16` | 64px | Hero / landing only |

**Don't use** `gap-5`, `gap-7`, `gap-9`, `gap-10`, `gap-11`, `p-5`, `p-7`, etc. The gaps in the scale are intentional — forbidding them prevents arithmetic drift ("close enough" 20px boxes).

### Semantic aliases

For prose clarity in CSS files, these semantic tokens are defined:

```css
--spacing-compact:  0.5rem;  /* 8px — tight lists, inline elements */
--spacing-default:  1rem;    /* 16px — standard element spacing */
--spacing-spacious: 1.5rem;  /* 24px — section gaps */
--spacing-section:  2rem;    /* 32px — major section separation */
```

Prefer raw Tailwind classes in JSX; use the semantic aliases in CSS.

### Gestalt proximity

More space *between* groups than *within* groups. A form's label and input should sit closer (`gap-1.5`) than two adjacent form fields (`gap-4`). This is the cheapest way to communicate grouping without borders.

## Elevation (shadows)

Five-level elevation scale. Use the `.elevation-N` utility classes (or `var(--shadow-N)`) — never arbitrary `box-shadow:` values.

| Level | Class | Use |
|---|---|---|
| 0 | `elevation-0` | Flush with surface (no shadow) |
| 1 | `elevation-1` | Resting cards, list items on hover |
| 2 | `elevation-2` | Dropdowns, popovers, default button hover |
| 3 | `elevation-3` | Modal panels, command palette |
| 4 | `elevation-4` | Full-screen dialogs, highest-layer toasts |

**Dark mode variant:** shadows are barely visible on dark backgrounds, so dark theme elevation adds a `0 0 0 1px var(--color-border)` ring — a subtle border-glow that reads as elevation. This is applied automatically by the `.elevation-N` classes in `.dark`.

**Rule:** prefer spacing and background contrast over shadows. A card separated by `gap-4` and `bg-surface-raised` is often cleaner than a shadowed card.

## Radius

Single token, single value:

```css
--radius: 0.5rem; /* 8px */
```

Everything rounded uses `rounded-[var(--radius)]` (buttons, cards, inputs, modals) except:

- Badges / pills: `rounded-full`
- Inline chips where full-round reads better: `rounded-full`
- Code blocks: `rounded` (4px) — code feels more technical with tighter corners

Don't introduce `--radius-sm`, `--radius-lg`, etc. unless a real pattern emerges.

## Motion tokens

See [04 — Motion](04-motion.md) for the full motion system. The token layer:

```css
--animate-fade-up: fade-up 0.3s ease-out;
```

Named keyframes defined in `index.css`: `fade-up`, `shimmer`, `slide-in-from-left`, `slide-in-from-right`, `slide-in-from-right-panel`, `page-enter-*`, `page-exit-*`, `cmd-spring-in`, `cmd-fade-out`, `modal-enter`, `modal-backdrop-enter`, `check-pop`.

## Breakpoints

Tailwind defaults, unmodified:

| Prefix | Min width | Target |
|---|---|---|
| (none) | 0 | Mobile |
| `sm:` | 640px | Large phone / small tablet |
| `md:` | 768px | Tablet |
| `lg:` | 1024px | Laptop |
| `xl:` | 1280px | Desktop |
| `2xl:` | 1536px | Wide desktop |

Pearl's dense layouts mean most real work happens at `lg:` and up. Mobile is supported but not the primary surface.

## Z-index scale

Hand-managed (not tokenized yet). Current layers, low to high:

| Layer | z-index | Use |
|---|---|---|
| Base | `z-0` | Default stacking |
| Sticky headers | `z-10` | Table headers, sidebar sticky sections |
| Dropdowns / popovers | `z-20` | Menus, tooltips |
| Modals | `z-40` | Dialogs |
| Command palette | `z-50` | Sits above modals |
| Toasts | `z-50` | Toast stack |

If a new layer is needed, extend this table and the CSS together.
