import type { AttachmentBlock, InlineAttachment, Ref } from "@pearl/shared";
import type { EncodedImage } from "./encoding-pipeline";

// ─── Port Interface ─────────────────────────────────────────

export interface StorageAdapter {
  mode: "inline" | "local";
  store(encoded: EncodedImage): Promise<AttachmentBlock>;
  load(ref: Ref, block: AttachmentBlock): Promise<Blob>;
}

// ─── Inline Adapter ─────────────────────────────────────────

export class InlineStorageAdapter implements StorageAdapter {
  readonly mode = "inline" as const;

  async store(encoded: EncodedImage): Promise<InlineAttachment> {
    return {
      type: "inline",
      ref: encoded.ref,
      mime: encoded.mime,
      data: encoded.base64,
    };
  }

  async load(_ref: Ref, block: AttachmentBlock): Promise<Blob> {
    if (block.type !== "inline") {
      throw new Error(`InlineStorageAdapter cannot load block of type "${block.type}"`);
    }
    const binary = atob(block.data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: block.mime });
  }
}

// UCA-5/6: Factory that snapshots settings at creation time
export function createInlineAdapter(): InlineStorageAdapter {
  return new InlineStorageAdapter();
}
