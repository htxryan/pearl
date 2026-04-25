# Integration Glue: Tailwind v4 + shadcn/ui (BaseUI variant) + React 19

Research date: 2026-04-25  
Stack: React 19.0, Vite 6, `@tailwindcss/vite` (CSS-first, no `tailwind.config.js`), TypeScript 5.7, no SSR/RSC  
Parallel research covers shadcn web docs inventory and codebase primitives; this document covers integration glue.

---

## 1. Tailwind v4 + shadcn — the Canonical Setup

### 1.1 Minimal `index.css`

The canonical structure documented by shadcn as of the February 2025 Tailwind v4 release and confirmed through the manual installation guide is:

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background:         var(--background);
  --color-foreground:         var(--foreground);
  --color-card:               var(--card);
  --color-card-foreground:    var(--card-foreground);
  --color-popover:            var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary:            var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary:          var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted:              var(--muted);
  --color-muted-foreground:   var(--muted-foreground);
  --color-accent:             var(--accent);
  --color-accent-foreground:  var(--accent-foreground);
  --color-destructive:        var(--destructive);
  --color-border:             var(--border);
  --color-input:              var(--input);
  --color-ring:               var(--ring);
  --color-chart-1:            var(--chart-1);
  --color-chart-2:            var(--chart-2);
  --color-chart-3:            var(--chart-3);
  --color-chart-4:            var(--chart-4);
  --color-chart-5:            var(--chart-5);
  --radius-sm:   calc(var(--radius) - 4px);
  --radius-md:   calc(var(--radius) - 2px);
  --radius-lg:   var(--radius);
  --radius-xl:   calc(var(--radius) + 4px);
  --radius-2xl:  calc(var(--radius) + 8px);
  --radius-3xl:  calc(var(--radius) + 12px);
  --radius-4xl:  calc(var(--radius) + 16px);
}

:root {
  --background:             oklch(1 0 0);
  --foreground:             oklch(0.145 0 0);
  --card:                   oklch(1 0 0);
  --card-foreground:        oklch(0.145 0 0);
  --popover:                oklch(1 0 0);
  --popover-foreground:     oklch(0.145 0 0);
  --primary:                oklch(0.205 0 0);
  --primary-foreground:     oklch(0.985 0 0);
  --secondary:              oklch(0.97 0 0);
  --secondary-foreground:   oklch(0.205 0 0);
  --muted:                  oklch(0.97 0 0);
  --muted-foreground:       oklch(0.556 0 0);
  --accent:                 oklch(0.97 0 0);
  --accent-foreground:      oklch(0.205 0 0);
  --destructive:            oklch(0.577 0.245 27.325);
  --border:                 oklch(0.922 0 0);
  --input:                  oklch(0.922 0 0);
  --ring:                   oklch(0.708 0 0);
  --chart-1:                oklch(0.646 0.222 41.116);
  --chart-2:                oklch(0.6   0.118 184.704);
  --chart-3:                oklch(0.398 0.07  227.392);
  --chart-4:                oklch(0.828 0.189 84.429);
  --chart-5:                oklch(0.769 0.188 70.08);
  --radius:                 0.625rem;
  /* sidebar tokens */
  --sidebar:                oklch(0.985 0 0);
  --sidebar-foreground:     oklch(0.145 0 0);
  --sidebar-primary:        oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent:         oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border:         oklch(0.922 0 0);
  --sidebar-ring:           oklch(0.708 0 0);
}

