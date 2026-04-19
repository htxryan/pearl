import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, type Settings } from "./index.js";

describe("Settings schema", () => {
  it("DEFAULT_SETTINGS has version 1", () => {
    expect(DEFAULT_SETTINGS.version).toBe(1);
  });

  it("DEFAULT_SETTINGS uses local storage mode", () => {
    expect(DEFAULT_SETTINGS.attachments.storageMode).toBe("local");
  });

  it("DEFAULT_SETTINGS has project scope", () => {
    expect(DEFAULT_SETTINGS.attachments.local.scope).toBe("project");
  });

  it("DEFAULT_SETTINGS has null path overrides", () => {
    expect(DEFAULT_SETTINGS.attachments.local.projectPathOverride).toBeNull();
    expect(DEFAULT_SETTINGS.attachments.local.userPathOverride).toBeNull();
  });

  it("DEFAULT_SETTINGS has webp format", () => {
    expect(DEFAULT_SETTINGS.attachments.encoding.format).toBe("webp");
  });

  it("DEFAULT_SETTINGS has 1MB maxBytes", () => {
    expect(DEFAULT_SETTINGS.attachments.encoding.maxBytes).toBe(1_048_576);
  });

  it("DEFAULT_SETTINGS has 2048 maxDimension", () => {
    expect(DEFAULT_SETTINGS.attachments.encoding.maxDimension).toBe(2048);
  });

  it("DEFAULT_SETTINGS has stripExif as true (mandatory invariant)", () => {
    expect(DEFAULT_SETTINGS.attachments.encoding.stripExif).toBe(true);
  });

  it("Settings type satisfies the spec schema", () => {
    const settings: Settings = {
      version: 1,
      attachments: {
        storageMode: "inline",
        local: {
          scope: "user",
          projectPathOverride: "/custom/path",
          userPathOverride: "/abs/path",
        },
        encoding: {
          format: "webp",
          maxBytes: 512_000,
          maxDimension: 1024,
          stripExif: true,
        },
      },
    };
    expect(settings.version).toBe(1);
    expect(settings.attachments.storageMode).toBe("inline");
  });
});
