import type { CreateCommentRequest } from "@pearl/shared";
import type { Config } from "../config.js";
import { validationError } from "../errors.js";
import { runBd } from "./bd-runner.js";
import { parseCliOutput } from "./issue-writer.js";
import { sqlAddComment, type WriterResult } from "./sql-writer.js";

export class CommentWriter {
  constructor(private config: Config) {}

  async add(issueId: string, req: CreateCommentRequest): Promise<WriterResult> {
    if (!req.text?.trim()) {
      throw validationError("Comment text is required");
    }

    if (this.config.doltMode === "server") {
      return sqlAddComment(this.config, issueId, req.text);
    }

    const args: string[] = ["comment", issueId, req.text];
    const result = await runBd(this.config, args);

    return {
      data: parseCliOutput(result.stdout),
      hints: [
        { entity: "comments", id: issueId },
        { entity: "events", id: issueId },
      ],
    };
  }
}
