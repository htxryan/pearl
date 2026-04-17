// Query key factories extracted to break circular dependency between
// use-issues.ts and use-notifications.ts.

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

export const setupKeys = {
  status: ["setup", "status"] as const,
};
