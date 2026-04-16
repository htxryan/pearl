import type { LabelColor } from "@pearl/shared";
import { LABEL_COLORS } from "@pearl/shared";
import type { FastifyInstance } from "fastify";
import type { RowDataPacket } from "mysql2";
import type { Pool } from "mysql2/promise";
import type { Config } from "../config.js";
import { queryWithRetry } from "../dolt/pool.js";
import { validationError } from "../errors.js";

const LABEL_COLOR_SET = new Set<string>(LABEL_COLORS);

export const LABEL_DEFINITIONS_DDL = `
  CREATE TABLE IF NOT EXISTS label_definitions (
    name VARCHAR(100) NOT NULL,
    color VARCHAR(32) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (name)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_bin
`;

const upsertLabelSchema = {
  body: {
    type: "object",
    required: ["name", "color"],
    properties: {
      name: { type: "string", minLength: 1, maxLength: 100 },
      color: { type: "string", enum: [...LABEL_COLORS] },
    },
    additionalProperties: false,
  },
} as const;

/**
 * Ensure the label_definitions table exists.
 * Called at startup (via queryWithRetry) and after replica sync (via direct pool).
 * When called during sync, pass the pool directly to bypass awaitSync() deadlock.
 */
export async function ensureLabelDefinitionsTable(
  getConfig: () => Config,
  directPool?: Pool,
): Promise<void> {
  try {
    if (directPool) {
      const conn = await directPool.getConnection();
      try {
        await conn.query(LABEL_DEFINITIONS_DDL);
      } finally {
        conn.release();
      }
    } else {
      await queryWithRetry(getConfig(), async (conn) => {
        await conn.query(LABEL_DEFINITIONS_DDL);
      });
    }
  } catch {
    // Table creation may fail in setup mode (no DB yet) — that's OK,
    // it will be created when the DB is initialized.
  }
}

export function registerLabelRoutes(app: FastifyInstance, getConfig: () => Config): void {
  // Ensure table exists before routes handle requests
  app.addHook("onReady", async () => {
    await ensureLabelDefinitionsTable(getConfig);
  });

  // GET /api/labels — list all known labels with colors and usage counts
  app.get("/api/labels", async (_request, reply) => {
    try {
      const labels = await queryWithRetry(getConfig(), async (conn) => {
        const [rows] = await conn.query<RowDataPacket[]>(`
          SELECT
            COALESCE(ld.name, l.label) AS name,
            ld.color,
            COUNT(l.issue_id) AS count
          FROM labels l
          LEFT JOIN label_definitions ld ON ld.name = l.label
          GROUP BY COALESCE(ld.name, l.label), ld.color
          UNION ALL
          SELECT ld2.name, ld2.color, 0 AS count
          FROM label_definitions ld2
          LEFT JOIN labels l3 ON l3.label = ld2.name
          WHERE l3.label IS NULL
          ORDER BY count DESC, name ASC
        `);
        return rows;
      });

      return reply.send(labels);
    } catch (err: unknown) {
      // The label_definitions table may not exist yet (e.g. after a replica sync
      // overwrites the replica before the table is created). Return labels from
      // the labels table only, without color info, rather than failing with a 500.
      const errno = (err as { errno?: number }).errno;
      if (errno === 1146) {
        const labels = await queryWithRetry(getConfig(), async (conn) => {
          const [rows] = await conn.query<RowDataPacket[]>(`
            SELECT label AS name, NULL AS color, COUNT(issue_id) AS count
            FROM labels
            GROUP BY label
            ORDER BY count DESC, name ASC
          `);
          return rows;
        });
        return reply.send(labels);
      }
      throw err;
    }
  });

  // POST /api/labels — create or update a label definition
  app.post("/api/labels", { schema: upsertLabelSchema }, async (request, reply) => {
    const body = request.body as { name: string; color: LabelColor };
    const name = body.name.trim();
    const color = body.color;

    if (!name) {
      throw validationError("Label name cannot be empty");
    }
    if (!LABEL_COLOR_SET.has(color)) {
      throw validationError(`Invalid label color: ${color}`);
    }

    await queryWithRetry(getConfig(), async (conn) => {
      await conn.query(
        `INSERT INTO label_definitions (name, color) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE color = VALUES(color)`,
        [name, color],
      );
    });

    return reply.code(200).send({
      success: true,
      data: { name, color },
      invalidationHints: [{ entity: "labels" as const }],
    });
  });
}

/**
 * Fetch label color map for a set of label names.
 * Used by issue routes to enrich issue responses with label colors.
 */
export async function fetchLabelColors(
  getConfig: () => Config,
  labelNames: string[],
): Promise<Record<string, LabelColor>> {
  if (labelNames.length === 0) return {};

  try {
    const rows = (await queryWithRetry(getConfig(), async (conn) => {
      const [result] = await conn.query<RowDataPacket[]>(
        `SELECT name, color FROM label_definitions WHERE name IN (${labelNames.map(() => "?").join(",")})`,
        labelNames,
      );
      return result;
    })) as RowDataPacket[];

    const colorMap: Record<string, LabelColor> = {};
    for (const row of rows) {
      colorMap[row.name] = row.color as LabelColor;
    }
    return colorMap;
  } catch (err: unknown) {
    // The label_definitions table may not exist yet (e.g. after a replica sync
    // overwrites the replica with a primary that hasn't had the table created).
    // Return empty colors gracefully rather than failing the entire request.
    const errno = (err as { errno?: number }).errno;
    if (errno === 1146) return {}; // ER_NO_SUCH_TABLE
    throw err;
  }
}
