# shadcn/ui + Base UI Variant: Migration Recipe (2026-01)

> Practitioner reference for the architect decomposing a Radix-to-BaseUI migration.
> Target stack: React 19, Vite 6, Tailwind v4 (CSS-first), TypeScript 5.7, Biome, pnpm monorepo.
> Sources fetched April 2026; URLs cited inline.

---

## 1. Init & components.json (BaseUI variant)

### CLI init flow

The v4 CLI introduced a `--base` flag to select primitives at project setup.
([March 2026 CLI v4 changelog](https://ui.shadcn.com/docs/changelog/2026-03-cli-v4))

For an **existing Vite project** (our case — no scaffolding needed):

```bash
# 1. Install dependencies first (manual path)
pnpm add shadcn class-variance-authority clsx tailwind-merge lucide-react tw-animate-css @base-ui/react

# 2. Run init — selects BaseUI via --base flag or interactive prompt
pnpm dlx shadcn@latest init --base

# Alternatively, use the visual preset builder and emit the exact command:
# https://ui.shadcn.com/create?base=base
```

During interactive init the CLI will prompt for:
- Framework (select Vite)
- Primitive library (select Base UI)
- Style (vega / nova / maia / lyra / mira / luma — see §2 for visual descriptions)
- Base color (neutral, stone, zinc, mauve, olive, mist, taupe)
- CSS file path (e.g. `src/index.css`)
- Path aliases (`@/components`, `@/lib/utils`)
- RSC support (answer **no** for Vite)
- TypeScript (answer **yes**)
- Icon library (lucide)

**[unverified]** The exact prompt sequence for the v4 interactive init was not extractable from docs pages; the above is reconstructed from the v4 changelog and manual install docs. Use `pnpm dlx shadcn@latest init --help` to confirm flags.

### Concrete components.json for our stack

The `style` field encodes both primitive library and visual style as `{library}-{style}`.
([shadcn component styles reference](https://www.shadcnblocks.com/blog/shadcn-component-styles-vega-nova-maia-lyra-mira/))

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

Key fields:
- **`style`**: `"base-vega"` selects Base UI primitives + Vega visual style. Other options: `base-nova`, `base-maia`, `base-lyra`, `base-mira`, `base-luma` (added March 2026).
- **`tailwind.config`**: Empty string — Tailwind v4 has no `tailwind.config.js`.
- **`tailwind.css`**: Path to your CSS entry that imports tailwindcss.
- **`rsc`**: `false` — disables React Server Component wrapping in generated code; use `false` for Vite.
- **`iconLibrary`**: `"lucide"` — components import from `lucide-react`.

### Package installed by the CLI (BaseUI variant)

The package was renamed: the old `@base-ui-components/react` (last published at `1.0.0-rc.0`) is superseded by:

```
@base-ui/react   # current name, v1.4.1 as of April 2026
```

([npm: @base-ui/react](https://www.npmjs.com/package/@base-ui/react))

Full dependency set for a BaseUI shadcn project:

```bash
pnpm add @base-ui/react                  # Base UI primitives
pnpm add shadcn                          # shadcn CLI peer
pnpm add class-variance-authority        # CVA for variant management
pnpm add clsx tailwind-merge             # already installed in our project
pnpm add lucide-react                    # icon library
pnpm add tw-animate-css                  # Tailwind v4 animation replacement
pnpm add date-fns                        # used by Calendar/DatePicker
```

**Note:** `@floating-ui/react` is a transitive dependency of `@base-ui/react` (Base UI uses Floating UI for positioning). You do not need to install it directly unless writing custom positioned primitives.

### Registry URLs and adding components

Registry: `https://ui.shadcn.com` (default; uses `base-*` registry paths automatically when `style` starts with `base-`).

Add a single component:

```bash
pnpm dlx shadcn@latest add button
pnpm dlx shadcn@latest add dialog
pnpm dlx shadcn@latest add dropdown-menu
# etc.
```

Add all at once (useful for big-bang):

```bash
pnpm dlx shadcn@latest add --all
# or to overwrite existing:
pnpm dlx shadcn@latest add --all --overwrite
```

---

## 2. Tailwind v4 Setup for shadcn-with-BaseUI

### Complete `src/index.css`

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
  --radius-3xl: calc(var(--radius) * 2.2);
  --radius-4xl: calc(var(--radius) * 2.6);
}

:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
  --chart-1: oklch(0.488 0.243 264.376);
  --chart-2: oklch(0.696 0.17 162.48);
  --chart-3: oklch(0.769 0.188 70.08);
  --chart-4: oklch(0.627 0.265 303.9);
  --chart-5: oklch(0.645 0.246 16.439);
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.556 0 0);
}
```

([shadcn theming docs](https://ui.shadcn.com/docs/theming))

### Dark-mode strategy in Tailwind v4

In Tailwind v4 there is no `darkMode: 'class'` in JS config. Instead, use the `@custom-variant dark` directive in your CSS:

```css
@custom-variant dark (&:is(.dark *));
```

This makes `dark:` utilities apply to any element inside a `.dark`-classed ancestor.
([GitHub discussion on @custom-variant dark](https://github.com/shadcn-ui/ui/discussions/6840))

The `ThemeProvider` context component (generated by shadcn) toggles `document.documentElement.classList` between `"light"` and `"dark"`. No additional Tailwind configuration is needed.

### Animation plugin: `tw-animate-css`

`tailwindcss-animate` was a Tailwind v3 JS plugin and does not work with v4's CSS-first architecture.

The replacement is `tw-animate-css` by Wombosvideo — a pure-CSS package installed as a regular npm dependency:

```bash
pnpm add tw-animate-css
```

Import in your CSS (before `@theme`):

```css
@import "tw-animate-css";
```

It provides the same keyframe-based animation utilities (`animate-in`, `animate-out`, `fade-in`, `fade-out`, `slide-in-from-*`, `zoom-in`, etc.) that shadcn components reference.
([GitHub: tw-animate-css](https://github.com/Wombosvideo/tw-animate-css))

---

## 3. Component Inventory (BaseUI variant) as of 2026-01

Based on doc page probing of `/docs/components/base/<name>`:

### Available in BaseUI variant

| shadcn name | `@base-ui/react` primitive | `npx shadcn add` command | Note |
|---|---|---|---|
| Accordion | `Accordion` | `npx shadcn add accordion` | `type="multiple"` → `multiple` prop |
| Alert | none (pure HTML) | `npx shadcn add alert` | No interactive primitive needed |
| AlertDialog | `AlertDialog` | `npx shadcn add alert-dialog` | `size` prop: `"default"\|"sm"` |
| AspectRatio | `AspectRatio` | `npx shadcn add aspect-ratio` | |
| Avatar | `Avatar` | `npx shadcn add avatar` | Ships `AvatarGroup` + `AvatarBadge` |
| Badge | none (pure CVA) | `npx shadcn add badge` | variants: default/secondary/destructive/outline/ghost/link |
| Breadcrumb | none (semantic HTML) | `npx shadcn add breadcrumb` | |
| Button | none (native button) | `npx shadcn add button` | No Radix Slot; uses `render` prop for asChild equivalent |
| ButtonGroup | none | `npx shadcn add button-group` | Composite |
| Calendar | react-day-picker | `npx shadcn add calendar` | Still uses DayPicker under BaseUI style |
| Card | none | `npx shadcn add card` | |
| Checkbox | `Checkbox` | `npx shadcn add checkbox` | `checked` is strict boolean; use `indeterminate` separately |
| Collapsible | `Collapsible` | `npx shadcn add collapsible` | |
| Combobox | `Combobox` | `npx shadcn add combobox` | Multi-select native via `multiple` + `ComboboxChips` |
| Command | cmdk (unchanged) | `npx shadcn add command` | Still uses cmdk package |
| ContextMenu | `ContextMenu` | `npx shadcn add context-menu` | |
| DatePicker | Calendar + Popover | `npx shadcn add popover calendar` | Composition pattern, no standalone component |
| Dialog | `Dialog` | `npx shadcn add dialog` | `showCloseButton` prop; `modal` prop for trap-focus-only mode |
| Drawer | vaul | `npx shadcn add drawer` | Still uses Vaul (not Base UI) |
| DropdownMenu | `Menu` | `npx shadcn add dropdown-menu` | Full submenu/radio/checkbox support |
| Field | `Field` | `npx shadcn add field` | Replaces Form primitives; pairs with react-hook-form Controller |
| HoverCard | `HoverCard` | `npx shadcn add hover-card` | |
| Input | none (native input) | `npx shadcn add input` | Ships InputGroup/ButtonGroup integration |
| InputOTP | n/a | `npx shadcn add input-otp` | [unverified: BaseUI variant status] |
| Label | none (native label) | `npx shadcn add label` | |
| Menubar | `Menubar` | `npx shadcn add menubar` | |
| NavigationMenu | `NavigationMenu` | `npx shadcn add navigation-menu` | |
| Popover | `Popover` | `npx shadcn add popover` | Uses `render` prop on trigger |
| Progress | `Progress` | `npx shadcn add progress` | |
| RadioGroup | `RadioGroup` | `npx shadcn add radio-group` | |
| Resizable | [unverified] | `npx shadcn add resizable` | BaseUI variant page exists; underlying primitive unclear |
| ScrollArea | `ScrollArea` | `npx shadcn add scroll-area` | |
| Select | `Select` | `npx shadcn add select` | Requires `items` array prop; `alignItemWithTrigger` prop |
| Separator | none | `npx shadcn add separator` | |
| Sheet | `Dialog` (extended) | `npx shadcn add sheet` | Side-drawer variant of Dialog; `side` prop |
| Sidebar | [composition] | `npx shadcn add sidebar` | BaseUI variant confirmed; uses Sheet for mobile |
| Skeleton | none | `npx shadcn add skeleton` | Pure CSS |
| Slider | `Slider` | `npx shadcn add slider` | |
| Sonner | sonner (emilkowalski) | `npx shadcn add sonner` | BaseUI page exists; Sonner itself is the underlying lib |
| Switch | `Switch` | `npx shadcn add switch` | `size` prop; checked is strict boolean |
| Tabs | `Tabs` | `npx shadcn add tabs` | `variant="line"`, `orientation="vertical"` |
| Textarea | none (native textarea) | `npx shadcn add textarea` | |
| Toast | deprecated | — | Use Sonner |
| Toggle | `Toggle` | `npx shadcn add toggle` | |
| ToggleGroup | `ToggleGroup` | `npx shadcn add toggle-group` | `value` strictly array; needs explicit `multiple` |
| Tooltip | `Tooltip` | `npx shadcn add tooltip` | `delay` prop (was `delayDuration` in Radix) |

### Components that exist in Radix but NOT confirmed for BaseUI

Based on available evidence, all major components have BaseUI variants as of 2026-01. However, note:

- **Resizable**: The BaseUI page exists at `/docs/components/base/resizable` but the underlying primitive is unclear — the GitHub discussion (issue #9562) flagged that the "Official Base UI Resizable component may trigger errors in certain scenarios." Consider keeping the Radix Resizable initially or testing thoroughly.
- **Carousel**: [unverified] — no BaseUI-specific page was confirmed.
- **InputOTP**: [unverified] — no BaseUI-specific page was confirmed; uses `input-otp` package.
- **Drawer**: Uses Vaul regardless of style setting — not a Base UI primitive.
- **Command**: Uses `cmdk` regardless of style setting.
- **Calendar/DatePicker**: Calendar still wraps `react-day-picker` (already in our deps — no change needed).
- **Sonner**: Wraps the `sonner` package regardless of style setting.

---

## 4. Per-Component Migration Map for Our 8 Primitives

### 4a. `button.tsx` → Button

```bash
pnpm dlx shadcn@latest add button
```

Generated at: `src/components/ui/button.tsx`

**Prop signatures:**
```typescript
interface ButtonProps extends React.ComponentProps<"button"> {
  variant?: "default" | "secondary" | "ghost" | "destructive" | "outline" | "link"
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg"
  render?: React.ReactElement  // replaces asChild
}
```

Note: `size="icon"` is present (our current API includes it). New sizes `xs`, `icon-xs`, `icon-sm`, `icon-lg` are additions.

**Usage example matching our current API:**
```tsx
import { Button } from "@/components/ui/button"

// Standard
<Button variant="default" size="default" onClick={handleClick}>Save</Button>
<Button variant="secondary">Cancel</Button>
<Button variant="ghost" size="icon"><TrashIcon /></Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Export</Button>
<Button variant="link" render={<a href="/docs" />}>Docs</Button>
```

**Tailwind v4 cursor note:** Add this to `index.css` `@layer base` block:
```css
@layer base {
  button:not(:disabled),
  [role="button"]:not(:disabled) {
    cursor: pointer;
  }
}
```

### 4b. `dialog.tsx` (native `<dialog>.showModal()`) → Dialog

```bash
pnpm dlx shadcn@latest add dialog
```

Generated at: `src/components/ui/dialog.tsx`

**Composition:**
```
Dialog
├── DialogTrigger
└── DialogContent
    ├── DialogHeader
    │   ├── DialogTitle
    │   └── DialogDescription
    └── DialogFooter
```

**Key props:**
```typescript
// Dialog (root)
interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  defaultOpen?: boolean
}

// DialogContent
interface DialogContentProps {
  showCloseButton?: boolean  // default: true
  modal?: boolean | 'trap-focus'  // true = focus trap + scroll lock
}
```

**Usage example:**
```tsx
import {
  Dialog, DialogTrigger, DialogContent,
  DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog"

function MyDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm action</DialogTitle>
          <DialogDescription>This cannot be undone.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleConfirm}>Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### 4c. `confirm-dialog.tsx` → AlertDialog

```bash
pnpm dlx shadcn@latest add alert-dialog
```

Generated at: `src/components/ui/alert-dialog.tsx`

**Composition:**
```
AlertDialog
├── AlertDialogTrigger
└── AlertDialogContent (size?: "default"|"sm")
    ├── AlertDialogHeader
    │   ├── AlertDialogTitle
    │   └── AlertDialogDescription
    └── AlertDialogFooter
        ├── AlertDialogCancel
        └── AlertDialogAction
```

**Usage example:**
```tsx
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent,
  AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogCancel, AlertDialogAction
} from "@/components/ui/alert-dialog"

function ConfirmDelete({ onConfirm }: { onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="destructive" />}>Delete</AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>This will permanently delete the item.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

### 4d. `dropdown-menu.tsx` → DropdownMenu

```bash
pnpm dlx shadcn@latest add dropdown-menu
```

Generated at: `src/components/ui/dropdown-menu.tsx`

**Composition:**
```
DropdownMenu
├── DropdownMenuTrigger
└── DropdownMenuContent
    ├── DropdownMenuGroup
    │   ├── DropdownMenuLabel
    │   └── DropdownMenuItem (variant="destructive")
    ├── DropdownMenuSeparator
    ├── DropdownMenuCheckboxItem
    ├── DropdownMenuRadioGroup
    │   └── DropdownMenuRadioItem
    ├── DropdownMenuShortcut
    └── DropdownMenuSub
        ├── DropdownMenuSubTrigger
        └── DropdownMenuSubContent
```

**Usage example with submenus, separators, keyboard nav:**
```tsx
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuGroup, DropdownMenuLabel, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger,
  DropdownMenuSubContent, DropdownMenuShortcut
} from "@/components/ui/dropdown-menu"

<DropdownMenu>
  <DropdownMenuTrigger render={<Button variant="outline" />}>Options</DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuGroup>
      <DropdownMenuLabel>Actions</DropdownMenuLabel>
      <DropdownMenuItem onSelect={handleEdit}>
        Edit <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>More options</DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          <DropdownMenuItem onSelect={handleArchive}>Archive</DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive" onSelect={handleDelete}>Delete</DropdownMenuItem>
    </DropdownMenuGroup>
  </DropdownMenuContent>
</DropdownMenu>
```

**Note on labels in menus:** Base UI requires `DropdownMenuLabel` to be inside a `DropdownMenuGroup` wrapper (unlike Radix, where labels could appear anywhere in the content hierarchy).

### 4e. `custom-select.tsx` → Select

```bash
pnpm dlx shadcn@latest add select
```

Generated at: `src/components/ui/select.tsx`

**Key API difference from Radix:** The BaseUI Select accepts an `items` array prop directly, rather than requiring children `<SelectItem>` components for each option.

**Composition:**
```
Select
├── SelectTrigger
│   └── SelectValue
└── SelectContent
    ├── SelectGroup
    │   ├── SelectLabel
    │   └── SelectItem
    └── SelectSeparator
```

**Props:**
```typescript
interface SelectRootProps {
  value?: string | null
  defaultValue?: string | null
  onValueChange?: (value: string | null) => void
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  disabled?: boolean
  items?: Array<{ label: string; value: string | null }>
  alignItemWithTrigger?: boolean  // default: true
}
```

**Usage example:**
```tsx
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"

const [status, setStatus] = useState<string | null>(null)

<Select value={status} onValueChange={setStatus}>
  <SelectTrigger aria-invalid={isInvalid}>
    <SelectValue placeholder="Select status..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="open">Open</SelectItem>
    <SelectItem value="in-progress">In Progress</SelectItem>
    <SelectItem value="closed">Closed</SelectItem>
  </SelectContent>
</Select>
```

### 4f. `date-picker.tsx` (react-day-picker) → DatePicker

DatePicker is a **composition pattern**, not a standalone component. Install both dependencies:

```bash
pnpm dlx shadcn@latest add popover calendar
pnpm add date-fns  # if not already present
```

No standalone `DatePicker` component is generated. The pattern is `Popover + Calendar`:

**Usage example:**
```tsx
import { useState } from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"

function DatePicker({ value, onChange }: { value?: Date; onChange: (d: Date | undefined) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="outline" />}>
        <CalendarIcon />
        {value ? format(value, "PPP") : "Pick a date"}
      </PopoverTrigger>
      <PopoverContent>
        <Calendar
          mode="single"
          selected={value}
          onSelect={(d) => { onChange(d); setOpen(false) }}
          captionLayout="dropdown"
        />
      </PopoverContent>
    </Popover>
  )
}
```

The `Calendar` component still wraps `react-day-picker` — already in our deps, no change needed.

### 4g. `assignee-picker.tsx` → Combobox (single select, async-friendly)

```bash
pnpm dlx shadcn@latest add combobox
```

Generated at: `src/components/ui/combobox.tsx`

**Key API:**
```typescript
interface ComboboxProps {
  items: T[]
  value?: string | null
  defaultValue?: string | null
  onValueChange?: (value: string | null) => void
  itemToStringValue?: (item: T) => string  // for object items
  showClear?: boolean
  autoHighlight?: boolean
  disabled?: boolean
  multiple?: boolean  // enables multi-select
}
```

**Single select usage example:**
```tsx
import { Combobox, ComboboxInput, ComboboxContent, ComboboxEmpty, ComboboxList, ComboboxItem } from "@/components/ui/combobox"

