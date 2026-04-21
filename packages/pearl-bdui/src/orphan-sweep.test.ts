import { mkdirSync, readFileSync, utimesSync, writeFileSync } from "node:fs";
import { mkdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { LocalScope, Settings } from "@pearl/shared";
import { DEFAULT_SETTINGS } from "@pearl/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OrphanSweep, type SweepDeps, type SweepResult } from "./orphan-sweep.js";

const WEBP_BYTES = Buffer.from(
  "UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA",
  "base64",
);

function makeDeps(overrides: Partial<SweepDeps> = {}): SweepDeps {
  return {
    resolveAttachmentBase: (scope: LocalScope, projectRoot: string) =>
      scope === "project"
        ? resolve(projectRoot, ".pearl", "attachments")
        : resolve(projectRoot, ".pearl", "user-attachments"),
    getSettings: async () => structuredClone(DEFAULT_SETTINGS),
    isRefReferenced: async () => false,
    projectRoot: "/tmp/test-project",
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    ...overrides,
  };
}

describe("OrphanSweep", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = join(tmpdir(), `pearl-sweep-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  function writeTestFile(ref: string, ext = "webp", ageSeconds = 7200): string {
    const subdir = join(tmpDir, ".pearl", "attachments", "2026", "04");
    mkdirSync(subdir, { recursive: true });
    const filePath = join(subdir, `${ref}.${ext}`);
    writeFileSync(filePath, WEBP_BYTES);

    if (ageSeconds > 0) {
      const oldTime = new Date(Date.now() - ageSeconds * 1000);
      utimesSync(filePath, oldTime, oldTime);
    }
    return filePath;
  }

  it("deletes unreferenced files older than grace period (AC-5)", async () => {
    const filePath = writeTestFile("a1b2c3d4e5f6", "webp", 7200);

    const sweep = new OrphanSweep(
      makeDeps({
        projectRoot: tmpDir,
        isRefReferenced: async () => false,
      }),
    );

    const result = await sweep.runOnce();

    expect(result.deleted).toBe(1);
    expect(result.scanned).toBe(1);
    await expect(stat(filePath)).rejects.toThrow();
  });

  it("skips files younger than grace period — in-flight safety (AC-6)", async () => {
    const filePath = writeTestFile("b2c3d4e5f6a1", "webp", 0);

    const sweep = new OrphanSweep(
      makeDeps({
        projectRoot: tmpDir,
        isRefReferenced: async () => false,
      }),
    );

    const result = await sweep.runOnce();

    expect(result.skippedYoung).toBe(1);
    expect(result.deleted).toBe(0);
    const s = await stat(filePath);
    expect(s.isFile()).toBe(true);
  });

  it("skips referenced files (AC-5)", async () => {
    const filePath = writeTestFile("c3d4e5f6a1b2", "webp", 7200);

    const sweep = new OrphanSweep(
      makeDeps({
        projectRoot: tmpDir,
        isRefReferenced: async () => true,
      }),
    );

    const result = await sweep.runOnce();

    expect(result.skippedReferenced).toBe(1);
    expect(result.deleted).toBe(0);
    const s = await stat(filePath);
    expect(s.isFile()).toBe(true);
  });

  it("updates lastRunTs after sweep (AC-7)", async () => {
    const sweep = new OrphanSweep(makeDeps({ projectRoot: tmpDir }));

    expect(sweep.lastRunTs).toBe(0);
    await sweep.runOnce();
    expect(sweep.lastRunTs).toBeGreaterThan(0);
  });

  it("is idempotent: second run has nothing to delete (AC-8)", async () => {
    writeTestFile("d4e5f6a1b2c3", "webp", 7200);

    const sweep = new OrphanSweep(
      makeDeps({
        projectRoot: tmpDir,
        isRefReferenced: async () => false,
      }),
    );

    const first = await sweep.runOnce();
    expect(first.deleted).toBe(1);

    const second = await sweep.runOnce();
    expect(second.deleted).toBe(0);
    expect(second.scanned).toBe(0);
  });

  it("ignores .tmp files", async () => {
    const subdir = join(tmpDir, ".pearl", "attachments", "2026", "04");
    mkdirSync(subdir, { recursive: true });
    writeFileSync(join(subdir, "e5f6a1b2c3d4.webp.1234.tmp"), WEBP_BYTES);
    const oldTime = new Date(Date.now() - 7200 * 1000);
    utimesSync(join(subdir, "e5f6a1b2c3d4.webp.1234.tmp"), oldTime, oldTime);

    const sweep = new OrphanSweep(makeDeps({ projectRoot: tmpDir }));

    const result = await sweep.runOnce();
    expect(result.scanned).toBe(0);
  });

  it("handles non-existent base directory gracefully", async () => {
    const sweep = new OrphanSweep(makeDeps({ projectRoot: "/nonexistent/path" }));

    const result = await sweep.runOnce();
    expect(result.scanned).toBe(0);
    expect(result.errors).toBe(0);
  });

  it("does not run concurrently", async () => {
    writeTestFile("f6a1b2c3d4e5", "webp", 7200);

    let resolveRef: () => void;
    const blockingPromise = new Promise<void>((r) => {
      resolveRef = r;
    });

    const sweep = new OrphanSweep(
      makeDeps({
        projectRoot: tmpDir,
        isRefReferenced: async () => {
          await blockingPromise;
          return false;
        },
      }),
    );

    const first = sweep.runOnce();
    const second = await sweep.runOnce();
    expect(second.scanned).toBe(0);

    resolveRef!();
    const firstResult = await first;
    expect(firstResult.scanned).toBe(1);
  });

  it("start/stop controls the timer", async () => {
    const sweep = new OrphanSweep(makeDeps({ projectRoot: tmpDir }));

    sweep.start(999999);
    expect(sweep.running).toBe(false);

    sweep.stop();
  });

  it("respects custom grace period from settings", async () => {
    const filePath = writeTestFile("a1a2a3a4a5a6", "webp", 120);

    const settings = structuredClone(DEFAULT_SETTINGS);
    settings.attachments.sweep.graceSeconds = 60;

    const sweep = new OrphanSweep(
      makeDeps({
        projectRoot: tmpDir,
        getSettings: async () => settings,
        isRefReferenced: async () => false,
      }),
    );

    const result = await sweep.runOnce();
    expect(result.deleted).toBe(1);
    await expect(stat(filePath)).rejects.toThrow();
  });

  it("processes files with different extensions", async () => {
    const webpPath = writeTestFile("b1b2b3b4b5b6", "webp", 7200);
    const pngDir = join(tmpDir, ".pearl", "attachments", "2026", "03");
    mkdirSync(pngDir, { recursive: true });
    const pngPath = join(pngDir, "c1c2c3c4c5c6.png");
    writeFileSync(pngPath, WEBP_BYTES);
    const oldTime = new Date(Date.now() - 7200 * 1000);
    utimesSync(pngPath, oldTime, oldTime);

    const sweep = new OrphanSweep(
      makeDeps({
        projectRoot: tmpDir,
        isRefReferenced: async () => false,
      }),
    );

    const result = await sweep.runOnce();
    expect(result.deleted).toBe(2);
  });
});
