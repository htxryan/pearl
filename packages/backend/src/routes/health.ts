import type { FastifyInstance } from "fastify";
import type { HealthResponse } from "@beads-gui/shared";
import type { DoltServerManager } from "../dolt/server-manager.js";
import type { Config } from "../config.js";
import { getPool } from "../dolt/pool.js";

const VERSION = "0.1.0";

export function registerHealthRoutes(
  app: FastifyInstance,
  getDoltManager: () => DoltServerManager | null,
  getConfig: () => Config
): void {
  // GET /api/health
  app.get("/api/health", async (_request, reply) => {
    const config = getConfig();
    const doltManager = getDoltManager();

    if (config.needsSetup) {
      const response: HealthResponse = {
        status: "degraded",
        dolt_server: "stopped",
        uptime_seconds: 0,
        version: VERSION,
      };
      return reply.code(200).send(response);
    }

    if (config.doltMode === "server") {
      // Server mode: check pool connectivity to the external Dolt server
      const health = await serverModeHealth();
      const statusCode = health.status === "healthy" ? 200 : 503;
      return reply.code(statusCode).send(health);
    }

    if (!doltManager) {
      const response: HealthResponse = {
        status: "unhealthy",
        dolt_server: "stopped",
        uptime_seconds: 0,
        version: VERSION,
      };
      return reply.code(503).send(response);
    }

    // Embedded mode: check DoltServerManager state
    const doltState = doltManager.getState();

    let status: HealthResponse["status"];
    if (doltState === "running") {
      status = "healthy";
    } else if (doltState === "starting") {
      status = "degraded";
    } else {
      status = "unhealthy";
    }

    const response: HealthResponse = {
      status,
      dolt_server: doltState,
      uptime_seconds: doltManager.getUptime(),
      version: VERSION,
    };

    const statusCode = status === "healthy" ? 200 : status === "degraded" ? 200 : 503;
    return reply.code(statusCode).send(response);
  });
}

async function serverModeHealth(): Promise<HealthResponse> {
  try {
    const pool = getPool();
    await pool.query("SELECT 1");
    return {
      status: "healthy",
      dolt_server: "running",
      uptime_seconds: 0,
      version: VERSION,
    };
  } catch {
    return {
      status: "unhealthy",
      dolt_server: "error",
      uptime_seconds: 0,
      version: VERSION,
    };
  }
}
