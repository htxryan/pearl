import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { parseRelativeDate } from "./parse-relative-date";

describe("parseRelativeDate", () => {
  beforeEach(() => {
    // Fix "today" to Wednesday April 15, 2026
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 15, 10, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("parses 'today'", () => {
    const result = parseRelativeDate("today");
    expect(result).toEqual(new Date(2026, 3, 15, 0, 0, 0));
  });

  it("parses 'tomorrow'", () => {
    const result = parseRelativeDate("tomorrow");
    expect(result).toEqual(new Date(2026, 3, 16, 0, 0, 0));
  });

  it("parses 'yesterday'", () => {
    const result = parseRelativeDate("yesterday");
    expect(result).toEqual(new Date(2026, 3, 14, 0, 0, 0));
  });

  it("parses 'next monday'", () => {
    // April 15 2026 is Wednesday, next Monday is April 20
    const result = parseRelativeDate("next monday");
    expect(result).not.toBeNull();
    expect(result!.getDay()).toBe(1); // Monday
    expect(result!.getDate()).toBe(20);
  });

  it("parses 'next friday'", () => {
    // April 15 2026 is Wednesday, next Friday is April 17
    const result = parseRelativeDate("next friday");
    expect(result).not.toBeNull();
    expect(result!.getDay()).toBe(5); // Friday
    expect(result!.getDate()).toBe(17);
  });

  it("parses 'next sunday'", () => {
    const result = parseRelativeDate("next sunday");
    expect(result).not.toBeNull();
    expect(result!.getDay()).toBe(0); // Sunday
  });

  it("parses 'in 2 days'", () => {
    const result = parseRelativeDate("in 2 days");
    expect(result).toEqual(new Date(2026, 3, 17, 0, 0, 0));
  });

  it("parses 'in 1 day'", () => {
    const result = parseRelativeDate("in 1 day");
    expect(result).toEqual(new Date(2026, 3, 16, 0, 0, 0));
  });

  it("parses 'in 2 weeks'", () => {
    const result = parseRelativeDate("in 2 weeks");
    expect(result).toEqual(new Date(2026, 3, 29, 0, 0, 0));
  });

  it("parses 'in 3 months'", () => {
    const result = parseRelativeDate("in 3 months");
    expect(result).toEqual(new Date(2026, 6, 15, 0, 0, 0));
  });

  it("is case-insensitive", () => {
    expect(parseRelativeDate("TODAY")).toEqual(new Date(2026, 3, 15, 0, 0, 0));
    expect(parseRelativeDate("Next Monday")).not.toBeNull();
    expect(parseRelativeDate("In 2 Weeks")).not.toBeNull();
  });

  it("returns null for unrecognized input", () => {
    expect(parseRelativeDate("")).toBeNull();
    expect(parseRelativeDate("foo")).toBeNull();
    expect(parseRelativeDate("next holiday")).toBeNull();
    expect(parseRelativeDate("in zero days")).toBeNull();
  });

  it("handles whitespace", () => {
    expect(parseRelativeDate("  today  ")).toEqual(new Date(2026, 3, 15, 0, 0, 0));
  });
});
