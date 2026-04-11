import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { IssueListItem } from "@beads-gui/shared";
import { IssueTable } from "./issue-table";

const mockIssues: IssueListItem[] = [
  {
    id: "beads-001",
    title: "Fix login bug",
    status: "open",
    priority: 1,
    issue_type: "bug",
    assignee: "alice",
    owner: "alice",
    created_at: "2026-01-15T10:00:00Z",
    updated_at: "2026-01-16T10:00:00Z",
    due_at: null,
    pinned: false,
    labels: ["frontend"],
  },
  {
    id: "beads-002",
    title: "Add dashboard view",
    status: "in_progress",
    priority: 2,
    issue_type: "feature",
    assignee: "bob",
    owner: "bob",
    created_at: "2026-01-10T10:00:00Z",
    updated_at: "2026-01-17T10:00:00Z",
    due_at: "2026-02-01T00:00:00Z",
    pinned: true,
    labels: ["frontend", "dashboard"],
  },
];

const defaultProps = {
  data: mockIssues,
  isLoading: false,
  sorting: [{ id: "priority", desc: false }],
  onSortingChange: vi.fn(),
  columnVisibility: {},
  onColumnVisibilityChange: vi.fn(),
  columnOrder: [],
  onColumnOrderChange: vi.fn(),
  rowSelection: {},
  onRowSelectionChange: vi.fn(),
  activeRowIndex: -1,
  onRowClick: vi.fn(),
  onStatusChange: vi.fn(),
  onPriorityChange: vi.fn(),
} as const;

describe("IssueTable", () => {
  it("renders issue rows with correct data", () => {
    render(<IssueTable {...defaultProps} />);

    expect(screen.getByText("Fix login bug")).toBeInTheDocument();
    expect(screen.getByText("Add dashboard view")).toBeInTheDocument();
    expect(screen.getByText("beads-001")).toBeInTheDocument();
    expect(screen.getByText("beads-002")).toBeInTheDocument();
  });

  it("renders column headers", () => {
    render(<IssueTable {...defaultProps} />);

    expect(screen.getByText("ID")).toBeInTheDocument();
    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Priority")).toBeInTheDocument();
    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.getByText("Assignee")).toBeInTheDocument();
  });

  it("shows loading skeleton when loading with no data", () => {
    render(<IssueTable {...defaultProps} data={[]} isLoading={true} />);

    // Should show skeleton rows (animated pulse elements)
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("shows empty state when no data and not loading", () => {
    render(<IssueTable {...defaultProps} data={[]} />);

    expect(screen.getByText("No issues found")).toBeInTheDocument();
    expect(
      screen.getByText("Try adjusting your filters or create a new issue."),
    ).toBeInTheDocument();
  });

  it("renders labels as pills", () => {
    render(<IssueTable {...defaultProps} />);

    // "frontend" appears on both rows
    expect(screen.getAllByText("frontend")).toHaveLength(2);
    expect(screen.getByText("dashboard")).toBeInTheDocument();
  });

  it("highlights active row", () => {
    render(<IssueTable {...defaultProps} activeRowIndex={0} />);

    const rows = document.querySelectorAll("tbody tr");
    expect(rows[0].getAttribute("aria-selected")).toBe("true");
  });

  it("renders sort indicators", () => {
    render(
      <IssueTable
        {...defaultProps}
        sorting={[{ id: "priority", desc: false }]}
      />,
    );

    expect(screen.getByLabelText("Sorted ascending")).toBeInTheDocument();
  });

  it("renders select-all checkbox in header", () => {
    render(<IssueTable {...defaultProps} />);

    expect(screen.getByLabelText("Select all rows")).toBeInTheDocument();
  });
});
