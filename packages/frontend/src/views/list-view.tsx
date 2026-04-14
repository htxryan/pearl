import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type VisibilityState,
  type ColumnOrderState,
  type ColumnSizingState,
  type RowSelectionState,
} from "@tanstack/react-table";
import type { IssueStatus, Priority } from "@beads-gui/shared";
import { IssueTable } from "@/components/issue-table/issue-table";
import { FilterBar, GROUP_BY_LABELS, type GroupByField } from "@/components/issue-table/filter-bar";
import { BulkActionBar } from "@/components/issue-table/bulk-action-bar";
import { GroupedIssueTable } from "@/components/issue-table/grouped-issue-table";
import { ColumnVisibilityMenu } from "@/components/issue-table/column-visibility-menu";
import { buildColumns, type EpicProgress } from "@/components/issue-table/columns";
import { useIssues, useUpdateIssue, useCloseIssue, useCreateIssue, issueKeys, prefetchIssueDetail } from "@/hooks/use-issues";
import { useAllDependencies } from "@/hooks/use-dependencies";
import { useQueryClient } from "@tanstack/react-query";
import type { IssueListItem } from "@beads-gui/shared";
import * as api from "@/lib/api-client";
import { useKeyboardScope } from "@/hooks/use-keyboard-scope";
import { useCommandPaletteActions, type CommandAction } from "@/hooks/use-command-palette";
import { useUrlFilters, buildApiParams, VALID_STATUSES, VALID_PRIORITIES } from "@/hooks/use-url-filters";
import { useToastActions } from "@/hooks/use-toast";
import { useUndoActions } from "@/hooks/use-undo";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { IssuePanel } from "@/components/issue-table/issue-panel";
import { IssueCardList } from "@/components/issue-table/issue-card";
import { useIsMobile, useIsCompact } from "@/hooks/use-media-query";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { cn } from "@/lib/utils";

