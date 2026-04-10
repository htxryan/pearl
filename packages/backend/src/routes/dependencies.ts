import type { FastifyInstance } from "fastify";
import type { CreateDependencyRequest } from "@beads-gui/shared";
import { queryWithRetry } from "../dolt/pool.js";
import type { Config } from "../config.js";
import type { WriteService } from "../write-service/write-service.js";

export function registerDependencyRoutes(
  app: FastifyInstance,
  config: Config,
  writeService: WriteService
): void {
  // GET /api/dependencies — full DAG
  app.get("/api/dependencies", async (_request, reply) => {
    const dependencies = await queryWithRetry(config, async (conn) => {
      const [rows] = await conn.query(
        `SELECT issue_id, depends_on_id, type, created_at, created_by
         FROM dependencies
         ORDER BY created_at DESC`
      );
      return rows;
    });

    return reply.send(dependencies);
  });

  // POST /api/dependencies — add dependency
  app.post("/api/dependencies", async (request, reply) => {
    const body = request.body as CreateDependencyRequest;
    const result = await writeService.addDependency(body);
    return reply.code(201).send(result);
  });

  // DELETE /api/dependencies/:issueId/:dependsOnId — remove dependency
  app.delete(
    "/api/dependencies/:issueId/:dependsOnId",
    async (request, reply) => {
      const { issueId, dependsOnId } = request.params as {
        issueId: string;
        dependsOnId: string;
      };
      const result = await writeService.removeDependency(issueId, dependsOnId);
      return reply.send(result);
    }
  );
}
