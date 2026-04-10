import type { CreateCommentRequest, InvalidationHint } from "@beads-gui/shared";
import type { Config } from "../config.js";
import { runBd } from "./bd-runner.js";
import { validationError } from "../errors.js";

export class CommentWriter {
  constructor(private config: Config) {}

  async add(
    issueId: string,
    req: CreateCommentRequest
  ): Promise<{ stdout: string; hints: InvalidationHint[] }> {
    if (!req.text?.trim()) {
      throw validationError("Comment text is required");
    }

    // bd comment <id> "text"
    const args: string[] = ["comment", issueId, req.text];

    const result = await runBd(this.config, args);

    return {
      stdout: result.stdout,
      hints: [
        { entity: "comments", id: issueId },
        { entity: "events", id: issueId },
      ],
    };
  }
}
