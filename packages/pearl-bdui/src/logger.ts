import pino from "pino";

/**
 * Standalone pino logger for modules that run outside the Fastify lifecycle
 * (e.g. DoltServerManager, pool helpers, CLI runner, early startup).
 *
 * Uses the same transport and formatting as the Fastify app logger configured
 * in server.ts so all log output is visually consistent.
 */
export const logger = pino({
  level: "info",
  transport: {
    target: "pino-pretty",
    options: { translateTime: "HH:MM:ss", ignore: "pid,hostname" },
  },
});
