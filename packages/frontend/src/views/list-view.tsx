import { useState, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router";
import type {
  VisibilityState,
  ColumnOrderState,
  RowSelectionState,
} from "@tanstack/react-table";
import type { IssueStatus, Priority } from "@beads-gui/shared";
import { IssueTable } from "@/components/issue-table/issue-table";
import { FilterBar } from "@/components/issue-table/filter-bar";
import { BulkActionBar } from "@/components/issue-table/bulk-action-bar";
import { useIssues, useUpdateIssue, useCloseIssue } from "@/hooks/use-issues";
import { useKeyboardScope } from "@/hooks/use-keyboard-scope";
import { useCommandPaletteActions, type CommandAction } from "@/hooks/use-command-palette";
import { useUrlFilters, buildApiParams } from "@/hooks/use-url-filters";

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
      updateMutation.mutate({ id, data: { status } });
    },
    [updateMutation],
  );

  const handlePriorityChange = useCallback(
    (id: string, priority: Priority) => {
      updateMutation.mutate({ id, data: { priority } });
    },
    [updateMutation],
  );

  const handleBulkClose = useCallback(async () => {
    if (selectedIds.length === 0) return;
    setIsClosing(true);
    try {
      // Close all selected issues
      await Promise.all(
        selectedIds.map((id) => closeMutation.mutateAsync({ id })),
      );
      // Highlight newly-unblocked after close
      setHighlightedIds(new Set(selectedIds));
      setTimeout(() => setHighlightedIds(new Set()), 3000);
      setRowSelection({});
    } finally {
      setIsClosing(false);
    }
  }, [selectedIds, closeMutation]);

  const handleClearSelection = useCallback(() => {
    setRowSelection({});
  }, []);

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
        <FilterBar
          filters={filters}
          onChange={setFilters}
          searchInputRef={searchInputRef}
        />
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
          data={issues}
          isLoading={isLoading}
          sorting={sorting}
          onSortingChange={setSorting}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
          columnOrder={columnOrder}
          onColumnOrderChange={setColumnOrder}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          activeRowIndex={activeRowIndex}
          onRowClick={handleRowClick}
          onStatusChange={handleStatusChange}
          onPriorityChange={handlePriorityChange}
          highlightedIds={highlightedIds}
        />
      </div>
    </div>
  );
}
