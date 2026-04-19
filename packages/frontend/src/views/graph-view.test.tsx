import type { Dependency, IssueListItem } from "@pearl/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock navigation
const mockNavigate = vi.fn();
vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return { ...actual, useNavigate: () => mockNavigate };
});

// Mock API module
vi.mock("@/lib/api-client", () => ({
  fetchLabels: vi.fn().mockResolvedValue([]),
  upsertLabel: vi.fn().mockResolvedValue({ success: true, invalidationHints: [] }),
  fetchIssues: vi.fn(),
  fetchAllDependencies: vi.fn(),
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
vi.mock("@/hooks/use-issues", () => ({
  useIssues: vi.fn(),
  issueKeys: {
    all: ["issues"],
    lists: () => ["issues", "list"],
    list: (p?: URLSearchParams) => ["issues", "list", p?.toString() ?? ""],
  },
  dependencyKeys: {
    all: ["dependencies"],
  },
}));

// Mock use-dependencies hook
vi.mock("@/hooks/use-dependencies", () => ({
  useAllDependencies: vi.fn(),
}));

// Mock React Flow — jsdom doesn't support the DOM measurements React Flow needs
let mockNodes: any[] = [];
let mockEdges: any[] = [];
let mockSetNodes: ReturnType<typeof vi.fn>;
let mockSetEdges: ReturnType<typeof vi.fn>;

vi.mock("@xyflow/react", async () => {
  const actual = {
    MarkerType: { ArrowClosed: "arrowclosed" },
    Position: { Top: "top", Bottom: "bottom" },
  };

  return {
    ...actual,
    ReactFlow: ({ nodes, edges, onNodeClick, onNodeDoubleClick, onPaneClick, children }: any) => (
      <div
        data-testid="react-flow"
        data-node-count={nodes?.length ?? 0}
        data-edge-count={edges?.length ?? 0}
        onClick={(e) => {
          // Only fire pane click if the click target is the react-flow div itself (not a child node)
          if ((e.target as HTMLElement).getAttribute("data-testid") === "react-flow") {
            onPaneClick?.();
          }
        }}
      >
        {nodes?.map((node: any) => (
          <div
            key={node.id}
            data-testid={`node-${node.id}`}
            data-highlighted={String(node.data.highlighted)}
            data-dimmed={String(node.data.dimmed)}
            data-selected={String(node.data.selected)}
            onClick={(e) => {
              e.stopPropagation();
              onNodeClick?.(e, node);
            }}
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
    useReactFlow: () => ({
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      fitView: vi.fn(),
    }),
    useNodesState: (initial: any[]) => {
      mockNodes = initial;
      mockSetNodes = vi.fn((v: any) => {
        mockNodes = typeof v === "function" ? v(mockNodes) : v;
      });
      return [initial, mockSetNodes, vi.fn()];
    },
    useEdgesState: (initial: any[]) => {
      mockEdges = initial;
      mockSetEdges = vi.fn((v: any) => {
        mockEdges = typeof v === "function" ? v(mockEdges) : v;
      });
      return [initial, mockSetEdges, vi.fn()];
    },
  };
});

import { useAllDependencies } from "@/hooks/use-dependencies";
import { useIssues } from "@/hooks/use-issues";
import { GraphView } from "./graph-view";

const mockIssues: IssueListItem[] = [
  {
    id: "beads-001",
    title: "Root task",
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
  {
    id: "beads-002",
    title: "Child feature",
    status: "in_progress",
    priority: 2,
    issue_type: "feature",
    assignee: "bob",
    owner: "bob",
    created_at: "2026-01-10T10:00:00Z",
    updated_at: "2026-01-17T10:00:00Z",
    due_at: null,
    pinned: false,
    has_attachments: false,
    labels: [],
    labelColors: {},
  },
  {
    id: "beads-003",
    title: "Blocked item",
    status: "blocked",
    priority: 0,
    issue_type: "bug",
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
    title: "Isolated issue",
    status: "deferred",
    priority: 4,
    issue_type: "chore",
    assignee: null,
    owner: "admin",
    created_at: "2026-01-05T10:00:00Z",
    updated_at: "2026-01-06T10:00:00Z",
    due_at: null,
    pinned: false,
    has_attachments: false,
    labels: [],
    labelColors: {},
  },
];

const mockDeps: Dependency[] = [
  {
    issue_id: "beads-002",
    depends_on_id: "beads-001",
    type: "depends_on",
    created_at: "2026-01-15T10:00:00Z",
    created_by: "alice",
  },
  {
    issue_id: "beads-003",
    depends_on_id: "beads-002",
    type: "blocks",
    created_at: "2026-01-16T10:00:00Z",
    created_by: "bob",
  },
];

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
}

function setupMocks({
  issues = mockIssues,
  deps = mockDeps,
  issuesLoading = false,
  depsLoading = false,
}: {
  issues?: IssueListItem[];
  deps?: Dependency[];
  issuesLoading?: boolean;
  depsLoading?: boolean;
} = {}) {
  vi.mocked(useIssues).mockReturnValue({
    data: issues,
    isLoading: issuesLoading,
    error: null,
    isError: false,
    isFetching: false,
    isPending: false,
    isSuccess: true,
    status: "success",
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useIssues>);

  vi.mocked(useAllDependencies).mockReturnValue({
    data: deps,
    isLoading: depsLoading,
    error: null,
    isError: false,
    isFetching: false,
    isPending: false,
    isSuccess: true,
    status: "success",
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useAllDependencies>);
}

function renderGraph() {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/graph"]}>
        <GraphView />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("GraphView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the React Flow canvas with correct node count", () => {
    setupMocks();
    renderGraph();

    const flow = screen.getByTestId("react-flow");
    expect(flow).toBeInTheDocument();
    expect(flow).toHaveAttribute("data-node-count", "4");
  });

  it("renders edges between connected nodes", () => {
    setupMocks();
    renderGraph();

    const flow = screen.getByTestId("react-flow");
    expect(flow).toHaveAttribute("data-edge-count", "2");
  });

  it("renders issue titles in nodes", () => {
    setupMocks();
    renderGraph();

    expect(screen.getByText("Root task")).toBeInTheDocument();
    expect(screen.getByText("Child feature")).toBeInTheDocument();
    expect(screen.getByText("Blocked item")).toBeInTheDocument();
    expect(screen.getByText("Isolated issue")).toBeInTheDocument();
  });

  it("renders controls, minimap, and background", () => {
    setupMocks();
    renderGraph();

    expect(screen.getByTestId("rf-background")).toBeInTheDocument();
    // Custom GraphControls renders zoom buttons instead of built-in Controls
    expect(screen.getByTitle("Zoom in")).toBeInTheDocument();
    expect(screen.getByTitle("Zoom out")).toBeInTheDocument();
    expect(screen.getByTitle("Fit view")).toBeInTheDocument();
    expect(screen.getByTestId("rf-minimap")).toBeInTheDocument();
  });

  it("renders the edge legend", () => {
    setupMocks();
    renderGraph();

    expect(screen.getByText("blocks")).toBeInTheDocument();
    expect(screen.getByText("depends on")).toBeInTheDocument();
    expect(screen.getByText("relates")).toBeInTheDocument();
  });

  it("shows loading state when data is loading", () => {
    setupMocks({ issues: [], issuesLoading: true, depsLoading: true });
    renderGraph();

    expect(screen.getByText("Loading dependency graph...")).toBeInTheDocument();
  });

  it("shows empty state when no issues match filters", () => {
    setupMocks({ issues: [], deps: [] });
    renderGraph();

    expect(screen.getByText("No issues match the current filters.")).toBeInTheDocument();
  });

  it("renders the filter bar", () => {
    setupMocks();
    renderGraph();

    expect(screen.getByPlaceholderText("Search issues... (/)")).toBeInTheDocument();
  });

  it("renders the auto layout button", () => {
    setupMocks();
    renderGraph();

    expect(screen.getByRole("button", { name: /Auto Layout/i })).toBeInTheDocument();
  });

  it("highlights blocking chain when node is clicked", () => {
    setupMocks();
    renderGraph();

    // Click on beads-002 (has upstream beads-001 and downstream beads-003)
    const node = screen.getByTestId("node-beads-002");
    fireEvent.click(node);

    // Should show blocking chain info
    expect(screen.getByText(/Highlighting blocking chain/)).toBeInTheDocument();
  });

  it("shows clear and open detail controls when node is selected", () => {
    setupMocks();
    renderGraph();

    fireEvent.click(screen.getByTestId("node-beads-001"));

    expect(screen.getByText("Clear")).toBeInTheDocument();
    expect(screen.getByText("Open detail")).toBeInTheDocument();
  });

  it("clears selection when Clear button is clicked", () => {
    setupMocks();
    renderGraph();

    // Select a node
    fireEvent.click(screen.getByTestId("node-beads-001"));
    expect(screen.getByText(/Highlighting blocking chain/)).toBeInTheDocument();

    // Click Clear
    fireEvent.click(screen.getByText("Clear"));
    expect(screen.queryByText(/Highlighting blocking chain/)).not.toBeInTheDocument();
  });

  it("navigates to detail view when 'Open detail' is clicked", () => {
    setupMocks();
    renderGraph();

    // Select a node
    fireEvent.click(screen.getByTestId("node-beads-001"));

    // Click Open detail
    fireEvent.click(screen.getByText("Open detail"));
    expect(mockNavigate).toHaveBeenCalledWith(
      "/issues/beads-001",
      expect.objectContaining({ state: { from: "/graph" } }),
    );
  });

  it("shows performance cap message when over 200 issues", () => {
    // Create 201 mock issues
    const manyIssues: IssueListItem[] = Array.from({ length: 201 }, (_, i) => ({
      id: `beads-${String(i).padStart(3, "0")}`,
      title: `Issue ${i}`,
      status: "open" as const,
      priority: 2 as const,
      issue_type: "task" as const,
      assignee: null,
      owner: "admin",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      due_at: null,
      pinned: false,
      has_attachments: false,
      labels: [],
      labelColors: {},
    }));

    setupMocks({ issues: manyIssues, deps: [] });
    renderGraph();

    expect(screen.getByText(/Showing 200 of 201 issues/)).toBeInTheDocument();
  });

  it("handles isolated nodes (no dependencies)", () => {
    setupMocks({
      issues: mockIssues,
      deps: [], // No dependencies at all
    });
    renderGraph();

    const flow = screen.getByTestId("react-flow");
    expect(flow).toHaveAttribute("data-node-count", "4");
    expect(flow).toHaveAttribute("data-edge-count", "0");
  });

  it("navigates on node double-click", () => {
    setupMocks();
    renderGraph();

    const node = screen.getByTestId("node-beads-002");
    fireEvent.doubleClick(node);

    expect(mockNavigate).toHaveBeenCalledWith(
      "/issues/beads-002",
      expect.objectContaining({ state: { from: "/graph" } }),
    );
  });

  it("deselects node when clicking the same node again", () => {
    setupMocks();
    renderGraph();

    const node = screen.getByTestId("node-beads-001");

    // First click selects
    fireEvent.click(node);
    expect(screen.getByText(/Highlighting blocking chain/)).toBeInTheDocument();

    // Second click deselects
    fireEvent.click(node);
    expect(screen.queryByText(/Highlighting blocking chain/)).not.toBeInTheDocument();
  });

  it("clears selection when clicking the background pane", () => {
    setupMocks();
    renderGraph();

    // Select a node first
    fireEvent.click(screen.getByTestId("node-beads-001"));
    expect(screen.getByText(/Highlighting blocking chain/)).toBeInTheDocument();

    // Click the pane background to clear
    const flow = screen.getByTestId("react-flow");
    fireEvent.click(flow);
    expect(screen.queryByText(/Highlighting blocking chain/)).not.toBeInTheDocument();
  });

  it("renders critical path toggle button", () => {
    setupMocks();
    renderGraph();

    const cpButton = screen.getByRole("button", { name: /Critical Path/i });
    expect(cpButton).toBeInTheDocument();

    // Clicking toggles the active state
    fireEvent.click(cpButton);
    // Button should still exist after click
    expect(screen.getByRole("button", { name: /Critical Path/i })).toBeInTheDocument();
  });
});
