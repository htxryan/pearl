import type { InlineAttachment, Ref } from "@pearl/shared";
import { parseField } from "@pearl/shared";
import { describe, expect, it } from "vitest";
import { insertAttachments } from "./insert-attachments";

const REF_1 = "aabbccdd1122" as Ref;
const REF_2 = "112233445566" as Ref;

const BLOCK_1: InlineAttachment = {
  type: "inline",
  ref: REF_1,
  mime: "image/webp",
  data: "dGVzdA==",
};

const BLOCK_2: InlineAttachment = {
  type: "inline",
  ref: REF_2,
  mime: "image/webp",
  data: "dGVzdDI=",
};

describe("insertAttachments", () => {
  it("inserts a single pill into empty text with auto-numbered alt", () => {
    const result = insertAttachments("", 0, [BLOCK_1]);
    expect(result).toContain(`image 1: [img:${REF_1}]`);
    const parsed = parseField(result);
    expect(parsed.refsInProse).toContain(REF_1);
    expect(parsed.blocks.has(REF_1)).toBe(true);
  });

  it("inserts pill at cursor position in existing prose", () => {
    const result = insertAttachments("Hello world", 5, [BLOCK_1]);
    const parsed = parseField(result);
    expect(parsed.prose).toContain("Hello");
    expect(parsed.prose).toContain(`[img:${REF_1}]`);
    expect(parsed.prose).toContain("world");
  });

  it("inserts multiple pills with sequential auto-numbered alts", () => {
    const result = insertAttachments("Text here", 9, [BLOCK_1, BLOCK_2]);
    const parsed = parseField(result);
    expect(parsed.refsInProse).toContain(REF_1);
    expect(parsed.refsInProse).toContain(REF_2);
    expect(parsed.blocks.size).toBe(2);
    expect(result).toContain(`image 1: [img:${REF_1}]`);
    expect(result).toContain(`image 2: [img:${REF_2}]`);
  });

  it("continues numbering after existing pills in field", () => {
    const existingText = `[img:${REF_1}]\n\n<!-- pearl-attachment:v1:${REF_1}\ntype: inline\nmime: image/webp\ndata: dGVzdA==\n-->`;
    const result = insertAttachments(existingText, 0, [BLOCK_2]);
    expect(result).toContain(`image 2: [img:${REF_2}]`);
    const parsed = parseField(result);
    expect(parsed.blocks.size).toBe(2);
    expect(parsed.blocks.has(REF_1)).toBe(true);
    expect(parsed.blocks.has(REF_2)).toBe(true);
  });

  it("clamps cursor position to prose length", () => {
    const result = insertAttachments("Short", 999, [BLOCK_1]);
    const parsed = parseField(result);
    expect(parsed.refsInProse).toContain(REF_1);
    expect(parsed.prose.indexOf("Short")).toBe(0);
  });

  it("adds newline before pill if cursor is mid-line", () => {
    const result = insertAttachments("Hello", 5, [BLOCK_1]);
    expect(result).toContain("Hello\n");
  });

  it("does not add extra newline at start of text", () => {
    const result = insertAttachments("", 0, [BLOCK_1]);
    expect(result.startsWith("\n")).toBe(false);
  });

  it("round-trips: parseField(insertAttachments(...)) preserves all data", () => {
    const result = insertAttachments("Existing content", 8, [BLOCK_1, BLOCK_2]);
    const parsed = parseField(result);
    expect(parsed.blocks.get(REF_1)?.type).toBe("inline");
    expect(parsed.blocks.get(REF_2)?.type).toBe("inline");
    expect(parsed.refsInProse.length).toBe(2);
  });
});
