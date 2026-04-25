import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppSidebar, toggleSidebar } from "./sidebar";
import { SidebarProvider } from "./ui/sidebar";

vi.mock("@/hooks/use-issues", () => ({
  useHealth: () => ({ data: { project_prefix: "TEST" } }),
}));

vi.mock("@/hooks/use-media-query", () => ({
  useIsMobile: () => false,
}));

function getCookie(name: string): string | undefined {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

function clearCookies() {
  document.cookie.split(";").forEach((c) => {
    const name = c.split("=")[0].trim();
    if (name) document.cookie = `${name}=; max-age=0; path=/`;
  });
}

function renderSidebar() {
  return render(
    <MemoryRouter initialEntries={["/list"]}>
      <SidebarProvider>
        <AppSidebar />
      </SidebarProvider>
    </MemoryRouter>,
  );
}

describe("Sidebar", () => {
  beforeEach(() => {
    localStorage.clear();
    clearCookies();
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
    expect(screen.getByText("List")).toHaveClass("opacity-0");
    expect(screen.getByText("Board")).toHaveClass("opacity-0");
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

  it("persists collapsed state to cookie", () => {
    renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: /collapse sidebar/i }));
    expect(getCookie("sidebar:state")).toBe("false");
  });

  it("restores collapsed state from cookie", () => {
    document.cookie = "sidebar:state=false; path=/";
    renderSidebar();
    expect(screen.getByText("List")).toHaveClass("opacity-0");
    expect(screen.getByRole("button", { name: /expand sidebar/i })).toBeInTheDocument();
  });

  it("responds to toggleSidebar() dispatched event", () => {
    renderSidebar();
    expect(screen.getByText("List")).toBeInTheDocument();
    act(() => toggleSidebar());
    expect(screen.getByText("List")).toHaveClass("opacity-0");
  });

  it("shows tooltips on nav items when collapsed", () => {
    renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: /collapse sidebar/i }));
    const listLink = screen.getByRole("link", { name: /list/i });
    expect(listLink).toHaveAttribute("title", "List");
  });
});

describe("Sidebar legacy migration (F5)", () => {
  beforeEach(() => {
    localStorage.clear();
    clearCookies();
  });

  it("reads legacy pearl:sidebar-collapsed from localStorage, writes cookie, deletes legacy key", () => {
    localStorage.setItem("pearl:sidebar-collapsed", "true");
    renderSidebar();
    expect(getCookie("sidebar:state")).toBe("false");
    expect(localStorage.getItem("pearl:sidebar-collapsed")).toBeNull();
    expect(screen.getByText("List")).toHaveClass("opacity-0");
  });

  it("migrates expanded state from legacy localStorage", () => {
    localStorage.setItem("pearl:sidebar-collapsed", "false");
    renderSidebar();
    expect(getCookie("sidebar:state")).toBe("true");
    expect(localStorage.getItem("pearl:sidebar-collapsed")).toBeNull();
  });

  it("ignores legacy key if cookie already set", () => {
    localStorage.setItem("pearl:sidebar-collapsed", "true");
    document.cookie = "sidebar:state=true; path=/";
    renderSidebar();
    expect(screen.getByText("List")).not.toHaveClass("opacity-0");
  });
});
