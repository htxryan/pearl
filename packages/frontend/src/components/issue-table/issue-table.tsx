import { useMemo, useRef, useCallback } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type SortingState,
  type ColumnOrderState,
  type VisibilityState,
  type RowSelectionState,
} from "@tanstack/react-table";
import type { IssueListItem, IssueStatus, Priority } from "@beads-gui/shared";
import { cn } from "@/lib/utils";
import { buildColumns } from "./columns";

export interface IssueTableProps {
  data: IssueListItem[];
  isLoading: boolean;
  sorting: SortingState;
  onSortingChange: (sorting: SortingState) => void;
  columnVisibility: VisibilityState;
  onColumnVisibilityChange: (visibility: VisibilityState) => void;
  columnOrder: ColumnOrderState;
  onColumnOrderChange: (order: ColumnOrderState) => void;
  rowSelection: RowSelectionState;
  onRowSelectionChange: (selection: RowSelectionState) => void;
  activeRowIndex: number;
  onRowClick: (id: string) => void;
  onStatusChange: (id: string, status: IssueStatus) => void;
  onPriorityChange: (id: string, priority: Priority) => void;
  highlightedIds?: Set<string>;
}

function SkeletonRow({ colCount }: { colCount: number }) {
  return (
    <tr className="border-b border-border">
      {Array.from({ length: colCount }, (_, i) => (
        <td key={i} className="px-3 py-2.5">
          <div className="h-4 rounded bg-muted animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

export function IssueTable({
  data,
  isLoading,
  sorting,
  onSortingChange,
  columnVisibility,
  onColumnVisibilityChange,
  columnOrder,
  onColumnOrderChange,
  rowSelection,
  onRowSelectionChange,
  activeRowIndex,
  onRowClick,
  onStatusChange,
  onPriorityChange,
  highlightedIds,
}: IssueTableProps) {
  const tableRef = useRef<HTMLTableElement>(null);

  const columns = useMemo(
    () => buildColumns({ onStatusChange, onPriorityChange }),
    [onStatusChange, onPriorityChange],
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      columnOrder,
      rowSelection,
    },
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      onSortingChange(next);
    },
    onColumnVisibilityChange: (updater) => {
      const next = typeof updater === "function" ? updater(columnVisibility) : updater;
      onColumnVisibilityChange(next);
    },
    onColumnOrderChange: (updater) => {
      const next = typeof updater === "function" ? updater(columnOrder) : updater;
      onColumnOrderChange(next);
    },
    onRowSelectionChange: (updater) => {
      const next = typeof updater === "function" ? updater(rowSelection) : updater;
      onRowSelectionChange(next);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    enableRowSelection: true,
    enableMultiSort: true,
    getRowId: (row) => row.id,
  });

  const handleRowClick = useCallback(
    (id: string) => {
      onRowClick(id);
    },
    [onRowClick],
  );

  // Loading state
  if (isLoading && data.length === 0) {
    const visibleColCount = table.getVisibleFlatColumns().length;
    return (
      <div className="overflow-auto">
        <table ref={tableRef} className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              {table.getHeaderGroups()[0]?.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                  style={{ width: header.getSize() }}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }, (_, i) => (
              <SkeletonRow key={i} colCount={visibleColCount} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-4xl mb-3 opacity-30">0</div>
        <h3 className="text-lg font-medium text-foreground">No issues found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Try adjusting your filters or create a new issue.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-auto">
      <table ref={tableRef} className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-background">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-border">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className={cn(
                    "relative px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider select-none",
                    header.column.getCanSort() && "cursor-pointer hover:text-foreground",
                  )}
                  style={{ width: header.getSize() }}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <div className="flex items-center gap-1">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() === "asc" && <span aria-label="Sorted ascending">&#9650;</span>}
                    {header.column.getIsSorted() === "desc" && <span aria-label="Sorted descending">&#9660;</span>}
                  </div>
                  {/* Column resize handle */}
                  {header.column.getCanResize() && (
                    <div
                      onMouseDown={header.getResizeHandler()}
                      onTouchStart={header.getResizeHandler()}
                      onClick={(e) => e.stopPropagation()}
                      className={cn(
                        "absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none",
                        header.column.getIsResizing() ? "bg-primary" : "hover:bg-border",
                      )}
                    />
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row, index) => (
            <tr
              key={row.id}
              onClick={() => handleRowClick(row.original.id)}
              className={cn(
                "border-b border-border cursor-pointer transition-colors",
                "hover:bg-accent/50",
                index === activeRowIndex && "bg-accent",
                highlightedIds?.has(row.original.id) &&
                  "ring-2 ring-inset ring-green-500/50 bg-green-50 dark:bg-green-950/20",
              )}
              data-row-index={index}
              aria-selected={index === activeRowIndex}
            >
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className="px-3 py-2.5"
                  style={{ width: cell.column.getSize() }}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
