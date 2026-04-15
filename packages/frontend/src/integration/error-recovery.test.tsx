import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";

// ─── Mocks ─────────────────────────────────────────────

vi.mock("@/hooks/use-issues", () => ({
  useHealth: vi.fn(),
  useIssues: vi.fn(),
  useUpdateIssue: vi.fn(() => ({
    mutate: vi.fn(),
    isError: false,
    error: null,
  })),
  useCloseIssue: vi.fn(() => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  })),
  useCreateIssue: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
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
  })),
}));

vi.mock("@/hooks/use-keyboard-scope", () => ({
  useKeyboardScope: vi.fn(),
}));

vi.mock("@/hooks/use-command-palette", () => ({
  useCommandPaletteActions: vi.fn(),
}));

vi.mock("@/hooks/use-theme", () => ({
  useTheme: vi.fn(() => ({
    themeId: "vscode-light-plus",
    theme: {
      id: "vscode-light-plus",
      name: "Light+",
      colorScheme: "light" as const,
      colors: {
        background: "#ffffff", foreground: "#0a0a0a", muted: "#f5f5f5",
        "muted-foreground": "#737373", border: "#e5e5e5", primary: "#4f46e5",
        "primary-foreground": "#ffffff", accent: "#eef2ff", "accent-foreground": "#3730a3",
        destructive: "#ef4444", ring: "#6366f1", info: "#3b82f6",
        "info-foreground": "#1e3a5f", success: "#22c55e", "success-foreground": "#14532d",
        warning: "#f59e0b", "warning-foreground": "#78350f", danger: "#ef4444",
        "danger-foreground": "#7f1d1d", surface: "#ffffff", "surface-raised": "#fafafa",
      },
    },
    setTheme: vi.fn(),
  })),
}));

// Mock React Flow for GraphView
vi.mock("@xyflow/react", async () => ({
  MarkerType: { ArrowClosed: "arrowclosed" },
  Position: { Top: "top", Bottom: "bottom" },
  ReactFlow: ({ children }: any) => (
    <div data-testid="react-flow">{children}</div>
  ),
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

// Mock react-router navigate
const mockNavigate = vi.fn();
vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return { ...actual, useNavigate: () => mockNavigate };
});

import { useHealth, useIssues } from "@/hooks/use-issues";
import { useAllDependencies } from "@/hooks/use-dependencies";
import { HealthBanner } from "@/components/health-banner";
import { ApiClientError, fetchHealth } from "@/lib/api-client";
import type { UseQueryResult } from "@tanstack/react-query";
import type { HealthResponse, IssueListItem } from "@pearl/shared";

// ─── Helpers ───────────────────────────────────────────

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

function mockHealthReturn(overrides: Partial<UseQueryResult<HealthResponse>>) {
  const base = {
    data: undefined,
    error: null,
    isLoading: false,
    isError: false,
    isFetching: false,
    isPending: false,
    isSuccess: false,
    status: "pending" as const,
    refetch: vi.fn(),
  };
  vi.mocked(useHealth).mockReturnValue({
    ...base,
    ...overrides,
  } as unknown as ReturnType<typeof useHealth>);
}

function mockIssuesReturn(overrides: Record<string, unknown>) {
  const base = {
    data: undefined,
    error: null,
    isLoading: false,
    isError: false,
    isFetching: false,
    isPending: false,
    isSuccess: false,
    status: "pending" as const,
    refetch: vi.fn(),
  };
  vi.mocked(useIssues).mockReturnValue({
    ...base,
    ...overrides,
  } as unknown as ReturnType<typeof useIssues>);
}

// ─── HealthBanner Tests ────────────────────────────────

describe("HealthBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing while loading initially", () => {
    mockHealthReturn({ isLoading: true, data: undefined, error: null });
    const { container } = renderWithProviders(<HealthBanner />);
    expect(container.innerHTML).toBe("");
  });

  it("shows 'Backend unavailable' with destructive styling on network error", () => {
    mockHealthReturn({
      isLoading: false,
      error: new Error("Failed to fetch"),
      isError: true,
    });
    renderWithProviders(<HealthBanner />);

    expect(screen.getByText("Backend unavailable")).toBeInTheDocument();
    expect(
      screen.getByText(/Cannot connect to the server/),
    ).toBeInTheDocument();

    // Verify destructive/red styling class
    const banner = screen.getByText("Backend unavailable").closest("div");
    expect(banner?.className).toContain("text-destructive");
  });

  it("shows 'Database unavailable' with yellow styling when dolt_server is 'stopped'", () => {
    mockHealthReturn({
      isLoading: false,
      data: {
        status: "degraded",
        dolt_server: "stopped",
        uptime_seconds: 100,
        version: "1.0.0",
      },
      isSuccess: true,
    });
    renderWithProviders(<HealthBanner />);

    expect(screen.getByText("Database unavailable")).toBeInTheDocument();
    expect(screen.getByText(/Dolt server status: stopped/)).toBeInTheDocument();

    const banner = screen.getByText("Database unavailable").closest("div");
    expect(banner?.className).toContain("text-warning-foreground");
  });

  it("shows 'Database unavailable' when dolt_server is 'starting'", () => {
    mockHealthReturn({
      isLoading: false,
      data: {
        status: "degraded",
        dolt_server: "starting",
        uptime_seconds: 5,
        version: "1.0.0",
      },
      isSuccess: true,
    });
    renderWithProviders(<HealthBanner />);

    expect(screen.getByText("Database unavailable")).toBeInTheDocument();
    expect(
      screen.getByText(/Dolt server status: starting/),
    ).toBeInTheDocument();
  });

  it("shows 'Database unavailable' when dolt_server is 'error'", () => {
    mockHealthReturn({
      isLoading: false,
      data: {
        status: "unhealthy",
        dolt_server: "error",
        uptime_seconds: 50,
        version: "1.0.0",
      },
      isSuccess: true,
    });
    renderWithProviders(<HealthBanner />);

    expect(screen.getByText("Database unavailable")).toBeInTheDocument();
    expect(screen.getByText(/Dolt server status: error/)).toBeInTheDocument();
  });

  it("renders nothing when health.dolt_server is 'running'", () => {
    mockHealthReturn({
      isLoading: false,
      data: {
        status: "healthy",
        dolt_server: "running",
        uptime_seconds: 300,
        version: "1.0.0",
      },
      isSuccess: true,
    });
    const { container } = renderWithProviders(<HealthBanner />);
    expect(container.innerHTML).toBe("");
  });
});

