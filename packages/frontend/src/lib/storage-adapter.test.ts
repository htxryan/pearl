import { createRef, type InlineAttachment } from "@pearl/shared";
import { describe, expect, it } from "vitest";
import type { EncodedImage } from "./encoding-pipeline";
import { createInlineAdapter, InlineStorageAdapter } from "./storage-adapter";

function makeEncodedImage(overrides?: Partial<EncodedImage>): EncodedImage {
  const bytes = new Uint8Array([1, 2, 3, 4, 5]);
  return {
    bytes,
    mime: "image/webp",
    base64: btoa(String.fromCharCode(...bytes)),
    sha256Full: "a".repeat(64),
    ref: createRef("a1b2c3d4e5f6"),
    dimensions: { w: 100, h: 100 },
    ...overrides,
  };
}

describe("InlineStorageAdapter", () => {
  const adapter = new InlineStorageAdapter();

  describe("store", () => {
    it("produces InlineAttachment with correct fields", async () => {
      const encoded = makeEncodedImage();
      const block = await adapter.store(encoded);

      expect(block.type).toBe("inline");
      expect(block.ref).toBe(encoded.ref);
      expect(block.mime).toBe("image/webp");
      expect((block as InlineAttachment).data).toBe(encoded.base64);
    });

    it("mode is 'inline'", () => {
      expect(adapter.mode).toBe("inline");
    });
  });

  describe("load", () => {
    it("reconstructs Blob from InlineAttachment", async () => {
      const encoded = makeEncodedImage();
      const block = await adapter.store(encoded);
      const blob = await adapter.load(encoded.ref, block);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe("image/webp");
      const arrayBuffer = await blob.arrayBuffer();
      const roundTripped = new Uint8Array(arrayBuffer);
      expect(roundTripped).toEqual(encoded.bytes);
    });

    it("throws on non-inline block", async () => {
      const ref = createRef("a1b2c3d4e5f6");
      const localBlock = {
        type: "local" as const,
        ref,
        mime: "image/webp",
        scope: "project" as const,
        path: "attachments/test.webp",
        sha256: "a".repeat(64),
      };

      await expect(adapter.load(ref, localBlock)).rejects.toThrow(
        'InlineStorageAdapter cannot load block of type "local"',
      );
    });
  });

  describe("store/load round-trip", () => {
    it("preserves bytes through store → load cycle", async () => {
      const original = new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80]);
      const encoded = makeEncodedImage({
        bytes: original,
        base64: btoa(String.fromCharCode(...original)),
      });

      const block = await adapter.store(encoded);
      const blob = await adapter.load(encoded.ref, block);
      const result = new Uint8Array(await blob.arrayBuffer());

      expect(result).toEqual(original);
    });
  });
});

describe("createInlineAdapter", () => {
  it("returns an InlineStorageAdapter instance", () => {
    const adapter = createInlineAdapter();
    expect(adapter).toBeInstanceOf(InlineStorageAdapter);
    expect(adapter.mode).toBe("inline");
  });
});
