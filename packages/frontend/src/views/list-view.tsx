import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { BulkActionBar } from "@/components/issue-table/bulk-action-bar";
import { ColumnVisibilityMenu } from "@/components/issue-table/column-visibility-menu";
import { FilterBar, SHOW_ALL_FILTERS } from "@/components/issue-table/filter-bar";
import { GroupedIssueTable } from "@/components/issue-table/grouped-issue-table";
import { IssueCardList } from "@/components/issue-table/issue-card";
import { IssueTable } from "@/components/issue-table/issue-table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FilterIcon, PlusIcon } from "@/components/ui/icons";
import { type CommandAction, useCommandPaletteActions } from "@/hooks/use-command-palette";
import { useAllDependencies } from "@/hooks/use-dependencies";
import { useDetailPanel } from "@/hooks/use-detail-panel";
import { prefetchIssueDetail, useCreateIssue, useIssues } from "@/hooks/use-issues";
import { useKeyboardScope } from "@/hooks/use-keyboard-scope";
import { useIsMobile } from "@/hooks/use-media-query";
import { useSetNavList } from "@/hooks/use-nav-list";
import { useToastActions } from "@/hooks/use-toast";
import { buildApiParams, useUrlFilters } from "@/hooks/use-url-filters";
import { cn } from "@/lib/utils";
import { useListBulkActions } from "@/views/use-list-bulk-actions";
import { useListEpicHierarchy } from "@/views/use-list-epic-hierarchy";
import { useListFieldHandlers } from "@/views/use-list-field-handlers";
import { useListTableState } from "@/views/use-list-table-state";

