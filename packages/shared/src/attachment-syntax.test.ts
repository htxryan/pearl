import { describe, expect, it } from "vitest";
import {
  type AttachmentBlock,
  createRef,
  disambiguateRefs,
  extractBlocks,
  extractPills,
  hasAttachmentSyntax,
  type InlineAttachment,
  isRef,
  type LocalAttachment,
  parseField,
  parseFieldAsync,
  type Ref,
  serializeField,
} from "./attachment-syntax.js";

// ─── Test fixtures ──────────────────────────────────────────

const SAMPLE_REF_1 = "a1b2c3d4e5f6" as Ref;
const SAMPLE_REF_2 = "f6e5d4c3b2a1" as Ref;
const SAMPLE_BASE64 = "UklGRh4AAABXRUJQVlA4IBIAAAAwAQCdASoBAAEAAkA4JZQCdAEO/hepAA==";
const SAMPLE_SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

const INLINE_BLOCK: InlineAttachment = {
  type: "inline",
  ref: SAMPLE_REF_1,
  mime: "image/webp",
  data: SAMPLE_BASE64,
};

const LOCAL_BLOCK: LocalAttachment = {
  type: "local",
  ref: SAMPLE_REF_2,
  mime: "image/webp",
  scope: "project",
  path: "attachments/2026/04/a1b2c3d4.webp",
  sha256: SAMPLE_SHA256,
};

function makeInlineBlockText(ref: string, mime: string, data: string): string {
  return `<!-- pearl-attachment:v1:${ref}\ntype: inline\nmime: ${mime}\ndata: ${data}\n-->`;
}

function makeLocalBlockText(
  ref: string,
  mime: string,
  scope: string,
  path: string,
  sha256: string,
): string {
  return `<!-- pearl-attachment:v1:${ref}\ntype: local\nmime: ${mime}\nscope: ${scope}\npath: ${path}\nsha256: ${sha256}\n-->`;
}

// ─── Ref type ──────────────────────────────────────────────

describe("Ref", () => {
  it("isRef accepts valid 12-hex-char strings", () => {
    expect(isRef("a1b2c3d4e5f6")).toBe(true);
    expect(isRef("000000000000")).toBe(true);
    expect(isRef("ffffffffffff")).toBe(true);
  });

  it("isRef rejects invalid strings", () => {
    expect(isRef("abc123")).toBe(false); // too short
    expect(isRef("A1B2C3D4E5F6")).toBe(false); // uppercase
    expect(isRef("a1b2c3d4e5f6a")).toBe(false); // too long
    expect(isRef("g1b2c3d4e5f6")).toBe(false); // non-hex
    expect(isRef("")).toBe(false);
  });

  it("createRef returns branded Ref for valid input", () => {
    const ref = createRef("a1b2c3d4e5f6");
    expect(ref).toBe("a1b2c3d4e5f6");
  });

  it("createRef throws for invalid input", () => {
    expect(() => createRef("short")).toThrow("Invalid ref");
    expect(() => createRef("UPPERCASE123")).toThrow("Invalid ref");
  });
});

// ─── extractPills ───────────────────────────────────────────

describe("extractPills", () => {
  it("extracts a single pill reference", () => {
    const text = `Here is an image: [img:${SAMPLE_REF_1}] in the text.`;
    const pills = extractPills(text);
    expect(pills).toHaveLength(1);
    expect(pills[0].ref).toBe(SAMPLE_REF_1);
    expect(pills[0].start).toBe(text.indexOf("[img:"));
    expect(pills[0].end).toBe(text.indexOf("]", pills[0].start) + 1);
  });

  it("extracts multiple pill references", () => {
    const text = `Image A: [img:${SAMPLE_REF_1}], Image B: [img:${SAMPLE_REF_2}].`;
    const pills = extractPills(text);
    expect(pills).toHaveLength(2);
    expect(pills[0].ref).toBe(SAMPLE_REF_1);
    expect(pills[1].ref).toBe(SAMPLE_REF_2);
  });

  it("returns empty array for text with no pills", () => {
    const pills = extractPills("No images here, just plain text.");
    expect(pills).toHaveLength(0);
  });

  it("ignores malformed pills (wrong ref length)", () => {
    const pills = extractPills("[img:abc123]");
    expect(pills).toHaveLength(0);
  });

  it("ignores pills with uppercase hex", () => {
    const pills = extractPills("[img:A1B2C3D4E5F6]");
    expect(pills).toHaveLength(0);
  });
});

