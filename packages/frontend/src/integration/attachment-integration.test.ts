import {
  createRef,
  DEFAULT_SETTINGS,
  hasAttachmentSyntax,
  type InlineAttachment,
  type LocalAttachment,
  parseField,
  type Ref,
  type Settings,
} from "@pearl/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EncodedImage } from "@/lib/encoding-pipeline";
import { insertAttachments } from "@/lib/insert-attachments";
import { remarkAttachmentPills } from "@/lib/remark-attachment-pills";
import {
  InlineStorageAdapter,
  LocalStorageAdapter,
  type StorageAdapter,
} from "@/lib/storage-adapter";

// ─── Helpers ───────────────────────────────────────────────────

function makeEncodedImage(overrides?: Partial<EncodedImage>): EncodedImage {
  const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d]);
  return {
    bytes,
    mime: "image/webp",
    base64: btoa(String.fromCharCode(...bytes)),
    sha256Full: "ab".repeat(32),
    ref: createRef("aabbccdd1122"),
    dimensions: { w: 200, h: 150 },
    ...overrides,
  };
}

function makeInlineBlock(ref: Ref, data = "dGVzdA=="): InlineAttachment {
  return { type: "inline", ref, mime: "image/webp", data };
}

function makeLocalBlock(ref: Ref): LocalAttachment {
  return {
    type: "local",
    ref,
    mime: "image/webp",
    scope: "project",
    path: `.pearl/attachments/${ref}.webp`,
    sha256: "cd".repeat(32),
  };
}

interface MdastNode {
  type: string;
  value?: string;
  children?: MdastNode[];
  data?: Record<string, unknown>;
}

function makeTree(markdown: string): MdastNode {
  return {
    type: "root",
    children: [
      {
        type: "paragraph",
        children: [{ type: "text", value: markdown }],
      },
    ],
  };
}

// ─── Contract: Epic 4 <-> Epic 9 — StorageAdapter port conformance ──

describe("Contract: Epic 4 <-> Epic 9 -- StorageAdapter port conformance", () => {
  describe("InlineStorageAdapter conformance", () => {
    const adapter: StorageAdapter = new InlineStorageAdapter();

    it('mode property is "inline"', () => {
      expect(adapter.mode).toBe("inline");
    });

    it("store produces an InlineAttachment with correct ref, mime, data", async () => {
      const encoded = makeEncodedImage();
      const block = await adapter.store(encoded);

      expect(block.type).toBe("inline");
      expect(block.ref).toBe(encoded.ref);
      expect(block.mime).toBe("image/webp");
      expect((block as InlineAttachment).data).toBe(encoded.base64);
    });

    it("load reconstructs bytes from InlineAttachment", async () => {
      const encoded = makeEncodedImage();
      const block = await adapter.store(encoded);
      const blob = await adapter.load(block);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe("image/webp");
    });

    it("store -> load round-trip preserves bytes exactly", async () => {
      const original = new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80, 90]);
      const encoded = makeEncodedImage({
        bytes: original,
        base64: btoa(String.fromCharCode(...original)),
      });

      const block = await adapter.store(encoded);
      const blob = await adapter.load(block);
      const result = new Uint8Array(await blob.arrayBuffer());

      expect(result).toEqual(original);
    });

    it("load throws on non-inline blocks (type guard)", async () => {
      const ref = createRef("a1b2c3d4e5f6");
      const localBlock = makeLocalBlock(ref);

      await expect(adapter.load(localBlock)).rejects.toThrow(
        'InlineStorageAdapter cannot load block of type "local"',
      );
    });

    it("load throws on malformed base64 (error recovery)", async () => {
      const ref = createRef("bad0da1a00be");
      const badBlock: InlineAttachment = {
        type: "inline",
        ref,
        mime: "image/webp",
        data: "!!!not-valid-base64!!!",
      };

      await expect(adapter.load(badBlock)).rejects.toThrow(/ref=bad0da1a00be/);
    });
  });

  describe("LocalStorageAdapter conformance (mocked fetch)", () => {
    const adapter: StorageAdapter = new LocalStorageAdapter("http://test-host:9999");

    beforeEach(() => {
      vi.restoreAllMocks();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('mode property is "local"', () => {
      expect(adapter.mode).toBe("local");
    });

    it("store calls POST /api/attachments and returns LocalAttachment", async () => {
      const mockResponse = {
        ref: "a1b2c3d4e5f6",
        scope: "project",
        path: ".pearl/attachments/a1b2c3d4e5f6.webp",
        sha256: "ab".repeat(32),
        bytes: 5,
        mime: "image/webp",
      };

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify(mockResponse), {
          status: 201,
          headers: { "content-type": "application/json" },
        }),
      );

      const encoded = makeEncodedImage();
      const block = await adapter.store(encoded);

      expect(fetchSpy).toHaveBeenCalledOnce();
      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe("http://test-host:9999/api/attachments");
      expect(init?.method).toBe("POST");
      expect(init?.body).toBeInstanceOf(FormData);

      expect(block.type).toBe("local");
      expect(block.ref).toBe("a1b2c3d4e5f6");
      if (block.type === "local") {
        expect(block.scope).toBe("project");
        expect(block.path).toBe(".pearl/attachments/a1b2c3d4e5f6.webp");
        expect(block.sha256).toBe("ab".repeat(32));
      }
    });

    it("load calls GET /api/attachments/:ref", async () => {
      const ref = createRef("a1b2c3d4e5f6");
      const localBlock = makeLocalBlock(ref);
      const mockBlob = new Blob(["pixels"], { type: "image/webp" });

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      const result = await adapter.load(localBlock);
      expect(result).toBe(mockBlob);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "http://test-host:9999/api/attachments/a1b2c3d4e5f6",
      );
    });

    it("store rejects non-OK responses with status code in error", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ message: "Payload too large" }), { status: 413 }),
      );

      const encoded = makeEncodedImage();
      await expect(adapter.store(encoded)).rejects.toThrow("413");
    });

    it("load rejects non-local blocks", async () => {
      const ref = createRef("a1b2c3d4e5f6");
      const inlineBlock = makeInlineBlock(ref);

      await expect(adapter.load(inlineBlock)).rejects.toThrow(
        'LocalStorageAdapter cannot load block of type "inline"',
      );
    });
  });
});

