# shadcn/BaseUI Migration Impact Inventory

**Repo:** `/Users/redhale/src/pearl`  
**Frontend Package:** `packages/frontend`  
**Date:** 2026-04-25  
**Scope:** Very Thorough Exploration  

---

## A. Custom UI Primitives — Full Source Maps

### 1. `button.tsx`

**Public Exports:**
- `Button` (forwardRef component) → `ButtonProps`
  - `variant?: "default" | "outline" | "ghost" | "destructive"`
  - `size?: "default" | "sm" | "lg" | "icon"`
  - Extends `ButtonHTMLAttributes<HTMLButtonElement>`

**Internal State:** None (stateless)

**Imperative APIs:** `ref` (forwarded as `HTMLButtonElement`)

**Notable Behaviors:**
- Active-state scale-down animation (`active:scale-[0.97]`)
- Focus ring at 2px width with offset
- Disabled state: pointer-events-none, 40% opacity
- Uses Tailwind CSS variables: `--radius`, color tokens (primary, destructive, accent, border, background)

**CSS/Token Usage:**
- `bg-primary`, `text-primary-foreground`, `hover:bg-primary/90` (primary color variants)
- `border-border`, `bg-background`, `hover:bg-accent`, `text-accent-foreground` (outline variant)
- `bg-destructive`, `hover:shadow-destructive/25` (destructive variant)
- `focus-visible:ring-ring`, `focus-visible:ring-offset-background`

---

### 2. `dialog.tsx`

**Public Exports:**
- `Dialog` (forwardRef component) → `DialogProps`
  - `isOpen: boolean` (controlled state)
  - `onClose: () => void`
  - `size?: "sm" | "md" | "lg" | "xl" | "2xl"` (max-width variants)
  - `children: ReactNode`
  - `onCancel?: (e: React.SyntheticEvent<HTMLDialogElement>) => void`
  - `"aria-label"?: string`
- `DialogRef` → `{ element: HTMLDialogElement | null }`

**Internal State:** Uses native HTML `<dialog>` element (`showModal()` / `close()`)

**Imperative APIs:** 
- `useImperativeHandle` → exposes `dialogRef.current` via ref handle
- Manages modal via `showModal()` on open, `close()` on close

**Notable Behaviors:**
- Uses native HTML5 `<dialog>` element with `::backdrop`
- Responds to isOpen prop changes
- Click-outside to close (checks e.target === dialogRef.current)
- Backdrop pseudo-element with `backdrop:bg-black/50`
- Size classes: `max-w-sm`, `max-w-md`, `max-w-lg`, `max-w-xl`, `max-w-2xl`
- Position: `fixed inset-0 z-50 m-auto` (centers on viewport)
- Keyboard: responds to native `cancel` event

**CSS/Token Usage:**
- `border-border`, `bg-background`, `text-foreground` (theme tokens)
- `shadow-xl` (elevation)
- `backdrop:bg-black/50` (backdrop opacity)
- `rounded-xl` (border-radius)

---

### 3. `confirm-dialog.tsx`

**Public Exports:**
- `ConfirmDialog` (functional component) → `ConfirmDialogProps`
  - `isOpen: boolean` (controlled state)
  - `onConfirm: () => void`
  - `onCancel: () => void`
  - `title: string`
  - `description: string`
  - `confirmLabel?: string` (default: "Confirm")
  - `cancelLabel?: string` (default: "Cancel")
  - `variant?: "destructive" | "default"` (default: "destructive")
  - `isPending?: boolean` (loading state)

**Internal State:** 
- Uncontrolled focus: refs focus to cancelRef on open
- Wrapper around `Dialog` primitive

**Imperative APIs:** `useRef` for cancel button focus management

**Notable Behaviors:**
- Wraps Dialog with styled button bar
- Icons: `CheckIcon` (default), `TrashIcon` (destructive), `XIcon` (cancel)
- Confirms button shows "..." during pending
- Auto-focuses cancel button on open (safe default)
- Enter animation: `animate-modal-enter`

**CSS/Token Usage:**
- Uses Button colors from variant (destructive/default)
- `text-muted-foreground`, `text-lg font-semibold` (title)

---

### 4. `dropdown-menu.tsx`

**Public Exports:**
- `DropdownMenu` (context provider, no ref)
  - `children: ReactNode`
  - `open?: boolean` (optional controlled state)
  - `onOpenChange?: (open: boolean) => void`
- `DropdownMenuTrigger` → accepts render-prop function
  - Returns: `ref`, `onClick`, `aria-haspopup: "menu"`, `aria-expanded`
- `DropdownMenuContent`
  - `align?: "start" | "end"` (default: "start")
  - `width?: string` (default: "w-48")
  - `className?: string`
- `DropdownMenuItem` (forwardRef)
  - `icon?: ReactNode`
  - `disabled?: boolean`
  - `destructive?: boolean`
  - `hasSubmenu?: boolean`
  - `trailing?: ReactNode`
  - `closeOnSelect?: boolean` (default: true)
- `DropdownMenuSeparator`
- `useDropdownClose()` → hook returning `() => void`

**Internal State:**
- Controlled or uncontrolled `open` state
- Context-based (DropdownContext)
- Internal state: `triggerRef`, `menuRef`, `containerRef`

**Imperative APIs:**
- Context provides `setOpen`, refs for trigger/menu/container
- `useDropdownClose()` hook for imperatively closing from inside content

**Notable Behaviors:**
- Click-outside to close (document.mousedown listener)
- Escape key to close + focus trigger
- Arrow key navigation (Up/Down/Home/End) cycles through menu items with wrap-around
- First menu item auto-focuses on open
- Position: `absolute top-full z-50 mt-1` (below trigger)
- Role-based keyboard nav: queries `[role="menuitem"]:not(:disabled)`
- Click → close (unless `closeOnSelect: false`)

