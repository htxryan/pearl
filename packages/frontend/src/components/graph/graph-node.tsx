import type { IssueListItem, IssueStatus, LabelColor } from "@pearl/shared";
import { Handle, type Node, type NodeProps, Position } from "@xyflow/react";
import { memo, useCallback, useState } from "react";
import { BeadId } from "@/components/ui/bead-id";
import { LabelBadge } from "@/components/ui/label-badge";
import { PriorityIndicator } from "@/components/ui/priority-indicator";
import { TypePill } from "@/components/ui/type-pill";
import { cn } from "@/lib/utils";

export const NODE_WIDTH = 260;
export const NODE_HEIGHT = 110;

export type GraphNodeData = {
  issue: IssueListItem;
  highlighted: boolean;
  dimmed: boolean;
  selected: boolean;
  clusterChildCount?: number;
  [key: string]: unknown;
};

export type GraphNodeType = Node<GraphNodeData, "graphNode">;

const statusAccentColor: Record<IssueStatus, string> = {
  open: "bg-blue-500",
  in_progress: "bg-amber-500",
  closed: "bg-green-500",
  blocked: "bg-red-500",
  deferred: "bg-gray-400",
};

const statusLabel: Record<IssueStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  closed: "Closed",
  blocked: "Blocked",
  deferred: "Deferred",
};

function formatDueDate(due: string | null): string | null {
  if (!due) return null;
  // Parse date-only strings (YYYY-MM-DD) in local time to avoid UTC offset issues
  const d = new Date(due.length === 10 ? due + "T00:00:00" : due);
  const now = new Date();
  // Compare at start of day for integer day difference (avoids -0 from Math.ceil)
  const dueDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((dueDay.getTime() - nowDay.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days <= 7) return `Due in ${days}d`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export const GraphNode = memo(function GraphNode({ data }: NodeProps<GraphNodeType>) {
  const { issue, highlighted, dimmed, selected } = data;
  const [hovered, setHovered] = useState(false);
  const isHighPriority = issue.priority <= 1;
  const dueText = formatDueDate(issue.due_at);

  const handleMouseEnter = useCallback(() => setHovered(true), []);
  const handleMouseLeave = useCallback(() => setHovered(false), []);

  return (
    <div
      className={cn(
        "group relative rounded-lg border border-border bg-background shadow-sm",
        "transition-all duration-200 ease-out",
        // Highlighted = part of dependency chain
        highlighted && "ring-2 ring-primary shadow-md",
        // Selected = the clicked node itself
        selected && "ring-2 ring-primary shadow-lg",
        // Dimmed = not part of selected chain
        dimmed && "opacity-30",
        // High priority gradient
        isHighPriority && !dimmed && "bg-gradient-to-r from-danger/10 to-transparent",
        // Hover effect (only when not dimmed)
        !dimmed && "hover:shadow-md hover:border-ring",
      )}
      style={{ width: NODE_WIDTH, height: NODE_HEIGHT }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground !w-2 !h-2" />

      {/* Left-edge status accent bar (matching kanban card) */}
      <div className={cn("absolute inset-y-0 left-0 w-[3px]", statusAccentColor[issue.status])} />

      <div className="pl-3.5 pr-3 py-2.5">
        {/* Row 1: ID + Priority */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <BeadId id={issue.id} className="text-[10px] text-muted-foreground font-mono truncate" />
          <PriorityIndicator priority={issue.priority} />
        </div>

        {/* Row 2: Title */}
        <p className="text-xs font-medium leading-snug truncate mb-1.5" title={issue.title}>
          {issue.title}
        </p>

        {/* Collapsed cluster badge */}
        {data.clusterChildCount != null && (
          <div className="flex items-center gap-1 text-[9px] text-muted-foreground mb-1">
            <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
              {String(data.clusterChildCount)} collapsed
            </span>
          </div>
        )}

        {/* Row 3: Type + Labels + Assignee */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <TypePill type={issue.issue_type} className="text-[10px] shrink-0" />
            {issue.labels.length > 0 && (
              <div
                className="flex items-center gap-1 truncate max-w-[100px]"
                title={issue.labels.join(", ")}
              >
                <LabelBadge
                  name={issue.labels[0]}
                  color={(issue.labelColors ?? {})[issue.labels[0]] as LabelColor | undefined}
                  size="sm"
                />
                {issue.labels.length > 1 && (
                  <span className="text-[9px] text-muted-foreground">
                    +{issue.labels.length - 1}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {dueText && (
              <span
                className={cn(
                  "text-[9px] font-medium",
                  dueText.includes("overdue") ? "text-danger" : "text-muted-foreground",
                )}
              >
                {dueText}
              </span>
            )}
            {issue.assignee && (
              <span
                className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-gradient-to-br from-primary/80 to-primary text-[9px] font-semibold text-primary-foreground"
                title={issue.assignee}
              >
                {issue.assignee.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Hover tooltip with expanded metadata */}
      {hovered && !dimmed && (
        <div
          className={cn(
            "absolute left-1/2 -translate-x-1/2 z-50 w-72 rounded-lg border border-border",
            "bg-background/95 backdrop-blur-sm shadow-lg px-3 py-2.5",
            "pointer-events-none",
          )}
          style={{ top: NODE_HEIGHT + 8 }}
        >
          <p className="text-sm font-medium leading-snug mb-2">{issue.title}</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Status:</span>
              <span className="font-medium">{statusLabel[issue.status]}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Priority:</span>
              <PriorityIndicator priority={issue.priority} className="text-[10px] px-1 py-0" />
            </div>
            {issue.assignee && (
              <div className="flex items-center gap-1.5 col-span-2">
                <span className="text-muted-foreground">Assignee:</span>
                <span className="font-medium">{issue.assignee}</span>
              </div>
            )}
            {issue.due_at && (
              <div className="flex items-center gap-1.5 col-span-2">
                <span className="text-muted-foreground">Due:</span>
                <span className={cn("font-medium", dueText?.includes("overdue") && "text-danger")}>
                  {new Date(issue.due_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}
            {issue.labels.length > 0 && (
              <div className="flex items-center gap-1 col-span-2 flex-wrap">
                <span className="text-muted-foreground shrink-0">Labels:</span>
                {issue.labels.map((label) => (
                  <LabelBadge
                    key={label}
                    name={label}
                    color={(issue.labelColors ?? {})[label] as LabelColor | undefined}
                    size="sm"
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground !w-2 !h-2" />
    </div>
  );
});