// ─── Contract: Epic 3 <-> Epic 4/5/9 — Settings snapshot at upload start ──

describe("Contract: Epic 3 <-> Epic 4/5/9 -- Settings snapshot at upload start", () => {
  it('settings with storageMode="inline" aligns with InlineStorageAdapter.mode', () => {
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      attachments: { ...DEFAULT_SETTINGS.attachments, storageMode: "inline" },
    };

    const adapter = new InlineStorageAdapter();
    expect(settings.attachments.storageMode).toBe("inline");
    expect(adapter.mode).toBe("inline");
    expect(settings.attachments.storageMode).toBe(adapter.mode);
  });

  it('settings with storageMode="local" aligns with LocalStorageAdapter.mode', () => {
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      attachments: { ...DEFAULT_SETTINGS.attachments, storageMode: "local" },
    };

    const adapter = new LocalStorageAdapter();
    expect(settings.attachments.storageMode).toBe("local");
    expect(adapter.mode).toBe("local");
    expect(settings.attachments.storageMode).toBe(adapter.mode);
  });

  it("DEFAULT_SETTINGS.storageMode matches one of the adapter mode values", () => {
    const validModes = [new InlineStorageAdapter().mode, new LocalStorageAdapter().mode];
    expect(validModes).toContain(DEFAULT_SETTINGS.attachments.storageMode);
  });

  it("createAdapter logic selects correct adapter type based on settings", () => {
    // Reproduce the private createAdapter logic from use-image-upload.ts
    function createAdapter(settings: Settings): StorageAdapter {
      return settings.attachments.storageMode === "local"
        ? new LocalStorageAdapter()
        : new InlineStorageAdapter();
    }

    const inlineSettings: Settings = {
      ...DEFAULT_SETTINGS,
      attachments: { ...DEFAULT_SETTINGS.attachments, storageMode: "inline" },
    };
    const localSettings: Settings = {
      ...DEFAULT_SETTINGS,
      attachments: { ...DEFAULT_SETTINGS.attachments, storageMode: "local" },
    };

    expect(createAdapter(inlineSettings)).toBeInstanceOf(InlineStorageAdapter);
    expect(createAdapter(localSettings)).toBeInstanceOf(LocalStorageAdapter);
  });
});

