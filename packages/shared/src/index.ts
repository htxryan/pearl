// Beads GUI — Shared API Types
// This package defines the contract between backend and frontend.

// ─── Domain Types ────────────────────────────────────────────

export interface Issue {
  id: string;
  title: string;
  description: string;
  design: string;
  acceptance_criteria: string;
  notes: string;
  status: IssueStatus;
  priority: Priority;
  issue_type: IssueType;
  assignee: string | null;
  owner: string;
  estimated_minutes: number | null;
  created_at: string; // ISO 8601
  created_by: string;
  updated_at: string; // ISO 8601
  closed_at: string | null;
  due_at: string | null;
  defer_until: string | null;
  external_ref: string | null;
  spec_id: string | null;
  pinned: boolean;
  is_template: boolean;
  labels: string[];
  metadata: Record<string, unknown>;
}

/** Lightweight projection for list views — never SELECT * */
export interface IssueListItem {
  id: string;
  title: string;
  status: IssueStatus;
  priority: Priority;
  issue_type: IssueType;
  assignee: string | null;
  owner: string;
  created_at: string;
  updated_at: string;
  due_at: string | null;
  pinned: boolean;
  labels: string[];
}

export type IssueStatus =
  | "open"
  | "in_progress"
  | "closed"
  | "blocked"
  | "deferred";

/** 0 = highest (P0), 4 = lowest (P4) */
export type Priority = 0 | 1 | 2 | 3 | 4;

export type IssueType =
  | "task"
  | "bug"
  | "epic"
  | "feature"
  | "chore"
  | "event"
  | "gate"
  | "molecule";

/** Canonical value arrays — single source of truth for validation and UI */
export const ISSUE_STATUSES: IssueStatus[] = ["open", "in_progress", "closed", "blocked", "deferred"];
export const ISSUE_PRIORITIES: Priority[] = [0, 1, 2, 3, 4];
export const ISSUE_TYPES: IssueType[] = ["task", "bug", "epic", "feature", "chore", "event", "gate", "molecule"];

export interface Dependency {
  issue_id: string;
  depends_on_id: string;
  type: DependencyType;
  created_at: string;
  created_by: string;
}

export type DependencyType =
  | "blocks"
  | "depends_on"
  | "relates_to"
  | "discovered_from";

export interface Comment {
  id: string;
  issue_id: string;
  author: string;
  text: string;
  created_at: string;
}

export interface Event {
  id: string;
  issue_id: string;
  event_type: string;
  actor: string;
  old_value: string | null;
  new_value: string | null;
  comment: string | null;
  created_at: string;
}

// ─── API Request/Response Types ─────────────────────────────

export interface IssueFilter {
  status?: IssueStatus | IssueStatus[];
  priority?: Priority | Priority[];
  issue_type?: IssueType | IssueType[];
  assignee?: string;
  search?: string;
  pinned?: boolean;
}

export interface SortSpec {
  field: string;
  direction: "asc" | "desc";
}

export interface IssueListQuery {
  filter?: IssueFilter;
  sort?: SortSpec;
  fields?: string[];
  limit?: number;
  offset?: number;
}

export interface CreateIssueRequest {
  title: string;
  description?: string;
  issue_type?: IssueType;
  priority?: Priority;
  assignee?: string;
  labels?: string[];
  due?: string;
  parent?: string;
  estimated_minutes?: number;
}

export interface UpdateIssueRequest {
  title?: string;
  description?: string;
  design?: string;
  acceptance_criteria?: string;
  status?: IssueStatus;
  priority?: Priority;
  issue_type?: IssueType;
  assignee?: string;
  labels?: string[];
  due?: string;
  notes?: string;
  claim?: boolean;
  pinned?: boolean;
  estimated_minutes?: number;
}

export interface CreateCommentRequest {
  text: string;
}

export interface CreateDependencyRequest {
  issue_id: string;
  depends_on_id: string;
  type?: DependencyType;
}

// ─── API Response Types ─────────────────────────────────────

export interface MutationResponse<T = unknown> {
  success: boolean;
  data?: T;
  invalidationHints: InvalidationHint[];
}

export interface InvalidationHint {
  entity: "issues" | "dependencies" | "comments" | "events" | "stats";
  id?: string;
}

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  retryable: boolean;
}

export type ApiErrorCode =
  | "DOLT_UNAVAILABLE"
  | "DATABASE_LOCKED"
  | "CLI_ERROR"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "INTERNAL_ERROR";

export interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  dolt_server: "running" | "starting" | "stopped" | "error";
  uptime_seconds: number;
  version: string;
}

export interface StatsResponse {
  total: number;
  by_status: Record<IssueStatus, number>;
  by_priority: Record<string, number>;
  by_type: Record<string, number>;
  recently_updated: number;
}

/** Fields valid for column projection on list endpoints */
export const ISSUE_LIST_FIELDS = [
  "id",
  "title",
  "status",
  "priority",
  "issue_type",
  "assignee",
  "owner",
  "created_at",
  "updated_at",
  "due_at",
  "pinned",
] as const;

export type IssueListField = (typeof ISSUE_LIST_FIELDS)[number];
