# API Reference

All endpoints are served under `/api/` on the Fastify server (default port 3456). Request/response types are defined in `packages/shared/src/index.ts`.

## Issues

### `GET /api/issues`

List issues with filtering, sorting, and column projection.

**Query parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Comma-separated statuses: `open`, `in_progress`, `closed`, `blocked`, `deferred` |
| `priority` | string | Comma-separated priorities: `0`-`4` |
| `issue_type` | string | Comma-separated types: `task`, `bug`, `epic`, `feature`, `chore`, `event`, `gate`, `molecule` |
| `assignee` | string | Filter by assignee name |
| `search` | string | Case-insensitive search in title and description |
| `labels` | string | Comma-separated labels (issue must have ALL specified) |
| `pinned` | string | `"true"` to show only pinned issues |
| `date_ranges` | string | Comma-separated: `overdue`, `due_today`, `due_this_week`, `due_next_7_days`, `no_due_date`, `created_today`, `created_this_week`, `created_last_week` |
| `structural` | string | Comma-separated: `has_dependency`, `is_blocked`, `not_blocked`, `is_epic`, `no_assignee`, `no_parent` |
| `sort` | string | Sort field: `id`, `title`, `status`, `priority`, `issue_type`, `assignee`, `created_at`, `updated_at`, `due_at` |
| `direction` | string | `asc` (default) or `desc` |
| `fields` | string | Comma-separated column projection (from `ISSUE_LIST_FIELDS`) |
| `limit` | string | Max results, 1-1000 (default 100) |
| `offset` | string | Pagination offset (default 0) |

**Response:** `IssueListItem[]` — each item includes `labels: string[]` and `labelColors: Record<string, LabelColor>`.

### `GET /api/issues/:id`

Get full issue detail.

**Response:** `Issue` — all fields including `description`, `design`, `acceptance_criteria`, `notes`, `metadata`.

### `POST /api/issues`

Create a new issue.

**Body:** `CreateIssueRequest`

```json
{
  "title": "string (required, 1-500 chars)",
  "description": "string (max 4MB)",
  "issue_type": "task|bug|epic|feature|chore|event|gate|molecule",
  "priority": 0-4,
  "assignee": "string (max 200 chars)",
  "labels": ["string (max 100 chars each, max 50)"],
  "due": "YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS",
  "parent": "string (parent issue ID)",
  "estimated_minutes": 0-525600
}
```

**Response:** `201` with `MutationResponse`

### `PATCH /api/issues/:id`

Update issue fields. All fields optional.

**Body:** `UpdateIssueRequest`

```json
{
  "title": "string",
  "description": "string",
  "design": "string",
  "acceptance_criteria": "string",
  "status": "open|in_progress|closed|blocked|deferred",
  "priority": 0-4,
  "issue_type": "...",
  "assignee": "string|null",
  "labels": ["..."],
  "due": "YYYY-MM-DD|null",
  "notes": "string",
  "claim": true,
  "pinned": true,
  "estimated_minutes": 0-525600
}
```

**Response:** `MutationResponse`

### `DELETE /api/issues/:id`

Close an issue (default) or permanently delete it.

**Query parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `reason` | string | Closure reason (max 500 chars) |
| `permanent` | string | `"true"` to permanently delete instead of closing |

**Response:** `MutationResponse`

## Comments

### `GET /api/issues/:id/comments`

Get comments for an issue, ordered by `created_at ASC`.

**Response:** `Comment[]`

### `POST /api/issues/:id/comments`

Add a comment to an issue.

**Body:** `CreateCommentRequest`

```json
{
  "text": "string (required, 1 char min, 4MB max)"
}
```

**Response:** `201` with `MutationResponse`

## Events

### `GET /api/issues/:id/events`

Get audit log for an issue, ordered by `created_at DESC`.

**Response:** `Event[]` — each event records `event_type`, `actor`, `old_value`, `new_value`.

## Dependencies

### `GET /api/issues/:id/dependencies`

Get all dependencies where the issue is either `issue_id` or `depends_on_id`.

**Response:** `Dependency[]`

### `GET /api/dependencies`

Get the full dependency DAG (up to 5000 edges).

**Response:** `Dependency[]`

### `POST /api/dependencies`

Create a dependency relationship.

**Body:** `CreateDependencyRequest`

```json
{
  "issue_id": "string (required)",
  "depends_on_id": "string (required)",
  "type": "blocks|depends_on|relates_to|discovered_from|contains"
}
```

**Response:** `201` with `MutationResponse`

### `DELETE /api/dependencies/:issueId/:dependsOnId`

Remove a dependency relationship.

**Response:** `MutationResponse`

## Labels

### `GET /api/labels`

List all label definitions with usage counts.

**Response:** `LabelWithCount[]` — `{ name, color, count }`

### `POST /api/labels`

Create or update a label definition (upsert).

**Body:** `UpsertLabelRequest`

```json
{
  "name": "string",
  "color": "red|orange|yellow|green|teal|blue|purple|pink|gray"
}
```

