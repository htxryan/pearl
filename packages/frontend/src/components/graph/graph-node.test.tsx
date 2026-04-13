import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { IssueListItem } from "@beads-gui/shared";

// Mock @xyflow/react — only Handle is used directly in GraphNode
vi.mock("@xyflow/react", () => ({
  Handle: () => null,
  Position: { Top: "top", Bottom: "bottom" },
  memo: (fn: unknown) => fn,
}));

import { GraphNode, NODE_WIDTH, NODE_HEIGHT } from "./graph-node";

function makeIssue(overrides: Partial<IssueListItem> = {}): IssueListItem {
  return {
    id: "beads-test-001",
    title: "Test Issue Title",
    status: "open",
    priority: 2,
    issue_type: "task",
    assignee: "alice",
    owner: "alice",
    created_at: "2026-01-15T10:00:00Z",
    updated_at: "2026-01-16T10:00:00Z",
    due_at: null,
    pinned: false,
    labels: [],
    labelColors: {},
    ...overrides,
  };
}

function renderNode(overrides: {
  issue?: Partial<IssueListItem>;
  highlighted?: boolean;
  dimmed?: boolean;
  selected?: boolean;
  clusterChildCount?: number;
} = {}) {
  const issue = makeIssue(overrides.issue);
  const props = {
    id: issue.id,
    type: "graphNode" as const,
    data: {
      issue,
      highlighted: overrides.highlighted ?? false,
      dimmed: overrides.dimmed ?? false,
      selected: overrides.selected ?? false,
      clusterChildCount: overrides.clusterChildCount,
    },
    // Minimal NodeProps fields needed by the component
    dragging: false,
    isConnectable: true,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    zIndex: 0,
  } as any;

  return render(<GraphNode {...props} />);
}

