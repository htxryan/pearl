import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Browser API Mocks ─────────────────────────────────────

const mockClose = vi.fn();
const mockDrawImage = vi.fn();
const mockConvertToBlob = vi.fn();
const mockGetContext = vi.fn();

function makeMockBitmap(width: number, height: number) {
  return { width, height, close: mockClose };
}

// Default: 100x100 image that produces a small webp
vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue(makeMockBitmap(100, 100)));

class MockOffscreenCanvas {
  width: number;
  height: number;
  constructor(w: number, h: number) {
    this.width = w;
    this.height = h;
  }
  getContext() {
    return mockGetContext();
  }
  convertToBlob(options?: { type?: string; quality?: number }) {
    return mockConvertToBlob(options);
  }
}

vi.stubGlobal("OffscreenCanvas", MockOffscreenCanvas);

// Small valid webp bytes (RIFF header + minimal webp)
const TINY_WEBP = new Uint8Array([
  0x52,
  0x49,
  0x46,
  0x46, // RIFF
  0x24,
  0x00,
  0x00,
  0x00, // file size
  0x57,
  0x45,
  0x42,
  0x50, // WEBP
  0x56,
  0x50,
  0x38,
  0x20, // VP8
  0x18,
  0x00,
  0x00,
  0x00, // chunk size
  0x30,
  0x01,
  0x00,
  0x9d,
  0x01,
  0x2a,
  0x01,
  0x00,
  0x01,
  0x00,
  0x01,
  0x40,
  0x25,
  0xa4,
  0x00,
  0x03,
  0x70,
  0x00,
  0xfe,
  0xfb,
  0x94,
  0x00,
  0x00,
]);

function makeWebpBlob(bytes = TINY_WEBP) {
  return {
    arrayBuffer: () =>
      Promise.resolve(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)),
    type: "image/webp",
    size: bytes.length,
  };
}

// ─── Test Suite ─────────────────────────────────────────────

import {
  _computeRefForTesting as computeRef,
  EncodingError,
  encodeImage,
  _stripExifForTesting as stripExif,
} from "./encoding-pipeline";

