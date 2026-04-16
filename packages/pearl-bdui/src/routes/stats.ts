import type { StatsResponse } from "@pearl/shared";
import type { FastifyInstance } from "fastify";
import type { RowDataPacket } from "mysql2";
import type { Config } from "../config.js";
import { queryWithRetry } from "../dolt/pool.js";

export function registerStatsRoutes(app: FastifyInstance, getConfig: () => Config): void {
  // GET /api/stats
  app.get("/api/stats", async (_request, reply) => {
    const stats = await queryWithRetry(getConfig(), async (conn) => {
      // Total count
      const [[totalRow]] = await conn.query<RowDataPacket[]>(
        `SELECT COUNT(*) as total FROM issues WHERE (ephemeral = 0 OR ephemeral IS NULL)`,
      );

      // By status
      const [statusRows] = await conn.query<RowDataPacket[]>(
        `SELECT status, COUNT(*) as count FROM issues
         WHERE (ephemeral = 0 OR ephemeral IS NULL)
         GROUP BY status`,
      );

      // By priority
      const [priorityRows] = await conn.query<RowDataPacket[]>(
        `SELECT priority, COUNT(*) as count FROM issues
         WHERE (ephemeral = 0 OR ephemeral IS NULL)
         GROUP BY priority`,
      );

      // By type
      const [typeRows] = await conn.query<RowDataPacket[]>(
        `SELECT issue_type, COUNT(*) as count FROM issues
         WHERE (ephemeral = 0 OR ephemeral IS NULL)
         GROUP BY issue_type`,
      );

      // Recently updated (last 24h)
      const [[recentRow]] = await conn.query<RowDataPacket[]>(
        `SELECT COUNT(*) as count FROM issues
         WHERE (ephemeral = 0 OR ephemeral IS NULL)
         AND updated_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
      );

      const byStatus: Record<string, number> = {};
      for (const row of statusRows) {
        byStatus[row.status] = row.count;
      }

      const byPriority: Record<string, number> = {};
      for (const row of priorityRows) {
        byPriority[`P${row.priority}`] = row.count;
      }

      const byType: Record<string, number> = {};
      for (const row of typeRows) {
        byType[row.issue_type] = row.count;
      }

      return {
        total: totalRow.total,
        by_status: byStatus,
        by_priority: byPriority,
        by_type: byType,
        recently_updated: recentRow.count,
      } satisfies StatsResponse;
    });

    return reply.send(stats);
  });
}