.dark {
  --background:             oklch(0.145 0 0);
  --foreground:             oklch(0.985 0 0);
  --card:                   oklch(0.205 0 0);
  --card-foreground:        oklch(0.985 0 0);
  --popover:                oklch(0.205 0 0);
  --popover-foreground:     oklch(0.985 0 0);
  --primary:                oklch(0.922 0 0);
  --primary-foreground:     oklch(0.205 0 0);
  --secondary:              oklch(0.269 0 0);
  --secondary-foreground:   oklch(0.985 0 0);
  --muted:                  oklch(0.269 0 0);
  --muted-foreground:       oklch(0.708 0 0);
  --accent:                 oklch(0.269 0 0);
  --accent-foreground:      oklch(0.985 0 0);
  --destructive:            oklch(0.704 0.191 22.216);
  --border:                 oklch(1 0 0 / 10%);
  --input:                  oklch(1 0 0 / 15%);
  --ring:                   oklch(0.556 0 0);
  --chart-1:                oklch(0.488 0.243 264.376);
  --chart-2:                oklch(0.696 0.17  162.48);
  --chart-3:                oklch(0.769 0.188 70.08);
  --chart-4:                oklch(0.627 0.265 303.9);
  --chart-5:                oklch(0.645 0.246 16.439);
  --sidebar:                oklch(0.205 0 0);
  --sidebar-foreground:     oklch(0.985 0 0);
  --sidebar-primary:        oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent:         oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border:         oklch(1 0 0 / 10%);
  --sidebar-ring:           oklch(0.556 0 0);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

**Sources:** [shadcn manual install](https://ui.shadcn.com/docs/installation/manual), [shadcn tailwind-v4 docs](https://ui.shadcn.com/docs/tailwind-v4), [shadcn/ui Tailwind v4 discussion #6714](https://github.com/shadcn-ui/ui/discussions/6714)

### 1.2 Color Format

As of the February 2025 update, shadcn/ui moved the default palette from HSL to **OKLCH**. The token table above reflects the shipped defaults. OKLCH provides perceptually uniform lightness, which improves color interpolation and accessibility contrast calculations. The migration notes state: "Updated dark mode colors to OKLCH format for improved accessibility."

The project's existing `index.css` uses hex values directly in `@theme` — these are not OKLCH. The shadcn defaults use a two-layer indirection: raw `--token` names in `:root`/`.dark`, then `--color-token: var(--token)` in `@theme inline`. The project's current approach sets `--color-*` directly in `@theme`, which works but loses the shadcn indirection pattern needed for seamless shadcn component consumption.

### 1.3 Animation Plugin: `tw-animate-css`

`tailwindcss-animate` is incompatible with Tailwind v4 because it relies on the v3 plugin JavaScript API. The replacement is `tw-animate-css`, which uses the v4 CSS-first architecture.

**Install:**
```bash
pnpm add -D tw-animate-css
```

**Import line** (goes in `index.css` immediately after `@import "tailwindcss"`):
```css
@import "tw-animate-css";
```

The `@plugin` directive is **not** used; it is a plain CSS `@import`. Shadcn deprecated `tailwindcss-animate` on March 19, 2025. New projects initialized with `pnpm dlx shadcn@latest init` get `tw-animate-css` by default.

Note: The maintainer documents that `tw-animate-css` "might not be a 100% compatible drop-in replacement" — animations that relied on Radix UI CSS custom properties (`--radix-accordion-content-height`) are carried forward, but any highly custom animation keyframe that was only in `tailwindcss-animate` should be verified.

**Sources:** [tw-animate-css npm](https://www.npmjs.com/package/tw-animate-css), [tw-animate-css GitHub](https://github.com/Wombosvideo/tw-animate-css), [shadcn tailwind-v4 docs](https://ui.shadcn.com/docs/tailwind-v4)

---

## 2. Multi-Theme Switching on Top of shadcn Defaults

### 2.1 `@theme inline` vs `@theme` — the Critical Distinction

This is the single most important v4 architectural choice for runtime theming.

**`@theme inline`** maps Tailwind utility aliases to CSS variable references but does **not** create global CSS custom properties. The variable references are inlined into generated utility classes at build time. Consequence: if you later override `--background` in a `.dark` or `[data-theme]` block, the utility class `bg-background` will **not** pick up the new value because the variable doesn't exist globally — the build baked in the reference, but there is nothing to override at runtime.

**`@theme` (without `inline`)** creates global `--color-*` variables that can be overridden at runtime. Tailwind reads those variables, and since the variable exists in the cascade, overriding it in a `.dark` or `[data-theme]` selector causes all consuming utilities to update.

**Shadcn's approach** deliberately uses `@theme inline` plus a two-layer variable system: `--color-background: var(--background)`. At runtime, `--color-background` is inlined (a reference to `var(--background)`), so what you override is `--background` in `:root` / `.dark`. Because `--color-background` resolves through the var() chain, changing `--background` does propagate — but only if you override the raw (non-`--color-*`) token names.

Implication for multi-theme: all theme overrides must target the **raw token names** (`--background`, `--foreground`, etc.), not the `--color-*` aliases.

**Sources:** [Tailwind discussion #18560](https://github.com/tailwindlabs/tailwindcss/discussions/18560), [Tailwind discussion #15083](https://github.com/tailwindlabs/tailwindcss/discussions/15083)

### 2.2 Candidate Patterns

**Pattern A: `data-theme` attribute per theme**

```css
[data-theme="rose"] {
  --background: oklch(0.99 0.01 15);
  --primary:    oklch(0.55 0.22 15);
  /* ... other token overrides ... */
}

.dark[data-theme="rose"],
[data-theme="rose"].dark {
  --background: oklch(0.14 0.02 15);
  --primary:    oklch(0.72 0.19 15);
}
```

Applied via JavaScript:
```ts
document.documentElement.setAttribute("data-theme", "rose");
document.documentElement.classList.toggle("dark", isDark);
```

The `@custom-variant dark (&:is(.dark *))` declaration means the `.dark` class on `<html>` cascades into all children — so `.dark[data-theme="rose"]` on `<html>` works as expected. The important point: you need **both** selectors for the compound case (`dark + theme`), since specificity matters and you want dark+theme to win over theme-only.

**Pattern B: Class per theme (e.g., `.theme-rose`)**

```css
.theme-rose {
  --background: oklch(0.99 0.01 15);
  --primary:    oklch(0.55 0.22 15);
}

.dark.theme-rose {
  --background: oklch(0.14 0.02 15);
  --primary:    oklch(0.72 0.19 15);
}
```

Applied via:
```ts
document.documentElement.classList.remove("theme-zinc", "theme-rose", "theme-blue");
document.documentElement.classList.add("theme-rose");
document.documentElement.classList.toggle("dark", isDark);
```

**Pattern C: Fully independent parallel theme classes (no separate dark class)**

Each palette variant is its own self-contained class, treating dark as just another theme option:

```css
.theme-rose-light { --background: ...; }
.theme-rose-dark  { --background: ...; }
```

This is conceptually clean but loses the ability to use Tailwind's `dark:` utility prefix, because `dark:` requires the `.dark` class to be present (per `@custom-variant dark (&:is(.dark *))`). If the project uses `dark:bg-muted` in utility classes, Pattern C breaks those.

### 2.3 Recommendation for This Project

The existing codebase uses Pattern C conceptually (themes carry their own `colorScheme` and the `.dark` class is toggled on/off based on `colorScheme`), applied via inline `style.setProperty` calls on `document.documentElement`. This mechanism will still work with shadcn components, **as long as the token names align**.

The tension: shadcn components consume `--background` (raw token), but the project currently applies `--color-background` (the `--color-*` alias). For shadcn migration, the recommended adaptation is **Pattern A or B** applied to the raw token names, keeping the existing `use-theme.ts` pattern of toggling `.dark` for dark schemes. Concretely:

1. Each `ThemeDefinition.colors` entry maps to a raw token name (drop the `--color-` prefix in the `setProperty` call, or maintain a translation map).
2. The theme files emit overrides to `--background`, `--primary`, etc. (the shadcn raw token names), not `--color-background`.
3. `.dark` class toggle remains as-is on `<html>`.
4. For compound dark+theme specificity, add compound selectors in the CSS: `.dark[data-theme="monokai"]` or `.dark.theme-monokai`.

**Sources:** [shadcn theming docs](https://ui.shadcn.com/docs/theming), [shadcnblocks tailwind4 theming](https://www.shadcnblocks.com/blog/tailwind4-shadcn-themeing/), [multi-theme v4 React](https://medium.com/render-beyond/build-a-flawless-multi-theme-ui-using-new-tailwind-css-v4-react-dca2b3c95510)

---

## 3. React 19 Specifics

### 3.1 `forwardRef` vs Ref-as-Prop

As of the Tailwind v4/React 19 update (February 2025), shadcn/ui components no longer use `React.forwardRef`. The migration guide and discussion thread confirm: every component now accepts `ref` as a plain prop (React 19's native behavior), typed via `React.ComponentProps<...>` rather than `React.forwardRef<..., ...>`. A `data-slot` attribute is added to each primitive for targeted CSS customization.

**Before (React 18 / shadcn pre-2025):**
```tsx
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, ...props }, ref) => (
    <button ref={ref} className={cn(..., className)} {...props} />
  )
);
Button.displayName = "Button";
```

**After (React 19 / shadcn 2025+):**
```tsx
function Button({ className, ref, ...props }: React.ComponentProps<"button">) {
  return (
    <button
      data-slot="button"
      ref={ref}
      className={cn(..., className)}
      {...props}
    />
  );
}
```

**Regression caveat:** This change breaks consumers still on React 18 who use `ref`. The shadcn GitHub issue #7926 tracks "React 19 ref forwarding breaks Radix UI integration in non-React 18 environments." Since this project targets React 19 exclusively, this is not a concern here.

A `remove-forward-ref` codemod is available if migrating existing custom components.

**Sources:** [shadcn React 19 docs](https://ui.shadcn.com/docs/react-19), [shadcn discussion #3695](https://github.com/shadcn-ui/ui/discussions/3695), [shadcn issue #6739](https://github.com/shadcn-ui/ui/issues/6739), [shadcn PR #4356](https://github.com/shadcn-ui/ui/pull/4356)

### 3.2 `@base-ui-components/react` Peer Deps

The package `@base-ui-components/react` (version 1.0.0-beta series) declares React 19 as a peer dependency. It was designed from the ground up targeting React 19's concurrent features (no React 18 support path). This means:

- **pnpm users:** pnpm will display peer dependency warnings but silently allow the install. No `--legacy-peer-deps` is needed with pnpm.
- **npm users:** Would require `--legacy-peer-deps` if installing from npm (irrelevant for this project using pnpm).
- No overrides needed in `package.json` for `@base-ui-components/react` itself.

The package known to still need an override is `recharts` (for the chart tokens in shadcn): add `"overrides": { "react-is": "^19.0.0-rc-69d4b800-20241021" }` to `package.json` if recharts is added.

**Sources:** [shadcn React 19 peer deps](https://ui.shadcn.com/docs/react-19), [npm @base-ui/react](https://www.npmjs.com/package/@base-ui/react)

### 3.3 React 19 Strict Mode + Portal-Based Components

React 19 Strict Mode double-invokes effects and state initializers in development to detect side effects. Portal-based components (Dialog, DropdownMenu, Popover, Tooltip) from BaseUI are known to function correctly under Strict Mode in production; the double-mount cycle is a dev-only behavior. No BaseUI-specific Strict Mode bugs were found in public issue trackers as of April 2026. **[unverified: this is based on absence of filed issues, not a positive confirmation from BaseUI maintainers.]**

The key behavioral note: component mount/unmount during Strict Mode double-render means portal subscriptions (focus traps, scroll locks, outside-click listeners) will initialize twice and clean up once in dev. If any BaseUI primitive uses a non-idempotent effect (e.g., DOM mutation that doesn't clean up), it would surface here. In practice, this mirrors Radix UI behavior, which has been stable with Strict Mode for years.

---

## 4. Vite 6 Specifics

### 4.1 Plugin Order in `vite.config.ts`

The canonical order documented by shadcn for Vite + Tailwind v4 is:

```ts
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // ...
});
```

`react()` before `tailwindcss()`. This matches the project's current `vite.config.ts`. The Tailwind Vite plugin does not transform JSX, so ordering relative to the React plugin is not strictly load-order-dependent — both the shadcn docs and the `@tailwindcss/vite` README list React first as a convention. **[unverified: no documented case where reversed order causes a failure, but the canonical form is React-first.]**

### 4.2 Path Alias `@/*`

Shadcn expects the `@` alias to map to `./src`. Both configuration files must be updated:

**`tsconfig.json` (or `tsconfig.app.json` in scaffolded Vite projects):**
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**`vite.config.ts`:**
```ts
import path from "path";
// ...
resolve: {
  alias: {
    "@": path.resolve(__dirname, "./src"),
  },
},
```

The project already has both correctly configured. Note: `@types/node` must be installed for `path` to be importable in `vite.config.ts` without TypeScript errors: `pnpm add -D @types/node`.

### 4.3 HMR Behavior with Registry-Installed Components

Registry-installed components live in `src/components/ui/` as source files, not node_modules. Vite's HMR handles them as first-class project files — no cache pitfalls specific to shadcn components have been reported. The standard Vite HMR boundary behavior applies: editing a `ui/button.tsx` file will hot-reload any module importing it.

One known edge case: if `@tailwindcss/vite` processes a CSS file that imports `tw-animate-css`, and you modify a shadcn component's class list, the Tailwind scanner may not immediately pick up new utilities in development (the scanner relies on file watchers). This can cause a brief flash of unstyled content. A full page reload resolves it. This is a generic Tailwind v4 HMR characteristic, not shadcn-specific.

**Sources:** [shadcn Vite install docs](https://ui.shadcn.com/docs/installation/vite)

---

## 5. Biome Compatibility

### 5.1 Rules That Conflict with shadcn-Generated Code

shadcn-generated component files can trigger several Biome lint rules. The project's current `biome.json` already has a reasonably conservative configuration (mostly `warn`, not `error`), which reduces blocking failures, but the following are worth watching:

**`correctness/noUnusedImports`** (currently `warn`): shadcn components frequently import types that appear unused to Biome's static analysis (e.g., `type VariantProps` from `class-variance-authority`). Biome will warn; auto-fix may incorrectly remove needed type imports if `useImportType` is also enabled.

**`style/useImportType`** (not explicitly configured, so falls under `recommended`): This rule rewrites `import { Foo } from "bar"` to `import type { Foo } from "bar"` when `Foo` is only used as a type. A known Biome issue (#2004, #2473) causes this rule to incorrectly rewrite React-namespace imports and can split a mixed-use import in ways that break JSX. As of Biome 2.x the issue is partially resolved, but it can still mangle imports in shadcn files that mix value and type imports from the same package.

**`a11y/useFocusableInteractive`** and **`a11y/noStaticElementInteractions`** (currently `warn`): shadcn issue #7639 documents a Biome a11y bug that prevents merge when these rules flag BaseUI/Radix primitive wrappers. BaseUI components use `div` wrappers with keyboard handlers (e.g., DropdownMenu trigger), which Biome flags. These are false positives because the accessibility is provided by the ARIA role and the BaseUI primitive's keyboard management.

**`suspicious/noConsoleLog`**: Deprecated as of Biome 1.8+. Use `suspicious/noConsole` instead. The project's `biome.json` does not list either; the shadcn-generated code itself does not emit console calls, so this is a non-issue for generated files.

**`complexity/useOptionalChain`** (currently `warn`): shadcn-generated code sometimes uses `x && x.y` patterns that Biome will suggest converting to `x?.y`. This is a style-only warning and does not block builds.

### 5.2 Recommended `biome.json` Overrides for `components/ui/**`

```json
{
  "overrides": [
    {
      "include": ["src/components/ui/**"],
      "linter": {
        "rules": {
          "a11y": {
            "useFocusableInteractive":           "off",
            "noStaticElementInteractions":       "off",
            "noNoninteractiveElementToInteractiveRole": "off",
            "useSemanticElements":               "off"
          },
          "correctness": {
            "noUnusedImports": "off"
          }
        }
      }
    }
  ]
}
```

Rationale: accessibility enforcement in generated primitives is counter-productive (BaseUI manages a11y semantically through ARIA props, not via element type); unused import detection is noisy during component scaffolding.

**Sources:** [Biome issue #7639 on shadcn](https://github.com/shadcn-ui/ui/issues/7639), [Biome useImportType issue #2004](https://github.com/biomejs/biome/issues/2004), [Biome changelog](https://biomejs.dev/internals/changelog/)

---

## 6. Vitest + Testing Library Compatibility

### 6.1 React 19 Version Requirements

React 19 is only supported by `@testing-library/react` **version 16.1.0 and above**. Starting from v16, `@testing-library/dom` must also be installed as a separate dependency:

```bash
pnpm add -D @testing-library/react @testing-library/dom @testing-library/jest-dom
```

Snapshot tests and tests asserting on attributes generated by UI libraries (e.g., `data-radix-*` or `data-base-ui-*`) are a known breakage vector when upgrading: React 19 changes some internal attribute handling, and previously passing snapshot tests may fail because attributes that were present in React 18 are absent or changed in React 19.

**Sources:** [React Testing Library npm](https://www.npmjs.com/package/@testing-library/react), [Vitest + React 19 upgrade](https://www.thecandidstartup.org/2025/03/31/vitest-3-vite-6-react-19.html)

### 6.2 Testing Portal-Based Components (Dialog, DropdownMenu)

Portal-based components render their DOM outside the test container — into `document.body`. This means:

- **Do not** use `container` queries (the default `render()` container) to find portal content. Use `screen` queries, which search `document.body`.
- `screen.getByRole("dialog")` works for Dialog; `screen.getByRole("menu")` for DropdownMenu.
- To trigger open state in tests, you must fire the open action (click the trigger) and then `await screen.findByRole("dialog")` — portal renders are async via React's effect scheduling.

```tsx
import { render, screen, fireEvent } from "@testing-library/react";

test("dialog opens on trigger click", async () => {
  render(<MyDialogComponent />);
  fireEvent.click(screen.getByRole("button", { name: /open/i }));
  const dialog = await screen.findByRole("dialog");
  expect(dialog).toBeInTheDocument();
});
```

**jsdom vs happy-dom:** The project uses jsdom (standard Vitest default). happy-dom is an alternative that is faster and has fewer known portals-related edge cases. For BaseUI specifically, no documented jsdom incompatibilities exist as of April 2026. **[unverified]**

**Focus trap testing:** BaseUI Dialog uses a focus trap. jsdom does not implement `focus()` natively on all elements — you may need `userEvent.setup()` from `@testing-library/user-event` rather than `fireEvent` for keyboard interactions to work correctly:

```bash
pnpm add -D @testing-library/user-event
```

---

## 7. cmdk + react-day-picker Reuse

### 7.1 Command Component

The shadcn/ui Command component — **including the BaseUI variant** — still wraps **cmdk** (by Dip/Paco Coursey) in 2026. The BaseUI variant of Command does not replace cmdk with a BaseUI primitive; it uses cmdk for the fuzzy-search and keyboard navigation logic while adapting the shell markup. The documentation states explicitly: "The `<Command />` component uses the `cmdk` component by Dip."

The project already has `cmdk` installed, so no additional dependency is required. Version compatibility: ensure `cmdk` is at least `1.0.0` (the version that ships the `cmdk` package name after renaming from `@cmdk/cmdk`).

### 7.2 Calendar Component

The shadcn/ui Calendar component — including the Base UI path — **continues to wrap `react-day-picker`** in 2026. The documentation for the Base UI calendar page confirms: "The `Calendar` component is built on top of React DayPicker."

There is no BaseUI Calendar primitive that replaces react-day-picker. BaseUI does not (as of April 2026) ship a Calendar primitive in `@base-ui-components/react`.

`react-day-picker` is listed in the shadcn React 19 compatibility table as "Works with flag" — meaning pnpm users will see a peer dependency warning but it installs cleanly. No `--legacy-peer-deps` or package override is needed under pnpm.

**Sources:** [shadcn Command (base)](https://ui.shadcn.com/docs/components/base/command), [shadcn Calendar (base)](https://ui.shadcn.com/docs/components/base/calendar), [shadcn React 19 docs](https://ui.shadcn.com/docs/react-19)

---

## 8. Dark Mode Handoff to Existing App

### 8.1 Does Toggling `.dark` on `<html>` Just Work?

**Yes, with a significant caveat about token naming.**

The `@custom-variant dark (&:is(.dark *))` declaration (which shadcn ships in its canonical CSS) means any element that is a descendant of a `.dark` ancestor will have the `dark:` variant available. Toggling `.dark` on `document.documentElement` (as the project's `use-theme.ts` already does) will cause shadcn components' `.dark` CSS variable block to activate.

The project's existing `use-theme.ts` sets `root.classList.toggle("dark", isDark)` — this is exactly the mechanism shadcn's ThemeProvider uses. The dark class toggle is directly compatible.

### 8.2 The Token Name Mismatch Problem

The existing app applies themes via:
```ts
root.style.setProperty(`--color-${token}`, value);
```

This sets `--color-background`, `--color-foreground`, etc. — the `--color-*` aliases.

Shadcn components, however, consume the **raw token names**: `--background`, `--foreground`, etc. The `@theme inline` block creates the `--color-*` utilities as indirect references to the raw names. So shadcn's `bg-background` utility resolves as: `background-color: var(--color-background)` → `var(--background)` → `oklch(...)` from `:root`.

If the app sets `--color-background` as an inline style, it **overrides the `@theme inline` alias** but does NOT update what shadcn components see through `var(--background)`. The result is that custom themes' background color will apply to non-shadcn utility classes but not to shadcn component internals.

**Fix required:** The theme application in `use-theme.ts` must also set the raw token names:
```ts
root.style.setProperty(`--${token}`, value);        // for shadcn raw tokens
root.style.setProperty(`--color-${token}`, value);  // for existing utility classes
```
Or the theme definitions can be migrated to use raw token names as the primary keys, with `--color-*` derived in CSS via `@theme inline`.

### 8.3 Color Format Mismatch

The existing theme definitions use hex colors (`#111113`). Shadcn's defaults use OKLCH. Both formats are valid CSS and the browser resolves them correctly — there is no functional incompatibility. The visual concern is color-mixing: if any component uses `color-mix(in oklch, var(--primary) 50%, transparent)`, hex inputs will be automatically converted by the browser's color engine. This works correctly in all modern browsers (Chromium 111+, Firefox 113+, Safari 16.4+). No action required unless you want perceptual uniformity.

---

## Footgun Summary (~150 words)

The highest-severity silent-failure traps in this migration:

**1. `@theme inline` blocks runtime overrides** — if you declare `@theme inline { --color-background: var(--background) }` (as shadcn requires for `dark:` utilities) and then try to override `--color-background` via JavaScript `setProperty`, it does nothing. Override `--background` (the raw token) instead. This mismatch between the project's existing `--color-*` inline style approach and shadcn's raw token approach is the single most likely silent breakage.

**2. Token name namespace collision** — the project uses `--color-background` as its primary token; shadcn uses `--background`. Applying shadcn components without reconciling this means shadcn component backgrounds ignore runtime theme switching entirely.

**3. `tailwindcss-animate` must be replaced** — `@plugin "tailwindcss-animate"` silently does nothing in Tailwind v4. The accordion open/close animations will be missing without `@import "tw-animate-css"`.

**4. `@testing-library/react` must be ≥ 16.1.0** for React 19; earlier versions render components incorrectly and tests pass when they should fail.

**5. Biome a11y false positives on BaseUI wrappers** — `useFocusableInteractive` and `noStaticElementInteractions` will flag legitimate BaseUI patterns and can block CI if linter rules are set to `error`.

**6. `forwardRef` removal breaks React 18 consumers** — any shared component library or tool (Storybook, test utilities) that still runs under React 18 and relies on `ref` forwarding from the new shadcn components will silently receive `undefined` refs.

---

## References

- [shadcn/ui Vite Installation](https://ui.shadcn.com/docs/installation/vite)
- [shadcn/ui Manual Installation](https://ui.shadcn.com/docs/installation/manual)
- [shadcn/ui Tailwind v4 docs](https://ui.shadcn.com/docs/tailwind-v4)
- [shadcn/ui Theming](https://ui.shadcn.com/docs/theming)
- [shadcn/ui Dark Mode (Vite)](https://ui.shadcn.com/docs/dark-mode/vite)
- [shadcn/ui React 19 docs](https://ui.shadcn.com/docs/react-19)
- [shadcn/ui Changelog: January 2026 Base UI](https://ui.shadcn.com/docs/changelog/2026-01-base-ui)
- [shadcn/ui Changelog: February 2025 Tailwind v4](https://ui.shadcn.com/docs/changelog/2025-02-tailwind-v4)
- [shadcn/ui Command (Base variant)](https://ui.shadcn.com/docs/components/base/command)
- [shadcn/ui Calendar (Base variant)](https://ui.shadcn.com/docs/components/base/calendar)
- [tw-animate-css GitHub](https://github.com/Wombosvideo/tw-animate-css)
- [tw-animate-css npm](https://www.npmjs.com/package/tw-animate-css)
- [Tailwind v4 `@theme` vs `@theme inline` discussion #18560](https://github.com/tailwindlabs/tailwindcss/discussions/18560)
- [Tailwind v4 dark mode CSS variables discussion #15083](https://github.com/tailwindlabs/tailwindcss/discussions/15083)
- [shadcn/ui discussion #6714: Tailwind v4 and React 19](https://github.com/shadcn-ui/ui/discussions/6714)
- [shadcn/ui discussion #3695: Preparing for React 19](https://github.com/shadcn-ui/ui/discussions/3695)
- [shadcn/ui issue #6739: forwardRef removal](https://github.com/shadcn-ui/ui/issues/6739)
- [shadcn/ui issue #7229: forwardRef missing](https://github.com/shadcn-ui/ui/issues/7229)
- [shadcn/ui issue #7926: React 19 ref forwarding](https://github.com/shadcn-ui/ui/issues/7926)
- [shadcn/ui issue #7639: Biome a11y bug](https://github.com/shadcn-ui/ui/issues/7639)
- [Biome issue #2004: useImportType React import](https://github.com/biomejs/biome/issues/2004)
- [shadcnblocks: Tailwind 4 shadcn theming](https://www.shadcnblocks.com/blog/tailwind4-shadcn-themeing/)
- [Multi-theme v4 React (Medium)](https://medium.com/render-beyond/build-a-flawless-multi-theme-ui-using-new-tailwind-css-v4-react-dca2b3c95510)
- [Upgrading to Vitest 3, Vite 6, React 19](https://www.thecandidstartup.org/2025/03/31/vitest-3-vite-6-react-19.html)
- [@testing-library/react npm](https://www.npmjs.com/package/@testing-library/react)
- [Biome changelog](https://biomejs.dev/internals/changelog/)
