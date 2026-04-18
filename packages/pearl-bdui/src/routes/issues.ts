import type {
  CreateIssueRequest,
  IssueStatus,
  IssueType,
  Priority,
  UpdateIssueRequest,
} from "@pearl/shared";
import { ISSUE_LIST_FIELDS } from "@pearl/shared";
import type { FastifyInstance } from "fastify";
import type { RowDataPacket } from "mysql2";
import type { Config } from "../config.js";
import { queryWithRetry } from "../dolt/pool.js";
import { notFoundError, validationError } from "../errors.js";
import type { WriteService } from "../write-service/write-service.js";
import { fetchLabelColors } from "./labels.js";

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
      due: {
        type: "string",
        maxLength: 30,
        pattern: "^\\d{4}-\\d{2}-\\d{2}(T\\d{2}:\\d{2}(:\\d{2})?)?$",
      },
      parent: { type: "string", maxLength: 200 },
      estimated_minutes: { type: "integer", minimum: 0, maximum: 525600 },
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
      due: {
        type: ["string", "null"],
        maxLength: 30,
        pattern: "^\\d{4}-\\d{2}-\\d{2}(T\\d{2}:\\d{2}(:\\d{2})?)?$",
      },
      notes: { type: "string", maxLength: 10000 },
      design: { type: "string", maxLength: 10000 },
      acceptance_criteria: { type: "string", maxLength: 10000 },
      claim: { type: "boolean" },
      pinned: { type: "boolean" },
      estimated_minutes: { type: ["integer", "null"], minimum: 0, maximum: 525600 },
    },
    additionalProperties: false,
  },
} as const;

const deleteIssueSchema = {
  params: {
    type: "object",
    properties: {
      id: { type: "string" },
    },
    required: ["id"],
  },
  querystring: {
    type: "object",
    properties: {
      reason: { type: "string", maxLength: 500 },
      permanent: { type: "string", enum: ["true"] },
    },
    additionalProperties: false,
  },
} as const;

const DATE_RANGE_VALUES = [
  "overdue",
  "due_today",
  "due_this_week",
  "due_next_7_days",
  "no_due_date",
  "created_today",
  "created_this_week",
  "created_last_week",
];
const STRUCTURAL_VALUES = ["has_dependency", "is_blocked", "not_blocked", "is_epic", "no_assignee"];