const users = [
  { id: "u1", name: "Alice" },
  { id: "u2", name: "Bob" },
]

<Combobox
  items={users}
  value={assigneeId}
  onValueChange={setAssigneeId}
  itemToStringValue={(u) => u.id}
>
  <ComboboxInput placeholder="Assign to..." />
  <ComboboxContent>
    <ComboboxEmpty>No users found.</ComboboxEmpty>
    <ComboboxList>
      {(user) => (
        <ComboboxItem key={user.id} value={user}>
          {user.name}
        </ComboboxItem>
      )}
    </ComboboxList>
  </ComboboxContent>
</Combobox>
```

**Async filtering:** Use Base UI's `useFilter()` hook with the `filteredItems` prop for external/async filtering.

### 4h. `label-picker.tsx` → Multi-select

**Critical finding:** shadcn's BaseUI Combobox **natively supports multi-select** via the `multiple` prop with `ComboboxChips`. This is NOT hand-assembled Command + Popover + Badge — it is a first-class built-in.

```tsx
import {
  Combobox, ComboboxChips, ComboboxValue, ComboboxChip,
  ComboboxChipsInput, ComboboxContent, ComboboxEmpty, ComboboxList, ComboboxItem
} from "@/components/ui/combobox"

const labels = ["bug", "feature", "docs", "ui", "backend"]
const [selected, setSelected] = useState<string[]>([])