// ─── Contract: Epic 9 <-> Epic 10 — insertAttachments updates content for has_attachments ──

describe("Contract: Epic 9 <-> Epic 10 -- insertAttachments updates content for has_attachments", () => {
  const REF_A = createRef("aabbccdd1122");
  const REF_B = createRef("112233445566");

  it("resulting text contains pill syntax [img:ref]", () => {
    const block = makeInlineBlock(REF_A);
    const result = insertAttachments("", 0, [{ block, altText: "" }]);

    expect(result).toContain(`[img:${REF_A}]`);
  });

  it("resulting text contains data block", () => {
    const block = makeInlineBlock(REF_A);
    const result = insertAttachments("", 0, [{ block, altText: "" }]);

    expect(result).toContain("<!-- pearl-attachment:v1:");
    expect(result).toContain(`type: inline`);
    expect(result).toContain(`data: dGVzdA==`);
  });

  it("hasAttachmentSyntax(result) returns true", () => {
    const block = makeInlineBlock(REF_A);
    const result = insertAttachments("", 0, [{ block, altText: "" }]);

    expect(hasAttachmentSyntax(result)).toBe(true);
  });

  it("parseField(result) extracts the blocks correctly", () => {
    const blockA = makeInlineBlock(REF_A, "AAAA");
    const blockB = makeInlineBlock(REF_B, "BBBB");
    const result = insertAttachments("Some prose", 10, [
      { block: blockA, altText: "" },
      { block: blockB, altText: "diagram" },
    ]);

    const parsed = parseField(result);
    expect(parsed.blocks.size).toBe(2);
    expect(parsed.blocks.get(REF_A)?.type).toBe("inline");
    expect(parsed.blocks.get(REF_B)?.type).toBe("inline");
    expect((parsed.blocks.get(REF_A) as InlineAttachment).data).toBe("AAAA");
    expect((parsed.blocks.get(REF_B) as InlineAttachment).data).toBe("BBBB");
    expect(parsed.refsInProse).toContain(REF_A);
    expect(parsed.refsInProse).toContain(REF_B);
  });
});

// ─── Contract: Epic 2 <-> Epic 7 — ParsedField consumed by remark plugin ──

describe("Contract: Epic 2 <-> Epic 7 -- ParsedField consumed by remark plugin (broken block handling)", () => {
  it("normal text with pills produces attachmentPill nodes", () => {
    const tree = makeTree("see [img:a1b2c3d4e5f6] here");
    const transform = remarkAttachmentPills();
    transform(tree);

    const children = tree.children![0].children!;
    expect(children).toHaveLength(3);
    expect(children[0]).toEqual({ type: "text", value: "see " });
    expect(children[1]).toMatchObject({
      type: "attachmentPill",
      data: {
        hName: "attachment-pill",
        hProperties: { "data-ref": "a1b2c3d4e5f6", "data-index": 1 },
      },
    });
    expect(children[2]).toEqual({ type: "text", value: " here" });
  });

  it("text with no pills passes through unchanged", () => {
    const tree = makeTree("just regular markdown text");
    const transform = remarkAttachmentPills();
    transform(tree);

    const children = tree.children![0].children!;
    expect(children).toHaveLength(1);
    expect(children[0]).toEqual({ type: "text", value: "just regular markdown text" });
  });

  it("broken pills (malformed ref) are ignored", () => {
    // Refs must be exactly 12 hex chars; these are not valid
    const tree = makeTree(
      "broken [img:tooshort] and [img:ZZZZZZZZZZZZ] and [img:way_too_long_ref_here]",
    );
    const transform = remarkAttachmentPills();
    transform(tree);

    const children = tree.children![0].children!;
    // All pills are invalid, so no attachmentPill nodes should appear
    expect(children).toHaveLength(1);
    expect(children[0].type).toBe("text");
  });

  it("mixed valid and invalid pills: only valid ones become attachmentPill nodes", () => {
    const tree = makeTree("[img:abc] valid=[img:aabbccdd1122] [img:nope]");
    const transform = remarkAttachmentPills();
    transform(tree);

    const children = tree.children![0].children!;
    // Only the 12-hex-char ref should produce an attachmentPill
    const pillNodes = children.filter((c) => c.type === "attachmentPill");
    expect(pillNodes).toHaveLength(1);
    expect(
      (pillNodes[0].data as Record<string, Record<string, string>>).hProperties["data-ref"],
    ).toBe("aabbccdd1122");
  });
});