describe("GraphNode", () => {
  // ──── Node Styling ────────────────────────────────────

  describe("status color bar", () => {
    it("renders a left-edge accent bar with status color", () => {
      const { container } = renderNode({ issue: { status: "open" } });
      const bar = container.querySelector(".bg-blue-500.absolute.inset-y-0.left-0");
      expect(bar).toBeTruthy();
    });

    it.each([
      ["open", "bg-blue-500"],
      ["in_progress", "bg-amber-500"],
      ["closed", "bg-green-500"],
      ["blocked", "bg-red-500"],
      ["deferred", "bg-gray-400"],
    ] as const)("status '%s' renders '%s' accent bar", (status, expectedClass) => {
      const { container } = renderNode({ issue: { status } });
      const bar = container.querySelector(`.${expectedClass}`);
      expect(bar).toBeTruthy();
    });
  });

  describe("priority indicator", () => {
    it("renders a priority badge", () => {
      renderNode({ issue: { priority: 0 } });
      expect(screen.getByText("P0")).toBeInTheDocument();
    });

    it("renders correct priority label for each level", () => {
      for (const p of [0, 1, 2, 3, 4] as const) {
        const { unmount } = renderNode({ issue: { priority: p } });
        expect(screen.getByText(`P${p}`)).toBeInTheDocument();
        unmount();
      }
    });
  });

  describe("title truncation", () => {
    it("renders the title with truncation class", () => {
      renderNode({ issue: { title: "A very long title that should be truncated" } });
      const titleEl = screen.getByText("A very long title that should be truncated");
      expect(titleEl.className).toContain("truncate");
    });

    it("sets title attribute for native tooltip on truncated text", () => {
      renderNode({ issue: { title: "Full title text" } });
      const titleEl = screen.getByText("Full title text");
      expect(titleEl).toHaveAttribute("title", "Full title text");
    });
  });

  // ──── Hover Tooltip ───────────────────────────────────

  describe("hover tooltip", () => {
    it("shows tooltip with full title on hover", () => {
      const { container } = renderNode({
        issue: { title: "My Important Issue" },
      });
      const root = container.firstElementChild as HTMLElement;
      fireEvent.mouseEnter(root);

      // Tooltip should contain the full title (separate from the truncated node title)
      const tooltipTitles = screen.getAllByText("My Important Issue");
      expect(tooltipTitles.length).toBeGreaterThanOrEqual(2); // node title + tooltip title
    });

    it("shows status in tooltip", () => {
      const { container } = renderNode({ issue: { status: "in_progress" } });
      fireEvent.mouseEnter(container.firstElementChild as HTMLElement);
      expect(screen.getByText("In Progress")).toBeInTheDocument();
    });

    it("shows assignee in tooltip", () => {
      const { container } = renderNode({ issue: { assignee: "alice" } });
      fireEvent.mouseEnter(container.firstElementChild as HTMLElement);
      expect(screen.getByText("alice")).toBeInTheDocument();
    });

    it("shows priority in tooltip", () => {
      const { container } = renderNode({ issue: { priority: 1 } });
      fireEvent.mouseEnter(container.firstElementChild as HTMLElement);
      // Priority indicator should appear in tooltip
      const priorities = screen.getAllByText("P1");
      expect(priorities.length).toBeGreaterThanOrEqual(2); // node + tooltip
    });

    it("shows labels in tooltip", () => {
      const { container } = renderNode({
        issue: { labels: ["frontend", "urgent"], labelColors: {} },
      });
      fireEvent.mouseEnter(container.firstElementChild as HTMLElement);
      // Labels appear in both the node body and the tooltip
      expect(screen.getAllByText("frontend").length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText("urgent")).toBeInTheDocument();
    });

    it("shows due date in tooltip", () => {
      const { container } = renderNode({
        issue: { due_at: "2026-06-15T00:00:00Z" },
      });
      fireEvent.mouseEnter(container.firstElementChild as HTMLElement);
      expect(screen.getByText("Due:")).toBeInTheDocument();
    });

    it("hides tooltip when not hovered", () => {
      const { container } = renderNode({
        issue: { assignee: "alice" },
      });
      // Don't hover — tooltip should not show assignee label
      expect(screen.queryByText("Assignee:")).not.toBeInTheDocument();

      // Hover, then leave
      const root = container.firstElementChild as HTMLElement;
      fireEvent.mouseEnter(root);
      expect(screen.getByText("Assignee:")).toBeInTheDocument();

      fireEvent.mouseLeave(root);
      expect(screen.queryByText("Assignee:")).not.toBeInTheDocument();
    });

    it("does not show tooltip when node is dimmed", () => {
      const { container } = renderNode({
        issue: { assignee: "alice" },
        dimmed: true,
      });
      fireEvent.mouseEnter(container.firstElementChild as HTMLElement);
      expect(screen.queryByText("Assignee:")).not.toBeInTheDocument();
    });
  });

  // ──── Visual States ───────────────────────────────────

  describe("visual states", () => {
    it("applies opacity-30 when dimmed", () => {
      const { container } = renderNode({ dimmed: true });
      expect(container.firstElementChild?.className).toContain("opacity-30");
    });

    it("applies ring-2 when highlighted", () => {
      const { container } = renderNode({ highlighted: true });
      expect(container.firstElementChild?.className).toContain("ring-2");
    });

    it("applies ring-2 and shadow-lg when selected", () => {
      const { container } = renderNode({ selected: true });
      const cls = container.firstElementChild?.className ?? "";
      expect(cls).toContain("ring-2");
      expect(cls).toContain("shadow-lg");
    });

    it("applies high-priority gradient for P0/P1", () => {
      const { container } = renderNode({ issue: { priority: 0 } });
      expect(container.firstElementChild?.className).toContain("bg-gradient-to-r");
    });

    it("does not apply high-priority gradient for P2+", () => {
      const { container } = renderNode({ issue: { priority: 2 } });
      expect(container.firstElementChild?.className).not.toContain("bg-gradient-to-r");
    });
  });

  // ──── Dimensions ──────────────────────────────────────

  describe("dimensions", () => {
    it("exports correct node dimensions", () => {
      expect(NODE_WIDTH).toBe(260);
      expect(NODE_HEIGHT).toBe(110);
    });

    it("renders with correct width and height", () => {
      const { container } = renderNode();
      const root = container.firstElementChild as HTMLElement;
      expect(root.style.width).toBe("260px");
      expect(root.style.height).toBe("110px");
    });
  });

  // ──── Cluster Badge ───────────────────────────────────

  describe("cluster badge", () => {
    it("shows collapsed count when clusterChildCount is set", () => {
      renderNode({ clusterChildCount: 5 });
      expect(screen.getByText("5 collapsed")).toBeInTheDocument();
    });

    it("does not show collapsed badge when clusterChildCount is undefined", () => {
      renderNode();
      expect(screen.queryByText(/collapsed/)).not.toBeInTheDocument();
    });
  });

  // ──── Assignee Avatar ─────────────────────────────────

  describe("assignee avatar", () => {
    it("renders assignee initials", () => {
      renderNode({ issue: { assignee: "alice" } });
      expect(screen.getByText("AL")).toBeInTheDocument();
    });

    it("does not render avatar when no assignee", () => {
      renderNode({ issue: { assignee: null } });
      expect(screen.queryByText("AL")).not.toBeInTheDocument();
    });
  });
});
