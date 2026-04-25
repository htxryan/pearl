import type { IssueListItem, IssueStatus, Priority } from "@pearl/shared";
import { useCallback } from "react";
import { useUpdateIssue } from "@/hooks/use-issues";
import { useToasts } from "@/hooks/use-toasts";
import { useUndoActions } from "@/hooks/use-undo";
import { VALID_PRIORITIES, VALID_STATUSES } from "@/hooks/use-url-filters";

export function useListFieldHandlers(issues: IssueListItem[]) {
  const updateMutation = useUpdateIssue();
  const toast = useToasts();
  const undo = useUndoActions();

  const handleStatusChange = useCallback(
    (id: string, status: IssueStatus) => {
      if (!VALID_STATUSES.has(status)) return;
      const issue = issues.find((i) => i.id === id);
      const oldStatus = issue?.status ?? "open";
      updateMutation.mutate(
        { id, data: { status } },
        {
          onSuccess: () => {
            undo.recordStatusChange(id, issue?.title ?? id, oldStatus, status);
          },
          onError: () => {
            toast.error(`Failed to update status for "${issue?.title ?? id}"`);
          },
        },
      );
    },
    [updateMutation, issues, undo, toast],
  );

  const handlePriorityChange = useCallback(
    (id: string, priority: Priority) => {
      if (!VALID_PRIORITIES.has(priority)) return;
      const issue = issues.find((i) => i.id === id);
      updateMutation.mutate(
        { id, data: { priority } },
        {
          onError: () => {
            toast.error(`Failed to update priority for "${issue?.title ?? id}"`);
          },
        },
      );
    },
    [updateMutation, issues, toast],
  );

  const handleTitleChange = useCallback(
    (id: string, title: string) => {
      if (!title.trim()) return;
      const issue = issues.find((i) => i.id === id);
      updateMutation.mutate(
        { id, data: { title: title.trim() } },
        {
          onError: () => {
            toast.error(`Failed to update title for "${issue?.title ?? id}"`);
          },
        },
      );
    },
    [updateMutation, issues, toast],
  );

  const handleAssigneeChange = useCallback(
    (id: string, assignee: string) => {
      const issue = issues.find((i) => i.id === id);
      updateMutation.mutate(
        { id, data: { assignee: assignee.trim() || undefined } },
        {
          onError: () => {
            toast.error(`Failed to update assignee for "${issue?.title ?? id}"`);
          },
        },
      );
    },
    [updateMutation, issues, toast],
  );

  const handleLabelsChange = useCallback(
    (id: string, labels: string[]) => {
      const issue = issues.find((i) => i.id === id);
      updateMutation.mutate(
        { id, data: { labels } },
        {
          onError: () => {
            toast.error(`Failed to update labels for "${issue?.title ?? id}"`);
          },
        },
      );
    },
    [updateMutation, issues, toast],
  );

  const handleDueDateChange = useCallback(
    (id: string, date: string | null) => {
      const issue = issues.find((i) => i.id === id);
      updateMutation.mutate(
        { id, data: { due: date } },
        {
          onError: () => {
            toast.error(`Failed to update due date for "${issue?.title ?? id}"`);
          },
        },
      );
    },
    [updateMutation, issues, toast],
  );

  return {
    updateMutation,
    handleStatusChange,
    handlePriorityChange,
    handleTitleChange,
    handleAssigneeChange,
    handleLabelsChange,
    handleDueDateChange,
  };
}
