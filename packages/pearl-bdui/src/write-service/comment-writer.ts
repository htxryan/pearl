import type { CreateCommentRequest } from "@pearl/shared";
import type { Config } from "../config.js";
import { validationError } from "../errors.js";
import { logger } from "../logger.js";
import { runBd } from "./bd-runner.js";
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
        { entity: "comments", id: issueId },
        { entity: "events", id: issueId },
      ],
    };
  }
}
