import type { IssueListItem } from "@pearl/shared";
import { flexRender, type Row, type Table } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useRef } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { getColumnStyle } from "./column-style";

const ROW_HEIGHT = 41; // px – matches py-2.5 + border
const VIRTUALIZATION_THRESHOLD = 100;

export interface IssueTableProps {
  table: Table<IssueListItem>;
  isLoading: boolean;
  activeRowIndex: number;
  onRowClick: (id: string) => void;
  onRowHover?: (id: string) => void;
  highlightedIds?: Set<string>;
}

function SkeletonRow({ table }: { table: Table<IssueListItem> }) {
  const headers = table.getHeaderGroups()[0]?.headers ?? [];
  return (
    <tr className="border-b border-border">
      {headers.map((header) => (
        <td key={header.id} className="px-3 py-2.5" style={getColumnStyle(header, table)}>
          <div
            className={cn(
              "rounded skeleton-shimmer",
              header.column.id === "select"
                ? "h-4 w-4 rounded-sm"
                : header.column.id === "id"
                  ? "h-3.5 w-20 rounded"
                  : header.column.id === "title"
                    ? "h-4 w-full max-w-[240px] rounded"
                    : header.column.id === "status"
                      ? "h-5 w-16 rounded-full"
                      : header.column.id === "priority"
                        ? "h-5 w-8 rounded"
                        : "h-3.5 w-14 rounded",
            )}
          />
        </td>
      ))}
    </tr>
  );
}

function TableHeader({ table }: { table: Table<IssueListItem> }) {
  return (
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
              style={getColumnStyle(header, table)}
              onClick={header.column.getToggleSortingHandler()}
            >
              <div className="flex items-center gap-1">
                {flexRender(header.column.columnDef.header, header.getContext())}
                {header.column.getIsSorted() === "asc" && (
                  <span aria-label="Sorted ascending">&#9650;</span>
                )}
                {header.column.getIsSorted() === "desc" && (
                  <span aria-label="Sorted descending">&#9660;</span>
                )}
              </div>
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
  );
}

function TableRow({
  row,
  table,
  index,
  activeRowIndex,
  highlightedIds,
  animated,
  onClick,
  onMouseEnter,
  onMouseLeave,
  style,
}: {
  row: Row<IssueListItem>;
  table: Table<IssueListItem>;
  index: number;
  activeRowIndex: number;
  highlightedIds?: Set<string>;
  animated?: boolean;
  onClick: (id: string) => void;
  onMouseEnter: (id: string) => void;
  onMouseLeave: () => void;
  style?: React.CSSProperties;
}) {
  return (
    <tr
      onClick={() => onClick(row.original.id)}
      onMouseEnter={() => onMouseEnter(row.original.id)}
      onMouseLeave={onMouseLeave}
      className={cn(
        "border-b border-border cursor-pointer transition-colors",
        "hover:bg-accent/50",
        animated && "animate-fade-up [animation-fill-mode:backwards]",
        index === activeRowIndex && "bg-accent",
        highlightedIds?.has(row.original.id) && "ring-2 ring-inset ring-success/50 bg-success/10",
      )}
      style={style}
      data-row-index={index}
      data-issue-id={row.original.id}
      aria-selected={index === activeRowIndex}
    >
      {row.getVisibleCells().map((cell) => (
        <td key={cell.id} className="px-3 py-2.5" style={getColumnStyle(cell, table)}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
      ))}
    </tr>
  );
}

export function IssueTable({
  table,
  isLoading,
  activeRowIndex,
  onRowClick,
  onRowHover,
  highlightedIds,
}: IssueTableProps) {
  const rows = table.getRowModel().rows;
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const useVirtual = rows.length > VIRTUALIZATION_THRESHOLD;

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 20,
    enabled: useVirtual,
  });

  const handleRowClick = useCallback(
    (id: string) => {
      onRowClick(id);
    },
    [onRowClick],
  );

  const handleRowMouseEnter = useCallback(
    (id: string) => {
      if (!onRowHover) return;
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = setTimeout(() => {
        onRowHover(id);
      }, 200);
    },
    [onRowHover],
  );

  const handleRowMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  // Scroll virtualizer to keep active row visible during keyboard navigation
  useEffect(() => {
    if (useVirtual && activeRowIndex >= 0) {
      virtualizer.scrollToIndex(activeRowIndex, { align: "auto" });
    }
  }, [activeRowIndex, useVirtual, virtualizer]);

  // Clean up hover timer on unmount
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  // Loading state
  if (isLoading && rows.length === 0) {
    return (
      <div className="overflow-auto">
        <table className="w-full border-collapse text-sm" aria-label="Issue list">
          <thead>
            <tr className="border-b border-border">
              {table.getHeaderGroups()[0]?.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                  style={getColumnStyle(header, table)}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }, (_, i) => (
              <SkeletonRow key={i} table={table} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Empty state
  if (rows.length === 0) {
    return (
      <EmptyState
        icon="&#8709;"
        title="No issues found"
        description="Try adjusting your filters or create a new issue."
      />
    );
  }

  // Virtualized rendering for large lists
  if (useVirtual) {
    const virtualRows = virtualizer.getVirtualItems();

    return (
      <div ref={scrollContainerRef} className="overflow-auto h-full">
        <table className="w-full border-collapse text-sm" aria-label="Issue list">
          <TableHeader table={table} />
          <tbody>
            {virtualRows.length > 0 && virtualRows[0].start > 0 && (
              <tr>
                <td
                  colSpan={table.getVisibleFlatColumns().length}
                  style={{ height: virtualRows[0].start, padding: 0 }}
                />
              </tr>
            )}
            {virtualRows.map((virtualRow) => {
              const row = rows[virtualRow.index];
              return (
                <TableRow
                  key={row.id}
                  row={row}
                  table={table}
                  index={virtualRow.index}
                  activeRowIndex={activeRowIndex}
                  highlightedIds={highlightedIds}
                  onClick={handleRowClick}
                  onMouseEnter={handleRowMouseEnter}
                  onMouseLeave={handleRowMouseLeave}
                  style={{ height: ROW_HEIGHT }}
                />
              );
            })}
            {virtualRows.length > 0 &&
              (() => {
                const remaining = Math.max(
                  0,
                  virtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end,
                );
                return remaining > 0 ? (
                  <tr>
                    <td
                      colSpan={table.getVisibleFlatColumns().length}
                      style={{ height: remaining, padding: 0 }}
                    />
                  </tr>
                ) : null;
              })()}
          </tbody>
        </table>
      </div>
    );
  }

  // Standard rendering for small lists
  return (
    <div ref={scrollContainerRef} className="overflow-auto h-full">
      <table className="w-full border-collapse text-sm" aria-label="Issue list">
        <TableHeader table={table} />
        <tbody>
          {rows.map((row, index) => (
            <TableRow
              key={row.id}
              row={row}
              table={table}
              index={index}
              activeRowIndex={activeRowIndex}
              highlightedIds={highlightedIds}
              animated
              onClick={handleRowClick}
              onMouseEnter={handleRowMouseEnter}
              onMouseLeave={handleRowMouseLeave}
              style={{ animationDelay: `${Math.min(index * 40, 300)}ms` }}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
