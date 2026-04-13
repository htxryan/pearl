import { useParams, useNavigate, useLocation, Navigate } from "react-router";
import { useMemo, useCallback, useEffect, useState, Children } from "react";
import type { Issue, IssueStatus, Priority, IssueType, LabelColor } from "@beads-gui/shared";
import { ISSUE_STATUSES, ISSUE_PRIORITIES, ISSUE_TYPES } from "@beads-gui/shared";
import { LabelPicker } from "@/components/ui/label-picker";
import { DatePicker } from "@/components/ui/date-picker";
import {
  useIssue,
  useComments,
  useEvents,
  useDependencies,
  useUpdateIssue,
  useCloseIssue,
  useAddComment,
  useAddDependency,
  useRemoveDependency,
} from "@/hooks/use-issues";
import { useKeyboardScope } from "@/hooks/use-keyboard-scope";
import { useCommandPaletteActions, type CommandAction } from "@/hooks/use-command-palette";
import { StatusBadge } from "@/components/ui/status-badge";
import { PriorityIndicator } from "@/components/ui/priority-indicator";
import { TypeBadge } from "@/components/ui/type-badge";
import { Button } from "@/components/ui/button";
import { MarkdownSection } from "@/components/detail/markdown-section";
import { CommentThread } from "@/components/detail/comment-thread";
import { ActivityTimeline } from "@/components/detail/activity-timeline";
import { DependencyList } from "@/components/detail/dependency-list";
import { FieldEditor } from "@/components/detail/field-editor";
import { RelativeTime } from "@/components/ui/relative-time";
import { useToastActions } from "@/hooks/use-toast";
import { useUndoActions } from "@/hooks/use-undo";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";


export function DetailView() {
  const { id } = useParams<{ id: string }>();
  if (!id) return <Navigate to="/list" replace />;
  return <DetailViewContent id={id} />;
}

const VIEW_LABELS: Record<string, string> = {
  "/list": "List",
  "/board": "Board",
  "/graph": "Graph",
};

