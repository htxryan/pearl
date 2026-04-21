/**
 * Tests for the local-filesystem storage pipeline prototype.
 */

import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  computeRef,
  fullSha256,
  generateLocalDataBlock,
  resolveBasePath,
  validatePath,
  writeAttachmentAtomic,
} from "./local-storage";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a one-off temp directory that the test can write into. */
function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "pearl-test-"));
}

/** Recursively remove a directory (safe for temp dirs). */
function rmrf(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// resolveBasePath
// ---------------------------------------------------------------------------

describe("resolveBasePath", () => {
  it("project scope returns correct path", () => {
    const result = resolveBasePath({
      scope: "project",
      projectRoot: "/Users/redhale/src/pearl",
      projectId: "pearl",
    });
    expect(result).toBe("/Users/redhale/src/pearl/.pearl/attachments");
  });

  it("user scope returns correct path", () => {
    const result = resolveBasePath({
      scope: "user",
      projectRoot: "/Users/redhale/src/pearl",
      projectId: "pearl",
    });
    expect(result).toBe(
      path.join(os.homedir(), ".pearl", "attachments", "pearl"),
    );
  });

  it("project scope with override uses override", () => {
    const result = resolveBasePath({
      scope: "project",
      projectRoot: "/Users/redhale/src/pearl",
      projectId: "pearl",
      projectPathOverride: "custom/att",
    });
    expect(result).toBe("/Users/redhale/src/pearl/custom/att");
  });

  it("user scope with override uses override", () => {
    const result = resolveBasePath({
      scope: "user",
      projectRoot: "/Users/redhale/src/pearl",
      projectId: "pearl",
      userPathOverride: "/tmp/my-attachments",
    });
    expect(result).toBe("/tmp/my-attachments");
  });
});

// ---------------------------------------------------------------------------
// writeAttachmentAtomic
// ---------------------------------------------------------------------------

describe("writeAttachmentAtomic", () => {
  const tmpDirs: string[] = [];

  afterEach(() => {
    for (const d of tmpDirs) rmrf(d);
    tmpDirs.length = 0;
  });

  it("creates file at correct date-based path", async () => {
    const base = makeTmpDir();
    tmpDirs.push(base);

    const bytes = Buffer.from("hello pearl");
    const ref = computeRef(bytes);
    const relPath = await writeAttachmentAtomic(
      base,
      ref,
      bytes,
      "image/webp",
    );

    const now = new Date();
    const yyyy = String(now.getFullYear());
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    expect(relPath).toBe(path.join(yyyy, mm, `${ref}.webp`));

    const written = fs.readFileSync(path.join(base, relPath));
    expect(written.equals(bytes)).toBe(true);
  });

  it("is atomic (no temp file left behind)", async () => {
    const base = makeTmpDir();
    tmpDirs.push(base);

    const bytes = Buffer.from("atomic test");
    const ref = computeRef(bytes);
    await writeAttachmentAtomic(base, ref, bytes, "image/png");

    // Walk the date directory and ensure no .tmp-* files remain.
    const now = new Date();
    const yyyy = String(now.getFullYear());
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dir = path.join(base, yyyy, mm);
    const entries = fs.readdirSync(dir);
    const tmpFiles = entries.filter((e) => e.startsWith(".tmp-"));
    expect(tmpFiles).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// validatePath
// ---------------------------------------------------------------------------

describe("validatePath", () => {
  it("accepts valid subpaths", () => {
    const base = "/data/attachments";
    expect(validatePath(base, "2025/04/abc123.webp")).toBe(
      path.resolve(base, "2025/04/abc123.webp"),
    );
  });

  it("rejects ../ traversal", () => {
    const base = "/data/attachments";
    expect(() => validatePath(base, "../../../etc/passwd")).toThrow(
      /Path traversal detected/,
    );
  });

  it("rejects absolute paths outside base", () => {
    const base = "/data/attachments";
    expect(() => validatePath(base, "/etc/passwd")).toThrow(
      /Path traversal detected/,
    );
  });

  it("rejects sibling prefix attacks", () => {
    const base = "/data/attachments";
    // "/data/attachments-evil/foo" starts with the base string but is NOT a child.
    expect(() => validatePath(base, "../attachments-evil/foo")).toThrow(
      /Path traversal detected/,
    );
  });
});

// ---------------------------------------------------------------------------
// computeRef
// ---------------------------------------------------------------------------

describe("computeRef", () => {
  it("produces consistent 12-hex output", () => {
    const bytes = Buffer.from("deterministic");
    const ref = computeRef(bytes);
    expect(ref).toMatch(/^[0-9a-f]{12}$/);
  });

  it("same bytes produce same ref", () => {
    const bytes = Buffer.from("same content");
    expect(computeRef(bytes)).toBe(computeRef(bytes));
  });

  it("different bytes produce different ref", () => {
    const a = Buffer.from("aaa");
    const b = Buffer.from("bbb");
    expect(computeRef(a)).not.toBe(computeRef(b));
  });
});

// ---------------------------------------------------------------------------
// fullSha256
// ---------------------------------------------------------------------------

describe("fullSha256", () => {
  it("returns a 64-character hex string", () => {
    const hash = fullSha256(Buffer.from("hello"));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("matches the leading 12 chars from computeRef", () => {
    const bytes = Buffer.from("consistency check");
    expect(fullSha256(bytes).slice(0, 12)).toBe(computeRef(bytes));
  });
});

// ---------------------------------------------------------------------------
// generateLocalDataBlock
// ---------------------------------------------------------------------------

describe("generateLocalDataBlock", () => {
  it("produces correct Pearl syntax", () => {
    const block = generateLocalDataBlock(
      "abc123def456",
      "image/webp",
      "project",
      "2025/04/abc123def456.webp",
      "abc123def456".padEnd(64, "0"),
    );
    expect(block).toContain("<!-- pearl-attachment:v1:abc123def456");
    expect(block).toContain("type: local");
    expect(block).toContain("mime: image/webp");
    expect(block).toContain("scope: project");
    expect(block).toContain("path: 2025/04/abc123def456.webp");
    expect(block).toContain("sha256:");
    expect(block).toContain("-->");
  });
});
