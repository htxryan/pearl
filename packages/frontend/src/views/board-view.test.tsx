import type { IssueListItem } from "@pearl/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock detail panel
const mockOpenDetail = vi.fn();
vi.mock("@/hooks/use-detail-panel", () => ({
  DetailPanelProvider: ({ children }: { children: React.ReactNode }) => children,
  useDetailPanel: () => ({
    openIssueId: null,
    mode: "panel" as const,
    openDetail: mockOpenDetail,
    closeDetail: vi.fn(),
    toggleMode: vi.fn(),
    setMode: vi.fn(),
  }),
  useDetailPanelOptional: () => null,
}));

// Mock API module
vi.mock("@/lib/api-client", () => ({
  fetchLabels: vi.fn().mockResolvedValue([]),
  upsertLabel: vi.fn().mockResolvedValue({ success: true, invalidationHints: [] }),
  fetchIssues: vi.fn(),
  updateIssue: vi.fn(),
  fetchSettings: vi.fn().mockResolvedValue({
    version: 1,
    attachments: {
      storageMode: "local",
      local: { scope: "project", projectPathOverride: null, userPathOverride: null },
      encoding: { format: "webp", maxBytes: 1048576, maxDimension: 2048 },
    },
  }),
  updateSettings: vi.fn().mockResolvedValue({
    success: true,
    data: {
      version: 1,
      attachments: {
        storageMode: "local",
        local: { scope: "project", projectPathOverride: null, userPathOverride: null },
        encoding: { format: "webp", maxBytes: 1048576, maxDimension: 2048 },
      },
    },
    invalidationHints: [{ entity: "settings" }],
  }),
}));

// Mock use-issues hooks
const mockMutate = vi.fn();
const mockUseUpdateIssue = vi.fn(() => ({
  mutate: mockMutate,
  isError: false,
  error: null,
}));

vi.mock("@/hooks/use-issues", () => ({
  useIssues: vi.fn(),
  useUpdateIssue: () => mockUseUpdateIssue(),
  useCreateIssue: () => ({ mutate: vi.fn(), isPending: false }),
  useHealth: () => ({ data: { project_prefix: "beads" } }),
  issueKeys: {
    all: ["issues"],
    lists: () => ["issues", "list"],
    list: (p?: URLSearchParams) => ["issues", "list", p?.toString() ?? ""],
    details: () => ["issues", "detail"],
    detail: (id: string) => ["issues", "detail", id],
  },
  dependencyKeys: {
    all: ["dependencies"],
  },
}));

// Mock use-dependencies
vi.mock("@/hooks/use-dependencies", () => ({
  useAllDependencies: vi.fn().mockReturnValue({ data: [], isLoading: false }),
}));

import { useIssues } from "@/hooks/use-issues";
import { BoardView } from "./board-view";

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
  {
    id: "beads-003",
    title: "Blocked migration",
    status: "blocked",
    priority: 0,
    issue_type: "task",
    assignee: null,
    owner: "admin",
    created_at: "2026-01-12T10:00:00Z",
    updated_at: "2026-01-18T10:00:00Z",
    due_at: null,
    pinned: false,
    has_attachments: false,
    labels: [],
    labelColors: {},
  },
  {
    id: "beads-004",
    title: "Deferred cleanup",
    status: "deferred",
    priority: 4,
    issue_type: "chore",
    assignee: "charlie",
    owner: "charlie",
    created_at: "2026-01-05T10:00:00Z",
    updated_at: "2026-01-06T10:00:00Z",
    due_at: null,
    pinned: false,
    has_attachments: false,
    labels: ["cleanup"],
    labelColors: {},
  },
  {
    id: "beads-005",
    title: "Completed feature",
    status: "closed",
    priority: 3,
    issue_type: "feature",
    assignee: "alice",
    owner: "alice",
    created_at: "2026-01-01T10:00:00Z",
    updated_at: "2026-01-20T10:00:00Z",
    due_at: null,
    pinned: false,
    has_attachments: false,
    labels: [],
    labelColors: {},
  },
];

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
}

