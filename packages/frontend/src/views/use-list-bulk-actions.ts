import type { IssueListItem, IssueStatus, Priority } from "@pearl/shared";
import { useQueryClient } from "@tanstack/react-query";
import type { RowSelectionState } from "@tanstack/react-table";
import { useCallback, useRef, useState } from "react";
import { issueKeys, useCloseIssue, useUpdateIssue } from "@/hooks/use-issues";
import { useToastActions } from "@/hooks/use-toast";
import * as api from "@/lib/api-client";

interface UseBulkActionsOptions {
  rowSelection: RowSelectionState;
  setRowSelection: (sel: RowSelectionState) => void;
  setHighlightedIds: (ids: Set<string>) => void;
  apiParams: URLSearchParams;
}

export function useListBulkActions({
  rowSelection,
  setRowSelection,
  setHighlightedIds,
  apiParams,
}: UseBulkActionsOptions) {
  const queryClient = useQueryClient();
  const updateMutation = useUpdateIssue();
  const closeMutation = useCloseIssue();
  const toast = useToastActions();

  const [isClosing, setIsClosing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const rowSelectionRef = useRef(rowSelection);
  rowSelectionRef.current = rowSelection;

  const getIssueLabels = useCallback(
    (id: string): string[] => {
      // Read from QueryClient cache to avoid stale/filtered list issues.
      const detail = queryClient.getQueryData<IssueListItem>(issueKeys.detail(id));
      if (detail?.labels) return detail.labels;
      const lists = queryClient.getQueriesData<IssueListItem[]>({ queryKey: issueKeys.lists() });
      for (const [, list] of lists) {
        const found = list?.find((iss) => iss.id === id);
        if (found) return found.labels ?? [];
      }
      return [];
    },
    [queryClient],
  );

  const handleBulkClose = useCallback(async () => {
    const ids = Object.keys(rowSelectionRef.current).filter((k) => rowSelectionRef.current[k]);
    if (ids.length === 0) return;
    setIsClosing(true);
    try {
      // Snapshot blocked issues before closing
      const beforeIssues = queryClient.getQueryData<IssueListItem[]>(issueKeys.list(apiParams));
      const blockedBefore = new Set(
        (beforeIssues ?? []).filter((i) => i.status === "blocked").map((i) => i.id),
      );

      // Process in batches to avoid unbounded parallel requests
      const BATCH_SIZE = 5;
      const allResults: PromiseSettledResult<unknown>[] = [];
      for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        const batch = ids.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map((id) => closeMutation.mutateAsync({ id })),
        );
        allResults.push(...results);
      }
      const failed = allResults.filter((r) => r.status === "rejected");
      const succeeded = ids.length - failed.length;
      if (failed.length > 0) {
        toast.warning(
          `Closed ${succeeded} issue${succeeded !== 1 ? "s" : ""}. ${failed.length} failed to close.`,
        );
      } else {
        toast.success(`Closed ${ids.length} issue${ids.length !== 1 ? "s" : ""}.`);
      }

      // Refetch issue list and highlight newly-unblocked dependents
      const closedIdSet = new Set(ids.filter((_, i) => allResults[i].status === "fulfilled"));
      if (blockedBefore.size > 0 && closedIdSet.size > 0) {
        const afterIssues = await queryClient.fetchQuery<IssueListItem[]>({
          queryKey: issueKeys.list(apiParams),
          queryFn: () => api.fetchIssues(apiParams),
          staleTime: 0,
        });
        const newlyUnblocked = (afterIssues ?? [])
          .filter(
            (i) => blockedBefore.has(i.id) && !closedIdSet.has(i.id) && i.status !== "blocked",
          )
          .map((i) => i.id);
        setHighlightedIds(new Set(newlyUnblocked));
      } else {
        setHighlightedIds(new Set());
      }
      setRowSelection({});
    } finally {
      setIsClosing(false);
    }
  }, [closeMutation, queryClient, apiParams, setRowSelection, setHighlightedIds, toast]);

  const handleBulkReassign = useCallback(
    async (assignee: string) => {
      const ids = Object.keys(rowSelectionRef.current).filter((k) => rowSelectionRef.current[k]);
      if (ids.length === 0) return;
      setIsUpdating(true);
      try {
        const BATCH_SIZE = 5;
        const allResults: PromiseSettledResult<unknown>[] = [];
        for (let i = 0; i < ids.length; i += BATCH_SIZE) {
          const batch = ids.slice(i, i + BATCH_SIZE);
          const results = await Promise.allSettled(
            batch.map((id) => updateMutation.mutateAsync({ id, data: { assignee } })),
          );
          allResults.push(...results);
        }
        const failed = allResults.filter((r) => r.status === "rejected");
        const succeeded = ids.length - failed.length;
        if (failed.length > 0) {
          toast.warning(
            `Reassigned ${succeeded} issue${succeeded !== 1 ? "s" : ""}. ${failed.length} failed.`,
          );
        } else {
          toast.success(
            `Reassigned ${ids.length} issue${ids.length !== 1 ? "s" : ""} to ${assignee}.`,
          );
        }
        setRowSelection({});
      } finally {
        setIsUpdating(false);
      }
    },
    [updateMutation, toast, setRowSelection],
  );

  const handleBulkReprioritize = useCallback(
    async (priority: Priority) => {
      const ids = Object.keys(rowSelectionRef.current).filter((k) => rowSelectionRef.current[k]);
      if (ids.length === 0) return;
      setIsUpdating(true);
      try {
        const BATCH_SIZE = 5;
        const allResults: PromiseSettledResult<unknown>[] = [];
        for (let i = 0; i < ids.length; i += BATCH_SIZE) {
          const batch = ids.slice(i, i + BATCH_SIZE);
          const results = await Promise.allSettled(
            batch.map((id) => updateMutation.mutateAsync({ id, data: { priority } })),
          );
          allResults.push(...results);
        }
        const failed = allResults.filter((r) => r.status === "rejected");
        const succeeded = ids.length - failed.length;
        const label = `P${priority}`;
        if (failed.length > 0) {
          toast.warning(
            `Reprioritized ${succeeded} issue${succeeded !== 1 ? "s" : ""}. ${failed.length} failed.`,
          );
        } else {
          toast.success(`Set ${ids.length} issue${ids.length !== 1 ? "s" : ""} to ${label}.`);
        }
        setRowSelection({});
      } finally {
        setIsUpdating(false);
      }
    },
    [updateMutation, toast, setRowSelection],
  );

  const handleBulkChangeStatus = useCallback(
    async (status: IssueStatus) => {
      const ids = Object.keys(rowSelectionRef.current).filter((k) => rowSelectionRef.current[k]);
      if (ids.length === 0) return;
      setIsUpdating(true);
      try {
        const BATCH_SIZE = 5;
        const allResults: PromiseSettledResult<unknown>[] = [];
        for (let i = 0; i < ids.length; i += BATCH_SIZE) {
          const batch = ids.slice(i, i + BATCH_SIZE);
          const results = await Promise.allSettled(
            batch.map((id) => updateMutation.mutateAsync({ id, data: { status } })),
          );
          allResults.push(...results);
        }
        const failed = allResults.filter((r) => r.status === "rejected");
        const succeeded = ids.length - failed.length;
        if (failed.length > 0) {
          toast.warning(
            `Updated ${succeeded} issue${succeeded !== 1 ? "s" : ""}. ${failed.length} failed.`,
          );
        } else {
          toast.success(`Set ${ids.length} issue${ids.length !== 1 ? "s" : ""} to ${status}.`);
        }
        setRowSelection({});
      } finally {
        setIsUpdating(false);
      }
    },
    [updateMutation, toast, setRowSelection],
  );

  const handleBulkAddLabel = useCallback(
    async (label: string) => {
      const ids = Object.keys(rowSelectionRef.current).filter((k) => rowSelectionRef.current[k]);
      if (ids.length === 0) return;
      setIsUpdating(true);
      try {
        const BATCH_SIZE = 5;
        const allResults: PromiseSettledResult<unknown>[] = [];
        for (let i = 0; i < ids.length; i += BATCH_SIZE) {
          const batch = ids.slice(i, i + BATCH_SIZE);
          const results = await Promise.allSettled(
            batch.map((id) => {
              const existingLabels = getIssueLabels(id);
              if (existingLabels.includes(label)) {
                return Promise.resolve(null); // Already has label
              }
              return updateMutation.mutateAsync({
                id,
                data: { labels: [...existingLabels, label] },
              });
            }),
          );
          allResults.push(...results);
        }
        const failed = allResults.filter((r) => r.status === "rejected");
        const succeeded = ids.length - failed.length;
        if (failed.length > 0) {
          toast.warning(
            `Added label to ${succeeded} issue${succeeded !== 1 ? "s" : ""}. ${failed.length} failed.`,
          );
        } else {
          toast.success(`Added "${label}" to ${ids.length} issue${ids.length !== 1 ? "s" : ""}.`);
        }
        setRowSelection({});
      } finally {
        setIsUpdating(false);
      }
    },
    [updateMutation, toast, getIssueLabels, setRowSelection],
  );

  const handleBulkRemoveLabel = useCallback(
    async (label: string) => {
      const ids = Object.keys(rowSelectionRef.current).filter((k) => rowSelectionRef.current[k]);
      if (ids.length === 0) return;
      setIsUpdating(true);
      try {
        const BATCH_SIZE = 5;
        const allResults: PromiseSettledResult<unknown>[] = [];
        for (let i = 0; i < ids.length; i += BATCH_SIZE) {
          const batch = ids.slice(i, i + BATCH_SIZE);
          const results = await Promise.allSettled(
            batch.map((id) => {
              const existingLabels = getIssueLabels(id);
              if (!existingLabels.includes(label)) {
                return Promise.resolve(null); // Doesn't have label
              }
              return updateMutation.mutateAsync({
                id,
                data: { labels: existingLabels.filter((l) => l !== label) },
              });
            }),
          );
          allResults.push(...results);
        }
        const failed = allResults.filter((r) => r.status === "rejected");
        const succeeded = ids.length - failed.length;
        if (failed.length > 0) {
          toast.warning(
            `Removed label from ${succeeded} issue${succeeded !== 1 ? "s" : ""}. ${failed.length} failed.`,
          );
        } else {
          toast.success(
            `Removed "${label}" from ${ids.length} issue${ids.length !== 1 ? "s" : ""}.`,
          );
        }
        setRowSelection({});
      } finally {
        setIsUpdating(false);
      }
    },
    [updateMutation, toast, getIssueLabels, setRowSelection],
  );

  return {
    isClosing,
    isUpdating,
    handleBulkClose,
    handleBulkReassign,
    handleBulkReprioritize,
    handleBulkChangeStatus,
    handleBulkAddLabel,
    handleBulkRemoveLabel,
  };
}
