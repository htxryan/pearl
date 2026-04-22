import { useQueryClient } from "@tanstack/react-query";
import {
  type ColumnOrderState,
  type ColumnSizingState,
  getCoreRowModel,
  getSortedRowModel,
  type RowSelectionState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { BulkActionBar } from "@/components/issue-table/bulk-action-bar";
import { ColumnVisibilityMenu } from "@/components/issue-table/column-visibility-menu";
import { buildColumns } from "@/components/issue-table/columns";
import { FilterBar, SHOW_ALL_FILTERS } from "@/components/issue-table/filter-bar";
import { GroupedIssueTable } from "@/components/issue-table/grouped-issue-table";
import { IssueCardList } from "@/components/issue-table/issue-card";
import { IssueTable } from "@/components/issue-table/issue-table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { type CommandAction, useCommandPaletteActions } from "@/hooks/use-command-palette";
import { useAllDependencies } from "@/hooks/use-dependencies";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { prefetchIssueDetail, useCreateIssue, useIssues } from "@/hooks/use-issues";
import { useKeyboardScope } from "@/hooks/use-keyboard-scope";
import { useIsCompact, useIsMobile } from "@/hooks/use-media-query";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { useToastActions } from "@/hooks/use-toast";
import { buildApiParams, useUrlFilters } from "@/hooks/use-url-filters";
import { cn } from "@/lib/utils";
import { ListPanelOverlay, ListSidePanel } from "@/views/list-panel-overlay";
import { useListBulkActions } from "@/views/use-list-bulk-actions";
import { useListEpicHierarchy } from "@/views/use-list-epic-hierarchy";
import { useListFieldHandlers } from "@/views/use-list-field-handlers";

export function ListView() {
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const queryClient = useQueryClient();

  // URL-synced filter & sort state
  const { filters, sorting, setFilters, setSorting } = useUrlFilters();

  // Build API params from filter state
  const apiParams = useMemo(() => buildApiParams(filters, sorting), [filters, sorting]);

  // Data fetching
  const { data: issues = [], isLoading } = useIssues(apiParams);

  // All dependencies (for epic hierarchy)
  const { data: allDeps = [] } = useAllDependencies();

  // Epic hierarchy: progress, top-level filtering, expanded epics
  const {
    epicProgress,
    topLevelOnly,
    setTopLevelOnly,
    expandedEpics,
    handleToggleExpand,
    tableIssues,
  } = useListEpicHierarchy(issues, allDeps);

  // Responsive hooks
  const isMobile = useIsMobile();
  const isCompact = useIsCompact();

  // Split-pane detail panel
  const [panelIssueId, setPanelIssueId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = usePersistedState<boolean>("beads:panel-mode", false);

  // Mutations
  const {
    updateMutation,
    handleStatusChange,
    handlePriorityChange,
    handleTitleChange,
    handleAssigneeChange,
    handleLabelsChange,
    handleDueDateChange,
  } = useListFieldHandlers(issues);
  const createMutation = useCreateIssue();
  const toast = useToastActions();

  // Quick-add state
  const [quickAddTitle, setQuickAddTitle] = useState("");
  const quickAddRef = useRef<HTMLInputElement>(null);

  const handleQuickAdd = useCallback(() => {
    const title = quickAddTitle.trim();
    if (!title) return;
    setQuickAddTitle("");
    createMutation.mutate(
      { title },
      {
        onSuccess: (response) => {
          toast.success(`Created "${title}"`);
          if (response.data) navigate(`/issues/${response.data.id}`);
        },
        onError: () => {
          toast.error("Failed to create issue.");
          setQuickAddTitle(title);
        },
      },
    );
  }, [quickAddTitle, createMutation, toast, navigate]);

  // Table state
  const COL_VIS_DEFAULTS: VisibilityState = useMemo(() => ({ has_attachments: false }), []);
  const [rawColumnVisibility, setColumnVisibility] = usePersistedState<VisibilityState>(
    "beads:col-visibility",
    COL_VIS_DEFAULTS,
  );
  const columnVisibility = useMemo(
    () => ({ ...COL_VIS_DEFAULTS, ...rawColumnVisibility }),
    [COL_VIS_DEFAULTS, rawColumnVisibility],
  );
  const [columnOrder, setColumnOrder] = usePersistedState<ColumnOrderState>("beads:col-order", []);
  const [columnSizing, setColumnSizing] = usePersistedState<ColumnSizingState>(
    "beads:col-sizing",
    {},
  );
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [activeRowIndex, setActiveRowIndex] = useState(-1);
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());

  // Clear highlight after 3 seconds
  useEffect(() => {
    if (highlightedIds.size === 0) return;
    const timer = setTimeout(() => setHighlightedIds(new Set()), 3000);
    return () => clearTimeout(timer);
  }, [highlightedIds]);

  // Clamp activeRowIndex when issues list changes
  useEffect(() => {
    setActiveRowIndex((prev) => {
      if (prev < 0) return prev;
      if (issues.length === 0) return -1;
      return Math.min(prev, issues.length - 1);
    });
  }, [issues]);

  // Bulk action state
  const [showBulkCloseConfirm, setShowBulkCloseConfirm] = useState(false);

  const selectedIds = Object.keys(rowSelection).filter((k) => rowSelection[k]);

  // Bulk actions hook
  const {
    isClosing,
    isUpdating,
    handleBulkClose,
    handleBulkReassign,
    handleBulkReprioritize,
    handleBulkChangeStatus,
    handleBulkAddLabel,
    handleBulkRemoveLabel,
  } = useListBulkActions({
    rowSelection,
    setRowSelection,
    setHighlightedIds,
    apiParams,
  });

  // Handlers
  const handleRowClick = useCallback(
    (id: string) => {
      if (panelMode) {
        setPanelIssueId(id);
      } else {
        navigate(`/issues/${id}`, { state: { from: "/list" } });
      }
    },
    [navigate, panelMode],
  );

  const handleRowHover = useCallback(
    (id: string) => {
      prefetchIssueDetail(queryClient, id);
    },
    [queryClient],
  );

  const handleClearSelection = useCallback(() => {
    setRowSelection({});
  }, []);

  // Build columns and table instance
  const columns = useMemo(
    () =>
      buildColumns({
        onStatusChange: handleStatusChange,
        onPriorityChange: handlePriorityChange,
        onTitleChange: handleTitleChange,
        onAssigneeChange: handleAssigneeChange,
        onLabelsChange: handleLabelsChange,
        onDueDateChange: handleDueDateChange,
        epicProgress,
        expandedEpics,
        onToggleExpand: handleToggleExpand,
      }),
    [
      handleStatusChange,
      handlePriorityChange,
      handleTitleChange,
      handleAssigneeChange,
      handleLabelsChange,
      handleDueDateChange,
      epicProgress,
      expandedEpics,
      handleToggleExpand,
    ],
  );

  const table = useReactTable({
    data: tableIssues,
    columns,
    state: {
      sorting,
      columnVisibility,
      columnOrder,
      columnSizing,
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
    onColumnSizingChange: (updater) => {
      const next = typeof updater === "function" ? updater(columnSizing) : updater;
      setColumnSizing(next);
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
        handler: () => setActiveRowIndex((prev) => Math.min(prev + 1, issues.length - 1)),
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
        handler: () => setFilters(SHOW_ALL_FILTERS),
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

  // On compact viewports (<1024px), panel is a slide-over overlay instead of side-by-side
  const panelIsOverlay = isCompact;

  // Focus trap for slide-over overlay panel
  const slideOverRef = useRef<HTMLDivElement>(null);
  const slideOverActive = !!(panelMode && panelIssueId && panelIsOverlay);
  useFocusTrap(slideOverRef, slideOverActive);

  // Force panelMode off on mobile
  useEffect(() => {
    if (isMobile && panelMode) setPanelMode(false);
  }, [isMobile, panelMode, setPanelMode]);

  return (
    <div className="flex h-full relative">
      {/* Main list area */}
      <div
        className={cn(
          "flex flex-col",
          panelIssueId && panelMode && !panelIsOverlay ? "flex-1 min-w-0" : "w-full",
        )}
      >
        {/* Toolbar */}
        <div className="shrink-0 bg-muted/30 px-4 py-3 space-y-2">
          <div className={cn("flex items-start gap-4", isMobile ? "flex-col" : "justify-between")}>
            <FilterBar filters={filters} onChange={setFilters} searchInputRef={searchInputRef} />
            {!isMobile && (
              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => setTopLevelOnly((prev) => !prev)}
                  className={`h-8 whitespace-nowrap rounded border px-3 text-xs font-medium transition-colors ${
                    topLevelOnly
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                  aria-pressed={topLevelOnly}
                >
                  Top-level only
                </button>
                <button
                  onClick={() => {
                    setPanelMode((prev) => !prev);
                    if (!panelMode) setPanelIssueId(null);
                  }}
                  className={`h-8 whitespace-nowrap rounded border px-3 text-xs font-medium transition-colors ${
                    panelMode
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                  aria-pressed={panelMode}
                  title="Toggle split-pane detail panel"
                >
                  Panel
                </button>
                <ColumnVisibilityMenu table={table} />
              </div>
            )}
          </div>
          {!isMobile && (
            <BulkActionBar
              selectedCount={selectedIds.length}
              onClose={() => setShowBulkCloseConfirm(true)}
              onClearSelection={handleClearSelection}
              onReassign={handleBulkReassign}
              onReprioritize={handleBulkReprioritize}
              onChangeStatus={handleBulkChangeStatus}
              onAddLabel={handleBulkAddLabel}
              onRemoveLabel={handleBulkRemoveLabel}
              isClosing={isClosing}
              isUpdating={isUpdating}
            />
          )}
        </div>

        {/* Quick-add */}
        <div className="shrink-0 bg-muted/20 px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">+</span>
            <input
              ref={quickAddRef}
              value={quickAddTitle}
              onChange={(e) => setQuickAddTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleQuickAdd();
                }
                if (e.key === "Escape") {
                  setQuickAddTitle("");
                  quickAddRef.current?.blur();
                }
              }}
              placeholder="Quick add issue... (Enter to create)"
              disabled={createMutation.isPending}
              className="flex-1 h-8 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
              aria-label="Quick add issue"
            />
            {quickAddTitle.trim() && (
              <button
                onClick={handleQuickAdd}
                disabled={createMutation.isPending}
                className="h-7 rounded bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50"
              >
                {createMutation.isPending ? "Creating..." : "Create"}
              </button>
            )}
          </div>
        </div>

        {/* Table (desktop) or Card List (mobile) */}
        <div className="flex-1 overflow-auto">
          {isMobile ? (
            <IssueCardList
              issues={tableIssues}
              isLoading={isLoading}
              onCardClick={handleRowClick}
            />
          ) : filters.groupBy ? (
            <GroupedIssueTable
              issues={tableIssues}
              groupBy={filters.groupBy}
              table={table}
              isLoading={isLoading}
              onRowClick={handleRowClick}
              onRowHover={handleRowHover}
              highlightedIds={highlightedIds}
            />
          ) : (
            <IssueTable
              table={table}
              isLoading={isLoading}
              activeRowIndex={activeRowIndex}
              onRowClick={handleRowClick}
              onRowHover={handleRowHover}
              highlightedIds={highlightedIds}
            />
          )}
        </div>
      </div>

      {/* Split-pane detail panel — desktop side panel */}
      {panelMode && panelIssueId && !panelIsOverlay && (
        <ListSidePanel panelIssueId={panelIssueId} onClose={() => setPanelIssueId(null)} />
      )}

      {/* Slide-over overlay for tablet/mobile */}
      {panelMode && panelIssueId && panelIsOverlay && (
        <ListPanelOverlay
          panelIssueId={panelIssueId}
          slideOverRef={slideOverRef}
          onClose={() => setPanelIssueId(null)}
        />
      )}

      <ConfirmDialog
        isOpen={showBulkCloseConfirm}
        onConfirm={() => {
          setShowBulkCloseConfirm(false);
          handleBulkClose();
        }}
        onCancel={() => setShowBulkCloseConfirm(false)}
        title="Close selected issues?"
        description={`Are you sure you want to close ${selectedIds.length} issue${selectedIds.length !== 1 ? "s" : ""}? This can be undone.`}
        confirmLabel={`Close ${selectedIds.length} Issue${selectedIds.length !== 1 ? "s" : ""}`}
      />
    </div>
  );
}
