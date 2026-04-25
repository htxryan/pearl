import { createHash, randomBytes } from "node:crypto";
import { hostname } from "node:os";
import type { CreateIssueRequest, InvalidationHint, UpdateIssueRequest } from "@pearl/shared";
import { ATTACHMENT_HOST_FIELDS, hasAttachmentSyntax } from "@pearl/shared";
import type { PoolConnection } from "mysql2/promise";
import type { Config } from "../config.js";
import { queryWithRetry } from "../dolt/pool.js";
import { notFoundError } from "../errors.js";

const ACTOR = hostname();

export function computeHasAttachments(fields: Record<string, unknown>): boolean {
  return ATTACHMENT_HOST_FIELDS.some((f) => {
    const val = fields[f];
    return typeof val === "string" && val.length > 0 && hasAttachmentSyntax(val);
  });
}

// ─── Base36 Encoding (matches Go idgen.EncodeBase36) ───

export function encodeBase36(data: Buffer, length: number): string {
  const chars = "0123456789abcdefghijklmnopqrstuvwxyz";
  let num = BigInt(`0x${data.toString("hex")}`);
  if (num === 0n) return "0".repeat(length);

  const base = 36n;
  const digits: string[] = [];
  while (num > 0n) {
    digits.push(chars[Number(num % base)]);
    num /= base;
  }
  digits.reverse();

  while (digits.length < length) digits.unshift("0");
  if (digits.length > length) return digits.slice(digits.length - length).join("");
  return digits.join("");
}

// ─── Adaptive ID Length (birthday paradox) ─────────────

export function computeAdaptiveLength(numIssues: number, minLength = 3, maxLength = 8): number {
  for (let length = minLength; length <= maxLength; length++) {
    const totalPossibilities = 36 ** length;
    const exponent = -(numIssues ** 2) / (2 * totalPossibilities);
    const prob = 1 - Math.exp(exponent);
    if (prob <= 0.25) return length;
  }
  return maxLength;
}

function hashBytesForLength(length: number): number {
  if (length <= 3) return 2;
  if (length <= 4) return 3;
  if (length <= 6) return 4;
  return 5;
}

// ─── ID Generation ─────────────────────────────────────

async function generateHashId(
  conn: PoolConnection,
  prefix: string,
  title: string,
  description: string,
): Promise<string> {
  const [rows] = await conn.execute("SELECT COUNT(*) as cnt FROM issues WHERE id LIKE ?", [
    `${prefix}-%`,
  ]);
  const numIssues = (rows as Array<{ cnt: number }>)[0].cnt;
  const baseLength = computeAdaptiveLength(numIssues);

  const creator = ACTOR;
  const timestamp = (BigInt(Date.now()) * 1_000_000n).toString();

  for (let length = baseLength; length <= 8; length++) {
    const numBytes = hashBytesForLength(length);
    for (let nonce = 0; nonce < 10; nonce++) {
      const content = `${title}|${description}|${creator}|${timestamp}|${nonce}`;
      const hash = createHash("sha256").update(content).digest();
      const shortId = encodeBase36(hash.subarray(0, numBytes), length);
      const id = `${prefix}-${shortId}`;

      const [existing] = await conn.execute("SELECT COUNT(*) as cnt FROM issues WHERE id = ?", [
        id,
      ]);
      if ((existing as Array<{ cnt: number }>)[0].cnt === 0) {
        return id;
      }
    }
  }

  const fallbackHash = createHash("sha256")
    .update(`${title}|${Date.now()}|${randomBytes(8).toString("hex")}`)
    .digest();
  return `${prefix}-${encodeBase36(fallbackHash.subarray(0, 5), 8)}`;
}

async function generateCounterId(conn: PoolConnection, prefix: string): Promise<string> {
  await conn.execute(
    `INSERT INTO issue_counter (prefix, last_id) VALUES (?, 1)
     ON DUPLICATE KEY UPDATE last_id = last_id + 1`,
    [prefix],
  );
  const [rows] = await conn.execute("SELECT last_id FROM issue_counter WHERE prefix = ?", [prefix]);
  const lastId = (rows as Array<{ last_id: number }>)[0].last_id;
  return `${prefix}-${lastId}`;
}

