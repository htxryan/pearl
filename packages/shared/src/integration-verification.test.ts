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
  type ParsedField,
  parseField,
  type Ref,
  serializeField,
} from "./attachment-syntax.js";
import { ATTACHMENT_HOST_FIELDS, type Issue } from "./index.js";

// ─── Golden Sample Fixtures ────────────────────────────────

const REF_A = createRef("aabbccdd0011");
const REF_B = createRef("112233445566");
const REF_C = createRef("ffeeddccbbaa");
const REF_D = createRef("deadbeef0001");
const REF_E = createRef("cafebabe0002");

const GOLDEN_BASE64_WEBP = "UklGRh4AAABXRUJQVlA4IBIAAAAwAQCdASoBAAEAAkA4JZQCdAEO/hepAA==";
const GOLDEN_BASE64_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const GOLDEN_SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
const GOLDEN_SHA256_2 = "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2";

const INLINE_WEBP: InlineAttachment = {
  type: "inline",
  ref: REF_A,
  mime: "image/webp",
  data: GOLDEN_BASE64_WEBP,
};

const INLINE_PNG: InlineAttachment = {
  type: "inline",
  ref: REF_B,
  mime: "image/png",
  data: GOLDEN_BASE64_PNG,
};

const LOCAL_PROJECT: LocalAttachment = {
  type: "local",
  ref: REF_C,
  mime: "image/webp",
  scope: "project",
  path: "attachments/2026/04/screenshot.webp",
  sha256: GOLDEN_SHA256,
};

const LOCAL_USER: LocalAttachment = {
  type: "local",
  ref: REF_D,
  mime: "image/png",
  scope: "user",
  path: "attachments/user/diagram.png",
  sha256: GOLDEN_SHA256_2,
};

const INLINE_EXTRA: InlineAttachment = {
  type: "inline",
  ref: REF_E,
  mime: "image/webp",
  data: GOLDEN_BASE64_WEBP,
};

// ─── Contract 1: Epic 2 <-> Epic 4 — Inline round-trip ────

describe("Contract 1: Epic 2 <-> Epic 4 — Serialize/parse round-trip with inline blocks", () => {
  it("a complete inline attachment field survives serializeField -> parseField -> serializeField byte-equal", () => {
    const prose = `Here is a screenshot [img:${REF_A}] showing the bug.`;
    const serialized1 = serializeField(prose, [INLINE_WEBP]);
    const parsed = parseField(serialized1);
    const serialized2 = serializeField(parsed.prose, [...parsed.blocks.values()]);

    expect(serialized2).toBe(serialized1);
  });

  it("multiple inline blocks with different MIME types round-trip correctly", () => {
    const prose = `WebP: [img:${REF_A}] and PNG: [img:${REF_B}]`;
    const serialized1 = serializeField(prose, [INLINE_WEBP, INLINE_PNG]);
    const parsed = parseField(serialized1);

    expect(parsed.blocks.size).toBe(2);
    expect(parsed.blocks.get(REF_A)?.mime).toBe("image/webp");
    expect(parsed.blocks.get(REF_B)?.mime).toBe("image/png");
    expect((parsed.blocks.get(REF_A) as InlineAttachment).data).toBe(GOLDEN_BASE64_WEBP);
    expect((parsed.blocks.get(REF_B) as InlineAttachment).data).toBe(GOLDEN_BASE64_PNG);

    const serialized2 = serializeField(parsed.prose, [...parsed.blocks.values()]);
    expect(serialized2).toBe(serialized1);
  });

  it("golden sample: specific known prose + inline block produces exact expected serialized output", () => {
    const prose = `Bug screenshot [img:${REF_A}]`;
    const serialized = serializeField(prose, [INLINE_WEBP]);

    const expected = [
      `Bug screenshot [img:${REF_A}]`,
      "",
      `<!-- pearl-attachment:v1:${REF_A}`,
      "type: inline",
      "mime: image/webp",
      `data: ${GOLDEN_BASE64_WEBP}`,
      "-->",
    ].join("\n");

    expect(serialized).toBe(expected);

    // And this golden form parses back identically
    const parsed = parseField(serialized);
    expect(parsed.prose).toBe(prose);
    expect(parsed.blocks.size).toBe(1);
    expect(parsed.refsInProse).toEqual([REF_A]);
    expect(parsed.broken).toHaveLength(0);
  });
});

