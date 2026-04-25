import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { IssueListItem, IssueStatus } from "@pearl/shared";
import { memo, useRef, useState } from "react";
import { CustomSelect } from "@/components/ui/custom-select";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import { BOARD_SORT_MODES, type BoardSortMode } from "@/views/board-sort";
import { KanbanCard } from "./kanban-card";

interface KanbanColumnProps {
  status: IssueStatus;
  issues: IssueListItem[];
  onCardClick: (id: string) => void;
  isDropTarget?: boolean;
  onQuickAdd?: (title: string, status: IssueStatus) => void;
  mobile?: boolean;
  blockedIds?: Set<string>;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  sortMode?: BoardSortMode;
  onSortChange?: (status: IssueStatus, mode: BoardSortMode) => void;
}

export const KanbanColumn = memo(function KanbanColumn({
  status,
  issues,
  onCardClick,
  isDropTarget,
  onQuickAdd,
  mobile,
  blockedIds,
  collapsed,
  onToggleCollapse,
  sortMode,
  onSortChange,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${status}`,
    data: { type: "column", status },
  });

  const issueIds = issues.map((i) => i.id);

  if (collapsed && !mobile) {
    return (
      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-col items-center rounded-lg border border-border bg-surface-raised",
          "transition-colors duration-150 w-[48px] min-w-[48px] cursor-pointer select-none",
          (isOver || isDropTarget) && "border-ring ring-2 ring-ring/30 bg-ring/10",
        )}
        onClick={onToggleCollapse}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggleCollapse?.();
          }
        }}
        aria-label={`Expand ${status} column (${issues.length} issues)`}
        aria-expanded={false}
      >
        <div className="py-3 flex flex-col items-center gap-2">
          <StatusBadge status={status} />
          <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1 rounded-full bg-muted text-xs font-semibold text-muted-foreground tabular-nums">
            {issues.length}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border border-border bg-surface-raised",
        "transition-all duration-150",
        mobile ? "w-full" : "min-w-[280px] w-[280px]",
        (isOver || isDropTarget) && "border-ring ring-2 ring-ring/30 bg-ring/10 scale-[1.01]",
      )}
    >
      {/* Column header */}
      <div
        className={cn(
          "flex items-center justify-between gap-2 px-3 py-2.5",
          onToggleCollapse && "cursor-pointer",
        )}
        onClick={onToggleCollapse}
        onKeyDown={
          onToggleCollapse
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onToggleCollapse();
                }
              }
            : undefined
        }
        role={onToggleCollapse ? "button" : undefined}
        tabIndex={onToggleCollapse ? 0 : undefined}
        aria-expanded={onToggleCollapse ? true : undefined}
        aria-label={onToggleCollapse ? `Collapse ${status} column` : undefined}
      >
        <div className="flex items-center gap-2 min-w-0">
          <StatusBadge status={status} />
          <span className="text-xs font-medium text-muted-foreground tabular-nums">
            {issues.length}
          </span>
        </div>
        {sortMode && onSortChange && (
          <div
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="presentation"
          >
            <CustomSelect<BoardSortMode>
              options={BOARD_SORT_MODES.map((o) => ({ value: o.value, label: o.label }))}
              value={sortMode}
              onChange={(value) => onSortChange(status, value)}
              size="sm"
              triggerClassName="border-transparent bg-transparent hover:bg-muted/60"
              aria-label={`Sort ${status} column`}
            />
          </div>
        )}
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
              <KanbanCard
                issue={issue}
                onClick={onCardClick}
                isBlocked={blockedIds?.has(issue.id)}
              />
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
    <div className="px-2 py-1.5 bg-surface-raised rounded-b-lg">
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
