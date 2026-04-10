import type { FastifyInstance } from "fastify";
import type { HealthResponse } from "@beads-gui/shared";
import type { DoltServerManager } from "../dolt/server-manager.js";

const VERSION = "0.1.0";

export function registerHealthRoutes(
  app: FastifyInstance,
  doltManager: DoltServerManager
): void {
  // GET /api/health
  app.get("/api/health", async (_request, reply) => {
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
