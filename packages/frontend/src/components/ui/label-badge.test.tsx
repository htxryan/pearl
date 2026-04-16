import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LABEL_PALETTE } from "./label-badge";

// ---------------------------------------------------------------------------
// Pure WCAG 2.0 contrast-ratio helpers (no external deps)
// ---------------------------------------------------------------------------

/** Parse a 6-digit hex color into [r, g, b] in 0..255. */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/**
 * Convert an sRGB channel value (0..255) to its linear-light value.
 * Per WCAG 2.0 §1.4.3 relative luminance definition.
 */
function srgbToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance per WCAG 2.0. */
function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

/** WCAG contrast ratio between two hex colors. */
function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ---------------------------------------------------------------------------
// 1. WCAG AA contrast verification
// ---------------------------------------------------------------------------

const LABEL_COLORS = Object.keys(LABEL_PALETTE) as Array<keyof typeof LABEL_PALETTE>;
const WCAG_AA_MIN = 4.5;

describe("WCAG AA contrast verification", () => {
  describe.each(LABEL_COLORS)("color '%s'", (color) => {
    const palette = LABEL_PALETTE[color];

    it("light mode: text on bg meets 4.5:1 ratio", () => {
      const ratio = getContrastRatio(palette.text, palette.bg);
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_MIN);
    });

    it("dark mode: darkText on darkBg meets 4.5:1 ratio", () => {
      const ratio = getContrastRatio(palette.darkText, palette.darkBg);
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_MIN);
    });
  });
});

// ---------------------------------------------------------------------------
// 2. LabelBadge rendering (light mode)
// ---------------------------------------------------------------------------

let mockColorScheme = "light";
vi.mock("@/hooks/use-theme", () => ({
  useTheme: () => ({
    themeId: mockColorScheme,
    theme: { colorScheme: mockColorScheme },
    setTheme: () => {},
  }),
}));

// Import after mock is set up
const { LabelBadge } = await import("./label-badge");

/** Convert a hex color like "#dbeafe" to the "rgb(r, g, b)" format used by jsdom. */
function hexToRgbString(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgb(${r}, ${g}, ${b})`;
}

describe("LabelBadge rendering", () => {
  it("renders the label name text", () => {
    render(<LabelBadge name="Bug" color="blue" />);
    expect(screen.getByText("Bug")).toBeInTheDocument();
  });

  it("applies colored inline styles (not monochrome)", () => {
    const { container } = render(<LabelBadge name="Feature" color="blue" />);
    const span = container.querySelector("span")!;
    expect(span.style.backgroundColor).toBe(hexToRgbString(LABEL_PALETTE.blue.bg));
    expect(span.style.color).toBe(hexToRgbString(LABEL_PALETTE.blue.text));
    // Verify it is NOT falling back to gray (i.e. it is actually colored)
    expect(span.style.backgroundColor).not.toBe(hexToRgbString(LABEL_PALETTE.gray.bg));
    expect(span.style.color).not.toBe(hexToRgbString(LABEL_PALETTE.gray.text));
  });

  it("renders as a span with rounded-full class", () => {
    const { container } = render(<LabelBadge name="Urgent" color="red" />);
    const span = container.querySelector("span")!;
    expect(span.tagName).toBe("SPAN");
    expect(span.className).toContain("rounded-full");
    expect(span.className).toContain("inline-flex");
  });
});

// ---------------------------------------------------------------------------
// 3. LabelBadge without color (fallback to gray)
// ---------------------------------------------------------------------------

describe("LabelBadge without color", () => {
  it("falls back to gray palette when no color provided", () => {
    const { container } = render(<LabelBadge name="Uncolored" />);
    const span = container.querySelector("span")!;
    expect(span.style.backgroundColor).toBe(hexToRgbString(LABEL_PALETTE.gray.bg));
    expect(span.style.color).toBe(hexToRgbString(LABEL_PALETTE.gray.text));
  });
});

// ---------------------------------------------------------------------------
// 4. LabelBadge removable
// ---------------------------------------------------------------------------

describe("LabelBadge removable", () => {
  it("shows an X button with correct aria-label when removable", () => {
    const onRemove = vi.fn();
    render(<LabelBadge name="Cleanup" color="green" removable onRemove={onRemove} />);
    const button = screen.getByRole("button", { name: "Remove label Cleanup" });
    expect(button).toBeInTheDocument();
  });

  it("calls onRemove when the X button is clicked", () => {
    const onRemove = vi.fn();
    render(<LabelBadge name="Cleanup" color="green" removable onRemove={onRemove} />);
    const button = screen.getByRole("button", { name: "Remove label Cleanup" });
    fireEvent.click(button);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("does not show remove button when removable is false", () => {
    render(<LabelBadge name="Static" color="purple" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 5. LabelBadge dark mode rendering
// ---------------------------------------------------------------------------

describe("LabelBadge dark mode rendering", () => {
  beforeEach(() => {
    mockColorScheme = "dark";
  });

  afterEach(() => {
    mockColorScheme = "light";
  });

  it("uses dark palette colors in dark mode", () => {
    const { container } = render(<LabelBadge name="DarkLabel" color="blue" />);
    const span = container.querySelector("span")!;
    expect(span.style.backgroundColor).toBe(hexToRgbString(LABEL_PALETTE.blue.darkBg));
    expect(span.style.color).toBe(hexToRgbString(LABEL_PALETTE.blue.darkText));
  });

  it("uses dark fallback colors when no color provided", () => {
    const { container } = render(<LabelBadge name="NoDarkColor" />);
    const span = container.querySelector("span")!;
    expect(span.style.backgroundColor).toBe(hexToRgbString(LABEL_PALETTE.gray.darkBg));
    expect(span.style.color).toBe(hexToRgbString(LABEL_PALETTE.gray.darkText));
  });
});