<Combobox
  items={labels}
  multiple
  value={selected}
  onValueChange={setSelected}
>
  <ComboboxChips>
    <ComboboxValue>
      {selected.map((label) => (
        <ComboboxChip key={label}>{label}</ComboboxChip>
      ))}
    </ComboboxValue>
    <ComboboxChipsInput placeholder="Add label..." />
  </ComboboxChips>
  <ComboboxContent>
    <ComboboxEmpty>No labels found.</ComboboxEmpty>
    <ComboboxList>
      {(label) => <ComboboxItem value={label}>{label}</ComboboxItem>}
    </ComboboxList>
  </ComboboxContent>
</Combobox>
```

When `multiple` is true, `value` is `string[]` and `onValueChange` receives `string[]`.

---

## 5. BaseUI vs Radix Deltas (Surprises for Migrators)

### Portal handling

Base UI portals use a `Portal` subcomponent (e.g. `Dialog.Portal`, `Select.Portal`). The `container` prop accepts an `HTMLElement`, `ShadowRoot`, `RefObject`, or callable function. Defaults to `<body>`.

**Stacking context gotcha:** Base UI docs recommend adding `isolation: isolate` to your root `#root` div to create a separate stacking context, preventing z-index conflicts. This is different from Radix, which relied on careful z-index management.
([Base UI quick start](https://base-ui.com/react/overview/quick-start))

### Controlled vs uncontrolled state shape

Base UI uses the same naming conventions as Radix for most components:
- `open` / `defaultOpen` / `onOpenChange` — overlays (Dialog, Popover, DropdownMenu)
- `value` / `defaultValue` / `onValueChange` — selection (Select, Combobox, Tabs)

**Differences:**
- `Tabs`: `value`/`onValueChange` (same as Radix)
- `Accordion`: `defaultValue` is an **array** even for single (breaking from Radix's string default)
- `ToggleGroup`: `value` strictly typed as an **array**; `multiple` prop required explicitly
- `Select`: `onValueChange` returns `value | null` (not `value | undefined`)
- `Checkbox`/`Switch`: `checked` is strict boolean (no `"indeterminate"` string); use separate `indeterminate` prop

### Accessibility defaults

Base UI has strong accessibility defaults:
- Full ARIA attributes including `aria-modal`, `aria-labelledby`, `aria-describedby`
- Focus trap: enabled by default when `modal={true}` (Dialog default)
- Scroll lock: enabled by default in Dialog
- `modal` prop on Dialog accepts `true` (trap + lock), `'trap-focus'` (trap only), `false` (no restrictions)
- `disablePointerDismissal` available on Dialog/AlertDialog

**ARIA vs data attributes:** Base UI uses ARIA attributes for state styling hooks where Radix used `data-state`. This is a **significant CSS migration risk** — any custom CSS using `data-[state=open]` selectors will silently break.

### Keyboard navigation differences

- **Typeahead in menus:** Base UI inherits typeahead from Floating UI; behavior is similar to Radix but positioning is now done via Floating UI's `Positioner` component (props like `side` and `align` move to the positioner, not the content).
- **Arrow keys:** Consistent across both; no breaking differences reported.
- **Tooltip delay:** Renamed from `delayDuration` (Radix) to `delay` (Base UI).

### Animation/transition story

Base UI uses a **completely different animation attribute system** from Radix:

| Radix | Base UI | Purpose |
|---|---|---|
| `data-state="open"` | `data-open` | Open state |
| `data-state="closed"` | `data-closed` | Closed state |
| (no equivalent) | `data-starting-style` | Animation entry initial state |
| (no equivalent) | `data-ending-style` | Animation exit final state |
| `data-side="..."` | still `data-side` | Positioning side |

Example CSS for a Base UI dialog:
```css
.dialog-popup {
  opacity: 1;
  scale: 1;
  transition: opacity 150ms, scale 150ms;
}
.dialog-popup[data-starting-style],
.dialog-popup[data-ending-style] {
  opacity: 0;
  scale: 0.95;
}
```

Base UI recommends **CSS transitions over keyframe animations** because transitions can be smoothly cancelled mid-animation.

The `tw-animate-css` package provides ready-to-use animation utilities (`animate-in`, `animate-out`, etc.) compatible with this approach.
([Base UI animation handbook](https://base-ui.com/react/handbook/animation))

### Compose/asChild equivalent: `render` prop

Radix's `asChild` is replaced by Base UI's `render` prop:

```tsx
// Radix (before)
<DialogTrigger asChild><Button variant="outline">Open</Button></DialogTrigger>

// Base UI (after)
<DialogTrigger render={<Button variant="outline" />}>Open</DialogTrigger>
```

The `render` prop accepts:
1. A React element: `render={<a href="/about" />}`
2. A callback: `render={(props, state) => <MyBtn {...props} data-state={state} />}`

Base UI's `useRender` hook merges props using `mergeProps`, which concatenates classNames, merges styles, and chains event handlers. This is more explicit than Radix's `Slot` and avoids the "Slot component bugs" that some Radix users encountered.
([Base UI useRender](https://base-ui.com/react/utils/use-render))

### Production gotcha: asChild gap in SidebarMenuButton

A reported bug (December 2025, shadcn-ui/ui #9049): When using BaseUI style, `SidebarMenuButton` and `DropdownMenuTrigger` were missing `asChild` (because the generated components don't include it). The shadcn docs still showed `asChild` examples while the BaseUI-generated code omitted it. The fix is to use `render={<Link ... />}` instead of `asChild`.

**CSS selector migration is the highest-risk hidden breakage:** Any custom CSS with `data-[state=open]:`, `data-[state=closed]:`, `data-[disabled]:` will silently fail with Base UI's ARIA attributes. Grep for `data-\[state` in your stylesheets and Tailwind class strings.

---

## 6. React 19 + Non-RSC Notes

### forwardRef vs ref-as-prop

In React 19, `forwardRef` is deprecated. shadcn-with-BaseUI generates components in React 19 format (ref as regular prop) when using the `base-*` styles:

- Setting `"style": "base-vega"` (or any `base-*` style) automatically generates React 19 components without `forwardRef`.
- The older Radix `new-york` style (pre-v4) still generated `forwardRef` wrappers. The equivalent is `radix-nova` or forcing `new-york-v4` style.
- Base UI was designed after React 19's ref changes were finalized and natively uses ref-as-prop.

([makerkit: updating shadcn to React 19](https://makerkit.dev/blog/tutorials/update-shadcn-react-19))

### Peer dep gotchas with React 19

`@base-ui/react` 1.x requires React 18 or React 19. No known peer dep conflicts. The `sonner` and `vaul` packages are community-maintained and may lag on React 19 peer dep declarations — use `pnpm add --legacy-peer-deps` if blocked, or check their changelogs.

### `rsc: false` in components.json

Setting `rsc: false` changes the generated code:
- **No** `"use client"` directives added to generated component files
- Components are assumed to be client components by default (correct for Vite)
- If `rsc: true`, the CLI wraps interactive components with `"use client"` at the top — irrelevant for our Vite SPA

---

## 7. Native `<dialog>` vs shadcn Dialog Tradeoff

### What native `<dialog>.showModal()` gives us

| Feature | Native dialog |
|---|---|
| Top-layer rendering | Yes — browser handles z-index above all other content |
| `::backdrop` pseudo-element | Yes — styled with CSS, no extra markup |
| ESC key closes | Yes — browser-native, no JS needed |
| `inert` attribute on background | Yes — browser sets inert automatically on showModal |
| Focus trap | Yes — browser-native |
| Scroll lock | Yes — browser-native |
| Portal to `<body>` | Yes — implied by top-layer |
| Controlled open state | Requires `open`/`close()` via ref; awkward for React |
| Animation on close | Hard — no `data-closed` hooks; requires CSS animation-end events |
| Nested overlays | Problematic — only one top-layer element at a time per spec (browsers improving) |
| Accessible by default | Yes — but requires explicit `aria-labelledby` and `aria-describedby` |

### What shadcn Dialog (BaseUI) gives us

| Feature | shadcn/BaseUI Dialog |
|---|---|
| Portal rendering | Yes — `Dialog.Portal` moves to `<body>` (but NOT browser top-layer) |
| Backdrop | Custom `<div>` with `className` — full control; more flexible than `::backdrop` |
| ESC key | Yes — handled by Base UI |
| Focus trap | Yes — `Dialog.Popup` with `modal={true}` |
| Scroll lock | Yes — default behavior |
| Controlled open state | Excellent — `open`/`onOpenChange` as React state |
| Animation on close | Excellent — `data-starting-style`/`data-ending-style` with CSS transitions |
| Nested overlays | Supported — multiple portals, proper stacking |
| TypeScript API | Full prop inference, state typing |
| Composability | Trigger, content, header, footer — all composable |

### Gain/loss analysis

**Gains moving to shadcn Dialog:**
- Smooth React controlled state without `.showModal()` ref imperatives
- Clean close animation support (`data-ending-style`)
- Composable structure (header/footer as separate components)
- Nested overlay support

**Losses:**
- Leaves the browser top-layer; relies on JS z-index management (mitigated by `isolation: isolate` on root)
- `::backdrop` pseudo-element replaced by a custom `<div>` (more code, more control)
- Native inert behavior replaced by Base UI's JS implementation (solid, but one more runtime dependency)
- Slightly larger bundle than native (Base UI Dialog is ~3-4 KB gzipped)

For our use case (issue tracker, not a browser-extension context), the shadcn Dialog wins on developer experience and animation quality.

---

## 8. Token Name Compatibility

Our existing utility classes vs shadcn 2026 tokens:

| Our class | shadcn token | Status |
|---|---|---|
| `bg-background` | `--color-background: var(--background)` | **Exact match** |
| `border-border` | `--color-border: var(--border)` | **Exact match** |
| `text-foreground` | `--color-foreground: var(--foreground)` | **Exact match** |
| `bg-accent` | `--color-accent: var(--accent)` | **Exact match** |
| `text-destructive` | `--color-destructive: var(--destructive)` | **Exact match** |
| `bg-muted` | `--color-muted: var(--muted)` | **Exact match** |
| `text-muted-foreground` | `--color-muted-foreground: var(--muted-foreground)` | **Exact match** |
| `bg-popover` | `--color-popover: var(--popover)` | **Exact match** |
| `text-card-foreground` | `--color-card-foreground: var(--card-foreground)` | **Exact match** |
| `ring-ring` | `--color-ring: var(--ring)` | **Exact match** |

All token names are identical. The only format change is that values are now OKLCH instead of HSL — this affects only the CSS variable values, not the Tailwind utility class names.

([shadcn theming docs](https://ui.shadcn.com/docs/theming))

---

## 9. Theme System Layering

Our `themes/definitions/` folder with multiple themes can layer cleanly on top of shadcn's `:root` + `.dark` defaults.

### Per-theme CSS file shape

Each theme overrides the same CSS custom property names. Shadcn's token system (`:root` defines variables; `@theme inline` maps them to `--color-*`) means themes only need to override the raw `--background`, `--primary`, etc. variables:

```css
/* themes/ocean.css */
[data-theme="ocean"] {
  --background: oklch(0.12 0.02 240);
  --foreground: oklch(0.95 0.01 240);
  --primary: oklch(0.55 0.18 230);
  --primary-foreground: oklch(0.98 0 0);
  --secondary: oklch(0.2 0.04 240);
  --secondary-foreground: oklch(0.9 0.01 240);
  --accent: oklch(0.25 0.06 220);
  --accent-foreground: oklch(0.95 0.01 240);
  --muted: oklch(0.2 0.03 240);
  --muted-foreground: oklch(0.65 0.04 240);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.25 0.04 240);
  --input: oklch(0.25 0.04 240);
  --ring: oklch(0.55 0.18 230);
  --card: oklch(0.16 0.03 240);
  --card-foreground: oklch(0.95 0.01 240);
  --popover: oklch(0.16 0.03 240);
  --popover-foreground: oklch(0.95 0.01 240);
  --sidebar: oklch(0.14 0.02 240);
  --sidebar-foreground: oklch(0.9 0.01 240);
  /* ... other sidebar tokens */
}

/* Dark variant per theme: combine selectors */
[data-theme="ocean"].dark,
[data-theme="ocean"] .dark {
  --background: oklch(0.08 0.02 240);
  /* ... darker overrides */
}
```

### Switching mechanism

Apply the theme attribute to the root element alongside the dark mode class:

```tsx
// theme-picker.tsx
function applyTheme(theme: string, dark: boolean) {
  document.documentElement.setAttribute("data-theme", theme)
  document.documentElement.classList.toggle("dark", dark)
}
```

The `@custom-variant dark` selector (`&:is(.dark *)`) works independently of `data-theme`, so dark mode and theme choice compose:

```css
/* Tailwind dark: utilities still work with @custom-variant dark (&:is(.dark *)) */
/* because .dark is on <html>, so all children are inside .dark */
```

### Dark mode per theme

Option A — separate dark overrides per theme file (shown above). Clean separation but more CSS.

Option B — parameterize OKLCH lightness values as additional CSS variables:

```css
[data-theme="ocean"] {
  --hue: 240;
  --chroma: 0.04;
  --background: oklch(var(--l-bg, 0.12) var(--chroma) var(--hue));
}
.dark [data-theme="ocean"] {
  --l-bg: 0.08;
}
```

Option B is more concise but harder to reason about. Option A is recommended for explicit control.

Import all theme files in your CSS entry:

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "./themes/ocean.css";
@import "./themes/forest.css";
/* etc. */
```

---

## 10. Known Issues / Community Lessons (post-2026-01)

### Critical production issues

**pointer-events: none stuck on body**
The oldest and most painful shadcn bug (Radix era): when a Dialog/DropdownMenu closes after a state change inside it, `pointer-events: none` remains on `<body>`. This was a Radix-specific issue — Base UI uses Floating UI and its own event management, so this particular bug should not reproduce with the BaseUI variant.
([GitHub #5586](https://github.com/shadcn-ui/ui/issues/5586), [#7237](https://github.com/shadcn-ui/ui/issues/7237))

**asChild missing from SidebarMenuButton and DropdownMenuTrigger (BaseUI)**
When using a BaseUI style, the CLI generates components without `asChild`. Use `render={<Link to="..." />}` instead. Docs were out of sync with generated code as of December 2025.
([GitHub issue #9049](https://github.com/shadcn-ui/ui/issues/9049))

**CSS data-state selectors silently fail**
Any custom Tailwind variants like `data-[state=open]:opacity-100` will silently stop working after migration. Base UI components do not set `data-state`; they set `data-open`, `data-closed`, or ARIA attributes. **Run a global search for `data-\[state` before migrating.**

**Resizable component errors**
The BaseUI Resizable may trigger errors. The GitHub discussion (#9562) notes: "A patched implementation is available in the vite-shadcn reference repository." If Resizable is needed, test in isolation before including in the migration.

**ToggleGroup value type**
`ToggleGroup.value` must always be an array. If you have any single-value ToggleGroup using `value="foo"`, it will fail type checking. Requires `multiple={false}` + array `value={["foo"]}` even for single-select.

**Select placeholder**
The BaseUI Select uses `{value: null}` items for placeholder slots rather than a separate `<SelectPlaceholder>` component. Ensure your current select code that shows "Select..." doesn't rely on Radix's `SelectValue` placeholder behavior — use the `items` array pattern with a null-value entry.

**Form system rewrite required**
The Radix-era `Form` component (wrapping react-hook-form with FormField, FormItem, FormControl, FormLabel) is deprecated in BaseUI. The new system uses `Field`, `FieldLabel`, `FieldDescription`, `FieldError` wrapping react-hook-form `<Controller>` directly. This is a significant API rewrite for any form-heavy components. The functionality is equivalent but the component tree is different.
([GitHub discussion #9562](https://github.com/shadcn-ui/ui/discussions/9562))

### Community observations

- basecn.dev and shadcnspace.com both confirm that the big-bang approach (change `components.json` + `pnpm dlx shadcn@latest add --all --overwrite`) works for most projects but requires manual CSS selector and prop name cleanup afterward.
- The migration from `new-york` to `base-vega` is purely about primitive library; the visual styles (vega = New York look, nova = compact, maia = rounded, lyra = boxy, mira = dense, luma = macOS-soft) are independent axes.

---

## 11. Migration Order (Big-Bang) Recommendation

For a single-PR big-bang swap with minimal broken intermediate states:

### (a) Init + tokens + dark-mode wiring

```bash
# Update components.json style field to "base-vega"
# Update src/index.css: add @import "tw-animate-css", @custom-variant dark,
#   @theme inline block, :root tokens, .dark tokens
pnpm add tw-animate-css @base-ui/react
```

Verify dark mode toggle works and token colors render before touching any components. This is the foundation; everything else builds on it.

**Why first:** If tokens are wrong, every component is visually broken. Get the CSS right in isolation.

### (b) Primitives with no deps: Button, Label, Badge, Separator, Skeleton, Avatar, Card

```bash
pnpm dlx shadcn@latest add button label badge separator skeleton avatar card
```

These have no overlay dependencies and no complex state. Button is the highest-risk because `asChild` users are widespread — do a global grep for `asChild` on Button first.

**Why second:** Nearly every other component depends on Button. Also catches the React 19 ref-as-prop and cursor issues early.

### (c) Overlay primitives: Popover, Dialog, AlertDialog, DropdownMenu, Sheet, Tooltip, HoverCard

```bash
pnpm dlx shadcn@latest add popover dialog alert-dialog dropdown-menu sheet tooltip hover-card
```

These share a common portal/positioning architecture. Doing them together means any stacking context (`isolation: isolate`) or z-index issues surface at the same time. Add `isolation: isolate` to `#root` CSS before this step.

**Why third:** These are the components most affected by the pointer-events and portal behavior differences. Isolate them from form state complexity.

### (d) Form primitives: Input, Textarea, Select, Checkbox, RadioGroup, Switch, Slider, Progress, Field

```bash
pnpm dlx shadcn@latest add input textarea select checkbox radio-group switch slider progress field
```

Rewrite all react-hook-form integrations from `<FormField>` pattern to `<Controller>` + `<Field>` pattern in this step.

**Why fourth:** Form primitives have the biggest API surface changes (Checkbox indeterminate, Select items prop, Field/FormField swap). Doing them after overlays means the modal/dialog infrastructure is tested.

### (e) Complex composites: Combobox, Calendar, DatePicker (Popover+Calendar), Sidebar, NavigationMenu, Menubar, Command, Sonner, Tabs, Accordion, Collapsible

```bash
pnpm dlx shadcn@latest add combobox calendar collapsible tabs accordion sidebar navigation-menu menubar command sonner
```

These depend on primitives from (b)–(d) being stable. Combobox multi-select (`label-picker`) and Sidebar are the highest complexity.

**Why fifth:** Dependencies on earlier phases must be stable. Combobox in particular depends on Popover, Input, and Command all working.

### (f) Consumer file rewrites

For each custom file being replaced:
1. Replace import paths: `@/components/button` → `@/components/ui/button`
2. Remove `asChild` → use `render={<Element />}` where needed
3. Replace `data-[state=open]:` Tailwind classes → `data-open:` or `aria-expanded:` equivalent
4. Update `<FormField>` wrappers → `<Controller>` + `<Field>`
5. Update ToggleGroup value types to arrays

### (g) Delete custom files + tests

Only after all consumers are rewritten and E2E tests pass:
- Delete `components/button.tsx`, `components/dialog.tsx`, etc.
- Delete or update unit tests that test implementation details of custom primitives
- Run `pnpm typecheck` — TS errors from removed imports will catch missed usages
- Run `pnpm test:e2e` — Playwright tests catch visual/interaction regressions

**Justification for big-bang over incremental:** Our custom components don't expose stable public APIs (no design system consumers outside this repo). Running two parallel button implementations is more cognitive overhead than a clean cutover. The risk is bounded to one PR review cycle.

---

## Sources

- [January 2026 - Base UI Documentation - shadcn/ui](https://ui.shadcn.com/docs/changelog/2026-01-base-ui)
- [March 2026 - shadcn/cli v4](https://ui.shadcn.com/docs/changelog/2026-03-cli-v4)
- [shadcn Manual Installation](https://ui.shadcn.com/docs/installation/manual)
- [shadcn components.json reference](https://ui.shadcn.com/docs/components-json)
- [shadcn Theming](https://ui.shadcn.com/docs/theming)
- [Base UI npm: @base-ui/react](https://www.npmjs.com/package/@base-ui/react)
- [Base UI releases](https://base-ui.com/react/overview/releases)
- [Base UI Dialog API](https://base-ui.com/react/components/dialog)
- [Base UI Select API](https://base-ui.com/react/components/select)
- [Base UI Combobox API](https://base-ui.com/react/components/combobox)
- [Base UI useRender hook](https://base-ui.com/react/utils/use-render)
- [GitHub: Migration guide discussion #9562](https://github.com/shadcn-ui/ui/discussions/9562)
- [GitHub: asChild missing in BaseUI #9049](https://github.com/shadcn-ui/ui/issues/9049)
- [GitHub: pointer-events bug #5586](https://github.com/shadcn-ui/ui/issues/5586)
- [basecn.dev: Migrating from Radix UI](https://basecn.dev/docs/get-started/migrating-from-radix-ui)
- [shadcnstudio: Migrate from Radix to Base UI](https://shadcnstudio.com/blog/migrate-from-radix-ui-to-base-ui)
- [shadcnblocks: Component Styles](https://www.shadcnblocks.com/blog/shadcn-component-styles-vega-nova-maia-lyra-mira/)
- [GitHub: tw-animate-css](https://github.com/Wombosvideo/tw-animate-css)
- [GitHub: @custom-variant dark discussion](https://github.com/shadcn-ui/ui/discussions/6840)
- [DeepWiki: Base vs Radix Component Variants](https://deepwiki.com/shadcn-ui/ui/6.3-base-vs-radix-component-variants)
- [makerkit: Updating shadcn to React 19](https://makerkit.dev/blog/tutorials/update-shadcn-react-19)
- [shadcn/ui components/base/button](https://ui.shadcn.com/docs/components/base/button)
- [shadcn/ui components/base/dialog](https://ui.shadcn.com/docs/components/base/dialog)
- [shadcn/ui components/base/combobox](https://ui.shadcn.com/docs/components/base/combobox)
- [shadcn/ui components/base/calendar](https://ui.shadcn.com/docs/components/base/calendar)
- [shadcn/ui components/base/select](https://ui.shadcn.com/docs/components/base/select)
- [shadcn/ui components/base/dropdown-menu](https://ui.shadcn.com/docs/components/base/dropdown-menu)
- [shadcn/ui components/base/alert-dialog](https://ui.shadcn.com/docs/components/base/alert-dialog)
- [shadcn/ui forms/react-hook-form](https://ui.shadcn.com/docs/forms/react-hook-form)
- [InfoQ: MUI Releases Base UI 1](https://www.infoq.com/news/2026/02/baseui-v1-accessible/)
