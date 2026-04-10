import { describe, it, expect } from "vitest";
import { loadConfig } from "./config.js";

describe("loadConfig", () => {
  it("returns config with 127.0.0.1 host (never 0.0.0.0)", () => {
    const config = loadConfig();
    expect(config.host).toBe("127.0.0.1");
  });

  it("returns sensible defaults", () => {
    const config = loadConfig();
    expect(config.port).toBe(3456);
    expect(config.doltPort).toBe(3307);
    expect(config.dbLockMaxRetries).toBe(3);
    expect(config.dbLockRetryDelayMs).toBe(1000);
    expect(config.doltRestartThreshold).toBe(3);
    expect(config.poolSize).toBeGreaterThan(0);
  });

  it("auto-discovers the beads database path", () => {
    const config = loadConfig();
    // Should find the .beads/embeddeddolt/beads_gui directory
    expect(config.doltDbPath).toContain("beads_gui");
  });
});