// ─── API Client Error Handling ─────────────────────────

describe("ApiClientError handling", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("wraps non-OK responses into ApiClientError with status and apiError", async () => {
    const apiError = {
      code: "NOT_FOUND",
      message: "Issue not found",
      retryable: false,
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve(apiError),
    } as Response);

    try {
      await fetchHealth();
      expect.unreachable("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiClientError);
      const error = err as ApiClientError;
      expect(error.status).toBe(404);
      expect(error.apiError).toEqual(apiError);
      expect(error.message).toBe("Issue not found");
    }
  });

  it("falls back to INTERNAL_ERROR when response body is not valid JSON", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 502,
      statusText: "Bad Gateway",
      json: () => Promise.reject(new SyntaxError("Unexpected token")),
    } as unknown as Response);

    try {
      await fetchHealth();
      expect.unreachable("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiClientError);
      const error = err as ApiClientError;
      expect(error.status).toBe(502);
      expect(error.apiError).toEqual({
        code: "INTERNAL_ERROR",
        message: "Bad Gateway",
        retryable: false,
      });
    }
  });

  it("propagates network errors (TypeError) without wrapping", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new TypeError("Failed to fetch"),
    );

    try {
      await fetchHealth();
      expect.unreachable("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(TypeError);
      expect((err as TypeError).message).toBe("Failed to fetch");
      expect(err).not.toBeInstanceOf(ApiClientError);
    }
  });

  describe("error code behaviors from server responses", () => {
    const errorCodes = [
      {
        code: "DOLT_UNAVAILABLE",
        status: 503,
        retryable: true,
        message: "Dolt server unavailable",
      },
      {
        code: "DATABASE_LOCKED",
        status: 423,
        retryable: true,
        message: "Database locked",
      },
      {
        code: "CLI_ERROR",
        status: 500,
        retryable: false,
        message: "bd command failed",
      },
      {
        code: "VALIDATION_ERROR",
        status: 400,
        retryable: false,
        message: "Invalid input",
      },
      {
        code: "NOT_FOUND",
        status: 404,
        retryable: false,
        message: "Entity not found",
      },
      {
        code: "INTERNAL_ERROR",
        status: 500,
        retryable: false,
        message: "Unexpected error",
      },
    ];

    for (const { code, status, retryable, message } of errorCodes) {
      it(`correctly handles ${code} (${status}) with retryable=${retryable}`, async () => {
        const apiError = { code, message, retryable };
        vi.spyOn(globalThis, "fetch").mockResolvedValue({
          ok: false,
          status,
          json: () => Promise.resolve(apiError),
        } as Response);

        try {
          await fetchHealth();
          expect.unreachable("Should have thrown");
        } catch (err) {
          expect(err).toBeInstanceOf(ApiClientError);
          const error = err as ApiClientError;
          expect(error.status).toBe(status);
          expect(error.apiError.code).toBe(code);
          expect(error.apiError.retryable).toBe(retryable);
          expect(error.apiError.message).toBe(message);
        }
      });
    }
  });
});

// ─── Health Hook Retry Behavior ────────────────────────

