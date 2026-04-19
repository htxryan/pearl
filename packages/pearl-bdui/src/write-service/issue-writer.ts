import type { CreateIssueRequest, UpdateIssueRequest } from "@pearl/shared";
import type { Config } from "../config.js";
import { queryWithRetry } from "../dolt/pool.js";
import { validationError } from "../errors.js";
import { logger } from "../logger.js";
import { runBd } from "./bd-runner.js";
import { sqlCloseIssue, sqlCreateIssue, sqlUpdateIssue, type WriterResult } from "./sql-writer.js";

export function parseCliOutput(stdout: string): unknown {
  try {
    return JSON.parse(stdout);
  } catch {
    logger.warn({ output: stdout.slice(0, 200) }, "bd returned non-JSON output");
    return { raw: stdout };
  }
}

export class IssueWriter {
  constructor(private config: Config) {}

  async create(req: CreateIssueRequest): Promise<WriterResult> {
    if (!req.title?.trim()) {
      throw validationError("Title is required");
    }

    if (this.config.doltMode === "server") {
      return sqlCreateIssue(this.config, req);
    }

    const args: string[] = ["create", req.title];
    if (req.description) args.push("--description", req.description);
    if (req.issue_type) args.push("--type", req.issue_type);
    if (req.priority !== undefined) args.push("--priority", `P${req.priority}`);
    if (req.assignee) args.push("--assignee", req.assignee);
    if (req.labels?.length) args.push("--labels", req.labels.join(","));
    if (req.due) args.push("--due", req.due);
    if (req.parent) args.push("--parent", req.parent);
    if (req.estimated_minutes !== undefined) args.push("--estimate", String(req.estimated_minutes));

    const result = await runBd(this.config, args);
    return {
      data: parseCliOutput(result.stdout),
      hints: [{ entity: "issues" }, { entity: "stats" }, { entity: "events" }],
    };
  }

  async update(id: string, req: UpdateIssueRequest): Promise<WriterResult> {
    if (this.config.doltMode === "server") {
      return sqlUpdateIssue(this.config, id, req);
    }

    const args: string[] = ["update", id];
    if (req.claim) args.push("--claim");
    if (req.title) args.push("--title", req.title);
    if (req.description !== undefined) args.push("--description", req.description);
    if (req.status) args.push("--status", req.status);
    if (req.issue_type) args.push("--type", req.issue_type);
    if (req.priority !== undefined) args.push("--priority", `P${req.priority}`);
    if (req.assignee !== undefined) args.push("--assignee", req.assignee ?? "");
    if (req.labels) args.push("--set-labels", req.labels.join(","));
    if (req.due !== undefined) args.push("--due", req.due ?? "");
    if (req.notes !== undefined) args.push("--notes", req.notes);
    if (req.design !== undefined) args.push("--design", req.design);
    if (req.acceptance_criteria !== undefined) args.push("--acceptance", req.acceptance_criteria);
    if (req.pinned !== undefined)
      throw validationError("Pinned flag is not yet supported for updates");
    if (req.estimated_minutes !== undefined) args.push("--estimate", String(req.estimated_minutes));

    const result = await runBd(this.config, args);
    return {
      data: parseCliOutput(result.stdout),
      hints: [{ entity: "issues", id }, { entity: "stats" }, { entity: "events", id }],
    };
  }

  async close(id: string, reason?: string): Promise<WriterResult> {
    if (this.config.doltMode === "server") {
      return sqlCloseIssue(this.config, id, reason);
    }

    const args: string[] = ["close", id];
    if (reason) args.push("--reason", reason);

    const result = await runBd(this.config, args);
    return {
      data: parseCliOutput(result.stdout),
      hints: [
        { entity: "issues", id },
        { entity: "issues" },
        { entity: "dependencies" },
        { entity: "stats" },
        { entity: "events", id },
      ],
    };
  }

  async delete(id: string): Promise<WriterResult> {
    const hints = [
      { entity: "issues" as const, id },
      { entity: "issues" as const },
      { entity: "dependencies" as const },
      { entity: "stats" as const },
      { entity: "events" as const, id },
    ];

    if (this.config.doltMode === "server") {
      await queryWithRetry(this.config, async (conn) => {
        await conn.beginTransaction();
        try {
          await conn.execute("DELETE FROM dependencies WHERE depends_on_id = ?", [id]);
          await conn.execute("DELETE FROM issues WHERE id = ?", [id]);
          await conn.commit();
        } catch (err) {
          await conn.rollback();
          throw err;
        }
      });
      return { data: { deleted: id }, hints };
    }

    const result = await runBd(this.config, ["delete", id, "--force"]);
    return { data: parseCliOutput(result.stdout), hints };
  }
}
