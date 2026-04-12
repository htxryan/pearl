import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { loadConfig, readBeadsMetadata } from "./config.js";
import { resolve, basename } from "node:path";
import { readFileSync as realReadFileSync } from "node:fs";

const { mockedReadFileSync } = vi.hoisted(() => {
  return { mockedReadFileSync: vi.fn() };
});

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    readFileSync: (...args: Parameters<typeof actual.readFileSync>) => {
      if (mockedReadFileSync.getMockImplementation()) {
        return mockedReadFileSync(...args);
      }
      return actual.readFileSync(...args);
    },
  };
});

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

    it("ignores DOLT_HOST env var in embedded mode", () => {
      process.env.DOLT_HOST = "dolt.example.com";
      // In embedded mode, doltHost is always 127.0.0.1 regardless of env var
      const config = loadConfig();
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

  describe("server mode", () => {
    function mockMetadata(metadata: Record<string, unknown>) {
      mockedReadFileSync.mockImplementation(
        (path: unknown, enc: unknown) => {
          if (String(path).includes("metadata.json")) {
            return JSON.stringify(metadata);
          }
          return realReadFileSync(
            path as string,
            enc as BufferEncoding
          );
        }
      );
    }

    afterEach(() => {
      mockedReadFileSync.mockReset();
    });

    it("detects server mode from metadata", () => {
      mockMetadata({ dolt_mode: "server", dolt_host: "dolt.example.com" });
      const config = loadConfig();
      expect(config.doltMode).toBe("server");
    });

    it("reads dolt_host from metadata in server mode", () => {
      mockMetadata({ dolt_mode: "server", dolt_host: "dolt.example.com" });
      const config = loadConfig();
      expect(config.doltHost).toBe("dolt.example.com");
    });

    it("prefers DOLT_HOST env var over metadata in server mode", () => {
      mockMetadata({ dolt_mode: "server", dolt_host: "metadata-host.example.com" });
      process.env.DOLT_HOST = "env-host.example.com";
      const config = loadConfig();
      expect(config.doltHost).toBe("env-host.example.com");
      delete process.env.DOLT_HOST;
    });

    it("warns and falls back to 127.0.0.1 when server mode has no host", () => {
      mockMetadata({ dolt_mode: "server" });
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const config = loadConfig();
      expect(config.doltHost).toBe("127.0.0.1");
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("no dolt_host configured")
      );
      warnSpy.mockRestore();
    });

    it("does not derive replicaPath in server mode", () => {
      mockMetadata({ dolt_mode: "server", dolt_host: "dolt.example.com" });
      const config = loadConfig();
      expect(config.replicaPath).toBe("");
    });
  });

  describe("credentials", () => {
    it("defaults doltUser to root", () => {
      const config = loadConfig();
      expect(config.doltUser).toBe("root");
    });

    it("defaults doltPassword to empty string", () => {
      const config = loadConfig();
      expect(config.doltPassword).toBe("");
    });

    it("reads doltUser from DOLT_USER env var", () => {
      process.env.DOLT_USER = "custom_user";
      const config = loadConfig();
      expect(config.doltUser).toBe("custom_user");
      delete process.env.DOLT_USER;
    });

    it("reads doltPassword from DOLT_PASSWORD env var", () => {
      process.env.DOLT_PASSWORD = "secret123";
      const config = loadConfig();
      expect(config.doltPassword).toBe("secret123");
      delete process.env.DOLT_PASSWORD;
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