**Response:** `201` with `MutationResponse`

## Attachments

### `POST /api/attachments`

Upload an image attachment (multipart/form-data).

**Constraints:**
- Max file size: 10MB (hard limit), `settings.encoding.maxBytes` (configurable, default 1MB)
- Allowed MIME types (detected via magic bytes, not Content-Type header): `image/webp`, `image/png`, `image/jpeg`, `image/gif`, `image/avif`
- Content-addressed: file is stored as `<sha256-prefix-12>.ext`
- Duplicate uploads return `200` with the existing ref

**Response:** `201` (or `200` if deduplicated)

```json
{
  "ref": "a1b2c3d4e5f6",
  "scope": "project|user",
  "path": "relative/path/to/file",
  "sha256": "full-sha256-hex",
  "bytes": 12345,
  "mime": "image/webp"
}
```

**Errors:** `413` (too large), `415` (unsupported MIME), `409` (hash collision), `422` (path traversal)

### `GET /api/attachments/:ref`

Download an attachment by its 12-character hex ref.

**Query parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `scope` | string | `"project"` or `"user"` (defaults to settings) |

**Response:** Binary stream with `Content-Type`, `Cache-Control: private, max-age=31536000, immutable`.

## Settings

### `GET /api/settings`

Get project settings (attachment storage configuration).

**Response:** `Settings`

### `PUT /api/settings`

Update project settings.

**Body:** `Settings` — full replacement (not partial).

**Response:** `MutationResponse<Settings>`

## Stats

### `GET /api/stats`

Get aggregated issue statistics.

**Response:** `StatsResponse`

```json
{
  "total": 42,
  "by_status": { "open": 10, "in_progress": 5, "closed": 20, "blocked": 2, "deferred": 5 },
  "by_priority": { "0": 2, "1": 5, "2": 15, "3": 10, "4": 10 },
  "by_type": { "task": 20, "bug": 10, "feature": 12 },
  "recently_updated": 8
}
```

## Health

### `GET /api/health`

Server health check.

**Response:** `HealthResponse`

```json
{
  "status": "healthy|degraded|unhealthy",
  "dolt_server": "running|starting|stopped|error",
  "uptime_seconds": 3600,
  "version": "1.2.3",
  "project_prefix": "beads-gui",
  "dolt_mode": "server"
}
```

## Setup

### `GET /api/setup/status`

Check if the project is configured.

**Response:** `SetupStatusResponse` — `{ configured: boolean, mode: "embedded"|"server"|null }`

### `POST /api/setup/initialize`

Initialize the project with a database mode.

**Body:** `SetupInitializeRequest`

```json
{
  "mode": "embedded|server",
  "server_host": "127.0.0.1",
  "server_port": 3307,
  "server_user": "root",
  "server_password": "",
  "database": "beads_gui"
}
```

**Response:** `SetupInitializeResponse` — `{ success: boolean, message: string }`

## Migration

### `POST /api/migration/test-server`

Test connectivity to an external Dolt server.

**Body:** `TestServerRequest` — `{ host, port, user?, password? }`

**Response:** `TestServerResponse` — `{ ok: boolean, error?: string }`

### `POST /api/migration/migrate`

Migrate from embedded mode to server mode.

**Body:** `MigrateRequest`

```json
{
  "target": "managed|external",
  "host": "127.0.0.1",
  "port": 3307,
  "user": "root",
  "password": "",
  "dataDir": "/path/to/data",
  "force": false
}
```

**Response:** `MigrateResponse` — `{ ok, dolt_mode: "server", dolt_host, dolt_port, error? }`

## Error Responses

All errors follow the `ApiError` format:

```json
{
  "code": "VALIDATION_ERROR|NOT_FOUND|DOLT_UNAVAILABLE|DATABASE_LOCKED|CLI_ERROR|INTERNAL_ERROR",
  "message": "Human-readable description",
  "retryable": false
}
```

| Code | Status | Retryable | Description |
|------|--------|-----------|-------------|
| `VALIDATION_ERROR` | 400 | No | Invalid request body or parameters |
| `NOT_FOUND` | 404 | No | Issue or resource not found |
| `DOLT_UNAVAILABLE` | 503 | Yes | Dolt SQL server not reachable |
| `DATABASE_LOCKED` | 423 | Yes | Write lock contention (retried automatically up to 3 times) |
| `CLI_ERROR` | 502 | No | `bd` CLI invocation failed |
| `INTERNAL_ERROR` | 500 | No | Unexpected server error |

## Mutation Response Pattern

All write operations return `MutationResponse`:

```json
{
  "success": true,
  "data": { ... },
  "invalidationHints": [
    { "entity": "issues", "id": "abc123" },
    { "entity": "stats" }
  ]
}
```

The `invalidationHints` array tells the frontend which TanStack Query caches to refetch. Entities: `issues`, `dependencies`, `comments`, `events`, `stats`, `labels`, `settings`.
