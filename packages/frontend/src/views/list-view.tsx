import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type VisibilityState,
  type ColumnOrderState,
  type RowSelectionState,
} from "@tanstack/react-table";
import type { IssueStatus, Priority } from "@beads-gui/shared";
import { IssueTable } from "@/components/issue-table/issue-table";
import { FilterBar } from "@/components/issue-table/filter-bar";
import { BulkActionBar } from "@/components/issue-table/bulk-action-bar";
import { ColumnVisibilityMenu } from "@/components/issue-table/column-visibility-menu";
import { buildColumns } from "@/components/issue-table/columns";
import { useIssues, useUpdateIssue, useCloseIssue } from "@/hooks/use-issues";
import { useKeyboardScope } from "@/hooks/use-keyboard-scope";
import { useCommandPaletteActions, type CommandAction } from "@/hooks/use-command-palette";
import { useUrlFilters, buildApiParams } from "@/hooks/use-url-filters";

const VALID_STATUSES = new Set<string>(["open", "in_progress", "closed", "blocked", "deferred"]);
const VALID_PRIORITIES = new Set<number>([0, 1, 2, 3, 4]);

export function ListView() {
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // URL-synced filter & sort state
  const { filters, sorting, setFilters, setSorting } = useUrlFilters();

  // Build API params from filter state
  const apiParams = useMemo(
    () => buildApiParams(filters, sorting),
    [filters, sorting],
  );

  // Data fetching
  const { data: issues = [], isLoading } = useIssues(apiParams);

  // Mutations
  const updateMutation = useUpdateIssue();
  const closeMutation = useCloseIssue();

  // Table state
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [activeRowIndex, setActiveRowIndex] = useState(-1);
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());

  // Clear highlight after 3 seconds
  useEffect(() => {
    if (highlightedIds.size === 0) return;
    const timer = setTimeout(() => setHighlightedIds(new Set()), 3000);
    return () => clearTimeout(timer);
  }, [highlightedIds]);

  // Bulk close state
  const [isClosing, setIsClosing] = useState(false);

  const selectedIds = Object.keys(rowSelection).filter((k) => rowSelection[k]);

  // Handlers
  const handleRowClick = useCallback(
    (id: string) => {
      navigate(`/issues/${id}`);
    },
    [navigate],
  );

  const handleStatusChange = useCallback(
    (id: string, status: IssueStatus) => {
      if (!VALID_STATUSES.has(status)) return;
      updateMutation.mutate({ id, data: { status } });
    },
    [updateMutation],
  );

  const handlePriorityChange = useCallback(
    (id: string, priority: Priority) => {
      if (!VALID_PRIORITIES.has(priority)) return;
      updateMutation.mutate({ id, data: { priority } });
    },
    [updateMutation],
  );

  const handleBulkClose = useCallback(async () => {
    if (selectedIds.length === 0) return;
    setIsClosing(true);
    try {
      const results = await Promise.allSettled(
        selectedIds.map((id) => closeMutation.mutateAsync({ id })),
      );
      const failed = results.filter((r) => r.status === "rejected");
      if (failed.length > 0) {
        console.error(`Failed to close ${failed.length} of ${selectedIds.length} issues`);
      }
      // Highlight successfully-closed issues
      const closedIds = selectedIds.filter((_, i) => results[i].status === "fulfilled");
      setHighlightedIds(new Set(closedIds));
      setRowSelection({});
    } finally {
      setIsClosing(false);
    }
  }, [selectedIds, closeMutation]);

  const handleClearSelection = useCallback(() => {
    setRowSelection({});
  }, []);

  // Build columns and table instance
  const columns = useMemo(
    () => buildColumns({ onStatusChange: handleStatusChange, onPriorityChange: handlePriorityChange }),
    [handleStatusChange, handlePriorityChange],
  );

  const table = useReactTable({
    data: issues,
    columns,
    state: {
      sorting,
      columnVisibility,
      columnOrder,
      rowSelection,
    },
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      setSorting(next);
    },
    onColumnVisibilityChange: (updater) => {
      const next = typeof updater === "function" ? updater(columnVisibility) : updater;
      setColumnVisibility(next);
    },
    onColumnOrderChange: (updater) => {
      const next = typeof updater === "function" ? updater(columnOrder) : updater;
      setColumnOrder(next);
    },
    onRowSelectionChange: (updater) => {
      const next = typeof updater === "function" ? updater(rowSelection) : updater;
      setRowSelection(next);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    enableRowSelection: true,
    enableMultiSort: true,
    getRowId: (row) => row.id,
  });

  // Keyboard navigation
  const keyBindings = useMemo(
    () => [
      {
        key: "j",
        handler: () =>
          setActiveRowIndex((prev) => Math.min(prev + 1, issues.length - 1)),
        description: "Move to next row",
      },
      {
        key: "k",
        handler: () => setActiveRowIndex((prev) => Math.max(prev - 1, 0)),
        description: "Move to previous row",
      },
      {
        key: "Enter",
        handler: () => {
          if (activeRowIndex >= 0 && activeRowIndex < issues.length) {
            handleRowClick(issues[activeRowIndex].id);
          }
        },
        description: "Open selected issue",
      },
      {
        key: "/",
        handler: () => searchInputRef.current?.focus(),
        description: "Focus search",
      },
      {
        key: "x",
        handler: () => {
          if (activeRowIndex >= 0 && activeRowIndex < issues.length) {
            const id = issues[activeRowIndex].id;
            setRowSelection((prev) => ({ ...prev, [id]: !prev[id] }));
          }
        },
        description: "Toggle row selection",
      },
    ],
    [issues, activeRowIndex, handleRowClick],
  );

  useKeyboardScope("list", keyBindings);

  // Command palette actions
  const paletteActions: CommandAction[] = useMemo(
    () => [
      {
        id: "list-focus-search",
        label: "Focus search",
        shortcut: "/",
        group: "List",
        handler: () => searchInputRef.current?.focus(),
      },
      {
        id: "list-clear-filters",
        label: "Clear all filters",
        group: "List",
        handler: () => setFilters({ status: [], priority: [], issue_type: [], assignee: "", search: "" }),
      },
      {
        id: "list-select-all",
        label: "Select all visible issues",
        group: "List",
        handler: () => {
          const sel: RowSelectionState = {};
          for (const issue of issues) sel[issue.id] = true;
          setRowSelection(sel);
        },
      },
    ],
    [issues, setFilters],
  );

  useCommandPaletteActions("list-view", paletteActions);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="shrink-0 border-b border-border px-4 py-3 space-y-2">
        <div className="flex items-start justify-between gap-4">
          <FilterBar
            filters={filters}
            onChange={setFilters}
            searchInputRef={searchInputRef}
          />
          <ColumnVisibilityMenu table={table} />
        </div>
        <BulkActionBar
          selectedCount={selectedIds.length}
          onClose={handleBulkClose}
          onClearSelection={handleClearSelection}
          isClosing={isClosing}
        />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <IssueTable
          table={table}
          isLoading={isLoading}
          activeRowIndex={activeRowIndex}
          onRowClick={handleRowClick}
          highlightedIds={highlightedIds}
        />
      </div>
    </div>
  );
}
