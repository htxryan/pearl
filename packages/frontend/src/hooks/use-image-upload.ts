import type { AttachmentBlock, Settings } from "@pearl/shared";
import { useCallback, useRef, useState } from "react";
import { useSettings } from "@/hooks/use-settings";
import { EncodingError, type EncodingPolicy, encodeImage } from "@/lib/encoding-pipeline";
import {
  InlineStorageAdapter,
  LocalStorageAdapter,
  type StorageAdapter,
} from "@/lib/storage-adapter";

export interface UploadError {
  fileName: string;
  message: string;
}

export interface UploadResult {
  block: AttachmentBlock;
  fileName: string;
}

interface UploadProgress {
  total: number;
  completed: number;
}

export interface UseImageUploadReturn {
  uploadFiles: (files: File[]) => Promise<{
    results: UploadResult[];
    errors: UploadError[];
  }>;
  isUploading: boolean;
  progress: UploadProgress | null;
  lastErrors: UploadError[];
  clearErrors: () => void;
}

function createAdapter(settings: Settings): StorageAdapter {
  return settings.attachments.storageMode === "local"
    ? new LocalStorageAdapter()
    : new InlineStorageAdapter();
}

function createPolicy(settings: Settings): EncodingPolicy {
  const { encoding } = settings.attachments;
  return {
    format: encoding.format,
    maxBytes: encoding.maxBytes,
    maxDimension: encoding.maxDimension,
  };
}

function formatError(err: unknown): string {
  if (err instanceof EncodingError) {
    if (err.code === "E7_MAX_BYTES") return `Image too large after encoding: ${err.message}`;
    if (err.code === "DECODE_FAILED") return "Could not decode image. The file may be corrupted.";
  }
  if (err instanceof Error) return err.message;
  return "Upload failed";
}

export function useImageUpload(): UseImageUploadReturn {
  const { data: settings } = useSettings();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [lastErrors, setLastErrors] = useState<UploadError[]>([]);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const uploadFiles = useCallback(async (files: File[]) => {
    const currentSettings = settingsRef.current;
    if (!currentSettings) {
      const err: UploadError[] = [
        { fileName: "", message: "Settings not loaded. Please try again." },
      ];
      setLastErrors(err);
      return { results: [], errors: err };
    }

    const adapter = createAdapter(currentSettings);
    const policy = createPolicy(currentSettings);

    setIsUploading(true);
    setProgress({ total: files.length, completed: 0 });
    setLastErrors([]);

    const results: UploadResult[] = [];
    const errors: UploadError[] = [];

    for (const file of files) {
      try {
        const encoded = await encodeImage(file, policy);
        const block = await adapter.store(encoded);
        results.push({ block, fileName: file.name });
      } catch (err) {
        errors.push({ fileName: file.name, message: formatError(err) });
      }
      setProgress({ total: files.length, completed: results.length + errors.length });
    }

    setIsUploading(false);
    setProgress(null);
    if (errors.length > 0) setLastErrors(errors);

    return { results, errors };
  }, []);

  const clearErrors = useCallback(() => setLastErrors([]), []);

  return { uploadFiles, isUploading, progress, lastErrors, clearErrors };
}

export function extractImageFiles(items: DataTransferItemList | FileList): File[] {
  const files: File[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item) continue;

    if ("kind" in item) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    } else if (item instanceof File && item.type.startsWith("image/")) {
      files.push(item);
    }
  }
  return files;
}
