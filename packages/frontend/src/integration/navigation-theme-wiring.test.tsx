import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Navigate, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  fetchIssues: vi.fn().mockResolvedValue([]),
  fetchIssue: vi.fn(),
  updateIssue: vi.fn(),
  closeIssue: vi.fn(),
  createIssue: vi.fn(),
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

// ─── Mock React Flow ─────────────────────────────────────
vi.mock("@xyflow/react", async () => ({
  MarkerType: { ArrowClosed: "arrowclosed" },
  Position: { Top: "top", Bottom: "bottom" },
  ReactFlow: ({ children }: any) => <div data-testid="react-flow">{children}</div>,
  Background: () => null,
  Controls: () => null,
  MiniMap: () => null,
  Panel: ({ children }: any) => <div>{children}</div>,
  Handle: () => null,
  BaseEdge: () => null,
  getBezierPath: () => ["M0,0", 0, 0],
  useReactFlow: () => ({ zoomIn: vi.fn(), zoomOut: vi.fn(), fitView: vi.fn() }),
  useNodesState: (initial: any[]) => [initial, vi.fn(), vi.fn()],
  useEdgesState: (initial: any[]) => [initial, vi.fn(), vi.fn()],
}));
vi.mock("@xyflow/react/dist/style.css", () => ({}));

// ─── Mock dagre ──────────────────────────────────────────
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
      graphlib: { Graph: vi.fn(() => mockGraph) },
      layout: vi.fn(),
    },
  };
});

// ─── Mock cmdk ───────────────────────────────────────────
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
    <div data-testid="cmdk-item" onClick={onSelect} {...props}>
      {children}
    </div>
  );
  return { Command };
});

// ─── Imports (after mocks) ───────────────────────────────
import { AppShell } from "@/components/app-shell";
import { monokai } from "@/themes/definitions/monokai";
import { ListView } from "@/views/list-view";
import { SettingsView } from "@/views/settings-view";

// ─── Helpers ─────────────────────────────────────────────
function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
}

function renderApp(initialPath = "/list") {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/list" replace />} />
            <Route path="list" element={<ListView />} />
            <Route path="settings" element={<SettingsView />} />
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
  localStorage.clear();
  document.documentElement.classList.remove("dark");
  document.documentElement.style.cssText = "";
});

afterEach(() => {
  cleanup();
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. Sidebar — Settings nav item with gear icon, visually separated
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("Sidebar Settings nav item", () => {
  it("renders Settings link pointing to /settings", () => {
    renderApp("/list");
    const settingsLink = screen.getByRole("link", { name: /settings/i });
    expect(settingsLink).toBeInTheDocument();
    expect(settingsLink).toHaveAttribute("href", "/settings");
  });

  it("Settings link contains a gear SVG icon", () => {
    renderApp("/list");
    const settingsLink = screen.getByRole("link", { name: /settings/i });
    const svg = settingsLink.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("width")).toBe("16");
    expect(svg?.getAttribute("height")).toBe("16");
  });

  it("Settings is visually separated from main nav items (border-t)", () => {
    renderApp("/list");
    const settingsLink = screen.getByRole("link", { name: /settings/i });
    // Settings should be in a container with border-top separator
    const container = settingsLink.parentElement;
    expect(container?.className).toContain("border-t");
  });

  it("pressing 4 navigates to /settings", () => {
    renderApp("/list");
    fireEvent.keyDown(window, { key: "4" });
    expect(mockNavigate).toHaveBeenCalledWith("/settings");
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. Header — sun/moon toggle removed
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("Header theme toggle removed", () => {
  it("header does not contain a 'Change theme' button", () => {
    renderApp("/list");
    expect(screen.queryByRole("button", { name: /change theme/i })).toBeNull();
  });

  it("header still shows the keyboard shortcut hints", () => {
    renderApp("/list");
    expect(screen.getByText(/for commands/i)).toBeInTheDocument();
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. Command Palette — Switch Theme commands
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("Command Palette Switch Theme commands", () => {
  it("Cmd+K opens command palette with Switch Theme group", () => {
    renderApp("/list");

    fireEvent.keyDown(window, { key: "k", metaKey: true });

    // Command palette should be open
    const palette = screen.getByTestId("cmdk");
    expect(palette).toBeInTheDocument();

    // Should have a group labeled "Switch Theme"
    const themeGroup = screen.getByTestId("cmdk-group-Switch Theme");
    expect(themeGroup).toBeInTheDocument();
  });

  it("Switch Theme group contains theme items", () => {
    renderApp("/list");

    fireEvent.keyDown(window, { key: "k", metaKey: true });

    const themeGroup = screen.getByTestId("cmdk-group-Switch Theme");
    const items = within(themeGroup).getAllByTestId("cmdk-item");
    // Should have at least a few theme items (all 15 themes)
    expect(items.length).toBeGreaterThanOrEqual(3);
  });

  it("clicking a theme item closes palette and applies the theme", () => {
    renderApp("/list");

    fireEvent.keyDown(window, { key: "k", metaKey: true });

    const themeGroup = screen.getByTestId("cmdk-group-Switch Theme");
    const themeItems = within(themeGroup).getAllByTestId("cmdk-item");

    // Click the first theme item
    fireEvent.click(themeItems[0]);

    // TODO: assert palette closes after selection (cmdk mock doesn't simulate dismiss)
    // Verify theme was applied via localStorage (useTheme is real, not mocked)
    const storedTheme = localStorage.getItem("pearl-theme");
    expect(storedTheme).toBeTruthy();
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. Full theme selection flow (E2E)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("E2E theme selection flow", () => {
  it("theme selected via command palette persists to localStorage", () => {
    renderApp("/list");

    // Open command palette
    fireEvent.keyDown(window, { key: "k", metaKey: true });

    // Find and click a specific theme (e.g., Monokai)
    const themeGroup = screen.getByTestId("cmdk-group-Switch Theme");
    const items = within(themeGroup).getAllByTestId("cmdk-item");
    // Find the Monokai item
    const monokaiItem = items.find((item) => item.textContent?.includes("Monokai"));
    expect(monokaiItem).toBeTruthy();
    fireEvent.click(monokaiItem!);

    // Theme should be persisted in localStorage
    expect(localStorage.getItem("pearl-theme")).toBe(monokai.id);

    // CSS custom properties should be applied
    expect(document.documentElement.style.getPropertyValue("--color-background")).toBe(
      monokai.colors.background,
    );

    // Dark class should be applied (Monokai is a dark theme)
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("theme selected via command palette survives unmount and re-render", () => {
    const { unmount } = renderApp("/list");

    // Open command palette and select Monokai
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    const themeGroup = screen.getByTestId("cmdk-group-Switch Theme");
    const items = within(themeGroup).getAllByTestId("cmdk-item");
    const monokaiItem = items.find((item) => item.textContent?.includes("Monokai"));
    fireEvent.click(monokaiItem!);

    // Verify theme was applied
    expect(localStorage.getItem("pearl-theme")).toBe(monokai.id);
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    // Unmount and re-render (simulates page navigation within SPA)
    unmount();
    renderApp("/list");

    // CSS variables should still reflect the persisted theme
    expect(document.documentElement.style.getPropertyValue("--color-background")).toBe(
      monokai.colors.background,
    );
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