// ─── extractBlocks ──────────────────────────────────────────

describe("extractBlocks", () => {
  it("extracts an inline data block", () => {
    const text = makeInlineBlockText(SAMPLE_REF_1, "image/webp", SAMPLE_BASE64);
    const blocks = extractBlocks(text);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("inline");
    expect(blocks[0].ref).toBe(SAMPLE_REF_1);
    expect(blocks[0].mime).toBe("image/webp");
    expect((blocks[0] as InlineAttachment).data).toBe(SAMPLE_BASE64);
  });

  it("extracts a local data block", () => {
    const text = makeLocalBlockText(
      SAMPLE_REF_2,
      "image/webp",
      "project",
      "attachments/2026/04/a1b2c3d4.webp",
      SAMPLE_SHA256,
    );
    const blocks = extractBlocks(text);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("local");
    expect(blocks[0].ref).toBe(SAMPLE_REF_2);
    const local = blocks[0] as LocalAttachment;
    expect(local.scope).toBe("project");
    expect(local.path).toBe("attachments/2026/04/a1b2c3d4.webp");
    expect(local.sha256).toBe(SAMPLE_SHA256);
  });

  it("extracts multiple blocks", () => {
    const text = [
      makeInlineBlockText(SAMPLE_REF_1, "image/webp", SAMPLE_BASE64),
      makeLocalBlockText(
        SAMPLE_REF_2,
        "image/webp",
        "project",
        "attachments/2026/04/a1b2c3d4.webp",
        SAMPLE_SHA256,
      ),
    ].join("\n\n");
    const blocks = extractBlocks(text);
    expect(blocks).toHaveLength(2);
  });

  it("skips blocks with unknown version (v2)", () => {
    const text = `<!-- pearl-attachment:v2:${SAMPLE_REF_1}\ntype: inline\nmime: image/webp\ndata: ${SAMPLE_BASE64}\n-->`;
    const blocks = extractBlocks(text);
    expect(blocks).toHaveLength(0);
  });

  it("skips blocks with missing required fields", () => {
    const text = `<!-- pearl-attachment:v1:${SAMPLE_REF_1}\ntype: inline\nmime: image/webp\n-->`;
    const blocks = extractBlocks(text);
    expect(blocks).toHaveLength(0);
  });

  it("skips blocks with missing type field", () => {
    const text = `<!-- pearl-attachment:v1:${SAMPLE_REF_1}\nmime: image/webp\ndata: ${SAMPLE_BASE64}\n-->`;
    const blocks = extractBlocks(text);
    expect(blocks).toHaveLength(0);
  });

  it("skips blocks with unknown type", () => {
    const text = `<!-- pearl-attachment:v1:${SAMPLE_REF_1}\ntype: remote\nmime: image/webp\nurl: https://example.com/img.webp\n-->`;
    const blocks = extractBlocks(text);
    expect(blocks).toHaveLength(0);
  });

  it("skips local blocks missing sha256", () => {
    const text = `<!-- pearl-attachment:v1:${SAMPLE_REF_2}\ntype: local\nmime: image/webp\nscope: project\npath: attachments/img.webp\n-->`;
    const blocks = extractBlocks(text);
    expect(blocks).toHaveLength(0);
  });

  it("handles CRLF line endings", () => {
    const text = `<!-- pearl-attachment:v1:${SAMPLE_REF_1}\r\ntype: inline\r\nmime: image/webp\r\ndata: ${SAMPLE_BASE64}\r\n-->`;
    const blocks = extractBlocks(text);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].ref).toBe(SAMPLE_REF_1);
    expect((blocks[0] as InlineAttachment).data).toBe(SAMPLE_BASE64);
  });

  it("tolerates trailing whitespace after ref", () => {
    const text = `<!-- pearl-attachment:v1:${SAMPLE_REF_1}  \ntype: inline\nmime: image/webp\ndata: ${SAMPLE_BASE64}\n-->`;
    const blocks = extractBlocks(text);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].ref).toBe(SAMPLE_REF_1);
  });

  it("rejects invalid MIME types", () => {
    const text = `<!-- pearl-attachment:v1:${SAMPLE_REF_1}\ntype: inline\nmime: not a valid mime\ndata: ${SAMPLE_BASE64}\n-->`;
    const blocks = extractBlocks(text);
    expect(blocks).toHaveLength(0);
  });

  it("rejects invalid sha256 in local blocks", () => {
    const text = `<!-- pearl-attachment:v1:${SAMPLE_REF_2}\ntype: local\nmime: image/webp\nscope: project\npath: attachments/img.webp\nsha256: not-a-hash\n-->`;
    const blocks = extractBlocks(text);
    expect(blocks).toHaveLength(0);
  });

  it("rejects path traversal in local blocks", () => {
    const text = `<!-- pearl-attachment:v1:${SAMPLE_REF_2}\ntype: local\nmime: image/webp\nscope: project\npath: ../../../etc/passwd\nsha256: ${SAMPLE_SHA256}\n-->`;
    const blocks = extractBlocks(text);
    expect(blocks).toHaveLength(0);
  });
});

