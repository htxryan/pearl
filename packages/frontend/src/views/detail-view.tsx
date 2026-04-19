import type { IssueStatus, LabelColor, ParsedField } from "@pearl/shared";
import {
  hasAttachmentSyntax,
  ISSUE_PRIORITIES,
  ISSUE_TYPES,
  parseField,
  SETTABLE_STATUSES,
} from "@pearl/shared";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router";
import { ActivityTimeline } from "@/components/detail/activity-timeline";
import { AttachmentsGallery } from "@/components/detail/attachments-gallery";
import { CommentThread } from "@/components/detail/comment-thread";
import { DependencyList } from "@/components/detail/dependency-list";
import { FieldEditor } from "@/components/detail/field-editor";
import { MarkdownSection } from "@/components/detail/markdown-section";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { LabelPicker } from "@/components/ui/label-picker";
import { PriorityIndicator } from "@/components/ui/priority-indicator";
import { RelativeTime } from "@/components/ui/relative-time";
import { StatusBadge } from "@/components/ui/status-badge";
import { TypeBadge } from "@/components/ui/type-badge";
import { AttachmentProvider } from "@/hooks/use-attachment-context";
import { type CommandAction, useCommandPaletteActions } from "@/hooks/use-command-palette";
import {
  useAddComment,
  useAddDependency,
  useCloseIssue,
  useComments,
  useDeleteIssue,
  useDependencies,
  useEvents,
  useIssue,
  useRemoveDependency,
  useUpdateIssue,
} from "@/hooks/use-issues";
import { useKeyboardScope } from "@/hooks/use-keyboard-scope";
import { useIsMobile } from "@/hooks/use-media-query";
import { useParseField } from "@/hooks/use-parse-field";
import { useToastActions } from "@/hooks/use-toast";
import { useUndoActions } from "@/hooks/use-undo";
import { shortId } from "@/lib/format-id";
import {
  DetailErrorView,
  DetailSections,
  DetailSkeleton,
  FieldRow,
  SelectField,
  statusLabel,
} from "@/views/detail-components";

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