const listIssuesQuerySchema = {
  querystring: {
    type: "object",
    properties: {
      status: {
        type: "string",
        maxLength: 200,
        pattern: `^(${ISSUE_STATUSES.join("|")})(,(${ISSUE_STATUSES.join("|")}))*$`,
      },
      priority: { type: "string", maxLength: 50 },
      issue_type: {
        type: "string",
        maxLength: 200,
        pattern: `^(${ISSUE_TYPES.join("|")})(,(${ISSUE_TYPES.join("|")}))*$`,
      },
      assignee: { type: "string", maxLength: 200 },
      search: { type: "string", maxLength: 500 },
      labels: { type: "string", maxLength: 500 },
      pinned: { type: "string", maxLength: 5 },
      date_ranges: { type: "string", maxLength: 500 },
      structural: { type: "string", maxLength: 200 },
      sort: { type: "string", maxLength: 50 },
      direction: { type: "string", maxLength: 4 },
      fields: { type: "string", maxLength: 500 },
      limit: { type: "string", maxLength: 10 },
      offset: { type: "string", maxLength: 10 },
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
  getConfig: () => Config,
  writeService: WriteService,
): void {
  // GET /api/issues — list with filtering, sorting, column projection
  app.get("/api/issues", { schema: listIssuesQuerySchema }, async (request, reply) => {
    const query = request.query as Record<string, string | undefined>;

    // Column projection — never SELECT *
    const requestedFields = query.fields?.split(",").filter(Boolean) || [];
    const validFields =
      requestedFields.length > 0
        ? requestedFields.filter((f) => (ISSUE_LIST_FIELDS as readonly string[]).includes(f))
        : [...ISSUE_LIST_FIELDS];

    // Always include id
    if (!validFields.includes("id")) {
      validFields.unshift("id");
    }

    const columns = validFields.map((f) => `i.\`${f}\``).join(", ");

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

    // Filter: date ranges (OR'd within the group so e.g. "overdue" + "due_today" works)
    if (query.date_ranges) {
      const ranges = query.date_ranges.split(",").filter((r) => DATE_RANGE_VALUES.includes(r));
      const dateConditions: string[] = [];
      for (const range of ranges) {
        switch (range) {
          case "overdue":
            dateConditions.push(
              `(i.due_at IS NOT NULL AND i.due_at < CURDATE() AND i.status != 'closed')`,
            );
            break;
          case "due_today":
            dateConditions.push(`(i.due_at IS NOT NULL AND DATE(i.due_at) = CURDATE())`);
            break;
          case "due_this_week":
            // Forward-looking: today through end of calendar week (Sunday)
            dateConditions.push(
              `(i.due_at IS NOT NULL AND i.due_at >= CURDATE() AND i.due_at < DATE_ADD(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 7 DAY))`,
            );
            break;
          case "due_next_7_days":
            dateConditions.push(
              `(i.due_at IS NOT NULL AND i.due_at >= CURDATE() AND i.due_at <= DATE_ADD(CURDATE(), INTERVAL 7 DAY))`,
            );
            break;
          case "no_due_date":
            dateConditions.push(`(i.due_at IS NULL)`);
            break;
          case "created_today":
            dateConditions.push(`(DATE(i.created_at) = CURDATE())`);
            break;
          case "created_this_week":
            dateConditions.push(
              `(i.created_at >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY))`,
            );
            break;
          case "created_last_week":
            dateConditions.push(
              `(i.created_at >= DATE_SUB(CURDATE(), INTERVAL (WEEKDAY(CURDATE()) + 7) DAY) AND i.created_at < DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY))`,
            );
            break;
        }
      }
      if (dateConditions.length > 0) {
        sql += ` AND (${dateConditions.join(" OR ")})`;
      }
    }

    // Filter: structural properties
    if (query.structural) {
      const props = query.structural.split(",").filter((s) => STRUCTURAL_VALUES.includes(s));
      for (const prop of props) {
        switch (prop) {
          case "has_dependency":
            sql += ` AND EXISTS (SELECT 1 FROM dependencies d WHERE d.issue_id = i.id OR d.depends_on_id = i.id)`;
            break;
          case "is_blocked":
            sql += ` AND EXISTS (SELECT 1 FROM dependencies d JOIN issues dep ON dep.id = d.depends_on_id WHERE d.issue_id = i.id AND d.type IN ('blocks', 'depends_on') AND dep.status != 'closed')`;
            break;
          case "not_blocked":
            sql += ` AND NOT EXISTS (SELECT 1 FROM dependencies d JOIN issues dep ON dep.id = d.depends_on_id WHERE d.issue_id = i.id AND d.type IN ('blocks', 'depends_on') AND dep.status != 'closed')`;
            break;
          case "is_epic":
            sql += ` AND i.issue_type = 'epic'`;
            break;
          case "no_assignee":
            sql += ` AND (i.assignee IS NULL OR i.assignee = '')`;
            break;
        }
      }
    }

    // Exclude ephemeral/wisp issues from default views
    sql += ` AND (i.ephemeral = 0 OR i.ephemeral IS NULL)`;

    // Sort
    const sortField = query.sort || "priority";
    const sortDir = query.direction === "desc" ? "DESC" : "ASC";
    // Validate sort field to prevent SQL injection
    const allowedSortFields = [
      "id",
      "title",
      "status",
      "priority",
      "issue_type",
      "assignee",
      "created_at",
      "updated_at",
      "due_at",
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

    const issues = await queryWithRetry(getConfig(), async (conn) => {
      const [rows] = await conn.query(sql, params);
      return rows;
    });

    // Ensure all issues have labels and labelColors initialized
    const issueRows = issues as RowDataPacket[];
    for (const issue of issueRows) {
      issue.labels = [];
      issue.labelColors = {};
    }
    if (issueRows.length > 0 && validFields.includes("id")) {
      const ids = issueRows.map((r) => r.id);
      const labelRows = (await queryWithRetry(getConfig(), async (conn) => {
        const [rows] = await conn.query<RowDataPacket[]>(
          `SELECT issue_id, label FROM labels WHERE issue_id IN (${ids.map(() => "?").join(",")})`,
          ids,
        );
        return rows;
      })) as RowDataPacket[];
      const labelMap = new Map<string, string[]>();
      for (const row of labelRows) {
        const existing = labelMap.get(row.issue_id) || [];
        existing.push(row.label);
        labelMap.set(row.issue_id, existing);
      }
      // Collect all unique label names for color lookup
      const allLabelNames = new Set<string>();
      for (const labels of labelMap.values()) {
        for (const label of labels) {
          allLabelNames.add(label);
        }
      }

      // Fetch label colors in one batch
      const labelColors = await fetchLabelColors(getConfig, [...allLabelNames]);

      for (const issue of issueRows) {
        issue.labels = labelMap.get(issue.id) || [];
        // Build per-issue color map (only labels that have definitions)
        const issueColorMap: Record<string, string> = {};
        for (const label of issue.labels as string[]) {
          if (labelColors[label]) {
            issueColorMap[label] = labelColors[label];
          }
        }
        issue.labelColors = issueColorMap;
      }
    }

    return reply.send(issueRows);
  });

  // GET /api/issues/:id — full detail
  app.get("/api/issues/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const issue = await queryWithRetry(getConfig(), async (conn) => {
      const [rows] = await conn.query<RowDataPacket[]>(`SELECT * FROM issues WHERE id = ?`, [id]);
      return rows[0] || null;
    });

    if (!issue) {
      throw notFoundError("Issue", id);
    }

    // Fetch labels
    const labelRows = (await queryWithRetry(getConfig(), async (conn) => {
      const [rows] = await conn.query<RowDataPacket[]>(
        `SELECT label FROM labels WHERE issue_id = ?`,
        [id],
      );
      return rows;
    })) as RowDataPacket[];
    const labelNames = labelRows.map((r) => r.label as string);
    issue.labels = labelNames;

    // Fetch label colors
    const labelColors = await fetchLabelColors(getConfig, labelNames);
    issue.labelColors = labelColors;

    return reply.send(issue);
  });

  // GET /api/issues/:id/comments
  app.get("/api/issues/:id/comments", async (request, reply) => {
    const { id } = request.params as { id: string };

    const comments = await queryWithRetry(getConfig(), async (conn) => {
      const [rows] = await conn.query(
        `SELECT id, issue_id, author, text, created_at
         FROM comments WHERE issue_id = ? ORDER BY created_at ASC`,
        [id],
      );
      return rows;
    });

    return reply.send(comments);
  });

  // GET /api/issues/:id/events
  app.get("/api/issues/:id/events", async (request, reply) => {
    const { id } = request.params as { id: string };

    const events = await queryWithRetry(getConfig(), async (conn) => {
      const [rows] = await conn.query(
        `SELECT id, issue_id, event_type, actor, old_value, new_value, comment, created_at
         FROM events WHERE issue_id = ? ORDER BY created_at DESC`,
        [id],
      );
      return rows;
    });

    return reply.send(events);
  });

  // GET /api/issues/:id/dependencies
  app.get("/api/issues/:id/dependencies", async (request, reply) => {
    const { id } = request.params as { id: string };

    const dependencies = await queryWithRetry(getConfig(), async (conn) => {
      const [rows] = await conn.query(
        `SELECT issue_id, depends_on_id, type, created_at, created_by
         FROM dependencies
         WHERE issue_id = ? OR depends_on_id = ?`,
        [id, id],
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

  // DELETE /api/issues/:id — close (default) or permanently delete (?permanent=true)
  app.delete("/api/issues/:id", { schema: deleteIssueSchema }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { reason, permanent } = request.query as { reason?: string; permanent?: string };
    const result =
      permanent === "true"
        ? await writeService.deleteIssue(id)
        : await writeService.closeIssue(id, reason);
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
