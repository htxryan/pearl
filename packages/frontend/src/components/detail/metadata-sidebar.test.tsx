import type { Issue } from "@pearl/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, renderHook, screen } from "@testing-library/react";
import { act } from "react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_SIDEBAR_WIDTH,
  MAX_SIDEBAR_WIDTH,
  MetadataSidebar,
  MIN_SIDEBAR_WIDTH,
  useMetadataSidebarState,
} from "./metadata-sidebar";

vi.mock("@/hooks/use-labels", () => ({
  useLabels: () => ({ data: [] }),
  useCreateLabel: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
}));

const baseIssue: Issue = {
  id: "pearl-beads-sidebar",
  title: "Sidebar Test",
  description: "",
  design: "",
  acceptance_criteria: "",
  notes: "",
  status: "open",
  priority: 2,
  issue_type: "task",
  assignee: "alice",
  owner: "bob",
  estimated_minutes: null,
  created_at: "2026-04-10T10:00:00Z",
  created_by: "bob",
  updated_at: "2026-04-10T12:00:00Z",
  closed_at: null,
  due_at: null,
  defer_until: null,
  external_ref: null,
  spec_id: null,
  pinned: false,
  is_template: false,
  has_attachments: false,
  labels: [],
  labelColors: {},
  metadata: {},
};

function renderSidebar(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("MetadataSidebar (sidebar layout)", () => {
  it("renders the Fields heading and all required fields when expanded", () => {
    renderSidebar(
      <MetadataSidebar
        issue={baseIssue}
        onFieldUpdate={() => {}}
        collapsed={false}
        onToggleCollapsed={() => {}}
        width={DEFAULT_SIDEBAR_WIDTH}
        onWidthChange={() => {}}
      />,
    );

    expect(screen.getByRole("complementary", { name: "Issue metadata" })).toBeDefined();
    expect(screen.getByText("Fields")).toBeDefined();
    // A sampling of fields the epic requires.
    expect(screen.getByText("Labels")).toBeDefined();
    expect(screen.getByText("Updated")).toBeDefined();
    expect(screen.getByText("Created")).toBeDefined();
    expect(screen.getByText("Due Date")).toBeDefined();
    expect(screen.getByText("Assignee")).toBeDefined();
    expect(screen.getByText("Priority")).toBeDefined();
    expect(screen.getByText("Status")).toBeDefined();
    expect(screen.getByText("Type")).toBeDefined();
    expect(screen.getByText("Owner")).toBeDefined();
    // Owner value renders.
    expect(screen.getByText("bob")).toBeDefined();
  });

  it("collapses to a narrow strip that offers an expand button", () => {
    renderSidebar(
      <MetadataSidebar
        issue={baseIssue}
        onFieldUpdate={() => {}}
        collapsed={true}
        onToggleCollapsed={() => {}}
        width={DEFAULT_SIDEBAR_WIDTH}
        onWidthChange={() => {}}
      />,
    );

    expect(screen.getByLabelText("Expand metadata sidebar")).toBeDefined();
    // Full fields list should not render when collapsed.
    expect(screen.queryByText("Assignee")).toBeNull();
  });

  it("fires onToggleCollapsed when the collapse/expand button is clicked", () => {
    const onToggle = vi.fn();
    const { rerender } = renderSidebar(
      <MetadataSidebar
        issue={baseIssue}
        onFieldUpdate={() => {}}
        collapsed={false}
        onToggleCollapsed={onToggle}
        width={DEFAULT_SIDEBAR_WIDTH}
        onWidthChange={() => {}}
      />,
    );
    fireEvent.click(screen.getByLabelText("Collapse metadata sidebar"));
    expect(onToggle).toHaveBeenCalledTimes(1);

    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <MetadataSidebar
            issue={baseIssue}
            onFieldUpdate={() => {}}
            collapsed={true}
            onToggleCollapsed={onToggle}
            width={DEFAULT_SIDEBAR_WIDTH}
            onWidthChange={() => {}}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByLabelText("Expand metadata sidebar"));
    expect(onToggle).toHaveBeenCalledTimes(2);
  });

  it("exposes a resize separator on the sidebar's left edge", () => {
    const onWidthChange = vi.fn();
    renderSidebar(
      <MetadataSidebar
        issue={baseIssue}
        onFieldUpdate={() => {}}
        collapsed={false}
        onToggleCollapsed={() => {}}
        width={DEFAULT_SIDEBAR_WIDTH}
        onWidthChange={onWidthChange}
      />,
    );
    const separator = screen.getByRole("separator", { name: /resize metadata sidebar/i });
    expect(separator).toBeDefined();

    fireEvent.mouseDown(separator, { clientX: 500 });
    fireEvent(window, new MouseEvent("mousemove", { clientX: 460 }));
    fireEvent(window, new MouseEvent("mouseup"));
    // Dragging left (clientX smaller) increases width by 40.
    expect(onWidthChange).toHaveBeenLastCalledWith(DEFAULT_SIDEBAR_WIDTH + 40);
  });
});