async function generateChildId(conn: PoolConnection, parentId: string): Promise<string> {
  const [counterRows] = await conn.execute(
    "SELECT last_child FROM child_counters WHERE parent_id = ?",
    [parentId],
  );

  let maxChild = 0;
  if ((counterRows as unknown[]).length > 0) {
    maxChild = (counterRows as Array<{ last_child: number }>)[0].last_child;
  }

  const [children] = await conn.execute("SELECT id FROM issues WHERE id LIKE ? AND id NOT LIKE ?", [
    `${parentId}.%`,
    `${parentId}.%.%`,
  ]);
  for (const row of children as Array<{ id: string }>) {
    const suffix = row.id.split(".").pop();
    const num = Number.parseInt(suffix || "0", 10);
    if (!Number.isNaN(num) && num > maxChild) maxChild = num;
  }

  const nextChild = maxChild + 1;

  await conn.execute(
    `INSERT INTO child_counters (parent_id, last_child) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE last_child = ?`,
    [parentId, nextChild, nextChild],
  );

  return `${parentId}.${nextChild}`;
}

// ─── Config Helpers ────────────────────────────────────

async function getIssuePrefix(conn: PoolConnection): Promise<string> {
  const [rows] = await conn.execute("SELECT value FROM config WHERE `key` = 'issue_prefix'");
  if ((rows as unknown[]).length === 0) return "beads";
  return (rows as Array<{ value: string }>)[0].value;
}

async function getIdMode(conn: PoolConnection): Promise<"hash" | "counter"> {
  const [rows] = await conn.execute("SELECT value FROM config WHERE `key` = 'issue_id_mode'");
  if ((rows as unknown[]).length === 0) return "hash";
  return (rows as Array<{ value: string }>)[0].value === "counter" ? "counter" : "hash";
}

// ─── Content Hash ──────────────────────────────────────

export interface ContentHashFields {
  title?: string;
  description?: string;
  design?: string;
  acceptance_criteria?: string;
  notes?: string;
  spec_id?: string;
  status?: string;
  priority?: number;
  issue_type?: string;
  assignee?: string;
  owner?: string;
  created_by?: string;
  external_ref?: string;
  source_system?: string;
  pinned?: boolean;
  metadata?: string;
  is_template?: boolean;
  await_type?: string;
  await_id?: string;
  mol_type?: string;
  work_type?: string;
  event_kind?: string;
  actor?: string;
  target?: string;
  payload?: string;
}

export function computeContentHash(fields: ContentHashFields): string {
  const hash = createHash("sha256");
  const w = (s: string) => {
    hash.update(s);
    hash.update("\0");
  };

  w(fields.title || "");
  w(fields.description || "");
  w(fields.design || "");
  w(fields.acceptance_criteria || "");
  w(fields.notes || "");
  w(fields.spec_id || "");
  w(fields.status || "");
  w(String(fields.priority ?? 2));
  w(fields.issue_type || "");
  w(fields.assignee || "");
  w(fields.owner || "");
  w(fields.created_by || "");
  w(fields.external_ref || "");
  w(fields.source_system || "");
  if (fields.pinned) hash.update("pinned");
  hash.update("\0");
  w(fields.metadata || "");
  if (fields.is_template) hash.update("template");
  hash.update("\0");
  w(fields.await_type || "");
  w(fields.await_id || "");
  w("0");
  w(fields.mol_type || "");
  w(fields.work_type || "");
  w(fields.event_kind || "");
  w(fields.actor || "");
  w(fields.target || "");
  w(fields.payload || "");

  return hash.digest("hex");
}

// ─── Writer Result Type ────────────────────────────────

export interface WriterResult {
  data: unknown;
  hints: InvalidationHint[];
}

// ─── Issue Create ──────────────────────────────────────

