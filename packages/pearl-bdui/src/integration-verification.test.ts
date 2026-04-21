import { existsSync, mkdirSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { mkdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { LocalScope, Settings } from "@pearl/shared";
import {
  ATTACHMENT_HOST_FIELDS,
  DEFAULT_SETTINGS,
  hasAttachmentSyntax,
  serializeField,
} from "@pearl/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { scrubBase64 } from "./log-scrub.js";
import { OrphanSweep, type SweepDeps } from "./orphan-sweep.js";
import {
  _containsTraversalForTesting as containsTraversal,
  resolveAttachmentBase,
} from "./routes/attachments.js";
import { loadSettings, loadSettingsSync, saveSettings } from "./settings-loader.js";
import { computeHasAttachments } from "./write-service/sql-writer.js";

// ─── Helpers ────────────────────────────────────────────────

const WEBP_BYTES = Buffer.from(
  "UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA",
  "base64",
);

function makeSweepDeps(overrides: Partial<SweepDeps> = {}): SweepDeps {
  return {
    resolveAttachmentBase: (scope: LocalScope, projectRoot: string, _settings: Settings) =>
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

function makePill(ref: string): string {
  return `[img:${ref}]`;
}

function makeAttachmentBlock(ref: string): string {
  return `<!-- pearl-attachment:v1:${ref}
type: local
mime: image/webp
scope: project
path: .pearl/attachments/2026/04/${ref}.webp
sha256: ${"a".repeat(64)}
-->`;
}

// ─── Contract: Epic 5 <-> Epic 6 — Upload -> reference -> unreference -> sweep -> 404 ───

describe("Contract: Epic 5 <-> Epic 6 — Orphan sweep lifecycle", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = join(
      tmpdir(),
      `pearl-integ-sweep-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  function writeTestFile(ref: string, ext = "webp", ageSeconds = 0): string {
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

  it("full lifecycle: upload -> referenced -> unreferenced young -> unreferenced old -> deleted", async () => {
    const ref = "a1b2c3d4e5f6";

    // Step 1: Simulate upload — write file to temp dir
    const filePath = writeTestFile(ref, "webp", 0);
    expect(existsSync(filePath)).toBe(true);

    // Step 2: Age past grace period + mark as referenced — sweep skips it
    const oldTimeReferenced = new Date(Date.now() - 120 * 1000);
    utimesSync(filePath, oldTimeReferenced, oldTimeReferenced);

    const sweepReferenced = new OrphanSweep(
      makeSweepDeps({
        projectRoot: tmpDir,
        isRefReferenced: async (r) => r === ref,
        getSettings: async () => {
          const s = structuredClone(DEFAULT_SETTINGS);
          s.attachments.sweep.graceSeconds = 60;
          return s;
        },
      }),
    );

    const result1 = await sweepReferenced.runOnce();
    expect(result1.skippedReferenced).toBe(1);
    expect(result1.skippedYoung).toBe(0);
    expect(result1.deleted).toBe(0);
    expect(existsSync(filePath)).toBe(true);

    // Step 3: Reset to young + mark as unreferenced — sweep skips it (grace period)
    utimesSync(filePath, new Date(), new Date());
    const sweepUnrefYoung = new OrphanSweep(
      makeSweepDeps({
        projectRoot: tmpDir,
        isRefReferenced: async () => false,
        getSettings: async () => {
          const s = structuredClone(DEFAULT_SETTINGS);
          s.attachments.sweep.graceSeconds = 60;
          return s;
        },
      }),
    );

    const result2 = await sweepUnrefYoung.runOnce();
    expect(result2.skippedYoung).toBe(1);
    expect(result2.deleted).toBe(0);
    expect(existsSync(filePath)).toBe(true);

    // Step 4: Age file past grace period + mark unreferenced — sweep deletes it
    const oldTime = new Date(Date.now() - 120 * 1000);
    utimesSync(filePath, oldTime, oldTime);

    const sweepDelete = new OrphanSweep(
      makeSweepDeps({
        projectRoot: tmpDir,
        isRefReferenced: async () => false,
        getSettings: async () => {
          const s = structuredClone(DEFAULT_SETTINGS);
          s.attachments.sweep.graceSeconds = 60;
          return s;
        },
      }),
    );

    const result3 = await sweepDelete.runOnce();
    expect(result3.deleted).toBe(1);

    // Step 5: Verify file is gone (404 scenario)
    expect(existsSync(filePath)).toBe(false);
    await expect(stat(filePath)).rejects.toThrow();
  });
});

// ─── Contract: Failure injection #1 — POST-success/PATCH-fail ───

describe("Contract: Failure injection #1 — POST-success/PATCH-fail (orphan detection)", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = join(tmpdir(), `pearl-integ-fi1-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  function writeTestFile(ref: string, ext = "webp", ageSeconds = 0): string {
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

  it("orphan file (POST ok, PATCH never happened) is deleted after grace period", async () => {
    const ref = "deadbeef0123";

    // File exists on disk (POST succeeded) but never referenced (PATCH failed)
    const filePath = writeTestFile(ref, "webp", 7200);

    const sweep = new OrphanSweep(
      makeSweepDeps({
        projectRoot: tmpDir,
        isRefReferenced: async () => false, // PATCH never inserted the pill
      }),
    );

    const result = await sweep.runOnce();
    expect(result.deleted).toBe(1);
    expect(existsSync(filePath)).toBe(false);
  });

  it("NO false positive: in-flight upload (file younger than grace period) survives", async () => {
    const ref = "cafe12345678";

    // File just uploaded — age = 0 (well within grace period)
    const filePath = writeTestFile(ref, "webp", 0);

    const sweep = new OrphanSweep(
      makeSweepDeps({
        projectRoot: tmpDir,
        isRefReferenced: async () => false, // Not referenced yet (PATCH in flight)
      }),
    );

    const result = await sweep.runOnce();
    expect(result.skippedYoung).toBe(1);
    expect(result.deleted).toBe(0);
    expect(existsSync(filePath)).toBe(true);
  });
});

// ─── Contract: Failure injection #3 — Log scrub 5MB ───

describe("Contract: Failure injection #3 — Log scrub 5MB", () => {
  it("5MB inline attachment text is scrubbed to <= 1KB with no base64 leakage", () => {
    // Create a 5MB inline attachment string
    const fiveMB = "A".repeat(5 * 1024 * 1024);
    const text = `<!-- pearl-attachment:v1:abcdef123456
type: inline
mime: image/webp
data: ${fiveMB}
-->`;

    const result = scrubBase64(text);

    // Output length <= 1KB
    expect(result.length).toBeLessThanOrEqual(1024);

    // Output contains <redacted marker
    expect(result).toContain("<redacted");

    // No raw base64 substring of 100+ chars in output
    const longBase64Match = result.match(/[A-Za-z0-9+/=]{100,}/);
    expect(longBase64Match).toBeNull();
  });

  it("5MB raw data URI is scrubbed to contain redacted marker", () => {
    const fiveMB = "B".repeat(5 * 1024 * 1024);
    const text = `"data:image/webp;base64,${fiveMB}"`;

    const result = scrubBase64(text);

    expect(result).toContain("<redacted");
    expect(result.length).toBeLessThan(text.length);

    // No raw base64 substring of 100+ chars
    const longBase64Match = result.match(/[A-Za-z0-9+/=]{100,}/);
    expect(longBase64Match).toBeNull();
  });

  it("5MB raw base64 string is scrubbed", () => {
    const fiveMB = "C".repeat(5 * 1024 * 1024);
    const text = `some log line: ${fiveMB} end`;

    const result = scrubBase64(text);

    expect(result).toContain("<redacted");
    expect(result.length).toBeLessThan(text.length);

    const longBase64Match = result.match(/[A-Za-z0-9+/=]{100,}/);
    expect(longBase64Match).toBeNull();
  });
});

// ─── Contract: Failure injection #4 — Path traversal rejection ───

describe("Contract: Failure injection #4 — Path traversal rejection", () => {
  describe("containsTraversal", () => {
    it("rejects ../etc/passwd", () => {
      expect(containsTraversal("../etc/passwd")).toBe(true);
    });

    it("rejects foo/../../etc/passwd", () => {
      expect(containsTraversal("foo/../../etc/passwd")).toBe(true);
    });

    it("rejects ..\\\\windows\\\\system32 (backslash traversal)", () => {
      expect(containsTraversal("..\\windows\\system32")).toBe(true);
    });

    it("allows normal relative path", () => {
      expect(containsTraversal("foo/bar/baz")).toBe(false);
    });

    it("allows .pearl attachment path", () => {
      expect(containsTraversal(".pearl/attachments/2026/04")).toBe(false);
    });

    it("allows single dot in path", () => {
      expect(containsTraversal("./foo/bar")).toBe(false);
    });
  });

  describe("resolveAttachmentBase scope override safety", () => {
    it("resolveAttachmentBase returns override path when configured", () => {
      const settings = structuredClone(DEFAULT_SETTINGS);
      settings.attachments.local.projectPathOverride = "/safe/custom/path";
      const base = resolveAttachmentBase("project", "/projects/test", settings);
      expect(base).toBe("/safe/custom/path");
    });
  });

  describe("loadSettingsSync: path traversal in overrides", () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = resolve(
        tmpdir(),
        `pearl-integ-traverse-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      );
      mkdirSync(tmpDir, { recursive: true });
    });

    afterEach(() => {
      rmSync(tmpDir, { recursive: true, force: true });
    });

    it("rejects projectPathOverride containing path traversal and falls back to null", () => {
      const dir = resolve(tmpDir, ".pearl");
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        resolve(dir, "settings.json"),
        JSON.stringify({
          version: 1,
          attachments: {
            local: {
              projectPathOverride: "../../etc/passwd",
            },
          },
        }),
        "utf-8",
      );

      const result = loadSettingsSync(tmpDir);
      // Traversal path should be rejected — falls back to default (null)
      expect(result.attachments.local.projectPathOverride).toBeNull();
    });

    it("rejects userPathOverride containing backslash traversal", () => {
      const dir = resolve(tmpDir, ".pearl");
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        resolve(dir, "settings.json"),
        JSON.stringify({
          version: 1,
          attachments: {
            local: {
              userPathOverride: "foo\\..\\..\\etc\\passwd",
            },
          },
        }),
        "utf-8",
      );

      const result = loadSettingsSync(tmpDir);
      expect(result.attachments.local.userPathOverride).toBeNull();
    });

    it("accepts valid absolute path overrides", () => {
      const dir = resolve(tmpDir, ".pearl");
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        resolve(dir, "settings.json"),
        JSON.stringify({
          version: 1,
          attachments: {
            local: {
              projectPathOverride: "/safe/absolute/path",
              userPathOverride: "/another/safe/path",
            },
          },
        }),
        "utf-8",
      );

      const result = loadSettingsSync(tmpDir);
      expect(result.attachments.local.projectPathOverride).toBe("/safe/absolute/path");
      expect(result.attachments.local.userPathOverride).toBe("/another/safe/path");
    });
  });
});

// ─── Contract: Epic 2 <-> Epic 10 / Epic 10 <-> bd CLI — has_attachments reconciliation ───

describe("Contract: Epic 2 <-> Epic 10 — has_attachments reconciliation", () => {
  it("returns true for issue with attachment pill in description", () => {
    const fields = {
      description: `Some text ${makePill("abcdef123456")} more text`,
      design: "",
      acceptance_criteria: "",
      notes: "",
    };
    expect(computeHasAttachments(fields)).toBe(true);
  });

  it("returns true for issue with attachment block in notes", () => {
    const block = makeAttachmentBlock("abcdef123456");
    const fields = {
      description: "",
      design: "",
      acceptance_criteria: "",
      notes: `Some notes\n\n${block}`,
    };
    expect(computeHasAttachments(fields)).toBe(true);
  });

  it("returns true for issue with attachment in design field", () => {
    const fields = {
      description: "",
      design: `Design doc with ${makePill("fedcba654321")}`,
      acceptance_criteria: "",
      notes: "",
    };
    expect(computeHasAttachments(fields)).toBe(true);
  });

  it("returns false for issue with plain text in all fields", () => {
    const fields = {
      description: "Just plain text",
      design: "More plain text",
      acceptance_criteria: "Acceptance criteria here",
      notes: "Notes without attachments",
    };
    expect(computeHasAttachments(fields)).toBe(false);
  });

  it("returns false when attachment removed externally (bd CLI edit)", () => {
    // Simulates: user had an attachment, then edited via bd CLI to remove it
    const fields = {
      description: "Description after attachment was removed by bd CLI",
      design: "",
      acceptance_criteria: "",
      notes: "",
    };
    expect(computeHasAttachments(fields)).toBe(false);
  });

  it("returns true when attachment added externally (bd CLI edit)", () => {
    // Simulates: user added attachment pill via bd CLI
    const fields = {
      description: `Added via CLI: ${makePill("aabbccddeeff")}`,
      design: "",
      acceptance_criteria: "",
      notes: "",
    };
    expect(computeHasAttachments(fields)).toBe(true);
  });

  it("tests all four ATTACHMENT_HOST_FIELDS individually", () => {
    // Verify each host field is checked independently
    for (const field of ATTACHMENT_HOST_FIELDS) {
      const fields: Record<string, string> = {
        description: "",
        design: "",
        acceptance_criteria: "",
        notes: "",
      };
      fields[field] = `Text with ${makePill("112233445566")}`;

      expect(computeHasAttachments(fields)).toBe(true);
    }
  });

  it("returns false when non-host fields contain attachment syntax", () => {
    const fields = {
      description: "",
      design: "",
      acceptance_criteria: "",
      notes: "",
      title: `Title with ${makePill("abcdef123456")}`, // title is NOT a host field
      status: "open",
    };
    expect(computeHasAttachments(fields)).toBe(false);
  });

  it("confirms ATTACHMENT_HOST_FIELDS contains exactly the expected fields", () => {
    expect([...ATTACHMENT_HOST_FIELDS]).toEqual([
      "description",
      "design",
      "acceptance_criteria",
      "notes",
    ]);
  });

  it("detects attachment block syntax (not just pills)", () => {
    const block = makeAttachmentBlock("aabbccddeeff");
    const fields = {
      description: `Text\n\n${block}`,
      design: "",
      acceptance_criteria: "",
      notes: "",
    };
    expect(computeHasAttachments(fields)).toBe(true);
  });

  it("hasAttachmentSyntax agrees with computeHasAttachments for attachment pill", () => {
    const text = `Some text ${makePill("abcdef123456")}`;
    expect(hasAttachmentSyntax(text)).toBe(true);
    expect(computeHasAttachments({ description: text })).toBe(true);
  });

  it("hasAttachmentSyntax agrees with computeHasAttachments for plain text", () => {
    const text = "Just plain text";
    expect(hasAttachmentSyntax(text)).toBe(false);
    expect(computeHasAttachments({ description: text })).toBe(false);
  });
});

// ─── Contract: Failure injection #7 — Settings change mid-upload ───

describe("Contract: Failure injection #7 — Settings change mid-upload", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = join(
      tmpdir(),
      `pearl-integ-settings-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("each load call gets current settings, not stale cached values", async () => {
    // Step 1: Save settings with storageMode=inline
    const inlineSettings = structuredClone(DEFAULT_SETTINGS);
    inlineSettings.attachments.storageMode = "inline";
    await saveSettings(tmpDir, inlineSettings);

    // Step 2: Load settings — verify inline
    const loaded1 = await loadSettings(tmpDir);
    expect(loaded1.attachments.storageMode).toBe("inline");

    // Step 3: Save settings with storageMode=local
    const localSettings = structuredClone(DEFAULT_SETTINGS);
    localSettings.attachments.storageMode = "local";
    await saveSettings(tmpDir, localSettings);

    // Step 4: Load again — verify local (not stale inline)
    const loaded2 = await loadSettings(tmpDir);
    expect(loaded2.attachments.storageMode).toBe("local");
  });

  it("loadSettingsSync also reads fresh values after save", async () => {
    const settings1 = structuredClone(DEFAULT_SETTINGS);
    settings1.attachments.storageMode = "inline";
    settings1.attachments.local.scope = "user";
    await saveSettings(tmpDir, settings1);

    const loaded1 = loadSettingsSync(tmpDir);
    expect(loaded1.attachments.storageMode).toBe("inline");
    expect(loaded1.attachments.local.scope).toBe("user");

    const settings2 = structuredClone(DEFAULT_SETTINGS);
    settings2.attachments.storageMode = "local";
    settings2.attachments.local.scope = "project";
    settings2.attachments.encoding.maxBytes = 500_000;
    await saveSettings(tmpDir, settings2);

    const loaded2 = loadSettingsSync(tmpDir);
    expect(loaded2.attachments.storageMode).toBe("local");
    expect(loaded2.attachments.local.scope).toBe("project");
    expect(loaded2.attachments.encoding.maxBytes).toBe(500_000);
  });

  it("settings snapshot is independent — mutating returned object does not affect next load", async () => {
    await saveSettings(tmpDir, structuredClone(DEFAULT_SETTINGS));

    const loaded1 = await loadSettings(tmpDir);
    // Mutate the returned object
    loaded1.attachments.storageMode = "inline";
    loaded1.attachments.encoding.maxBytes = 999;

    // Next load should return the on-disk values, unaffected by mutation
    const loaded2 = await loadSettings(tmpDir);
    expect(loaded2.attachments.storageMode).toBe("local"); // DEFAULT is "local"
    expect(loaded2.attachments.encoding.maxBytes).toBe(1_048_576); // DEFAULT
  });
});
