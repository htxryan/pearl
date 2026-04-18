import {
  closestCorners,
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { type IssueListItem, type IssueStatus, SETTABLE_STATUSES } from "@pearl/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { KanbanCardOverlay } from "@/components/board/kanban-card";
import { KanbanColumn } from "@/components/board/kanban-column";
import { ACTIVE_FILTERS, FilterBar } from "@/components/issue-table/filter-bar";
import { type CommandAction, useCommandPaletteActions } from "@/hooks/use-command-palette";
import { useAllDependencies } from "@/hooks/use-dependencies";
import { useCreateIssue, useIssues, useUpdateIssue } from "@/hooks/use-issues";
import { useKeyboardScope } from "@/hooks/use-keyboard-scope";
import { useIsMobile } from "@/hooks/use-media-query";
import { useToastActions } from "@/hooks/use-toast";
import { useUndoActions } from "@/hooks/use-undo";
import { buildApiParams, useUrlFilters } from "@/hooks/use-url-filters";
import { cn } from "@/lib/utils";
import { statusLabel } from "@/views/detail-components";

/** Statuses that users can drag cards into — same as board columns */
const DROPPABLE_STATUSES: Set<IssueStatus> = new Set(SETTABLE_STATUSES);

/** Column order for display — no "blocked" column (it's a derived state shown as a pill) */
const COLUMN_ORDER: readonly IssueStatus[] = SETTABLE_STATUSES;

export function BoardView() {
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Shared URL filter state (same as List view)
  const { filters, sorting, setFilters } = useUrlFilters();

  const apiParams = useMemo(() => buildApiParams(filters, sorting), [filters, sorting]);

  // Data fetching — shared cache with List view
  const { data: issues = [], isLoading } = useIssues(apiParams);
  const { data: allDeps = [] } = useAllDependencies();

  // Compute which issues are dependency-blocked (have an open dep they depend on)
  const blockedIds = useMemo(() => {
    const closedStatuses = new Set(["closed"]);
    const issueMap = new Map(issues.map((i) => [i.id, i]));
    const blocked = new Set<string>();
    for (const dep of allDeps) {
      if (dep.type !== "blocks" && dep.type !== "depends_on") continue;
      // dep.issue_id depends on dep.depends_on_id
      const blocker = issueMap.get(dep.depends_on_id);
      if (blocker && !closedStatuses.has(blocker.status)) {
        blocked.add(dep.issue_id);
      }
    }
    return blocked;
  }, [issues, allDeps]);

  // Toggle to show/hide blocked issues
  const [showBlocked, setShowBlocked] = useState(true);

  // Closed column collapsed by default to reduce noise
  const [closedCollapsed, setClosedCollapsed] = useState(false);

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

  // Group issues by status — items with status "blocked" fall into "open"
  const columnData = useMemo(() => {
    const grouped: Record<IssueStatus, IssueListItem[]> = {
      open: [],
      in_progress: [],
      closed: [],
      blocked: [],
      deferred: [],
    };
    for (const issue of issues) {
      // If "Show Blocked" is off, hide dependency-blocked items
      if (!showBlocked && blockedIds.has(issue.id)) continue;
      // Issues with status "blocked" (legacy/manual) go to "open"
      const col = issue.status === "blocked" ? "open" : issue.status;
      if (grouped[col]) {
        grouped[col].push(issue);
      }
    }
    return grouped;
  }, [issues, showBlocked, blockedIds]);

  // Find the active issue for the drag overlay
  const activeIssue = useMemo(
    () => (activeId ? issues.find((i) => i.id === activeId) : undefined),
    [activeId, issues],
  );

  // DnD sensors — TouchSensor with delay avoids conflicts with scroll on mobile
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 5 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 200, tolerance: 5 },
  });
  const keyboardSensor = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  });
  const sensors = useSensors(pointerSensor, touchSensor, keyboardSensor);

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
            toast.success(`Moved "${title}" to ${statusLabel(targetStatus)}`);
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
        handler: () => setFilters(ACTIVE_FILTERS),
      },
    ],
    [setFilters],
  );

  useCommandPaletteActions("board-view", paletteActions);

  const isMobile = useIsMobile();

  // Mobile column navigation
  const [mobileColumnIdx, setMobileColumnIdx] = useState(0);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (isDragging) return;
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      const dy = e.changedTouches[0].clientY - touchStartY.current;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
        setMobileColumnIdx((prev) => {
          if (dx < 0) return Math.min(prev + 1, COLUMN_ORDER.length - 1);
          return Math.max(prev - 1, 0);
        });
      }
    },
    [isDragging],
  );

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
          hideGroupBy
        />
        {blockedIds.size > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowBlocked((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                showBlocked
                  ? "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-400 dark:hover:bg-red-900/60"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
              aria-pressed={showBlocked}
            >
              <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold text-white">
                {blockedIds.size}
              </span>
              {showBlocked ? "Blocked visible" : "Blocked hidden"}
            </button>
          </div>
        )}
      </div>

      {/* Board */}
      <div
        className={cn(
          "flex-1",
          isMobile ? "overflow-y-auto flex flex-col" : "overflow-x-auto overflow-y-hidden p-4",
        )}
      >
        {isLoading && issues.length === 0 ? (
          <BoardSkeleton isMobile={isMobile} />
        ) : isMobile ? (
          /* Mobile: tab bar + single column with swipe */
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            {/* Tab bar */}
            <div
              className="shrink-0 flex border-b border-border bg-muted/30 px-2 overflow-x-auto"
              role="tablist"
              aria-label="Board columns"
            >
              {COLUMN_ORDER.map((status, idx) => (
                <button
                  key={status}
                  type="button"
                  role="tab"
                  aria-selected={idx === mobileColumnIdx}
                  aria-controls={`board-panel-${status}`}
                  className={cn(
                    "flex items-center gap-1.5 min-h-[44px] px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap",
                    idx === mobileColumnIdx
                      ? "text-foreground border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => setMobileColumnIdx(idx)}
                >
                  {statusLabel(status)}
                  <span
                    className={cn(
                      "inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold",
                      idx === mobileColumnIdx
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {columnData[status].length}
                  </span>
                </button>
              ))}
            </div>

            {/* Swipeable column area */}
            <div
              className="flex-1 p-4 overflow-y-auto"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              role="tabpanel"
              id={`board-panel-${COLUMN_ORDER[mobileColumnIdx]}`}
              aria-label={`${statusLabel(COLUMN_ORDER[mobileColumnIdx])} column`}
            >
              <section aria-label="Kanban board">
                <KanbanColumn
                  key={COLUMN_ORDER[mobileColumnIdx]}
                  status={COLUMN_ORDER[mobileColumnIdx]}
                  issues={columnData[COLUMN_ORDER[mobileColumnIdx]]}
                  onCardClick={handleCardClick}
                  isDropTarget={isDragging && overColumnStatus === COLUMN_ORDER[mobileColumnIdx]}
                  onQuickAdd={handleColumnQuickAdd}
                  mobile={isMobile}
                  blockedIds={blockedIds}
                />
              </section>
            </div>

            <DragOverlay dropAnimation={null}>
              {activeIssue ? <KanbanCardOverlay issue={activeIssue} /> : null}
            </DragOverlay>
          </DndContext>
        ) : (
          /* Desktop: all columns side by side */
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <section className="flex gap-4 h-full" aria-label="Kanban board">
              {COLUMN_ORDER.map((status) => (
                <KanbanColumn
                  key={status}
                  status={status}
                  issues={columnData[status]}
                  onCardClick={handleCardClick}
                  isDropTarget={isDragging && overColumnStatus === status}
                  onQuickAdd={handleColumnQuickAdd}
                  mobile={false}
                  blockedIds={blockedIds}
                  collapsed={status === "closed" ? closedCollapsed : undefined}
                  onToggleCollapse={
                    status === "closed" ? () => setClosedCollapsed((v) => !v) : undefined
                  }
                />
              ))}
            </section>

            <DragOverlay dropAnimation={null}>
              {activeIssue ? <KanbanCardOverlay issue={activeIssue} /> : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  );
}

function BoardSkeleton({ isMobile }: { isMobile?: boolean }) {
  if (isMobile) {
    return (
      <div role="status" aria-label="Loading board" aria-busy>
        {/* Tab bar skeleton */}
        <div className="shrink-0 flex border-b border-border bg-muted/30 px-2 gap-2">
          {COLUMN_ORDER.map((status, idx) => (
            <div key={status} className="flex items-center gap-1.5 min-h-[44px] px-3 py-2">
              <div
                className="h-4 w-16 rounded skeleton-shimmer"
                style={{ animationDelay: `${idx * 80}ms` }}
              />
            </div>
          ))}
        </div>
        {/* Single column card skeletons */}
        <div className="p-4 space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-lg border border-border/50 p-3 space-y-2"
              style={{ animationDelay: `${i * 60}ms` }}
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
    );
  }

  return (
    <div className="flex gap-4 h-full" role="status" aria-label="Loading board" aria-busy>
      {COLUMN_ORDER.map((status, colIdx) => (
        <div
          key={status}
          className="flex flex-col rounded-lg border border-border bg-muted/30 min-w-[280px] w-[280px]"
        >
          <div className="px-3 py-2.5">
            <div className="h-5 w-20 rounded-full skeleton-shimmer" />
          </div>
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
