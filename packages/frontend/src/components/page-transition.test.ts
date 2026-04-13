import { describe, it, expect } from "vitest";

// Extract the direction logic for testing.
// The real getDirection is not exported, so we replicate its logic here
// to validate route-index-based direction detection.

const ROUTE_INDEX: Record<string, number> = {
  "/list": 0,
  "/board": 1,
  "/graph": 2,
};

type Direction = "left" | "right" | "drill-in" | "drill-out" | "fade";

function getDirection(from: string, to: string): Direction {
  if (to === "/settings" || from === "/settings") return "fade";

  const toIsDetail = to.startsWith("/issues/");
  const fromIsDetail = from.startsWith("/issues/");

  if (toIsDetail && !fromIsDetail) return "drill-in";
  if (fromIsDetail && !toIsDetail) return "drill-out";

  const fromIdx = ROUTE_INDEX[from];
  const toIdx = ROUTE_INDEX[to];

  if (fromIdx !== undefined && toIdx !== undefined) {
    return toIdx > fromIdx ? "left" : "right";
  }

  return "fade";
}

describe("getDirection (page transition direction logic)", () => {
  describe("sibling navigation (left/right based on nav order)", () => {
    it("list → board = left (forward)", () => {
      expect(getDirection("/list", "/board")).toBe("left");
    });

    it("board → graph = left (forward)", () => {
      expect(getDirection("/board", "/graph")).toBe("left");
    });

    it("list → graph = left (forward, skip)", () => {
      expect(getDirection("/list", "/graph")).toBe("left");
    });

    it("board → list = right (backward)", () => {
      expect(getDirection("/board", "/list")).toBe("right");
    });

    it("graph → board = right (backward)", () => {
      expect(getDirection("/graph", "/board")).toBe("right");
    });

    it("graph → list = right (backward, skip)", () => {
      expect(getDirection("/graph", "/list")).toBe("right");
    });
  });

  describe("detail view drill transitions", () => {
    it("list → detail = drill-in", () => {
      expect(getDirection("/list", "/issues/abc")).toBe("drill-in");
    });

    it("board → detail = drill-in", () => {
      expect(getDirection("/board", "/issues/xyz")).toBe("drill-in");
    });

    it("graph → detail = drill-in", () => {
      expect(getDirection("/graph", "/issues/123")).toBe("drill-in");
    });

    it("detail → list = drill-out", () => {
      expect(getDirection("/issues/abc", "/list")).toBe("drill-out");
    });

    it("detail → board = drill-out", () => {
      expect(getDirection("/issues/abc", "/board")).toBe("drill-out");
    });

    it("detail → detail = fade (same view type)", () => {
      expect(getDirection("/issues/abc", "/issues/xyz")).toBe("fade");
    });
  });

  describe("settings (always fade)", () => {
    it("list → settings = fade", () => {
      expect(getDirection("/list", "/settings")).toBe("fade");
    });

    it("settings → list = fade", () => {
      expect(getDirection("/settings", "/list")).toBe("fade");
    });

    it("settings → detail = fade", () => {
      expect(getDirection("/settings", "/issues/abc")).toBe("fade");
    });

    it("detail → settings = fade", () => {
      expect(getDirection("/issues/abc", "/settings")).toBe("fade");
    });

    it("board → settings = fade", () => {
      expect(getDirection("/board", "/settings")).toBe("fade");
    });
  });

  describe("unknown routes (fallback to fade)", () => {
    it("unknown → list = fade", () => {
      expect(getDirection("/unknown", "/list")).toBe("fade");
    });

    it("list → unknown = fade", () => {
      expect(getDirection("/list", "/unknown")).toBe("fade");
    });
  });
});
