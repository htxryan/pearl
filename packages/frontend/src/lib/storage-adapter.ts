import type { AttachmentBlock, InlineAttachment, LocalAttachment } from "@pearl/shared";
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

// ─── Local Adapter ──────────────────────────────────────────

interface UploadResponse {
  ref: string;
  scope: "project" | "user";
  path: string;
  sha256: string;
  bytes: number;
  mime: string;
}

export class LocalStorageAdapter implements StorageAdapter {
  readonly mode = "local" as const;

  private baseUrl: string;

  constructor(baseUrl = "") {
    this.baseUrl = baseUrl;
  }

  async store(encoded: EncodedImage): Promise<LocalAttachment> {
    const formData = new FormData();
    const blob = new Blob([encoded.bytes as BlobPart], { type: encoded.mime });
    formData.append("file", blob, `attachment.${encoded.mime.split("/")[1] || "webp"}`);
    formData.append("declaredMime", encoded.mime);

    const response = await fetch(`${this.baseUrl}/api/attachments`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Upload failed" }));
      throw new Error(
        `Attachment upload failed (${response.status}): ${error.message || error.code}`,
      );
    }

    const result: UploadResponse = await response.json();
    return {
      type: "local",
      ref: result.ref as LocalAttachment["ref"],
      mime: result.mime,
      scope: result.scope,
      path: result.path,
      sha256: result.sha256,
    };
  }

  async load(block: AttachmentBlock): Promise<Blob> {
    if (block.type !== "local") {
      throw new Error(`LocalStorageAdapter cannot load block of type "${block.type}"`);
    }
    const response = await fetch(`${this.baseUrl}/api/attachments/${block.ref}`);
    if (!response.ok) {
      throw new Error(`Failed to load attachment ref=${block.ref} (${response.status})`);
    }
    return response.blob();
  }
}
