import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { LabelPicker } from "./label-picker";

// Mock useTheme
vi.mock("@/hooks/use-theme", () => ({
  useTheme: () => ({ theme: { colorScheme: "light" } }),
}));

// Mock use-labels
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
    // jsdom does not implement scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();
  });

  // 1. Autocomplete filtering
  describe("autocomplete filtering", () => {
    it("renders matching labels as user types a partial name", () => {
      renderPicker();
      const input = screen.getByRole("combobox", { name: /search labels/i });

      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: "front" } });

      // 1 matching label + 1 "Create" option (since "front" is not an exact match)
      const options = screen.getAllByRole("option");
      expect(options).toHaveLength(2);
      expect(screen.getByText("frontend")).toBeInTheDocument();
    });

    it("shows all labels when search is empty", () => {
      renderPicker();
      const input = screen.getByRole("combobox", { name: /search labels/i });

      fireEvent.focus(input);

      const options = screen.getAllByRole("option");
      expect(options).toHaveLength(3);
    });

    it("excludes already-selected labels from the dropdown", () => {
      renderPicker({ selected: ["frontend"], selectedColors: { frontend: "blue" } });
      const input = screen.getByRole("combobox", { name: /search labels/i });

      fireEvent.focus(input);

      const options = screen.getAllByRole("option");
      expect(options).toHaveLength(2);
      // "frontend" should not be an option since it's selected
      const optionTexts = options.map((o) => o.textContent);
      expect(optionTexts.join(",")).not.toContain("frontend");
    });
  });

  // 2. Selecting existing label
  describe("selecting existing label", () => {
    it("calls onChange with updated array when clicking an option", () => {
      const { onChange } = renderPicker();
      const input = screen.getByRole("combobox", { name: /search labels/i });

      fireEvent.focus(input);

      const options = screen.getAllByRole("option");
      // Click the first option (frontend)
      fireEvent.click(options[0]);

      expect(onChange).toHaveBeenCalledWith(["frontend"]);
    });

    it("appends to existing selection when selecting another label", () => {
      const { onChange } = renderPicker({
        selected: ["urgent"],
        selectedColors: { urgent: "red" },
      });
      const input = screen.getByRole("combobox", { name: /search labels/i });

      fireEvent.focus(input);

      // "urgent" is already selected so shouldn't be in list; click "frontend"
      const options = screen.getAllByRole("option");
      fireEvent.click(options[0]);

      expect(onChange).toHaveBeenCalledWith(["urgent", "frontend"]);
    });
  });

  // 3. Quick-create on Enter
  describe("quick-create on Enter", () => {
    it("calls createLabel mutation when pressing Enter on a new name", async () => {
      renderPicker();
      const input = screen.getByRole("combobox", { name: /search labels/i });

      await act(async () => {
        fireEvent.change(input, { target: { value: "newlabel" } });
      });

      // The "Create" option should be visible
      expect(screen.getByText("Create")).toBeInTheDocument();

      // Press ArrowDown to highlight the create option, then Enter
      // But first check how many options there are (0 filtered + 1 create = 1)
      const options = screen.getAllByRole("option");
      expect(options).toHaveLength(1);

      // The create option is at index 0 (no matching labels), and highlightIndex starts at 0
      // so pressing Enter should trigger quick-create
      await act(async () => {
        fireEvent.keyDown(input, { key: "Enter" });
      });

      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ name: "newlabel" }),
      );
    });
  });

  // 4. Color picker panel
  describe("color picker panel", () => {
    it("shows 9 color buttons when clicking the Create option", async () => {
      renderPicker();
      const input = screen.getByRole("combobox", { name: /search labels/i });

      fireEvent.change(input, { target: { value: "newlabel" } });

      // Click the Create option (last option in the listbox) to open color picker
      const options = screen.getAllByRole("option");
      const createOpt = options[options.length - 1];
      fireEvent.click(createOpt);

      // Now the color picker panel should be visible with 9 color buttons
      const colorNames = ["red", "orange", "yellow", "green", "teal", "blue", "purple", "pink", "gray"];
      for (const colorName of colorNames) {
        expect(screen.getByRole("button", { name: colorName })).toBeInTheDocument();
      }
    });

    it("calls createLabel with selected color when confirming in color picker", async () => {
      renderPicker();
      const input = screen.getByRole("combobox", { name: /search labels/i });

      fireEvent.change(input, { target: { value: "design" } });

      // Click the Create option to show color picker
      const options = screen.getAllByRole("option");
      const createOpt = options[options.length - 1];
      fireEvent.click(createOpt);

      // Click the "purple" color button
      const purpleBtn = screen.getByRole("button", { name: "purple" });
      fireEvent.click(purpleBtn);

      // Click the "Create" confirm button
      const confirmBtn = screen.getByRole("button", { name: /create/i });
      await act(async () => {
        fireEvent.click(confirmBtn);
      });

      expect(mockMutateAsync).toHaveBeenCalledWith({ name: "design", color: "purple" });
    });
  });

  // 5. Keyboard navigation
  describe("keyboard navigation", () => {
    it("arrow keys move highlight through options", () => {
      renderPicker();
      const input = screen.getByRole("combobox", { name: /search labels/i });

      fireEvent.focus(input);

      // Initially first option is highlighted
      let options = screen.getAllByRole("option");
      expect(options[0]).toHaveAttribute("aria-selected", "true");
      expect(options[1]).toHaveAttribute("aria-selected", "false");

      // Press ArrowDown
      fireEvent.keyDown(input, { key: "ArrowDown" });

      options = screen.getAllByRole("option");
      expect(options[0]).toHaveAttribute("aria-selected", "false");
      expect(options[1]).toHaveAttribute("aria-selected", "true");

      // Press ArrowUp should go back
      fireEvent.keyDown(input, { key: "ArrowUp" });

      options = screen.getAllByRole("option");
      expect(options[0]).toHaveAttribute("aria-selected", "true");
      expect(options[1]).toHaveAttribute("aria-selected", "false");
    });

    it("Escape closes the dropdown", () => {
      renderPicker();
      const input = screen.getByRole("combobox", { name: /search labels/i });

      fireEvent.focus(input);

      // Dropdown should be open
      expect(screen.getByRole("listbox")).toBeInTheDocument();

      fireEvent.keyDown(input, { key: "Escape" });

      // Dropdown should be closed
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });

    it("Enter selects the highlighted existing label", () => {
      const { onChange } = renderPicker();
      const input = screen.getByRole("combobox", { name: /search labels/i });

      fireEvent.focus(input);

      // First item is highlighted by default
      fireEvent.keyDown(input, { key: "Enter" });

      expect(onChange).toHaveBeenCalledWith(["frontend"]);
    });
  });

  // 6. Backspace removes last selected
  describe("backspace removes last selected", () => {
    it("removes the last selected label when input is empty and Backspace is pressed", () => {
      const { onChange } = renderPicker({
        selected: ["frontend", "backend"],
        selectedColors: { frontend: "blue", backend: "green" },
      });
      const input = screen.getByRole("combobox", { name: /search labels/i });

      // Input is empty, pressing Backspace should remove the last label
      fireEvent.keyDown(input, { key: "Backspace" });

      expect(onChange).toHaveBeenCalledWith(["frontend"]);
    });

    it("does not remove labels when input has text", () => {
      const { onChange } = renderPicker({
        selected: ["frontend"],
        selectedColors: { frontend: "blue" },
      });
      const input = screen.getByRole("combobox", { name: /search labels/i });

      fireEvent.change(input, { target: { value: "x" } });
      fireEvent.keyDown(input, { key: "Backspace" });

      // onChange should not have been called to remove a label
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  // 7. allowCreate=false
  describe("allowCreate=false", () => {
    it("does not show a Create option when typing a new name", () => {
      renderPicker({ allowCreate: false });
      const input = screen.getByRole("combobox", { name: /search labels/i });

      fireEvent.change(input, { target: { value: "nonexistent" } });

      // Should show "No matching labels" instead of a Create option
      expect(screen.queryByText("Create")).not.toBeInTheDocument();
      expect(screen.getByText("No matching labels")).toBeInTheDocument();
    });

    it("still shows matching labels when filtering", () => {
      renderPicker({ allowCreate: false });
      const input = screen.getByRole("combobox", { name: /search labels/i });

      fireEvent.change(input, { target: { value: "front" } });

      const options = screen.getAllByRole("option");
      expect(options).toHaveLength(1);
      expect(screen.getByText("frontend")).toBeInTheDocument();
    });
  });
});
