import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useParseField } from "./use-parse-field";

vi.mock("@pearl/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@pearl/shared")>();
  return {
    ...actual,
    parseField: actual.parseField,
    hasAttachmentSyntax: actual.hasAttachmentSyntax,
  };
});

describe("useParseField", () => {
  it("returns null parsed for empty text", () => {
    const { result } = renderHook(() => useParseField(null));
    expect(result.current.parsed).toBeNull();
    expect(result.current.isParsing).toBe(false);
  });

  it("returns prose-only parsed for text without attachment syntax", () => {
    const { result } = renderHook(() => useParseField("hello world"));
    expect(result.current.parsed?.prose).toBe("hello world");
    expect(result.current.parsed?.blocks.size).toBe(0);
    expect(result.current.isParsing).toBe(false);
  });

  it("parses text with pill references synchronously for small text", () => {
    const text = "Check [img:a1b2c3d4e5f6] here";
    const { result } = renderHook(() => useParseField(text));

    expect(result.current.parsed).not.toBeNull();
    expect(result.current.parsed?.refsInProse).toEqual(["a1b2c3d4e5f6"]);
    expect(result.current.isParsing).toBe(false);
  });

  it("parses text with inline attachment blocks", () => {
    const text = `Check [img:a1b2c3d4e5f6] here

<!-- pearl-attachment:v1:a1b2c3d4e5f6
type: inline
mime: image/webp
data: dGVzdA==
-->`;
    const { result } = renderHook(() => useParseField(text));

    expect(result.current.parsed?.blocks.size).toBe(1);
    expect(result.current.parsed?.blocks.get("a1b2c3d4e5f6" as any)?.type).toBe("inline");
  });

  it("reports broken blocks", () => {
    const text = `Check [img:a1b2c3d4e5f6]

<!-- pearl-attachment:v1:a1b2c3d4e5f6
type: unknown_type
mime: image/webp
-->`;
    const { result } = renderHook(() => useParseField(text));

    expect(result.current.parsed?.broken).toHaveLength(1);
    expect(result.current.parsed?.broken[0].reason).toContain("unknown block type");
  });

  it("falls back to sync parse when Worker is unavailable", async () => {
    const originalWorker = globalThis.Worker;
    Object.defineProperty(globalThis, "Worker", { value: undefined, writable: true });

    const largeText = `${"x".repeat(300_000)}\n[img:a1b2c3d4e5f6]`;
    const { result } = renderHook(() => useParseField(largeText));

    await waitFor(() => {
      expect(result.current.isParsing).toBe(false);
    });
    expect(result.current.parsed?.refsInProse).toEqual(["a1b2c3d4e5f6"]);

    Object.defineProperty(globalThis, "Worker", { value: originalWorker, writable: true });
  });
});
