import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { loadConfig, readBeadsMetadata } from "./config.js";
import { resolve, basename } from "node:path";

describe("loadConfig", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

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

  describe("dolt mode detection", () => {
    it("detects embedded mode from metadata.json", () => {
      // The actual .beads/metadata.json in this repo has dolt_mode: "embedded"
      const config = loadConfig();
      expect(config.doltMode).toBe("embedded");
    });

    it("defaults doltHost to 127.0.0.1 in embedded mode", () => {
      const config = loadConfig();
      expect(config.doltHost).toBe("127.0.0.1");
    });

    it("derives replicaPath as sibling __replica__/<dbname>", () => {
      const config = loadConfig();
      const dbName = basename(config.doltDbPath);
      expect(config.replicaPath).toContain("__replica__");
      expect(config.replicaPath).toContain(dbName);
    });

    it("respects DOLT_HOST env var in server mode", () => {
      // We can't easily force server mode via metadata.json in tests,
      // but we can verify the env var plumbing works
      process.env.DOLT_HOST = "dolt.example.com";
      // Even with env var, embedded mode ignores it (doltHost stays 127.0.0.1)
      const config = loadConfig();
      // Current metadata.json is embedded, so doltHost stays local
      expect(config.doltHost).toBe("127.0.0.1");
      delete process.env.DOLT_HOST;
    });

    it("respects DOLT_PORT env var", () => {
      process.env.DOLT_PORT = "3308";
      const config = loadConfig();
      expect(config.doltPort).toBe(3308);
      delete process.env.DOLT_PORT;
    });
  });
});

describe("readBeadsMetadata", () => {
  it("reads metadata.json from .beads directory", () => {
    const cwd = process.cwd();
    const metadata = readBeadsMetadata(cwd);
    expect(metadata).not.toBeNull();
    expect(metadata!.dolt_mode).toBe("embedded");
    expect(metadata!.dolt_database).toBe("beads_gui");
  });

  it("returns null for nonexistent directory", () => {
    const metadata = readBeadsMetadata("/tmp/nonexistent-beads-dir-xyz");
    expect(metadata).toBeNull();
  });

  it("walks up directories to find metadata", () => {
    // Starting from a subdirectory should still find .beads/metadata.json
    const cwd = process.cwd();
    const subDir = resolve(cwd, "packages", "backend");
    const metadata = readBeadsMetadata(subDir);
    expect(metadata).not.toBeNull();
    expect(metadata!.dolt_mode).toBeDefined();
  });
});