// ─── parseField ─────────────────────────────────────────────

describe("parseField", () => {
  it("parses a field with one inline attachment", () => {
    const prose = `Screenshot: [img:${SAMPLE_REF_1}]`;
    const block = makeInlineBlockText(SAMPLE_REF_1, "image/webp", SAMPLE_BASE64);
    const text = `${prose}\n\n${block}`;

    const result = parseField(text);
    expect(result.prose).toBe(prose);
    expect(result.refsInProse).toEqual([SAMPLE_REF_1]);
    expect(result.blocks.size).toBe(1);
    expect(result.blocks.get(SAMPLE_REF_1)?.type).toBe("inline");
    expect(result.broken).toHaveLength(0);
  });

  it("parses a field with multiple attachments (mix of inline and local)", () => {
    const prose = `Image A: [img:${SAMPLE_REF_1}] and Image B: [img:${SAMPLE_REF_2}]`;
    const blocks = [
      makeInlineBlockText(SAMPLE_REF_1, "image/webp", SAMPLE_BASE64),
      makeLocalBlockText(
        SAMPLE_REF_2,
        "image/webp",
        "project",
        "attachments/2026/04/a1b2c3d4.webp",
        SAMPLE_SHA256,
      ),
    ].join("\n\n");
    const text = `${prose}\n\n${blocks}`;

    const result = parseField(text);
    expect(result.prose).toBe(prose);
    expect(result.refsInProse).toHaveLength(2);
    expect(result.blocks.size).toBe(2);
    expect(result.blocks.get(SAMPLE_REF_1)?.type).toBe("inline");
    expect(result.blocks.get(SAMPLE_REF_2)?.type).toBe("local");
    expect(result.broken).toHaveLength(0);
  });

  it("reports refs in prose that have no matching data block", () => {
    const prose = `Image: [img:${SAMPLE_REF_1}]`;
    const result = parseField(prose);
    expect(result.refsInProse).toEqual([SAMPLE_REF_1]);
    expect(result.blocks.size).toBe(0);
  });

  it("parses blocks without matching pills", () => {
    const prose = "No images here.";
    const block = makeInlineBlockText(SAMPLE_REF_1, "image/webp", SAMPLE_BASE64);
    const text = `${prose}\n\n${block}`;

    const result = parseField(text);
    expect(result.refsInProse).toHaveLength(0);
    expect(result.blocks.size).toBe(1);
    expect(result.blocks.has(SAMPLE_REF_1)).toBe(true);
  });

  it("parses field with no attachments (passthrough)", () => {
    const text = "Just a plain description with no images.";
    const result = parseField(text);
    expect(result.prose).toBe(text);
    expect(result.refsInProse).toHaveLength(0);
    expect(result.blocks.size).toBe(0);
    expect(result.broken).toHaveLength(0);
  });

  it("handles CRLF line endings throughout", () => {
    const prose = `Screenshot: [img:${SAMPLE_REF_1}]`;
    const block = `<!-- pearl-attachment:v1:${SAMPLE_REF_1}\r\ntype: inline\r\nmime: image/webp\r\ndata: ${SAMPLE_BASE64}\r\n-->`;
    const text = `${prose}\r\n\r\n${block}`;

    const result = parseField(text);
    expect(result.prose).toBe(prose);
    expect(result.refsInProse).toHaveLength(1);
    expect(result.blocks.size).toBe(1);
  });

  it("reports interleaved blocks as broken (UCA-9)", () => {
    const prose = `Image: [img:${SAMPLE_REF_1}]`;
    const block = makeInlineBlockText(SAMPLE_REF_1, "image/webp", SAMPLE_BASE64);
    const text = `${prose}\n${block}`;

    const result = parseField(text);
    expect(result.blocks.size).toBe(0);
    expect(result.broken).toHaveLength(1);
    expect(result.broken[0].ref).toBe(SAMPLE_REF_1);
    expect(result.broken[0].reason).toContain("interleaved");
    expect(result.prose).not.toContain("pearl-attachment");
    expect(result.prose).toContain(`[img:${SAMPLE_REF_1}]`);
  });

  it("reports malformed blocks in broken[] with reason (U4)", () => {
    const prose = `Good: [img:${SAMPLE_REF_1}] Bad: [img:${SAMPLE_REF_2}]`;
    const goodBlock = makeInlineBlockText(SAMPLE_REF_1, "image/webp", SAMPLE_BASE64);
    const badBlock = `<!-- pearl-attachment:v1:${SAMPLE_REF_2}\ntype: inline\nmime: image/webp\n-->`;
    const text = `${prose}\n\n${goodBlock}\n\n${badBlock}`;

    const result = parseField(text);
    expect(result.blocks.size).toBe(1);
    expect(result.blocks.has(SAMPLE_REF_1)).toBe(true);
    expect(result.broken).toHaveLength(1);
    expect(result.broken[0].ref).toBe(SAMPLE_REF_2);
    expect(result.broken[0].reason).toContain("data");
  });

  it("reports unknown version blocks in broken[] (U4)", () => {
    const prose = `Image: [img:${SAMPLE_REF_1}]`;
    const block = `<!-- pearl-attachment:v2:${SAMPLE_REF_1}\ntype: inline\nmime: image/webp\ndata: ${SAMPLE_BASE64}\n-->`;
    const text = `${prose}\n\n${block}`;

    const result = parseField(text);
    expect(result.blocks.size).toBe(0);
    expect(result.broken).toHaveLength(1);
    expect(result.broken[0].reason).toContain("unsupported version");
  });

  it("never throws on any input (U4)", () => {
    const inputs = [
      "",
      "plain text",
      "<!-- not a pearl block -->",
      "<!-- pearl-attachment:v1:short\n-->",
      `<!-- pearl-attachment:v1:${SAMPLE_REF_1}\n-->`,
      "<!-- pearl-attachment:v99:a1b2c3d4e5f6\ngarbage\n-->",
      "\0\x01\x02\x03",
      "\n\n\n",
    ];
    for (const input of inputs) {
      expect(() => parseField(input)).not.toThrow();
    }
  });

  it("does not corrupt prose when invalid blocks are present (X5)", () => {
    const prose = "Important text with **markdown** and `code`.";
    const badBlock = `<!-- pearl-attachment:v1:${SAMPLE_REF_1}\ntype: inline\nmime: image/webp\n-->`;
    const text = `${prose}\n\n${badBlock}`;

    const result = parseField(text);
    expect(result.prose).toBe(prose);
  });
});

