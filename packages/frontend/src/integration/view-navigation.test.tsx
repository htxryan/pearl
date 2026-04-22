import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Navigate, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mock navigation ─────────────────────────────────────
const mockNavigate = vi.fn();
vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return { ...actual, useNavigate: () => mockNavigate };
});

// ─── Mock detail panel ──────────────────────────────────
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
}));

// ─── Mock API client ─────────────────────────────────────
vi.mock("@/lib/api-client", () => ({
  fetchLabels: vi.fn().mockResolvedValue([]),
  upsertLabel: vi.fn().mockResolvedValue({ success: true, invalidationHints: [] }),
  fetchIssues: vi.fn(),
  fetchIssue: vi.fn(),
  updateIssue: vi.fn(),
  closeIssue: vi.fn(),
  fetchComments: vi.fn(),
  fetchEvents: vi.fn(),
  fetchAllDependencies: vi.fn(),
  fetchStats: vi.fn(),
  fetchHealth: vi.fn(),
  createIssue: vi.fn(),
  addComment: vi.fn(),
  addDependency: vi.fn(),
  removeDependency: vi.fn(),
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

// ─── Mock use-issues hooks ───────────────────────────────
const mockMutate = vi.fn();
const mockMutateAsync = vi.fn();
const mockMutation = {
  mutate: mockMutate,
  mutateAsync: mockMutateAsync,
  isPending: false,
  isError: false,
  error: null,
  isSuccess: false,
  isIdle: true,
  data: undefined,
  variables: undefined,
  status: "idle" as const,
  failureCount: 0,
  failureReason: null,
  reset: vi.fn(),
  context: undefined,
  submittedAt: 0,
};

vi.mock("@/hooks/use-issues", () => ({
  useIssues: vi.fn(() => ({
    data: [],
    isLoading: false,
    error: null,
    isError: false,
    isFetching: false,
    isPending: false,
    isSuccess: true,
    status: "success",
    refetch: vi.fn(),
  })),
  useIssue: vi.fn(() => ({
    data: undefined,
    isLoading: true,
    error: null,
  })),
  useComments: vi.fn(() => ({ data: [] })),
  useEvents: vi.fn(() => ({ data: [] })),
  useDependencies: vi.fn(() => ({ data: [] })),
  useUpdateIssue: vi.fn(() => mockMutation),
  useCloseIssue: vi.fn(() => mockMutation),
  useDeleteIssue: vi.fn(() => mockMutation),
  useCreateIssue: vi.fn(() => mockMutation),
  useAddComment: vi.fn(() => mockMutation),
  useAddDependency: vi.fn(() => mockMutation),
  useRemoveDependency: vi.fn(() => mockMutation),
  useStats: vi.fn(() => ({
    data: { total: 0, by_status: {}, by_priority: {}, by_type: {}, recently_updated: 0 },
  })),
  useHealth: vi.fn(() => ({
    data: { status: "healthy", dolt_server: "running" },
    error: null,
    isLoading: false,
  })),
  issueKeys: {
    all: ["issues"],
    lists: () => ["issues", "list"],
    list: (p?: URLSearchParams) => ["issues", "list", p?.toString() ?? ""],
    details: () => ["issues", "detail"],
    detail: (id: string) => ["issues", "detail", id],
    comments: (id: string) => ["issues", "comments", id],
    events: (id: string) => ["issues", "events", id],
    dependencies: (id: string) => ["issues", "dependencies", id],
  },
  statsKeys: { all: ["stats"] },
  healthKeys: { all: ["health"] },
  dependencyKeys: { all: ["dependencies"] },
}));

// ─── Mock use-dependencies ───────────────────────────────
vi.mock("@/hooks/use-dependencies", () => ({
  useAllDependencies: vi.fn(() => ({
    data: [],
    isLoading: false,
    error: null,
    isError: false,
    isFetching: false,
    isPending: false,
    isSuccess: true,
    status: "success",
    refetch: vi.fn(),
  })),
}));

// ─── Mock React Flow (jsdom can't handle its DOM measurements) ─────
vi.mock("@xyflow/react", async () => {
  return {
    MarkerType: { ArrowClosed: "arrowclosed" },
    Position: { Top: "top", Bottom: "bottom" },
    ReactFlow: ({ nodes, edges, onNodeClick, onNodeDoubleClick, children }: any) => (
      <div
        data-testid="react-flow"
        data-node-count={nodes?.length ?? 0}
        data-edge-count={edges?.length ?? 0}
      >
        {nodes?.map((node: any) => (
          <div
            key={node.id}
            data-testid={`node-${node.id}`}
            data-highlighted={String(node.data.highlighted)}
            onClick={(e) => onNodeClick?.(e, node)}
            onDoubleClick={(e) => onNodeDoubleClick?.(e, node)}
          >
            <span>{node.data.issue.title}</span>
          </div>
        ))}
        {children}
      </div>
    ),
    Background: () => <div data-testid="rf-background" />,
    Controls: () => <div data-testid="rf-controls" />,
    MiniMap: () => <div data-testid="rf-minimap" />,
    Panel: ({ children }: any) => <div data-testid="rf-panel">{children}</div>,
    Handle: () => null,
    BaseEdge: () => null,
    getBezierPath: () => ["M0,0", 0, 0],
    useReactFlow: () => ({ zoomIn: vi.fn(), zoomOut: vi.fn(), fitView: vi.fn() }),
    useNodesState: (initial: any[]) => [initial, vi.fn(), vi.fn()],
    useEdgesState: (initial: any[]) => [initial, vi.fn(), vi.fn()],
  };
});

// ─── Mock @xyflow/react CSS import ───────────────────────
vi.mock("@xyflow/react/dist/style.css", () => ({}));

// ─── Mock dagre ──────────────────────────────────────────
vi.mock("@dagrejs/dagre", () => {
  const mockGraph = {
    setGraph: vi.fn(),
    setDefaultEdgeLabel: vi.fn(),
    setNode: vi.fn(),
    setEdge: vi.fn(),
    node: (id: string) => ({ x: 0, y: 0 }),
  };
  return {
    default: {
      graphlib: {
        Graph: vi.fn(() => mockGraph),
      },
      layout: vi.fn(),
    },
  };
});

// ─── Mock cmdk (used by CommandPalette) ──────────────────
vi.mock("cmdk", () => {
  const Command = ({ children, ...props }: any) => (
    <div data-testid="cmdk" {...props}>
      {children}
    </div>
  );
  Command.Input = (props: any) => <input data-testid="cmdk-input" {...props} />;
  Command.List = ({ children }: any) => <div data-testid="cmdk-list">{children}</div>;
  Command.Empty = ({ children }: any) => <div>{children}</div>;
  Command.Group = ({ children, heading }: any) => (
    <div data-testid={`cmdk-group-${heading}`}>{children}</div>
  );
  Command.Item = ({ children, onSelect, ...props }: any) => (
    <div data-testid={`cmdk-item`} onClick={onSelect} {...props}>
      {children}
    </div>
  );
  return { Command };
});

import type { IssueListItem } from "@pearl/shared";
import { AppShell } from "@/components/app-shell";
import { useAllDependencies } from "@/hooks/use-dependencies";
// ─── Imports (after mocks) ───────────────────────────────
import { useIssue, useIssues } from "@/hooks/use-issues";
import { BoardView } from "@/views/board-view";
import { DetailView } from "@/views/detail-view";
import { GraphView } from "@/views/graph-view";
import { ListView } from "@/views/list-view";

// ─── Test Data ───────────────────────────────────────────
const mockIssues: IssueListItem[] = [
  {
    id: "test-001",
    title: "Test Issue 1",
    status: "open",
    priority: 1,
    issue_type: "task",
    assignee: "alice",
    owner: "alice",
    created_at: "2026-01-15T10:00:00Z",
    updated_at: "2026-01-16T10:00:00Z",
    due_at: null,
    pinned: false,
    has_attachments: false,
    labels: [],
    labelColors: {},
  },
];

// ─── Helpers ─────────────────────────────────────────────
function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
}

/**
 * Render the full app shell with routing, starting at the given path.
 */
function renderApp(initialPath = "/list") {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/list" replace />} />
            <Route path="list" element={<ListView />} />
            <Route path="board" element={<BoardView />} />
            <Route path="graph" element={<GraphView />} />
            <Route path="issues/:id" element={<DetailView />} />
            <Route path="*" element={<Navigate to="/list" replace />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ─── Setup / Teardown ────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();

  // Default: return mock issues for list/board data
  vi.mocked(useIssues).mockReturnValue({
    data: mockIssues,
    isLoading: false,
    error: null,
    isError: false,
    isFetching: false,
    isPending: false,
    isSuccess: true,
    status: "success",
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useIssues>);

  vi.mocked(useAllDependencies).mockReturnValue({
    data: [],
    isLoading: false,
    error: null,
    isError: false,
    isFetching: false,
    isPending: false,
    isSuccess: true,
    status: "success",
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useAllDependencies>);
});

afterEach(() => {
  cleanup();
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. Keyboard scope registration per view
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("keyboard scope registration per view", () => {
  it("AppShell registers shell scope with number key bindings for view switching", () => {
    renderApp("/list");

    // The shell scope is verified by pressing number keys and checking navigation
    // Press "2" to switch to board
    fireEvent.keyDown(window, { key: "2" });
    expect(mockNavigate).toHaveBeenCalledWith("/board");
  });

  it("AppShell registers Cmd+K binding for command palette", () => {
    renderApp("/list");

    // Cmd+K should toggle command palette (not navigate)
    fireEvent.keyDown(window, { key: "k", metaKey: true });

    // Command palette should now be open
    expect(screen.getByTestId("cmdk")).toBeInTheDocument();
  });

  it("ListView registers list scope with j/k/Enter/slash/x bindings", () => {
    renderApp("/list");

    // "j" should move to next row (no error, just works)
    fireEvent.keyDown(window, { key: "j" });

    // "k" should move to prev row
    fireEvent.keyDown(window, { key: "k" });

    // "/" should focus search
    fireEvent.keyDown(window, { key: "/" });

    // The search input should now be focused
    const searchInput = screen.getByPlaceholderText("Search issues... (/)");
    expect(document.activeElement).toBe(searchInput);
  });

  it("ListView Enter binding opens issue detail when a row is active", () => {
    renderApp("/list");

    // Press "j" to activate first row (index 0)
    fireEvent.keyDown(window, { key: "j" });

    // Press Enter to open the active issue
    fireEvent.keyDown(window, { key: "Enter" });

    expect(mockOpenDetail).toHaveBeenCalledWith("test-001");
  });

  it("BoardView registers board scope with / binding", () => {
    renderApp("/board");

    // "/" should focus search
    fireEvent.keyDown(window, { key: "/" });
    const searchInput = screen.getByPlaceholderText("Search issues... (/)");
    expect(document.activeElement).toBe(searchInput);
  });

  it("GraphView registers graph scope with slash, Escape, and l bindings", () => {
    renderApp("/graph");

    // "/" should focus search
    fireEvent.keyDown(window, { key: "/" });
    const searchInput = screen.getByPlaceholderText("Search issues... (/)");
    expect(document.activeElement).toBe(searchInput);

    // Blur the search input to leave it for subsequent tests
    (searchInput as HTMLInputElement).blur();

    // "l" should trigger auto layout (no error = works)
    fireEvent.keyDown(window, { key: "l" });

    // "Escape" should clear selection (no error = works)
    fireEvent.keyDown(window, { key: "Escape" });
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. View switching via keyboard
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("view switching via keyboard", () => {
  it("pressing 1 navigates to /list", () => {
    renderApp("/board");
    fireEvent.keyDown(window, { key: "1" });
    expect(mockNavigate).toHaveBeenCalledWith("/list");
  });

  it("pressing 2 navigates to /board", () => {
    renderApp("/list");
    fireEvent.keyDown(window, { key: "2" });
    expect(mockNavigate).toHaveBeenCalledWith("/board");
  });

  it("pressing 3 navigates to /graph", () => {
    renderApp("/list");
    fireEvent.keyDown(window, { key: "3" });
    expect(mockNavigate).toHaveBeenCalledWith("/graph");
  });

  it("number keys do not fire when typing in a search input", () => {
    renderApp("/list");

    // Focus the search input
    const searchInput = screen.getByPlaceholderText("Search issues... (/)");
    searchInput.focus();

    // Press "2" while in input — should NOT navigate
    fireEvent.keyDown(searchInput, { key: "2" });
    expect(mockNavigate).not.toHaveBeenCalledWith("/board");
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. Click-to-detail from views
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("click-to-detail from views", () => {
  it("ListView: clicking a row opens detail panel", () => {
    renderApp("/list");

    // The table renders rows with the issue data.
    // Find the row containing our test issue and click it.
    const row = screen.getByText("Test Issue 1").closest("tr");
    expect(row).toBeTruthy();
    fireEvent.click(row!);

    expect(mockOpenDetail).toHaveBeenCalledWith("test-001");
  });

  it("BoardView: clicking a card opens detail panel", () => {
    renderApp("/board");

    // Board renders cards as buttons with aria-roledescription
    const card = screen.getByRole("button", { name: /test-001: Test Issue 1/ });
    fireEvent.click(card);

    expect(mockOpenDetail).toHaveBeenCalledWith("test-001");
  });

  it("GraphView: double-clicking a node opens detail panel", () => {
    renderApp("/graph");

    const node = screen.getByTestId("node-test-001");
    fireEvent.doubleClick(node);

    expect(mockOpenDetail).toHaveBeenCalledWith("test-001");
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. URL routing
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("URL routing", () => {
  it("/ redirects to /list (ListView renders)", () => {
    renderApp("/");

    // ListView renders a search input and the table
    expect(screen.getByPlaceholderText("Search issues... (/)")).toBeInTheDocument();
    // Should also have the issue table content
    expect(screen.getByText("Test Issue 1")).toBeInTheDocument();
  });

  it("/list renders ListView", () => {
    renderApp("/list");

    expect(screen.getByPlaceholderText("Search issues... (/)")).toBeInTheDocument();
    expect(screen.getByText("Test Issue 1")).toBeInTheDocument();
  });

  it("/board renders BoardView", () => {
    renderApp("/board");

    // Board has a kanban region
    expect(screen.getByRole("region", { name: "Kanban board" })).toBeInTheDocument();
  });

  it("/graph renders GraphView", () => {
    renderApp("/graph");

    // Graph renders the React Flow canvas
    expect(screen.getByTestId("react-flow")).toBeInTheDocument();
  });

  it("/issues/:id renders DetailView", () => {
    // Set up the issue mock for detail view
    vi.mocked(useIssue).mockReturnValue({
      data: {
        id: "test-001",
        title: "Test Issue 1",
        description: "A test description",
        design: "",
        acceptance_criteria: "",
        notes: "",
        status: "open",
        priority: 1,
        issue_type: "task",
        assignee: "alice",
        owner: "alice",
        estimated_minutes: null,
        created_at: "2026-01-15T10:00:00Z",
        created_by: "alice",
        updated_at: "2026-01-16T10:00:00Z",
        closed_at: null,
        due_at: null,
        defer_until: null,
        external_ref: null,
        spec_id: null,
        pinned: false,
        is_template: false,
        labels: [],
        labelColors: {},
        metadata: {},
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useIssue>);

    renderApp("/issues/test-001");

    // Detail view shows the short issue ID and title
    expect(screen.getByText("001")).toBeInTheDocument();
    expect(screen.getByText("Test Issue 1")).toBeInTheDocument();
    // And detail-specific sections
    expect(screen.getByText("Fields")).toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();
  });

  it("/* (unknown routes) redirect to /list", () => {
    renderApp("/nonexistent-route");

    // Should render the ListView (redirected from /*)
    expect(screen.getByPlaceholderText("Search issues... (/)")).toBeInTheDocument();
  });
});
