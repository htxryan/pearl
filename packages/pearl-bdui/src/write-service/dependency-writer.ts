import type { CreateDependencyRequest } from "@pearl/shared";
import type { Config } from "../config.js";
import { validationError } from "../errors.js";
import { runBd } from "./bd-runner.js";
import { parseCliOutput } from "./issue-writer.js";
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

    return {
      data: parseCliOutput(result.stdout),
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

    return {
      data: parseCliOutput(result.stdout),
      hints: [
        { entity: "dependencies" },
        { entity: "issues", id: issueId },
        { entity: "issues", id: dependsOnId },
        { entity: "events", id: issueId },
      ],
    };
  }
}