export function ListView() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { filters, sorting, setFilters, setSorting } = useUrlFilters();
  const apiParams = useMemo(() => buildApiParams(filters, sorting), [filters, sorting]);
  const { data: issues = [], isLoading } = useIssues(apiParams);
  const { data: allDeps = [] } = useAllDependencies();

  const {
    epicProgress,
    topLevelOnly,
    setTopLevelOnly,
    expandedEpics,
    handleToggleExpand,
    tableIssues,
  } = useListEpicHierarchy(issues, allDeps);

  const isMobile = useIsMobile();
  const { openIssueId: panelIssueId, openDetail, closeDetail } = useDetailPanel();

  const navListIds = useMemo(() => tableIssues.map((i) => i.id), [tableIssues]);
  useSetNavList(navListIds);

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

  const {
    table,
    rowSelection,
    setRowSelection,
    activeRowIndex,
    setActiveRowIndex,
    highlightedIds,
    setHighlightedIds,
    selectedIds,
  } = useListTableState(
    tableIssues,
    sorting,
    setSorting,
    {
      onStatusChange: handleStatusChange,
      onPriorityChange: handlePriorityChange,
      onTitleChange: handleTitleChange,
      onAssigneeChange: handleAssigneeChange,
      onLabelsChange: handleLabelsChange,
      onDueDateChange: handleDueDateChange,
    },
    { epicProgress, expandedEpics, onToggleExpand: handleToggleExpand },
  );

  // When the detail panel/modal navigates to a different issue (e.g. via j/k while open),
  // keep the list's active row in sync so the highlight follows and the user lands on
  // the right row when they close the panel.
  useEffect(() => {
    if (!panelIssueId) return;
    const idx = tableIssues.findIndex((i) => i.id === panelIssueId);
    if (idx !== -1 && idx !== activeRowIndex) setActiveRowIndex(idx);
  }, [panelIssueId, tableIssues, activeRowIndex, setActiveRowIndex]);

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

  const [showBulkCloseConfirm, setShowBulkCloseConfirm] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const {
    isClosing,
    isDeleting,
    isUpdating,
    handleBulkClose,
    handleBulkDelete,
    handleBulkReassign,
    handleBulkReprioritize,
    handleBulkChangeStatus,
    handleBulkAddLabel,
    handleBulkRemoveLabel,
  } = useListBulkActions({ rowSelection, setRowSelection, setHighlightedIds, apiParams });

  const handleRowClick = useCallback((id: string) => openDetail(id), [openDetail]);
  const handleRowHover = useCallback(
    (id: string) => prefetchIssueDetail(queryClient, id),
    [queryClient],
  );
  const handleClearSelection = useCallback(() => setRowSelection({}), [setRowSelection]);

  const keyBindings = useMemo(
    () => [
      {
        key: "j",
        handler: () => setActiveRowIndex((prev) => Math.min(prev + 1, tableIssues.length - 1)),
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
          const rows = table.getRowModel().rows;
          if (activeRowIndex >= 0 && activeRowIndex < rows.length) {
            handleRowClick(rows[activeRowIndex].original.id);
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
          const rows = table.getRowModel().rows;
          if (activeRowIndex >= 0 && activeRowIndex < rows.length) {
            const id = rows[activeRowIndex].original.id;
            setRowSelection((prev) => ({ ...prev, [id]: !prev[id] }));
          }
        },
        description: "Toggle row selection",
      },
    ],
    [tableIssues, activeRowIndex, handleRowClick, table, setActiveRowIndex, setRowSelection],
  );
  useKeyboardScope("list", keyBindings);

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
          const sel: Record<string, boolean> = {};
          for (const issue of issues) sel[issue.id] = true;
          setRowSelection(sel);
        },
      },
    ],
    [issues, setFilters, setRowSelection],
  );
  useCommandPaletteActions("list-view", paletteActions);

  return (
    <div className="flex flex-col h-full w-full">
      <div className="shrink-0 bg-muted/30 px-4 py-3 space-y-2">
        <div className={cn("flex items-start gap-4", isMobile ? "flex-col" : "justify-between")}>
          <FilterBar
            filters={filters}
            onChange={setFilters}
            searchInputRef={searchInputRef}
            trailingSlot={isMobile ? undefined : <ColumnVisibilityMenu table={table} />}
          />
          {!isMobile && (
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setTopLevelOnly((prev) => !prev)}
                className={`inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded border px-3 text-xs font-medium transition-colors ${
                  topLevelOnly
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
                aria-pressed={topLevelOnly}
              >
                <FilterIcon size={12} />
                Top-level only
              </button>
            </div>
          )}
        </div>
        {!isMobile && (
          <BulkActionBar
            selectedCount={selectedIds.length}
            onClose={() => setShowBulkCloseConfirm(true)}
            onDelete={() => setShowBulkDeleteConfirm(true)}
            onClearSelection={handleClearSelection}
            onReassign={handleBulkReassign}
            onReprioritize={handleBulkReprioritize}
            onChangeStatus={handleBulkChangeStatus}
            onAddLabel={handleBulkAddLabel}
            onRemoveLabel={handleBulkRemoveLabel}
            isClosing={isClosing}
            isDeleting={isDeleting}
            isUpdating={isUpdating}
          />
        )}
      </div>

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
              type="button"
              onClick={handleQuickAdd}
              disabled={createMutation.isPending}
              className="inline-flex h-7 items-center gap-1 rounded bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50"
            >
              <PlusIcon size={12} />
              {createMutation.isPending ? "Creating..." : "Create"}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {isMobile ? (
          <IssueCardList issues={tableIssues} isLoading={isLoading} onCardClick={handleRowClick} />
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

      <ConfirmDialog
        isOpen={showBulkDeleteConfirm}
        onConfirm={() => {
          setShowBulkDeleteConfirm(false);
          handleBulkDelete();
        }}
        onCancel={() => setShowBulkDeleteConfirm(false)}
        title="Delete selected issues permanently?"
        description={`This will permanently delete ${selectedIds.length} issue${selectedIds.length !== 1 ? "s" : ""} and remove all their dependency links. This cannot be undone.`}
        confirmLabel={`Delete ${selectedIds.length} Issue${selectedIds.length !== 1 ? "s" : ""}`}
        isPending={isDeleting}
      />
    </div>
  );
}
