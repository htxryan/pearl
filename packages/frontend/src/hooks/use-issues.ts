import type {
  CreateCommentRequest,
  CreateDependencyRequest,
  CreateIssueRequest,
  Dependency,
  InvalidationHint,
  Issue,
  IssueListItem,
  UpdateIssueRequest,
} from "@pearl/shared";
import {
  type QueryClient,
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import * as api from "@/lib/api-client";
import { labelKeys } from "./use-labels";
import { notifyCommentAdded } from "./use-notifications";

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
      case "labels":
        queryClient.invalidateQueries({ queryKey: labelKeys.all });
        break;
    }
  }
}

// ─── List Hook ──────────────────────────────────────────
export function useIssues(params?: URLSearchParams) {
  const pendingIssueMutations = useIsMutating({ mutationKey: ["issues"] });
  const pendingDepMutations = useIsMutating({ mutationKey: ["dependencies"] });

  return useQuery<IssueListItem[]>({
    queryKey: issueKeys.list(params),
    queryFn: () => api.fetchIssues(params),
    // STPA H1: Suppress polling while mutations are pending
    refetchInterval: pendingIssueMutations + pendingDepMutations > 0 ? false : 2000,
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

// ─── Prefetch Detail ───────────────────────────────────
export function prefetchIssueDetail(queryClient: QueryClient, id: string) {
  queryClient.prefetchQuery({
    queryKey: issueKeys.detail(id),
    queryFn: () => api.fetchIssue(id),
    staleTime: 30000,
    gcTime: 60000,
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
    onMutate: async (data) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: issueKeys.lists() });

      // Snapshot previous list
      const previousLists = queryClient.getQueriesData<IssueListItem[]>({
        queryKey: issueKeys.lists(),
      });

      // Create a temporary issue with a placeholder ID
      const tempIssue: IssueListItem = {
        id: `temp-${Date.now()}`,
        title: data.title,
        status: "open",
        priority: data.priority ?? 2,
        issue_type: data.issue_type ?? "task",
        assignee: data.assignee ?? null,
        owner: "user",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        due_at: data.due ?? null,
        pinned: false,
        labels: data.labels ?? [],
        labelColors: {},
      };

      // Optimistic update: add issue to top of all list views
      for (const [queryKey, list] of previousLists) {
        if (!list) continue;
        queryClient.setQueryData<IssueListItem[]>(queryKey, [tempIssue, ...list]);
      }

      return { previousLists };
    },
    onError: (_err, _data, context) => {
      // Rollback on error
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
            item.id === id ? { ...item, ...data, updated_at: new Date().toISOString() } : item,
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
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => api.closeIssue(id, reason),
    onMutate: async ({ id }) => {
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
          status: "closed",
          closed_at: new Date().toISOString(),
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
              ? { ...item, status: "closed", updated_at: new Date().toISOString() }
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
      invalidateFromHints(queryClient, response.invalidationHints);
    },
  });
}

// ─── Add Comment Mutation ──────────────────────────────
export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["issues", "comment"],
    mutationFn: ({ issueId, data }: { issueId: string; data: CreateCommentRequest }) =>
      api.addComment(issueId, data),
    onMutate: async ({ issueId, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: issueKeys.comments(issueId) });

      // Snapshot previous value
      const previousComments = queryClient.getQueryData(issueKeys.comments(issueId));

      // Optimistic update: add comment to the thread
      const tempComment = {
        id: `temp-${Date.now()}`,
        issue_id: issueId,
        author: "You",
        text: data.text,
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData(issueKeys.comments(issueId), (old: any) => [
        ...(old || []),
        tempComment,
      ]);

      return { previousComments };
    },
    onError: (_err, { issueId }, context) => {
      // Rollback on error
      if (context?.previousComments !== undefined) {
        queryClient.setQueryData(issueKeys.comments(issueId), context.previousComments);
      }
    },
    onSuccess: (response, { issueId }) => {
      invalidateFromHints(queryClient, response.invalidationHints);
      if (response.data) {
        const issue = queryClient.getQueryData<Issue>(issueKeys.detail(issueId));
        if (issue) {
          notifyCommentAdded(issueId, issue.title, response.data.author);
        }
      }
    },
  });
}

// ─── Dependencies Hook ──────────────────────────────────
export function useDependencies(issueId: string) {
  return useQuery<Dependency[]>({
    queryKey: issueKeys.dependencies(issueId),
    queryFn: () => api.fetchIssueDependencies(issueId),
    staleTime: 30000,
    refetchOnWindowFocus: true,
    enabled: !!issueId,
  });
}

