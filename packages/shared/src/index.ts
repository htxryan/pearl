// Pearl — Shared API Types
// This package defines the contract between backend and frontend.

// ─── Label Types ─────────────────────────────────────────────

/** A label definition with its assigned palette color */
export interface LabelDefinition {
  name: string;
  color: LabelColor;
}

/** Label with usage count — returned by GET /api/labels */
export interface LabelWithCount extends LabelDefinition {
  count: number;
}

/** Predefined label color palette keys */
export type LabelColor =
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "teal"
  | "blue"
  | "purple"
  | "pink"
  | "gray";

export const LABEL_COLORS: LabelColor[] = [
  "red",
  "orange",
  "yellow",
  "green",
  "teal",
  "blue",
  "purple",
  "pink",
  "gray",
];

/** Request to create or update a label definition */
export interface UpsertLabelRequest {
  name: string;
  color: LabelColor;
}

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
  has_attachments: boolean;
  labels: string[];
  /** Map of label name → palette color key (from label_definitions) */
  labelColors: Record<string, LabelColor>;
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
  has_attachments: boolean;
  labels: string[];
  /** Map of label name → palette color key (from label_definitions) */
  labelColors: Record<string, LabelColor>;
}

export type IssueStatus = "open" | "in_progress" | "closed" | "blocked" | "deferred";

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
export const ISSUE_STATUSES: IssueStatus[] = [
  "open",
  "in_progress",
  "closed",
  "blocked",
  "deferred",
];

/** Statuses a user can manually set — "blocked" is derived from dependencies */
export const SETTABLE_STATUSES: readonly IssueStatus[] = [
  "open",
  "in_progress",
  "closed",
  "deferred",
] as const;
export const ISSUE_PRIORITIES: Priority[] = [0, 1, 2, 3, 4];
export const ISSUE_TYPES: IssueType[] = [
  "task",
  "bug",
  "epic",
  "feature",
  "chore",
  "event",
  "gate",
  "molecule",
];

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
  | "discovered_from"
  | "contains";

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
  due?: string | null;
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
  entity: "issues" | "dependencies" | "comments" | "events" | "stats" | "labels" | "settings";
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
  project_prefix?: string;
  dolt_mode: "embedded" | "server";
}

// ─── Migration Types ───────────────────────────────────────

export interface TestServerRequest {
  host: string;
  port: number;
  user?: string;
  password?: string;
}

export interface TestServerResponse {
  ok: boolean;
  error?: string;
}

export interface MigrateRequest {
  target: "managed" | "external";
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  dataDir?: string;
  force?: boolean;
}

export interface MigrateResponse {
  ok: boolean;
  dolt_mode: "server";
  dolt_host: string;
  dolt_port: number;
  error?: string;
}

export interface StatsResponse {
  total: number;
  by_status: Record<IssueStatus, number>;
  by_priority: Record<string, number>;
  by_type: Record<string, number>;
  recently_updated: number;
}

// ─── Setup / Onboarding Types ──────────────────────────────

export interface SetupStatusResponse {
  configured: boolean;
  mode: "embedded" | "server" | null;
}

export interface SetupInitializeRequest {
  mode: "embedded" | "server";
  /** Required when mode is "server" */
  server_host?: string;
  /** Required when mode is "server" */
  server_port?: number;
  /** MySQL user for server mode (optional, defaults to "root") */
  server_user?: string;
  /** MySQL password for server mode (optional) */
  server_password?: string;
  /** Database name for server mode (optional, defaults to "beads_gui") */
  database?: string;
}

export interface SetupInitializeResponse {
  success: boolean;
  message: string;
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
  "has_attachments",
] as const;

export type IssueListField = (typeof ISSUE_LIST_FIELDS)[number];

/** Fields that can contain attachment syntax (pills + data blocks) */
export const ATTACHMENT_HOST_FIELDS = [
  "description",
  "design",
  "acceptance_criteria",
  "notes",
] as const;

// ─── Settings Types ─────────────────────────────────────────

export type StorageMode = "inline" | "local";
export type LocalScope = "project" | "user";

export interface LocalStorageSettings {
  scope: LocalScope;
  projectPathOverride: string | null;
  userPathOverride: string | null;
}

export interface EncodingSettings {
  format: "webp";
  maxBytes: number;
  maxDimension: number;
}

export interface SweepSettings {
  graceSeconds: number;
  intervalSeconds: number;
}

export interface AttachmentSettings {
  storageMode: StorageMode;
  local: LocalStorageSettings;
  encoding: EncodingSettings;
  sweep: SweepSettings;
}

export interface Settings {
  version: 1;
  attachments: AttachmentSettings;
}

function deepFreeze<T extends object>(obj: T): T {
  Object.freeze(obj);
  for (const value of Object.values(obj)) {
    if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
      deepFreeze(value as object);
    }
  }
  return obj;
}

export const DEFAULT_SETTINGS: Settings = deepFreeze({
  version: 1,
  attachments: {
    storageMode: "local",
    local: {
      scope: "project",
      projectPathOverride: null,
      userPathOverride: null,
    },
    encoding: {
      format: "webp",
      maxBytes: 1_048_576,
      maxDimension: 2048,
    },
    sweep: {
      graceSeconds: 3600,
      intervalSeconds: 600,
    },
  },
});

// ─── Attachment Types & Functions ───────────────────────────

export type {
  AttachmentBlock,
  InlineAttachment,
  LocalAttachment,
  ParsedField,
  PillReference,
  Ref,
} from "./attachment-syntax.js";

export {
  createRef,
  disambiguateRefs,
  extractBlocks,
  extractPills,
  hasAttachmentSyntax,
  isRef,
  PILL_RE,
  parseField,
  parseFieldAsync,
  SUPPORTED_VERSIONS,
  serializeField,
} from "./attachment-syntax.js";