// ─── Contract 2: Epic 2 <-> Epic 5/6 — Local block round-trip

describe("Contract 2: Epic 2 <-> Epic 5/6 — Round-trip with local blocks", () => {
  it("local block with sha256, scope=project, path survives round-trip", () => {
    const prose = `Architecture diagram [img:${REF_C}]`;
    const serialized1 = serializeField(prose, [LOCAL_PROJECT]);
    const parsed = parseField(serialized1);

    expect(parsed.blocks.size).toBe(1);
    const local = parsed.blocks.get(REF_C) as LocalAttachment;
    expect(local.type).toBe("local");
    expect(local.scope).toBe("project");
    expect(local.path).toBe("attachments/2026/04/screenshot.webp");
    expect(local.sha256).toBe(GOLDEN_SHA256);

    const serialized2 = serializeField(parsed.prose, [...parsed.blocks.values()]);
    expect(serialized2).toBe(serialized1);
  });

  it("local block with scope=user survives round-trip", () => {
    const prose = `User diagram [img:${REF_D}]`;
    const serialized1 = serializeField(prose, [LOCAL_USER]);
    const parsed = parseField(serialized1);

    const local = parsed.blocks.get(REF_D) as LocalAttachment;
    expect(local.type).toBe("local");
    expect(local.scope).toBe("user");
    expect(local.path).toBe("attachments/user/diagram.png");
    expect(local.sha256).toBe(GOLDEN_SHA256_2);

    const serialized2 = serializeField(parsed.prose, [...parsed.blocks.values()]);
    expect(serialized2).toBe(serialized1);
  });

  it("mix of 3 inline + 2 local blocks: all parse correctly and serialize back byte-equal", () => {
    const inlineC: InlineAttachment = { ...INLINE_EXTRA };
    const prose = [
      `Screenshot A [img:${REF_A}]`,
      `Screenshot B [img:${REF_B}]`,
      `Local diagram [img:${REF_C}]`,
      `User sketch [img:${REF_D}]`,
      `Extra capture [img:${REF_E}]`,
    ].join(", ");

    const allBlocks: AttachmentBlock[] = [
      INLINE_WEBP,
      INLINE_PNG,
      LOCAL_PROJECT,
      LOCAL_USER,
      inlineC,
    ];
    const serialized1 = serializeField(prose, allBlocks);
    const parsed = parseField(serialized1);

    expect(parsed.blocks.size).toBe(5);
    expect(parsed.blocks.get(REF_A)?.type).toBe("inline");
    expect(parsed.blocks.get(REF_B)?.type).toBe("inline");
    expect(parsed.blocks.get(REF_C)?.type).toBe("local");
    expect(parsed.blocks.get(REF_D)?.type).toBe("local");
    expect(parsed.blocks.get(REF_E)?.type).toBe("inline");
    expect(parsed.broken).toHaveLength(0);

    const serialized2 = serializeField(parsed.prose, [...parsed.blocks.values()]);
    expect(serialized2).toBe(serialized1);
  });
});

// ─── Contract 3: Epic 2 <-> Epic 10 — hasAttachmentSyntax predicate

