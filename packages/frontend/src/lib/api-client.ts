import type {
  ApiError,
  Comment,
  CreateCommentRequest,
  CreateDependencyRequest,
  CreateIssueRequest,
  Dependency,
  Event,
  HealthResponse,
  Issue,
  IssueListItem,
  LabelWithCount,
  MutationResponse,
  SetupInitializeRequest,
  SetupInitializeResponse,
  SetupStatusResponse,
  StatsResponse,
  UpdateIssueRequest,
  UpsertLabelRequest,
} from "@pearl/shared";

const API_BASE = "/api";

class ApiClientError extends Error {
  constructor(
    public status: number,
    public apiError: ApiError,
  ) {
    super(apiError.message);
    this.name = "ApiClientError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: HeadersInit = { ...init?.headers };
  if (init?.body != null) {
    (headers as Record<string, string>)["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    let apiError: ApiError;
    try {
      apiError = await response.json();
    } catch {
      apiError = {
        code: "INTERNAL_ERROR",
        message: response.statusText,
        retryable: false,
      };
    }
    throw new ApiClientError(response.status, apiError);
  }

  return response.json();
}

// ─── Issues ─────────────────────────────────────────────
export function fetchIssues(params?: URLSearchParams): Promise<IssueListItem[]> {
  const query = params?.toString();
  return request(`/issues${query ? `?${query}` : ""}`);
}

export function fetchIssue(id: string): Promise<Issue> {
  return request(`/issues/${encodeURIComponent(id)}`);
}

export function createIssue(data: CreateIssueRequest): Promise<MutationResponse<Issue>> {
  return request("/issues", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateIssue(
  id: string,
  data: UpdateIssueRequest,
): Promise<MutationResponse<Issue>> {
  return request(`/issues/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function closeIssue(id: string, reason?: string): Promise<MutationResponse> {
  const query = reason ? `?reason=${encodeURIComponent(reason)}` : "";
  return request(`/issues/${encodeURIComponent(id)}${query}`, {
    method: "DELETE",
  });
}

export function deleteIssue(id: string): Promise<MutationResponse> {
  return request(`/issues/${encodeURIComponent(id)}?permanent=true`, {
    method: "DELETE",
  });
}

// ─── Comments ───────────────────────────────────────────
export function fetchComments(issueId: string): Promise<Comment[]> {
  return request(`/issues/${encodeURIComponent(issueId)}/comments`);
}

export function addComment(
  issueId: string,
  data: CreateCommentRequest,
): Promise<MutationResponse<Comment>> {
  return request(`/issues/${encodeURIComponent(issueId)}/comments`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ─── Events ─────────────────────────────────────────────
export function fetchEvents(issueId: string): Promise<Event[]> {
  return request(`/issues/${encodeURIComponent(issueId)}/events`);
}

// ─── Dependencies ───────────────────────────────────────
export function fetchIssueDependencies(issueId: string): Promise<Dependency[]> {
  return request(`/issues/${encodeURIComponent(issueId)}/dependencies`);
}

export function fetchAllDependencies(): Promise<Dependency[]> {
  return request("/dependencies");
}

export function addDependency(
  data: CreateDependencyRequest,
): Promise<MutationResponse<Dependency>> {
  return request("/dependencies", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function removeDependency(issueId: string, dependsOnId: string): Promise<MutationResponse> {
  return request(
    `/dependencies/${encodeURIComponent(issueId)}/${encodeURIComponent(dependsOnId)}`,
    { method: "DELETE" },
  );
}

// ─── Labels ────────────────────────────────────────────────
export function fetchLabels(): Promise<LabelWithCount[]> {
  return request("/labels");
}

export function upsertLabel(data: UpsertLabelRequest): Promise<MutationResponse> {
  return request("/labels", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ─── Health & Stats ─────────────────────────────────────
export function fetchHealth(): Promise<HealthResponse> {
  return request("/health");
}

export function fetchStats(): Promise<StatsResponse> {
  return request("/stats");
}

// ─── Setup ──────────────────────────────────────────────
export function fetchSetupStatus(): Promise<SetupStatusResponse> {
  return request("/setup/status");
}

export function initializeSetup(data: SetupInitializeRequest): Promise<SetupInitializeResponse> {
  return request("/setup/initialize", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export { ApiClientError };
