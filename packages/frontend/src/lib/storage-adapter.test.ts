import { createRef, type InlineAttachment } from "@pearl/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EncodedImage } from "./encoding-pipeline";
import { InlineStorageAdapter, LocalStorageAdapter } from "./storage-adapter";

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
      const blob = await adapter.load(block);

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

      await expect(adapter.load(localBlock)).rejects.toThrow(
        'InlineStorageAdapter cannot load block of type "local"',
      );
    });

    it("throws contextual error on malformed base64", async () => {
      const ref = createRef("bad0da1a00be");
      const badBlock: InlineAttachment = {
        type: "inline",
        ref,
        mime: "image/webp",
        data: "not!valid!base64!!!",
      };

      await expect(adapter.load(badBlock)).rejects.toThrow(/ref=bad0da1a00be/);
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
      const blob = await adapter.load(block);
      const result = new Uint8Array(await blob.arrayBuffer());

      expect(result).toEqual(original);
    });
  });
});

describe("LocalStorageAdapter", () => {
  const adapter = new LocalStorageAdapter("http://localhost:3000");

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("mode is 'local'", () => {
    expect(adapter.mode).toBe("local");
  });

  describe("store (AC-10)", () => {
    it("POSTs multipart/form-data to /api/attachments and returns LocalAttachment", async () => {
      const mockResponse = {
        ref: "a1b2c3d4e5f6",
        scope: "project" as const,
        path: ".pearl/attachments/2026/04/a1b2c3d4e5f6.webp",
        sha256: "a".repeat(64),
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
      expect(url).toBe("http://localhost:3000/api/attachments");
      expect(init?.method).toBe("POST");
      expect(init?.body).toBeInstanceOf(FormData);

      expect(block.type).toBe("local");
      expect(block.ref).toBe("a1b2c3d4e5f6");
      if (block.type === "local") {
        expect(block.scope).toBe("project");
        expect(block.path).toBe(".pearl/attachments/2026/04/a1b2c3d4e5f6.webp");
        expect(block.sha256).toBe("a".repeat(64));
      }
    });

    it("throws on non-OK response", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ code: "MIME_MISMATCH", message: "Not a supported image" }), {
          status: 415,
        }),
      );

      const encoded = makeEncodedImage();
      await expect(adapter.store(encoded)).rejects.toThrow("415");
    });
  });

  describe("load", () => {
    it("throws (not implemented until Epic 6)", async () => {
      const ref = createRef("a1b2c3d4e5f6");
      const localBlock = {
        type: "local" as const,
        ref,
        mime: "image/webp",
        scope: "project" as const,
        path: "attachments/test.webp",
        sha256: "a".repeat(64),
      };
      await expect(adapter.load(localBlock)).rejects.toThrow("Epic 6");
    });
  });
});