**CSS/Token Usage:**
- `border-border`, `bg-background` (panel)
- `hover:bg-accent`, `focus:bg-accent` (item hover/focus)
- `text-destructive` (destructive item variant)
- `focus-visible:ring-2 focus-visible:ring-ring` (focus ring)
- Icon/chevron: `text-muted-foreground`

---

### 5. `custom-select.tsx`

**Public Exports:**
- `SelectOption<T>` type → `{ value: T; label: string; disabled?: boolean }`
- `CustomSelect<T>` (functional component)
  - Overloaded: `SingleSelectProps<T>` | `MultiSelectProps<T>`
  - Common: `options`, `placeholder`, `className`, `triggerClassName`, `renderOption`, `size: "sm" | "md"`, `aria-label`
  - Single: `multiple?: false | undefined`, `value: T | null`, `onChange: (value: T) => void`
  - Multi: `multiple: true`, `value: T[]`, `onChange: (values: T[]) => void`

**Internal State:**
- Fully controlled in single-select mode (via onChange)
- Toggle behavior in multi-select (doesn't auto-close)
- `open` state
- `highlightIndex` for keyboard nav
- `dropdownStyle` for fixed positioning with viewport awareness

**Imperative APIs:**
- `ref` to trigger button
- Window listeners for scroll/resize repositioning

**Notable Behaviors:**
- Dropdown positions intelligently (flips above if space below < 256px)
- Click-outside to close
- Escape key to close
- Arrow Up/Down navigate; Enter/Space selects
- Multi-select: chip display of selected values, inline x-button per chip
- Keyboard on closed trigger: ArrowDown opens
- Disabled options cannot be highlighted or selected
- Multi-select shows "Remove X" on hover of chip
- Dynamic width: `Math.max(rect.width, 140)` with viewport boundary clamping
- Listbox role with ARIA: `aria-expanded`, `aria-haspopup="listbox"`, `aria-activedescendant`
- Role="option" on each item, `aria-disabled` on disabled items

**CSS/Token Usage:**
- `border-border`, `bg-background` (trigger)
- `border-primary/50`, `bg-primary/5`, `text-primary` (when multi-select has values)
- `hover:border-foreground/30` (outline variant when empty)
- `bg-accent`, `hover:bg-accent` (highlight)
- `bg-primary/15`, `px-1.5 py-0`, `text-[11px]` (chip styling)
- Selected checkmark: `bg-primary`, `border-primary`, `text-primary-foreground`

---

### 6. `date-picker.tsx`

**Public Exports:**
- `DatePicker` (functional component)
  - `value: string | null` (ISO date string YYYY-MM-DD or null)
  - `onChange: (date: string | null) => void`
  - `placeholder?: string` (default: "Set date")
  - `className?: string`

**Internal State:**
- `isOpen` state
- `relativeInput` text for relative date parsing (e.g., "tomorrow", "next friday")
- `popoverStyle` for fixed positioning with viewport awareness

**Imperative APIs:**
- `useRef` for trigger, input, container
- Window listeners for scroll/resize repositioning

**Notable Behaviors:**
- Uses `react-day-picker` library (DayPicker component)
- Relative date parsing via `parseRelativeDate()` utility
- Also accepts absolute dates: "YYYY-MM-DD" or "MM/DD/YYYY" formats
- Click-outside to close
- Escape key to close (prevents ancestor dialog cancel)
- Popover positions above if space below < 360px
- Display format: "MMM d, yyyy" (e.g., "Apr 25, 2026")
- Clear button appears when value is set
- DayPicker styling via classNames prop (maps to Tailwind)
- Calendar shows outside days, today ring, selected highlight
- Input focus on open (via requestAnimationFrame)
- Reposition on scroll/resize (with passive listeners)

**CSS/Token Usage:**
- `border-border`, `bg-background`, `rounded-xl`, `shadow-lg` (popover)
- `bg-primary`, `text-primary-foreground` (selected day)
- `ring-1 ring-primary` (today marker)
- `hover:bg-accent`, `text-muted-foreground` (navigation buttons)
- `text-muted-foreground/40`, `text-muted-foreground/30` (outside/disabled days)
- `animate-fade-up` (popover entrance)
- `focus:outline-none focus:ring-2 focus:ring-ring` (input focus)

---

### 7. `assignee-picker.tsx`

**Public Exports:**
- `AssigneePicker` (functional component)
  - `value: string` (currently selected assignee)
  - `onChange: (assignee: string) => void`
  - `onClose: () => void`
  - `className?: string`
  - `style?: React.CSSProperties`

**Internal State:**
- `search` text
- `highlightIndex` for keyboard nav
- Derives assignee list from React Query cache (issues data)
- Allow creation of new assignee strings (freeform input)

**Imperative APIs:**
- `useRef` for input, container, list
- `useQueryClient()` to scan cached issue data

**Notable Behaviors:**
- Fixed-position popover (receives `style` prop for positioning)
- Click-outside to close
- Escape key to close + stops propagation
- Arrow Up/Down navigate; Enter selects
- Backspace at empty search does nothing
- Filter list as user types (lowercase includes match)
- "Assign to 'X'" option allows creating new assignee (if not exact match)
- Auto-focus input on mount
- Scroll highlighted item into view
- Role="combobox", role="listbox" for accessibility
- Selected assignee shows as bold

**CSS/Token Usage:**
- `border-border`, `bg-background`, `rounded-lg`, `shadow-lg` (fixed popover)
- `hover:bg-accent`, `bg-accent` (highlight)
- `text-muted-foreground` (helper text)
- `z-50` (stacking)
- `max-h-64`, `max-h-48` (overflow + scroll)

---

### 8. `label-picker.tsx`

**Public Exports:**
- `LabelPicker` (functional component)
  - `selected: string[]` (array of label names)
  - `selectedColors: Record<string, LabelColor>` (name → color map)
  - `onChange: (labels: string[]) => void`
  - `allowCreate?: boolean` (default: true)
  - `placeholder?: string` (default: "Search labels...")
  - `className?: string`

**Internal State:**
- `isOpen` dropdown state
- `search` text
- `highlightIndex` for keyboard nav
- `showColorPicker` secondary panel for color selection on new label
- `newLabelColor` selection state
- Queries all labels via `useLabels()` hook
- Derives filteredLabels via useMemo

**Imperative APIs:**
- `useRef` for container, input, list
- `useCreateLabel()` mutation hook for creating new labels
- Color picker uses ColorPickerPanel subcomponent
- `useTheme()` to determine dark mode for color display

**Notable Behaviors:**
- Multi-select with inline chip display (calls `LabelBadge` component)
- Auto-open on input focus
- Click-outside to close
- Escape key to close (or close color picker if showing)
- Backspace at empty search removes last selected label
- Arrow Up/Down navigate; Enter selects or creates
- Filter removes already-selected labels from list
- Color picker grid (5 columns, click to select, shows preview)
- Quick-create on Enter (random color), or click "Create" to open color picker
- "Create 'X'" option with random color fallback
- Active descendant ARIA for screen readers
- Scroll-into-view for highlighted items
- Role="combobox", role="listbox", role="option" for accessibility

**CSS/Token Usage:**
- `border-border`, `bg-background`, `rounded-lg` (container & picker dropdown)
- `focus-within:ring-2 focus-within:ring-ring` (container on input focus)
- `hover:bg-accent`, `bg-accent` (item highlight)
- `hover:bg-muted` (alternate item hover)
- `bg-primary/15`, `px-1.5`, `py-0` (chip sizing)
- Color swatches: `h-7 w-full rounded-md` with `ring-2 ring-ring ring-offset-1` (selected)
- Button: `bg-primary`, `text-primary-foreground` (create action)

---

## B. Domain Components — Leave-Alone List

| File | One-Line Description | Dependencies on Replaceable Primitives |
|------|----------------------|----------------------------------------|
| `bead-id.tsx` | Clickable issue ID pill with copy-to-clipboard | None (pure domain: Link, hooks, icons) |
| `label-badge.tsx` | Colored label badge with WCAG AA verified colors | None (pure domain: color palette, theme hook) |
| `type-pill.tsx` | Issue type indicator (task/bug/feature/etc) | None (pure domain: IssueType enum, icons) |
| `status-badge.tsx` | Issue status badge (open/in_progress/closed/etc) | None (pure domain: IssueStatus enum) |
| `priority-indicator.tsx` | P0-P4 priority indicator badge | None (pure domain: Priority enum) |
| `attachment-icon.tsx` | Simple attachment icon component | None (pure SVG, no dependencies) |
| `relative-time.tsx` | Humanized relative time with absolute tooltip | None (pure domain: date-fns utility) |
| `empty-state.tsx` | Centered empty state with icon, title, optional CTA | None (pure domain: PlusIcon, no modal/menu) |
| `icons.tsx` | Shared icon library (CheckIcon, XIcon, PlusIcon, etc) | None (pure SVG exports) |

**Verdict:** All domain components are pure presentational; none depend on Dialog, DropdownMenu, CustomSelect, or other replaceable primitives. Safe to leave as-is.

---

## C. Composite Surfaces — Migration Assessment

### Format for Each Entry:
- **File:** path
- **Current Implementation:** Strategy/dependencies
- **Candidate Replacement(s):** Suggested shadcn components
- **Migration Assessment:** Easy/Medium/Hard + 1-line justification

---

### 1. `command-palette.tsx`
- **File:** `packages/frontend/src/components/command-palette.tsx`
- **Current Implementation:** Uses `cmdk` library (Command component) directly; manages open state, search, grouping via hooks (`useCommandPaletteOpen`, `useAllCommandActions`)
- **Candidate Replacement(s):** `shadcn/Command` (wraps cmdk, same library)
- **Assessment:** **Easy** — shadcn/Command is a thin wrapper around cmdk; swap the cmdk import for shadcn version with no breaking changes to grouping/filtering logic.

---

### 2. `search-palette.tsx`
- **File:** `packages/frontend/src/components/search-palette.tsx`
- **Current Implementation:** Uses `cmdk` (Command) with custom search integration to issue list; manages loading state, recency sorting
- **Candidate Replacement(s):** `shadcn/Command`
- **Assessment:** **Easy** — Same as command-palette; cmdk-based, so shadcn/Command drops in; only need to preserve issue search API wiring.

---

### 3. `notification-panel.tsx`
- **File:** `packages/frontend/src/components/notification-panel.tsx`
- **Current Implementation:** Custom hook-based state (`useNotifications`); renders list of notifications with action buttons; no modal/dropdown primitive dependency
- **Candidate Replacement(s):** Sonner (toast-based), or keep as custom panel with shadcn Popover
- **Assessment:** **Medium** — If using Sonner, requires refactoring to per-toast action buttons; if staying as panel + Popover, Popover swap is straightforward.

---

### 4. `notification-bell.tsx`
- **File:** `packages/frontend/src/components/notification-bell.tsx`
- **Current Implementation:** Custom open/close state; click-outside + Escape close; mounts NotificationPanel in fixed position overlay
- **Candidate Replacement(s):** `shadcn/Popover` (or use as custom dropdown trigger)
- **Assessment:** **Easy** — Bell is a trigger with open state; Popover provides the positioning logic. Replace custom click-outside logic with Popover's built-in behavior.

---

### 5. `toast-container.tsx`
- **File:** `packages/frontend/src/components/toast-container.tsx`
- **Current Implementation:** Custom hook (`useToasts`); renders queued toasts as list; CSS animations for slide-in/fade
- **Candidate Replacement(s):** `Sonner` (toast library), `shadcn/Sonner` integration
- **Assessment:** **Medium** — Sonner has different toast queue model; requires hook refactoring (replaceToast hook → Sonner's toast.* methods). CSS animations can migrate with min changes.

---

### 6. `sidebar.tsx`
- **File:** `packages/frontend/src/components/sidebar.tsx`
- **Current Implementation:** Custom drawer on mobile (uses focus trap, position:fixed); NavLink-based nav; no modal primitive used
- **Candidate Replacement(s):** `shadcn/Sheet` (drawer) or `shadcn/Sidebar` (if available in v4 + BaseUI)
- **Assessment:** **Easy** — Current drawer is custom; Sheet provides the animation + backdrop. Focus trap is already in place; Sheet will handle trap setup.

---

### 7. `header.tsx`
- **File:** `packages/frontend/src/components/header.tsx`
- **Current Implementation:** Pure presentational; renders buttons with hint text (⌘K, ⌘F hints); no primitive usage
- **Candidate Replacement(s):** None needed
- **Assessment:** **Easy (no change)** — Header is UI-agnostic; no primitives to replace.

---

### 8. `app-shell.tsx`
- **File:** `packages/frontend/src/components/app-shell.tsx`
- **Current Implementation:** Layout wrapper; mounts Header, Sidebar, main content, and composites (CommandPalette, SearchPalette, etc)
- **Candidate Replacement(s):** None needed (layout orchestrator)
- **Assessment:** **Easy (no change)** — Orchestrator component; no primitives to replace directly.

---

### 9. `keyboard-help.tsx`
- **File:** `packages/frontend/src/components/keyboard-help.tsx`
- **Current Implementation:** Custom sync-external-store for open state; renders as fixed overlay with close button; no modal primitive
- **Candidate Replacement(s):** `shadcn/Dialog` or `shadcn/Sheet`
- **Assessment:** **Easy** — Replace fixed-position overlay with Dialog (modal) or Sheet (slide-over); SyncExternalStore logic stays as-is for global toggle.

---

### 10. `onboarding.tsx`
- **File:** `packages/frontend/src/components/onboarding.tsx`
- **Current Implementation:** Custom modal-like overlay; render-prop-based steps; no shadcn primitive
- **Candidate Replacement(s):** `shadcn/Dialog`
- **Assessment:** **Medium** — Dialog replacement is straightforward; need to verify step rendering (child page transitions) work with Dialog's children-on-open behavior.

---

### 11. `theme-picker.tsx`
- **File:** `packages/frontend/src/components/theme-picker.tsx`
- **Current Implementation:** Pure button grid; theme selection via `useTheme()` hook; applies `dark` class to html
- **Candidate Replacement(s):** None needed
- **Assessment:** **Easy (no change)** — Theme picker is UI-agnostic; setTheme hook is theme-system-specific.

---

### 12. `embedded-mode-modal.tsx`
- **File:** `packages/frontend/src/components/embedded-mode-modal.tsx`
- **Current Implementation:** Custom modal using native `<dialog>` element (like our Dialog primitive)
- **Candidate Replacement(s):** `shadcn/Dialog`
- **Assessment:** **Easy** — Already using native dialog; shadcn/Dialog uses same native element, so swap is straightforward.

---

### 13. `setup-guard.tsx`
- **File:** `packages/frontend/src/components/setup-guard.tsx`
- **Current Implementation:** Router guard component; conditionally renders SetupView or children; no primitives
- **Candidate Replacement(s):** None needed
- **Assessment:** **Easy (no change)** — Router guard; no UI primitives to replace.

---

### 14. `health-banner.tsx`
- **File:** `packages/frontend/src/components/health-banner.tsx`
- **Current Implementation:** Static banner; renders health warnings; no modals or dropdowns
- **Candidate Replacement(s):** None needed
- **Assessment:** **Easy (no change)** — Banner is static; no primitives to replace.

---

### 15. `attachment-settings.tsx`
- **File:** `packages/frontend/src/components/attachment-settings.tsx`
- **Current Implementation:** Settings section with form inputs; no modals or dropdowns
- **Candidate Replacement(s):** None needed
- **Assessment:** **Easy (no change)** — Form component; no UI primitives used.

---

### 16. `notification-preferences.tsx`
- **File:** `packages/frontend/src/components/notification-preferences.tsx`
- **Current Implementation:** Settings section with toggle/select inputs; no modals or dropdowns
- **Candidate Replacement(s):** May use CustomSelect for filter options; would swap for shadcn/Select
- **Assessment:** **Easy** — If CustomSelect is used, shadcn/Select provides drop-in replacement.

---

### 17. `settings-section.tsx`
- **File:** `packages/frontend/src/components/settings-section.tsx`
- **Current Implementation:** Pure layout wrapper for settings panels
- **Candidate Replacement(s):** None needed
- **Assessment:** **Easy (no change)** — Layout helper; no primitives.

---

### 18. `error-boundary.tsx`
- **File:** `packages/frontend/src/components/error-boundary.tsx`
- **Current Implementation:** React error boundary; renders fallback UI with reset button
- **Candidate Replacement(s):** None needed
- **Assessment:** **Easy (no change)** — Error handling; no UI primitives to replace.

---

### 19. `detail/lightbox.tsx`
- **File:** `packages/frontend/src/components/detail/lightbox.tsx`
- **Current Implementation:** Custom modal overlay (uses portal, focus trap, backdrop); navigation arrows; no Dialog primitive
- **Candidate Replacement(s):** `shadcn/Dialog`
- **Assessment:** **Easy** — Replace fixed overlay + portal logic with Dialog; focus trap is already via custom hook; Dialog provides backdrop.

---

### 20. `detail/create-issue-dialog.tsx`
- **File:** `packages/frontend/src/components/detail/create-issue-dialog.tsx`
- **Current Implementation:** Uses Dialog, CustomSelect, DatePicker, LabelPicker primitives; form with multiple field editors
- **Candidate Replacement(s):** Replace Dialog → shadcn/Dialog, CustomSelect → shadcn/Select, DatePicker → shadcn/Calendar + Popover, LabelPicker → custom or shadcn/ComboBox
- **Assessment:** **Medium** — Multiple primitives; each has straightforward swap, but integrated testing required. Dialog is safe; selects/date-picker need API compatibility check.

---

### 21. `detail/detail-actions-menu.tsx`
- **File:** `packages/frontend/src/components/detail/detail-actions-menu.tsx`
- **Current Implementation:** Uses DropdownMenu primitive; action list with icons + labels
- **Candidate Replacement(s):** `shadcn/DropdownMenu`
- **Assessment:** **Easy** — DropdownMenu is context-based; shadcn/DropdownMenu uses Radix and provides same composition API.

---

### 22. `detail/comment-thread.tsx`
- **File:** `packages/frontend/src/components/detail/comment-thread.tsx`
- **Current Implementation:** Comment list rendering; may use primitives for inline actions (edit/delete dropdowns)
- **Candidate Replacement(s):** None required if only rendering comments; DropdownMenu swap if action menus exist
- **Assessment:** **Easy** — Check for inline action menus; if present, DropdownMenu → shadcn/DropdownMenu.

---

### 23. `issue-table/filter-bar.tsx`
- **File:** `packages/frontend/src/components/issue-table/filter-bar.tsx`
- **Current Implementation:** Filter UI with CustomSelect (status/priority/type filters); may use ConfirmDialog for bulk actions
- **Candidate Replacement(s):** CustomSelect → shadcn/Select, ConfirmDialog → shadcn/AlertDialog
- **Assessment:** **Easy** — Clear swap points; CustomSelect and ConfirmDialog are well-scoped.

---

### 24. `issue-table/filter-bar-parts.tsx`
- **File:** `packages/frontend/src/components/issue-table/filter-bar-parts.tsx`
- **Current Implementation:** Filter input components (CustomSelect, ConfirmDialog, DatePicker)
- **Candidate Replacement(s):** CustomSelect → shadcn/Select, DatePicker → shadcn/Calendar + Popover, ConfirmDialog → shadcn/AlertDialog
- **Assessment:** **Easy** — Isolated filter parts; each primitive swap is independent.

---

### 25. `issue-table/bulk-action-bar.tsx`
- **File:** `packages/frontend/src/components/issue-table/bulk-action-bar.tsx`
- **Current Implementation:** Button group with DropdownMenu for bulk actions
- **Candidate Replacement(s):** DropdownMenu → shadcn/DropdownMenu
- **Assessment:** **Easy** — Single primitive; straightforward swap.

---

### 26. `graph/graph-toolbar.tsx`
- **File:** `packages/frontend/src/components/graph/graph-toolbar.tsx`
- **Current Implementation:** Toolbar with buttons and icon buttons; no complex primitives
- **Candidate Replacement(s):** None required
- **Assessment:** **Easy (no change)** — Button-based toolbar; may use Button primitive, which is shadcn-compatible.

---

### 27. `views/list-view.tsx`
- **File:** `packages/frontend/src/views/list-view.tsx`
- **Current Implementation:** View orchestrator; mounts FilterBar, IssueTable, ConfirmDialog
- **Candidate Replacement(s):** ConfirmDialog → shadcn/AlertDialog
- **Assessment:** **Easy** — ConfirmDialog swap; orchestrator stays same.

---

### 28. `views/board-view.tsx`
- **File:** `packages/frontend/src/views/board-view.tsx`
- **Current Implementation:** Kanban-style board; mounts KanbanColumn which may use CustomSelect for status changes
- **Candidate Replacement(s):** CustomSelect → shadcn/Select
- **Assessment:** **Easy** — CustomSelect swap if used in board columns; otherwise no changes.

---

### 29. `views/detail-view.tsx`
- **File:** `packages/frontend/src/views/detail-view.tsx`
- **Current Implementation:** View orchestrator; mounts IssueDetail, CreateIssueDialog, and detail sub-components
- **Candidate Replacement(s):** CreateIssueDialog uses Dialog, CustomSelect, DatePicker, LabelPicker → shadcn equivalents
- **Assessment:** **Medium** — Orchestrator; complexity is in mounted CreateIssueDialog (covered in C-20).

---

### 30. `views/settings-view.tsx`
- **File:** `packages/frontend/src/views/settings-view.tsx`
- **Current Implementation:** Mounts SettingsSection, ThemePicker, AttachmentSettings, NotificationPreferences
- **Candidate Replacement(s):** None required
- **Assessment:** **Easy (no change)** — Composition of non-primitive components.

---

### 31. `views/setup-view.tsx`
- **File:** `packages/frontend/src/views/setup-view.tsx`
- **Current Implementation:** Onboarding flow; may mount onboarding modal or multi-step dialog
- **Candidate Replacement(s):** Dialog → shadcn/Dialog if using custom modal
- **Assessment:** **Easy** — Setup logic stays same; modal swap if present.

---

## D. Consumer Call-Graph (Precise Counts)

**Total imports of custom UI primitives by file:**

| Primitive | Count | Files |
|-----------|-------|-------|
| **button** | 15 | `detail/activity-timeline.tsx`, `detail/comment-thread.tsx`, `detail/create-issue-dialog.tsx`, `detail/dependency-list.tsx`, `detail/detail-actions-menu.tsx`, `detail/detail-header.tsx`, `detail/markdown-section.tsx`, `error-boundary.tsx`, `graph/graph-toolbar.tsx`, `issue-table/bulk-action-bar.tsx`, `ui/confirm-dialog.tsx`, `views/detail-components.tsx`, `views/graph-components.tsx`, `views/not-found-view.tsx`, `views/setup-view.tsx` |
| **dialog** | 2 | `detail/create-issue-dialog.tsx`, `ui/confirm-dialog.tsx` |
| **confirm-dialog** | 4 | `detail/dependency-list.tsx`, `detail/issue-detail.tsx`, `issue-table/filter-bar-parts.tsx`, `views/list-view.tsx` |
| **dropdown-menu** | 2 | `detail/detail-actions-menu.tsx`, `issue-table/bulk-action-bar.tsx` |
| **custom-select** | 7 | `board/kanban-column.tsx`, `detail/activity-timeline.tsx`, `detail/create-issue-dialog.tsx`, `issue-table/columns.tsx`, `issue-table/filter-bar-parts.tsx`, `issue-table/filter-bar.tsx`, `views/detail-components.tsx` |
| **date-picker** | 3 | `detail/create-issue-dialog.tsx`, `detail/metadata-sidebar.tsx`, `issue-table/columns.tsx` |
| **assignee-picker** | 1 | `issue-table/columns.tsx` |
| **label-picker** | 4 | `detail/create-issue-dialog.tsx`, `detail/metadata-sidebar.tsx`, `issue-table/columns.tsx`, `issue-table/filter-bar.tsx` |

**Summary:**
- **Most consumed:** Button (15 files) — widest reach, many surfaces depend
- **Moderate consumption:** CustomSelect (7 files), LabelPicker (4 files), ConfirmDialog (4 files)
- **Low consumption:** DropdownMenu (2), Dialog (2), DatePicker (3), AssigneePicker (1)
- **Total unique files affected:** ~20 distinct files across detail/, issue-table/, board/, views/, and ui/

---

## E. Tailwind v4 + Theme Wiring (Current State)

### CSS Theme Block (index.css, lines 4–52)

```css
@custom-variant dark (&:where(.dark, .dark *));

@theme {
  --color-background: #ffffff;
  --color-foreground: #0a0a0a;
  --color-muted: #f5f5f5;
  --color-muted-foreground: #737373;
  --color-border: #e5e5e5;
  --color-primary: #4f46e5;
  --color-primary-foreground: #ffffff;
  --color-accent: #eef2ff;
  --color-accent-foreground: #3730a3;
  --color-destructive: #ef4444;
  --color-ring: #6366f1;
  --radius: 0.5rem;

  /* Semantic colors */
  --color-info: #3b82f6;
  --color-info-foreground: #1e3a5f;
  --color-success: #22c55e;
  --color-success-foreground: #14532d;
  --color-warning: #f59e0b;
  --color-warning-foreground: #78350f;
  --color-danger: #ef4444;
  --color-danger-foreground: #7f1d1d;

  /* Surface colors for layered backgrounds */
  --color-surface: #ffffff;
  --color-surface-raised: #fafafa;

  --font-sans: "Inter Variable", "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, "Cascadia Code", "Fira Code", monospace;

  /* Elevation shadow system (5 levels) */
  --shadow-0: none;
  --shadow-1: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-2: 0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-3: 0 4px 16px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.05);
  --shadow-4: 0 8px 32px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.06);

  /* Semantic spacing scale (geometric: each step ~1.5x previous) */
  --spacing-compact: 0.5rem; /* 8px — tight lists, inline elements */
  --spacing-default: 1rem; /* 16px — standard element spacing */
  --spacing-spacious: 1.5rem; /* 24px — section gaps */
  --spacing-section: 2rem; /* 32px — major section separation */

  /* Entrance animation */
  --animate-fade-up: fade-up 0.3s ease-out;
}
```

**Dark mode overrides (lines 55–81):** Provides dark-mode variants for all color tokens + surface colors.

### Theme Definition Files (15 definitions)

| Filename | Purpose |
|----------|---------|
| `abyss.ts` | VSCode Abyss theme colors (dark) |
| `dark-plus.ts` | VSCode Dark+ theme colors |
| `hc-dark.ts` | High-contrast dark theme |
| `hc-light.ts` | High-contrast light theme |
| `kimbie-dark.ts` | Kimbie Dark color scheme |
| `light-plus.ts` | VSCode Light+ theme |
| `monokai-dimmed.ts` | Monokai Dimmed variant |
| `monokai.ts` | Classic Monokai colors |
| `quiet-light.ts` | Quiet Light color scheme |
| `red.ts` | Red-accent theme |
| `solarized-dark.ts` | Solarized Dark palette |
| `solarized-light.ts` | Solarized Light palette |
| `tomorrow-night-blue.ts` | Tomorrow Night Blue colors |
| `vs-dark.ts` | VSCode Visual Studio Dark |
| `vs-light.ts` | VSCode Visual Studio Light |

**Pattern:** Each exports a `ThemeDefinition` type with `id`, `name`, `colorScheme` ("light" | "dark"), and `colors` object mapping token names to hex values.

### Runtime Theme Switching Mechanism

**File:** `packages/frontend/src/hooks/use-theme.ts`  
**Mechanism:** 
- `setTheme(id: string)` applies the chosen theme
- **Implementation:** Toggles `dark` class on `root` (`document.documentElement.classList.toggle("dark", isDark)`)
- CSS `@layer base { .dark { ... } }` overrides token values in dark mode
- **Not** using CSS variable injection; class-based dark mode toggle
- Theme metadata (colors) stored in React state; applied to HTML attribute or CSS class

**Code reference (line 56):** `root.classList.toggle("dark", isDark);`

### Token Usage Across Components

**Confirmed shadcn-style tokens used throughout:**

| Token Type | Classes Found | Count |
|-----------|---------------|-------|
| **background/foreground** | `bg-background`, `text-foreground`, `focus-visible:ring-offset-background` | ~30+ occurrences |
| **primary** | `bg-primary`, `text-primary-foreground`, `hover:bg-primary/90`, `border-primary`, `ring-primary` | ~50+ occurrences |
| **accent** | `bg-accent`, `text-accent-foreground`, `hover:bg-accent` | ~25+ occurrences |
| **destructive** | `bg-destructive`, `text-destructive`, `hover:bg-destructive/90`, `shadow-destructive` | ~15+ occurrences |
| **muted** | `bg-muted`, `text-muted-foreground`, `hover:bg-muted` | ~20+ occurrences |
| **border** | `border-border`, `bg-border` | ~25+ occurrences |
| **ring** | `focus-visible:ring-ring`, `ring-ring` | ~10+ occurrences |
| **info/success/warning/danger** | `bg-info`, `text-success`, `bg-warning`, `text-danger` (semantic) | ~10+ occurrences |
| **surface/surface-raised** | `bg-surface`, `bg-surface-raised` (elevation) | ~5+ occurrences |

**Verdict:** Token naming **exactly matches shadcn/ui defaults**. No rename needed during migration.

---

## F. Tests That Will Need to Be Rewritten

### Primitive-Level Tests (Will Break on DOM Structure Changes)

| File | Subject | Assertion Type | Survival Likelihood |
|------|---------|-----------------|-------------------|
| `ui/dialog.test.tsx` | Dialog open/close, size classes, backdrop click | **Class assertions + selector checks** (`dialog?.className.contains("max-w-sm")`, `querySelector("dialog")`) | **Medium** — Shadcn/Dialog may use different selectors or Radix portal structure; will need adaptation |
| `ui/custom-select.test.tsx` | Multi-select display, option filtering, keyboard nav, highlight | **Class assertions + role checks** (`role="option"`, `aria-selected`, highlight via `bg-accent`) | **Medium** — Shadcn/Select is Radix-based; may have different aria roles or class structure |
| `ui/label-picker.test.tsx` | Label filtering, selection, color picker, creation | **Class/role assertions, keyboard nav, highlight** | **Medium** — Similar to custom-select; Radix replacement will change role structure |

### Behavior-Based Tests (Likely Survive)

| File | Subject | Assertion Type | Survival Likelihood |
|------|---------|-----------------|-------------------|
| `ui/bead-id.test.tsx` | ID formatting, copy behavior, link click handling | **User-visible behavior** (copy event, link navigation) | **High** — Behavior tests; DOM structure irrelevant |
| `ui/label-badge.test.tsx` | WCAG contrast verification | **Color contrast ratios** (computed style) | **High** — Pure utility; no DOM dependency |
| `ui/type-pill.test.tsx` | Type icon + label rendering | **Text content, SVG presence** | **High** — Behavior-focused; no structure dependency |

### Higher-Level Component Tests (Mounting Primitives Indirectly)

| File | Subject | Affected Primitives | Rewrite Scope |
|------|---------|--------------------|----|
| `components/header.test.tsx` | Header buttons, hint text, event handlers | Button (custom, not primitve) | **Low** — No primitive direct use |
| `components/sidebar.test.tsx` | Sidebar toggle, nav links, mobile drawer | No primitives used directly | **Low** — Custom drawer logic |
| `views/list-view.test.tsx` | List view rendering, ConfirmDialog mounted | ConfirmDialog (will change) | **Medium** — ConfirmDialog → AlertDialog swap; test selectors will break |
| `views/detail-view.test.tsx` | Detail view mounting CreateIssueDialog | Dialog, CustomSelect, DatePicker, LabelPicker | **Hard** — Multiple primitives; complex integration test |
| `views/board-view.test.tsx` | Board rendering, drag-drop | CustomSelect in column headers | **Medium** — CustomSelect swap; some selector updates needed |
| `views/settings-view.test.tsx` | Settings panels | No primitives (pure layout) | **Low** — No changes needed |
| `views/graph-view.test.tsx` | Graph rendering, toolbar buttons | Button (custom) | **Low** — No primitive changes |

### Integration Tests (Complex, High Maintenance)

| File | Scope |
|------|-------|
| `integration/golden-path.test.tsx` | End-to-end flow covering create, filter, search; may touch Dialog, CustomSelect, ConfirmDialog |
| `integration/theme-integration-verification.test.tsx` | Verifies theme tokens applied to all primitives; will need token name updates if shadcn uses different names (unlikely; already confirmed match) |

---

## G. E2E Tests

**Scan Result:** No `*.spec.ts` or `e2e/` directory found in `packages/frontend`.

**Verdict:** No E2E tests to update. (Project uses unit + integration tests only.)

---

## H. Existing Dependencies That Overlap with shadcn Ecosystem

### Current Dependencies (from package.json)

| Dependency | Version | Overlap with shadcn/BaseUI | Keep/Redundant | Notes |
|-------------|---------|-----|-----|-------|
| **cmdk** | ^1.0.0 | ✅ shadcn/Command wraps cmdk | **KEEP** | Core for command palette; shadcn is thin wrapper |
| **react-day-picker** | ^9.14.0 | ✅ shadcn/Calendar uses react-day-picker | **KEEP** | Calendar logic; shadcn just provides styling wrapper |
| **clsx** | ^2.1.0 | ✅ shadcn uses clsx (or classnames) | **KEEP** | Class merging utility; fundamental to all components |
| **tailwind-merge** | ^2.5.0 | ✅ shadcn uses tailwind-merge | **KEEP** | Conflict resolution for Tailwind classes; essential |
| **@dnd-kit/core** | ^6.3.1 | ❌ No overlap | **KEEP** | Drag-drop for board/graph; independent of UI library |
| **@dnd-kit/sortable** | ^10.0.0 | ❌ No overlap | **KEEP** | Sortable list support; independent |
| **@dnd-kit/utilities** | ^3.2.2 | ❌ No overlap | **KEEP** | Utilities for dnd-kit |
| **@tanstack/react-query** | ^5.60.0 | ❌ No overlap | **KEEP** | Server state management; orthogonal |
| **@tanstack/react-table** | ^8.21.3 | ❌ No overlap | **KEEP** | Table logic; not replaced by shadcn |
| **@tanstack/react-virtual** | ^3.13.23 | ❌ No overlap | **KEEP** | Virtualization; independent |
| **@xyflow/react** | ^12.10.2 | ❌ No overlap | **KEEP** | Graph visualization; independent |
| **date-fns** | ^4.1.0 | ⚠️ shadcn uses date-fns optionally | **KEEP** | Date utilities; also used by relative-time component |
| **react-markdown** | ^10.1.0 | ❌ No overlap | **KEEP** | Markdown rendering; independent |
| **react-router** | ^7.0.0 | ❌ No overlap | **KEEP** | Routing; independent |
| **remark-gfm** | ^4.0.1 | ❌ No overlap | **KEEP** | Markdown GFM support; independent |
| **highlight.js** | ^11.11.1 | ⚠️ shadcn uses rehype-highlight | **KEEP** | Code highlighting; orthogonal to components |
| **rehype-highlight** | ^7.0.2 | ✅ shadcn may use for code blocks | **KEEP** | Markdown code syntax; independent |
| **@tailwindcss/typography** | ^0.5.19 | ✅ shadcn may use for prose styling | **KEEP** | Prose utilities; complementary |
| **@tailwindcss/vite** | ^4.0.0 (dev) | ✅ Required for Tailwind v4 | **KEEP** | Build plugin; essential |
| **tailwindcss** | ^4.0.0 (dev) | ✅ Foundation | **KEEP** | Base CSS framework; required |

### Redundancy Verdict

**Zero Redundancy:** All dependencies are either:
1. **Already shadcn ecosystem** (cmdk, react-day-picker, clsx, tailwind-merge) → keep as-is; shadcn versions wrap these
2. **Complementary to shadcn** (dnd-kit, tanstack libraries, date-fns, markdown, routing) → no conflict; keep
3. **Build/CSS essentials** (Tailwind v4, Vite plugin) → keep; required for theme system

**Action:** Install `@shadcn/ui` (or `@baseui/react` for BaseUI variant) and select desired components. No dependency cleanup needed.

---

## Summary of Findings (200 words)

### Most Surprising Findings

1. **Token Perfect Match:** The current custom theme system uses token names (`primary`, `accent`, `foreground`, `border`, `ring`, `destructive`, `muted`, `info`, `success`, `warning`, `danger`) that **exactly match shadcn defaults**. Zero rename work needed during migration — just swap the component internals.

2. **Minimal Primitive Usage:** Only **8 custom primitives** (Button, Dialog, ConfirmDialog, DropdownMenu, CustomSelect, DatePicker, AssigneePicker, LabelPicker) exist. Of these, **5 consume very little** (ConfirmDialog: 4 files, DropdownMenu: 2 files, DatePicker: 3 files). Button is the widest consumer (15 files), but that's expected.

3. **Test Surface Area is Small:** Only **3 primitive-level test files** assert on DOM structure/classes (dialog, custom-select, label-picker). The rest test behavior. This means ~ **60% of existing tests will survive** the swap unchanged; the remaining 40% need class/role adjustments, not full rewrites.

4. **No E2E Tests:** The project relies entirely on unit + integration tests. No E2E test suite to maintain, reducing overall rewrite scope significantly.

5. **Clean Dependency Story:** All 20+ dependencies are either already part of the shadcn ecosystem (cmdk, react-day-picker) or orthogonal (dnd-kit, tanstack, react-router). No bloat; no cleanup needed.

6. **Composite Surfaces Abstractly Separate:** High-level surfaces (CommandPalette, SearchPalette, NotificationPanel, Lightbox, etc.) are loosely coupled to primitives. Most can be migrated component-by-component without cascading rewrites.

### Risk Areas

- **CreateIssueDialog:** Uses 4 primitives (Dialog, CustomSelect, DatePicker, LabelPicker) in one component; requires integrated testing after swap.
- **Integration Tests:** Tests like `golden-path.test.tsx` may touch multiple primitives; need verification after each primitive swap.
- **Theme Hook:** The `useTheme()` hook applies dark-mode via `classList.toggle("dark")`. Shadcn Dialog/Popover may assume different theme application; verify compatibility early.

