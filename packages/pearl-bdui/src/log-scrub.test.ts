import { describe, expect, it } from "vitest";
import { scrubBase64 } from "./log-scrub.js";

describe("scrubBase64", () => {
  it("redacts pearl attachment data blocks", () => {
    const block = `<!-- pearl-attachment:v1:abcdef123456
type: inline
mime: image/webp
data: ${"A".repeat(4000)}
-->`;
    const result = scrubBase64(block);
    expect(result).toContain("<redacted");
    expect(result).not.toContain("A".repeat(100));
    expect(result.length).toBeLessThan(block.length);
  });

  it("redacts data URIs", () => {
    const text = `"data:image/webp;base64,${"B".repeat(2000)}"`;
    const result = scrubBase64(text);
    expect(result).toContain("<redacted");
    expect(result).not.toContain("B".repeat(100));
  });

  it("redacts long raw base64 strings", () => {
    const text = `something ${"C".repeat(2048)} something`;
    const result = scrubBase64(text);
    expect(result).toContain("<redacted");
    expect(result).not.toContain("C".repeat(100));
  });

  it("preserves short strings", () => {
    const text = "This is a normal log message with id=abc123";
    expect(scrubBase64(text)).toBe(text);
  });

  it("golden test: 1MB base64 → output ≤ 1KB (AC-8)", () => {
    const oneMB = "D".repeat(1_000_000);
    const block = `<!-- pearl-attachment:v1:abcdef123456
type: inline
mime: image/webp
data: ${oneMB}
-->`;

    const result = scrubBase64(block);
    expect(result.length).toBeLessThanOrEqual(1024);
    expect(result).toContain("<redacted");
    expect(result).not.toContain("D".repeat(100));
  });

  it("handles multiple blocks in one string", () => {
    const block = (ref: string) => `<!-- pearl-attachment:v1:${ref}
type: inline
mime: image/webp
data: ${"E".repeat(4000)}
-->`;
    const text = `${block("aaaaaaaaaaaa")}\n\n${block("bbbbbbbbbbbb")}`;
    const result = scrubBase64(text);
    const matches = result.match(/<redacted/g);
    expect(matches?.length).toBe(2);
  });
});
