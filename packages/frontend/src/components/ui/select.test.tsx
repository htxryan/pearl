import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "closed", label: "Closed" },
];

describe("Select", () => {
  describe("single-select trigger", () => {
    it("renders a combobox trigger element", () => {
      render(
        <Select value="open" modal={false}>
          <SelectTrigger aria-label="Status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>,
      );

      const trigger = screen.getByRole("combobox", { name: /status/i });
      expect(trigger).toBeInTheDocument();
    });

    it("shows placeholder text when value is null", () => {
      render(
        <Select value={null} modal={false}>
          <SelectTrigger aria-label="Status">
            <SelectValue placeholder="Pick one..." />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>,
      );

      const trigger = screen.getByRole("combobox", { name: /status/i });
      expect(trigger).toHaveTextContent("Pick one...");
    });

    it("applies size=sm class correctly", () => {
      render(
        <Select value={null} modal={false}>
          <SelectTrigger size="sm" aria-label="Status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open</SelectItem>
          </SelectContent>
        </Select>,
      );

      const trigger = screen.getByRole("combobox", { name: /status/i });
      expect(trigger.className).toContain("text-xs");
      expect(trigger.className).toContain("min-h-[28px]");
    });

    it("applies custom className to trigger", () => {
      render(
        <Select value={null} modal={false}>
          <SelectTrigger className="border-none bg-transparent" aria-label="Status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open</SelectItem>
          </SelectContent>
        </Select>,
      );

      const trigger = screen.getByRole("combobox", { name: /status/i });
      expect(trigger.className).toContain("border-none");
      expect(trigger.className).toContain("bg-transparent");
    });
  });

  describe("multi-select trigger", () => {
    it("renders a combobox trigger for multi-select", () => {
      render(
        <Select multiple value={[]} modal={false}>
          <SelectTrigger aria-label="Filter by status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>,
      );

      const trigger = screen.getByRole("combobox", { name: /filter by status/i });
      expect(trigger).toHaveTextContent("Status");
    });
  });

  describe("SelectValue render function", () => {
    it("supports a render function child for custom display", () => {
      render(
        <Select value={2} modal={false}>
          <SelectTrigger aria-label="Priority">
            <SelectValue>{(v: number | null) => (v != null ? `P${v}` : "Priority")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={0}>P0</SelectItem>
            <SelectItem value={2}>P2</SelectItem>
          </SelectContent>
        </Select>,
      );

      const trigger = screen.getByRole("combobox", { name: /priority/i });
      expect(trigger).toHaveTextContent("P2");
    });
  });
});
