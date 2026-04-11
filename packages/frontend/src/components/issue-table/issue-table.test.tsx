import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  type VisibilityState,
  type ColumnOrderState,
  type RowSelectionState,
} from "@tanstack/react-table";
import type { IssueListItem } from "@beads-gui/shared";
import { IssueTable } from "./issue-table";
import { buildColumns } from "./columns";

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

function TableWrapper({
  data = mockIssues,
  isLoading = false,
  activeRowIndex = -1,
  sorting = [{ id: "priority", desc: false }] as SortingState,
  highlightedIds,
}: {
  data?: IssueListItem[];
  isLoading?: boolean;
  activeRowIndex?: number;
  sorting?: SortingState;
  highlightedIds?: Set<string>;
}) {
  const columns = buildColumns({});
  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility: {}, columnOrder: [], rowSelection: {} },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    enableRowSelection: true,
    enableMultiSort: true,
    getRowId: (row) => row.id,
  });

  return (
    <IssueTable
      table={table}
      isLoading={isLoading}
      activeRowIndex={activeRowIndex}
      onRowClick={vi.fn()}
      highlightedIds={highlightedIds}
    />
  );
}

describe("IssueTable", () => {
  it("renders issue rows with correct data", () => {
    render(<TableWrapper />);

    expect(screen.getByText("Fix login bug")).toBeInTheDocument();
    expect(screen.getByText("Add dashboard view")).toBeInTheDocument();
    expect(screen.getByText("beads-001")).toBeInTheDocument();
    expect(screen.getByText("beads-002")).toBeInTheDocument();
  });

  it("renders column headers", () => {
    render(<TableWrapper />);

    expect(screen.getByText("ID")).toBeInTheDocument();
    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Priority")).toBeInTheDocument();
    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.getByText("Assignee")).toBeInTheDocument();
  });

  it("shows loading skeleton when loading with no data", () => {
    render(<TableWrapper data={[]} isLoading={true} />);

    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("shows empty state when no data and not loading", () => {
    render(<TableWrapper data={[]} />);

    expect(screen.getByText("No issues found")).toBeInTheDocument();
    expect(
      screen.getByText("Try adjusting your filters or create a new issue."),
    ).toBeInTheDocument();
  });

  it("renders labels as pills", () => {
    render(<TableWrapper />);

    // "frontend" appears on both rows
    expect(screen.getAllByText("frontend")).toHaveLength(2);
    expect(screen.getByText("dashboard")).toBeInTheDocument();
  });

  it("highlights active row", () => {
    render(<TableWrapper activeRowIndex={0} />);

    const rows = document.querySelectorAll("tbody tr");
    expect(rows[0].getAttribute("aria-selected")).toBe("true");
  });

  it("renders sort indicators", () => {
    render(<TableWrapper sorting={[{ id: "priority", desc: false }]} />);

    expect(screen.getByLabelText("Sorted ascending")).toBeInTheDocument();
  });

  it("renders select-all checkbox in header", () => {
    render(<TableWrapper />);

    expect(screen.getByLabelText("Select all rows")).toBeInTheDocument();
  });

  it("has aria-label on table element", () => {
    render(<TableWrapper />);

    expect(screen.getByRole("table")).toHaveAttribute("aria-label", "Issue list");
  });
});