export function ListView() {
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const queryClient = useQueryClient();

  // URL-synced filter & sort state
  const { filters, sorting, setFilters, setSorting } = useUrlFilters();

  // Build API params from filter state
  const apiParams = useMemo(
    () => buildApiParams(filters, sorting),
    [filters, sorting],
  );

  // Data fetching
  const { data: issues = [], isLoading } = useIssues(apiParams);

  // All dependencies (for epic hierarchy)
  const { data: allDeps = [] } = useAllDependencies();

  // Compute epic progress from dependency graph
  const epicProgress = useMemo(() => {
    const map = new Map<string, EpicProgress>();
    const issueStatusMap = new Map(issues.map((i) => [i.id, i.status]));

    // Only "contains" type dependencies represent parent-child (epic hierarchy).
    // Other dependency types (blocks, depends_on, relates_to) are prerequisites, not children.
    const epicIds = new Set(issues.filter((i) => i.issue_type === "epic").map((i) => i.id));

    for (const dep of allDeps) {
      if (dep.type === "contains" && epicIds.has(dep.issue_id) && dep.depends_on_id !== dep.issue_id) {
        const existing = map.get(dep.issue_id) ?? { done: 0, total: 0, childIds: [] };
        existing.childIds.push(dep.depends_on_id);
        existing.total += 1;
        const childStatus = issueStatusMap.get(dep.depends_on_id);
        if (childStatus === "closed") existing.done += 1;
        map.set(dep.issue_id, existing);
      }
    }

    return map;
  }, [issues, allDeps]);

  // Compute child IDs (issues that are children of any epic)
  const childIssueIds = useMemo(() => {
    const ids = new Set<string>();
    for (const progress of epicProgress.values()) {
      for (const childId of progress.childIds) ids.add(childId);
    }
    return ids;
  }, [epicProgress]);

  // Top-level only filter
  const [topLevelOnly, setTopLevelOnly] = useState(false);

  // Responsive hooks
  const isMobile = useIsMobile();
  const isCompact = useIsCompact();

  // Split-pane detail panel
  const [panelIssueId, setPanelIssueId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = usePersistedState<boolean>("beads:panel-mode", false);

  // Expanded epics for inline children
  const [expandedEpics, setExpandedEpics] = useState<Set<string>>(new Set());

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedEpics((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Filter issues for top-level only
  const displayIssues = useMemo(() => {
    if (!topLevelOnly) return issues;
    return issues.filter((i) => !childIssueIds.has(i.id));
  }, [issues, topLevelOnly, childIssueIds]);

  // Build expanded list with inline children
  const tableIssues = useMemo(() => {
    // In default mode, collect children of expanded epics so we can skip them
    // at their original position and re-insert them directly after their epic
    const expandedChildIds = new Set<string>();
    if (!topLevelOnly) {
      for (const epicId of expandedEpics) {
        const progress = epicProgress.get(epicId);
        if (progress) {
          for (const childId of progress.childIds) expandedChildIds.add(childId);
        }
      }
    }

    const result: IssueListItem[] = [];
    for (const issue of displayIssues) {
      // Skip children that will be inserted after their expanded epic
      if (expandedChildIds.has(issue.id)) continue;

      result.push(issue);
      // If this epic is expanded, insert its children right after
      if (expandedEpics.has(issue.id)) {
        const progress = epicProgress.get(issue.id);
        if (progress) {
          const childItems = issues.filter((i) => progress.childIds.includes(i.id));
          result.push(...childItems);
        }
      }
    }
    return result;
  }, [displayIssues, expandedEpics, epicProgress, issues, topLevelOnly]);

  // Mutations
  const updateMutation = useUpdateIssue();
  const closeMutation = useCloseIssue();
  const createMutation = useCreateIssue();
  const toast = useToastActions();
  const undo = useUndoActions();

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
          setQuickAddTitle(title); // Restore the title
        },
      },
    );
  }, [quickAddTitle, createMutation, toast, navigate]);

  // Table state
  const [columnVisibility, setColumnVisibility] = usePersistedState<VisibilityState>("beads:col-visibility", {});
  const [columnOrder, setColumnOrder] = usePersistedState<ColumnOrderState>("beads:col-order", []);
  const [columnSizing, setColumnSizing] = usePersistedState<ColumnSizingState>("beads:col-sizing", {});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const rowSelectionRef = useRef(rowSelection);
  rowSelectionRef.current = rowSelection;
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
  const [isClosing, setIsClosing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showBulkCloseConfirm, setShowBulkCloseConfirm] = useState(false);

  const selectedIds = Object.keys(rowSelection).filter((k) => rowSelection[k]);

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

  const handleStatusChange = useCallback(
    (id: string, status: IssueStatus) => {
      if (!VALID_STATUSES.has(status)) return;
      const issue = issues.find((i) => i.id === id);
      const oldStatus = issue?.status ?? "open";
      updateMutation.mutate(
        { id, data: { status } },
        {
          onSuccess: () => {
            undo.recordStatusChange(id, issue?.title ?? id, oldStatus, status);
          },
          onError: () => {
            toast.error(`Failed to update status for "${issue?.title ?? id}"`);
          },
        },
      );
    },
    [updateMutation, issues, undo, toast],
  );

  const handlePriorityChange = useCallback(
    (id: string, priority: Priority) => {
      if (!VALID_PRIORITIES.has(priority)) return;
      const issue = issues.find((i) => i.id === id);
      updateMutation.mutate(
        { id, data: { priority } },
        {
          onError: () => {
            toast.error(`Failed to update priority for "${issue?.title ?? id}"`);
          },
        },
      );
    },
    [updateMutation, issues, toast],
  );

  const handleTitleChange = useCallback(
    (id: string, title: string) => {
      if (!title.trim()) return;
      const issue = issues.find((i) => i.id === id);
      updateMutation.mutate(
        { id, data: { title: title.trim() } },
        {
          onError: () => {
            toast.error(`Failed to update title for "${issue?.title ?? id}"`);
          },
        },
      );
    },
    [updateMutation, issues, toast],
  );

  const handleAssigneeChange = useCallback(
    (id: string, assignee: string) => {
      const issue = issues.find((i) => i.id === id);
      updateMutation.mutate(
        { id, data: { assignee: assignee.trim() || undefined } },
        {
          onError: () => {
            toast.error(`Failed to update assignee for "${issue?.title ?? id}"`);
          },
        },
      );
    },
    [updateMutation, issues, toast],
  );

  const handleLabelsChange = useCallback(
    (id: string, labels: string[]) => {
      const issue = issues.find((i) => i.id === id);
      updateMutation.mutate(
        { id, data: { labels } },
        {
          onError: () => {
            toast.error(`Failed to update labels for "${issue?.title ?? id}"`);
          },
        },
      );
    },
    [updateMutation, issues, toast],
  );

  const handleDueDateChange = useCallback(
    (id: string, date: string | null) => {
      const issue = issues.find((i) => i.id === id);
      updateMutation.mutate(
        { id, data: { due: date } },
        {
          onError: () => {
            toast.error(`Failed to update due date for "${issue?.title ?? id}"`);
          },
        },
      );
    },
    [updateMutation, issues, toast],
  );

  const handleBulkClose = useCallback(async () => {
    const ids = Object.keys(rowSelectionRef.current).filter((k) => rowSelectionRef.current[k]);
    if (ids.length === 0) return;
    setIsClosing(true);
    try {
      // Snapshot blocked issues before closing
      const beforeIssues = queryClient.getQueryData<IssueListItem[]>(issueKeys.list(apiParams));
      const blockedBefore = new Set(
        (beforeIssues ?? []).filter((i) => i.status === "blocked").map((i) => i.id),
      );

      // Process in batches to avoid unbounded parallel requests
      const BATCH_SIZE = 5;
      const allResults: PromiseSettledResult<unknown>[] = [];
      for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        const batch = ids.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map((id) => closeMutation.mutateAsync({ id })),
        );
        allResults.push(...results);
      }
      const failed = allResults.filter((r) => r.status === "rejected");
      const succeeded = ids.length - failed.length;
      if (failed.length > 0) {
        toast.warning(`Closed ${succeeded} issue${succeeded !== 1 ? "s" : ""}. ${failed.length} failed to close.`);
      } else {
        toast.success(`Closed ${ids.length} issue${ids.length !== 1 ? "s" : ""}.`);
      }

      // Refetch issue list and highlight newly-unblocked dependents
      const closedIdSet = new Set(ids.filter((_, i) => allResults[i].status === "fulfilled"));
      if (blockedBefore.size > 0 && closedIdSet.size > 0) {
        const afterIssues = await queryClient.fetchQuery<IssueListItem[]>({
          queryKey: issueKeys.list(apiParams),
          queryFn: () => api.fetchIssues(apiParams),
          staleTime: 0,
        });
        const newlyUnblocked = (afterIssues ?? [])
          .filter((i) => blockedBefore.has(i.id) && !closedIdSet.has(i.id) && i.status !== "blocked")
          .map((i) => i.id);
        setHighlightedIds(new Set(newlyUnblocked));
      } else {
        setHighlightedIds(new Set());
      }
      setRowSelection({});
    } finally {
      setIsClosing(false);
    }
  }, [closeMutation, queryClient, apiParams]);

  const handleClearSelection = useCallback(() => {
    setRowSelection({});
  }, []);

  const handleBulkReassign = useCallback(async (assignee: string) => {
    const ids = Object.keys(rowSelectionRef.current).filter((k) => rowSelectionRef.current[k]);
    if (ids.length === 0) return;
    setIsUpdating(true);
    try {
      const BATCH_SIZE = 5;
      const allResults: PromiseSettledResult<unknown>[] = [];
      for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        const batch = ids.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map((id) => updateMutation.mutateAsync({ id, data: { assignee } })),
        );
        allResults.push(...results);
      }
      const failed = allResults.filter((r) => r.status === "rejected");
      const succeeded = ids.length - failed.length;
      if (failed.length > 0) {
        toast.warning(`Reassigned ${succeeded} issue${succeeded !== 1 ? "s" : ""}. ${failed.length} failed.`);
      } else {
        toast.success(`Reassigned ${ids.length} issue${ids.length !== 1 ? "s" : ""} to ${assignee}.`);
      }
      setRowSelection({});
    } finally {
      setIsUpdating(false);
    }
  }, [updateMutation, toast]);

  const handleBulkReprioritize = useCallback(async (priority: Priority) => {
    const ids = Object.keys(rowSelectionRef.current).filter((k) => rowSelectionRef.current[k]);
    if (ids.length === 0) return;
    setIsUpdating(true);
    try {
      const BATCH_SIZE = 5;
      const allResults: PromiseSettledResult<unknown>[] = [];
      for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        const batch = ids.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map((id) => updateMutation.mutateAsync({ id, data: { priority } })),
        );
        allResults.push(...results);
      }
      const failed = allResults.filter((r) => r.status === "rejected");
      const succeeded = ids.length - failed.length;
      const label = `P${priority}`;
      if (failed.length > 0) {
        toast.warning(`Reprioritized ${succeeded} issue${succeeded !== 1 ? "s" : ""}. ${failed.length} failed.`);
      } else {
        toast.success(`Set ${ids.length} issue${ids.length !== 1 ? "s" : ""} to ${label}.`);
      }
      setRowSelection({});
    } finally {
      setIsUpdating(false);
    }
  }, [updateMutation, toast]);

  // Build columns and table instance

  const handleBulkChangeStatus = useCallback(async (status: IssueStatus) => {
    const ids = Object.keys(rowSelectionRef.current).filter((k) => rowSelectionRef.current[k]);
    if (ids.length === 0) return;
    setIsUpdating(true);
    try {
      const BATCH_SIZE = 5;
      const allResults: PromiseSettledResult<unknown>[] = [];
      for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        const batch = ids.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map((id) => updateMutation.mutateAsync({ id, data: { status } })),
        );
        allResults.push(...results);
      }
      const failed = allResults.filter((r) => r.status === "rejected");
      const succeeded = ids.length - failed.length;
      if (failed.length > 0) {
        toast.warning(`Updated ${succeeded} issue${succeeded !== 1 ? "s" : ""}. ${failed.length} failed.`);
      } else {
        toast.success(`Set ${ids.length} issue${ids.length !== 1 ? "s" : ""} to ${status}.`);
      }
      setRowSelection({});
    } finally {
      setIsUpdating(false);
    }
  }, [updateMutation, toast]);

  const getIssueLabels = useCallback((id: string): string[] => {
    // Read from QueryClient cache to avoid stale/filtered list issues.
    // The detail cache has the freshest labels; fall back to scanning list caches.
    const detail = queryClient.getQueryData<IssueListItem>(issueKeys.detail(id));
    if (detail?.labels) return detail.labels;
    const lists = queryClient.getQueriesData<IssueListItem[]>({ queryKey: issueKeys.lists() });
    for (const [, list] of lists) {
      const found = list?.find((iss) => iss.id === id);
      if (found) return found.labels ?? [];
    }
    return [];
  }, [queryClient]);

  const handleBulkAddLabel = useCallback(async (label: string) => {
    const ids = Object.keys(rowSelectionRef.current).filter((k) => rowSelectionRef.current[k]);
    if (ids.length === 0) return;
    setIsUpdating(true);
    try {
      const BATCH_SIZE = 5;
      const allResults: PromiseSettledResult<unknown>[] = [];
      for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        const batch = ids.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map((id) => {
            const existingLabels = getIssueLabels(id);
            if (existingLabels.includes(label)) {
              return Promise.resolve(null); // Already has label
            }
            return updateMutation.mutateAsync({
              id,
              data: { labels: [...existingLabels, label] },
            });
          }),
        );
        allResults.push(...results);
      }
      const failed = allResults.filter((r) => r.status === "rejected");
      const succeeded = ids.length - failed.length;
      if (failed.length > 0) {
        toast.warning(`Added label to ${succeeded} issue${succeeded !== 1 ? "s" : ""}. ${failed.length} failed.`);
      } else {
        toast.success(`Added "${label}" to ${ids.length} issue${ids.length !== 1 ? "s" : ""}.`);
      }
      setRowSelection({});
    } finally {
      setIsUpdating(false);
    }
  }, [updateMutation, toast, getIssueLabels]);

  const handleBulkRemoveLabel = useCallback(async (label: string) => {
    const ids = Object.keys(rowSelectionRef.current).filter((k) => rowSelectionRef.current[k]);
    if (ids.length === 0) return;
    setIsUpdating(true);
    try {
      const BATCH_SIZE = 5;
      const allResults: PromiseSettledResult<unknown>[] = [];
      for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        const batch = ids.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map((id) => {
            const existingLabels = getIssueLabels(id);
            if (!existingLabels.includes(label)) {
              return Promise.resolve(null); // Doesn't have label
            }
            return updateMutation.mutateAsync({
              id,
              data: { labels: existingLabels.filter((l) => l !== label) },
            });
          }),
        );
        allResults.push(...results);
      }
      const failed = allResults.filter((r) => r.status === "rejected");
      const succeeded = ids.length - failed.length;
      if (failed.length > 0) {
        toast.warning(`Removed label from ${succeeded} issue${succeeded !== 1 ? "s" : ""}. ${failed.length} failed.`);
      } else {
        toast.success(`Removed "${label}" from ${ids.length} issue${ids.length !== 1 ? "s" : ""}.`);
      }
      setRowSelection({});
    } finally {
      setIsUpdating(false);
    }
  }, [updateMutation, toast, getIssueLabels]);

  const columns = useMemo(
    () => buildColumns({
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
    [handleStatusChange, handlePriorityChange, handleTitleChange, handleAssigneeChange, handleLabelsChange, handleDueDateChange, epicProgress, expandedEpics, handleToggleExpand],
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
        handler: () => setFilters({ status: [], priority: [], issue_type: [], assignee: "", search: "", labels: [], dateRanges: [], structural: [], groupBy: null }),
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

  // Force panelMode off on mobile — the toggle is hidden, so users can't disable it
  useEffect(() => {
    if (isMobile && panelMode) setPanelMode(false);
  }, [isMobile, panelMode, setPanelMode]);

  return (
    <div className="flex h-full relative">
      {/* Main list area */}
      <div className={cn("flex flex-col", panelIssueId && panelMode && !panelIsOverlay ? "flex-1 min-w-0" : "w-full")}>
        {/* Toolbar */}
        <div className="shrink-0 bg-muted/30 px-4 py-3 space-y-2">
          <div className={cn("flex items-start gap-4", isMobile ? "flex-col" : "justify-between")}>
            <FilterBar
              filters={filters}
              onChange={setFilters}
              searchInputRef={searchInputRef}
            />
            {!isMobile && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTopLevelOnly((prev) => !prev)}
                  className={`h-8 rounded border px-3 text-xs font-medium transition-colors ${
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
                  className={`h-8 rounded border px-3 text-xs font-medium transition-colors ${
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
                if (e.key === "Enter") { e.preventDefault(); handleQuickAdd(); }
                if (e.key === "Escape") { setQuickAddTitle(""); quickAddRef.current?.blur(); }
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

      {/* Split-pane detail panel — desktop: side panel; tablet/mobile: slide-over overlay */}
      {panelMode && panelIssueId && !panelIsOverlay && (
        <div className="w-[420px] shrink-0 border-l border-border bg-background overflow-hidden">
          <IssuePanel
            key={panelIssueId}
            issueId={panelIssueId}
            onClose={() => setPanelIssueId(null)}
          />
        </div>
      )}

      {/* Slide-over overlay for tablet/mobile */}
      {panelMode && panelIssueId && panelIsOverlay && (
        <div ref={slideOverRef} className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Issue detail panel">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setPanelIssueId(null)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 right-0 w-full max-w-md bg-background shadow-lg overflow-hidden animate-slide-in-right">
            <IssuePanel
              key={panelIssueId}
              issueId={panelIssueId}
              onClose={() => setPanelIssueId(null)}
            />
          </div>
        </div>
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
