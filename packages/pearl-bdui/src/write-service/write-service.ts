import type {
  CreateCommentRequest,
  CreateDependencyRequest,
  CreateIssueRequest,
  MutationResponse,
  UpdateIssueRequest,
} from "@pearl/shared";
import type { Config } from "../config.js";
import { logger } from "../logger.js";
import { CommentWriter } from "./comment-writer.js";
import { DependencyWriter } from "./dependency-writer.js";
import { IssueWriter } from "./issue-writer.js";
import { WriteQueue } from "./queue.js";

export class WriteService {
  private queue = new WriteQueue();
  issues: IssueWriter;
  dependencies: DependencyWriter;
  comments: CommentWriter;
  private onAfterWrite?: () => Promise<void>;

  constructor(config: Config, onAfterWrite?: () => Promise<void>) {
    this.issues = new IssueWriter(config);
    this.dependencies = new DependencyWriter(config);
    this.comments = new CommentWriter(config);
    this.onAfterWrite = onAfterWrite;
  }

  updateConfig(newConfig: Config): void {
    this.issues = new IssueWriter(newConfig);
    this.dependencies = new DependencyWriter(newConfig);
    this.comments = new CommentWriter(newConfig);
  }

  setAfterWriteHook(hook: (() => Promise<void>) | undefined): void {
    this.onAfterWrite = hook;
  }

  async createIssue(req: CreateIssueRequest): Promise<MutationResponse> {
    return this.queue.enqueue(async () => {
      const result = await this.issues.create(req);
      await this.syncAfterWrite();
      return {
        success: true,
        data: result.data,
        invalidationHints: result.hints,
      };
    });
  }

  async updateIssue(id: string, req: UpdateIssueRequest): Promise<MutationResponse> {
    return this.queue.enqueue(async () => {
      const result = await this.issues.update(id, req);
      await this.syncAfterWrite();
      return {
        success: true,
        data: result.data,
        invalidationHints: result.hints,
      };
    });
  }

  async closeIssue(id: string, reason?: string): Promise<MutationResponse> {
    return this.queue.enqueue(async () => {
      const result = await this.issues.close(id, reason);
      await this.syncAfterWrite();
      return {
        success: true,
        data: result.data,
        invalidationHints: result.hints,
      };
    });
  }

  async deleteIssue(id: string): Promise<MutationResponse> {
    return this.queue.enqueue(async () => {
      const result = await this.issues.delete(id);
      await this.syncAfterWrite();
      return {
        success: true,
        data: result.data,
        invalidationHints: result.hints,
      };
    });
  }

  async addComment(issueId: string, req: CreateCommentRequest): Promise<MutationResponse> {
    return this.queue.enqueue(async () => {
      const result = await this.comments.add(issueId, req);
      await this.syncAfterWrite();
      return {
        success: true,
        data: result.data,
        invalidationHints: result.hints,
      };
    });
  }

  async addDependency(req: CreateDependencyRequest): Promise<MutationResponse> {
    return this.queue.enqueue(async () => {
      const result = await this.dependencies.add(req);
      await this.syncAfterWrite();
      return {
        success: true,
        data: result.data,
        invalidationHints: result.hints,
      };
    });
  }

  async removeDependency(issueId: string, dependsOnId: string): Promise<MutationResponse> {
    return this.queue.enqueue(async () => {
      const result = await this.dependencies.remove(issueId, dependsOnId);
      await this.syncAfterWrite();
      return {
        success: true,
        data: result.data,
        invalidationHints: result.hints,
      };
    });
  }

  private async syncAfterWrite(): Promise<void> {
    if (!this.onAfterWrite) return;
    try {
      await this.onAfterWrite();
    } catch (err) {
      logger.error({ err }, "Post-write replica sync failed");
    }
  }

  get pendingWrites(): number {
    return this.queue.pending;
  }
}