describe("Contract 3: Epic 2 <-> Epic 10 — hasAttachmentSyntax predicate", () => {
  it("returns true for text with pills only", () => {
    expect(hasAttachmentSyntax(`See [img:${REF_A}] here`)).toBe(true);
  });

  it("returns true for text with blocks only (no pills)", () => {
    const blockOnly = [
      `<!-- pearl-attachment:v1:${REF_A}`,
      "type: inline",
      "mime: image/webp",
      `data: ${GOLDEN_BASE64_WEBP}`,
      "-->",
    ].join("\n");
    expect(hasAttachmentSyntax(blockOnly)).toBe(true);
  });

  it("returns true for text with both pills and blocks", () => {
    const text = serializeField(`Image [img:${REF_A}]`, [INLINE_WEBP]);
    expect(hasAttachmentSyntax(text)).toBe(true);
  });

  it("returns false for plain text without attachment syntax", () => {
    expect(hasAttachmentSyntax("This is a normal description with no images.")).toBe(false);
    expect(hasAttachmentSyntax("")).toBe(false);
    expect(hasAttachmentSyntax("Some [link](url) and **bold** markdown.")).toBe(false);
  });

  it("predicate works on each ATTACHMENT_HOST_FIELD via mock issue object", () => {
    // Verify the constant has the expected fields
    expect(ATTACHMENT_HOST_FIELDS).toEqual([
      "description",
      "design",
      "acceptance_criteria",
      "notes",
    ]);

    const baseIssue: Pick<Issue, "description" | "design" | "acceptance_criteria" | "notes"> = {
      description: "Plain text description",
      design: "Plain text design",
      acceptance_criteria: "Plain text criteria",
      notes: "Plain text notes",
    };

    // No field has attachments
    for (const field of ATTACHMENT_HOST_FIELDS) {
      expect(hasAttachmentSyntax(baseIssue[field])).toBe(false);
    }

    // Each field individually can have attachments
    for (const field of ATTACHMENT_HOST_FIELDS) {
      const modified = { ...baseIssue };
      modified[field] = serializeField(`Content with [img:${REF_A}]`, [INLINE_WEBP]);
      expect(hasAttachmentSyntax(modified[field])).toBe(true);

      // Other fields remain false
      for (const otherField of ATTACHMENT_HOST_FIELDS) {
        if (otherField !== field) {
          expect(hasAttachmentSyntax(modified[otherField])).toBe(false);
        }
      }
    }
  });
});

// ─── Contract 4: Ref collision disambiguation (Failure injection #8)

describe("Contract 4: Ref collision disambiguation (Failure injection #8)", () => {
  it("two blocks with identical 12-char ref but different content are disambiguated", () => {
    const sharedRef = createRef("aabbccdd0011");
    const block1: InlineAttachment = {
      type: "inline",
      ref: sharedRef,
      mime: "image/webp",
      data: GOLDEN_BASE64_WEBP,
    };
    const block2: InlineAttachment = {
      type: "inline",
      ref: sharedRef,
      mime: "image/png",
      data: GOLDEN_BASE64_PNG,
    };

    const result = disambiguateRefs([block1, block2]);

    expect(result).toHaveLength(2);
    // First block keeps original ref
    expect(result[0].ref).toBe(sharedRef);
    // Second block gets a new unique ref
    expect(result[1].ref).not.toBe(sharedRef);
    expect(isRef(result[1].ref)).toBe(true);

    // No overwrite — all refs are unique
    const uniqueRefs = new Set(result.map((b) => b.ref));
    expect(uniqueRefs.size).toBe(2);
  });

  it("disambiguated blocks serialize and parse round-trip correctly", () => {
    const sharedRef = createRef("aabbccdd0011");
    const block1: InlineAttachment = {
      type: "inline",
      ref: sharedRef,
      mime: "image/webp",
      data: GOLDEN_BASE64_WEBP,
    };
    const block2: InlineAttachment = {
      type: "inline",
      ref: sharedRef,
      mime: "image/png",
      data: GOLDEN_BASE64_PNG,
    };

    const disambiguated = disambiguateRefs([block1, block2]);
    const ref1 = disambiguated[0].ref;
    const ref2 = disambiguated[1].ref;

    const prose = `First [img:${ref1}] and second [img:${ref2}]`;
    const serialized1 = serializeField(prose, disambiguated);
    const parsed = parseField(serialized1);

    expect(parsed.blocks.size).toBe(2);
    expect(parsed.refsInProse).toHaveLength(2);
    expect(parsed.broken).toHaveLength(0);

    const serialized2 = serializeField(parsed.prose, [...parsed.blocks.values()]);
    expect(serialized2).toBe(serialized1);
  });

  it("triple collision produces three unique refs that all round-trip", () => {
    const sharedRef = createRef("ffffff000000");
    const blocks: InlineAttachment[] = [
      { type: "inline", ref: sharedRef, mime: "image/webp", data: GOLDEN_BASE64_WEBP },
      { type: "inline", ref: sharedRef, mime: "image/png", data: GOLDEN_BASE64_PNG },
      { type: "inline", ref: sharedRef, mime: "image/webp", data: "YWJj" },
    ];

    const disambiguated = disambiguateRefs(blocks);
    const refs = disambiguated.map((b) => b.ref);
    expect(new Set(refs).size).toBe(3);

    // All disambiguated blocks can be serialized and parsed back
    const prose = refs.map((r, i) => `img${i} [img:${r}]`).join(" ");
    const serialized1 = serializeField(prose, disambiguated);
    const parsed = parseField(serialized1);
    expect(parsed.blocks.size).toBe(3);
    expect(parsed.broken).toHaveLength(0);

    const serialized2 = serializeField(parsed.prose, [...parsed.blocks.values()]);
    expect(serialized2).toBe(serialized1);
  });
});

