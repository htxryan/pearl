import type { IssueListItem } from "@pearl/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  type ColumnOrderState,
  getCoreRowModel,
  getSortedRowModel,
  type RowSelectionState,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { buildColumns } from "./columns";
import { IssueTable } from "./issue-table";

vi.mock("@/hooks/use-issues", () => ({
  useHealth: () => ({ data: { project_prefix: "beads" } }),
}));

function withQueryClient(ui: ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

function makeMockIssue(i: number): IssueListItem {
  return {
    id: `beads-${String(i).padStart(3, "0")}`,
    title: `Issue ${i}`,
    status: "open",
    priority: 2,
    issue_type: "task",
    assignee: null,
    owner: "alice",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    due_at: null,
    pinned: false,
    has_attachments: false,
    labels: [],
    labelColors: {},
  };
}

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
    has_attachments: false,
    labels: ["frontend"],
    labelColors: {},
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
    has_attachments: true,
    labels: ["frontend", "dashboard"],
    labelColors: {},
  },
];

function TableWrapper({
  data = mockIssues,
  isLoading = false,
  activeRowIndex = -1,
  sorting = [{ id: "priority", desc: false }] as SortingState,
  highlightedIds,
  columnOrder = [],
}: {
  data?: IssueListItem[];
  isLoading?: boolean;
  activeRowIndex?: number;
  sorting?: SortingState;
  highlightedIds?: Set<string>;
  columnOrder?: ColumnOrderState;
}) {
  const columns = buildColumns({});
  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility: {}, columnOrder, rowSelection: {} },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    enableRowSelection: true,
    enableMultiSort: true,
    getRowId: (row) => row.id,
  });

  return withQueryClient(
    <IssueTable
      table={table}
      isLoading={isLoading}
      activeRowIndex={activeRowIndex}
      onRowClick={vi.fn()}
      highlightedIds={highlightedIds}
    />,
  );
}

describe("IssueTable", () => {
  it("renders issue rows with correct data", () => {
    render(<TableWrapper />);

    expect(screen.getByText("Fix login bug")).toBeInTheDocument();
    expect(screen.getByText("Add dashboard view")).toBeInTheDocument();
    expect(screen.getByText("001")).toBeInTheDocument();
    expect(screen.getByText("002")).toBeInTheDocument();
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

    const skeletons = document.querySelectorAll(".skeleton-shimmer");
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

  it("renders all rows for lists at the 100-item threshold (non-virtualized)", () => {
    const data = Array.from({ length: 100 }, (_, i) => makeMockIssue(i));
    render(<TableWrapper data={data} />);
    const rows = document.querySelectorAll("tbody tr");
    expect(rows.length).toBe(100);
  });

  it("virtualizes lists above the 100-item threshold — DOM rows < data rows", () => {
    const data = Array.from({ length: 101 }, (_, i) => makeMockIssue(i));
    render(<TableWrapper data={data} />);
    const rows = document.querySelectorAll("tbody tr");
    // In virtualized mode the DOM holds only the visible window (+ overscan),
    // not all 101 rows. jsdom has no real viewport so visible=0 + overscan=20 = ~20.
    expect(rows.length).toBeLessThan(101);
  });

  describe("column reordering", () => {
    function getHeaderColumnIds() {
      return Array.from(document.querySelectorAll("thead th[data-column-id]")).map(
        (th) => (th as HTMLElement).dataset.columnId,
      );
    }

    it("renders a drag handle on every reorderable column header", () => {
      render(<TableWrapper />);
      const handles = document.querySelectorAll(
        'thead [aria-roledescription="column drag handle"]',
      );
      // 9 visible columns (has_attachments hidden by default isn't applied here),
      // minus the fixed select column.
      const visibleHeaders = document.querySelectorAll("thead th");
      expect(handles.length).toBe(visibleHeaders.length - 1);
    });

    it("does not render a drag handle on the fixed select column", () => {
      render(<TableWrapper />);
      const selectHeader = document.querySelector('thead th[data-column-id="select"]');
      expect(selectHeader).toBeTruthy();
      expect(selectHeader?.querySelector('[aria-roledescription="column drag handle"]')).toBeNull();
    });

    it("respects columnOrder state when rendering header order", () => {
      const customOrder: ColumnOrderState = [
        "select",
        "title",
        "id",
        "status",
        "priority",
        "issue_type",
        "assignee",
        "created_at",
        "due_at",
        "labels",
      ];
      render(<TableWrapper columnOrder={customOrder} />);
      const ids = getHeaderColumnIds();
      // title comes before id, reflecting the persisted custom order
      expect(ids.indexOf("title")).toBeLessThan(ids.indexOf("id"));
      expect(ids[0]).toBe("select");
    });

    it("uses default column order when columnOrder is empty", () => {
      render(<TableWrapper columnOrder={[]} />);
      const ids = getHeaderColumnIds();
      expect(ids[0]).toBe("select");
      expect(ids[1]).toBe("id");
      expect(ids[2]).toBe("title");
    });

    it("drag handle has accessible roledescription", () => {
      render(<TableWrapper />);
      const handle = document.querySelector(
        'thead th[data-column-id="title"] [aria-roledescription="column drag handle"]',
      );
      expect(handle).toBeTruthy();
      expect(handle?.getAttribute("aria-roledescription")).toBe("column drag handle");
      expect(handle?.getAttribute("title")).toContain("Title");
    });
  });
});
