import type { FastifyInstance } from "fastify";
import type {
  IssueStatus,
  Priority,
  IssueType,
  CreateIssueRequest,
  UpdateIssueRequest,
} from "@beads-gui/shared";
import { ISSUE_LIST_FIELDS } from "@beads-gui/shared";
import { queryWithRetry } from "../dolt/pool.js";
import { notFoundError, validationError } from "../errors.js";
import type { Config } from "../config.js";
import type { WriteService } from "../write-service/write-service.js";
import type { RowDataPacket } from "mysql2";

// ─── JSON Schema for request body validation ───────────
const ISSUE_TYPES = ["task", "bug", "epic", "feature", "chore", "event", "gate", "molecule"];
const ISSUE_STATUSES = ["open", "in_progress", "closed", "blocked", "deferred"];

const createIssueSchema = {
  body: {
    type: "object",
    required: ["title"],
    properties: {
      title: { type: "string", minLength: 1, maxLength: 500 },
      description: { type: "string", maxLength: 10000 },
      issue_type: { type: "string", enum: ISSUE_TYPES },
      priority: { type: "integer", minimum: 0, maximum: 4 },
      assignee: { type: "string", maxLength: 200 },
      labels: { type: "array", items: { type: "string", maxLength: 100 }, maxItems: 50 },
      due: { type: "string", maxLength: 30, pattern: "^\\d{4}-\\d{2}-\\d{2}(T\\d{2}:\\d{2}(:\\d{2})?)?$" },
      parent: { type: "string", maxLength: 200 },
      estimated_minutes: { type: "integer", minimum: 0 },
    },
    additionalProperties: false,
  },
} as const;

const updateIssueSchema = {
  body: {
    type: "object",
    properties: {
      title: { type: "string", minLength: 1, maxLength: 500 },
      description: { type: "string", maxLength: 10000 },
      status: { type: "string", enum: ISSUE_STATUSES },
      priority: { type: "integer", minimum: 0, maximum: 4 },
      issue_type: { type: "string", enum: ISSUE_TYPES },
      assignee: { type: ["string", "null"], maxLength: 200 },
      labels: { type: "array", items: { type: "string", maxLength: 100 }, maxItems: 50 },
      due: { type: ["string", "null"], maxLength: 30, pattern: "^\\d{4}-\\d{2}-\\d{2}(T\\d{2}:\\d{2}(:\\d{2})?)?$" },
      notes: { type: "string", maxLength: 10000 },
      design: { type: "string", maxLength: 10000 },
      acceptance_criteria: { type: "string", maxLength: 10000 },
      claim: { type: "boolean" },
      pinned: { type: "boolean" },
      estimated_minutes: { type: ["integer", "null"], minimum: 0 },
    },
    additionalProperties: false,
  },
} as const;

const deleteIssueSchema = {
  querystring: {
    type: "object",
    properties: {
      reason: { type: "string", maxLength: 500 },
    },
    additionalProperties: false,
  },
} as const;

const addCommentSchema = {
  body: {
    type: "object",
    required: ["text"],
    properties: {
      text: { type: "string", minLength: 1, maxLength: 10000 },
    },
    additionalProperties: false,
  },
} as const;