function DetailViewContent({ id }: { id: string }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine where the user came from for breadcrumbs
  const fromPath = (location.state as { from?: string } | null)?.from;
  const backPath = fromPath && VIEW_LABELS[fromPath] ? fromPath : "/list";
  const backLabel = VIEW_LABELS[backPath] ?? "List";

  // Data fetching
  const { data: issue, isLoading, error } = useIssue(id);
  const { data: comments = [] } = useComments(id);
  const { data: events = [] } = useEvents(id);
  const { data: dependencies = [] } = useDependencies(id);

  // Mutations
  const updateMutation = useUpdateIssue();
  const closeMutation = useCloseIssue();
  const addCommentMutation = useAddComment();
  const addDepMutation = useAddDependency();
  const removeDepMutation = useRemoveDependency();

  const toast = useToastActions();
  const undo = useUndoActions();

  // Confirmation dialog state
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  // Dirty state for unsaved changes warning
  const [dirtyFields, setDirtyFields] = useState<Set<string>>(new Set());
  const isDirty = dirtyFields.size > 0;

  // Unsaved changes warning (beforeunload)
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Field update handler
  const handleFieldUpdate = useCallback(
    (field: string, value: unknown) => {
      const oldValue = issue ? (issue as unknown as Record<string, unknown>)[field] : undefined;
      setDirtyFields((prev) => new Set(prev).add(field));
      updateMutation.mutate(
        { id, data: { [field]: value } },
        {
          onSuccess: () => {
            setDirtyFields((prev) => {
              const next = new Set(prev);
              next.delete(field);
              return next;
            });
            // Record undo for field changes (skip for trivial fields)
            if (issue && oldValue !== value) {
              undo.recordFieldEdit(id, issue.title, field, oldValue);
            }
          },
          onError: () => {
            setDirtyFields((prev) => {
              const next = new Set(prev);
              next.delete(field);
              return next;
            });
            toast.error(`Failed to update ${field}.`);
          },
        },
      );
    },
    [id, issue, updateMutation.mutate, undo, toast],
  );

  // Close handler
  const handleClose = useCallback(() => {
    const prevStatus = issue?.status ?? "open";
    closeMutation.mutate(
      { id },
      {
        onSuccess: () => {
          undo.recordClose(id, issue?.title ?? id, prevStatus);
          navigate(backPath);
        },
        onError: () => {
          toast.error("Failed to close issue. Please try again.");
        },
      },
    );
  }, [id, issue, closeMutation.mutate, navigate, backPath, undo, toast]);

  // Claim handler
  const handleClaim = useCallback(() => {
    updateMutation.mutate(
      { id, data: { claim: true } },
      {
        onSuccess: () => {
          toast.success("Issue claimed.");
        },
        onError: () => {
          toast.error("Failed to claim issue. Please try again.");
        },
      },
    );
  }, [id, updateMutation.mutate, toast]);

  // Keyboard shortcuts
  const keyBindings = useMemo(
    () => [
      {
        key: "Escape",
        handler: () => {
          if (isDirty) {
            if (window.confirm("You have unsaved changes. Discard them?")) {
              navigate(backPath);
            }
          } else {
            navigate(backPath);
          }
        },
        description: "Close detail panel",
      },
    ],
    [navigate, isDirty, backPath],
  );

  useKeyboardScope("detail", keyBindings);

  // Command palette actions
  const paletteActions: CommandAction[] = useMemo(
    () => [
      {
        id: "detail-close",
        label: "Close panel / Back to list",
        shortcut: "Esc",
        group: "Detail",
        handler: () => {
          if (isDirty) {
            if (window.confirm("You have unsaved changes. Discard them?")) {
              navigate(backPath);
            }
          } else {
            navigate(backPath);
          }
        },
      },
      {
        id: "detail-claim",
        label: "Claim this issue",
        group: "Detail",
        handler: handleClaim,
      },
    ],
    [navigate, handleClaim, isDirty, backPath],
  );

  useCommandPaletteActions("detail-view", paletteActions);

  // Loading state
  if (isLoading) {
    return <DetailSkeleton />;
  }

  // Error state
  if (error || !issue) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="text-4xl">!</div>
        <h2 className="text-xl font-semibold">Issue not found</h2>
        <p className="text-muted-foreground">
          {error?.message ?? `Could not load issue ${id}`}
        </p>
        <Button variant="outline" onClick={() => navigate(backPath)}>
          Back to {backLabel.toLowerCase()}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header bar */}
      <div className="shrink-0 bg-muted/30 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-sm shrink-0" aria-label="Breadcrumb">
              <button
                onClick={() => navigate(backPath)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {backLabel}
              </button>
              <span className="text-muted-foreground">/</span>
              <code className="text-muted-foreground">{issue.id}</code>
            </nav>
            <StatusBadge status={issue.status} />
            <PriorityIndicator priority={issue.priority} />
            <TypeBadge type={issue.issue_type} />
          </div>
          <div className="flex items-center gap-2">
            {issue.status !== "closed" && (
              <>
                <Button variant="outline" size="sm" onClick={handleClaim} disabled={updateMutation.isPending}>
                  Claim
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setShowCloseConfirm(true)} disabled={closeMutation.isPending}>
                  Close
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Title (click-to-edit) */}
        <FieldEditor
          value={issue.title}
          field="title"
          onSave={(val) => handleFieldUpdate("title", val)}
          className="mt-3"
          renderDisplay={(val) => (
            <h1 className="text-2xl font-semibold cursor-pointer hover:text-muted-foreground transition-colors">
              {val}
            </h1>
          )}
        />

        {isDirty && (
          <div className="mt-2 text-xs text-warning-foreground">
            Unsaved changes in: {Array.from(dirtyFields).join(", ")}
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <DetailSections>
          {/* Metadata fields */}
          <section>
            <h2 className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest mb-3">
              Fields
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <FieldRow label="Status">
                <SelectField
                  value={issue.status}
                  options={ISSUE_STATUSES.map((s) => ({ value: s, label: statusLabel(s) }))}
                  onChange={(v) => handleFieldUpdate("status", v)}
                  label="Status"
                />
              </FieldRow>
              <FieldRow label="Priority">
                <SelectField
                  value={String(issue.priority)}
                  options={ISSUE_PRIORITIES.map((p) => ({ value: String(p), label: `P${p}` }))}
                  onChange={(v) => handleFieldUpdate("priority", Number(v))}
                  label="Priority"
                />
              </FieldRow>
              <FieldRow label="Type">
                <SelectField
                  value={issue.issue_type}
                  options={ISSUE_TYPES.map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))}
                  onChange={(v) => handleFieldUpdate("issue_type", v)}
                  label="Type"
                />
              </FieldRow>
              <FieldRow label="Assignee">
                <FieldEditor
                  value={issue.assignee ?? ""}
                  field="assignee"
                  onSave={(val) => handleFieldUpdate("assignee", val || null)}
                  placeholder="Unassigned"
                />
              </FieldRow>
              <FieldRow label="Owner">
                <span className="text-sm">{issue.owner}</span>
              </FieldRow>
              <FieldRow label="Due Date">
                <DatePicker
                  value={issue.due_at ? issue.due_at.slice(0, 10) : null}
                  onChange={(date) => handleFieldUpdate("due", date)}
                />
              </FieldRow>
              <FieldRow label="Labels">
                <LabelPicker
                  selected={issue.labels}
                  selectedColors={(issue.labelColors ?? {}) as Record<string, LabelColor>}
                  onChange={(labels) => handleFieldUpdate("labels", labels)}
                />
              </FieldRow>
              <FieldRow label="Created">
                <span className="text-sm text-muted-foreground">
                  <RelativeTime iso={issue.created_at} /> by {issue.created_by}
                </span>
              </FieldRow>
              <FieldRow label="Updated">
                <RelativeTime iso={issue.updated_at} className="text-sm text-muted-foreground" />
              </FieldRow>
              {issue.closed_at && (
                <FieldRow label="Closed">
                  <RelativeTime iso={issue.closed_at} className="text-sm text-muted-foreground" />
                </FieldRow>
              )}
            </div>
          </section>

          {/* Description */}
          <MarkdownSection
            title="Description"
            content={issue.description}
            field="description"
            onSave={(val) => handleFieldUpdate("description", val)}
          />

          {/* Design Notes */}
          {(issue.design || issue.status !== "closed") && (
            <MarkdownSection
              title="Design Notes"
              content={issue.design}
              field="design"
              onSave={(val) => handleFieldUpdate("design", val)}
            />
          )}

          {/* Acceptance Criteria */}
          {(issue.acceptance_criteria || issue.status !== "closed") && (
            <MarkdownSection
              title="Acceptance Criteria"
              content={issue.acceptance_criteria}
              field="acceptance_criteria"
              onSave={(val) => handleFieldUpdate("acceptance_criteria", val)}
            />
          )}

          {/* Notes */}
          {(issue.notes || issue.status !== "closed") && (
            <MarkdownSection
              title="Notes"
              content={issue.notes}
              field="notes"
              onSave={(val) => handleFieldUpdate("notes", val)}
            />
          )}

          {/* Dependencies */}
          <DependencyList
            issueId={id}
            dependencies={dependencies}
            onAdd={(dependsOnId) =>
              addDepMutation.mutateAsync({ issue_id: id, depends_on_id: dependsOnId })
            }
            onRemove={(depIssueId, depDependsOnId) =>
              removeDepMutation.mutate({ issueId: depIssueId, dependsOnId: depDependsOnId })
            }
            isAdding={addDepMutation.isPending}
          />

          {/* Comments */}
          <CommentThread
            comments={comments}
            onAdd={(text) =>
              addCommentMutation.mutateAsync({ issueId: id, data: { text } })
            }
            isAdding={addCommentMutation.isPending}
          />

          {/* Activity Timeline */}
          <ActivityTimeline events={events} />
        </DetailSections>
      </div>

      <ConfirmDialog
        isOpen={showCloseConfirm}
        onConfirm={() => {
          setShowCloseConfirm(false);
          handleClose();
        }}
        onCancel={() => setShowCloseConfirm(false)}
        title="Close issue?"
        description={`Are you sure you want to close "${issue.title}"? This can be undone.`}
        confirmLabel="Close Issue"
        isPending={closeMutation.isPending}
      />
    </div>
  );
}

