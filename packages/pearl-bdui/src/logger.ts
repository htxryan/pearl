import pino from "pino";

/**
 * Standalone pino logger for modules that run outside the Fastify lifecycle
 * (e.g. DoltServerManager, pool helpers, CLI runner, early startup).
 *
 * Uses the same transport and formatting as the Fastify app logger configured
 * in server.ts so all log output is visually consistent.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  ...(process.env.NODE_ENV === "production"
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { translateTime: "HH:mm:ss", ignore: "pid,hostname" },
        },
      }),
});
