# shadcn/ui + BaseUI Adoption — Research Survey

*2026-04-25 · Pearl frontend · Architect phase input*

This survey synthesizes three parallel research strands into the decision-ready inputs for decomposing the migration. The current codebase has 8 hand-rolled UI primitives consumed by ~20 files; the target is shadcn/ui with the BaseUI primitive variant introduced in the [2026-01 release](https://ui.shadcn.com/docs/changelog/2026-01-base-ui).

## Subdocuments

| Doc | Scope | Lines |
|---|---|---|
| [`web-findings.md`](./web-findings.md) | shadcn-with-BaseUI public docs: init flow, `components.json`, full BaseUI component inventory, per-primitive migration recipes, BaseUI vs Radix deltas, React 19 + Vite specifics, native `<dialog>` tradeoff, theme layering. Citations inline. | 1186 |
| [`codebase-inventory.md`](./codebase-inventory.md) | Source maps for every replaceable primitive (props, state, behaviors, token usage), domain-component leave-alone list, composite-surface assessment with migration difficulty, **precise consumer counts**, current Tailwind v4 + theme wiring, test-rewrite scope, dependency-overlap audit. | 854 |
| [`integration-glue.md`](./integration-glue.md) | Tailwind v4 canonical setup with full OKLCH token list, multi-theme switching pattern, React 19 ref-as-prop story, Vite 6 plugin order, **Biome `components/ui/**` rule overrides**, Vitest portal-test pattern, cmdk/react-day-picker reuse confirmation, dark-mode handoff. | 557 |

---

## Executive synthesis

### 1. Scope is bounded and well-understood

8 custom primitives, 20 consumer files, 3 class/structure-bound tests, **0 E2E tests**. The migration is mechanically tractable; complexity is concentrated in `detail/create-issue-dialog.tsx` (consumes 4 primitives in one component).

| Primitive | Consumers | Replacement |
|---|---|---|
| `button.tsx` | **15** | shadcn `Button` |
| `custom-select.tsx` | 7 | shadcn `Select` (BaseUI) |
| `label-picker.tsx` | 4 | shadcn `Combobox` w/ `multiple` + `ComboboxChips` |
| `confirm-dialog.tsx` | 4 | shadcn `AlertDialog` |
| `date-picker.tsx` | 3 | `Popover` + `Calendar` composition |
| `dropdown-menu.tsx` | 2 | shadcn `DropdownMenu` |
| `dialog.tsx` | 2 | shadcn `Dialog` |
| `assignee-picker.tsx` | 1 | shadcn `Combobox` (single-select) |

### 2. Stack alignment is excellent

- **Token names already match**: `bg-background`, `border-border`, `text-foreground`, `bg-accent`, `text-destructive`, `bg-muted`, `text-muted-foreground`, `bg-popover`, `text-card-foreground`, `ring-ring` are all identical to shadcn defaults. **Zero rename work.**
- **Already-installed reusable libs**: `cmdk` (shadcn `Command` wraps it), `react-day-picker` (shadcn `Calendar` wraps it), `clsx`, `tailwind-merge`. None redundant.
- **No E2E suite** to keep green during migration.

### 3. Six high-severity footguns

These are the things that silently break or mislead during a big-bang swap. Every epic must respect them:

1. **Package name**: install `@base-ui/react` (v1.4.1+), **not** `@base-ui-components/react` (stranded at RC).
2. **`@theme inline` runtime override gotcha**: shadcn declares `--color-background: var(--background)` as an alias inlined at build time. Runtime overrides must write the raw `--background`, not `--color-background`. Our current `hooks/use-theme.ts` writes `setProperty("--color-${token}", value)` — this **silently fails** for shadcn components and must be reconciled.
3. **`data-[state=open]:` Tailwind classes silently break**: BaseUI uses `data-open` / `data-closed` / `data-starting-style` / `data-ending-style`, never Radix's `data-state`. Global grep is mandatory.
4. **`asChild` is gone**: replaced everywhere by `render={<Element />}` prop. Bug #9049 confirms BaseUI-generated `SidebarMenuButton` and `DropdownMenuTrigger` omit `asChild` even where docs still show it.
5. **`tailwindcss-animate` is dead in v4**: replace with `@import "tw-animate-css"` (CSS import, not `@plugin`). Without this, all open/close animations are missing.
6. **`@testing-library/react` ≥ 16.1.0 required for React 19**: lower versions silently render incorrectly while tests pass — a correctness trap.

Plus three medium risks: Biome a11y rules will flag BaseUI wrappers (need `components/ui/**` override), the existing `@custom-variant dark` uses `&:where(.dark, .dark *)` (shadcn 2026 form is `&:is(.dark *)` — worth aligning), and the `themes/definitions/*.ts` files emit `--color-*` tokens that must be migrated to also emit raw `--*` tokens for shadcn components to pick them up.

### 4. Init configuration

```bash
pnpm add @base-ui/react class-variance-authority lucide-react tw-animate-css
pnpm dlx shadcn@latest init --base
```

`components.json`:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "base-vega",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/index.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

The `style` field encodes both primitive library and visual style: `base-vega` = BaseUI primitives + New York visual look.

### 5. Reversibility & change volatility

| Decision | Reversibility | Volatility | Effort proportionality |
|---|---|---|---|
| Choose BaseUI over Radix | **Moderate** — single `style` field swap, but `render`/`asChild` and CSS selectors differ | Stack-stable | Spend most effort here on getting the tokens + theme bridge right |
| Replace native `<dialog>` with portal Dialog | Moderate — loses browser top-layer, gains controlled state | High (Dialog used widely) | Verify nested-overlay scenarios early |
| Theme system bridge (`use-theme.ts`) | **Reversible** — code change | High | Don't over-engineer; one-shot reconciliation |
| Keep `cmdk` / `react-day-picker` | Trivial — shadcn wraps them | Low | Zero work |
| Big-bang vs incremental | Reversible per file via git | N/A — user-chosen | Single PR; one cycle of review |

### 6. Recommended decomposition (preview)

Six domain epics + 1 Integration Verification epic. Natural DDD bounded contexts mapped to the install-order sequence from `web-findings.md` §11:

1. **Foundation** — install, `components.json`, Tailwind v4 tokens, theme bridge, Biome overrides, `isolation: isolate`, animation plugin.
2. **Atomic primitives** — `Button` (+ `Badge`, `Label`, `Separator`, `Skeleton`, `Card`, `Avatar`, `Input`, `Textarea`); migrate 15 button consumers.
3. **Overlay primitives** — `Dialog`, `AlertDialog`, `DropdownMenu`, `Popover`, `Tooltip`, `Sheet`, `HoverCard`; migrate dialog/confirm-dialog/dropdown consumers and dialog-shaped composites (lightbox, onboarding, keyboard-help, create-issue-dialog wrapper, embedded-mode-modal, notification-bell).
4. **Form primitives** — `Select`, `Combobox` (single + multi via Chips), `Calendar`, `Checkbox`, `Switch`, `RadioGroup`; migrate custom-select / assignee-picker / label-picker / date-picker consumers.
5. **Composite surfaces** — `Command` (replace cmdk-direct in command-palette + search-palette), `Sonner` (replace toast-container), `Sidebar` or `Sheet` (replace sidebar drawer), `Tabs`, `Accordion`, `NavigationMenu`.
6. **Sweep & cleanup** — global `data-[state=` migration to `data-open:` / `data-closed:`, global `asChild` audit, delete the 8 custom primitive files + their structure-bound tests, verify all 15 themes still layer correctly.

7. **Integration Verification** — runs after 1–6: full theme matrix sweep (15 themes × dark/light × all primitive types), portal-stacking checks, golden-path integration test re-run, manual visual regression pass.

Cross-epic interface contracts are mostly **data-only** (token CSS variables) plus a few **behavioral** contracts (theme-bridge writes both `--token` and `--color-token`; primitives consume tokens). IV scope: **MEDIUM**.

### 7. Open questions for the Spec phase

- Do we keep our custom semantic tokens (`--color-info`, `--color-success`, `--color-warning`, `--color-danger`, `--color-surface`, `--color-surface-raised`) alongside shadcn defaults, or fold them into shadcn's chart/sidebar slots? **Recommend: keep as-is.**
- Do we adopt `lucide-react` as the icon library (shadcn default) or keep our hand-rolled `icons.tsx`? **Recommend: hybrid** — adopt lucide for shadcn-internal use, keep `icons.tsx` for domain-bespoke marks until forced otherwise.
- Sidebar replacement: shadcn `Sidebar` (the Tailwind v4-aware composite) vs `Sheet` for the mobile drawer only? `Sidebar` brings more behavior but bigger surface change.
- Sonner vs custom toast: Sonner overhauls the toast queue model; the existing `useToasts` hook needs adapter shim or full callsite rewrite.

These will be settled at the meta-epic level so each domain epic has a stable contract.

## Sources

All citations live in the subdocuments. Highest-value primary sources:

- [shadcn 2026-01 BaseUI changelog](https://ui.shadcn.com/docs/changelog/2026-01-base-ui)
- [shadcn 2026-03 CLI v4 changelog](https://ui.shadcn.com/docs/changelog/2026-03-cli-v4)
- [shadcn theming docs](https://ui.shadcn.com/docs/theming)
- [Base UI 1.x docs](https://base-ui.com/react/overview/quick-start)
- [Base UI animation handbook](https://base-ui.com/react/handbook/animation)
- [shadcn-ui/ui discussion #9562 — migration guide](https://github.com/shadcn-ui/ui/discussions/9562)
- [shadcn-ui/ui issue #9049 — asChild gap in BaseUI](https://github.com/shadcn-ui/ui/issues/9049)
- [tw-animate-css](https://github.com/Wombosvideo/tw-animate-css)
- [basecn.dev migration guide](https://basecn.dev/docs/get-started/migrating-from-radix-ui)
