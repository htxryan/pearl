import type { CreateDependencyRequest, InvalidationHint } from "@pearl/shared";
import type { Config } from "../config.js";
import { validationError } from "../errors.js";
import { runBd } from "./bd-runner.js";

export class DependencyWriter {
  constructor(private config: Config) {}

  async add(req: CreateDependencyRequest): Promise<{ stdout: string; hints: InvalidationHint[] }> {
    if (!req.issue_id || !req.depends_on_id) {
      throw validationError("Both issue_id and depends_on_id are required");
    }

    // bd dep add <blocked-id> <blocker-id>
    // "issue_id depends on depends_on_id" means depends_on_id blocks issue_id
    const args: string[] = ["dep", "add", req.issue_id, req.depends_on_id];

    const result = await runBd(this.config, args);

    return {
      stdout: result.stdout,
      hints: [
        { entity: "dependencies" },
        { entity: "issues", id: req.issue_id },
        { entity: "issues", id: req.depends_on_id },
        { entity: "events", id: req.issue_id },
      ],
    };
  }

  async remove(
    issueId: string,
    dependsOnId: string,
  ): Promise<{ stdout: string; hints: InvalidationHint[] }> {
    if (!issueId || !dependsOnId) {
      throw validationError("Both issueId and dependsOnId are required");
    }

    const args: string[] = ["dep", "remove", issueId, dependsOnId];

    const result = await runBd(this.config, args);

    return {
      stdout: result.stdout,
      hints: [
        { entity: "dependencies" },
        { entity: "issues", id: issueId },
        { entity: "issues", id: dependsOnId },
        { entity: "events", id: issueId },
      ],
    };
  }
}
