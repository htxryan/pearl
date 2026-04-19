/**
 * Pearl Attachment Syntax — Unit Tests
 *
 * Collision probability analysis (birthday problem):
 *   Hash space: 12 hex chars = 48 bits = 2^48 = 281,474,976,710,656 possible values
 *   Number of items: n = 10,000 attachments
 *   Formula: P ≈ 1 - e^(-n² / (2 * H))
 *     P ≈ 1 - e^(-10000² / (2 * 2^48))
 *     P ≈ 1 - e^(-100000000 / 562949953421312)
 *     P ≈ 1 - e^(-1.776e-7)
 *     P ≈ 1.776e-7
 *     P ≈ 1.78 × 10⁻⁷
 *   Result: P ≈ 1.78e-7 ≤ 1e-6 ✓
 *
 *   With 10,000 attachments in a 48-bit space, the collision probability
 *   is approximately 0.0000178% — well below the 1-in-a-million threshold.
 */

import { describe, expect, it } from "vitest";
import {
  type AttachmentBlock,
  extractBlocks,
  extractPills,
  type InlineAttachment,
  type LocalAttachment,
  parse,
  type SerializeInput,
  serialize,
} from "./attachment-syntax.js";

// ─── Test fixtures ──────────────────────────────────────────

const SAMPLE_REF_1 = "a1b2c3d4e5f6";
const SAMPLE_REF_2 = "f6e5d4c3b2a1";
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
    const pills = extractPills("[img:abc123]"); // Too short
    expect(pills).toHaveLength(0);
  });

  it("ignores pills with uppercase hex", () => {
    const pills = extractPills("[img:A1B2C3D4E5F6]"); // Uppercase not matched
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
    // Missing "data" field for inline type
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

// ─── parse ──────────────────────────────────────────────────

describe("parse", () => {
  it("parses a field with one inline attachment", () => {
    const prose = `Screenshot: [img:${SAMPLE_REF_1}]`;
    const block = makeInlineBlockText(SAMPLE_REF_1, "image/webp", SAMPLE_BASE64);
    const text = `${prose}\n\n${block}`;

    const result = parse(text);
    expect(result.prose).toBe(prose);
    expect(result.pills).toHaveLength(1);
    expect(result.pills[0].ref).toBe(SAMPLE_REF_1);
    expect(result.blocks).toHaveLength(1);
    expect(result.matched.size).toBe(1);
    expect(result.matched.get(SAMPLE_REF_1)?.type).toBe("inline");
    expect(result.unmatchedPills).toHaveLength(0);
    expect(result.unmatchedBlocks).toHaveLength(0);
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

    const result = parse(text);
    expect(result.prose).toBe(prose);
    expect(result.pills).toHaveLength(2);
    expect(result.blocks).toHaveLength(2);
    expect(result.matched.size).toBe(2);
    expect(result.matched.get(SAMPLE_REF_1)?.type).toBe("inline");
    expect(result.matched.get(SAMPLE_REF_2)?.type).toBe("local");
    expect(result.unmatchedPills).toHaveLength(0);
    expect(result.unmatchedBlocks).toHaveLength(0);
  });

  it("reports unmatched pills (pill with no data block)", () => {
    const prose = `Image: [img:${SAMPLE_REF_1}]`;
    const result = parse(prose);
    expect(result.pills).toHaveLength(1);
    expect(result.blocks).toHaveLength(0);
    expect(result.unmatchedPills).toEqual([SAMPLE_REF_1]);
  });

  it("reports unmatched blocks (data block with no pill)", () => {
    const prose = "No images here.";
    const block = makeInlineBlockText(SAMPLE_REF_1, "image/webp", SAMPLE_BASE64);
    const text = `${prose}\n\n${block}`;

    const result = parse(text);
    expect(result.pills).toHaveLength(0);
    expect(result.blocks).toHaveLength(1);
    expect(result.unmatchedBlocks).toEqual([SAMPLE_REF_1]);
  });

  it("parses field with no attachments (passthrough)", () => {
    const text = "Just a plain description with no images.";
    const result = parse(text);
    expect(result.prose).toBe(text);
    expect(result.pills).toHaveLength(0);
    expect(result.blocks).toHaveLength(0);
    expect(result.matched.size).toBe(0);
  });

  it("handles CRLF line endings throughout", () => {
    const prose = `Screenshot: [img:${SAMPLE_REF_1}]`;
    const block = `<!-- pearl-attachment:v1:${SAMPLE_REF_1}\r\ntype: inline\r\nmime: image/webp\r\ndata: ${SAMPLE_BASE64}\r\n-->`;
    const text = `${prose}\r\n\r\n${block}`;

    const result = parse(text);
    expect(result.prose).toBe(prose);
    expect(result.pills).toHaveLength(1);
    expect(result.blocks).toHaveLength(1);
    expect(result.matched.size).toBe(1);
  });

  it("strips block markup from prose when no blank-line separator", () => {
    const prose = `Image: [img:${SAMPLE_REF_1}]`;
    const block = makeInlineBlockText(SAMPLE_REF_1, "image/webp", SAMPLE_BASE64);
    const text = `${prose}\n${block}`;

    const result = parse(text);
    expect(result.blocks).toHaveLength(1);
    expect(result.prose).not.toContain("pearl-attachment");
    expect(result.prose).toContain(`[img:${SAMPLE_REF_1}]`);
  });

  it("gracefully handles malformed data blocks mixed with valid ones", () => {
    const prose = `Good: [img:${SAMPLE_REF_1}] Bad: [img:${SAMPLE_REF_2}]`;
    const goodBlock = makeInlineBlockText(SAMPLE_REF_1, "image/webp", SAMPLE_BASE64);
    // Malformed: missing data field
    const badBlock = `<!-- pearl-attachment:v1:${SAMPLE_REF_2}\ntype: inline\nmime: image/webp\n-->`;
    const text = `${prose}\n\n${goodBlock}\n\n${badBlock}`;

    const result = parse(text);
    expect(result.blocks).toHaveLength(1); // Only the good one
    expect(result.matched.size).toBe(1);
    expect(result.unmatchedPills).toEqual([SAMPLE_REF_2]);
  });
});

// ─── serialize ──────────────────────────────────────────────

describe("serialize", () => {
  it("serializes prose with no blocks", () => {
    const input: SerializeInput = {
      prose: "Just text, no images.",
      blocks: [],
    };
    expect(serialize(input)).toBe("Just text, no images.");
  });

  it("serializes prose with an inline block", () => {
    const input: SerializeInput = {
      prose: `Screenshot: [img:${SAMPLE_REF_1}]`,
      blocks: [INLINE_BLOCK],
    };
    const output = serialize(input);
    expect(output).toContain(`[img:${SAMPLE_REF_1}]`);
    expect(output).toContain("<!-- pearl-attachment:v1:");
    expect(output).toContain(`data: ${SAMPLE_BASE64}`);
    // Verify blank-line separation
    expect(output).toContain(`]\n\n<!-- pearl-attachment`);
  });

  it("serializes prose with a local block", () => {
    const input: SerializeInput = {
      prose: `Diagram: [img:${SAMPLE_REF_2}]`,
      blocks: [LOCAL_BLOCK],
    };
    const output = serialize(input);
    expect(output).toContain("type: local");
    expect(output).toContain(`scope: project`);
    expect(output).toContain(`path: attachments/2026/04/a1b2c3d4.webp`);
    expect(output).toContain(`sha256: ${SAMPLE_SHA256}`);
  });

  it("serializes multiple blocks separated by blank lines", () => {
    const input: SerializeInput = {
      prose: `A: [img:${SAMPLE_REF_1}] B: [img:${SAMPLE_REF_2}]`,
      blocks: [INLINE_BLOCK, LOCAL_BLOCK],
    };
    const output = serialize(input);
    // Two blocks should be separated by blank line
    const blockParts = output.split("-->");
    expect(blockParts.length).toBeGreaterThanOrEqual(3); // prose + 2 blocks + trailing
  });
});

// ─── Round-trip identity ────────────────────────────────────

describe("round-trip", () => {
  it("serialize → parse → serialize produces identical output", () => {
    const input: SerializeInput = {
      prose: `Here is image A [img:${SAMPLE_REF_1}] and image B [img:${SAMPLE_REF_2}].`,
      blocks: [INLINE_BLOCK, LOCAL_BLOCK],
    };

    const serialized1 = serialize(input);
    const parsed = parse(serialized1);

    // Re-serialize from parsed result
    const input2: SerializeInput = {
      prose: parsed.prose,
      blocks: parsed.blocks,
    };
    const serialized2 = serialize(input2);

    expect(serialized2).toBe(serialized1);
  });

  it("parse → serialize → parse produces identical structure", () => {
    const prose = `Screenshot: [img:${SAMPLE_REF_1}]`;
    const block = makeInlineBlockText(SAMPLE_REF_1, "image/webp", SAMPLE_BASE64);
    const original = `${prose}\n\n${block}`;

    const parsed1 = parse(original);
    const reserialized = serialize({
      prose: parsed1.prose,
      blocks: parsed1.blocks,
    });
    const parsed2 = parse(reserialized);

    expect(parsed2.prose).toBe(parsed1.prose);
    expect(parsed2.pills).toEqual(parsed1.pills);
    expect(parsed2.blocks).toEqual(parsed1.blocks);
  });
});

// ─── Collision probability ──────────────────────────────────

describe("collision probability", () => {
  it("birthday problem: P(collision) for 10k items in 48-bit space is ≤ 1e-6", () => {
    const n = 10_000;
    const H = 2 ** 48; // 281,474,976,710,656
    const P = 1 - Math.exp(-(n * n) / (2 * H));

    console.log("=== Collision Probability Analysis ===");
    console.log(`Hash space: 12 hex chars = 48 bits = 2^48 = ${H.toLocaleString()} values`);
    console.log(`Number of items: ${n.toLocaleString()}`);
    console.log(`Formula: P ≈ 1 - e^(-n²/(2*H))`);
    console.log(`P ≈ 1 - e^(-${(n * n).toLocaleString()} / ${(2 * H).toLocaleString()})`);
    console.log(`P ≈ ${P.toExponential(4)}`);
    console.log(`Threshold: 1e-6 = ${(1e-6).toExponential(4)}`);
    console.log(`P ≤ 1e-6? ${P <= 1e-6 ? "YES ✓" : "NO ✗"}`);
    console.log("======================================");

    expect(P).toBeLessThanOrEqual(1e-6);
    expect(P).toBeGreaterThan(0); // Sanity: it's not zero
  });
});