/** Collapsible wrapper for detail sections on mobile. On desktop, renders children directly. */
function CollapsibleSection({
  title,
  hasContent,
  children,
}: {
  title: string;
  hasContent: boolean;
  children: ReactNode;
}) {
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState(hasContent);

  useEffect(() => {
    if (hasContent) setExpanded(true);
  }, [hasContent]);

  if (!isMobile) return <>{children}</>;

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex items-center justify-between w-full py-2 text-left text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        aria-expanded={expanded}
      >
        <span>{title}</span>
        <svg
          className={`h-4 w-4 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {expanded && children}
    </div>
  );
}

function DetailViewContent({ id }: { id: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  // Determine where the user came from for breadcrumbs
  const fromPath = (location.state as { from?: string } | null)?.from;
  const backPath = fromPath && VIEW_LABELS[fromPath] ? fromPath : "/list";
  const backLabel = VIEW_LABELS[backPath] ?? "List";

  // Data fetching
  const { data: issue, isLoading, error } = useIssue(id);
  const { data: comments = [] } = useComments(id);
  const { data: events = [] } = useEvents(id);
  const { data: dependencies = [] } = useDependencies(id);

  // Attachment field parsing
  const descParsed = useParseField(issue?.description);
  const designParsed = useParseField(issue?.design);
  const acceptanceParsed = useParseField(issue?.acceptance_criteria);
  const notesParsed = useParseField(issue?.notes);
  const commentParsedFields = useMemo(() => {
    const results: ParsedField[] = [];
    for (const comment of comments) {
      if (comment.text && hasAttachmentSyntax(comment.text)) {
        try {
          results.push(parseField(comment.text));
        } catch {
          // skip unparseable comments
        }
      }
    }
    return results;
  }, [comments]);

  const parsedFields = useMemo(
    () =>
      [
        descParsed.parsed,
        designParsed.parsed,
        acceptanceParsed.parsed,
        notesParsed.parsed,
        ...commentParsedFields,
      ].filter((p): p is NonNullable<typeof p> => p !== null),
    [
      descParsed.parsed,
      designParsed.parsed,
      acceptanceParsed.parsed,
      notesParsed.parsed,
      commentParsedFields,
    ],
  );

  // Mutations
  const updateMutation = useUpdateIssue();
  const closeMutation = useCloseIssue();
  const addCommentMutation = useAddComment();
  const deleteMutation = useDeleteIssue();
  const addDepMutation = useAddDependency();
  const removeDepMutation = useRemoveDependency();

  const toast = useToastActions();
  const undo = useUndoActions();

  // Confirmation dialog state
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  // Delete handler (permanent)
  const handleDelete = useCallback(() => {
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          setShowDeleteConfirm(false);
          toast.success("Issue deleted.");
          navigate(backPath);
        },
        onError: () => {
          setShowDeleteConfirm(false);
          toast.error("Failed to delete issue. Please try again.");
        },
      },
    );
  }, [id, deleteMutation.mutate, navigate, backPath, toast]);

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
      <DetailErrorView
        error={error}
        id={id}
        backPath={backPath}
        backLabel={backLabel}
        onBack={() => navigate(backPath)}
      />
    );
  }

  return (
    <AttachmentProvider parsedFields={parsedFields}>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header bar */}
        <div className="shrink-0 bg-muted/30 px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              {/* Breadcrumb */}
              <nav className="flex items-center gap-1.5 text-sm shrink-0" aria-label="Breadcrumb">
                <button
                  onClick={() => navigate(backPath)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {backLabel}
                </button>
                <span className="text-muted-foreground">/</span>
                <code className="text-muted-foreground" title={issue.id}>
                  {shortId(issue.id)}
                </code>
              </nav>
              <StatusBadge status={issue.status} />
              <PriorityIndicator priority={issue.priority} />
              <TypeBadge type={issue.issue_type} />
            </div>
            <div className="flex items-center gap-2">
              {issue.status !== "closed" && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClaim}
                    disabled={updateMutation.isPending}
                  >
                    Claim
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowCloseConfirm(true)}
                    disabled={closeMutation.isPending}
                  >
                    Close
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deleteMutation.isPending}
                className="text-destructive hover:bg-destructive/10 border-destructive/30"
              >
                Delete
              </Button>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldRow label="Status">
                  <SelectField
                    value={issue.status}
                    options={SETTABLE_STATUSES.map((s) => ({ value: s, label: statusLabel(s) }))}
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
                    options={ISSUE_TYPES.map((t) => ({
                      value: t,
                      label: t.charAt(0).toUpperCase() + t.slice(1),
                    }))}
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
            <CollapsibleSection title="Description" hasContent={!!issue.description}>
              <MarkdownSection
                title="Description"
                content={issue.description}
                field="description"
                onSave={(val) => handleFieldUpdate("description", val)}
                hideTitle={isMobile}
              />
            </CollapsibleSection>

            {/* Design Notes */}
            {(issue.design || issue.status !== "closed") && (
              <CollapsibleSection title="Design Notes" hasContent={!!issue.design}>
                <MarkdownSection
                  title="Design Notes"
                  content={issue.design}
                  field="design"
                  onSave={(val) => handleFieldUpdate("design", val)}
                  hideTitle={isMobile}
                />
              </CollapsibleSection>
            )}

            {/* Acceptance Criteria */}
            {(issue.acceptance_criteria || issue.status !== "closed") && (
              <CollapsibleSection
                title="Acceptance Criteria"
                hasContent={!!issue.acceptance_criteria}
              >
                <MarkdownSection
                  title="Acceptance Criteria"
                  content={issue.acceptance_criteria}
                  field="acceptance_criteria"
                  onSave={(val) => handleFieldUpdate("acceptance_criteria", val)}
                  hideTitle={isMobile}
                />
              </CollapsibleSection>
            )}

            {/* Notes */}
            {(issue.notes || issue.status !== "closed") && (
              <CollapsibleSection title="Notes" hasContent={!!issue.notes}>
                <MarkdownSection
                  title="Notes"
                  content={issue.notes}
                  field="notes"
                  onSave={(val) => handleFieldUpdate("notes", val)}
                  hideTitle={isMobile}
                />
              </CollapsibleSection>
            )}

            {/* Attachments Gallery */}
            <CollapsibleSection
              title="Attachments"
              hasContent={parsedFields.some((p) => p.blocks.size > 0)}
            >
              <AttachmentsGallery />
            </CollapsibleSection>

            {/* Dependencies */}
            <CollapsibleSection title="Dependencies" hasContent={dependencies.length > 0}>
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
                hideTitle={isMobile}
              />
            </CollapsibleSection>

            {/* Comments */}
            <CollapsibleSection title="Comments" hasContent={comments.length > 0}>
              <CommentThread
                comments={comments}
                onAdd={(text) => addCommentMutation.mutateAsync({ issueId: id, data: { text } })}
                isAdding={addCommentMutation.isPending}
                hideTitle={isMobile}
              />
            </CollapsibleSection>

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

        <ConfirmDialog
          isOpen={showDeleteConfirm}
          onConfirm={() => {
            handleDelete();
          }}
          onCancel={() => setShowDeleteConfirm(false)}
          title="Delete issue permanently?"
          description={`This will permanently delete "${issue.title}" and remove all its dependency links. This cannot be undone.`}
          confirmLabel="Delete Issue"
          isPending={deleteMutation.isPending}
        />
      </div>
    </AttachmentProvider>
  );
}
