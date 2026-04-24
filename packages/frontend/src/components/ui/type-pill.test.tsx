import type { IssueType } from "@pearl/shared";
import { ISSUE_TYPES } from "@pearl/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TYPE_PILL_CONFIG, TypePill } from "./type-pill";

describe("TypePill", () => {
  it.each(ISSUE_TYPES)("renders label and icon for type %s", (type) => {
    const { container } = render(<TypePill type={type} />);
    const expectedLabel = TYPE_PILL_CONFIG[type].label;
    expect(screen.getByText(expectedLabel)).toBeInTheDocument();
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders as a rounded pill span", () => {
    const { container } = render(<TypePill type="task" />);
    const span = container.querySelector("span");
    if (!span) throw new Error("expected span");
    expect(span.tagName).toBe("SPAN");
    expect(span.className).toContain("rounded-full");
    expect(span.className).toContain("inline-flex");
  });

  it("has a TYPE_PILL_CONFIG entry for every IssueType", () => {
    for (const type of ISSUE_TYPES) {
      expect(TYPE_PILL_CONFIG[type]).toBeDefined();
      expect(TYPE_PILL_CONFIG[type].label).toBeTruthy();
      expect(TYPE_PILL_CONFIG[type].className).toBeTruthy();
      expect(TYPE_PILL_CONFIG[type].Icon).toBeTruthy();
    }
  });

  it("assigns a distinct color class to each type (no monochrome)", () => {
    const classes = new Set(ISSUE_TYPES.map((t) => TYPE_PILL_CONFIG[t].className));
    expect(classes.size).toBe(ISSUE_TYPES.length);
  });

  it("hides the label in iconOnly mode and exposes it via aria-label", () => {
    render(<TypePill type="bug" iconOnly />);
    expect(screen.queryByText("Bug")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Bug")).toBeInTheDocument();
  });

  it("falls back gracefully for an unknown type", () => {
    // Cast to exercise runtime fallback path.
    const { container } = render(<TypePill type={"unknown" as IssueType} />);
    expect(container.querySelector("span")).toBeInTheDocument();
    expect(screen.getByText("unknown")).toBeInTheDocument();
  });
});
