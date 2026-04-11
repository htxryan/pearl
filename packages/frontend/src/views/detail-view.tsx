import { useParams, useNavigate, Navigate } from "react-router";
import { useMemo, useCallback, useEffect, useState } from "react";
import type { Issue, IssueStatus, Priority, IssueType } from "@beads-gui/shared";
import { ISSUE_STATUSES, ISSUE_PRIORITIES, ISSUE_TYPES } from "@beads-gui/shared";
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


export function DetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Guard: redirect if no ID in route params
  if (!id) return <Navigate to="/list" replace />;

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

  // Dirty state for unsaved changes warning
  const [dirtyFields, setDirtyFields] = useState<Set<string>>(new Set());
  const isDirty = dirtyFields.size > 0;

  // Unsaved changes warning (beforeunload)
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Field update handler
  const handleFieldUpdate = useCallback(
    (field: string, value: unknown) => {
      if (!id) return;
      updateMutation.mutate(
        { id, data: { [field]: value } },
        {
          onSuccess: () => {
            setDirtyFields((prev) => {
              const next = new Set(prev);
              next.delete(field);
              return next;
            });
          },
        },
      );
    },
    [id, updateMutation],
  );

  // Close handler
  const handleClose = useCallback(() => {
    if (!id) return;
    closeMutation.mutate({ id }, { onSuccess: () => navigate("/list") });
  }, [id, closeMutation, navigate]);

  // Claim handler
  const handleClaim = useCallback(() => {
    if (!id) return;
    updateMutation.mutate({ id, data: { claim: true } });
  }, [id, updateMutation]);

  // Keyboard shortcuts
  const keyBindings = useMemo(
    () => [
      {
        key: "Escape",
        handler: () => {
          if (isDirty) {
            if (window.confirm("You have unsaved changes. Discard them?")) {
              navigate("/list");
            }
          } else {
            navigate("/list");
          }
        },
        description: "Close detail panel",
      },
    ],
    [navigate, isDirty],
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
              navigate("/list");
            }
          } else {
            navigate("/list");
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
    [navigate, handleClaim, isDirty],
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
        <Button variant="outline" onClick={() => navigate("/list")}>
          Back to list
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header bar */}
      <div className="shrink-0 border-b border-border px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate("/list")}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              title="Back to list (Esc)"
            >
              &larr;
            </button>
            <code className="shrink-0 text-sm text-muted-foreground">{issue.id}</code>
            <StatusBadge status={issue.status} />
            <PriorityIndicator priority={issue.priority} />
            <TypeBadge type={issue.issue_type} />
          </div>
          <div className="flex items-center gap-2">
            {issue.status !== "closed" && (
              <>
                <Button variant="outline" size="sm" onClick={handleClaim}>
                  Claim
                </Button>
                <Button variant="destructive" size="sm" onClick={handleClose}>
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
          <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
            Unsaved changes in: {Array.from(dirtyFields).join(", ")}
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-6 py-6 space-y-8">
          {/* Metadata fields */}
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
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
                <input
                  type="date"
                  value={issue.due_at ? issue.due_at.slice(0, 10) : ""}
                  onChange={(e) => handleFieldUpdate("due", e.target.value || null)}
                  aria-label="Due date"
                  className="text-sm bg-transparent border border-border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </FieldRow>
              <FieldRow label="Labels">
                <LabelEditor
                  labels={issue.labels}
                  onSave={(labels) => handleFieldUpdate("labels", labels)}
                />
              </FieldRow>
              <FieldRow label="Created">
                <span className="text-sm text-muted-foreground">
                  {formatDate(issue.created_at)} by {issue.created_by}
                </span>
              </FieldRow>
              <FieldRow label="Updated">
                <span className="text-sm text-muted-foreground">
                  {formatDate(issue.updated_at)}
                </span>
              </FieldRow>
              {issue.closed_at && (
                <FieldRow label="Closed">
                  <span className="text-sm text-muted-foreground">
                    {formatDate(issue.closed_at)}
                  </span>
                </FieldRow>
              )}
            </div>
          </section>

          {/* Description */}
          <MarkdownSection
            title="Description"
            content={issue.description}
            field="description"
            issueId={id}
            onSave={(val) => handleFieldUpdate("description", val)}
          />

          {/* Design Notes */}
          {(issue.design || issue.status !== "closed") && (
            <MarkdownSection
              title="Design Notes"
              content={issue.design}
              field="design"
              issueId={id}
              onSave={(val) => handleFieldUpdate("design", val)}
            />
          )}

          {/* Acceptance Criteria */}
          {(issue.acceptance_criteria || issue.status !== "closed") && (
            <MarkdownSection
              title="Acceptance Criteria"
              content={issue.acceptance_criteria}
              field="acceptance_criteria"
              issueId={id}
              onSave={(val) => handleFieldUpdate("acceptance_criteria", val)}
            />
          )}

          {/* Notes */}
          {(issue.notes || issue.status !== "closed") && (
            <MarkdownSection
              title="Notes"
              content={issue.notes}
              field="notes"
              issueId={id}
              onSave={(val) => handleFieldUpdate("notes", val)}
            />
          )}

          {/* Dependencies */}
          <DependencyList
            issueId={id}
            dependencies={dependencies}
            onAdd={(dependsOnId) =>
              addDepMutation.mutate({ issue_id: id, depends_on_id: dependsOnId })
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
              addCommentMutation.mutate({ issueId: id, data: { text } })
            }
            isAdding={addCommentMutation.isPending}
          />

          {/* Activity Timeline */}
          <ActivityTimeline events={events} />
        </div>
      </div>
    </div>
  );
}

// ─── Helper Components ─────────────────────────────────

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

function LabelEditor({
  labels,
  onSave,
}: {
  labels: string[];
  onSave: (labels: string[]) => void;
}) {
  const [inputValue, setInputValue] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      e.stopPropagation();
      const newLabel = inputValue.trim();
      if (!labels.includes(newLabel)) {
        onSave([...labels, newLabel]);
      }
      setInputValue("");
    }
    if (e.key === "Backspace" && !inputValue && labels.length > 0) {
      onSave(labels.slice(0, -1));
    }
  };

  const removeLabel = (label: string) => {
    onSave(labels.filter((l) => l !== label));
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {labels.map((label) => (
        <span
          key={label}
          className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
        >
          {label}
          <button
            onClick={() => removeLabel(label)}
            className="text-muted-foreground hover:text-foreground"
          >
            x
          </button>
        </span>
      ))}
      <input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={labels.length === 0 ? "Add labels..." : ""}
        aria-label="Add label"
        className="text-sm bg-transparent border-none outline-none min-w-[80px] flex-1"
      />
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col h-full animate-pulse">
      <div className="shrink-0 border-b border-border px-6 py-4 space-y-3">
        <div className="h-5 bg-muted rounded w-48" />
        <div className="h-8 bg-muted rounded w-96" />
      </div>
      <div className="flex-1 p-6 space-y-6">
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-4 bg-muted rounded w-72" />
          ))}
        </div>
        <div className="h-24 bg-muted rounded" />
        <div className="h-16 bg-muted rounded" />
      </div>
    </div>
  );
}

// ─── Utility Functions ─────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(status: IssueStatus): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
