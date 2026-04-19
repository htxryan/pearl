import { describe, expect, it } from "vitest";
import { computeAdaptiveLength, computeContentHash, encodeBase36 } from "./sql-writer.js";

describe("encodeBase36", () => {
  it("produces correct length output", () => {
    const data = Buffer.from([0xff, 0xab]);
    const result = encodeBase36(data, 3);
    expect(result).toHaveLength(3);
  });

  it("pads short results with leading zeros", () => {
    const data = Buffer.from([0x00, 0x01]);
    const result = encodeBase36(data, 5);
    expect(result).toHaveLength(5);
    expect(result).toMatch(/^0+/);
  });

  it("truncates long results keeping least significant digits", () => {
    const data = Buffer.from([0xff, 0xff, 0xff, 0xff, 0xff]);
    const result3 = encodeBase36(data, 3);
    const result8 = encodeBase36(data, 8);
    expect(result3).toHaveLength(3);
    expect(result8).toHaveLength(8);
    expect(result8.endsWith(result3)).toBe(true);
  });

  it("only uses base36 characters", () => {
    const data = Buffer.from([0xde, 0xad, 0xbe, 0xef]);
    const result = encodeBase36(data, 6);
    expect(result).toMatch(/^[0-9a-z]+$/);
  });

  it("handles all-zero input", () => {
    const data = Buffer.from([0x00, 0x00]);
    const result = encodeBase36(data, 3);
    expect(result).toBe("000");
  });

  it("is deterministic", () => {
    const data = Buffer.from([0x42, 0x7a, 0x9c]);
    const a = encodeBase36(data, 4);
    const b = encodeBase36(data, 4);
    expect(a).toBe(b);
  });
});

describe("computeAdaptiveLength", () => {
  it("returns 3 for small projects (<180 issues)", () => {
    expect(computeAdaptiveLength(0)).toBe(3);
    expect(computeAdaptiveLength(50)).toBe(3);
    expect(computeAdaptiveLength(100)).toBe(3);
    expect(computeAdaptiveLength(150)).toBe(3);
  });

  it("returns 4 for medium projects (~200-900 issues)", () => {
    expect(computeAdaptiveLength(200)).toBe(4);
    expect(computeAdaptiveLength(500)).toBe(4);
    expect(computeAdaptiveLength(900)).toBe(4);
  });

  it("returns 5 for ~1000+ issues", () => {
    expect(computeAdaptiveLength(1000)).toBe(5);
    expect(computeAdaptiveLength(5000)).toBe(5);
  });

  it("returns higher lengths for very large projects", () => {
    expect(computeAdaptiveLength(10000)).toBeGreaterThanOrEqual(5);
    expect(computeAdaptiveLength(100000)).toBeGreaterThanOrEqual(6);
  });

  it("never exceeds maxLength", () => {
    expect(computeAdaptiveLength(1_000_000_000)).toBe(8);
  });

  it("respects custom min/max bounds", () => {
    expect(computeAdaptiveLength(0, 4, 6)).toBe(4);
    expect(computeAdaptiveLength(1_000_000_000, 3, 5)).toBe(5);
  });
});

describe("computeContentHash", () => {
  it("returns a 64-character hex string", () => {
    const hash = computeContentHash({ title: "Test issue" });
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it("is deterministic", () => {
    const fields = { title: "Test", description: "desc", priority: 1 as const };
    const a = computeContentHash(fields);
    const b = computeContentHash(fields);
    expect(a).toBe(b);
  });

  it("changes when any field changes", () => {
    const base = { title: "Test", description: "desc", status: "open" };
    const modified = { ...base, description: "different desc" };
    expect(computeContentHash(base)).not.toBe(computeContentHash(modified));
  });

  it("differentiates by priority", () => {
    const p0 = computeContentHash({ title: "X", priority: 0 as const });
    const p4 = computeContentHash({ title: "X", priority: 4 as const });
    expect(p0).not.toBe(p4);
  });

  it("handles empty/missing fields consistently", () => {
    const a = computeContentHash({});
    const b = computeContentHash({ title: "", description: "", notes: "" });
    expect(a).toBe(b);
  });

  it("handles pinned and template flags", () => {
    const plain = computeContentHash({ title: "X" });
    const pinned = computeContentHash({ title: "X", pinned: true });
    const template = computeContentHash({ title: "X", is_template: true });
    expect(plain).not.toBe(pinned);
    expect(plain).not.toBe(template);
    expect(pinned).not.toBe(template);
  });
});

describe("performance characteristics", () => {
  it("computeContentHash completes in <1ms (p99 budget for <200ms total)", () => {
    const iterations = 1000;
    const fields = {
      title: "Performance test issue",
      description: "A reasonably long description for benchmarking purposes",
      status: "open",
      priority: 2 as const,
      issue_type: "task",
      assignee: "user@example.com",
      owner: "user@example.com",
      created_by: "user@example.com",
    };

    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      computeContentHash(fields);
    }
    const elapsed = performance.now() - start;
    const p99 = elapsed / iterations;

    expect(p99).toBeLessThan(1);
  });

  it("encodeBase36 completes in <0.1ms per call", () => {
    const iterations = 10000;
    const data = Buffer.from([0xde, 0xad, 0xbe, 0xef, 0xca]);

    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      encodeBase36(data, 6);
    }
    const elapsed = performance.now() - start;

    expect(elapsed / iterations).toBeLessThan(0.1);
  });
});

describe("sql-writer integration (unit-level sanity)", () => {
  it("encodeBase36 round-trip: different inputs produce different IDs", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const data = Buffer.alloc(2);
      data.writeUInt16BE(i);
      ids.add(encodeBase36(data, 3));
    }
    expect(ids.size).toBe(100);
  });

  it("computeAdaptiveLength increases monotonically with issue count", () => {
    let prev = computeAdaptiveLength(0);
    for (const n of [100, 500, 1000, 5000, 10000, 50000, 500000]) {
      const cur = computeAdaptiveLength(n);
      expect(cur).toBeGreaterThanOrEqual(prev);
      prev = cur;
    }
  });
});
