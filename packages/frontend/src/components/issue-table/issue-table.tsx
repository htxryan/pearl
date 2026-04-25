import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  type Modifier,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { IssueListItem } from "@pearl/shared";
import { flexRender, type Header, type Row, type Table } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useRef } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { getColumnStyle } from "./column-style";

const ROW_HEIGHT = 41; // px – matches py-2.5 + border
const VIRTUALIZATION_THRESHOLD = 100;

/** Columns that are pinned and cannot be reordered by the user. */
const FIXED_COLUMNS: ReadonlySet<string> = new Set(["select"]);

/** Constrain column drag to the X axis — columns only move sideways. */
const restrictToHorizontalAxis: Modifier = ({ transform }) => ({
  ...transform,
  y: 0,
});

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

function getHeaderLabel(header: Header<IssueListItem, unknown>): string {
  const h = header.column.columnDef.header;
  return typeof h === "string" ? h : header.column.id;
}

function DraggableHeader({
  header,
  table,
}: {
  header: Header<IssueListItem, unknown>;
  table: Table<IssueListItem>;
}) {
  const isFixed = FIXED_COLUMNS.has(header.column.id);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: header.column.id,
    disabled: isFixed,
  });

  const baseStyle = getColumnStyle(header, table);
  const dragStyle = {
    ...baseStyle,
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : undefined,
    position: isDragging ? "relative" : (baseStyle as { position?: string }).position,
  } as React.CSSProperties;

  const dragHandleProps = isFixed ? {} : { ...attributes, ...listeners };
  const dragHandleClass = isFixed
    ? ""
    : "cursor-grab active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background rounded-sm";
  const headerLabel = getHeaderLabel(header);

  return (
    <th
      ref={setNodeRef}
      className={cn(
        "relative px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider select-none group",
        header.column.getCanSort() && "hover:text-foreground",
      )}
      style={dragStyle}
      data-column-id={header.column.id}
    >
      <div className="flex items-center gap-1">
        {!isFixed && (
          <button
            type="button"
            {...dragHandleProps}
            aria-roledescription="column drag handle"
            title={`Drag to reorder · ${headerLabel}`}
            className={cn(
              "inline-flex items-center justify-center -ml-1 mr-0.5 h-4 w-3 text-muted-foreground/40 hover:text-foreground/80 opacity-0 group-hover:opacity-100 transition-opacity leading-none bg-transparent border-0 p-0",
              dragHandleClass,
            )}
          >
            <svg
              width="6"
              height="10"
              viewBox="0 0 6 10"
              fill="currentColor"
              focusable="false"
              role="img"
            >
              <title>Drag handle</title>
              <circle cx="1.25" cy="1.25" r="1" />
              <circle cx="4.75" cy="1.25" r="1" />
              <circle cx="1.25" cy="5" r="1" />
              <circle cx="4.75" cy="5" r="1" />
              <circle cx="1.25" cy="8.75" r="1" />
              <circle cx="4.75" cy="8.75" r="1" />
            </svg>
          </button>
        )}
        <button
          type="button"
          onClick={header.column.getToggleSortingHandler()}
          disabled={!header.column.getCanSort()}
          className={cn(
            "flex items-center gap-1 min-w-0 text-left bg-transparent border-0 p-0 font-medium text-xs uppercase tracking-wider text-inherit",
            header.column.getCanSort() ? "cursor-pointer hover:text-foreground" : "cursor-default",
          )}
        >
          <span className="truncate">
            {flexRender(header.column.columnDef.header, header.getContext())}
          </span>
          {header.column.getIsSorted() === "asc" && (
            <span aria-label="Sorted ascending">&#9650;</span>
          )}
          {header.column.getIsSorted() === "desc" && (
            <span aria-label="Sorted descending">&#9660;</span>
          )}
        </button>
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
  );
}

function TableHeader({ table }: { table: Table<IssueListItem> }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const headers = table.getHeaderGroups()[0]?.headers ?? [];
  const orderedIds = headers.map((h) => h.column.id);
  const sortableIds = orderedIds.filter((id) => !FIXED_COLUMNS.has(id));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (FIXED_COLUMNS.has(activeId) || FIXED_COLUMNS.has(overId)) return;

    const oldIdx = orderedIds.indexOf(activeId);
    const newIdx = orderedIds.indexOf(overId);
    if (oldIdx < 0 || newIdx < 0) return;

    const next = arrayMove(orderedIds, oldIdx, newIdx);
    // Defensive: keep fixed columns at the front in stable order.
    const fixed = orderedIds.filter((id) => FIXED_COLUMNS.has(id));
    const movable = next.filter((id) => !FIXED_COLUMNS.has(id));
    table.setColumnOrder([...fixed, ...movable]);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToHorizontalAxis]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={sortableIds} strategy={horizontalListSortingStrategy}>
        <thead className="sticky top-0 z-10 bg-background">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-border">
              {headerGroup.headers.map((header) => (
                <DraggableHeader key={header.id} header={header} table={table} />
              ))}
            </tr>
          ))}
        </thead>
      </SortableContext>
    </DndContext>
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
