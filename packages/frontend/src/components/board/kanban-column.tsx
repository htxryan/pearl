import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { IssueListItem, IssueStatus } from "@beads-gui/shared";
import { StatusBadge } from "@/components/ui/status-badge";
import { KanbanCard } from "./kanban-card";
import { cn } from "@/lib/utils";

interface KanbanColumnProps {
  status: IssueStatus;
  issues: IssueListItem[];
  onCardClick: (id: string) => void;
  isDropTarget?: boolean;
}

export function KanbanColumn({
  status,
  issues,
  onCardClick,
  isDropTarget,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${status}`,
    data: { type: "column", status },
  });

  const issueIds = issues.map((i) => i.id);

  return (
    <div
      className={cn(
        "flex flex-col min-w-[280px] w-[280px] rounded-lg border border-border bg-muted/30",
        "transition-colors duration-150",
        (isOver || isDropTarget) && "border-ring bg-ring/5",
      )}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <StatusBadge status={status} />
        <span className="text-xs font-medium text-muted-foreground tabular-nums">
          {issues.length}
        </span>
      </div>

      {/* Card list */}
      <div
        ref={setNodeRef}
        className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[120px]"
        role="list"
        aria-label={`${status} issues`}
      >
        <SortableContext items={issueIds} strategy={verticalListSortingStrategy}>
          {issues.map((issue) => (
            <div key={issue.id} role="listitem">
              <KanbanCard issue={issue} onClick={onCardClick} />
            </div>
          ))}
        </SortableContext>

        {issues.length === 0 && (
          <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
            No issues
          </div>
        )}
      </div>
    </div>
  );
}