// ─── serializeField ─────────────────────────────────────────

describe("serializeField", () => {
  it("serializes prose with no blocks", () => {
    expect(serializeField("Just text, no images.", [])).toBe("Just text, no images.");
  });

  it("serializes prose with an inline block", () => {
    const output = serializeField(`Screenshot: [img:${SAMPLE_REF_1}]`, [INLINE_BLOCK]);
    expect(output).toContain(`[img:${SAMPLE_REF_1}]`);
    expect(output).toContain("<!-- pearl-attachment:v1:");
    expect(output).toContain(`data: ${SAMPLE_BASE64}`);
    expect(output).toContain(`]\n\n<!-- pearl-attachment`);
  });

  it("serializes prose with a local block", () => {
    const output = serializeField(`Diagram: [img:${SAMPLE_REF_2}]`, [LOCAL_BLOCK]);
    expect(output).toContain("type: local");
    expect(output).toContain("scope: project");
    expect(output).toContain("path: attachments/2026/04/a1b2c3d4.webp");
    expect(output).toContain(`sha256: ${SAMPLE_SHA256}`);
  });

  it("serializes multiple blocks separated by blank lines", () => {
    const output = serializeField(`A: [img:${SAMPLE_REF_1}] B: [img:${SAMPLE_REF_2}]`, [
      INLINE_BLOCK,
      LOCAL_BLOCK,
    ]);
    const blockParts = output.split("-->");
    expect(blockParts.length).toBeGreaterThanOrEqual(3);
  });

  it("trims trailing newlines from prose before appending blocks (U10)", () => {
    const output = serializeField(`Text with trailing newlines\n\n\n`, [INLINE_BLOCK]);
    expect(output).toMatch(/newlines\n\n<!-- pearl-attachment/);
  });
});