describe("useHealth hook configuration", () => {
  it("displays error state immediately when health check fails (no retry)", () => {
    // useHealth is mocked here, so we cannot verify the actual polling interval.
    // This test verifies that error state is immediately reflected in the banner
    // (consistent with retry: 0 configuration in the real hook).
    mockHealthReturn({
      isLoading: false,
      error: new Error("Network error"),
      isError: true,
    });

    renderWithProviders(<HealthBanner />);
    expect(screen.getByText("Backend unavailable")).toBeInTheDocument();
  });

  it("immediately reflects error state (retry: 0 means no retry delay)", () => {
    // When the health endpoint fails, the error should be immediately visible
    // because retry: 0 means TanStack Query does NOT retry the request.
    mockHealthReturn({
      isLoading: false,
      error: new TypeError("Failed to fetch"),
      isError: true,
      status: "error",
    });

    renderWithProviders(<HealthBanner />);

    // The banner should immediately show the error, not a loading state
    expect(screen.getByText("Backend unavailable")).toBeInTheDocument();
    expect(screen.queryByText("Loading")).not.toBeInTheDocument();
  });
});

// ─── View Degradation During Errors ────────────────────

describe("View degradation during errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ListView error handling", () => {
    it("shows empty 'No issues found' when useIssues returns empty data on error", async () => {
      mockIssuesReturn({
        data: [],
        isLoading: false,
        error: new Error("Backend error"),
        isError: true,
        isSuccess: false,
        status: "error",
      });

      // ListView uses useIssues and defaults to [] if data is undefined
      // When data is empty, it shows the "No issues found" empty state
      const { ListView } = await import("@/views/list-view");
      renderWithProviders(<ListView />);

      expect(screen.getByText("No issues found")).toBeInTheDocument();
    });

    it("shows loading skeleton when isLoading with no data", async () => {
      mockIssuesReturn({
        data: [],
        isLoading: true,
        isSuccess: false,
        status: "pending",
      });

      const { ListView } = await import("@/views/list-view");
      renderWithProviders(<ListView />);

      const skeletons = document.querySelectorAll(".skeleton-shimmer");
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe("BoardView error handling", () => {
    it("shows board skeleton when loading with no data", async () => {
      mockIssuesReturn({
        data: [],
        isLoading: true,
        isSuccess: false,
        status: "pending",
      });

      const { BoardView } = await import("@/views/board-view");
      renderWithProviders(<BoardView />);

      const skeletons = document.querySelectorAll(".skeleton-shimmer");
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it("shows empty columns when useIssues returns empty data on error", async () => {
      mockIssuesReturn({
        data: [],
        isLoading: false,
        error: new Error("Backend error"),
        isError: true,
        isSuccess: false,
        status: "error",
      });

      const { BoardView } = await import("@/views/board-view");
      renderWithProviders(<BoardView />);

      // Board renders columns even when empty; each column shows "No issues"
      const emptyMessages = screen.getAllByText("No issues");
      expect(emptyMessages.length).toBe(5);
    });
  });

  describe("GraphView error handling", () => {
    it("shows loading state when data is loading", async () => {
      mockIssuesReturn({
        data: [],
        isLoading: true,
        isSuccess: false,
        status: "pending",
      });
      vi.mocked(useAllDependencies).mockReturnValue({
        data: [],
        isLoading: true,
        error: null,
        isError: false,
        isFetching: false,
        isPending: true,
        isSuccess: false,
        status: "pending",
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useAllDependencies>);

      const { GraphView } = await import("@/views/graph-view");
      renderWithProviders(<GraphView />);

      expect(
        screen.getByText("Loading dependency graph..."),
      ).toBeInTheDocument();
    });

    it("shows empty state when useIssues returns empty data on error", async () => {
      mockIssuesReturn({
        data: [],
        isLoading: false,
        error: new Error("Backend error"),
        isError: true,
        isSuccess: false,
        status: "error",
      });
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

      const { GraphView } = await import("@/views/graph-view");
      renderWithProviders(<GraphView />);

      expect(
        screen.getByText("No issues match the current filters."),
      ).toBeInTheDocument();
    });
  });

  describe("All views remain functional during degraded health", () => {
    it("HealthBanner shows degraded status without crashing surrounding UI", () => {
      mockHealthReturn({
        isLoading: false,
        data: {
          status: "degraded",
          dolt_server: "stopped",
          uptime_seconds: 10,
          version: "1.0.0",
        },
        isSuccess: true,
      });

      // Render the banner in a wrapper with other content to verify it
      // doesn't break the surrounding DOM
      renderWithProviders(
        <div>
          <HealthBanner />
          <div data-testid="app-content">Application content</div>
        </div>,
      );

      expect(screen.getByText("Database unavailable")).toBeInTheDocument();
      expect(screen.getByTestId("app-content")).toBeInTheDocument();
      expect(screen.getByText("Application content")).toBeInTheDocument();
    });

    it("HealthBanner shows backend-unavailable without crashing surrounding UI", () => {
      mockHealthReturn({
        isLoading: false,
        error: new Error("Connection refused"),
        isError: true,
      });

      renderWithProviders(
        <div>
          <HealthBanner />
          <div data-testid="app-content">Application content</div>
        </div>,
      );

      expect(screen.getByText("Backend unavailable")).toBeInTheDocument();
      expect(screen.getByTestId("app-content")).toBeInTheDocument();
    });
  });
});
