# 02 — Tokens

The atomic layer. Every visual property in Pearl resolves to a token. This is the constrained decision space: pick from these scales; don't invent one-offs.

**Source of truth:** `packages/frontend/src/index.css` (the `@theme` block) and per-theme palettes in `packages/frontend/src/themes/definitions/*.ts`.

## Color

Pearl has a **semantic** color system, not a palette of raw hues. Components reference tokens by role, and themes remap those roles. This is why the same `<Button variant="default">` looks right in Solarized, Monokai, and High-Contrast Dark.

### Surface tokens

| Token | Role | Light default | Dark default |
|---|---|---|---|
| `background` | App canvas | `oklch(1 0 0)` | `oklch(0.179 0.004 285.9)` |
| `foreground` | Default text | `oklch(0.145 0 0)` | `oklch(0.944 0.004 285.9)` |
| `card` | Card / panel background | `oklch(1 0 0)` | `oklch(0.179 0.004 285.9)` |
| `card-foreground` | Text on card surface | `oklch(0.145 0 0)` | `oklch(0.944 0.004 285.9)` |
| `popover` | Popover / dropdown background | `oklch(1 0 0)` | `oklch(0.179 0.004 285.9)` |
| `popover-foreground` | Text in popovers | `oklch(0.145 0 0)` | `oklch(0.944 0.004 285.9)` |
| `surface` | Panel / card base | `oklch(1 0 0)` | `oklch(0.179 0.004 285.9)` |
| `surface-raised` | Elevated surface (modals, dropdowns) | `oklch(0.985 0 0)` | `oklch(0.22 0.008 285.7)` |
| `muted` | Subdued fills (skeletons, disabled) | `oklch(0.97 0 0)` | `oklch(0.228 0.006 285.9)` |
| `muted-foreground` | Secondary / meta text | `oklch(0.556 0 0)` | `oklch(0.682 0.012 286)` |
| `border` | Dividers, input borders | `oklch(0.922 0 0)` | `oklch(0.287 0.007 285.9)` |
| `input` | Input field border (distinct from general border) | `oklch(0.922 0 0)` | `oklch(0.287 0.007 285.9)` |

### Interactive tokens

| Token | Role | Light default | Dark default |
|---|---|---|---|
| `primary` | Brand / primary action fill | `oklch(0.511 0.23 277)` | `oklch(0.68 0.158 276.9)` |
| `primary-foreground` | Text on primary | `oklch(1 0 0)` | `oklch(0.179 0.069 283.3)` |
| `secondary` | Secondary action / subtle fill | `oklch(0.97 0 0)` | `oklch(0.228 0.006 285.9)` |
| `secondary-foreground` | Text on secondary | `oklch(0.205 0 0)` | `oklch(0.944 0.004 285.9)` |
| `accent` | Hover / selection tint | `oklch(0.962 0.018 272.3)` | `oklch(0.257 0.086 281.3)` |
| `accent-foreground` | Text on accent | `oklch(0.398 0.177 277.4)` | `oklch(0.87 0.062 274)` |
| `ring` | Focus ring | `oklch(0.585 0.204 277.1)` | `oklch(0.68 0.158 276.9)` |
| `destructive` | Destructive action fill | `oklch(0.637 0.208 25.3)` | `oklch(0.711 0.166 22.2)` |
| `destructive-foreground` | Text on destructive | `oklch(1 0 0)` | `oklch(1 0 0)` |

### Semantic status tokens

For states with shared meaning across the app (issue status, toasts, banners):

| Token | Meaning | Used in |
|---|---|---|
| `info` / `info-foreground` | Neutral notification | `StatusBadge` (open), info toasts |
| `success` / `success-foreground` | Positive outcome | `StatusBadge` (closed), success toasts |
| `warning` / `warning-foreground` | Attention needed | `StatusBadge` (in_progress), warning banners |
| `danger` / `danger-foreground` | Error or blocking | `StatusBadge` (blocked), error toasts |

**Pattern for tinted badges:** fill with `bg-<token>/15` (15% alpha), text in `<token>-foreground`. See `status-badge.tsx`. This gives the color semantic recognition without overwhelming saturation.

### Chart tokens

For data visualization (charts, graphs). Five sequential colors that maintain contrast in both themes:

| Token | Role |
|---|---|
| `chart-1` | Primary data series |
| `chart-2` | Secondary data series |
| `chart-3` | Tertiary data series |
| `chart-4` | Fourth data series |
| `chart-5` | Fifth data series |

These remap per-theme. Use them via `bg-chart-1`, `text-chart-2`, etc. Never hard-code chart colors.

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

Five-level elevation scale defined as `--shadow-N` tokens in the `@theme` block. Use `shadow-[var(--shadow-N)]` or the elevation utility classes — never arbitrary `box-shadow:` values.

| Level | Token | CSS value | Use |
|---|---|---|---|
| 0 | `--shadow-0` | `none` | Flush with surface (no shadow) |
| 1 | `--shadow-1` | `0 1px 2px rgba(0,0,0,0.05)` | Resting cards, list items on hover |
| 2 | `--shadow-2` | `0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)` | Dropdowns, popovers, default button hover |
| 3 | `--shadow-3` | `0 4px 16px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.05)` | Modal panels, command palette |
| 4 | `--shadow-4` | `0 8px 32px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.06)` | Full-screen dialogs, highest-layer toasts |

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
| Sticky / inset | `z-10` | Table headers, sidebar sticky sections, resize handles |
| Inline dropdowns | `z-20` | Column menus, inline popovers (non-modal context) |
| Overlays | `z-50` | Modals, dialogs, command palette, tooltips, sheets, toasts |
| Above-overlay | `z-[60]` | Selects, pickers, dropdown menus that render inside modals |
| Skip link | `z-[100]` | Accessibility skip-to-content link |

If a new layer is needed, extend this table and the CSS together.
