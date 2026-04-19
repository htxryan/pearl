import type { Settings } from "@pearl/shared";
import { DEFAULT_SETTINGS } from "@pearl/shared";
import { describe, expect, it, vi } from "vitest";
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

describe("Settings type invariants", () => {
  it("DEFAULT_SETTINGS is frozen and cannot be mutated", () => {
    expect(Object.isFrozen(DEFAULT_SETTINGS)).toBe(true);
    expect(Object.isFrozen(DEFAULT_SETTINGS.attachments)).toBe(true);
    expect(Object.isFrozen(DEFAULT_SETTINGS.attachments.encoding)).toBe(true);
  });

  it("stripExif must be true in Settings type", () => {
    const settings: Settings = structuredClone(DEFAULT_SETTINGS);
    expect(settings.attachments.encoding.stripExif).toBe(true);
  });
});
