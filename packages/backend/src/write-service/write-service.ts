import type {
  CreateIssueRequest,
  UpdateIssueRequest,
  CreateCommentRequest,
  CreateDependencyRequest,
  MutationResponse,
} from "@beads-gui/shared";
import type { Config } from "../config.js";
import { WriteQueue } from "./queue.js";
import { IssueWriter } from "./issue-writer.js";
import { DependencyWriter } from "./dependency-writer.js";
import { CommentWriter } from "./comment-writer.js";

/**
 * Facade for all write operations.
 * All writes are serialized through a single queue (STPA H2).
 */
export class WriteService {
  private queue = new WriteQueue();
  readonly issues: IssueWriter;
  readonly dependencies: DependencyWriter;
  readonly comments: CommentWriter;

  constructor(config: Config) {
    this.issues = new IssueWriter(config);
    this.dependencies = new DependencyWriter(config);
    this.comments = new CommentWriter(config);
  }

  async createIssue(req: CreateIssueRequest): Promise<MutationResponse> {
    return this.queue.enqueue(async () => {
      const result = await this.issues.create(req);
      return {
        success: true,
        data: tryParseJson(result.stdout),
        invalidationHints: result.hints,
      };
    });
  }

  async updateIssue(
    id: string,
    req: UpdateIssueRequest
  ): Promise<MutationResponse> {
    return this.queue.enqueue(async () => {
      const result = await this.issues.update(id, req);
      return {
        success: true,
        data: tryParseJson(result.stdout),
        invalidationHints: result.hints,
      };
    });
  }

  async closeIssue(id: string, reason?: string): Promise<MutationResponse> {
    return this.queue.enqueue(async () => {
      const result = await this.issues.close(id, reason);
      return {
        success: true,
        data: tryParseJson(result.stdout),
        invalidationHints: result.hints,
      };
    });
  }

  async addComment(
    issueId: string,
    req: CreateCommentRequest
  ): Promise<MutationResponse> {
    return this.queue.enqueue(async () => {
      const result = await this.comments.add(issueId, req);
      return {
        success: true,
        data: tryParseJson(result.stdout),
        invalidationHints: result.hints,
      };
    });
  }

  async addDependency(req: CreateDependencyRequest): Promise<MutationResponse> {
    return this.queue.enqueue(async () => {
      const result = await this.dependencies.add(req);
      return {
        success: true,
        data: tryParseJson(result.stdout),
        invalidationHints: result.hints,
      };
    });
  }

  async removeDependency(
    issueId: string,
    dependsOnId: string
  ): Promise<MutationResponse> {
    return this.queue.enqueue(async () => {
      const result = await this.dependencies.remove(issueId, dependsOnId);
      return {
        success: true,
        data: tryParseJson(result.stdout),
        invalidationHints: result.hints,
      };
    });
  }

  get pendingWrites(): number {
    return this.queue.pending;
  }
}

function tryParseJson(str: string): unknown {
  try {
    return JSON.parse(str);
  } catch {
    console.warn("[write-service] bd returned non-JSON output:", str.slice(0, 200));
    return { raw: str };
  }
}