export async function sqlCreateIssue(
  config: Config,
  req: CreateIssueRequest,
): Promise<WriterResult> {
  return queryWithRetry(config, async (conn) => {
    await conn.beginTransaction();
    try {
      let id: string;

      if (req.parent) {
        id = await generateChildId(conn, req.parent);
      } else {
        const prefix = await getIssuePrefix(conn);
        const mode = await getIdMode(conn);
        id =
          mode === "counter"
            ? await generateCounterId(conn, prefix)
            : await generateHashId(conn, prefix, req.title, req.description || "");
      }

      const now = new Date();
      const status = "open";
      const priority = req.priority ?? 2;
      const issueType = req.issue_type || "task";

      const contentHash = computeContentHash({
        title: req.title,
        description: req.description,
        status,
        priority,
        issue_type: issueType,
        assignee: req.assignee,
        created_by: ACTOR,
        owner: ACTOR,
      });

      const hasAttach = computeHasAttachments({ description: req.description || "" });

      await conn.execute(
        `INSERT INTO issues (
          id, title, description, design, acceptance_criteria, notes,
          status, priority, issue_type, assignee, owner, created_by,
          created_at, updated_at, content_hash, estimated_minutes, due_at,
          has_attachments
        ) VALUES (?, ?, ?, '', '', '', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          req.title,
          req.description || "",
          status,
          priority,
          issueType,
          req.assignee || null,
          ACTOR,
          ACTOR,
          now,
          now,
          contentHash,
          req.estimated_minutes ?? null,
          req.due ? new Date(req.due) : null,
          hasAttach ? 1 : 0,
        ],
      );

      if (req.labels?.length) {
        for (const label of req.labels) {
          await conn.execute("INSERT INTO labels (issue_id, label) VALUES (?, ?)", [id, label]);
        }
      }

      if (req.parent) {
        await conn.execute(
          `INSERT INTO dependencies (issue_id, depends_on_id, type, created_by)
           VALUES (?, ?, 'contains', ?)`,
          [req.parent, id, ACTOR],
        );
      }

      await conn.execute(
        `INSERT INTO events (issue_id, event_type, actor, old_value, new_value, created_at)
         VALUES (?, 'created', ?, '', '', ?)`,
        [id, ACTOR, now],
      );

      await conn.commit();

      return {
        data: {
          id,
          title: req.title,
          description: req.description || "",
          status,
          priority,
          issue_type: issueType,
          assignee: req.assignee || null,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        },
        hints: [
          { entity: "issues" as const },
          { entity: "stats" as const },
          { entity: "events" as const },
        ],
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    }
  });
}

// ─── Issue Update ──────────────────────────────────────

export async function sqlUpdateIssue(
  config: Config,
  id: string,
  req: UpdateIssueRequest,
): Promise<WriterResult> {
  return queryWithRetry(config, async (conn) => {
    await conn.beginTransaction();
    try {
      const [rows] = await conn.execute("SELECT * FROM issues WHERE id = ?", [id]);
      if ((rows as unknown[]).length === 0) {
        throw notFoundError("Issue", id);
      }
      const current = (rows as Record<string, unknown>[])[0];

      const updates = { ...req };
      if (updates.claim) {
        updates.assignee = ACTOR;
        if (!updates.status) updates.status = "in_progress";
      }

      const setClauses: string[] = [];
      const setValues: Array<string | number | boolean | Date | null> = [];

      const fieldMap: Array<[string, keyof UpdateIssueRequest]> = [
        ["title", "title"],
        ["description", "description"],
        ["design", "design"],
        ["acceptance_criteria", "acceptance_criteria"],
        ["status", "status"],
        ["priority", "priority"],
        ["issue_type", "issue_type"],
        ["assignee", "assignee"],
        ["notes", "notes"],
        ["estimated_minutes", "estimated_minutes"],
      ];

      for (const [col, key] of fieldMap) {
        if (updates[key] !== undefined) {
          setClauses.push(`${col} = ?`);
          setValues.push((updates[key] as string | number | boolean | null) ?? null);
        }
      }

      if (updates.due !== undefined) {
        setClauses.push("due_at = ?");
        setValues.push(updates.due ? new Date(updates.due) : null);
      }

      if (updates.status === "closed" && current.status !== "closed") {
        setClauses.push("closed_at = ?");
        setValues.push(new Date());
      }

      const now = new Date();
      setClauses.push("updated_at = ?");
      setValues.push(now);

      if (setClauses.length > 0) {
        setValues.push(id);
        await conn.execute(`UPDATE issues SET ${setClauses.join(", ")} WHERE id = ?`, setValues);
      }

      // Recompute content hash from merged state
      const merged: Record<string, unknown> = { ...current };
      for (const [col, key] of fieldMap) {
        if (updates[key] !== undefined) merged[col] = updates[key];
      }
      if (updates.due !== undefined) merged.due_at = updates.due;

      const newHash = computeContentHash({
        title: merged.title as string,
        description: merged.description as string,
        design: merged.design as string,
        acceptance_criteria: merged.acceptance_criteria as string,
        notes: merged.notes as string,
        status: merged.status as string,
        priority: merged.priority as number,
        issue_type: merged.issue_type as string,
        assignee: merged.assignee as string,
        owner: merged.owner as string,
        created_by: merged.created_by as string,
      });

      const hasAttach = computeHasAttachments(merged);
      await conn.execute("UPDATE issues SET content_hash = ?, has_attachments = ? WHERE id = ?", [
        newHash,
        hasAttach ? 1 : 0,
        id,
      ]);

      if (updates.labels !== undefined) {
        await conn.execute("DELETE FROM labels WHERE issue_id = ?", [id]);
        for (const label of updates.labels) {
          await conn.execute("INSERT INTO labels (issue_id, label) VALUES (?, ?)", [id, label]);
        }
      }

      let eventType: string;
      if (updates.status === "closed" && current.status !== "closed") {
        eventType = "closed";
      } else if (current.status === "closed" && updates.status && updates.status !== "closed") {
        eventType = "reopened";
      } else if (updates.status && updates.status !== current.status) {
        eventType = "status_changed";
      } else if (updates.claim) {
        eventType = "claimed";
      } else {
        eventType = "updated";
      }

      const changes: Record<string, unknown> = {};
      for (const [col, key] of fieldMap) {
        if (updates[key] !== undefined) changes[col] = updates[key];
      }
      if (updates.labels !== undefined) changes.labels = updates.labels;
      if (updates.due !== undefined) changes.due = updates.due;

      await conn.execute(
        `INSERT INTO events (issue_id, event_type, actor, old_value, new_value, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, eventType, ACTOR, JSON.stringify(current), JSON.stringify(changes), now],
      );

      await conn.commit();

      return {
        data: { id, ...changes, updated_at: now.toISOString() },
        hints: [
          { entity: "issues" as const, id },
          { entity: "stats" as const },
          { entity: "events" as const, id },
        ],
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    }
  });
}

// ─── Issue Close ───────────────────────────────────────

export async function sqlCloseIssue(
  config: Config,
  id: string,
  reason?: string,
): Promise<WriterResult> {
  return queryWithRetry(config, async (conn) => {
    await conn.beginTransaction();
    try {
      const [rows] = await conn.execute("SELECT * FROM issues WHERE id = ?", [id]);
      if ((rows as unknown[]).length === 0) {
        throw notFoundError("Issue", id);
      }
      const current = (rows as Record<string, unknown>[])[0];

      const now = new Date();

      await conn.execute(
        `UPDATE issues SET status = 'closed', closed_at = ?, updated_at = ?,
         close_reason = ? WHERE id = ?`,
        [now, now, reason || null, id],
      );

      const newHash = computeContentHash({
        title: current.title as string,
        description: current.description as string,
        design: current.design as string,
        acceptance_criteria: current.acceptance_criteria as string,
        notes: current.notes as string,
        status: "closed",
        priority: current.priority as number,
        issue_type: current.issue_type as string,
        assignee: current.assignee as string,
        owner: current.owner as string,
        created_by: current.created_by as string,
      });
      await conn.execute("UPDATE issues SET content_hash = ? WHERE id = ?", [newHash, id]);

      await conn.execute(
        `INSERT INTO events (issue_id, event_type, actor, old_value, new_value, created_at)
         VALUES (?, 'closed', ?, ?, ?, ?)`,
        [id, ACTOR, JSON.stringify({ status: current.status }), reason || "", now],
      );

      await conn.commit();

      return {
        data: { id, status: "closed", closed_at: now.toISOString() },
        hints: [
          { entity: "issues" as const, id },
          { entity: "issues" as const },
          { entity: "dependencies" as const },
          { entity: "stats" as const },
          { entity: "events" as const, id },
        ],
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    }
  });
}

// ─── Comment Add ───────────────────────────────────────

export async function sqlAddComment(
  config: Config,
  issueId: string,
  text: string,
): Promise<WriterResult> {
  return queryWithRetry(config, async (conn) => {
    await conn.beginTransaction();
    try {
      const [rows] = await conn.execute("SELECT id FROM issues WHERE id = ?", [issueId]);
      if ((rows as unknown[]).length === 0) {
        throw notFoundError("Issue", issueId);
      }

      const now = new Date();
      const author = ACTOR;

      await conn.execute(
        `INSERT INTO comments (issue_id, author, text, created_at)
         VALUES (?, ?, ?, ?)`,
        [issueId, author, text, now],
      );

      await conn.execute(
        `INSERT INTO events (issue_id, event_type, actor, comment, created_at)
         VALUES (?, 'commented', ?, ?, ?)`,
        [issueId, author, text, now],
      );

      await conn.commit();

      return {
        data: { issue_id: issueId, author, text, created_at: now.toISOString() },
        hints: [
          { entity: "comments" as const, id: issueId },
          { entity: "events" as const, id: issueId },
        ],
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    }
  });
}

// ─── Dependency Add ────────────────────────────────────

export async function sqlAddDependency(
  config: Config,
  issueId: string,
  dependsOnId: string,
): Promise<WriterResult> {
  return queryWithRetry(config, async (conn) => {
    await conn.beginTransaction();
    try {
      const [issueRows] = await conn.execute("SELECT id FROM issues WHERE id IN (?, ?)", [
        issueId,
        dependsOnId,
      ]);
      const foundIds = new Set((issueRows as Array<{ id: string }>).map((r) => r.id));
      if (!foundIds.has(issueId)) throw notFoundError("Issue", issueId);
      if (!foundIds.has(dependsOnId)) throw notFoundError("Issue", dependsOnId);

      await conn.execute(
        `INSERT IGNORE INTO dependencies (issue_id, depends_on_id, type, created_by)
         VALUES (?, ?, 'blocks', ?)`,
        [issueId, dependsOnId, ACTOR],
      );

      const now = new Date();
      await conn.execute(
        `INSERT INTO events (issue_id, event_type, actor, old_value, new_value, created_at)
         VALUES (?, 'dependency_added', ?, '', ?, ?)`,
        [issueId, ACTOR, dependsOnId, now],
      );

      await conn.commit();

      return {
        data: { issue_id: issueId, depends_on_id: dependsOnId, type: "blocks" },
        hints: [
          { entity: "dependencies" as const },
          { entity: "issues" as const, id: issueId },
          { entity: "issues" as const, id: dependsOnId },
          { entity: "events" as const, id: issueId },
        ],
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    }
  });
}

// ─── Dependency Remove ─────────────────────────────────

export async function sqlRemoveDependency(
  config: Config,
  issueId: string,
  dependsOnId: string,
): Promise<WriterResult> {
  return queryWithRetry(config, async (conn) => {
    await conn.beginTransaction();
    try {
      await conn.execute("DELETE FROM dependencies WHERE issue_id = ? AND depends_on_id = ?", [
        issueId,
        dependsOnId,
      ]);

      const now = new Date();
      await conn.execute(
        `INSERT INTO events (issue_id, event_type, actor, old_value, new_value, created_at)
         VALUES (?, 'dependency_removed', ?, ?, '', ?)`,
        [issueId, ACTOR, dependsOnId, now],
      );

      await conn.commit();

      return {
        data: { removed: true, issue_id: issueId, depends_on_id: dependsOnId },
        hints: [
          { entity: "dependencies" as const },
          { entity: "issues" as const, id: issueId },
          { entity: "issues" as const, id: dependsOnId },
          { entity: "events" as const, id: issueId },
        ],
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    }
  });
}
