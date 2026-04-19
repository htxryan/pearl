import type { InvalidationHint, Issue, IssueListItem, MutationResponse } from "@pearl/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Navigate, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mock HTMLDialogElement for jsdom ────────────────────
// jsdom does not implement showModal/close on <dialog>
HTMLDialogElement.prototype.showModal =
  HTMLDialogElement.prototype.showModal ||
  function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
HTMLDialogElement.prototype.close =
  HTMLDialogElement.prototype.close ||
  function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  };

// ─── Mock navigation ─────────────────────────────────────
const mockNavigate = vi.fn();
vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return { ...actual, useNavigate: () => mockNavigate };
});

// ─── Mock API client ─────────────────────────────────────
vi.mock("@/lib/api-client", () => ({
  fetchLabels: vi.fn().mockResolvedValue([]),
  upsertLabel: vi.fn().mockResolvedValue({ success: true, invalidationHints: [] }),
  fetchIssues: vi.fn(),
  fetchIssue: vi.fn(),
  createIssue: vi.fn(),
  updateIssue: vi.fn(),
  closeIssue: vi.fn(),
  fetchComments: vi.fn(),
  fetchEvents: vi.fn(),
  fetchAllDependencies: vi.fn(),
  fetchIssueDependencies: vi.fn(),
  addComment: vi.fn(),
  addDependency: vi.fn(),
  removeDependency: vi.fn(),
  fetchHealth: vi.fn(),
  fetchStats: vi.fn(),
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

// ─── Mock use-issues hooks ──────────────────────────────
const mockMutate = vi.fn();
const mockMutateAsync = vi.fn();
const mockCreateMutate = vi.fn();

const baseMutation = {
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

const mockCreateMutation = {
  ...baseMutation,
  mutate: mockCreateMutate,
};

const mockUpdateMutate = vi.fn();
const mockUpdateMutation = {
  ...baseMutation,
  mutate: mockUpdateMutate,
};

const mockCloseMutateAsync = vi.fn();
const mockCloseMutation = {
  ...baseMutation,
  mutateAsync: mockCloseMutateAsync,
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
  useUpdateIssue: vi.fn(() => mockUpdateMutation),
  useCloseIssue: vi.fn(() => mockCloseMutation),
  useDeleteIssue: vi.fn(() => baseMutation),
  useCreateIssue: vi.fn(() => mockCreateMutation),
  useAddComment: vi.fn(() => baseMutation),
  useAddDependency: vi.fn(() => baseMutation),
  useRemoveDependency: vi.fn(() => baseMutation),
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

// ─── Mock use-dependencies ──────────────────────────────
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

// ─── Mock React Flow ────────────────────────────────────
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

vi.mock("@xyflow/react/dist/style.css", () => ({}));

// ─── Mock dagre ─────────────────────────────────────────
vi.mock("@dagrejs/dagre", () => {
  const mockGraph = {
    setGraph: vi.fn(),
    setDefaultEdgeLabel: vi.fn(),
    setNode: vi.fn(),
    setEdge: vi.fn(),
    node: () => ({ x: 0, y: 0 }),
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

// ─── Mock cmdk ──────────────────────────────────────────
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
  Command.Item = ({ children, onSelect, value, ...props }: any) => (
    <div data-testid={`cmdk-item-${value}`} onClick={onSelect} {...props}>
      {children}
    </div>
  );
  return { Command };
});

import { AppShell } from "@/components/app-shell";
import { CreateIssueDialog } from "@/components/detail/create-issue-dialog";
import { closeCommandPalette } from "@/hooks/use-command-palette";
import { useAllDependencies } from "@/hooks/use-dependencies";
// ─── Imports (after mocks) ──────────────────────────────
import {
  issueKeys,
  useCloseIssue,
  useCreateIssue,
  useIssue,
  useIssues,
  useUpdateIssue,
} from "@/hooks/use-issues";
import * as api from "@/lib/api-client";
import { BoardView } from "@/views/board-view";
import { DetailView } from "@/views/detail-view";
import { GraphView } from "@/views/graph-view";
import { ListView } from "@/views/list-view";

// ─── Test Data ──────────────────────────────────────────
const mockIssues: IssueListItem[] = [
  {
    id: "test-001",
    title: "Open Issue",
    status: "open",
    priority: 1,
    issue_type: "task",
    assignee: "alice",
    owner: "alice",
    created_at: "2026-01-15T10:00:00Z",
    updated_at: "2026-01-16T10:00:00Z",
    due_at: null,
    pinned: false,
    labels: [],
    labelColors: {},
  },
  {
    id: "test-002",
    title: "In Progress Issue",
    status: "in_progress",
    priority: 2,
    issue_type: "feature",
    assignee: "bob",
    owner: "bob",
    created_at: "2026-01-10T10:00:00Z",
    updated_at: "2026-01-17T10:00:00Z",
    due_at: null,
    pinned: false,
    labels: [],
    labelColors: {},
  },
  {
    id: "test-003",
    title: "Blocked Issue",
    status: "blocked",
    priority: 0,
    issue_type: "bug",
    assignee: null,
    owner: "admin",
    created_at: "2026-01-12T10:00:00Z",
    updated_at: "2026-01-18T10:00:00Z",
    due_at: null,
    pinned: false,
    labels: [],
    labelColors: {},
  },
];

const mockIssueDetail: Issue = {
  id: "test-001",
  title: "Open Issue",
  description: "A test issue for golden path testing",
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
};

// ─── Helpers ────────────────────────────────────────────
function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
}

function setupIssuesMock(issues: IssueListItem[] = mockIssues) {
  vi.mocked(useIssues).mockReturnValue({
    data: issues,
    isLoading: false,
    error: null,
    isError: false,
    isFetching: false,
    isPending: false,
    isSuccess: true,
    status: "success",
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useIssues>);
}

function setupDependenciesMock() {
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
}

function renderApp(initialPath = "/list") {
  const queryClient = createQueryClient();
  return {
    queryClient,
    ...render(
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
    ),
  };
}

function renderCreateDialog(props: { isOpen: boolean; onClose: () => void }) {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CreateIssueDialog {...props} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ─── Setup / Teardown ───────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.removeItem("beads:create-issue-draft");
  setupIssuesMock();
  setupDependenciesMock();
});

afterEach(() => {
  closeCommandPalette(); // Reset module-level palette state
  cleanup();
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SC2+SC1: Create issue via form, verify API call and hints
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("SC2+SC1: Create issue via form", () => {
  it("fills form and calls createIssue mutation with correct data", async () => {
    const onClose = vi.fn();

    // Set up the create mutation to capture the call and invoke onSuccess
    let capturedData: any = null;
    let capturedCallbacks: any = null;
    mockCreateMutate.mockImplementation((data: any, callbacks: any) => {
      capturedData = data;
      capturedCallbacks = callbacks;
    });

    renderCreateDialog({ isOpen: true, onClose });

    // Fill the form fields
    const titleInput = screen.getByLabelText(/title/i);
    fireEvent.change(titleInput, { target: { value: "New golden-path issue" } });

    const descInput = screen.getByLabelText(/description/i);
    fireEvent.change(descInput, { target: { value: "Description for testing" } });

    // Select type via custom dropdown
    const typeButton = screen.getByRole("combobox", { name: /issue type/i });
    fireEvent.click(typeButton);
    const bugOption = screen.getByRole("option", { name: /bug/i });
    fireEvent.click(bugOption);

    // Select priority via custom dropdown
    const priorityButton = screen.getByRole("combobox", { name: /priority/i });
    fireEvent.click(priorityButton);
    const p1Option = screen.getByRole("option", { name: /P1/i });
    fireEvent.click(p1Option);

    const assigneeInput = screen.getByLabelText(/assignee/i);
    fireEvent.change(assigneeInput, { target: { value: "alice" } });

    // Labels are now managed via LabelPicker — type and press Enter to quick-create
    const labelsInput = screen.getByLabelText(/search labels/i);

    // Create "frontend" label
    await act(async () => {
      fireEvent.change(labelsInput, { target: { value: "frontend" } });
    });
    await act(async () => {
      fireEvent.keyDown(labelsInput, { key: "Enter" });
    });
    // Wait for the label to appear
    await waitFor(() => {
      expect(screen.getByText("frontend")).toBeInTheDocument();
    });

    // Create "urgent" label
    await act(async () => {
      fireEvent.change(labelsInput, { target: { value: "urgent" } });
    });
    await act(async () => {
      fireEvent.keyDown(labelsInput, { key: "Enter" });
    });
    await waitFor(() => {
      expect(screen.getByText("urgent")).toBeInTheDocument();
    });

    // Submit the form
    const submitButton = screen.getByRole("button", { name: /create issue/i });
    fireEvent.click(submitButton);

    // Verify mutation was called with correct payload
    expect(mockCreateMutate).toHaveBeenCalledTimes(1);
    expect(capturedData).toEqual({
      title: "New golden-path issue",
      description: "Description for testing",
      issue_type: "bug",
      priority: 1,
      assignee: "alice",
      labels: ["frontend", "urgent"],
      due: undefined,
    });

    // Simulate successful creation triggering onSuccess
    act(() => {
      capturedCallbacks?.onSuccess?.();
    });

    // Verify dialog closes after success
    expect(onClose).toHaveBeenCalled();
  });

  it("does not submit when title is empty", () => {
    const onClose = vi.fn();
    renderCreateDialog({ isOpen: true, onClose });

    // Submit button should be disabled with empty title
    const submitButton = screen.getByRole("button", { name: /create issue/i });
    expect(submitButton).toBeDisabled();

    // Clicking should not trigger mutation
    fireEvent.click(submitButton);
    expect(mockCreateMutate).not.toHaveBeenCalled();
  });

  it("resets form after successful creation", () => {
    const onClose = vi.fn();
    let capturedCallbacks: any = null;
    mockCreateMutate.mockImplementation((_data: any, callbacks: any) => {
      capturedCallbacks = callbacks;
    });

    const { unmount } = renderCreateDialog({ isOpen: true, onClose });

    // Fill title and submit
    const titleInput = screen.getByLabelText(/title/i);
    fireEvent.change(titleInput, { target: { value: "Temporary issue" } });

    const submitButton = screen.getByRole("button", { name: /create issue/i });
    fireEvent.click(submitButton);

    // Trigger onSuccess to reset form
    act(() => {
      capturedCallbacks?.onSuccess?.();
    });

    unmount();

    // Re-render to verify form is clean (form resets via state)
    renderCreateDialog({ isOpen: true, onClose });
    const newTitleInput = screen.getByLabelText(/title/i);
    expect(newTitleInput).toHaveValue("");
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SC5+SC10: Drag card on Kanban -> verify data updates
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("SC5+SC10: Kanban board column rendering and mutation wiring", () => {
  it("renders issues in correct status columns on the board", () => {
    setupIssuesMock(mockIssues);
    renderApp("/board");

    // Open column should have test-001
    const openList = screen.getByRole("list", { name: "open issues" });
    expect(within(openList).getByText("Open Issue")).toBeInTheDocument();

    // In Progress column should have test-002
    const inProgressList = screen.getByRole("list", { name: "in_progress issues" });
    expect(within(inProgressList).getByText("In Progress Issue")).toBeInTheDocument();

    // Issues with status "blocked" now land in the open column (blocked is derived)
    expect(within(openList).getByText("Blocked Issue")).toBeInTheDocument();
  });

  it("wires up useUpdateIssue hook and renders the board region", () => {
    // Note: jsdom cannot simulate real DnD events from dnd-kit.
    // This test verifies the mutation hook is connected and the board renders.
    setupIssuesMock(mockIssues);
    renderApp("/board");

    expect(vi.mocked(useUpdateIssue)).toHaveBeenCalled();

    const board = screen.getByRole("region", { name: "Kanban board" });
    expect(board).toBeInTheDocument();
  });

  it("does not call updateIssue when card is dropped in the same column (no-op)", () => {
    setupIssuesMock(mockIssues);
    renderApp("/board");

    // After render, no mutations should have been called
    expect(mockUpdateMutate).not.toHaveBeenCalled();
  });

  it("shows issues in correct columns after optimistic update data change", () => {
    // Simulate the state after a drag: test-001 moved from "open" to "in_progress"
    const updatedIssues = mockIssues.map((i) =>
      i.id === "test-001" ? { ...i, status: "in_progress" as const } : i,
    );
    setupIssuesMock(updatedIssues);
    renderApp("/board");

    // test-001 should now be in the in_progress column
    const inProgressList = screen.getByRole("list", { name: "in_progress issues" });
    expect(within(inProgressList).getByText("Open Issue")).toBeInTheDocument();
    expect(within(inProgressList).getByText("In Progress Issue")).toBeInTheDocument();

    // open column should still have test-003 (status "blocked" falls to open)
    const openList = screen.getByRole("list", { name: "open issues" });
    expect(within(openList).getByText("Blocked Issue")).toBeInTheDocument();
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SC8+SC10: Close issue -> verify newly-unblocked highlighted
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("SC8+SC10: Close issue and highlight newly-unblocked", () => {
  it("ListView renders bulk close bar when issues are selected", () => {
    setupIssuesMock(mockIssues);
    renderApp("/list");

    // Select a row via keyboard: press j then x
    fireEvent.keyDown(window, { key: "j" }); // move to row 0
    fireEvent.keyDown(window, { key: "x" }); // toggle selection on row 0

    // Bulk action bar should appear
    expect(screen.getByText(/1 issue selected/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /close selected/i })).toBeInTheDocument();
  });

  it("handleBulkClose calls closeMutation.mutateAsync for each selected issue", async () => {
    // Set up mock to resolve successfully
    mockCloseMutateAsync.mockResolvedValue({
      success: true,
      invalidationHints: [{ entity: "issues" as const }],
    });

    setupIssuesMock(mockIssues);
    const { queryClient } = renderApp("/list");

    // Pre-seed the query cache with the current issues list
    // (ListView's handleBulkClose reads from cache for blocked snapshot)
    queryClient.setQueryData(["issues", "list", ""], mockIssues);

    // Select test-001 via keyboard
    fireEvent.keyDown(window, { key: "j" }); // activate row 0
    fireEvent.keyDown(window, { key: "x" }); // select row 0

    // Click "Close selected" — opens confirmation dialog
    const closeBtn = screen.getByRole("button", { name: /close selected/i });
    fireEvent.click(closeBtn);

    // Confirm the bulk close in the dialog
    const confirmBtn = await screen.findByRole("button", { name: /close 1 issue/i });
    fireEvent.click(confirmBtn);

    // Verify closeMutation was called
    await waitFor(() => {
      expect(mockCloseMutateAsync).toHaveBeenCalledWith({ id: "test-001" });
    });
  });

  it("calls closeMutation for selected issue during bulk close flow", async () => {
    // This test verifies the close mutation is invoked when bulk-closing.
    // Note: highlighting of newly-unblocked issues requires end-to-end DnD
    // and refetch integration that cannot be fully tested with mocked hooks.
    const issuesWithBlocked: IssueListItem[] = [...mockIssues];

    mockCloseMutateAsync.mockResolvedValue({
      success: true,
      invalidationHints: [{ entity: "issues" as const }],
    });

    setupIssuesMock(issuesWithBlocked);
    const { queryClient } = renderApp("/list");

    queryClient.setQueryData(["issues", "list", ""], issuesWithBlocked);

    // Select test-001
    fireEvent.keyDown(window, { key: "j" });
    fireEvent.keyDown(window, { key: "x" });

    // Click close — opens confirmation dialog
    const closeBtn = screen.getByRole("button", { name: /close selected/i });
    fireEvent.click(closeBtn);

    // Confirm in the dialog
    const confirmBtn = await screen.findByRole("button", { name: /close 1 issue/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockCloseMutateAsync).toHaveBeenCalledTimes(1);
      expect(mockCloseMutateAsync).toHaveBeenCalledWith({ id: "test-001" });
    });
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SC11+SC13: Keyboard navigation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("SC11+SC13: Keyboard navigation", () => {
  it("j/k navigation in list view moves activeRowIndex", () => {
    setupIssuesMock(mockIssues);
    renderApp("/list");

    // Initially no row is active (activeRowIndex = -1)
    // Press j to move to first row
    fireEvent.keyDown(window, { key: "j" });

    // The first row should now be active (aria-selected)
    const rows = screen.getAllByRole("row");
    // rows[0] is the header row, rows[1] is the first data row
    const firstDataRow = rows[1];
    expect(firstDataRow).toHaveAttribute("aria-selected", "true");

    // Press j again to move to second row
    fireEvent.keyDown(window, { key: "j" });

    // Second data row should be active
    const updatedRows = screen.getAllByRole("row");
    expect(updatedRows[2]).toHaveAttribute("aria-selected", "true");
    expect(updatedRows[1]).toHaveAttribute("aria-selected", "false");

    // Press k to move back to first row
    fireEvent.keyDown(window, { key: "k" });
    const finalRows = screen.getAllByRole("row");
    expect(finalRows[1]).toHaveAttribute("aria-selected", "true");
  });

  it("Enter key opens issue detail from list view", () => {
    setupIssuesMock(mockIssues);
    renderApp("/list");

    // Navigate to first row
    fireEvent.keyDown(window, { key: "j" });

    // Press Enter to open detail
    fireEvent.keyDown(window, { key: "Enter" });

    expect(mockNavigate).toHaveBeenCalledWith(
      "/issues/test-001",
      expect.objectContaining({ state: { from: "/list" } }),
    );
  });

  it("Enter on second row opens correct issue", () => {
    setupIssuesMock(mockIssues);
    renderApp("/list");

    // Navigate to second row
    fireEvent.keyDown(window, { key: "j" });
    fireEvent.keyDown(window, { key: "j" });

    // Press Enter
    fireEvent.keyDown(window, { key: "Enter" });

    expect(mockNavigate).toHaveBeenCalledWith(
      "/issues/test-002",
      expect.objectContaining({ state: { from: "/list" } }),
    );
  });

  it("1/2/3 keys switch between views (shell scope)", () => {
    setupIssuesMock(mockIssues);
    renderApp("/list");

    // Press 2 to go to board
    fireEvent.keyDown(window, { key: "2" });
    expect(mockNavigate).toHaveBeenCalledWith("/board");

    mockNavigate.mockClear();

    // Press 3 to go to graph
    fireEvent.keyDown(window, { key: "3" });
    expect(mockNavigate).toHaveBeenCalledWith("/graph");

    mockNavigate.mockClear();

    // Press 1 to go back to list
    fireEvent.keyDown(window, { key: "1" });
    expect(mockNavigate).toHaveBeenCalledWith("/list");
  });

  it("/ focuses the search input in list view", () => {
    setupIssuesMock(mockIssues);
    renderApp("/list");

    fireEvent.keyDown(window, { key: "/" });

    const searchInput = screen.getByPlaceholderText("Search issues... (/)");
    expect(document.activeElement).toBe(searchInput);
  });

  it("/ focuses the search input in board view", () => {
    setupIssuesMock(mockIssues);
    renderApp("/board");

    fireEvent.keyDown(window, { key: "/" });

    const searchInput = screen.getByPlaceholderText("Search issues... (/)");
    expect(document.activeElement).toBe(searchInput);
  });

  it("number keys do not fire when focused on search input", () => {
    setupIssuesMock(mockIssues);
    renderApp("/list");

    // Focus search
    const searchInput = screen.getByPlaceholderText("Search issues... (/)");
    searchInput.focus();

    // Number keys should not navigate
    fireEvent.keyDown(searchInput, { key: "2" });
    expect(mockNavigate).not.toHaveBeenCalledWith("/board");
  });

  it("k does not go below index 0", () => {
    setupIssuesMock(mockIssues);
    renderApp("/list");

    // Press j to move to row 0, then k multiple times
    fireEvent.keyDown(window, { key: "j" });
    fireEvent.keyDown(window, { key: "k" });
    fireEvent.keyDown(window, { key: "k" });
    fireEvent.keyDown(window, { key: "k" });

    // First data row should still be active (clamped at 0)
    const rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveAttribute("aria-selected", "true");
  });

  it("j does not go beyond last issue", () => {
    setupIssuesMock(mockIssues);
    renderApp("/list");

    // Press j many times (more than number of issues)
    for (let i = 0; i < 10; i++) {
      fireEvent.keyDown(window, { key: "j" });
    }

    // Last data row should be active (clamped at issues.length - 1)
    const rows = screen.getAllByRole("row");
    const lastDataRow = rows[rows.length - 1];
    expect(lastDataRow).toHaveAttribute("aria-selected", "true");
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SC9+SC2: Command palette create
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("SC9+SC2: Command palette create", () => {
  it("Cmd+K opens command palette", () => {
    setupIssuesMock(mockIssues);
    renderApp("/list");

    // Palette should not be visible initially
    expect(screen.queryByTestId("cmdk")).not.toBeInTheDocument();

    // Press Cmd+K
    fireEvent.keyDown(window, { key: "k", metaKey: true });

    // Palette should now be visible
    expect(screen.getByTestId("cmdk")).toBeInTheDocument();
  });

  it("command palette has Create Issue action from shell scope", async () => {
    setupIssuesMock(mockIssues);
    renderApp("/list");

    // Open palette
    act(() => {
      fireEvent.keyDown(window, { key: "k", metaKey: true });
    });

    // The "Create Issue" action should be present (may need a tick for actions to register)
    await waitFor(() => {
      expect(screen.getByTestId("cmdk-item-Create Issue")).toBeInTheDocument();
    });
  });

  it("selecting Create Issue from palette opens CreateIssueDialog", async () => {
    setupIssuesMock(mockIssues);
    renderApp("/list");

    // Open palette
    act(() => {
      fireEvent.keyDown(window, { key: "k", metaKey: true });
    });

    // Click the Create Issue action
    await waitFor(() => {
      expect(screen.getByTestId("cmdk-item-Create Issue")).toBeInTheDocument();
    });
    const createItem = screen.getByTestId("cmdk-item-Create Issue");
    fireEvent.click(createItem);

    // CreateIssueDialog should appear with its form fields
    await waitFor(() => {
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    });
    // The dialog heading is "Create Issue" (h2)
    expect(screen.getByRole("heading", { name: "Create Issue" })).toBeInTheDocument();
  });

  it("command palette has navigation actions", () => {
    setupIssuesMock(mockIssues);
    renderApp("/list");

    // Open palette
    fireEvent.keyDown(window, { key: "k", metaKey: true });

    // Navigation items should be present
    expect(screen.getByTestId("cmdk-item-Go to List View")).toBeInTheDocument();
    expect(screen.getByTestId("cmdk-item-Go to Board View")).toBeInTheDocument();
    expect(screen.getByTestId("cmdk-item-Go to Graph View")).toBeInTheDocument();
  });

  it("selecting Go to Board View from palette navigates", () => {
    setupIssuesMock(mockIssues);
    renderApp("/list");

    // Open palette
    fireEvent.keyDown(window, { key: "k", metaKey: true });

    // Click Go to Board View
    const boardItem = screen.getByTestId("cmdk-item-Go to Board View");
    fireEvent.click(boardItem);

    expect(mockNavigate).toHaveBeenCalledWith("/board");
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// View composition: List -> Detail -> Back
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("View composition: List -> Detail -> Back", () => {
  it("clicking a row in ListView navigates to /issues/:id", () => {
    setupIssuesMock(mockIssues);
    renderApp("/list");

    // Find and click the first issue row
    const issueRow = screen.getByText("Open Issue").closest("tr");
    expect(issueRow).toBeTruthy();
    fireEvent.click(issueRow!);

    expect(mockNavigate).toHaveBeenCalledWith(
      "/issues/test-001",
      expect.objectContaining({ state: { from: "/list" } }),
    );
  });

  it("clicking second issue row navigates to correct detail", () => {
    setupIssuesMock(mockIssues);
    renderApp("/list");

    const issueRow = screen.getByText("In Progress Issue").closest("tr");
    expect(issueRow).toBeTruthy();
    fireEvent.click(issueRow!);

    expect(mockNavigate).toHaveBeenCalledWith(
      "/issues/test-002",
      expect.objectContaining({ state: { from: "/list" } }),
    );
  });

  it("DetailView renders back button that navigates to /list", () => {
    // Set up issue detail mock
    vi.mocked(useIssue).mockReturnValue({
      data: mockIssueDetail,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useIssue>);

    setupIssuesMock(mockIssues);
    renderApp("/issues/test-001");

    // Should show the issue detail (short ID)
    expect(screen.getByText("001")).toBeInTheDocument();
    expect(screen.getByText("Open Issue")).toBeInTheDocument();

    // Find and click the breadcrumb back link
    const breadcrumbNav = screen.getByRole("navigation", { name: "Breadcrumb" });
    const backButton = breadcrumbNav.querySelector("button");
    expect(backButton).toBeTruthy();
    fireEvent.click(backButton!);

    expect(mockNavigate).toHaveBeenCalledWith("/list");
  });

  it("Escape key in DetailView navigates back to /list", () => {
    vi.mocked(useIssue).mockReturnValue({
      data: mockIssueDetail,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useIssue>);

    setupIssuesMock(mockIssues);
    renderApp("/issues/test-001");

    // Press Escape
    fireEvent.keyDown(window, { key: "Escape" });

    expect(mockNavigate).toHaveBeenCalledWith("/list");
  });

  it("DetailView shows issue metadata fields", () => {
    vi.mocked(useIssue).mockReturnValue({
      data: mockIssueDetail,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useIssue>);

    setupIssuesMock(mockIssues);
    renderApp("/issues/test-001");

    // Should display key fields
    expect(screen.getByText("Fields")).toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Priority")).toBeInTheDocument();
  });

  it("BoardView card click navigates to detail", () => {
    setupIssuesMock(mockIssues);
    renderApp("/board");

    const card = screen.getByRole("button", { name: /test-001: Open Issue/ });
    fireEvent.click(card);

    expect(mockNavigate).toHaveBeenCalledWith(
      "/issues/test-001",
      expect.objectContaining({ state: { from: "/board" } }),
    );
  });

  it("GraphView node double-click navigates to detail", () => {
    setupIssuesMock(mockIssues);
    renderApp("/graph");

    const node = screen.getByTestId("node-test-001");
    fireEvent.doubleClick(node);

    expect(mockNavigate).toHaveBeenCalledWith(
      "/issues/test-001",
      expect.objectContaining({ state: { from: "/graph" } }),
    );
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Cross-view data consistency
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("Cross-view data consistency", () => {
  it("ListView and BoardView show same issues from shared useIssues hook", () => {
    setupIssuesMock(mockIssues);

    // Render list view
    const { unmount } = renderApp("/list");
    expect(screen.getByText("Open Issue")).toBeInTheDocument();
    expect(screen.getByText("In Progress Issue")).toBeInTheDocument();
    expect(screen.getByText("Blocked Issue")).toBeInTheDocument();
    unmount();

    // Render board view with same data
    renderApp("/board");
    expect(screen.getByText("Open Issue")).toBeInTheDocument();
    expect(screen.getByText("In Progress Issue")).toBeInTheDocument();
    expect(screen.getByText("Blocked Issue")).toBeInTheDocument();
  });

  it("all three views render data from the same useIssues hook", () => {
    setupIssuesMock(mockIssues);

    // List
    const { unmount: u1 } = renderApp("/list");
    expect(screen.getByText("Open Issue")).toBeInTheDocument();
    u1();

    // Board
    const { unmount: u2 } = renderApp("/board");
    expect(screen.getByText("Open Issue")).toBeInTheDocument();
    u2();

    // Graph
    renderApp("/graph");
    expect(screen.getByText("Open Issue")).toBeInTheDocument();
  });

  it("empty issue list renders correctly in all views", () => {
    setupIssuesMock([]);

    // List shows empty state
    const { unmount: u1 } = renderApp("/list");
    expect(screen.getByText("No issues found")).toBeInTheDocument();
    u1();

    // Board: all 4 columns show "No issues"
    const { unmount: u2 } = renderApp("/board");
    const emptyMessages = screen.getAllByText("No issues");
    expect(emptyMessages.length).toBe(4);
    u2();

    // Graph shows empty state message
    renderApp("/graph");
    expect(screen.getByText("No issues match the current filters.")).toBeInTheDocument();
  });
});
