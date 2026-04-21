# 01 — Foundation

The non-visual layer: who the product is, how it talks, what its typography feels like.

## Product identity

Pearl is a tracker for people who live in a terminal. The web UI is the second surface; the first is `bd` on the command line. That sets the tone:

- **Dense over spacious.** Assume the user is scanning, not browsing. Default to tight vertical rhythm and show more per screen than a consumer app would.
- **Keyboard-first.** Every primary action has a shortcut. Mouse interactions are welcomed but never required.
- **Quiet surfaces.** The UI should recede so issue content can lead. Avoid decorative flourishes; reserve visual emphasis for status and state.
- **Local-first honesty.** When something is syncing, offline, or in a degraded state, the UI says so plainly. No hidden magic.

## Voice

| Dimension | Pearl does | Pearl doesn't |
|---|---|---|
| Tone | Direct, terse, developer-to-developer | Chirpy, marketing-flavored, exclamation-heavy |
| Error copy | Names the failure and the fix | Apologizes or euphemizes ("Oops!") |
| Empty states | One line on what the view is for, one CTA | Multi-paragraph onboarding in place |
| Labels | Lowercase where natural (`in progress`, `open`) | Title Case Everywhere |
| Numbers | Exact (`17 open`), relative time (`3h ago`) | Vague (`a few`, `recently`) |

Examples in the codebase: `packages/frontend/src/components/ui/empty-state.tsx`, `status-badge.tsx`.

## Typography

### Font stack

Defined in `index.css`:

```css
--font-sans: "Inter Variable", "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif;
--font-mono: "JetBrains Mono", ui-monospace, "Cascadia Code", "Fira Code", monospace;
```

- **Sans (Inter Variable)** — all UI chrome, body copy, headings. Inter is chosen for its excellent small-size legibility and variable-axis support (weights without file bloat).
- **Mono (JetBrains Mono)** — identifiers (`beads-gui-o4vj`), code blocks, `<kbd>` shortcuts, anything copy-pasteable.

Fallbacks are system fonts so FOIT/FOUT is never blank — worst case, users see system sans before Inter arrives.

### Scale

Pearl uses Tailwind's default type scale (rem-based). The common rungs in this codebase:

| Token | Size | Where |
|---|---|---|
| `text-xs` | 12px | Badges, metadata (`3h ago`), table headers |
| `text-sm` | 14px | Body default — tables, forms, descriptions |
| `text-base` | 16px | Detail views, long-form content |
| `text-lg` | 18px | Card titles, section leads |
| `text-xl` | 20px | Page titles in dense views |
| `text-2xl` | 24px | Page titles in spacious views |
| `text-3xl` | 30px | Marketing / landing surfaces only |

**Rule:** the same information hierarchy uses the same size across views. An "issue title" is `text-lg font-medium` whether it appears in a list, a modal, or a detail page.

### Weight and color (the other two channels)

Hierarchy comes from three channels working together:

- **Size** — coarse hierarchy (page vs. section vs. item)
- **Weight** — `font-medium` (500) for emphasis within a size, `font-semibold` (600) for page titles, `font-normal` (400) for body
- **Color** — `text-foreground` for primary, `text-muted-foreground` for secondary/meta

**Prefer de-emphasis.** If a row contains a title and a timestamp, make the timestamp `text-muted-foreground text-xs` rather than bolding the title. Reducing secondary salience is visually cleaner than amplifying primary salience.

### Line length and rhythm

- Body copy: max `max-w-prose` (~65ch). Don't let paragraphs run edge-to-edge on wide screens.
- Line height: trust Tailwind defaults (`leading-normal` = 1.5, `leading-tight` for headings). Don't set custom `leading-*` without a reason.
- Tabular numerics in tables: use `tabular-nums` so columns of counts align.

## Rendered markdown (issue descriptions, notes)

The `.prose` class (Tailwind Typography) renders user content. Custom tweaks live in `index.css`:

- Links use `--color-primary` with hover underline (no default blue)
- Task-list checkboxes are custom-styled (not the browser default)
- Code blocks use `--font-mono` and theme-aware `highlight.js` tokens

Don't apply `.prose` to UI chrome — it's for rendered markdown only.
