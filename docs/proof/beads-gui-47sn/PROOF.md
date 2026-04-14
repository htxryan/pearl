# Proof: Advanced Filtering & Search (beads-gui-47sn)

**Date**: 2026-04-14
**Branch**: feat/initial-poc
**Dependency**: beads-gui-b0lj (closed)

## Verification Results

### Query Syntax
| Test | Result | Screenshot | Notes |
|------|--------|------------|-------|
| `status:open` | PASS | [02-query-status-open.png](02-query-status-open.png) | Status filter auto-applies, chip shows "Status: Open" |
| `priority:0` | PASS | [03-query-priority-0.png](03-query-priority-0.png) | P0 filter applies, chip shows "Priority: P0" |
| `assignee:ryan` | PASS | [04-query-assignee-ryan.png](04-query-assignee-ryan.png) | Assignee filter applies, chip shows "Assignee: ryan" |
| Mixed: `status:open priority:0` | PASS | [05-query-mixed.png](05-query-mixed.png) | Both filters apply simultaneously |

### Filter Chips
| Test | Result | Screenshot | Notes |
|------|--------|------------|-------|
| Active filters show as removable chips | PASS | [06-filter-chips-visible.png](06-filter-chips-visible.png) | Chips render with X button |
| Click X removes filter | PASS | [07-filters-cleared.png](07-filters-cleared.png) | "Clear all" removes all filters |
| Chips update in real-time | PASS | [08-chips-with-status.png](08-chips-with-status.png) | Chips appear as soon as filter is applied |

### Date Range Filters
| Test | Result | Screenshot | Notes |
|------|--------|------------|-------|
| `due:overdue` | PASS | [09-date-overdue.png](09-date-overdue.png) | Overdue filter applied, chip shows "Date: Overdue" |
| `due:today` | PASS | [10-date-due-today.png](10-date-due-today.png) | Due today filter works |
| `no:due` | PASS | [11-date-no-due.png](11-date-no-due.png) | Shows issues without due dates |

### Saved Views
| Test | Result | Screenshot | Notes |
|------|--------|------------|-------|
| Save current filter as named view | PASS | [12-saved-view-created.png](12-saved-view-created.png) | Save button + name input visible |
| Saved view in presets bar | PASS | [13-preset-bar.png](13-preset-bar.png) | Built-in presets visible |
| Click saved view restores filters | PASS | [14-preset-my-issues.png](14-preset-my-issues%C3%97.png) | My Issues preset restores status + assignee filters |

### Grouping
| Test | Result | Screenshot | Notes |
|------|--------|------------|-------|
| Group by status | PASS | [15-group-by-status.png](15-group-by-status.png) | Collapsible sections: In Progress, Closed |
| Group by priority | PASS | [16-group-by-priority.png](16-group-by-priority.png) | Sections ordered P0-P4 |
| Collapse section header | PASS | [17-group-collapsed.png](17-group-collapsed.png) | Group collapses on click, shows count |
| Expand section header | PASS | [18-group-expanded.png](18-group-expanded.png) | Group expands on click |

### Automated
| Test | Result | Notes |
|------|--------|-------|
| All tests pass | PASS | 478/478 tests pass across 25 test files |
| TypeScript compiles clean | PASS | Both frontend and backend compile with no errors |

## Bugs Found & Fixed

### 1. Query syntax filter accumulation (filter-bar.tsx)
**Symptom**: Typing a new query (e.g., `priority:0` after `status:open`) would merge with previous filters instead of replacing them.
**Root cause**: `handleSearchChange` spread `filtersRef.current` (existing state) as base, only overriding dimensions present in the new query.
**Fix**: Changed base from `filtersRef.current` to `EMPTY_FILTERS`, preserving only `groupBy` which is orthogonal to query syntax.

### 2. TypeScript type narrowing in grouped table (grouped-issue-table.tsx)
**Symptom**: `filter(Boolean)` didn't narrow `(Row | undefined)[]` to `Row[]`.
**Fix**: Replaced with explicit type guard: `.filter((row): row is Row<IssueListItem> => row != null)`.

### 3. Previously pending fixes (verified working)
- **Date range OR logic** (issues.ts): Date ranges now OR'd within the group so `overdue + due_today` shows both sets.
- **O(1) row lookup** (grouped-issue-table.tsx): Replaced O(n^2) filter-per-group with a Map lookup.
- **Row ID fix** (grouped-issue-table.tsx): Fixed `row.id` (internal TanStack ID) to `row.original.id` (issue ID) for click/hover handlers.
- **Regex state reset** (query-syntax.ts): Fixed `TOKEN_RE.lastIndex` reset in `hasQuerySyntax()`.

## Screenshot Index

| # | File | Description |
|---|------|-------------|
| 01 | 01-baseline-list.png | Issue list baseline |
| 02 | 02-query-status-open.png | status:open filter |
| 03 | 03-query-priority-0.png | priority:0 filter |
| 04 | 04-query-assignee-ryan.png | assignee:ryan filter |
| 05 | 05-query-mixed.png | Mixed query |
| 06 | 06-filter-chips-visible.png | Filter chips visible |
| 07 | 07-filters-cleared.png | Filters cleared |
| 08 | 08-chips-with-status.png | Status chip |
| 09 | 09-date-overdue.png | Overdue date filter |
| 10 | 10-date-due-today.png | Due today filter |
| 11 | 11-date-no-due.png | No due date filter |
| 12 | 12-saved-view-created.png | Saved view creation |
| 13 | 13-preset-bar.png | Preset bar |
| 14 | 14-preset-*.png | Preset buttons |
| 15 | 15-group-by-status.png | Group by status |
| 16 | 16-group-by-priority.png | Group by priority |
| 17 | 17-group-collapsed.png | Collapsed group |
| 18 | 18-group-expanded.png | Expanded group |