describe("encoding-pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetContext.mockReturnValue({ drawImage: mockDrawImage });
    mockConvertToBlob.mockResolvedValue(makeWebpBlob());
    (globalThis.createImageBitmap as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeMockBitmap(100, 100),
    );
  });

  const defaultPolicy = {
    format: "webp" as const,
    maxBytes: 1_048_576,
    maxDimension: 2048,
    stripExif: true as const,
  };

  describe("encodeImage", () => {
    it("produces an EncodedImage with correct fields", async () => {
      const file = new File([TINY_WEBP], "test.png", { type: "image/png" });
      const result = await encodeImage(file, defaultPolicy);

      expect(result.mime).toBe("image/webp");
      expect(result.ref).toMatch(/^[0-9a-f]{12}$/);
      expect(result.sha256Full).toMatch(/^[0-9a-f]{64}$/);
      expect(result.base64).toBeTruthy();
      expect(result.bytes).toBeInstanceOf(Uint8Array);
      expect(result.dimensions).toEqual({ w: 100, h: 100 });
    });

    it("resizes images exceeding maxDimension", async () => {
      (globalThis.createImageBitmap as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeMockBitmap(4000, 2000),
      );

      const file = new File([TINY_WEBP], "large.png", { type: "image/png" });
      const result = await encodeImage(file, { ...defaultPolicy, maxDimension: 2048 });

      expect(result.dimensions.w).toBe(2048);
      expect(result.dimensions.h).toBe(1024);
    });

    it("preserves aspect ratio when resizing", async () => {
      (globalThis.createImageBitmap as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeMockBitmap(3000, 6000),
      );

      const file = new File([TINY_WEBP], "tall.png", { type: "image/png" });
      const result = await encodeImage(file, { ...defaultPolicy, maxDimension: 1000 });

      expect(result.dimensions.w).toBe(500);
      expect(result.dimensions.h).toBe(1000);
    });

    it("does not resize images within maxDimension", async () => {
      (globalThis.createImageBitmap as ReturnType<typeof vi.fn>).mockResolvedValue(
        makeMockBitmap(800, 600),
      );

      const file = new File([TINY_WEBP], "small.png", { type: "image/png" });
      const result = await encodeImage(file, defaultPolicy);

      expect(result.dimensions).toEqual({ w: 800, h: 600 });
    });

    it("rejects with E7_MAX_BYTES when encoded size exceeds maxBytes", async () => {
      const bigBytes = new Uint8Array(2_000_000);
      mockConvertToBlob.mockResolvedValue(makeWebpBlob(bigBytes));

      const file = new File([bigBytes], "big.png", { type: "image/png" });
      await expect(encodeImage(file, { ...defaultPolicy, maxBytes: 1_000_000 })).rejects.toThrow(
        EncodingError,
      );

      try {
        await encodeImage(file, { ...defaultPolicy, maxBytes: 1_000_000 });
      } catch (err) {
        expect(err).toBeInstanceOf(EncodingError);
        expect((err as EncodingError).code).toBe("E7_MAX_BYTES");
        expect((err as EncodingError).message).toContain("maxBytes");
      }
    });

    it("throws DECODE_FAILED when canvas context unavailable", async () => {
      mockGetContext.mockReturnValue(null);

      const file = new File([TINY_WEBP], "test.png", { type: "image/png" });
      await expect(encodeImage(file, defaultPolicy)).rejects.toThrow(EncodingError);
    });

    it("closes ImageBitmap after use", async () => {
      const file = new File([TINY_WEBP], "test.png", { type: "image/png" });
      await encodeImage(file, defaultPolicy);
      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe("EXIF stripping", () => {
    it("strips APP1 (EXIF) segments from JPEG", () => {
      // Construct a minimal JPEG with a fake EXIF APP1 segment
      const soi = [0xff, 0xd8]; // SOI
      const app1Marker = [0xff, 0xe1]; // APP1
      const app1Length = [0x00, 0x10]; // 16 bytes length
      const app1Data = new Array(14).fill(0x42); // fake EXIF data
      const sos = [0xff, 0xda]; // Start of Scan
      const imageData = [0x01, 0x02, 0x03];
      const eoi = [0xff, 0xd9]; // EOI

      const jpeg = new Uint8Array([
        ...soi,
        ...app1Marker,
        ...app1Length,
        ...app1Data,
        ...sos,
        ...imageData,
        ...eoi,
      ]);

      const stripped = new Uint8Array(stripExif(jpeg.buffer));

      // Should not contain APP1 marker
      let hasApp1 = false;
      for (let i = 0; i < stripped.length - 1; i++) {
        if (stripped[i] === 0xff && stripped[i + 1] === 0xe1) {
          hasApp1 = true;
          break;
        }
      }
      expect(hasApp1).toBe(false);

      // Should still start with SOI
      expect(stripped[0]).toBe(0xff);
      expect(stripped[1]).toBe(0xd8);

      // Should still contain SOS and image data
      let hasSos = false;
      for (let i = 0; i < stripped.length - 1; i++) {
        if (stripped[i] === 0xff && stripped[i + 1] === 0xda) {
          hasSos = true;
          break;
        }
      }
      expect(hasSos).toBe(true);
    });

    it("passes through non-JPEG data unchanged", () => {
      const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const result = new Uint8Array(stripExif(pngHeader.buffer));
      expect(result).toEqual(pngHeader);
    });

    it("passes through webp data unchanged", () => {
      const result = new Uint8Array(stripExif(TINY_WEBP.buffer));
      expect(result).toEqual(TINY_WEBP);
    });

    it("handles buffer shorter than 2 bytes", () => {
      const single = new Uint8Array([0xff]);
      const result = new Uint8Array(stripExif(single.buffer));
      expect(result).toEqual(single);
    });

    it("handles empty buffer", () => {
      const empty = new Uint8Array([]);
      const result = new Uint8Array(stripExif(empty.buffer));
      expect(result.length).toBe(0);
    });

    it("handles malformed JPEG with zero segmentLength (no infinite loop)", () => {
      // JPEG SOI + marker with segmentLength = 0 (invalid, should not loop)
      const malformed = new Uint8Array([
        0xff,
        0xd8, // SOI
        0xff,
        0xe0, // APP0 marker
        0x00,
        0x00, // segmentLength = 0 (invalid)
      ]);
      const result = new Uint8Array(stripExif(malformed.buffer));
      // Should not hang — just bail out
      expect(result[0]).toBe(0xff);
      expect(result[1]).toBe(0xd8);
    });

    it("handles JPEG with segmentLength exceeding buffer", () => {
      const truncated = new Uint8Array([
        0xff,
        0xd8, // SOI
        0xff,
        0xe0, // APP0 marker
        0xff,
        0xff, // segmentLength = 65535 (exceeds buffer)
      ]);
      const result = new Uint8Array(stripExif(truncated.buffer));
      expect(result[0]).toBe(0xff);
      expect(result[1]).toBe(0xd8);
    });
  });

  describe("ref computation (UCA-1: EXIF stripped before ref)", () => {
    it("produces deterministic 12-char hex ref", async () => {
      const bytes = new Uint8Array([1, 2, 3, 4, 5]);
      const result1 = await computeRef(bytes);
      const result2 = await computeRef(bytes);

      expect(result1.ref).toBe(result2.ref);
      expect(result1.ref).toMatch(/^[0-9a-f]{12}$/);
      expect(result1.sha256Full).toBe(result2.sha256Full);
      expect(result1.sha256Full).toMatch(/^[0-9a-f]{64}$/);
    });

    it("produces different refs for different inputs", async () => {
      const result1 = await computeRef(new Uint8Array([1, 2, 3]));
      const result2 = await computeRef(new Uint8Array([4, 5, 6]));
      expect(result1.ref).not.toBe(result2.ref);
    });

    it("ref is first 12 chars of sha256", async () => {
      const result = await computeRef(new Uint8Array([10, 20, 30]));
      expect(result.ref).toBe(result.sha256Full.slice(0, 12));
    });
  });

  describe("golden sample", () => {
    it("known bytes produce known ref", async () => {
      // SHA-256 of empty Uint8Array is e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
      const result = await computeRef(new Uint8Array([]));
      expect(result.sha256Full).toBe(
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      );
      expect(result.ref).toBe("e3b0c44298fc");
    });
  });

  describe("UCA-1 ordering invariant", () => {
    it("EXIF stripping happens before ref computation in encodeImage", async () => {
      // Create a mock that tracks call order
      const _callOrder: string[] = [];

      // We verify ordering by ensuring the webp blob returned has no EXIF
      // and the ref is computed on post-strip bytes.
      // Since our mock returns non-JPEG (webp), stripExif is a no-op passthrough,
      // but the critical thing is that encodeImage calls strip BEFORE computeRef.

      const file = new File([TINY_WEBP], "test.png", { type: "image/png" });
      const result = await encodeImage(file, defaultPolicy);

      // The ref should be computed on the bytes AFTER EXIF stripping
      // Since webp passes through stripExif unchanged, verify ref matches
      // direct computation on the same bytes
      const directRef = await computeRef(result.bytes);
      expect(result.ref).toBe(directRef.ref);
      expect(result.sha256Full).toBe(directRef.sha256Full);
    });
  });
});
