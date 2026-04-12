import { createColumnHelper } from "@tanstack/react-table";
import type { IssueListItem, IssueStatus, Priority } from "@beads-gui/shared";
import { StatusBadge } from "@/components/ui/status-badge";
import { PriorityIndicator } from "@/components/ui/priority-indicator";
import { TypeBadge } from "@/components/ui/type-badge";
import { RelativeTime } from "@/components/ui/relative-time";

const col = createColumnHelper<IssueListItem>();

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isDateOverdue(iso: string): boolean {
  const due = new Date(iso);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

export function buildColumns({
  onStatusChange,
  onPriorityChange,
}: {
  onStatusChange?: (id: string, status: IssueStatus) => void;
  onPriorityChange?: (id: string, priority: Priority) => void;
}) {
  return [
    col.display({
      id: "select",
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
          className="h-4 w-4 rounded border-border"
          aria-label="Select all rows"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          className="h-4 w-4 rounded border-border"
          aria-label={`Select ${row.original.title}`}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      size: 40,
      enableResizing: false,
      enableSorting: false,
    }),
    col.accessor("id", {
      header: "ID",
      cell: (info) => (
        <span className="font-mono text-xs text-muted-foreground">{info.getValue()}</span>
      ),
      size: 140,
    }),
    col.accessor("title", {
      header: "Title",
      cell: (info) => (
        <span className="font-medium truncate max-w-[400px] block">{info.getValue()}</span>
      ),
      size: 320,
      minSize: 150,
    }),
    col.accessor("status", {
      header: "Status",
      cell: (info) => {
        const status = info.getValue();
        if (onStatusChange) {
          return (
            <select
              value={status}
              onChange={(e) => onStatusChange(info.row.original.id, e.target.value as IssueStatus)}
              onClick={(e) => e.stopPropagation()}
              className="appearance-none bg-transparent border-none text-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring rounded p-0"
              aria-label={`Change status for ${info.row.original.title}`}
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="closed">Closed</option>
              <option value="blocked">Blocked</option>
              <option value="deferred">Deferred</option>
            </select>
          );
        }
        return <StatusBadge status={status} />;
      },
      size: 120,
    }),
    col.accessor("priority", {
      header: "Priority",
      cell: (info) => {
        const priority = info.getValue();
        if (onPriorityChange) {
          return (
            <select
              value={priority}
              onChange={(e) => onPriorityChange(info.row.original.id, Number(e.target.value) as Priority)}
              onClick={(e) => e.stopPropagation()}
              className="appearance-none bg-transparent border-none text-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring rounded p-0"
              aria-label={`Change priority for ${info.row.original.title}`}
            >
              <option value={0}>P0 — Critical</option>
              <option value={1}>P1 — High</option>
              <option value={2}>P2 — Medium</option>
              <option value={3}>P3 — Low</option>
              <option value={4}>P4 — Backlog</option>
            </select>
          );
        }
        return <PriorityIndicator priority={priority} />;
      },
      size: 80,
    }),
    col.accessor("issue_type", {
      header: "Type",
      cell: (info) => <TypeBadge type={info.getValue()} />,
      size: 80,
    }),
    col.accessor("assignee", {
      header: "Assignee",
      cell: (info) => (
        <span className="text-sm truncate">{info.getValue() ?? "—"}</span>
      ),
      size: 120,
    }),
    col.accessor("created_at", {
      header: "Created",
      cell: (info) => (
        <RelativeTime iso={info.getValue()} className="text-xs text-muted-foreground" />
      ),
      size: 90,
    }),
    col.accessor("due_at", {
      header: "Due",
      cell: (info) => {
        const val = info.getValue();
        const isOverdue = val && isDateOverdue(val);
        return (
          <span className={`text-xs ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
            {formatDate(val)}
          </span>
        );
      },
      size: 90,
    }),
    col.accessor("labels", {
      header: "Labels",
      cell: (info) => {
        const labels = info.getValue();
        if (!labels.length) return null;
        return (
          <div className="flex gap-1 flex-wrap">
            {labels.slice(0, 3).map((label) => (
              <span
                key={label}
                className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground"
              >
                {label}
              </span>
            ))}
            {labels.length > 3 && (
              <span className="text-xs text-muted-foreground">+{labels.length - 3}</span>
            )}
          </div>
        );
      },
      size: 160,
      enableSorting: false,
    }),
  ];
}