// ─── Round-trip identity ────────────────────────────────────

describe("round-trip", () => {
  it("serialize → parse → serialize produces identical output (U5)", () => {
    const prose = `Here is image A [img:${SAMPLE_REF_1}] and image B [img:${SAMPLE_REF_2}].`;
    const serialized1 = serializeField(prose, [INLINE_BLOCK, LOCAL_BLOCK]);
    const parsed = parseField(serialized1);

    const serialized2 = serializeField(parsed.prose, [...parsed.blocks.values()]);
    expect(serialized2).toBe(serialized1);
  });

  it("parse → serialize → parse produces identical structure (U5)", () => {
    const prose = `Screenshot: [img:${SAMPLE_REF_1}]`;
    const block = makeInlineBlockText(SAMPLE_REF_1, "image/webp", SAMPLE_BASE64);
    const original = `${prose}\n\n${block}`;

    const parsed1 = parseField(original);
    const reserialized = serializeField(parsed1.prose, [...parsed1.blocks.values()]);
    const parsed2 = parseField(reserialized);

    expect(parsed2.prose).toBe(parsed1.prose);
    expect(parsed2.refsInProse).toEqual(parsed1.refsInProse);
    expect([...parsed2.blocks.entries()]).toEqual([...parsed1.blocks.entries()]);
  });
});

// ─── parseFieldAsync (U12) ──────────────────────────────────

describe("parseFieldAsync", () => {
  it("returns a Promise that resolves to ParsedField for small inputs (sync path)", async () => {
    const prose = `Screenshot: [img:${SAMPLE_REF_1}]`;
    const block = makeInlineBlockText(SAMPLE_REF_1, "image/webp", SAMPLE_BASE64);
    const text = `${prose}\n\n${block}`;

    const result = await parseFieldAsync(text);
    expect(result.prose).toBe(prose);
    expect(result.refsInProse).toEqual([SAMPLE_REF_1]);
    expect(result.blocks.size).toBe(1);
    expect(result.broken).toHaveLength(0);
  });

  it("matches parseField output exactly for sync path", async () => {
    const text = `Image [img:${SAMPLE_REF_1}]\n\n${makeInlineBlockText(SAMPLE_REF_1, "image/webp", SAMPLE_BASE64)}`;
    const syncResult = parseField(text);
    const asyncResult = await parseFieldAsync(text);

    expect(asyncResult.prose).toBe(syncResult.prose);
    expect(asyncResult.refsInProse).toEqual(syncResult.refsInProse);
    expect([...asyncResult.blocks.entries()]).toEqual([...syncResult.blocks.entries()]);
    expect(asyncResult.broken).toEqual(syncResult.broken);
  });

  it("handles empty input", async () => {
    const result = await parseFieldAsync("");
    expect(result.prose).toBe("");
    expect(result.blocks.size).toBe(0);
  });

  it("handles 1MB field via sync fallback (AC-8 smoke test)", async () => {
    const padding = "x".repeat(1024 * 1024);
    const ref = "abcdef012345" as Ref;
    const block = makeInlineBlockText(ref, "image/webp", SAMPLE_BASE64);
    const text = `${padding} [img:${ref}]\n\n${block}`;

    const result = await parseFieldAsync(text);
    expect(result.refsInProse).toEqual([ref]);
    expect(result.blocks.size).toBe(1);
    expect(result.broken).toHaveLength(0);
  });
});

// ─── hasAttachmentSyntax ────────────────────────────────────

