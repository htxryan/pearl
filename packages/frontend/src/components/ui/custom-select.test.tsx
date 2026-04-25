import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CustomSelect } from "./custom-select";

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "closed", label: "Closed" },
  { value: "blocked", label: "Blocked" },
  { value: "deferred", label: "Deferred" },
];

describe("CustomSelect", () => {
  describe("multi-select trigger", () => {
    it("shows the placeholder label even when values are selected", () => {
      render(
        <CustomSelect
          multiple
          value={["open", "in_progress"]}
          options={STATUS_OPTIONS}
          onChange={vi.fn()}
          placeholder="Status"
          aria-label="Filter by status"
        />,
      );

      const trigger = screen.getByRole("combobox", { name: /filter by status/i });
      expect(trigger).toHaveTextContent(/Status/);
    });

    it("renders one chip per selected value instead of a comma-joined string", () => {
      render(
        <CustomSelect
          multiple
          value={["open", "in_progress", "deferred"]}
          options={STATUS_OPTIONS}
          onChange={vi.fn()}
          placeholder="Status"
          aria-label="Filter by status"
        />,
      );

      const trigger = screen.getByRole("combobox", { name: /filter by status/i });
      // No comma-joined text
      expect(trigger.textContent).not.toMatch(/Open,\s*In Progress/);
      // Each value is rendered as a removable chip with its own remove control
      expect(within(trigger).getByRole("button", { name: /remove open/i })).toBeInTheDocument();
      expect(
        within(trigger).getByRole("button", { name: /remove in progress/i }),
      ).toBeInTheDocument();
      expect(within(trigger).getByRole("button", { name: /remove deferred/i })).toBeInTheDocument();
    });

    it("removes a value when its chip remove button is clicked, without opening the dropdown", () => {
      const onChange = vi.fn();
      render(
        <CustomSelect
          multiple
          value={["open", "in_progress"]}
          options={STATUS_OPTIONS}
          onChange={onChange}
          placeholder="Status"
          aria-label="Filter by status"
        />,
      );

      const trigger = screen.getByRole("combobox", { name: /filter by status/i });
      const remove = within(trigger).getByRole("button", { name: /remove open/i });
      fireEvent.click(remove);

      expect(onChange).toHaveBeenCalledWith(["in_progress"]);
      // Dropdown should not have opened from the remove click
      expect(trigger).toHaveAttribute("aria-expanded", "false");
    });

    it("applies the active (purple) styling when any value is selected", () => {
      render(
        <CustomSelect
          multiple
          value={["open"]}
          options={STATUS_OPTIONS}
          onChange={vi.fn()}
          placeholder="Status"
          aria-label="Filter by status"
        />,
      );

      const trigger = screen.getByRole("combobox", { name: /filter by status/i });
      expect(trigger.className).toMatch(/border-primary/);
      expect(trigger.className).toMatch(/text-primary/);
    });

    it("shows just the placeholder (no chips) when nothing is selected", () => {
      render(
        <CustomSelect
          multiple
          value={[]}
          options={STATUS_OPTIONS}
          onChange={vi.fn()}
          placeholder="Status"
          aria-label="Filter by status"
        />,
      );

      const trigger = screen.getByRole("combobox", { name: /filter by status/i });
      expect(trigger).toHaveTextContent(/Status/);
      expect(within(trigger).queryByRole("button", { name: /remove/i })).not.toBeInTheDocument();
    });
  });

  describe("single-select trigger", () => {
    it("shows the selected value's label", () => {
      render(
        <CustomSelect
          value="open"
          options={STATUS_OPTIONS}
          onChange={vi.fn()}
          placeholder="Status"
          aria-label="Status"
        />,
      );

      const trigger = screen.getByRole("combobox", { name: /status/i });
      expect(trigger).toHaveTextContent("Open");
    });

    it("falls back to placeholder when value is null", () => {
      render(
        <CustomSelect
          value={null}
          options={STATUS_OPTIONS}
          onChange={vi.fn()}
          placeholder="Pick one..."
          aria-label="Status"
        />,
      );

      const trigger = screen.getByRole("combobox", { name: /status/i });
      expect(trigger).toHaveTextContent("Pick one...");
    });
  });
});