describe("MetadataSidebar (inline layout)", () => {
  it("renders as a collapsible panel without a resize separator", () => {
    renderSidebar(
      <MetadataSidebar
        issue={baseIssue}
        onFieldUpdate={() => {}}
        collapsed={false}
        onToggleCollapsed={() => {}}
        width={DEFAULT_SIDEBAR_WIDTH}
        onWidthChange={() => {}}
        layout="inline"
      />,
    );
    expect(screen.getByText("Fields")).toBeDefined();
    expect(screen.queryByRole("separator", { name: /resize metadata sidebar/i })).toBeNull();
    expect(screen.getByText("Assignee")).toBeDefined();
  });

  it("hides field content when collapsed in inline mode", () => {
    renderSidebar(
      <MetadataSidebar
        issue={baseIssue}
        onFieldUpdate={() => {}}
        collapsed={true}
        onToggleCollapsed={() => {}}
        width={DEFAULT_SIDEBAR_WIDTH}
        onWidthChange={() => {}}
        layout="inline"
      />,
    );
    expect(screen.getByText("Fields")).toBeDefined();
    expect(screen.queryByText("Assignee")).toBeNull();
  });
});

describe("useMetadataSidebarState", () => {
  it("persists sidebar and inline collapsed state independently", () => {
    const { result, rerender } = renderHook(() => useMetadataSidebarState());
    expect(result.current.sidebarCollapsed).toBe(false);
    expect(result.current.inlineCollapsed).toBe(false);
    expect(result.current.width).toBe(DEFAULT_SIDEBAR_WIDTH);

    act(() => result.current.setSidebarCollapsed(true));
    rerender();
    expect(result.current.sidebarCollapsed).toBe(true);
    expect(result.current.inlineCollapsed).toBe(false);

    act(() => result.current.setInlineCollapsed(true));
    rerender();
    expect(result.current.sidebarCollapsed).toBe(true);
    expect(result.current.inlineCollapsed).toBe(true);
  });

  it("clamps width to the allowed range", () => {
    const { result, rerender } = renderHook(() => useMetadataSidebarState());

    act(() => result.current.setWidth(9999));
    rerender();
    expect(result.current.width).toBe(MAX_SIDEBAR_WIDTH);

    act(() => result.current.setWidth(10));
    rerender();
    expect(result.current.width).toBe(MIN_SIDEBAR_WIDTH);
  });

  it("reads previously persisted state from localStorage", () => {
    window.localStorage.setItem("issueDetail.sidebarCollapsed", "true");
    window.localStorage.setItem("issueDetail.inlineCollapsed", "false");
    window.localStorage.setItem("issueDetail.sidebarWidth", "300");
    const { result } = renderHook(() => useMetadataSidebarState());
    expect(result.current.sidebarCollapsed).toBe(true);
    expect(result.current.inlineCollapsed).toBe(false);
    expect(result.current.width).toBe(300);
  });
});
