import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { extractImageFiles, useImageUpload } from "./use-image-upload";

// Mock the encoding pipeline
vi.mock("@/lib/encoding-pipeline", () => ({
  encodeImage: vi.fn(),
  EncodingError: class EncodingError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
      this.name = "EncodingError";
    }
  },
}));

// Mock the storage adapters
vi.mock("@/lib/storage-adapter", () => ({
  InlineStorageAdapter: vi.fn().mockImplementation(() => ({
    mode: "inline",
    store: vi.fn(),
    load: vi.fn(),
  })),
  LocalStorageAdapter: vi.fn().mockImplementation(() => ({
    mode: "local",
    store: vi.fn(),
    load: vi.fn(),
  })),
}));

// Mock settings hook
vi.mock("@/hooks/use-settings", () => ({
  useSettings: vi.fn(() => ({
    data: {
      version: 1,
      attachments: {
        storageMode: "inline",
        local: {
          scope: "project",
          projectPathOverride: null,
          userPathOverride: null,
        },
        encoding: {
          format: "webp" as const,
          maxBytes: 1_048_576,
          maxDimension: 2048,
        },
        sweep: { graceSeconds: 3600, intervalSeconds: 600 },
      },
    },
  })),
}));

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return createElement(QueryClientProvider, { client: qc }, children);
}

describe("useImageUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts with isUploading false and empty errors", () => {
    const { result } = renderHook(() => useImageUpload(), { wrapper });
    expect(result.current.isUploading).toBe(false);
    expect(result.current.progress).toBeNull();
    expect(result.current.lastErrors).toEqual([]);
  });

  it("uploads a file and returns a block", async () => {
    const { encodeImage } = await import("@/lib/encoding-pipeline");
    const { InlineStorageAdapter } = await import("@/lib/storage-adapter");

    const mockBlock = {
      type: "inline" as const,
      ref: "abc123def456",
      mime: "image/webp",
      data: "base64data",
    };

    (encodeImage as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      bytes: new Uint8Array([1, 2, 3]),
      mime: "image/webp",
      base64: "base64data",
      sha256Full: "abc123def456789",
      ref: "abc123def456",
      dimensions: { w: 100, h: 100 },
    });

    const mockAdapter = {
      mode: "inline",
      store: vi.fn().mockResolvedValueOnce(mockBlock),
      load: vi.fn(),
    };
    (InlineStorageAdapter as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      () => mockAdapter,
    );

    const { result } = renderHook(() => useImageUpload(), { wrapper });

    const file = new File(["test"], "test.png", { type: "image/png" });
    let uploadResult: Awaited<ReturnType<typeof result.current.uploadFiles>>;

    await act(async () => {
      uploadResult = await result.current.uploadFiles([file]);
    });

    expect(uploadResult!.results).toHaveLength(1);
    expect(uploadResult!.results[0].block).toEqual(mockBlock);
    expect(uploadResult!.results[0].fileName).toBe("test.png");
    expect(uploadResult!.errors).toHaveLength(0);
    expect(result.current.isUploading).toBe(false);
  });

  it("surfaces encoding errors with specific messages", async () => {
    const { encodeImage, EncodingError } = await import("@/lib/encoding-pipeline");

    (encodeImage as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new (EncodingError as unknown as new (m: string, c: string) => Error)(
        "Encoded image is 2MB, exceeding maxBytes limit of 1MB",
        "E7_MAX_BYTES",
      ),
    );

    const { result } = renderHook(() => useImageUpload(), { wrapper });

    const file = new File(["test"], "big.png", { type: "image/png" });
    let uploadResult: Awaited<ReturnType<typeof result.current.uploadFiles>>;

    await act(async () => {
      uploadResult = await result.current.uploadFiles([file]);
    });

    expect(uploadResult!.results).toHaveLength(0);
    expect(uploadResult!.errors).toHaveLength(1);
    expect(uploadResult!.errors[0].fileName).toBe("big.png");
    expect(uploadResult!.errors[0].message).toContain("too large");
  });

  it("clears errors when clearErrors is called", async () => {
    const { encodeImage } = await import("@/lib/encoding-pipeline");
    (encodeImage as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("fail"));

    const { result } = renderHook(() => useImageUpload(), { wrapper });

    await act(async () => {
      await result.current.uploadFiles([new File(["x"], "x.png", { type: "image/png" })]);
    });

    expect(result.current.lastErrors).toHaveLength(1);

    act(() => {
      result.current.clearErrors();
    });

    expect(result.current.lastErrors).toHaveLength(0);
  });
});

describe("extractImageFiles", () => {
  it("filters image files from DataTransferItemList", () => {
    const items = [
      {
        kind: "file",
        type: "image/png",
        getAsFile: () => new File(["a"], "a.png", { type: "image/png" }),
      },
      {
        kind: "file",
        type: "text/plain",
        getAsFile: () => new File(["b"], "b.txt", { type: "text/plain" }),
      },
      {
        kind: "file",
        type: "image/jpeg",
        getAsFile: () => new File(["c"], "c.jpg", { type: "image/jpeg" }),
      },
      { kind: "string", type: "text/html", getAsFile: () => null },
    ] as unknown as DataTransferItemList;
    Object.defineProperty(items, "length", { value: 4 });

    const result = extractImageFiles(items);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("a.png");
    expect(result[1].name).toBe("c.jpg");
  });

  it("filters image files from FileList", () => {
    const files = [
      new File(["a"], "a.png", { type: "image/png" }),
      new File(["b"], "b.txt", { type: "text/plain" }),
    ] as unknown as FileList;
    Object.defineProperty(files, "length", { value: 2 });

    const result = extractImageFiles(files);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("a.png");
  });

  it("returns empty array when no image files", () => {
    const items = [
      { kind: "string", type: "text/plain", getAsFile: () => null },
    ] as unknown as DataTransferItemList;
    Object.defineProperty(items, "length", { value: 1 });

    expect(extractImageFiles(items)).toHaveLength(0);
  });
});