// ─── Contract: Mixed-mode — insertAttachments with mix of inline + local blocks ──

describe("Contract: Mixed-mode -- insertAttachments with mix of inline + local blocks", () => {
  it("handles a mix of 2 inline + 1 local blocks", () => {
    const refA = createRef("aabbccdd1122");
    const refB = createRef("112233445566");
    const refC = createRef("deadbeef0099");

    const inlineA = makeInlineBlock(refA, "data_A");
    const inlineB = makeInlineBlock(refB, "data_B");
    const localC = makeLocalBlock(refC);

    // Step 1: start with empty text
    let text = "";

    // Step 2: insert 2 inline blocks
    text = insertAttachments(text, 0, [
      { block: inlineA, altText: "Screenshot A" },
      { block: inlineB, altText: "Screenshot B" },
    ]);

    // Step 3: insert 1 local block at end
    const proseLen = parseField(text).prose.length;
    text = insertAttachments(text, proseLen, [{ block: localC, altText: "Photo" }]);

    // Step 4: verify all 3 are present in parsed result
    const parsed = parseField(text);
    expect(parsed.blocks.size).toBe(3);
    expect(parsed.blocks.has(refA)).toBe(true);
    expect(parsed.blocks.has(refB)).toBe(true);
    expect(parsed.blocks.has(refC)).toBe(true);

    expect(parsed.blocks.get(refA)?.type).toBe("inline");
    expect(parsed.blocks.get(refB)?.type).toBe("inline");
    expect(parsed.blocks.get(refC)?.type).toBe("local");

    expect(parsed.refsInProse).toContain(refA);
    expect(parsed.refsInProse).toContain(refB);
    expect(parsed.refsInProse).toContain(refC);

    // Step 5: verify has_attachments would be true
    expect(hasAttachmentSyntax(text)).toBe(true);
  });
});

// ─── Contract: Failure injection #8 — ref collision through insertAttachments ──

describe("Contract: Failure injection #8 -- ref collision through insertAttachments", () => {
  it("dedup map in insertAttachments keeps the last block when two share a ref", () => {
    const sharedRef = createRef("aabbccdd1122");

    // Block A: inline with data "AAAA"
    const blockA = makeInlineBlock(sharedRef, "AAAA");
    // Block B: inline with same ref but data "BBBB"
    const blockB = makeInlineBlock(sharedRef, "BBBB");

    // Step 1: insert block A
    let text = insertAttachments("", 0, [{ block: blockA, altText: "first" }]);

    // Step 2: insert block B with same ref but different data
    const proseLen = parseField(text).prose.length;
    text = insertAttachments(text, proseLen, [{ block: blockB, altText: "second" }]);

    // Step 3: verify only 1 block with that ref exists, and it is the last one inserted
    const parsed = parseField(text);
    expect(parsed.blocks.size).toBe(1);
    expect(parsed.blocks.has(sharedRef)).toBe(true);

    const block = parsed.blocks.get(sharedRef) as InlineAttachment;
    expect(block.data).toBe("BBBB");
  });

  it("dedup map keeps last block even when both are inserted in a single call", () => {
    const sharedRef = createRef("aabbccdd1122");

    const blockA = makeInlineBlock(sharedRef, "FIRST");
    const blockB = makeInlineBlock(sharedRef, "SECOND");

    const text = insertAttachments("", 0, [
      { block: blockA, altText: "" },
      { block: blockB, altText: "" },
    ]);

    const parsed = parseField(text);
    expect(parsed.blocks.size).toBe(1);

    const block = parsed.blocks.get(sharedRef) as InlineAttachment;
    expect(block.data).toBe("SECOND");
  });
});
