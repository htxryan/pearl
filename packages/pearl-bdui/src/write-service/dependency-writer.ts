import type { CreateDependencyRequest } from "@pearl/shared";
import type { Config } from "../config.js";
import { validationError } from "../errors.js";
import { logger } from "../logger.js";
import { runBd } from "./bd-runner.js";
import { sqlAddDependency, sqlRemoveDependency, type WriterResult } from "./sql-writer.js";

export class DependencyWriter {
  constructor(private config: Config) {}

  async add(req: CreateDependencyRequest): Promise<WriterResult> {
    if (!req.issue_id || !req.depends_on_id) {
      throw validationError("Both issue_id and depends_on_id are required");
    }

    if (this.config.doltMode === "server") {
      return sqlAddDependency(this.config, req.issue_id, req.depends_on_id);
    }

    const args: string[] = ["dep", "add", req.issue_id, req.depends_on_id];
    const result = await runBd(this.config, args);

    let data: unknown;
    try {
      data = JSON.parse(result.stdout);
    } catch {
      logger.warn({ output: result.stdout.slice(0, 200) }, "bd returned non-JSON output");
      data = { raw: result.stdout };
    }

    return {
      data,
      hints: [
        { entity: "dependencies" },
        { entity: "issues", id: req.issue_id },
        { entity: "issues", id: req.depends_on_id },
        { entity: "events", id: req.issue_id },
      ],
    };
  }

  async remove(issueId: string, dependsOnId: string): Promise<WriterResult> {
    if (!issueId || !dependsOnId) {
      throw validationError("Both issueId and dependsOnId are required");
    }

    if (this.config.doltMode === "server") {
      return sqlRemoveDependency(this.config, issueId, dependsOnId);
    }

    const args: string[] = ["dep", "remove", issueId, dependsOnId];
    const result = await runBd(this.config, args);

    let data: unknown;
    try {
      data = JSON.parse(result.stdout);
    } catch {
      logger.warn({ output: result.stdout.slice(0, 200) }, "bd returned non-JSON output");
      data = { raw: result.stdout };
    }

    return {
      data,
      hints: [
        { entity: "dependencies" },
        { entity: "issues", id: issueId },
        { entity: "issues", id: dependsOnId },
        { entity: "events", id: issueId },
      ],
    };
  }
}