describe("hasAttachmentSyntax", () => {
  it("returns true for text with pill references", () => {
    expect(hasAttachmentSyntax(`See [img:${SAMPLE_REF_1}] here`)).toBe(true);
  });

  it("returns true for text with data blocks", () => {
    const text = makeInlineBlockText(SAMPLE_REF_1, "image/webp", SAMPLE_BASE64);
    expect(hasAttachmentSyntax(text)).toBe(true);
  });

  it("returns true for text with both pills and blocks", () => {
    const text = `[img:${SAMPLE_REF_1}]\n\n${makeInlineBlockText(SAMPLE_REF_1, "image/webp", SAMPLE_BASE64)}`;
    expect(hasAttachmentSyntax(text)).toBe(true);
  });

  it("returns false for plain text", () => {
    expect(hasAttachmentSyntax("Just plain text")).toBe(false);
  });

  it("returns false for similar-looking but invalid syntax", () => {
    expect(hasAttachmentSyntax("[img:short]")).toBe(false);
    expect(hasAttachmentSyntax("[img:UPPERCASEHEX]")).toBe(false);
  });

  it("returns true for block-only (no pills)", () => {
    expect(hasAttachmentSyntax("<!-- pearl-attachment:v1:abc -->")).toBe(true);
  });

  it("returns false for empty string", () => {
    expect(hasAttachmentSyntax("")).toBe(false);
  });
});

// ─── disambiguateRefs (X3) ──────────────────────────────────

describe("disambiguateRefs", () => {
  it("returns blocks unchanged when all refs are unique", () => {
    const result = disambiguateRefs([INLINE_BLOCK, LOCAL_BLOCK]);
    expect(result).toHaveLength(2);
    expect(result[0].ref).toBe(SAMPLE_REF_1);
    expect(result[1].ref).toBe(SAMPLE_REF_2);
  });

  it("disambiguates duplicate refs deterministically", () => {
    const dup1: InlineAttachment = { ...INLINE_BLOCK };
    const dup2: InlineAttachment = {
      ...INLINE_BLOCK,
      data: "different_data",
    };
    const result = disambiguateRefs([dup1, dup2]);
    expect(result).toHaveLength(2);
    expect(result[0].ref).toBe(SAMPLE_REF_1);
    expect(result[1].ref).not.toBe(SAMPLE_REF_1);
    expect(result[1].ref).toHaveLength(12);
  });

  it("produces stable results across calls", () => {
    const dup1: InlineAttachment = { ...INLINE_BLOCK };
    const dup2: InlineAttachment = {
      ...INLINE_BLOCK,
      data: "different_data",
    };
    const result1 = disambiguateRefs([dup1, dup2]);
    const result2 = disambiguateRefs([dup1, dup2]);
    expect(result1[0].ref).toBe(result2[0].ref);
    expect(result1[1].ref).toBe(result2[1].ref);
  });

  it("handles triple collision", () => {
    const blocks: InlineAttachment[] = [
      { ...INLINE_BLOCK, data: "data1" },
      { ...INLINE_BLOCK, data: "data2" },
      { ...INLINE_BLOCK, data: "data3" },
    ];
    const result = disambiguateRefs(blocks);
    const refs = result.map((b) => b.ref);
    const unique = new Set(refs);
    expect(unique.size).toBe(3);
  });

  it("returns empty array for empty input", () => {
    expect(disambiguateRefs([])).toEqual([]);
  });

  it("throws on overflow (>255 collisions)", () => {
    const blocks: InlineAttachment[] = Array.from({ length: 257 }, (_, i) => ({
      ...INLINE_BLOCK,
      data: `data${i}`,
    }));
    expect(() => disambiguateRefs(blocks)).toThrow("Too many collisions");
  });

  it("avoids secondary collision with existing ref", () => {
    const baseRef = "a1b2c3d4e500" as Ref;
    const collisionTarget = "a1b2c3d4e501" as Ref;
    const blocks: InlineAttachment[] = [
      { ...INLINE_BLOCK, ref: baseRef, data: "data1" },
      { ...INLINE_BLOCK, ref: baseRef, data: "data2" },
      { ...INLINE_BLOCK, ref: collisionTarget, data: "data3" },
    ];
    const result = disambiguateRefs(blocks);
    const refs = result.map((b) => b.ref);
    const unique = new Set(refs);
    expect(unique.size).toBe(3);
    expect(refs).toContain(collisionTarget);
  });
});

// ─── Round-trip fuzz test (AC-4) ────────────────────────────

