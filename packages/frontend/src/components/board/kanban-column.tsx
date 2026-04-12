import { memo, useState, useRef } from "react";
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
  onQuickAdd?: (title: string, status: IssueStatus) => void;
}

export const KanbanColumn = memo(function KanbanColumn({
  status,
  issues,
  onCardClick,
  isDropTarget,
  onQuickAdd,
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
          <div className="flex flex-col items-center justify-center h-20 gap-1 text-muted-foreground">
            <span className="text-lg opacity-20" aria-hidden="true">&#9744;</span>
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
    <div className="border-t border-border px-2 py-1.5">
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); handleSubmit(); }
          if (e.key === "Escape") { setTitle(""); inputRef.current?.blur(); }
        }}
        placeholder="+ Add issue..."
        className="w-full bg-transparent text-xs placeholder:text-muted-foreground focus:outline-none py-1"
        aria-label={`Quick add issue to ${status}`}
      />
    </div>
  );
}
