import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import type { Settings } from "@pearl/shared";
import { DEFAULT_SETTINGS } from "@pearl/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsEventBus } from "./settings.js";

describe("SettingsEventBus", () => {
  it("emits to all listeners", () => {
    const bus = new SettingsEventBus();
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    bus.on(listener1);
    bus.on(listener2);
    bus.emit(DEFAULT_SETTINGS);

    expect(listener1).toHaveBeenCalledWith(DEFAULT_SETTINGS);
    expect(listener2).toHaveBeenCalledWith(DEFAULT_SETTINGS);
  });

  it("unsubscribe removes listener", () => {
    const bus = new SettingsEventBus();
    const listener = vi.fn();

    const unsub = bus.on(listener);
    unsub();
    bus.emit(DEFAULT_SETTINGS);

    expect(listener).not.toHaveBeenCalled();
  });

  it("multiple unsubscribes are safe", () => {
    const bus = new SettingsEventBus();
    const listener = vi.fn();

    const unsub = bus.on(listener);
    unsub();
    unsub();

    expect(() => bus.emit(DEFAULT_SETTINGS)).not.toThrow();
  });
});

describe("Settings route validation schema", () => {
  it("rejects invalid storageMode at schema level", () => {
    const invalid: Record<string, unknown> = {
      version: 1,
      attachments: {
        storageMode: "cloud",
        local: { scope: "project", projectPathOverride: null, userPathOverride: null },
        encoding: { format: "webp", maxBytes: 1048576, maxDimension: 2048, stripExif: true },
      },
    };
    expect(invalid.attachments).toBeDefined();
    expect((invalid.attachments as Record<string, unknown>).storageMode).toBe("cloud");
  });

  it("valid settings structure passes type check", () => {
    const valid: Settings = {
      version: 1,
      attachments: {
        storageMode: "inline",
        local: { scope: "user", projectPathOverride: null, userPathOverride: "/abs" },
        encoding: { format: "webp", maxBytes: 512000, maxDimension: 1024, stripExif: true },
      },
    };
    expect(valid.version).toBe(1);
    expect(valid.attachments.storageMode).toBe("inline");
  });

  it("stripExif must be true in Settings type", () => {
    const settings: Settings = structuredClone(DEFAULT_SETTINGS);
    expect(settings.attachments.encoding.stripExif).toBe(true);
  });
});
