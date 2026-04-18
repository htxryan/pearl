import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { IssueListItem, IssueStatus, LabelColor } from "@pearl/shared";
import { memo } from "react";
import { LabelBadge } from "@/components/ui/label-badge";
import { PriorityIndicator } from "@/components/ui/priority-indicator";
import { TypeBadge } from "@/components/ui/type-badge";
import { shortId } from "@/lib/format-id";
import { cn } from "@/lib/utils";

interface KanbanCardProps {
  issue: IssueListItem;
  onClick: (id: string) => void;
  isBlocked?: boolean;
}

const statusAccentColor: Record<IssueStatus, string> = {
  open: "bg-blue-500",
  in_progress: "bg-amber-500",
  closed: "bg-green-500",
  blocked: "bg-red-500",
  deferred: "bg-gray-400",
};

export const KanbanCard = memo(function KanbanCard({ issue, onClick, isBlocked }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: issue.id,
    data: { type: "card", issue },
    transition: {
      duration: 200,
      easing: "ease-out",
    },
  });

  const { onKeyDown: dndKeyDown, ...restListeners } = listeners ?? {};

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isHighPriority = issue.priority <= 1;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...restListeners}
      role="button"
      tabIndex={0}
      aria-roledescription="draggable issue card"
      aria-label={`${issue.id}: ${issue.title}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick(issue.id);
      }}
      onKeyDown={(e) => {
        dndKeyDown?.(e);
        if (e.key === "Enter" && !e.defaultPrevented) {
          e.stopPropagation();
          onClick(issue.id);
        }
      }}
      className={cn(
        "group relative cursor-grab overflow-hidden rounded-lg border border-border bg-background shadow-sm",
        "hover:border-ring hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 ease-out",
        "active:scale-[0.98] active:transition-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isDragging && "opacity-30",
        isHighPriority && "bg-gradient-to-r from-danger/10 to-transparent",
      )}
    >
      {/* Left-edge accent bar — red when blocked, otherwise status color */}
      <div
        className={cn(
          "absolute inset-y-0 left-0 w-[3px]",
          isBlocked ? "bg-red-500" : statusAccentColor[issue.status],
        )}
      />

      <div className="pl-3.5 pr-3 py-3">
        {/* Header: ID + Priority + Blocked pill */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-xs text-muted-foreground font-mono truncate" title={issue.id}>
            {shortId(issue.id)}
          </span>
          <div className="flex items-center gap-1.5">
            {isBlocked && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
                Blocked
              </span>
            )}
            <PriorityIndicator priority={issue.priority} />
          </div>
        </div>

        {/* Title */}
        <p className="text-sm font-medium leading-snug line-clamp-2 mb-2" title={issue.title}>
          {issue.title}
        </p>

        {/* Footer: Type + Assignee + Labels */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <TypeBadge type={issue.issue_type} />
            {issue.labels.length > 0 && (
              <div
                className="flex items-center gap-1 truncate max-w-[120px]"
                title={issue.labels.join(", ")}
              >
                <LabelBadge
                  name={issue.labels[0]}
                  color={(issue.labelColors ?? {})[issue.labels[0]] as LabelColor | undefined}
                  size="sm"
                />
                {issue.labels.length > 1 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{issue.labels.length - 1}
                  </span>
                )}
              </div>
            )}
          </div>

          {issue.assignee && (
            <span
              className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-gradient-to-br from-primary/80 to-primary text-[10px] font-semibold text-primary-foreground shrink-0"
              title={issue.assignee}
            >
              {issue.assignee.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

/** Drag overlay version — renders without dnd hooks */
export function KanbanCardOverlay({ issue }: { issue: IssueListItem }) {
  return (
    <div
      className="relative overflow-hidden rounded-lg border border-ring bg-background shadow-lg ring-2 ring-ring cursor-grabbing rotate-2 w-[260px]"
      aria-hidden
    >
      <div className={cn("absolute inset-y-0 left-0 w-[3px]", statusAccentColor[issue.status])} />
      <div className="pl-3.5 pr-3 py-3">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-xs text-muted-foreground font-mono truncate" title={issue.id}>
            {shortId(issue.id)}
          </span>
          <PriorityIndicator priority={issue.priority} />
        </div>
        <p className="text-sm font-medium leading-snug line-clamp-2 mb-2">{issue.title}</p>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <TypeBadge type={issue.issue_type} />
            {issue.labels.length > 0 && (
              <div
                className="flex items-center gap-1 truncate max-w-[120px]"
                title={issue.labels.join(", ")}
              >
                <LabelBadge
                  name={issue.labels[0]}
                  color={(issue.labelColors ?? {})[issue.labels[0]] as LabelColor | undefined}
                  size="sm"
                />
                {issue.labels.length > 1 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{issue.labels.length - 1}
                  </span>
                )}
              </div>
            )}
          </div>
          {issue.assignee && (
            <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-gradient-to-br from-primary/80 to-primary text-[10px] font-semibold text-primary-foreground shrink-0">
              {issue.assignee.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
