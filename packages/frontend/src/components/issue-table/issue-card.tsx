import { memo } from "react";
import type { IssueListItem, LabelColor } from "@beads-gui/shared";
import { StatusBadge } from "@/components/ui/status-badge";
import { PriorityIndicator } from "@/components/ui/priority-indicator";
import { TypeBadge } from "@/components/ui/type-badge";
import { LabelBadge } from "@/components/ui/label-badge";

interface IssueCardProps {
  issue: IssueListItem;
  onClick: (id: string) => void;
}

/** Mobile-friendly card for issue list. Replaces the table row on narrow viewports. */
export const IssueCard = memo(function IssueCard({ issue, onClick }: IssueCardProps) {
  return (
    <button
      onClick={() => onClick(issue.id)}
      className="w-full text-left min-h-[44px] rounded-lg border border-border bg-background p-3 space-y-2 hover:border-ring hover:shadow-sm transition-all active:scale-[0.99] active:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label={`${issue.id}: ${issue.title}`}
    >
      {/* Top row: ID + Priority */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground font-mono truncate">{issue.id}</span>
        <PriorityIndicator priority={issue.priority} />
      </div>

      {/* Title */}
      <p className="text-sm font-medium leading-snug line-clamp-2">{issue.title}</p>

      {/* Labels */}
      {issue.labels.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {issue.labels.slice(0, 3).map((label) => (
            <LabelBadge
              key={label}
              name={label}
              color={(issue.labelColors ?? {})[label] as LabelColor | undefined}
              size="sm"
            />
          ))}
          {issue.labels.length > 3 && (
            <span className="text-[10px] text-muted-foreground">+{issue.labels.length - 3}</span>
          )}
        </div>
      )}

      {/* Bottom row: Status + Type + Assignee */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <StatusBadge status={issue.status} />
          <TypeBadge type={issue.issue_type} />
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
    </button>
  );
});

interface IssueCardListProps {
  issues: IssueListItem[];
  isLoading: boolean;
  onCardClick: (id: string) => void;
}

/** Mobile card list view — replaces IssueTable on narrow viewports */
export function IssueCardList({ issues, isLoading, onCardClick }: IssueCardListProps) {
  if (isLoading && issues.length === 0) {
    return (
      <div className="p-4 space-y-3" role="status" aria-label="Loading issues" aria-busy>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-lg border border-border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 rounded skeleton-shimmer" />
              <div className="h-4 w-6 rounded skeleton-shimmer" />
            </div>
            <div className="h-4 w-full rounded skeleton-shimmer" />
            <div className="flex items-center justify-between">
              <div className="h-5 w-16 rounded skeleton-shimmer" />
              <div className="h-6 w-6 rounded-full skeleton-shimmer" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (issues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <span className="text-4xl mb-2" aria-hidden="true">&#9744;</span>
        <p className="text-sm">No issues found</p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2" role="list" aria-label="Issues">
      {issues.map((issue) => (
        <div key={issue.id} role="listitem">
          <IssueCard issue={issue} onClick={onCardClick} />
        </div>
      ))}
    </div>
  );
}
