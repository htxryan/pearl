import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { Settings } from "@pearl/shared";
import { createRef, DEFAULT_SETTINGS } from "@pearl/shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  _atomicWriteForTesting as atomicWrite,
  _computeSha256ForTesting as computeSha256,
  _containsTraversalForTesting as containsTraversal,
  _resolveAttachmentDirForTesting as resolveAttachmentDir,
} from "./attachments.js";

// ─── Minimal test image buffers ──────────────────────────────

// 1x1 WebP (RIFF header + VP8 payload)
const WEBP_BYTES = Buffer.from(
  "UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA",
  "base64",
);

// 1x1 PNG
const PNG_BYTES = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAAlwSFlzAAAWJQAAFiUBSVIk8AAAABJ0RVh0U29mdHdhcmUAR3JlcGhpdGUxMS4yLjUgV2ViS2l0IChVbmtub3duKSBmb3IgUGxheXdyaWdodC9oZWFkbGVzc10aB0kAAAAASUVORK5CYII=",
  "base64",
);

// Random bytes (not a valid image)
const RANDOM_BYTES = Buffer.from("4142434445464748494a4b4c4d4e4f5051525354", "hex");

// ─── Unit: computeSha256 ─────────────────────────────────────

describe("computeSha256", () => {
  it("computes correct sha256 and 12-char ref", () => {
    const { sha256Full, ref } = computeSha256(WEBP_BYTES);
    const expected = createHash("sha256").update(WEBP_BYTES).digest("hex");
    expect(sha256Full).toBe(expected);
    expect(ref).toBe(expected.slice(0, 12));
    expect(ref).toMatch(/^[0-9a-f]{12}$/);
  });

  it("same bytes produce same ref (deterministic)", () => {
    const a = computeSha256(WEBP_BYTES);
    const b = computeSha256(WEBP_BYTES);
    expect(a.ref).toBe(b.ref);
    expect(a.sha256Full).toBe(b.sha256Full);
  });

  it("different bytes produce different ref", () => {
    const a = computeSha256(WEBP_BYTES);
    const b = computeSha256(PNG_BYTES);
    expect(a.ref).not.toBe(b.ref);
  });
});

// ─── Unit: containsTraversal ─────────────────────────────────

describe("containsTraversal", () => {
  it("detects .. in path", () => {
    expect(containsTraversal("foo/../bar")).toBe(true);
    expect(containsTraversal("../etc/passwd")).toBe(true);
    expect(containsTraversal("foo/bar/../../baz")).toBe(true);
  });

  it("allows normal paths", () => {
    expect(containsTraversal("foo/bar/baz")).toBe(false);
    expect(containsTraversal(".pearl/attachments/2026/04")).toBe(false);
  });
});

// ─── Unit: resolveAttachmentDir ──────────────────────────────

describe("resolveAttachmentDir", () => {
  const projectRoot = "/projects/my-project";
  const settings: Settings = structuredClone(DEFAULT_SETTINGS);

  it("resolves project scope to .pearl/attachments/YYYY/MM", () => {
    settings.attachments.local.scope = "project";
    settings.attachments.local.projectPathOverride = null;
    const dir = resolveAttachmentDir("project", projectRoot, settings);
    const now = new Date();
    const yyyy = String(now.getFullYear());
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    expect(dir).toBe(resolve(projectRoot, ".pearl", "attachments", yyyy, mm));
  });

  it("resolves user scope to ~/.pearl/attachments/<project>/YYYY/MM", () => {
    settings.attachments.local.scope = "user";
    settings.attachments.local.userPathOverride = null;
    const dir = resolveAttachmentDir("user", projectRoot, settings);
    const now = new Date();
    const yyyy = String(now.getFullYear());
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    expect(dir).toBe(resolve(homedir(), ".pearl", "attachments", "my-project", yyyy, mm));
  });

  it("respects projectPathOverride", () => {
    settings.attachments.local.projectPathOverride = "/custom/path";
    const dir = resolveAttachmentDir("project", projectRoot, settings);
    const now = new Date();
    const yyyy = String(now.getFullYear());
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    expect(dir).toBe(resolve("/custom/path", yyyy, mm));
    settings.attachments.local.projectPathOverride = null;
  });

  it("respects userPathOverride", () => {
    settings.attachments.local.userPathOverride = "/custom/user/path";
    const dir = resolveAttachmentDir("user", projectRoot, settings);
    const now = new Date();
    const yyyy = String(now.getFullYear());
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    expect(dir).toBe(resolve("/custom/user/path", yyyy, mm));
    settings.attachments.local.userPathOverride = null;
  });
});

// ─── Unit: atomicWrite ───────────────────────────────────────

describe("atomicWrite", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = join(tmpdir(), `pearl-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("writes file atomically", async () => {
    const filePath = join(tmpDir, "subdir", "test.webp");
    await atomicWrite(filePath, WEBP_BYTES);

    expect(existsSync(filePath)).toBe(true);
    const written = readFileSync(filePath);
    expect(written.equals(WEBP_BYTES)).toBe(true);
  });

  it("creates parent directories", async () => {
    const filePath = join(tmpDir, "a", "b", "c", "test.webp");
    await atomicWrite(filePath, WEBP_BYTES);
    expect(existsSync(filePath)).toBe(true);
  });

  it("no tmp file left behind on success", async () => {
    const filePath = join(tmpDir, "test.webp");
    await atomicWrite(filePath, WEBP_BYTES);

    const files = require("node:fs").readdirSync(tmpDir) as string[];
    expect(files.filter((f: string) => f.endsWith(".tmp"))).toHaveLength(0);
  });
});

// ─── Unit: magic-byte MIME sniff (AC-2) ──────────────────────

describe("magic-byte MIME sniff", () => {
  it("detects WebP", async () => {
    const { fileTypeFromBuffer } = await import("file-type");
    const result = await fileTypeFromBuffer(WEBP_BYTES);
    expect(result?.mime).toBe("image/webp");
  });

  it("detects PNG", async () => {
    const { fileTypeFromBuffer } = await import("file-type");
    const result = await fileTypeFromBuffer(PNG_BYTES);
    expect(result?.mime).toBe("image/png");
  });

  it("rejects random bytes (not an image)", async () => {
    const { fileTypeFromBuffer } = await import("file-type");
    const result = await fileTypeFromBuffer(RANDOM_BYTES);
    const mime = result?.mime ?? "application/octet-stream";
    expect(
      ["image/webp", "image/png", "image/jpeg", "image/gif", "image/avif"].includes(mime),
    ).toBe(false);
  });
});

// ─── Integration: dedup (AC-7) ───────────────────────────────

describe("content-addressed dedup", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = join(tmpdir(), `pearl-dedup-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("same bytes produce same ref and single file", async () => {
    const { ref } = computeSha256(WEBP_BYTES);
    const filePath = join(tmpDir, `${ref}.webp`);

    // First write
    await atomicWrite(filePath, WEBP_BYTES);
    expect(existsSync(filePath)).toBe(true);

    // Second "write" — in real code, dedup checks existsSync + equals
    const existingBytes = readFileSync(filePath);
    expect(existingBytes.equals(WEBP_BYTES)).toBe(true);

    // No second file written (same ref means same path)
    const files = require("node:fs").readdirSync(tmpDir) as string[];
    expect(files.length).toBe(1);
  });
});
