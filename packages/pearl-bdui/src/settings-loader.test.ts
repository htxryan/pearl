import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { DEFAULT_SETTINGS } from "@pearl/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadSettings,
  loadSettingsSync,
  saveSettings,
  settingsFilePath,
} from "./settings-loader.js";

describe("settings-loader", () => {
  let tmpDir: string;
  let mockLogger: { warn: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    tmpDir = resolve(
      tmpdir(),
      `pearl-settings-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(tmpDir, { recursive: true });
    mockLogger = { warn: vi.fn() };
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("settingsFilePath", () => {
    it("returns .pearl/settings.json under project root", () => {
      expect(settingsFilePath("/my/project")).toBe(
        resolve("/my/project", ".pearl", "settings.json"),
      );
    });
  });

  describe("loadSettingsSync", () => {
    it("returns defaults when file does not exist", () => {
      const result = loadSettingsSync(tmpDir, mockLogger);
      expect(result).toEqual(DEFAULT_SETTINGS);
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("not found"));
    });

    it("returns defaults when file is malformed JSON", () => {
      const dir = resolve(tmpDir, ".pearl");
      mkdirSync(dir, { recursive: true });
      writeFileSync(resolve(dir, "settings.json"), "not json {{{", "utf-8");

      const result = loadSettingsSync(tmpDir, mockLogger);
      expect(result).toEqual(DEFAULT_SETTINGS);
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("Malformed JSON"));
    });

    it("returns defaults when file contains non-object JSON", () => {
      const dir = resolve(tmpDir, ".pearl");
      mkdirSync(dir, { recursive: true });
      writeFileSync(resolve(dir, "settings.json"), '"just a string"', "utf-8");

      const result = loadSettingsSync(tmpDir, mockLogger);
      expect(result).toEqual(DEFAULT_SETTINGS);
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("not a JSON object"));
    });

    it("returns valid settings from a well-formed file", () => {
      const settings = {
        version: 1,
        attachments: {
          storageMode: "inline",
          local: {
            scope: "user",
            projectPathOverride: "/custom",
            userPathOverride: "/abs",
          },
          encoding: {
            format: "webp",
            maxBytes: 512000,
            maxDimension: 1024,
            stripExif: true,
          },
        },
      };
      const dir = resolve(tmpDir, ".pearl");
      mkdirSync(dir, { recursive: true });
      writeFileSync(resolve(dir, "settings.json"), JSON.stringify(settings), "utf-8");

      const result = loadSettingsSync(tmpDir, mockLogger);
      expect(result.attachments.storageMode).toBe("inline");
      expect(result.attachments.local.scope).toBe("user");
      expect(result.attachments.local.projectPathOverride).toBe("/custom");
      expect(result.attachments.encoding.maxBytes).toBe(512000);
      expect(result.attachments.encoding.maxDimension).toBe(1024);
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it("deep-merges partial settings with defaults", () => {
      const partial = {
        version: 1,
        attachments: {
          storageMode: "inline",
        },
      };
      const dir = resolve(tmpDir, ".pearl");
      mkdirSync(dir, { recursive: true });
      writeFileSync(resolve(dir, "settings.json"), JSON.stringify(partial), "utf-8");

      const result = loadSettingsSync(tmpDir, mockLogger);
      expect(result.attachments.storageMode).toBe("inline");
      expect(result.attachments.local.scope).toBe("project");
      expect(result.attachments.encoding.maxBytes).toBe(1_048_576);
      expect(result.attachments.encoding.stripExif).toBe(true);
    });

    it("ignores invalid storageMode values", () => {
      const partial = {
        version: 1,
        attachments: { storageMode: "cloud" },
      };
      const dir = resolve(tmpDir, ".pearl");
      mkdirSync(dir, { recursive: true });
      writeFileSync(resolve(dir, "settings.json"), JSON.stringify(partial), "utf-8");

      const result = loadSettingsSync(tmpDir, mockLogger);
      expect(result.attachments.storageMode).toBe("local");
    });

    it("ignores negative maxBytes", () => {
      const partial = {
        version: 1,
        attachments: { encoding: { maxBytes: -100 } },
      };
      const dir = resolve(tmpDir, ".pearl");
      mkdirSync(dir, { recursive: true });
      writeFileSync(resolve(dir, "settings.json"), JSON.stringify(partial), "utf-8");

      const result = loadSettingsSync(tmpDir, mockLogger);
      expect(result.attachments.encoding.maxBytes).toBe(1_048_576);
    });

    it("clamps maxBytes to upper bound of 50 MB", () => {
      const partial = {
        version: 1,
        attachments: { encoding: { maxBytes: 999_999_999 } },
      };
      const dir = resolve(tmpDir, ".pearl");
      mkdirSync(dir, { recursive: true });
      writeFileSync(resolve(dir, "settings.json"), JSON.stringify(partial), "utf-8");

      const result = loadSettingsSync(tmpDir, mockLogger);
      expect(result.attachments.encoding.maxBytes).toBe(1_048_576);
    });

    it("clamps maxDimension to upper bound of 16384", () => {
      const partial = {
        version: 1,
        attachments: { encoding: { maxDimension: 100_000 } },
      };
      const dir = resolve(tmpDir, ".pearl");
      mkdirSync(dir, { recursive: true });
      writeFileSync(resolve(dir, "settings.json"), JSON.stringify(partial), "utf-8");

      const result = loadSettingsSync(tmpDir, mockLogger);
      expect(result.attachments.encoding.maxDimension).toBe(2048);
    });

    it("rejects path overrides containing traversal segments", () => {
      const partial = {
        version: 1,
        attachments: {
          local: {
            projectPathOverride: "../../etc/passwd",
            userPathOverride: "/safe/path",
          },
        },
      };
      const dir = resolve(tmpDir, ".pearl");
      mkdirSync(dir, { recursive: true });
      writeFileSync(resolve(dir, "settings.json"), JSON.stringify(partial), "utf-8");

      const result = loadSettingsSync(tmpDir, mockLogger);
      expect(result.attachments.local.projectPathOverride).toBeNull();
      expect(result.attachments.local.userPathOverride).toBe("/safe/path");
    });

    it("rejects path overrides exceeding max length", () => {
      const partial = {
        version: 1,
        attachments: {
          local: {
            projectPathOverride: "a".repeat(1025),
          },
        },
      };
      const dir = resolve(tmpDir, ".pearl");
      mkdirSync(dir, { recursive: true });
      writeFileSync(resolve(dir, "settings.json"), JSON.stringify(partial), "utf-8");

      const result = loadSettingsSync(tmpDir, mockLogger);
      expect(result.attachments.local.projectPathOverride).toBeNull();
    });

    it("stripExif is always true regardless of file content", () => {
      const partial = {
        version: 1,
        attachments: { encoding: { stripExif: false } },
      };
      const dir = resolve(tmpDir, ".pearl");
      mkdirSync(dir, { recursive: true });
      writeFileSync(resolve(dir, "settings.json"), JSON.stringify(partial), "utf-8");

      const result = loadSettingsSync(tmpDir, mockLogger);
      expect(result.attachments.encoding.stripExif).toBe(true);
    });
  });

  describe("loadSettings (async)", () => {
    it("returns defaults when file does not exist", async () => {
      const result = await loadSettings(tmpDir, mockLogger);
      expect(result).toEqual(DEFAULT_SETTINGS);
    });
  });

  describe("saveSettings", () => {
    it("creates .pearl directory if it does not exist", async () => {
      await saveSettings(tmpDir, DEFAULT_SETTINGS);
      expect(existsSync(resolve(tmpDir, ".pearl"))).toBe(true);
      expect(existsSync(resolve(tmpDir, ".pearl", "settings.json"))).toBe(true);
    });

    it("writes settings as formatted JSON", async () => {
      await saveSettings(tmpDir, DEFAULT_SETTINGS);
      const result = loadSettingsSync(tmpDir);
      expect(result).toEqual(DEFAULT_SETTINGS);
    });

    it("round-trips: save then load returns same settings", async () => {
      const custom = structuredClone(DEFAULT_SETTINGS);
      custom.attachments.storageMode = "inline";
      custom.attachments.local.scope = "user";
      custom.attachments.encoding.maxBytes = 256_000;

      await saveSettings(tmpDir, custom);
      const result = await loadSettings(tmpDir);
      expect(result).toEqual(custom);
    });
  });
});
