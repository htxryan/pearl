import type { IssueListItem, IssueStatus, Priority } from "@pearl/shared";
import {
  type ColumnOrderState,
  type ColumnSizingState,
  getCoreRowModel,
  getSortedRowModel,
  type RowSelectionState,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";
import { buildColumns, type EpicProgress } from "@/components/issue-table/columns";
import { usePersistedState } from "@/hooks/use-persisted-state";

interface ColumnHandlers {
  onStatusChange: (id: string, status: IssueStatus) => void;
  onPriorityChange: (id: string, priority: Priority) => void;
  onTitleChange: (id: string, title: string) => void;
  onAssigneeChange: (id: string, assignee: string) => void;
  onLabelsChange: (id: string, labels: string[]) => void;
  onDueDateChange: (id: string, date: string | null) => void;
}

interface EpicOptions {
  epicProgress: Map<string, EpicProgress>;
  expandedEpics: Set<string>;
  onToggleExpand: (id: string) => void;
}

export function useListTableState(
  tableIssues: IssueListItem[],
  sorting: SortingState,
  setSorting: (s: SortingState) => void,
  columnHandlers: ColumnHandlers,
  epicOptions: EpicOptions,
) {
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

  useEffect(() => {
    if (highlightedIds.size === 0) return;
    const timer = setTimeout(() => setHighlightedIds(new Set()), 3000);
    return () => clearTimeout(timer);
  }, [highlightedIds]);

  useEffect(() => {
    setActiveRowIndex((prev) => {
      if (prev < 0) return prev;
      if (tableIssues.length === 0) return -1;
      return Math.min(prev, tableIssues.length - 1);
    });
  }, [tableIssues]);

  const {
    onStatusChange,
    onPriorityChange,
    onTitleChange,
    onAssigneeChange,
    onLabelsChange,
    onDueDateChange,
  } = columnHandlers;
  const { epicProgress, expandedEpics, onToggleExpand } = epicOptions;

  const columns = useMemo(
    () =>
      buildColumns({
        onStatusChange,
        onPriorityChange,
        onTitleChange,
        onAssigneeChange,
        onLabelsChange,
        onDueDateChange,
        epicProgress,
        expandedEpics,
        onToggleExpand,
      }),
    [
      onStatusChange,
      onPriorityChange,
      onTitleChange,
      onAssigneeChange,
      onLabelsChange,
      onDueDateChange,
      epicProgress,
      expandedEpics,
      onToggleExpand,
    ],
  );

  const table = useReactTable({
    data: tableIssues,
    columns,
    state: { sorting, columnVisibility, columnOrder, columnSizing, rowSelection },
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

  const selectedIds = Object.keys(rowSelection).filter((k) => rowSelection[k]);

  return {
    table,
    columns,
    rowSelection,
    setRowSelection,
    activeRowIndex,
    setActiveRowIndex,
    highlightedIds,
    setHighlightedIds,
    selectedIds,
  };
}