// ─── Contract 5: Mixed-mode coexistence (Failure injection #5)

describe("Contract 5: Mixed-mode coexistence (Failure injection #5)", () => {
  it("field with 3 inline + 2 local blocks: parse finds all 5, serialize round-trips byte-equal", () => {
    const inline1 = INLINE_WEBP; // REF_A
    const inline2 = INLINE_PNG; // REF_B
    const inline3 = INLINE_EXTRA; // REF_E
    const local1 = LOCAL_PROJECT; // REF_C
    const local2 = LOCAL_USER; // REF_D

    const allBlocks: AttachmentBlock[] = [inline1, inline2, inline3, local1, local2];
    const prose = [
      `Screenshot [img:${REF_A}]`,
      `PNG capture [img:${REF_B}]`,
      `Extra shot [img:${REF_E}]`,
      `Project diagram [img:${REF_C}]`,
      `User sketch [img:${REF_D}]`,
    ].join(", ");

    const serialized = serializeField(prose, allBlocks);
    const parsed = parseField(serialized);

    // All 5 blocks present in ParsedField.blocks
    expect(parsed.blocks.size).toBe(5);
    expect(parsed.blocks.has(REF_A)).toBe(true);
    expect(parsed.blocks.has(REF_B)).toBe(true);
    expect(parsed.blocks.has(REF_C)).toBe(true);
    expect(parsed.blocks.has(REF_D)).toBe(true);
    expect(parsed.blocks.has(REF_E)).toBe(true);
    expect(parsed.broken).toHaveLength(0);

    // refsInProse matches all 5 pills
    expect(parsed.refsInProse).toHaveLength(5);
    expect(parsed.refsInProse).toContain(REF_A);
    expect(parsed.refsInProse).toContain(REF_B);
    expect(parsed.refsInProse).toContain(REF_C);
    expect(parsed.refsInProse).toContain(REF_D);
    expect(parsed.refsInProse).toContain(REF_E);

    // Serialize back -> parse again -> identical
    const serialized2 = serializeField(parsed.prose, [...parsed.blocks.values()]);
    expect(serialized2).toBe(serialized);

    const parsed2 = parseField(serialized2);
    expect(parsed2.prose).toBe(parsed.prose);
    expect(parsed2.refsInProse).toEqual(parsed.refsInProse);
    expect([...parsed2.blocks.entries()]).toEqual([...parsed.blocks.entries()]);
    expect(parsed2.broken).toEqual(parsed.broken);
  });

  it("inline and local blocks preserve their type-specific fields through round-trip", () => {
    const allBlocks: AttachmentBlock[] = [INLINE_WEBP, LOCAL_PROJECT, LOCAL_USER];
    const prose = `A [img:${REF_A}], B [img:${REF_C}], C [img:${REF_D}]`;

    const serialized = serializeField(prose, allBlocks);
    const parsed = parseField(serialized);

    // Verify inline-specific fields
    const inlineBlock = parsed.blocks.get(REF_A) as InlineAttachment;
    expect(inlineBlock.type).toBe("inline");
    expect(inlineBlock.data).toBe(GOLDEN_BASE64_WEBP);

    // Verify local-specific fields (project scope)
    const localProject = parsed.blocks.get(REF_C) as LocalAttachment;
    expect(localProject.type).toBe("local");
    expect(localProject.scope).toBe("project");
    expect(localProject.path).toBe("attachments/2026/04/screenshot.webp");
    expect(localProject.sha256).toBe(GOLDEN_SHA256);

    // Verify local-specific fields (user scope)
    const localUser = parsed.blocks.get(REF_D) as LocalAttachment;
    expect(localUser.type).toBe("local");
    expect(localUser.scope).toBe("user");
    expect(localUser.path).toBe("attachments/user/diagram.png");
    expect(localUser.sha256).toBe(GOLDEN_SHA256_2);
  });
});

