import { useState, useMemo, useCallback } from "react";
import {
  flexRender,
  type Row,
  type Table,
} from "@tanstack/react-table";
import type { IssueListItem, IssueStatus, Priority, IssueType } from "@beads-gui/shared";
import { cn } from "@/lib/utils";
import type { GroupByField } from "./filter-bar";

const PRIORITY_LABELS: Record<Priority, string> = { 0: "P0", 1: "P1", 2: "P2", 3: "P3", 4: "P4" };
const STATUS_LABELS: Record<IssueStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  closed: "Closed",
  blocked: "Blocked",
  deferred: "Deferred",
};
const TYPE_LABELS: Record<IssueType, string> = {
  task: "Task", bug: "Bug", epic: "Epic", feature: "Feature",
  chore: "Chore", event: "Event", gate: "Gate", molecule: "Molecule",
};

interface GroupedIssueTableProps {
  issues: IssueListItem[];
  groupBy: GroupByField;
  table: Table<IssueListItem>;
  isLoading: boolean;
  onRowClick: (id: string) => void;
  onRowHover?: (id: string) => void;
  highlightedIds?: Set<string>;
}

interface IssueGroup {
  key: string;
  label: string;
  issues: IssueListItem[];
}

function getGroupKey(issue: IssueListItem, groupBy: GroupByField): string {
  switch (groupBy) {
    case "status":
      return issue.status;
    case "priority":
      return String(issue.priority);
    case "assignee":
      return issue.assignee || "(Unassigned)";
    case "issue_type":
      return issue.issue_type;
  }
}

function getGroupLabel(key: string, groupBy: GroupByField): string {
  switch (groupBy) {
    case "status":
      return STATUS_LABELS[key as IssueStatus] ?? key;
    case "priority":
      return PRIORITY_LABELS[Number(key) as Priority] ?? `P${key}`;
    case "assignee":
      return key;
    case "issue_type":
      return TYPE_LABELS[key as IssueType] ?? key;
  }
}

export function GroupedIssueTable({
  issues,
  groupBy,
  table,
  isLoading,
  onRowClick,
  onRowHover,
  highlightedIds,
}: GroupedIssueTableProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const groups = useMemo((): IssueGroup[] => {
    const map = new Map<string, IssueListItem[]>();
    for (const issue of issues) {
      const key = getGroupKey(issue, groupBy);
      const existing = map.get(key) ?? [];
      existing.push(issue);
      map.set(key, existing);
    }
    return Array.from(map.entries()).map(([key, groupIssues]) => ({
      key,
      label: getGroupLabel(key, groupBy),
      issues: groupIssues,
    }));
  }, [issues, groupBy]);

  const toggleGroup = useCallback((key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const headerGroups = table.getHeaderGroups();
  const visibleColumns = table.getVisibleFlatColumns();
  const colCount = visibleColumns.length;

  if (isLoading) {
    return (
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-background">
          {headerGroups.map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-border">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                  style={{ width: header.getSize() }}
                >
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {Array.from({ length: 8 }, (_, i) => (
            <tr key={i} className="border-b border-border">
              {Array.from({ length: colCount }, (_, j) => (
                <td key={j} className="px-3 py-2.5">
                  <div className="h-4 w-20 rounded skeleton-shimmer" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm py-12">
        No issues match the current filters.
      </div>
    );
  }

  return (
    <table className="w-full border-collapse text-sm">
      <thead className="sticky top-0 z-10 bg-background">
        {headerGroups.map((headerGroup) => (
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
                {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {(() => {
          // Build O(1) lookup map once instead of O(n²) filter per group
          const rowById = new Map(
            table.getRowModel().rows.map((row) => [row.original.id, row]),
          );
          return groups.map((group) => {
            const isCollapsed = collapsedGroups.has(group.key);
            const groupRows = group.issues
              .map((issue) => rowById.get(issue.id))
              .filter((row): row is Row<IssueListItem> => row != null);

            return (
              <GroupSection
                key={group.key}
                group={group}
                rows={groupRows}
                isCollapsed={isCollapsed}
                onToggle={() => toggleGroup(group.key)}
                colCount={colCount}
                onRowClick={onRowClick}
                onRowHover={onRowHover}
                highlightedIds={highlightedIds}
              />
            );
          });
        })()}
      </tbody>
    </table>
  );
}

function GroupSection({
  group,
  rows,
  isCollapsed,
  onToggle,
  colCount,
  onRowClick,
  onRowHover,
  highlightedIds,
}: {
  group: IssueGroup;
  rows: ReturnType<Table<IssueListItem>["getRowModel"]>["rows"];
  isCollapsed: boolean;
  onToggle: () => void;
  colCount: number;
  onRowClick: (id: string) => void;
  onRowHover?: (id: string) => void;
  highlightedIds?: Set<string>;
}) {
  return (
    <>
      {/* Group header row */}
      <tr
        className="bg-muted/40 cursor-pointer hover:bg-muted/60 transition-colors border-b border-border"
        onClick={onToggle}
        role="button"
        aria-expanded={!isCollapsed}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        <td colSpan={colCount} className="px-3 py-2">
          <div className="flex items-center gap-2">
            <span className={cn(
              "inline-block transition-transform text-muted-foreground text-xs",
              isCollapsed ? "" : "rotate-90",
            )}>
              &#9654;
            </span>
            <span className="font-medium text-sm text-foreground">
              {group.label}
            </span>
            <span className="text-xs text-muted-foreground">
              ({group.issues.length})
            </span>
          </div>
        </td>
      </tr>
      {/* Group rows */}
      {!isCollapsed && rows.map((row) => {
        const isHighlighted = highlightedIds?.has(row.original.id);
        return (
          <tr
            key={row.id}
            className={cn(
              "border-b border-border cursor-pointer hover:bg-muted/50 transition-colors",
              isHighlighted && "ring-2 ring-primary/30 bg-primary/5",
            )}
            onClick={() => onRowClick(row.original.id)}
            onMouseEnter={() => onRowHover?.(row.original.id)}
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
        );
      })}
    </>
  );
}
