import type { EncodingSettings, Ref } from "@pearl/shared";
import { createRef } from "@pearl/shared";

// ─── Types ──────────────────────────────────────────────────

export interface EncodedImage {
  bytes: Uint8Array;
  mime: string;
  base64: string;
  sha256Full: string;
  ref: Ref;
  dimensions: { w: number; h: number };
}

export class EncodingError extends Error {
  constructor(
    message: string,
    public readonly code: "E7_MAX_BYTES" | "X1_MAX_DIMENSION" | "DECODE_FAILED",
  ) {
    super(message);
    this.name = "EncodingError";
  }
}

// ─── EXIF Stripping ─────────────────────────────────────────

function stripExif(buffer: ArrayBuffer): ArrayBuffer {
  const view = new DataView(buffer);
  if (view.byteLength < 2) return buffer;

  // Only JPEG has EXIF in APP1 markers
  if (view.getUint8(0) !== 0xff || view.getUint8(1) !== 0xd8) return buffer;

  const chunks: ArrayBuffer[] = [];
  chunks.push(buffer.slice(0, 2)); // SOI marker

  let offset = 2;
  while (offset < view.byteLength - 1) {
    if (view.getUint8(offset) !== 0xff) break;
    const marker = view.getUint8(offset + 1);

    // SOS (start of scan) — rest is image data, keep everything from here
    if (marker === 0xda) {
      chunks.push(buffer.slice(offset));
      break;
    }

    // Markers without length (RST0-RST7, SOI, EOI, TEM)
    if (
      marker === 0xd8 ||
      marker === 0xd9 ||
      marker === 0x01 ||
      (marker >= 0xd0 && marker <= 0xd7)
    ) {
      chunks.push(buffer.slice(offset, offset + 2));
      offset += 2;
      continue;
    }

    if (offset + 3 >= view.byteLength) break;
    const segmentLength = view.getUint16(offset + 2);
    const segmentEnd = offset + 2 + segmentLength;

    // Drop APP1 (EXIF/XMP) and APP2 (ICC that may contain EXIF)
    if (marker === 0xe1 || marker === 0xe2) {
      offset = segmentEnd;
      continue;
    }

    chunks.push(buffer.slice(offset, segmentEnd));
    offset = segmentEnd;
  }

  let totalLen = 0;
  for (const c of chunks) totalLen += c.byteLength;
  const result = new Uint8Array(totalLen);
  let pos = 0;
  for (const c of chunks) {
    result.set(new Uint8Array(c), pos);
    pos += c.byteLength;
  }
  return result.buffer;
}

// ─── SHA-256 Ref ────────────────────────────────────────────

async function computeRef(bytes: Uint8Array): Promise<{ sha256Full: string; ref: Ref }> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes as ArrayBufferView<ArrayBuffer>);
  const hashArray = new Uint8Array(hashBuffer);
  const sha256Full = Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const ref = createRef(sha256Full.slice(0, 12));
  return { sha256Full, ref };
}

// ─── Canvas Pipeline ────────────────────────────────────────

async function decodeAndResize(
  file: File,
  maxDimension: number,
): Promise<{ canvas: OffscreenCanvas; w: number; h: number }> {
  const bitmap = await createImageBitmap(file);
  let { width: w, height: h } = bitmap;

  if (w > maxDimension || h > maxDimension) {
    const scale = maxDimension / Math.max(w, h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }

  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new EncodingError("Failed to get 2d context from OffscreenCanvas", "DECODE_FAILED");
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return { canvas, w, h };
}

async function transcodeToWebp(canvas: OffscreenCanvas): Promise<ArrayBuffer> {
  const blob = await canvas.convertToBlob({ type: "image/webp", quality: 0.85 });
  return blob.arrayBuffer();
}

// ─── Public API ─────────────────────────────────────────────

export async function encodeImage(file: File, policy: EncodingSettings): Promise<EncodedImage> {
  const { canvas, w, h } = await decodeAndResize(file, policy.maxDimension);
  const webpBuffer = await transcodeToWebp(canvas);

  // UCA-1: EXIF strip MUST happen BEFORE ref computation
  const strippedBuffer = stripExif(webpBuffer);
  const bytes = new Uint8Array(strippedBuffer);

  // E7: size rejection with specific error
  if (bytes.byteLength > policy.maxBytes) {
    throw new EncodingError(
      `Encoded image is ${bytes.byteLength} bytes, exceeding maxBytes limit of ${policy.maxBytes}`,
      "E7_MAX_BYTES",
    );
  }

  const { sha256Full, ref } = await computeRef(bytes);

  const base64 = uint8ArrayToBase64(bytes);

  return {
    bytes,
    mime: "image/webp",
    base64,
    sha256Full,
    ref,
    dimensions: { w, h },
  };
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export { computeRef as _computeRefForTesting, stripExif as _stripExifForTesting };
