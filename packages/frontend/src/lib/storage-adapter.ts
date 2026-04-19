import type { AttachmentBlock, InlineAttachment } from "@pearl/shared";
import type { EncodedImage } from "./encoding-pipeline";

// ─── Port Interface ─────────────────────────────────────────

export interface StorageAdapter {
  mode: "inline" | "local";
  store(encoded: EncodedImage): Promise<AttachmentBlock>;
  load(block: AttachmentBlock): Promise<Blob>;
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

  async load(block: AttachmentBlock): Promise<Blob> {
    if (block.type !== "inline") {
      throw new Error(`InlineStorageAdapter cannot load block of type "${block.type}"`);
    }
    let binary: string;
    try {
      binary = atob(block.data);
    } catch {
      throw new Error(`Failed to decode base64 for attachment ref=${block.ref}`);
    }
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: block.mime });
  }
}
