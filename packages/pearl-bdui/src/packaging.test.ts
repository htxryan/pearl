import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolve, dirname } from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const backendRoot = resolve(__dirname, "..");

// ─── findFrontendDist tests ─────────────────────────────

const { mockedExistsSync } = vi.hoisted(() => {
  return { mockedExistsSync: vi.fn() };
});

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    existsSync: (...args: Parameters<typeof actual.existsSync>) => {
      if (mockedExistsSync.getMockImplementation()) {
        return mockedExistsSync(...args);
      }
      return actual.existsSync(...args);
    },
  };
});

describe("findFrontendDist", () => {
  let findFrontendDist: typeof import("./server.js").findFrontendDist;

  beforeEach(async () => {
    vi.resetModules();
    mockedExistsSync.mockReset();
    // Dynamic import to get fresh module with mocked fs
    const mod = await import("./server.js");
    findFrontendDist = mod.findFrontendDist;
  });

  it("returns null when Pearl workspace is detected (dev mode)", () => {
    mockedExistsSync.mockImplementation((p: string) => {
      if (p.includes("pnpm-workspace.yaml")) return true;
      if (p.includes("packages/frontend/package.json")) return true;
      return false;
    });

    expect(findFrontendDist("/fake/packages/backend/dist")).toBeNull();
  });

  it("returns frontend-dist path when installed from npm", () => {
    mockedExistsSync.mockImplementation((p: string) => {
      if (p.includes("pnpm-workspace.yaml")) return false;
      if (p.includes("frontend-dist") && p.endsWith("index.html")) return true;
      return false;
    });

    const result = findFrontendDist("/fake/node_modules/pearl-bdui/dist");
    expect(result).toBe(resolve("/fake/node_modules/pearl-bdui", "frontend-dist"));
  });

  it("returns null when neither workspace nor frontend-dist found", () => {
    mockedExistsSync.mockReturnValue(false);

    expect(findFrontendDist("/some/random/dir")).toBeNull();
  });

  it("does not false-positive on foreign pnpm monorepo", () => {
    // Another project has pnpm-workspace.yaml but NOT packages/frontend/package.json
    mockedExistsSync.mockImplementation((p: string) => {
      if (p.includes("pnpm-workspace.yaml")) return true;
      if (p.includes("packages/frontend/package.json")) return false;
      if (p.includes("frontend-dist") && p.endsWith("index.html")) return true;
      return false;
    });

    const result = findFrontendDist("/other-project/node_modules/pearl-bdui/dist");
    expect(result).not.toBeNull();
  });
});

// ─── Import rewriting verification ──────────────────────

describe("import rewriting", () => {
  it("dist .js files contain no @pearl/shared references after build:dist", async () => {
    // This test verifies the post-build state. It reads actual dist files
    // and fails if any @pearl/shared imports survive rewriting.
    const { readdirSync, readFileSync, existsSync } = await import("node:fs");

    const distDir = resolve(backendRoot, "dist");
    if (!existsSync(distDir)) {
      // Skip if dist doesn't exist (hasn't been built yet)
      return;
    }

    function checkDir(dir: string): string[] {
      const violations: string[] = [];
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const fullPath = resolve(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === "_shared") continue;
          violations.push(...checkDir(fullPath));
        } else if (entry.name.endsWith(".js")) {
          const content = readFileSync(fullPath, "utf-8");
          if (content.includes("@pearl/shared")) {
            violations.push(fullPath);
          }
        }
      }
      return violations;
    }

    const violations = checkDir(distDir);
    expect(violations).toEqual([]);
  });
});

// ─── CLI smoke tests ────────────────────────────────────
// These require `pnpm build` to have run first (dist/ must exist).

const distExists = existsSync(resolve(backendRoot, "dist", "config.js"));

describe.skipIf(!distExists)("CLI entrypoint", () => {
  it("--version prints version and exits 0", () => {
    const result = execSync("node bin/pearl.js --version", {
      cwd: backendRoot,
      encoding: "utf-8",
    });
    expect(result.trim()).toMatch(/^pearl-bdui v\d+\.\d+\.\d+$/);
  });

  it("--help prints usage and exits 0", () => {
    const result = execSync("node bin/pearl.js --help", {
      cwd: backendRoot,
      encoding: "utf-8",
    });
    expect(result).toContain("Usage: pearl-bdui [options]");
    expect(result).toContain("--no-open");
    expect(result).toContain("PORT");
  });

  it("-v is an alias for --version", () => {
    const result = execSync("node bin/pearl.js -v", {
      cwd: backendRoot,
      encoding: "utf-8",
    });
    expect(result.trim()).toMatch(/^pearl-bdui v\d+\.\d+\.\d+$/);
  });

  it("-h is an alias for --help", () => {
    const result = execSync("node bin/pearl.js -h", {
      cwd: backendRoot,
      encoding: "utf-8",
    });
    expect(result).toContain("Usage: pearl-bdui [options]");
  });
});

// ─── npm pack verification ──────────────────────────────
// Requires build:dist to have run (dist/ + frontend-dist/ must exist).

describe.skipIf(!distExists)("npm pack contents", () => {
  it("tarball includes required files and excludes dev files", () => {
    const output = execSync("npm pack --dry-run 2>&1", {
      cwd: backendRoot,
      encoding: "utf-8",
    });

    // Must include
    expect(output).toContain("bin/pearl.js");
    expect(output).toContain("dist/server.js");
    expect(output).toContain("dist/config.js");
    expect(output).toContain("dist/index.js");
    expect(output).toContain("frontend-dist/index.html");

    // Must NOT include
    const lines = output.split("\n");
    const fileLines = lines.filter((l) => l.startsWith("npm notice") && /\d+[.]\d+[kKmM]?B/.test(l));
    for (const line of fileLines) {
      expect(line).not.toMatch(/\.ts\s/); // no .ts source files (but .d.ts is ok)
      expect(line).not.toContain(".test.");
      expect(line).not.toContain("node_modules/");
      expect(line).not.toContain("scripts/");
      expect(line).not.toContain(".js.map");
    }
  });
});
