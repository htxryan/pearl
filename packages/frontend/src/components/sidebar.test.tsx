import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Sidebar, toggleSidebar } from "./sidebar";

vi.mock("@/hooks/use-issues", () => ({
  useHealth: () => ({ data: { project_prefix: "TEST" } }),
}));

vi.mock("@/hooks/use-media-query", () => ({
  useIsMobile: () => false,
}));

function renderSidebar() {
  return render(
    <MemoryRouter initialEntries={["/list"]}>
      <Sidebar />
    </MemoryRouter>,
  );
}

describe("Sidebar", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders expanded by default with nav labels visible", () => {
    renderSidebar();
    expect(screen.getByText("List")).toBeInTheDocument();
    expect(screen.getByText("Board")).toBeInTheDocument();
    expect(screen.getByText("Graph")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("collapses when the toggle button is clicked", () => {
    renderSidebar();
    const toggle = screen.getByRole("button", { name: /collapse sidebar/i });
    fireEvent.click(toggle);
    expect(screen.queryByText("List")).not.toBeInTheDocument();
    expect(screen.queryByText("Board")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /expand sidebar/i })).toBeInTheDocument();
  });

  it("expands when the toggle button is clicked again", () => {
    renderSidebar();
    const collapse = screen.getByRole("button", { name: /collapse sidebar/i });
    fireEvent.click(collapse);
    const expand = screen.getByRole("button", { name: /expand sidebar/i });
    fireEvent.click(expand);
    expect(screen.getByText("List")).toBeInTheDocument();
  });

  it("persists collapsed state to localStorage", () => {
    renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: /collapse sidebar/i }));
    expect(JSON.parse(localStorage.getItem("pearl:sidebar-collapsed") ?? "false")).toBe(true);
  });

  it("restores collapsed state from localStorage", () => {
    localStorage.setItem("pearl:sidebar-collapsed", "true");
    renderSidebar();
    expect(screen.queryByText("List")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /expand sidebar/i })).toBeInTheDocument();
  });

  it("responds to toggleSidebar() dispatched event", () => {
    renderSidebar();
    expect(screen.getByText("List")).toBeInTheDocument();
    act(() => toggleSidebar());
    expect(screen.queryByText("List")).not.toBeInTheDocument();
  });

  it("shows tooltips on nav items when collapsed", () => {
    renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: /collapse sidebar/i }));
    const listLink = screen.getByRole("link", { name: /list/i });
    expect(listLink).toHaveAttribute("title", "List");
  });
});