describe("round-trip fuzz", () => {
  function randomHex(len: number): string {
    return Array.from({ length: len }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  }

  function randomRef(): Ref {
    return randomHex(12) as Ref;
  }

  function randomBlock(ref: Ref): AttachmentBlock {
    if (Math.random() < 0.5) {
      return {
        type: "inline",
        ref,
        mime: "image/webp",
        data: btoa(randomHex(20)),
      };
    }
    return {
      type: "local",
      ref,
      mime: "image/png",
      scope: Math.random() < 0.5 ? "project" : "user",
      path: `attachments/${randomHex(8)}.png`,
      sha256: randomHex(64),
    };
  }

  it("random fields survive serialize → parse → serialize (100 iterations)", () => {
    for (let i = 0; i < 100; i++) {
      const numBlocks = Math.floor(Math.random() * 4) + 1;
      const blocks: AttachmentBlock[] = [];
      const proseFragments: string[] = ["Prose start."];

      for (let j = 0; j < numBlocks; j++) {
        const ref = randomRef();
        blocks.push(randomBlock(ref));
        proseFragments.push(`See [img:${ref}] here.`);
      }

      const prose = proseFragments.join(" ");
      const serialized1 = serializeField(prose, blocks);
      const parsed = parseField(serialized1);
      const serialized2 = serializeField(parsed.prose, [...parsed.blocks.values()]);

      expect(serialized2).toBe(serialized1);
    }
  });
});

// ─── Edge cases for coverage ────────────────────────────────

describe("edge cases", () => {
  it("parseField handles text starting with block comment (no prose)", () => {
    const block = makeInlineBlockText(SAMPLE_REF_1, "image/webp", SAMPLE_BASE64);
    const result = parseField(block);
    expect(result.prose).toBe("");
    expect(result.blocks.size).toBe(1);
  });

  it("parseField handles scope: user in local blocks", () => {
    const block = makeLocalBlockText(
      SAMPLE_REF_2,
      "image/webp",
      "user",
      "attachments/img.webp",
      SAMPLE_SHA256,
    );
    const text = `Image [img:${SAMPLE_REF_2}]\n\n${block}`;
    const result = parseField(text);
    expect(result.blocks.size).toBe(1);
    const local = result.blocks.get(SAMPLE_REF_2) as LocalAttachment;
    expect(local.scope).toBe("user");
  });

  it("parseField reports invalid scope in broken[]", () => {
    const block = `<!-- pearl-attachment:v1:${SAMPLE_REF_1}\ntype: local\nmime: image/webp\nscope: global\npath: img.webp\nsha256: ${SAMPLE_SHA256}\n-->`;
    const text = `Text\n\n${block}`;
    const result = parseField(text);
    expect(result.blocks.size).toBe(0);
    expect(result.broken).toHaveLength(1);
    expect(result.broken[0].reason).toContain("invalid scope");
  });

  it("parseField reports missing scope in local block", () => {
    const block = `<!-- pearl-attachment:v1:${SAMPLE_REF_1}\ntype: local\nmime: image/webp\npath: img.webp\nsha256: ${SAMPLE_SHA256}\n-->`;
    const text = `Text\n\n${block}`;
    const result = parseField(text);
    expect(result.broken).toHaveLength(1);
    expect(result.broken[0].reason).toContain("scope");
  });

  it("parseField reports missing path in local block", () => {
    const block = `<!-- pearl-attachment:v1:${SAMPLE_REF_1}\ntype: local\nmime: image/webp\nscope: project\nsha256: ${SAMPLE_SHA256}\n-->`;
    const text = `Text\n\n${block}`;
    const result = parseField(text);
    expect(result.broken).toHaveLength(1);
    expect(result.broken[0].reason).toContain("path");
  });

  it("parseField reports unknown block type in broken[]", () => {
    const block = `<!-- pearl-attachment:v1:${SAMPLE_REF_1}\ntype: remote\nmime: image/webp\nurl: https://example.com\n-->`;
    const text = `Text\n\n${block}`;
    const result = parseField(text);
    expect(result.broken).toHaveLength(1);
    expect(result.broken[0].reason).toContain("unknown block type");
  });

  it("parseField reports missing type in broken[]", () => {
    const block = `<!-- pearl-attachment:v1:${SAMPLE_REF_1}\nmime: image/webp\ndata: abc\n-->`;
    const text = `Text\n\n${block}`;
    const result = parseField(text);
    expect(result.broken).toHaveLength(1);
    expect(result.broken[0].reason).toContain("missing type");
  });

  it("parseField reports missing mime in broken[]", () => {
    const block = `<!-- pearl-attachment:v1:${SAMPLE_REF_1}\ntype: inline\ndata: abc\n-->`;
    const text = `Text\n\n${block}`;
    const result = parseField(text);
    expect(result.broken).toHaveLength(1);
    expect(result.broken[0].reason).toContain("missing mime");
  });

  it("parseField reports invalid mime in broken[]", () => {
    const block = `<!-- pearl-attachment:v1:${SAMPLE_REF_1}\ntype: inline\nmime: not valid\ndata: abc\n-->`;
    const text = `Text\n\n${block}`;
    const result = parseField(text);
    expect(result.broken).toHaveLength(1);
    expect(result.broken[0].reason).toContain("invalid mime");
  });

  it("parseField reports invalid sha256 in broken[]", () => {
    const block = `<!-- pearl-attachment:v1:${SAMPLE_REF_1}\ntype: local\nmime: image/webp\nscope: project\npath: img.webp\nsha256: badhash\n-->`;
    const text = `Text\n\n${block}`;
    const result = parseField(text);
    expect(result.broken).toHaveLength(1);
    expect(result.broken[0].reason).toContain("invalid sha256");
  });

  it("parseField reports path traversal in broken[]", () => {
    const block = `<!-- pearl-attachment:v1:${SAMPLE_REF_1}\ntype: local\nmime: image/webp\nscope: project\npath: ../../etc/passwd\nsha256: ${SAMPLE_SHA256}\n-->`;
    const text = `Text\n\n${block}`;
    const result = parseField(text);
    expect(result.broken).toHaveLength(1);
    expect(result.broken[0].reason).toContain("path traversal");
  });

  it("serializeField throws if inline data contains -->", () => {
    const block: InlineAttachment = {
      ...INLINE_BLOCK,
      data: "abc-->def",
    };
    expect(() => serializeField("Prose", [block])).toThrow('contains "-->"');
  });

  it("serializeField throws if local path contains -->", () => {
    const block: LocalAttachment = {
      ...LOCAL_BLOCK,
      path: "attachments/-->evil.webp",
    };
    expect(() => serializeField("Prose", [block])).toThrow('contains "-->"');
  });

  it("parseField reports duplicate refs in broken[]", () => {
    const block1 = makeInlineBlockText(SAMPLE_REF_1, "image/webp", SAMPLE_BASE64);
    const block2 = makeInlineBlockText(SAMPLE_REF_1, "image/png", SAMPLE_BASE64);
    const text = `Prose\n\n${block1}\n\n${block2}`;
    const result = parseField(text);
    expect(result.blocks.size).toBe(1);
    expect(result.blocks.get(SAMPLE_REF_1)?.mime).toBe("image/webp");
    expect(result.broken).toHaveLength(1);
    expect(result.broken[0].reason).toContain("duplicate ref");
  });

  it("rejects backslash path traversal in local blocks", () => {
    const block = `<!-- pearl-attachment:v1:${SAMPLE_REF_1}\ntype: local\nmime: image/webp\nscope: project\npath: ..\\..\\etc\\passwd\nsha256: ${SAMPLE_SHA256}\n-->`;
    const text = `Text\n\n${block}`;
    const result = parseField(text);
    expect(result.broken).toHaveLength(1);
    expect(result.broken[0].reason).toContain("path traversal");
  });

  it("serializeField handles blocks with user scope", () => {
    const block: LocalAttachment = {
      ...LOCAL_BLOCK,
      scope: "user",
    };
    const output = serializeField("Prose", [block]);
    expect(output).toContain("scope: user");
  });
});

// ─── Collision probability ──────────────────────────────────

describe("collision probability", () => {
  it("birthday problem: P(collision) for 10k items in 48-bit space is ≤ 1e-6", () => {
    const n = 10_000;
    const H = 2 ** 48;
    const P = 1 - Math.exp(-(n * n) / (2 * H));
    expect(P).toBeLessThanOrEqual(1e-6);
    expect(P).toBeGreaterThan(0);
  });
});
