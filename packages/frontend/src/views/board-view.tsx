import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { ISSUE_STATUSES, type IssueListItem, type IssueStatus } from "@beads-gui/shared";
import { KanbanColumn } from "@/components/board/kanban-column";
import { KanbanCardOverlay } from "@/components/board/kanban-card";
import { FilterBar, EMPTY_FILTERS } from "@/components/issue-table/filter-bar";
import { useIssues, useUpdateIssue, useCreateIssue } from "@/hooks/use-issues";
import { useKeyboardScope } from "@/hooks/use-keyboard-scope";
import { useCommandPaletteActions, type CommandAction } from "@/hooks/use-command-palette";
import { useUrlFilters, buildApiParams } from "@/hooks/use-url-filters";
import { useToastActions } from "@/hooks/use-toast";
import { useUndoActions } from "@/hooks/use-undo";

/** Statuses that users can drag cards into */
const DROPPABLE_STATUSES: Set<IssueStatus> = new Set([
  "open",
  "in_progress",
  "closed",
  "deferred",
]);

/** Column order for display */
const COLUMN_ORDER: IssueStatus[] = ISSUE_STATUSES;

export function BoardView() {
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Shared URL filter state (same as List view)
  const { filters, sorting, setFilters } = useUrlFilters();
  const apiParams = useMemo(
    () => buildApiParams(filters, sorting),
    [filters, sorting],
  );

  // Data fetching — shared cache with List view
  const { data: issues = [], isLoading } = useIssues(apiParams);

  // Mutation for status changes
  const updateMutation = useUpdateIssue();
  const { mutate: updateStatus } = updateMutation;
  const createMutation = useCreateIssue();
  const toast = useToastActions();
  const undo = useUndoActions();

  // Quick add handler for board columns
  const handleColumnQuickAdd = useCallback(
    (title: string, status: IssueStatus) => {
      createMutation.mutate(
        { title },
        {
          onSuccess: (response) => {
            toast.success(`Created "${title}"`);
            // If created in a non-open column, update status
            if (status !== "open" && response.data) {
              updateStatus({ id: response.data.id, data: { status } });
            }
          },
          onError: () => {
            toast.error("Failed to create issue.");
          },
        },
      );
    },
    [createMutation, toast, updateStatus],
  );

  // Drag state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumnStatus, setOverColumnStatus] = useState<IssueStatus | null>(null);
  const isDragging = activeId !== null;

  // Group issues by status
  const columnData = useMemo(() => {
    const grouped: Record<IssueStatus, IssueListItem[]> = {
      open: [],
      in_progress: [],
      closed: [],
      blocked: [],
      deferred: [],
    };
    for (const issue of issues) {
      if (grouped[issue.status]) {
        grouped[issue.status].push(issue);
      }
    }
    return grouped;
  }, [issues]);

  // Find the active issue for the drag overlay
  const activeIssue = useMemo(
    () => (activeId ? issues.find((i) => i.id === activeId) : undefined),
    [activeId, issues],
  );

  // DnD sensors
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 5 },
  });
  const keyboardSensor = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  });
  const sensors = useSensors(pointerSensor, keyboardSensor);

  // Extract status from a droppable/sortable ID
  const getStatusFromDroppableId = useCallback(
    (id: string | number): IssueStatus | null => {
      const strId = String(id);
      // Column droppable IDs are "column-{status}"
      if (strId.startsWith("column-")) {
        return strId.slice("column-".length) as IssueStatus;
      }
      // Otherwise it's a card ID — find its column
      const issue = issues.find((i) => i.id === strId);
      return issue?.status ?? null;
    },
    [issues],
  );

  // Drag handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const overId = event.over?.id;
      if (!overId) {
        setOverColumnStatus(null);
        return;
      }
      const status = getStatusFromDroppableId(overId);
      setOverColumnStatus(status);
    },
    [getStatusFromDroppableId],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      setOverColumnStatus(null);

      if (!over) return;

      const issueId = String(active.id);
      const targetStatus = getStatusFromDroppableId(over.id);
      if (!targetStatus) return;

      // Find the issue's current status
      const issue = issues.find((i) => i.id === issueId);
      if (!issue) return;

      // No-op if same column
      if (issue.status === targetStatus) return;

      // Don't allow dragging into blocked (auto-computed)
      if (!DROPPABLE_STATUSES.has(targetStatus)) return;

      // Record undo and trigger optimistic status update
      const oldStatus = issue.status;
      const title = issue.title;
      updateStatus(
        { id: issueId, data: { status: targetStatus } },
        {
          onSuccess: () => {
            undo.recordStatusChange(issueId, title, oldStatus, targetStatus);
          },
        },
      );
    },
    [issues, getStatusFromDroppableId, updateStatus, undo],
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setOverColumnStatus(null);
  }, []);

  // Card click → Detail view
  const handleCardClick = useCallback(
    (id: string) => {
      navigate(`/issues/${id}`, { state: { from: "/board" } });
    },
    [navigate],
  );

  // Keyboard shortcuts
  const keyBindings = useMemo(
    () => [
      {
        key: "/",
        handler: () => searchInputRef.current?.focus(),
        description: "Focus search",
      },
    ],
    [],
  );

  useKeyboardScope("board", keyBindings);

  // Command palette actions
  const paletteActions: CommandAction[] = useMemo(
    () => [
      {
        id: "board-focus-search",
        label: "Focus search",
        shortcut: "/",
        group: "Board",
        handler: () => searchInputRef.current?.focus(),
      },
      {
        id: "board-clear-filters",
        label: "Clear all filters",
        group: "Board",
        handler: () => setFilters(EMPTY_FILTERS),
      },
    ],
    [setFilters],
  );

  useCommandPaletteActions("board-view", paletteActions);

  // Show mutation errors via toast
  useEffect(() => {
    if (!updateMutation.isError || !updateMutation.error) return;
    toast.error(updateMutation.error.message || "Failed to update status");
  }, [updateMutation.isError, updateMutation.error, toast]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar — same filter bar as list view */}
      <div className="shrink-0 bg-muted/30 px-4 py-3">
        <FilterBar
          filters={filters}
          onChange={setFilters}
          searchInputRef={searchInputRef}
        />
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        {isLoading && issues.length === 0 ? (
          <BoardSkeleton />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <div
              className="flex gap-4 h-full"
              role="region"
              aria-label="Kanban board"
            >
              {COLUMN_ORDER.map((status) => (
                <KanbanColumn
                  key={status}
                  status={status}
                  issues={columnData[status]}
                  onCardClick={handleCardClick}
                  isDropTarget={isDragging && overColumnStatus === status}
                  onQuickAdd={handleColumnQuickAdd}
                />
              ))}
            </div>

            <DragOverlay dropAnimation={null}>
              {activeIssue ? (
                <KanbanCardOverlay issue={activeIssue} />
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div className="flex gap-4 h-full" role="status" aria-label="Loading board" aria-busy>
      {COLUMN_ORDER.map((status, colIdx) => (
        <div
          key={status}
          className="flex flex-col min-w-[280px] w-[280px] rounded-lg border border-border bg-muted/30"
        >
          {/* Column header skeleton */}
          <div className="px-3 py-2.5">
            <div className="h-5 w-20 rounded-full skeleton-shimmer" />
          </div>
          {/* Card skeletons */}
          <div className="p-2 space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-lg border border-border/50 p-3 space-y-2"
                style={{ animationDelay: `${(colIdx * 3 + i) * 60}ms` }}
              >
                <div className="flex items-center justify-between">
                  <div className="h-3 w-20 rounded skeleton-shimmer" />
                  <div className="h-4 w-6 rounded skeleton-shimmer" />
                </div>
                <div className="h-4 w-full rounded skeleton-shimmer" />
                <div className="h-3.5 w-2/3 rounded skeleton-shimmer" />
                <div className="flex items-center justify-between">
                  <div className="h-3.5 w-10 rounded skeleton-shimmer" />
                  <div className="h-6 w-6 rounded-full skeleton-shimmer" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