function renderBoard({
  issues = mockIssues,
  isLoading = false,
}: {
  issues?: IssueListItem[];
  isLoading?: boolean;
} = {}) {
  vi.mocked(useIssues).mockReturnValue({
    data: issues,
    isLoading,
    error: null,
    isError: false,
    isFetching: false,
    isPending: false,
    isSuccess: true,
    status: "success",
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useIssues>);

  const queryClient = createQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/board"]}>
        <BoardView />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("BoardView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockUseUpdateIssue.mockReturnValue({
      mutate: mockMutate,
      isError: false,
      error: null,
    });
  });

  it("renders four status columns (no blocked column), closed expanded by default", () => {
    renderBoard();

    // All columns show their issue list
    expect(screen.getByRole("list", { name: "open issues" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "in_progress issues" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "deferred issues" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "closed issues" })).toBeInTheDocument();
    // "blocked" is derived from dependencies, not a column
    expect(screen.queryByRole("list", { name: "blocked issues" })).not.toBeInTheDocument();
  });

  it("renders issue cards in correct columns", () => {
    renderBoard();

    // Open column should have beads-001 and beads-003 (status "blocked" falls to open)
    const openList = screen.getByRole("list", { name: "open issues" });
    expect(within(openList).getByText("Fix login bug")).toBeInTheDocument();
    expect(within(openList).getByText("Blocked migration")).toBeInTheDocument();

    // In Progress column should have beads-002
    const inProgressList = screen.getByRole("list", { name: "in_progress issues" });
    expect(within(inProgressList).getByText("Add dashboard view")).toBeInTheDocument();
  });

  it("displays column issue counts", () => {
    renderBoard();

    // 4 columns: open has 2 (beads-001 + beads-003 which had status "blocked"),
    // in_progress, closed, deferred each have 1
    const board = screen.getByRole("region", { name: "Kanban board" });
    expect(within(board).getByText("2")).toBeInTheDocument(); // open column
    const countOnes = within(board).getAllByText("1");
    expect(countOnes.length).toBeGreaterThanOrEqual(3);
  });

  it("displays assignee initials on cards", () => {
    renderBoard();

    // alice appears on beads-001 (open) and beads-005 (closed)
    const aliceAvatars = screen.getAllByTitle("alice");
    expect(aliceAvatars.length).toBe(2);
    expect(aliceAvatars[0]).toHaveTextContent("AL");
    // bob appears on beads-002
    expect(screen.getByTitle("bob")).toHaveTextContent("BO");
  });

  it("shows priority badges on cards", () => {
    renderBoard();

    const board = screen.getByRole("region", { name: "Kanban board" });
    expect(within(board).getByText("P0")).toBeInTheDocument();
    expect(within(board).getByText("P1")).toBeInTheDocument();
    expect(within(board).getByText("P2")).toBeInTheDocument();
  });

  it("shows type badges on cards", () => {
    renderBoard();

    const board = screen.getByRole("region", { name: "Kanban board" });
    expect(within(board).getAllByText("Bug")).toHaveLength(1);
    // beads-005 (Feature, closed) is now visible — beads-002 and beads-005
    expect(within(board).getAllByText("Feature")).toHaveLength(2);
    expect(within(board).getAllByText("Task")).toHaveLength(1);
  });

  it("shows loading skeleton when loading with no data", () => {
    renderBoard({ issues: [], isLoading: true });

    const skeletons = document.querySelectorAll(".skeleton-shimmer");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("shows empty columns when no issues match filters", () => {
    renderBoard({ issues: [] });

    // All 4 columns show "No issues"
    const emptyMessages = screen.getAllByText("No issues");
    expect(emptyMessages).toHaveLength(4);
  });

  it("renders the filter bar", () => {
    renderBoard();

    expect(screen.getByPlaceholderText("Search issues... (/)")).toBeInTheDocument();
    expect(screen.getByLabelText("Filter by status")).toBeInTheDocument();
  });

  it("has aria-label on board region", () => {
    renderBoard();

    expect(screen.getByRole("region", { name: "Kanban board" })).toBeInTheDocument();
  });

  it("renders cards with proper ARIA attributes", () => {
    renderBoard();

    const card = screen.getByRole("button", { name: /beads-001: Fix login bug/ });
    expect(card).toBeInTheDocument();
    expect(card).toHaveAttribute("aria-roledescription", "draggable issue card");
  });

  it("navigates to issue detail on card click", () => {
    renderBoard();

    const card = screen.getByRole("button", { name: /beads-001: Fix login bug/ });
    fireEvent.click(card);

    expect(mockOpenDetail).toHaveBeenCalledWith("beads-001");
  });

  it("collapses closed column when clicking the header", () => {
    renderBoard();

    // Initially expanded — card list visible
    expect(screen.getByRole("list", { name: "closed issues" })).toBeInTheDocument();

    // Click the header to collapse
    fireEvent.click(screen.getByRole("button", { name: /Collapse closed column/i }));

    // Now collapsed
    expect(screen.queryByRole("list", { name: "closed issues" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Expand closed column/i })).toBeInTheDocument();
  });

  it("expands closed column when clicking the collapsed strip", () => {
    renderBoard();

    // Collapse first
    fireEvent.click(screen.getByRole("button", { name: /Collapse closed column/i }));
    expect(screen.queryByRole("list", { name: "closed issues" })).not.toBeInTheDocument();

    // Click the expand button
    fireEvent.click(screen.getByRole("button", { name: /Expand closed column/i }));

    // Now expanded — card list visible
    expect(screen.getByRole("list", { name: "closed issues" })).toBeInTheDocument();
    const closedList = screen.getByRole("list", { name: "closed issues" });
    expect(within(closedList).getByText("Completed feature")).toBeInTheDocument();
  });

  it("shows issue count on collapsed closed column", () => {
    renderBoard();

    // Collapse first
    fireEvent.click(screen.getByRole("button", { name: /Collapse closed column/i }));

    const expandBtn = screen.getByRole("button", { name: /Expand closed column/i });
    expect(expandBtn).toHaveTextContent("1");
  });

  it("orders open column by reverse-modified date by default (newest at top)", () => {
    // Two open issues: beads-001 (updated 2026-01-16), beads-003 (updated 2026-01-18, status=blocked → falls into open)
    renderBoard();

    const openList = screen.getByRole("list", { name: "open issues" });
    const items = within(openList).getAllByRole("listitem");
    // Most-recently-updated first: beads-003 (Jan 18) before beads-001 (Jan 16)
    expect(items[0]).toHaveTextContent("Blocked migration");
    expect(items[1]).toHaveTextContent("Fix login bug");
  });

  it("renders a per-column sort selector with a default of Modified", () => {
    renderBoard();

    const selectors = screen.getAllByRole("combobox", { name: /Sort .* column/ });
    // 4 visible columns: open, in_progress, deferred, closed
    expect(selectors.length).toBe(4);
    for (const selector of selectors) {
      expect(selector).toHaveTextContent("Modified");
    }
  });

  it("re-orders an open column when its sort selector switches to Priority", async () => {
    // Add a higher-priority but older-updated issue so the sort change is observable.
    const issues: IssueListItem[] = [
      ...mockIssues,
      {
        id: "beads-006",
        title: "Critical security gap",
        status: "open",
        priority: 0,
        issue_type: "bug",
        assignee: null,
        owner: "alice",
        // older `updated_at` than beads-003 (Jan 18) and beads-001 (Jan 16)
        created_at: "2025-12-01T10:00:00Z",
        updated_at: "2025-12-15T10:00:00Z",
        due_at: null,
        pinned: false,
        has_attachments: false,
        labels: [],
        labelColors: {},
      },
    ];
    renderBoard({ issues });

    // Default Modified sort: beads-003 (Jan 18), beads-001 (Jan 16), beads-006 (Dec 15)
    let openList = screen.getByRole("list", { name: "open issues" });
    let items = within(openList).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Blocked migration");
    expect(items[2]).toHaveTextContent("Critical security gap");

    // Switch the open column to Priority
    const openSorter = screen.getByRole("combobox", { name: "Sort open column" });
    const user = userEvent.setup();
    await user.click(openSorter);
    const priorityOpt = await screen.findByRole("option", { name: "Priority" });
    await user.click(priorityOpt);

    // Priority sort: P0 (beads-006), P0 (beads-003), P1 (beads-001)
    openList = screen.getByRole("list", { name: "open issues" });
    items = within(openList).getAllByRole("listitem");
    // Both P0 items first (order between them broken by reverse-modified)
    // beads-003 was updated Jan 18, beads-006 was updated Dec 15 — so beads-003 first
    expect(items[0]).toHaveTextContent("Blocked migration");
    expect(items[1]).toHaveTextContent("Critical security gap");
    expect(items[2]).toHaveTextContent("Fix login bug");
  });

  it("persists per-column sort to localStorage", async () => {
    renderBoard();

    const user = userEvent.setup();
    const openSorter = screen.getByRole("combobox", { name: "Sort open column" });
    await user.click(openSorter);
    const priorityOpt2 = await screen.findByRole("option", { name: "Priority" });
    await user.click(priorityOpt2);

    const stored = localStorage.getItem("pearl:board:column-sort");
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored ?? "{}")).toEqual({ open: "priority" });
  });

  it("clicking the sort selector does not toggle column collapse", () => {
    renderBoard();

    // closed column starts expanded
    expect(screen.getByRole("list", { name: "closed issues" })).toBeInTheDocument();

    // Click the sort selector on the closed column header
    fireEvent.click(screen.getByRole("combobox", { name: "Sort closed column" }));

    // Column is still expanded — selector click was not propagated to the header
    expect(screen.getByRole("list", { name: "closed issues" })).toBeInTheDocument();
  });

  it("shows labels on cards", () => {
    renderBoard();

    const board = screen.getByRole("region", { name: "Kanban board" });
    // beads-001 has ["frontend"] → shows "frontend" as a LabelBadge
    // beads-002 has ["frontend", "dashboard"] → shows "frontend" badge + "+1"
    // beads-004 has ["cleanup"] → shows "cleanup" as a LabelBadge
    expect(within(board).getByText("cleanup")).toBeInTheDocument();
    // "frontend" appears as LabelBadge text on beads-001 and beads-002
    expect(within(board).getAllByText("frontend").length).toBeGreaterThanOrEqual(1);
    // beads-002 has 2 labels → shows "+1" overflow count
    expect(within(board).getByText("+1")).toBeInTheDocument();
  });
});
