import { useQuery, useMutation, useQueryClient, useIsMutating } from "@tanstack/react-query";
import type {
  IssueListItem,
  Issue,
  CreateIssueRequest,
  UpdateIssueRequest,
  InvalidationHint,
} from "@beads-gui/shared";
import * as api from "@/lib/api-client";

// ─── Query Keys ─────────────────────────────────────────
export const issueKeys = {
  all: ["issues"] as const,
  lists: () => [...issueKeys.all, "list"] as const,
  list: (params?: URLSearchParams) => [...issueKeys.lists(), params?.toString() ?? ""] as const,
  details: () => [...issueKeys.all, "detail"] as const,
  detail: (id: string) => [...issueKeys.details(), id] as const,
  comments: (id: string) => [...issueKeys.all, "comments", id] as const,
  events: (id: string) => [...issueKeys.all, "events", id] as const,
  dependencies: (id: string) => [...issueKeys.all, "dependencies", id] as const,
};

export const statsKeys = {
  all: ["stats"] as const,
};

export const healthKeys = {
  all: ["health"] as const,
};

export const dependencyKeys = {
  all: ["dependencies"] as const,
};

// ─── Invalidation from hints ────────────────────────────
function invalidateFromHints(
  queryClient: ReturnType<typeof useQueryClient>,
  hints: InvalidationHint[],
) {
  for (const hint of hints) {
    switch (hint.entity) {
      case "issues":
        if (hint.id) {
          queryClient.invalidateQueries({ queryKey: issueKeys.detail(hint.id) });
        }
        queryClient.invalidateQueries({ queryKey: issueKeys.lists() });
        break;
      case "dependencies":
        queryClient.invalidateQueries({ queryKey: dependencyKeys.all });
        if (hint.id) {
          queryClient.invalidateQueries({ queryKey: issueKeys.dependencies(hint.id) });
        }
        break;
      case "comments":
        if (hint.id) {
          queryClient.invalidateQueries({ queryKey: issueKeys.comments(hint.id) });
        }
        break;
      case "events":
        if (hint.id) {
          queryClient.invalidateQueries({ queryKey: issueKeys.events(hint.id) });
        }
        break;
      case "stats":
        queryClient.invalidateQueries({ queryKey: statsKeys.all });
        break;
    }
  }
}

// ─── List Hook ──────────────────────────────────────────
export function useIssues(params?: URLSearchParams) {
  const pendingMutations = useIsMutating({ mutationKey: ["issues"] });

  return useQuery<IssueListItem[]>({
    queryKey: issueKeys.list(params),
    queryFn: () => api.fetchIssues(params),
    // STPA H1: Suppress polling while mutations are pending
    refetchInterval: pendingMutations > 0 ? false : 2000,
  });
}

// ─── Detail Hook ────────────────────────────────────────
export function useIssue(id: string) {
  return useQuery<Issue>({
    queryKey: issueKeys.detail(id),
    queryFn: () => api.fetchIssue(id),
    staleTime: 30000,
    refetchOnWindowFocus: true,
    enabled: !!id,
  });
}

// ─── Comments Hook ──────────────────────────────────────
export function useComments(issueId: string) {
  return useQuery({
    queryKey: issueKeys.comments(issueId),
    queryFn: () => api.fetchComments(issueId),
    staleTime: 30000,
    refetchOnWindowFocus: true,
    enabled: !!issueId,
  });
}

// ─── Events Hook ────────────────────────────────────────
export function useEvents(issueId: string) {
  return useQuery({
    queryKey: issueKeys.events(issueId),
    queryFn: () => api.fetchEvents(issueId),
    staleTime: 30000,
    refetchOnWindowFocus: true,
    enabled: !!issueId,
  });
}

// ─── Create Issue Mutation ──────────────────────────────
export function useCreateIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["issues", "create"],
    mutationFn: (data: CreateIssueRequest) => api.createIssue(data),
    onSuccess: (response) => {
      // STPA H2: Force immediate invalidation using hints
      invalidateFromHints(queryClient, response.invalidationHints);
    },
  });
}

// ─── Update Issue Mutation ──────────────────────────────
export function useUpdateIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["issues", "update"],
    mutationFn: ({ id, data }: { id: string; data: UpdateIssueRequest }) =>
      api.updateIssue(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: issueKeys.detail(id) });
      await queryClient.cancelQueries({ queryKey: issueKeys.lists() });

      // Snapshot previous values
      const previousDetail = queryClient.getQueryData<Issue>(issueKeys.detail(id));
      const previousLists = queryClient.getQueriesData<IssueListItem[]>({
        queryKey: issueKeys.lists(),
      });

      // Optimistic update on detail
      if (previousDetail) {
        queryClient.setQueryData<Issue>(issueKeys.detail(id), {
          ...previousDetail,
          ...data,
          updated_at: new Date().toISOString(),
        });
      }

      // Optimistic update on list items
      for (const [queryKey, list] of previousLists) {
        if (!list) continue;
        queryClient.setQueryData<IssueListItem[]>(
          queryKey,
          list.map((item) =>
            item.id === id
              ? { ...item, ...data, updated_at: new Date().toISOString() }
              : item,
          ),
        );
      }

      return { previousDetail, previousLists };
    },
    onError: (_err, { id }, context) => {
      // Rollback on error
      if (context?.previousDetail) {
        queryClient.setQueryData(issueKeys.detail(id), context.previousDetail);
      }
      if (context?.previousLists) {
        for (const [queryKey, data] of context.previousLists) {
          queryClient.setQueryData(queryKey, data);
        }
      }
    },
    onSuccess: (response) => {
      // STPA H2: Force immediate invalidation using hints
      invalidateFromHints(queryClient, response.invalidationHints);
    },
  });
}

// ─── Close Issue Mutation ───────────────────────────────
export function useCloseIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["issues", "close"],
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api.closeIssue(id, reason),
    onSuccess: (response) => {
      invalidateFromHints(queryClient, response.invalidationHints);
    },
  });
}

// ─── Stats Hook ─────────────────────────────────────────
export function useStats() {
  return useQuery({
    queryKey: statsKeys.all,
    queryFn: api.fetchStats,
    refetchInterval: 30000,
  });
}

// ─── Health Hook ────────────────────────────────────────
export function useHealth() {
  return useQuery({
    queryKey: healthKeys.all,
    queryFn: api.fetchHealth,
    refetchInterval: 5000,
    retry: 0,
  });
}
