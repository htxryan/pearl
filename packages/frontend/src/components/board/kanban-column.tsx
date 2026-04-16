import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { IssueListItem, IssueStatus } from "@pearl/shared";
import { memo, useRef, useState } from "react";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import { KanbanCard } from "./kanban-card";

interface KanbanColumnProps {
  status: IssueStatus;
  issues: IssueListItem[];
  onCardClick: (id: string) => void;
  isDropTarget?: boolean;
  onQuickAdd?: (title: string, status: IssueStatus) => void;
  mobile?: boolean;
}

export const KanbanColumn = memo(function KanbanColumn({
  status,
  issues,
  onCardClick,
  isDropTarget,
  onQuickAdd,
  mobile,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${status}`,
    data: { type: "column", status },
  });

  const issueIds = issues.map((i) => i.id);

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border border-border bg-muted/30",
        "transition-colors duration-150",
        mobile ? "w-full" : "min-w-[280px] w-[280px]",
        (isOver || isDropTarget) && "border-ring bg-ring/5",
      )}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5">
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
          {issues.map((issue, index) => (
            <div
              key={issue.id}
              role="listitem"
              className="animate-fade-up [animation-fill-mode:backwards]"
              style={{ animationDelay: `${Math.min(index * 40, 300)}ms` }}
            >
              <KanbanCard issue={issue} onClick={onCardClick} />
            </div>
          ))}
        </SortableContext>

        {issues.length === 0 && (
          <div className="flex flex-col items-center justify-center h-20 gap-1 text-muted-foreground">
            <span className="text-lg opacity-20" aria-hidden="true">
              &#9744;
            </span>
            <span className="text-xs">No issues</span>
          </div>
        )}
      </div>

      {/* Quick add at bottom */}
      {onQuickAdd && <ColumnQuickAdd status={status} onQuickAdd={onQuickAdd} />}
    </div>
  );
});

function ColumnQuickAdd({
  status,
  onQuickAdd,
}: {
  status: IssueStatus;
  onQuickAdd: (title: string, status: IssueStatus) => void;
}) {
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (!title.trim()) return;
    onQuickAdd(title.trim(), status);
    setTitle("");
  };

  return (
    <div className="px-2 py-1.5 bg-muted/30 rounded-b-lg">
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleSubmit();
          }
          if (e.key === "Escape") {
            setTitle("");
            inputRef.current?.blur();
          }
        }}
        placeholder="+ Add issue..."
        className="w-full bg-transparent text-xs placeholder:text-muted-foreground focus:outline-none py-1"
        aria-label={`Quick add issue to ${status}`}
      />
    </div>
  );
}
