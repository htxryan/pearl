import { describe, expect, it } from "vitest";
import { getDirection } from "./page-transition";

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