// ─── Add Dependency Mutation ────────────────────────────
export function useAddDependency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["dependencies", "add"],
    mutationFn: (data: CreateDependencyRequest) => api.addDependency(data),
    onMutate: async (data) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: dependencyKeys.all });
      await queryClient.cancelQueries({ queryKey: issueKeys.dependencies(data.issue_id) });
      await queryClient.cancelQueries({ queryKey: issueKeys.dependencies(data.depends_on_id) });

      // Snapshot previous values
      const previousDeps = queryClient.getQueryData(dependencyKeys.all);
      const previousIssueDeps = queryClient.getQueryData(issueKeys.dependencies(data.issue_id));
      const previousDepOnDeps = queryClient.getQueryData(
        issueKeys.dependencies(data.depends_on_id),
      );

      // Optimistic update: add dependency
      const tempDependency = {
        issue_id: data.issue_id,
        depends_on_id: data.depends_on_id,
        type: (data.type || "depends_on") as any,
        created_at: new Date().toISOString(),
        created_by: "user",
      };

      queryClient.setQueryData(dependencyKeys.all, (old: any) => [...(old || []), tempDependency]);
      queryClient.setQueryData(issueKeys.dependencies(data.issue_id), (old: any) => [
        ...(old || []),
        tempDependency,
      ]);
      queryClient.setQueryData(issueKeys.dependencies(data.depends_on_id), (old: any) => [
        ...(old || []),
        tempDependency,
      ]);

      return { previousDeps, previousIssueDeps, previousDepOnDeps };
    },
    onError: (_err, { issue_id, depends_on_id }, context) => {
      // Rollback on error
      if (context?.previousDeps !== undefined) {
        queryClient.setQueryData(dependencyKeys.all, context.previousDeps);
      }
      if (context?.previousIssueDeps !== undefined) {
        queryClient.setQueryData(issueKeys.dependencies(issue_id), context.previousIssueDeps);
      }
      if (context?.previousDepOnDeps !== undefined) {
        queryClient.setQueryData(issueKeys.dependencies(depends_on_id), context.previousDepOnDeps);
      }
    },
    onSuccess: (response) => {
      invalidateFromHints(queryClient, response.invalidationHints);
    },
  });
}

// ─── Remove Dependency Mutation ─────────────────────────
export function useRemoveDependency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["dependencies", "remove"],
    mutationFn: ({ issueId, dependsOnId }: { issueId: string; dependsOnId: string }) =>
      api.removeDependency(issueId, dependsOnId),
    onMutate: async ({ issueId, dependsOnId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: dependencyKeys.all });
      await queryClient.cancelQueries({ queryKey: issueKeys.dependencies(issueId) });
      await queryClient.cancelQueries({ queryKey: issueKeys.dependencies(dependsOnId) });

      // Snapshot previous values
      const previousDeps = queryClient.getQueryData(dependencyKeys.all);
      const previousIssueDeps = queryClient.getQueryData(issueKeys.dependencies(issueId));
      const previousDepOnDeps = queryClient.getQueryData(issueKeys.dependencies(dependsOnId));

      // Optimistic update: remove dependency
      queryClient.setQueryData(
        dependencyKeys.all,
        (old: any) =>
          old?.filter((d: any) => !(d.issue_id === issueId && d.depends_on_id === dependsOnId)) ||
          [],
      );
      queryClient.setQueryData(
        issueKeys.dependencies(issueId),
        (old: any) => old?.filter((d: any) => d.depends_on_id !== dependsOnId) || [],
      );
      queryClient.setQueryData(
        issueKeys.dependencies(dependsOnId),
        (old: any) => old?.filter((d: any) => d.issue_id !== issueId) || [],
      );

      return { previousDeps, previousIssueDeps, previousDepOnDeps };
    },
    onError: (_err, { issueId, dependsOnId }, context) => {
      // Rollback on error
      if (context?.previousDeps !== undefined) {
        queryClient.setQueryData(dependencyKeys.all, context.previousDeps);
      }
      if (context?.previousIssueDeps !== undefined) {
        queryClient.setQueryData(issueKeys.dependencies(issueId), context.previousIssueDeps);
      }
      if (context?.previousDepOnDeps !== undefined) {
        queryClient.setQueryData(issueKeys.dependencies(dependsOnId), context.previousDepOnDeps);
      }
    },
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

// ─── Setup Hook ─────────────────────────────────────────
export const setupKeys = {
  status: ["setup", "status"] as const,
};

export function useSetupStatus() {
  return useQuery({
    queryKey: setupKeys.status,
    queryFn: api.fetchSetupStatus,
    retry: 1,
    staleTime: 30000,
  });
}
