import { describe, expect, it } from "vitest";
import { scrubAttachmentData } from "./log-scrub";

describe("scrubAttachmentData", () => {
  it("redacts base64 data in pearl-attachment blocks", () => {
    const base64 = "A".repeat(200);
    const input = [
      "Some prose text",
      "",
      `<!-- pearl-attachment:v1:a1b2c3d4e5f6`,
      `type: inline`,
      `mime: image/webp`,
      `data: ${base64}`,
      `-->`,
    ].join("\n");

    const result = scrubAttachmentData(input);

    expect(result).not.toContain(base64);
    expect(result).toContain("<redacted");
    expect(result).toContain("KB>");
    expect(result).toContain("pearl-attachment:v1:a1b2c3d4e5f6");
    expect(result).toContain("type: inline");
    expect(result).toContain("mime: image/webp");
  });

  it("preserves non-attachment content", () => {
    const input = "Just a normal log message with no attachments";
    expect(scrubAttachmentData(input)).toBe(input);
  });

  it("preserves local-mode blocks (no data field)", () => {
    const input = [
      `<!-- pearl-attachment:v1:b2c3d4e5f6a1`,
      `type: local`,
      `mime: image/webp`,
      `scope: project`,
      `path: attachments/test.webp`,
      `sha256: ${"a".repeat(64)}`,
      `-->`,
    ].join("\n");

    const result = scrubAttachmentData(input);
    expect(result).toBe(input);
  });

  it("handles multiple attachment blocks", () => {
    const base64a = "B".repeat(300);
    const base64b = "C".repeat(500);
    const input = [
      `<!-- pearl-attachment:v1:aaaaaaaaaaaa`,
      `type: inline`,
      `mime: image/webp`,
      `data: ${base64a}`,
      `-->`,
      "",
      `<!-- pearl-attachment:v1:bbbbbbbbbbbb`,
      `type: inline`,
      `mime: image/webp`,
      `data: ${base64b}`,
      `-->`,
    ].join("\n");

    const result = scrubAttachmentData(input);
    expect(result).not.toContain(base64a);
    expect(result).not.toContain(base64b);
    expect(result.match(/<redacted/g)?.length).toBe(2);
  });

  it("calculates approximate size correctly", () => {
    // 1024 base64 chars ≈ 768 bytes ≈ 1 KB (rounded)
    const base64 = "A".repeat(1024);
    const input = [
      `<!-- pearl-attachment:v1:cccccccccccc`,
      `type: inline`,
      `mime: image/webp`,
      `data: ${base64}`,
      `-->`,
    ].join("\n");

    const result = scrubAttachmentData(input);
    expect(result).toContain("<redacted 1KB>");
  });

  it("does not modify short strings that happen to look like base64", () => {
    const input = "data: abc123";
    expect(scrubAttachmentData(input)).toBe(input);
  });
});
