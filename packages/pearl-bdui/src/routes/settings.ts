import { dirname } from "node:path";
import type { Settings } from "@pearl/shared";
import type { FastifyInstance } from "fastify";
import { findBeadsDir } from "../config.js";
import { validationError } from "../errors.js";
import { loadSettings, type SettingsLogger, saveSettings } from "../settings-loader.js";

const updateSettingsSchema = {
  body: {
    type: "object",
    required: ["version", "attachments"],
    properties: {
      version: { type: "number", const: 1 },
      attachments: {
        type: "object",
        required: ["storageMode", "local", "encoding"],
        properties: {
          storageMode: { type: "string", enum: ["inline", "local"] },
          local: {
            type: "object",
            required: ["scope", "projectPathOverride", "userPathOverride"],
            properties: {
              scope: { type: "string", enum: ["project", "user"] },
              projectPathOverride: { type: ["string", "null"], maxLength: 1024 },
              userPathOverride: { type: ["string", "null"], maxLength: 1024 },
            },
            additionalProperties: false,
          },
          encoding: {
            type: "object",
            required: ["format", "maxBytes", "maxDimension", "stripExif"],
            properties: {
              format: { type: "string", const: "webp" },
              maxBytes: { type: "number", exclusiveMinimum: 0, maximum: 52_428_800 },
              maxDimension: { type: "number", exclusiveMinimum: 0, maximum: 16_384 },
              stripExif: { type: "boolean", const: true },
            },
            additionalProperties: false,
          },
        },
        additionalProperties: false,
      },
    },
    additionalProperties: false,
  },
} as const;

export type SettingsChangedListener = (settings: Settings) => void;

export class SettingsEventBus {
  private listeners = new Set<SettingsChangedListener>();

  on(listener: SettingsChangedListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(settings: Settings): void {
    for (const listener of this.listeners) {
      listener(settings);
    }
  }
}

export function registerSettingsRoutes(app: FastifyInstance, eventBus: SettingsEventBus): void {
  const beadsDir = findBeadsDir(process.cwd());
  const projectRoot = beadsDir ? dirname(beadsDir) : process.cwd();

  const logger: SettingsLogger = {
    warn(msg: string) {
      app.log.warn(msg);
    },
  };

  app.get("/api/settings", async (_request, reply) => {
    const settings = await loadSettings(projectRoot, logger);
    return reply.send(settings);
  });

  app.put("/api/settings", { schema: updateSettingsSchema }, async (request, reply) => {
    const body = request.body as Settings;

    if (body.attachments.encoding.stripExif !== true) {
      throw validationError("stripExif must be true (mandatory invariant)");
    }

    for (const field of ["projectPathOverride", "userPathOverride"] as const) {
      const value = body.attachments.local[field];
      if (typeof value === "string") {
        if (value.length > 1024) {
          throw validationError(`${field} exceeds maximum length of 1024 characters`);
        }
        if (value.split(/[/\\]/).includes("..")) {
          throw validationError(`${field} must not contain path traversal segments`);
        }
      }
    }

    await saveSettings(projectRoot, body);
    eventBus.emit(body);

    return reply.code(200).send({
      success: true,
      data: body,
      invalidationHints: [{ entity: "settings" as const }],
    });
  });
}
