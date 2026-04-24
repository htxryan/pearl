import type { ParsedField } from "@pearl/shared";
import { hasAttachmentSyntax, parseField } from "@pearl/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
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
import { useParseField } from "@/hooks/use-parse-field";
import { useToastActions } from "@/hooks/use-toast";
import { useUndoActions } from "@/hooks/use-undo";

const VIEW_LABELS: Record<string, string> = {
  "/list": "List",
  "/board": "Board",
  "/graph": "Graph",
};

export interface UseDetailViewOptions {
  /** Override the "exit detail" action — e.g. close a modal instead of navigating. */
  onExit?: () => void;
}

export function useDetailView(id: string, options: UseDetailViewOptions = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { onExit } = options;

  const fromPath = (location.state as { from?: string } | null)?.from;
  const fromPathname = fromPath?.split("?")[0];
  const backPath = fromPathname && VIEW_LABELS[fromPathname] ? fromPath! : "/list";
  const backLabel = (fromPathname && VIEW_LABELS[fromPathname]) || VIEW_LABELS[backPath] || "List";

  const exitDetail = useCallback(() => {
    if (onExit) onExit();
    else navigate(backPath);
  }, [onExit, navigate, backPath]);

  const { data: issue, isLoading, error } = useIssue(id);
  const { data: comments = [] } = useComments(id);
  const { data: events = [] } = useEvents(id);
  const { data: dependencies = [] } = useDependencies(id);

  const descParsed = useParseField(issue?.description);
  const designParsed = useParseField(issue?.design);
  const acceptanceParsed = useParseField(issue?.acceptance_criteria);
  const notesParsed = useParseField(issue?.notes);
  const commentParsedFields = useMemo(() => {
    const results: { parsed: ParsedField; sourceLabel: string }[] = [];
    let commentIdx = 0;
    for (const comment of comments) {
      commentIdx++;
      if (comment.text && hasAttachmentSyntax(comment.text)) {
        try {
          results.push({ parsed: parseField(comment.text), sourceLabel: `Comment #${commentIdx}` });
        } catch {
          // skip unparseable comments
        }
      }
    }
    return results;
  }, [comments]);

  const parsedFields = useMemo(() => {
    const labeled: { parsed: ParsedField; sourceLabel: string }[] = [];
    if (descParsed.parsed) labeled.push({ parsed: descParsed.parsed, sourceLabel: "Description" });
    if (designParsed.parsed)
      labeled.push({ parsed: designParsed.parsed, sourceLabel: "Design Notes" });
    if (acceptanceParsed.parsed)
      labeled.push({ parsed: acceptanceParsed.parsed, sourceLabel: "Acceptance Criteria" });
    if (notesParsed.parsed) labeled.push({ parsed: notesParsed.parsed, sourceLabel: "Notes" });
    labeled.push(...commentParsedFields);
    return labeled;
  }, [
    descParsed.parsed,
    designParsed.parsed,
    acceptanceParsed.parsed,
    notesParsed.parsed,
    commentParsedFields,
  ]);

  const updateMutation = useUpdateIssue();
  const closeMutation = useCloseIssue();
  const addCommentMutation = useAddComment();
  const deleteMutation = useDeleteIssue();
  const addDepMutation = useAddDependency();
  const removeDepMutation = useRemoveDependency();

  const toast = useToastActions();
  const undo = useUndoActions();

  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [lightboxRef, setLightboxRef] = useState<string | null>(null);
  const [dirtyFields, setDirtyFields] = useState<Set<string>>(new Set());
  const isDirty = dirtyFields.size > 0;

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

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

  const handleClose = useCallback(() => {
    const prevStatus = issue?.status ?? "open";
    closeMutation.mutate(
      { id },
      {
        onSuccess: () => {
          undo.recordClose(id, issue?.title ?? id, prevStatus);
          exitDetail();
        },
        onError: () => {
          toast.error("Failed to close issue. Please try again.");
        },
      },
    );
  }, [id, issue, closeMutation.mutate, exitDetail, undo, toast]);

  const handleDelete = useCallback(() => {
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          setShowDeleteConfirm(false);
          toast.success("Issue deleted.");
          exitDetail();
        },
        onError: () => {
          setShowDeleteConfirm(false);
          toast.error("Failed to delete issue. Please try again.");
        },
      },
    );
  }, [id, deleteMutation.mutate, exitDetail, toast]);

  const handleClaim = useCallback(() => {
    updateMutation.mutate(
      { id, data: { claim: true } },
      {
        onSuccess: () => toast.success("Issue claimed."),
        onError: () => toast.error("Failed to claim issue. Please try again."),
      },
    );
  }, [id, updateMutation.mutate, toast]);

  const handleNavigateBack = useCallback(() => {
    if (isDirty) {
      if (window.confirm("You have unsaved changes. Discard them?")) exitDetail();
    } else {
      exitDetail();
    }
  }, [isDirty, exitDetail]);

  const keyBindings = useMemo(
    () => [{ key: "Escape", handler: handleNavigateBack, description: "Close detail panel" }],
    [handleNavigateBack],
  );
  useKeyboardScope("detail", keyBindings);

  const paletteActions: CommandAction[] = useMemo(
    () => [
      {
        id: "detail-close",
        label: "Close panel / Back to list",
        shortcut: "Esc",
        group: "Detail",
        handler: handleNavigateBack,
      },
      { id: "detail-claim", label: "Claim this issue", group: "Detail", handler: handleClaim },
    ],
    [handleNavigateBack, handleClaim],
  );
  useCommandPaletteActions("detail-view", paletteActions);

  return {
    issue,
    isLoading,
    error,
    comments,
    events,
    dependencies,
    parsedFields,
    backPath,
    backLabel,
    showCloseConfirm,
    setShowCloseConfirm,
    showDeleteConfirm,
    setShowDeleteConfirm,
    lightboxRef,
    setLightboxRef,
    isDirty,
    dirtyFields,
    updateMutation,
    closeMutation,
    deleteMutation,
    addCommentMutation,
    addDepMutation,
    removeDepMutation,
    handleFieldUpdate,
    handleClose,
    handleDelete,
    handleClaim,
    handleNavigateBack,
  };
}