// ─── Helper Components ─────────────────────────────────

function DetailSections({ children }: { children: React.ReactNode }) {
  const items = Children.toArray(children).filter(Boolean);
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      {items.map((child, i) => (
        <ScrollRevealSection key={i} index={i}>
          {child}
        </ScrollRevealSection>
      ))}
    </div>
  );
}

/** Wraps a detail section with scroll-triggered fade-up entrance. */
function ScrollRevealSection({ children, index }: { children: React.ReactNode; index: number }) {
  const [ref, revealed] = useScrollReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={revealed ? "animate-fade-up [animation-fill-mode:backwards]" : "opacity-0"}
      style={revealed ? { animationDelay: `${index * 60}ms` } : undefined}
    >
      {children}
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground w-24 shrink-0">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function SelectField({
  value,
  options,
  onChange,
  label,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className="text-sm bg-transparent border border-border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}


function DetailSkeleton() {
  return (
    <div className="flex flex-col h-full">
      {/* Header skeleton */}
      <div className="shrink-0 bg-muted/30 px-4 sm:px-6 py-4 space-y-3">
        <div className="h-4 skeleton-shimmer rounded w-32" />
        <div className="h-7 skeleton-shimmer rounded w-80" />
      </div>
      {/* Content skeleton */}
      <div className="flex-1 p-4 sm:p-6 space-y-8 max-w-4xl">
        {/* Fields grid skeleton */}
        <div className="space-y-2">
          <div className="h-3 skeleton-shimmer rounded w-16 mb-3" />
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3 skeleton-shimmer rounded w-16" />
                <div className="h-5 skeleton-shimmer rounded w-28" />
              </div>
            ))}
          </div>
        </div>
        {/* Description skeleton */}
        <div className="space-y-2">
          <div className="h-3 skeleton-shimmer rounded w-24 mb-3" />
          <div className="space-y-2">
            <div className="h-4 skeleton-shimmer rounded w-full" />
            <div className="h-4 skeleton-shimmer rounded w-5/6" />
            <div className="h-4 skeleton-shimmer rounded w-3/4" />
          </div>
        </div>
        {/* Activity skeleton */}
        <div className="space-y-2">
          <div className="h-3 skeleton-shimmer rounded w-20" />
          <div className="h-12 skeleton-shimmer rounded" />
        </div>
      </div>
    </div>
  );
}

// ─── Utility Functions ─────────────────────────────────

function statusLabel(status: IssueStatus): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