export function registerIssueRoutes(
  app: FastifyInstance,
  config: Config,
  writeService: WriteService
): void {
  // GET /api/issues — list with filtering, sorting, column projection
  app.get("/api/issues", async (request, reply) => {
    const query = request.query as Record<string, string | undefined>;

    // Column projection — never SELECT *
    const requestedFields = query.fields?.split(",").filter(Boolean) || [];
    const validFields = requestedFields.length > 0
      ? requestedFields.filter((f) =>
          (ISSUE_LIST_FIELDS as readonly string[]).includes(f)
        )
      : [...ISSUE_LIST_FIELDS];

    // Always include id
    if (!validFields.includes("id")) {
      validFields.unshift("id");
    }

    const columns = validFields
      .map((f) => `i.\`${f}\``)
      .join(", ");

    let sql = `SELECT ${columns} FROM issues i WHERE 1=1`;
    const params: unknown[] = [];

    // Filter: status
    if (query.status) {
      const statuses = query.status.split(",");
      sql += ` AND i.status IN (${statuses.map(() => "?").join(",")})`;
      params.push(...statuses);
    }

    // Filter: priority
    if (query.priority) {
      const priorities = query.priority.split(",").map(Number).filter(Number.isFinite);
      if (priorities.length === 0) {
        // No valid priorities — match nothing
        sql += ` AND 1=0`;
      } else {
        sql += ` AND i.priority IN (${priorities.map(() => "?").join(",")})`;
        params.push(...priorities);
      }
    }

    // Filter: issue_type
    if (query.issue_type) {
      const types = query.issue_type.split(",");
      sql += ` AND i.issue_type IN (${types.map(() => "?").join(",")})`;
      params.push(...types);
    }

    // Filter: assignee
    if (query.assignee) {
      sql += ` AND i.assignee = ?`;
      params.push(query.assignee);
    }

    // Filter: pinned
    if (query.pinned === "true") {
      sql += ` AND i.pinned = 1`;
    }

    // Filter: search (title + description full-text)
    if (query.search) {
      sql += ` AND (i.title LIKE ? OR i.description LIKE ?)`;
      const escaped = query.search.replace(/[%_\\]/g, "\\$&");
      const searchTerm = `%${escaped}%`;
      params.push(searchTerm, searchTerm);
    }

    // Filter: labels (issue must have ALL specified labels)
    if (query.labels) {
      const labels = query.labels.split(",").filter(Boolean);
      for (const label of labels) {
        sql += ` AND EXISTS (SELECT 1 FROM labels l WHERE l.issue_id = i.id AND l.label = ?)`;
        params.push(label);
      }
    }

    // Exclude ephemeral/wisp issues from default views
    sql += ` AND (i.ephemeral = 0 OR i.ephemeral IS NULL)`;

    // Sort
    const sortField = query.sort || "priority";
    const sortDir = query.direction === "desc" ? "DESC" : "ASC";
    // Validate sort field to prevent SQL injection
    const allowedSortFields = [
      "id", "title", "status", "priority", "issue_type",
      "assignee", "created_at", "updated_at", "due_at",
    ];
    if (allowedSortFields.includes(sortField)) {
      sql += ` ORDER BY i.\`${sortField}\` ${sortDir}`;
    } else {
      sql += ` ORDER BY i.priority ASC, i.updated_at DESC`;
    }

    // Pagination
    const limit = Math.min(parseInt(query.limit || "100", 10) || 100, 1000);
    const offset = Math.max(0, parseInt(query.offset || "0", 10) || 0);
    sql += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const issues = await queryWithRetry(config, async (conn) => {
      const [rows] = await conn.query(sql, params);
      return rows;
    });

    // Fetch labels for each issue
    const issueRows = issues as RowDataPacket[];
    if (issueRows.length > 0 && validFields.includes("id")) {
      const ids = issueRows.map((r) => r.id);
      const labelRows = await queryWithRetry(config, async (conn) => {
        const [rows] = await conn.query<RowDataPacket[]>(
          `SELECT issue_id, label FROM labels WHERE issue_id IN (${ids.map(() => "?").join(",")})`,
          ids
        );
        return rows;
      }) as RowDataPacket[];
      const labelMap = new Map<string, string[]>();
      for (const row of labelRows) {
        const existing = labelMap.get(row.issue_id) || [];
        existing.push(row.label);
        labelMap.set(row.issue_id, existing);
      }
      for (const issue of issueRows) {
        issue.labels = labelMap.get(issue.id) || [];
      }
    }

    return reply.send(issueRows);
  });

  // GET /api/issues/:id — full detail
  app.get("/api/issues/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const issue = await queryWithRetry(config, async (conn) => {
      const [rows] = await conn.query<RowDataPacket[]>(
        `SELECT * FROM issues WHERE id = ?`,
        [id]
      );
      return rows[0] || null;
    });

    if (!issue) {
      throw notFoundError("Issue", id);
    }

    // Fetch labels
    const labelRows = await queryWithRetry(config, async (conn) => {
      const [rows] = await conn.query<RowDataPacket[]>(
        `SELECT label FROM labels WHERE issue_id = ?`,
        [id]
      );
      return rows;
    }) as RowDataPacket[];
    issue.labels = labelRows.map((r) => r.label);

    return reply.send(issue);
  });

  // GET /api/issues/:id/comments
  app.get("/api/issues/:id/comments", async (request, reply) => {
    const { id } = request.params as { id: string };

    const comments = await queryWithRetry(config, async (conn) => {
      const [rows] = await conn.query(
        `SELECT id, issue_id, author, text, created_at
         FROM comments WHERE issue_id = ? ORDER BY created_at ASC`,
        [id]
      );
      return rows;
    });

    return reply.send(comments);
  });

  // GET /api/issues/:id/events
  app.get("/api/issues/:id/events", async (request, reply) => {
    const { id } = request.params as { id: string };

    const events = await queryWithRetry(config, async (conn) => {
      const [rows] = await conn.query(
        `SELECT id, issue_id, event_type, actor, old_value, new_value, comment, created_at
         FROM events WHERE issue_id = ? ORDER BY created_at DESC`,
        [id]
      );
      return rows;
    });

    return reply.send(events);
  });

  // GET /api/issues/:id/dependencies
  app.get("/api/issues/:id/dependencies", async (request, reply) => {
    const { id } = request.params as { id: string };

    const dependencies = await queryWithRetry(config, async (conn) => {
      const [rows] = await conn.query(
        `SELECT issue_id, depends_on_id, type, created_at, created_by
         FROM dependencies
         WHERE issue_id = ? OR depends_on_id = ?`,
        [id, id]
      );
      return rows;
    });

    return reply.send(dependencies);
  });

  // POST /api/issues — create
  app.post("/api/issues", { schema: createIssueSchema }, async (request, reply) => {
    const body = request.body as CreateIssueRequest;
    const result = await writeService.createIssue(body);
    return reply.code(201).send(result);
  });

  // PATCH /api/issues/:id — update
  app.patch("/api/issues/:id", { schema: updateIssueSchema }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as UpdateIssueRequest;
    const result = await writeService.updateIssue(id, body);
    return reply.send(result);
  });

  // DELETE /api/issues/:id — close/delete
  app.delete("/api/issues/:id", { schema: deleteIssueSchema }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { reason } = request.query as { reason?: string };
    const result = await writeService.closeIssue(id, reason);
    return reply.send(result);
  });

  // POST /api/issues/:id/comments — add comment
  app.post("/api/issues/:id/comments", { schema: addCommentSchema }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { text: string };
    const result = await writeService.addComment(id, body);
    return reply.code(201).send(result);
  });
}
