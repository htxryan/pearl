import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { IssueListItem, IssueStatus, Priority } from "@beads-gui/shared";
import { cn } from "@/lib/utils";

export const NODE_WIDTH = 220;
export const NODE_HEIGHT = 90;

export type GraphNodeData = {
  issue: IssueListItem;
  highlighted: boolean;
  [key: string]: unknown;
};

export type GraphNodeType = Node<GraphNodeData, "graphNode">;

const statusDotColor: Record<IssueStatus, string> = {
  open: "bg-green-500",
  in_progress: "bg-blue-500",
  closed: "bg-gray-400",
  blocked: "bg-red-500",
  deferred: "bg-yellow-500",
};

const statusLabel: Record<IssueStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  closed: "Closed",
  blocked: "Blocked",
  deferred: "Deferred",
};

const priorityConfig: Record<Priority, { label: string; className: string }> = {
  0: { label: "P0", className: "text-red-600 dark:text-red-400" },
  1: { label: "P1", className: "text-orange-500 dark:text-orange-400" },
  2: { label: "P2", className: "text-yellow-600 dark:text-yellow-400" },
  3: { label: "P3", className: "text-gray-500 dark:text-gray-400" },
  4: { label: "P4", className: "text-gray-400 dark:text-gray-500" },
};

const typeLabel: Record<IssueListItem["issue_type"], string> = {
  task: "Task",
  bug: "Bug",
  epic: "Epic",
  feature: "Feature",
  chore: "Chore",
  event: "Event",
  gate: "Gate",
  molecule: "Molecule",
};

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + "\u2026" : text;
}

export const GraphNode = memo(function GraphNode({ data }: NodeProps<GraphNodeType>) {
  const { issue, highlighted } = data;
  const priority = priorityConfig[issue.priority] ?? { label: `P${issue.priority}`, className: "bg-gray-300 text-gray-700" };

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-background px-3 py-2 shadow-sm",
        "transition-shadow duration-150",
        highlighted && "ring-2 ring-blue-500",
      )}
      style={{ width: NODE_WIDTH, height: NODE_HEIGHT }}
    >
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground !w-2 !h-2" />

      {/* Row 1: ID + Priority */}
      <div className="flex items-center justify-between gap-1 mb-1">
        <span className="text-[10px] text-muted-foreground font-mono truncate">
          {truncate(issue.id, 16)}
        </span>
        <span className={cn("text-[10px] font-bold shrink-0", priority.className)}>
          {priority.label}
        </span>
      </div>

      {/* Row 2: Title */}
      <p className="text-xs font-medium leading-snug truncate mb-1.5">
        {truncate(issue.title, 40)}
      </p>

      {/* Row 3: Status dot + status label + type */}
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <span
          className={cn("inline-block h-2 w-2 rounded-full shrink-0", statusDotColor[issue.status])}
          title={statusLabel[issue.status]}
        />
        <span className="truncate">{statusLabel[issue.status]}</span>
        <span className="text-border">|</span>
        <span className="truncate">{typeLabel[issue.issue_type]}</span>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground !w-2 !h-2" />
    </div>
  );
});
