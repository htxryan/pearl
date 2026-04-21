import { readFileSync as realReadFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadConfig, readBeadsMetadata } from "./config.js";

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
    // The real .beads/metadata.json in this repo now has dolt_mode: "server".
    // These tests exercise embedded-mode logic, so we mock the file read.
    function mockEmbeddedMetadata(overrides: Record<string, unknown> = {}) {
      mockedReadFileSync.mockImplementation((path: unknown, enc: unknown) => {
        if (String(path).includes("metadata.json")) {
          return JSON.stringify({
            database: "dolt",
            backend: "dolt",
            dolt_mode: "embedded",
            dolt_database: "beads_gui",
            ...overrides,
          });
        }
        return realReadFileSync(path as string, enc as BufferEncoding);
      });
    }

    afterEach(() => {
      mockedReadFileSync.mockReset();
    });

    it("detects embedded mode from metadata.json", () => {
      mockEmbeddedMetadata();
      const config = loadConfig();
      expect(config.doltMode).toBe("embedded");
    });

    it("defaults doltHost to 127.0.0.1 in embedded mode", () => {
      mockEmbeddedMetadata();
      const config = loadConfig();
      expect(config.doltHost).toBe("127.0.0.1");
    });

    it("derives replicaPath as sibling __replica__/<dbname>", () => {
      mockEmbeddedMetadata();
      const config = loadConfig();
      const dbName = basename(config.doltDbPath);
      expect(config.replicaPath).toContain("__replica__");
      expect(config.replicaPath).toContain(dbName);
    });

    it("ignores DOLT_HOST env var in embedded mode", () => {
      mockEmbeddedMetadata();
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
      mockedReadFileSync.mockImplementation((path: unknown, enc: unknown) => {
        if (String(path).includes("metadata.json")) {
          return JSON.stringify(metadata);
        }
        return realReadFileSync(path as string, enc as BufferEncoding);
      });
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

    it("reads dolt_server_host from metadata when dolt_host absent", () => {
      mockMetadata({ dolt_mode: "server", dolt_server_host: "server-host.example.com" });
      const config = loadConfig();
      expect(config.doltHost).toBe("server-host.example.com");
    });

    it("prefers dolt_host over dolt_server_host", () => {
      mockMetadata({
        dolt_mode: "server",
        dolt_host: "primary.example.com",
        dolt_server_host: "fallback.example.com",
      });
      const config = loadConfig();
      expect(config.doltHost).toBe("primary.example.com");
    });

    it("reads dolt_server_port from metadata when dolt_port absent", () => {
      mockMetadata({ dolt_mode: "server", dolt_server_host: "h", dolt_server_port: 3309 });
      const config = loadConfig();
      expect(config.doltPort).toBe(3309);
    });

    it("does not use dolt_server_port in embedded mode", () => {
      mockMetadata({ dolt_mode: "embedded", dolt_server_port: 9999 });
      const config = loadConfig();
      expect(config.doltPort).toBe(3307);
    });

    it("throws when server mode has no host configured", () => {
      mockMetadata({ dolt_mode: "server" });
      expect(() => loadConfig()).toThrow("no dolt_host configured");
    });

    it("error message mentions dolt_server_host", () => {
      mockMetadata({ dolt_mode: "server" });
      expect(() => loadConfig()).toThrow("dolt_server_host");
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
    // Don't pin the mode value — the real repo can be either "embedded" or
    // "server" depending on how pearl-bdui is configured. Just assert the
    // parser returned a well-formed object.
    expect(metadata!.dolt_mode).toMatch(/^(embedded|server)$/);
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