// ─── Contract 6: bd CLI round-trip byte-equality (Contract 13 / Failure injection #6)

describe("Contract 6: bd CLI round-trip byte-equality (Contract 13 / Failure injection #6)", () => {
  it("canonical form: serializeField -> parseField -> serializeField is byte-equal", () => {
    const prose = `The CLI reads this field. Screenshot: [img:${REF_A}]`;
    const canonical = serializeField(prose, [INLINE_WEBP]);

    // Simulate bd CLI read
    const parsed = parseField(canonical);

    // Simulate bd CLI write-back
    const rewritten = serializeField(parsed.prose, [...parsed.blocks.values()]);
    expect(rewritten).toBe(canonical);
  });

  it("handles trailing newlines in prose: they are trimmed before blocks", () => {
    const proseWithTrailing = `Description with trailing newlines\n\n\n`;
    const serialized = serializeField(proseWithTrailing, [INLINE_WEBP]);

    // Trailing newlines should be trimmed before the block separator
    expect(serialized).toMatch(/newlines\n\n<!-- pearl-attachment/);

    const parsed = parseField(serialized);
    const reserialized = serializeField(parsed.prose, [...parsed.blocks.values()]);
    // Second round-trip should be stable
    expect(reserialized).toBe(serialized);
  });

  it("handles CRLF line endings: normalized to LF and round-trips byte-equal", () => {
    const prose = `CRLF content [img:${REF_A}]`;
    const canonical = serializeField(prose, [INLINE_WEBP]);

    // Simulate a file written with CRLF
    const crlfVersion = canonical.replace(/\n/g, "\r\n");
    const parsed = parseField(crlfVersion);

    // After parsing CRLF, serializing should produce LF canonical form
    const reserialized = serializeField(parsed.prose, [...parsed.blocks.values()]);
    expect(reserialized).toBe(canonical);

    // And that canonical form round-trips stably
    const parsed2 = parseField(reserialized);
    const reserialized2 = serializeField(parsed2.prose, [...parsed2.blocks.values()]);
    expect(reserialized2).toBe(canonical);
  });

  it("handles empty prose: blocks-only field round-trips byte-equal", () => {
    const serialized = serializeField("", [INLINE_WEBP]);
    const parsed = parseField(serialized);
    expect(parsed.prose).toBe("");

    const reserialized = serializeField(parsed.prose, [...parsed.blocks.values()]);
    expect(reserialized).toBe(serialized);
  });

  it("handles prose-only (no blocks): passthrough round-trip", () => {
    const prose = "Just a description, no images at all.";
    const serialized = serializeField(prose, []);
    expect(serialized).toBe(prose);

    const parsed = parseField(serialized);
    expect(parsed.prose).toBe(prose);
    expect(parsed.blocks.size).toBe(0);

    const reserialized = serializeField(parsed.prose, [...parsed.blocks.values()]);
    expect(reserialized).toBe(prose);
  });

  it("multi-block field with mixed types: triple round-trip is byte-stable", () => {
    const prose = `A [img:${REF_A}] B [img:${REF_C}] C [img:${REF_D}]`;
    const blocks: AttachmentBlock[] = [INLINE_WEBP, LOCAL_PROJECT, LOCAL_USER];

    let current = serializeField(prose, blocks);
    const original = current;

    // Three full round-trips
    for (let i = 0; i < 3; i++) {
      const parsed = parseField(current);
      current = serializeField(parsed.prose, [...parsed.blocks.values()]);
    }

    expect(current).toBe(original);
  });
});
