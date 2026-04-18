import type { CreateIssueRequest, InvalidationHint, UpdateIssueRequest } from "@pearl/shared";
import type { Config } from "../config.js";
import { queryWithRetry } from "../dolt/pool.js";
import { validationError } from "../errors.js";
import { runBd } from "./bd-runner.js";

export class IssueWriter {
  constructor(private config: Config) {}

  async create(req: CreateIssueRequest): Promise<{ stdout: string; hints: InvalidationHint[] }> {
    if (!req.title?.trim()) {
      throw validationError("Title is required");
    }

    // Build array-form args — NEVER string interpolation
    const args: string[] = ["create", req.title];

    if (req.description) {
      args.push("--description", req.description);
    }
    if (req.issue_type) {
      args.push("--type", req.issue_type);
    }
    if (req.priority !== undefined) {
      args.push("--priority", `P${req.priority}`);
    }
    if (req.assignee) {
      args.push("--assignee", req.assignee);
    }
    if (req.labels?.length) {
      args.push("--labels", req.labels.join(","));
    }
    if (req.due) {
      args.push("--due", req.due);
    }
    if (req.parent) {
      args.push("--parent", req.parent);
    }
    if (req.estimated_minutes !== undefined) {
      args.push("--estimate", String(req.estimated_minutes));
    }

    const result = await runBd(this.config, args);

    return {
      stdout: result.stdout,
      hints: [{ entity: "issues" }, { entity: "stats" }, { entity: "events" }],
    };
  }

  async update(
    id: string,
    req: UpdateIssueRequest,
  ): Promise<{ stdout: string; hints: InvalidationHint[] }> {
    const args: string[] = ["update", id];

    if (req.claim) {
      args.push("--claim");
    }
    if (req.title) {
      args.push("--title", req.title);
    }
    if (req.description !== undefined) {
      args.push("--description", req.description);
    }
    if (req.status) {
      args.push("--status", req.status);
    }
    if (req.issue_type) {
      args.push("--type", req.issue_type);
    }
    if (req.priority !== undefined) {
      args.push("--priority", `P${req.priority}`);
    }
    if (req.assignee !== undefined) {
      args.push("--assignee", req.assignee ?? "");
    }
    if (req.labels) {
      args.push("--set-labels", req.labels.join(","));
    }
    if (req.due !== undefined) {
      args.push("--due", req.due ?? "");
    }
    if (req.notes !== undefined) {
      args.push("--notes", req.notes);
    }
    if (req.design !== undefined) {
      args.push("--design", req.design);
    }
    if (req.acceptance_criteria !== undefined) {
      args.push("--acceptance", req.acceptance_criteria);
    }
    if (req.pinned !== undefined) {
      throw validationError("Pinned flag is not yet supported for updates");
    }
    if (req.estimated_minutes !== undefined) {
      args.push("--estimate", String(req.estimated_minutes));
    }

    const result = await runBd(this.config, args);

    return {
      stdout: result.stdout,
      hints: [{ entity: "issues", id }, { entity: "stats" }, { entity: "events", id }],
    };
  }

  async close(id: string, reason?: string): Promise<{ stdout: string; hints: InvalidationHint[] }> {
    const args: string[] = ["close", id];
    if (reason) {
      args.push("--reason", reason);
    }

    const result = await runBd(this.config, args);

    return {
      stdout: result.stdout,
      hints: [
        { entity: "issues", id },
        { entity: "issues" },
        { entity: "dependencies" },
        { entity: "stats" },
        { entity: "events", id },
      ],
    };
  }

  async delete(id: string): Promise<{ stdout: string; hints: InvalidationHint[] }> {
    const hints: InvalidationHint[] = [
      { entity: "issues", id },
      { entity: "issues" },
      { entity: "dependencies" },
      { entity: "stats" },
      { entity: "events", id },
    ];

    if (this.config.doltMode === "server") {
      // Direct SQL — FK CASCADE handles comments, labels, events, dependencies
      await queryWithRetry(this.config, async (conn) => {
        await conn.execute("DELETE FROM issues WHERE id = ?", [id]);
      });
      return { stdout: JSON.stringify({ deleted: id }), hints };
    }

    // Embedded mode: writes must go to the primary via CLI (pool targets the replica)
    const result = await runBd(this.config, ["delete", id, "--force"]);
    return { stdout: result.stdout, hints };
  }
}
