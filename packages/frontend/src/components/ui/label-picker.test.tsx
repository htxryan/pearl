import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LabelPicker } from "./label-picker";

vi.mock("@/hooks/use-theme", () => ({
  useTheme: () => ({ theme: { colorScheme: "light" } }),
}));

const mockMutateAsync = vi.fn().mockResolvedValue(undefined);
vi.mock("@/hooks/use-labels", () => ({
  useLabels: () => ({
    data: [
      { name: "frontend", color: "blue", count: 5 },
      { name: "backend", color: "green", count: 3 },
      { name: "urgent", color: "red", count: 1 },
    ],
  }),
  useCreateLabel: () => ({
    mutateAsync: mockMutateAsync,
  }),
}));

function renderPicker(overrides: Partial<React.ComponentProps<typeof LabelPicker>> = {}) {
  const defaultProps: React.ComponentProps<typeof LabelPicker> = {
    selected: [],
    selectedColors: {},
    onChange: vi.fn(),
    allowCreate: true,
    ...overrides,
  };
  const result = render(<LabelPicker {...defaultProps} />);
  return { ...result, onChange: defaultProps.onChange as ReturnType<typeof vi.fn> };
}

describe("LabelPicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
  });

  describe("rendering", () => {
    it("renders a combobox input element", () => {
      renderPicker();
      const input = screen.getByRole("combobox", { name: /search labels/i });
      expect(input).toBeInTheDocument();
    });

    it("shows placeholder when no labels selected", () => {
      renderPicker({ placeholder: "Search labels..." });
      const input = screen.getByRole("combobox", { name: /search labels/i });
      expect(input).toHaveAttribute("placeholder", "Search labels...");
    });

    it("clears placeholder when labels are selected", () => {
      renderPicker({
        selected: ["frontend"],
        selectedColors: { frontend: "blue" },
      });
      const input = screen.getByRole("combobox", { name: /search labels/i });
      expect(input).toHaveAttribute("placeholder", "");
    });

    it("renders selected labels as chips", () => {
      renderPicker({
        selected: ["frontend", "backend"],
        selectedColors: { frontend: "blue", backend: "green" },
      });
      expect(screen.getByText("frontend")).toBeInTheDocument();
      expect(screen.getByText("backend")).toBeInTheDocument();
    });
  });

  describe("chip removal", () => {
    it("calls onChange without the removed label when chip remove is clicked", () => {
      const { onChange } = renderPicker({
        selected: ["frontend", "backend"],
        selectedColors: { frontend: "blue", backend: "green" },
      });

      const removeButtons = screen.getAllByRole("button", { name: /remove/i });
      fireEvent.click(removeButtons[0]);

      expect(onChange).toHaveBeenCalledWith(["backend"]);
    });
  });

  describe("backspace removes last selected", () => {
    it("removes the last selected label when input is empty and Backspace is pressed", () => {
      const { onChange } = renderPicker({
        selected: ["frontend", "backend"],
        selectedColors: { frontend: "blue", backend: "green" },
      });
      const input = screen.getByRole("combobox", { name: /search labels/i });

      fireEvent.keyDown(input, { key: "Backspace" });

      expect(onChange).toHaveBeenCalledWith(["frontend"]);
    });
  });

  describe("API contract", () => {
    it("onChange receives string[] of label names", () => {
      const onChange = vi.fn();
      renderPicker({ onChange });

      const removeCheck = vi.fn();
      renderPicker({
        selected: ["frontend"],
        selectedColors: { frontend: "blue" },
        onChange: removeCheck,
      });

      const removeButtons = screen.getAllByRole("button", { name: /remove/i });
      fireEvent.click(removeButtons[0]);

      const result = removeCheck.mock.calls[0][0];
      expect(Array.isArray(result)).toBe(true);
      expect(result.every((v: unknown) => typeof v === "string")).toBe(true);
    });
  });
});
