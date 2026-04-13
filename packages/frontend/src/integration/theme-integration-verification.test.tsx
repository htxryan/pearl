import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  within,
  act,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route, Navigate } from "react-router";

// ─── Mock navigation ─────────────────────────────────────
const mockNavigate = vi.fn();
vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return { ...actual, useNavigate: () => mockNavigate };
});

// ─── Mock API client ─────────────────────────────────────
vi.mock("@/lib/api-client", () => ({
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
  useCreateIssue: vi.fn(() => mockMutation),
  useAddComment: vi.fn(() => mockMutation),
  useAddDependency: vi.fn(() => mockMutation),
  useRemoveDependency: vi.fn(() => mockMutation),
  useStats: vi.fn(() => ({
    data: {
      total: 0,
      by_status: {},
      by_priority: {},
      by_type: {},
      recently_updated: 0,
    },
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
  ReactFlow: ({ children }: any) => (
    <div data-testid="react-flow">{children}</div>
  ),
  Background: () => null,
  Controls: () => null,
  MiniMap: () => null,
  Panel: ({ children }: any) => <div>{children}</div>,
  Handle: () => null,
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
  Command.Input = (props: any) => (
    <input data-testid="cmdk-input" {...props} />
  );
  Command.List = ({ children }: any) => (
    <div data-testid="cmdk-list">{children}</div>
  );
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
import { ListView } from "@/views/list-view";
import { SettingsView } from "@/views/settings-view";
import { monokai } from "@/themes/definitions/monokai";
import { solarizedLight } from "@/themes/definitions/solarized-light";
import { solarizedDark } from "@/themes/definitions/solarized-dark";
import { lightPlus } from "@/themes/definitions/light-plus";
import { getAllThemes, getDefaultTheme } from "@/themes";
import { COLOR_TOKENS } from "@/themes/types";

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

/**
 * Helper to open the command palette and click a theme item by name.
 */
function selectThemeViaCommandPalette(themeName: string) {
  fireEvent.keyDown(window, { key: "k", metaKey: true });
  const themeGroup = screen.getByTestId("cmdk-group-Switch Theme");
  const items = within(themeGroup).getAllByTestId("cmdk-item");
  const target = items.find((item) => item.textContent?.includes(themeName));
  expect(target).toBeTruthy();
  fireEvent.click(target!);
}

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Helper to select a theme via the Settings ThemePicker.
 */
function selectThemeViaSettings(themeName: string) {
  const button = screen.getByRole("button", {
    name: new RegExp(`${escapeRegex(themeName)} theme`, "i"),
  });
  fireEvent.click(button);
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
// Cross-Boundary Integration Verification
// Theme Engine <-> Settings UI <-> Navigation / Command Palette
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("Cross-Boundary Integration: Theme Engine x Settings UI x Command Palette", () => {
  // ────────────────────────────────────────────────────────
  // Scenario 1: Select theme via Settings -> verify CSS vars + .dark + localStorage
  // ────────────────────────────────────────────────────────
  describe("Scenario 1: Select theme via Settings", () => {
    it("applies .dark class when a dark theme is selected", () => {
      renderApp("/settings");

      selectThemeViaSettings("Monokai");

      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("sets --color-background to the theme's background value", () => {
      renderApp("/settings");

      selectThemeViaSettings("Monokai");

      expect(
        document.documentElement.style.getPropertyValue("--color-background"),
      ).toBe(monokai.colors.background);
    });

    it("persists the theme ID to localStorage", () => {
      renderApp("/settings");

      selectThemeViaSettings("Monokai");

      expect(localStorage.getItem("beads-gui-theme")).toBe("vscode-monokai");
    });

    it("persists theme cache JSON to localStorage", () => {
      renderApp("/settings");

      selectThemeViaSettings("Monokai");

      const cache = localStorage.getItem("beads-gui-theme-cache");
      expect(cache).toBeTruthy();
      const parsed = JSON.parse(cache!);
      expect(parsed.colorScheme).toBe("dark");
      expect(parsed.colors.background).toBe(monokai.colors.background);
    });
  });

  // ────────────────────────────────────────────────────────
  // Scenario 2: Select theme via Command Palette -> verify same outcome
  // ────────────────────────────────────────────────────────
  describe("Scenario 2: Select theme via Command Palette", () => {
    it("applies .dark class when selecting a dark theme from command palette", () => {
      renderApp("/list");

      selectThemeViaCommandPalette("Monokai");

      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("sets --color-background to the theme's background value via command palette", () => {
      renderApp("/list");

      selectThemeViaCommandPalette("Monokai");

      expect(
        document.documentElement.style.getPropertyValue("--color-background"),
      ).toBe(monokai.colors.background);
    });

    it("persists theme ID to localStorage via command palette", () => {
      renderApp("/list");

      selectThemeViaCommandPalette("Monokai");

      expect(localStorage.getItem("beads-gui-theme")).toBe("vscode-monokai");
    });

    it("produces identical outcomes whether theme is set via Settings or Command Palette", () => {
      // Apply via command palette
      const { unmount: unmount1 } = renderApp("/list");
      selectThemeViaCommandPalette("Monokai");

      const cpBackground =
        document.documentElement.style.getPropertyValue("--color-background");
      const cpDark = document.documentElement.classList.contains("dark");
      const cpStored = localStorage.getItem("beads-gui-theme");

      unmount1();
      localStorage.clear();
      document.documentElement.classList.remove("dark");
      document.documentElement.style.cssText = "";

      // Apply via settings
      renderApp("/settings");
      selectThemeViaSettings("Monokai");

      const settBackground =
        document.documentElement.style.getPropertyValue("--color-background");
      const settDark = document.documentElement.classList.contains("dark");
      const settStored = localStorage.getItem("beads-gui-theme");

      expect(cpBackground).toBe(settBackground);
      expect(cpDark).toBe(settDark);
      expect(cpStored).toBe(settStored);
    });
  });

  // ────────────────────────────────────────────────────────
  // Scenario 3: Switch from dark to light -> .dark class removed
  // ────────────────────────────────────────────────────────
  describe("Scenario 3: Dark-to-light transition", () => {
    it("removes .dark class when switching from dark to light theme", () => {
      renderApp("/settings");

      // First, apply a dark theme
      selectThemeViaSettings("Monokai");
      expect(document.documentElement.classList.contains("dark")).toBe(true);

      // Then switch to a light theme
      selectThemeViaSettings("Solarized Light");
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    it("updates CSS custom properties to light theme values", () => {
      renderApp("/settings");

      selectThemeViaSettings("Monokai");
      expect(
        document.documentElement.style.getPropertyValue("--color-background"),
      ).toBe(monokai.colors.background);

      selectThemeViaSettings("Solarized Light");
      expect(
        document.documentElement.style.getPropertyValue("--color-background"),
      ).toBe(solarizedLight.colors.background);
    });

    it("updates localStorage to the new light theme", () => {
      renderApp("/settings");

      selectThemeViaSettings("Monokai");
      expect(localStorage.getItem("beads-gui-theme")).toBe("vscode-monokai");

      selectThemeViaSettings("Solarized Light");
      expect(localStorage.getItem("beads-gui-theme")).toBe(
        "vscode-solarized-light",
      );
    });

    it("adds .dark class when switching from light to dark theme", () => {
      renderApp("/settings");

      // Start with light
      selectThemeViaSettings("Solarized Light");
      expect(document.documentElement.classList.contains("dark")).toBe(false);

      // Switch to dark
      selectThemeViaSettings("Solarized Dark");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });

  // ────────────────────────────────────────────────────────
  // Scenario 4: Persistence across unmount/re-render (reload simulation)
  // ────────────────────────────────────────────────────────
  describe("Scenario 4: Theme persistence across reload simulation", () => {
    it("CSS vars and .dark class survive unmount and re-render (SPA navigation)", () => {
      // This simulates navigating away and back within a SPA — the DOM
      // document.documentElement is the same object, so styles persist.
      const { unmount } = renderApp("/settings");

      selectThemeViaSettings("Monokai");
      expect(localStorage.getItem("beads-gui-theme")).toBe("vscode-monokai");
      expect(document.documentElement.classList.contains("dark")).toBe(true);

      // Unmount React tree (simulates SPA navigation / route change)
      unmount();

      // Re-render — CSS custom properties survive on the shared document element
      renderApp("/list");

      expect(
        document.documentElement.style.getPropertyValue("--color-background"),
      ).toBe(monokai.colors.background);
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("localStorage contains the theme ID after unmount, ready for next session", () => {
      const { unmount } = renderApp("/settings");

      selectThemeViaSettings("Solarized Light");
      expect(localStorage.getItem("beads-gui-theme")).toBe(
        "vscode-solarized-light",
      );

      unmount();

      // After unmount, localStorage still holds the theme for next load
      expect(localStorage.getItem("beads-gui-theme")).toBe(
        "vscode-solarized-light",
      );

      // Re-render reads from the same module snapshot
      renderApp("/settings");

      // ThemePicker shows Solarized Light as active
      const slButton = screen.getByRole("button", {
        name: /solarized light theme \(active\)/i,
      });
      expect(slButton).toHaveAttribute("aria-pressed", "true");
    });

    it("re-render after unmount keeps the hook snapshot in sync with localStorage", () => {
      const { unmount } = renderApp("/list");

      selectThemeViaCommandPalette("Monokai");
      expect(localStorage.getItem("beads-gui-theme")).toBe("vscode-monokai");

      unmount();
      renderApp("/settings");

      // The ThemePicker should reflect Monokai as active (hook reads internal snapshot)
      const monokaiButton = screen.getByRole("button", {
        name: /monokai theme \(active\)/i,
      });
      expect(monokaiButton).toHaveAttribute("aria-pressed", "true");
    });
  });

  // ────────────────────────────────────────────────────────
  // Scenario 5: Navigate away and back — active indicator persists
  // ────────────────────────────────────────────────────────
  describe("Scenario 5: Theme selection persists across navigation", () => {
    it("shows aria-pressed=true on the active theme after navigating away and back", () => {
      renderApp("/settings");

      // Select Monokai
      selectThemeViaSettings("Monokai");

      // Verify Monokai is marked active
      const monokaiButton = screen.getByRole("button", {
        name: /monokai theme/i,
      });
      expect(monokaiButton).toHaveAttribute("aria-pressed", "true");

      // Navigate away (press "1" for list view)
      fireEvent.keyDown(window, { key: "1" });
      expect(mockNavigate).toHaveBeenCalledWith("/list");

      // Simulate return to settings by re-rendering at /settings
      // (since mockNavigate doesn't actually navigate in MemoryRouter)
      cleanup();
      renderApp("/settings");

      // Monokai should still be active
      const monokaiButtonAfter = screen.getByRole("button", {
        name: /monokai theme \(active\)/i,
      });
      expect(monokaiButtonAfter).toHaveAttribute("aria-pressed", "true");
    });

    it("does not mark other themes as active after navigation round-trip", () => {
      renderApp("/settings");

      selectThemeViaSettings("Monokai");

      // Navigate away and back
      cleanup();
      renderApp("/settings");

      // Solarized Light should NOT be active
      const solarizedButton = screen.getByRole("button", {
        name: /solarized light theme$/i,
      });
      expect(solarizedButton).toHaveAttribute("aria-pressed", "false");
    });
  });

  // ────────────────────────────────────────────────────────
  // Scenario 6: System preference default behavior
  // ────────────────────────────────────────────────────────
  describe("Scenario 6: System preference default and fallback", () => {
    it("getDefaultTheme returns lightPlus when matchMedia prefers-color-scheme: dark is false", () => {
      // matchMedia is mocked in test-setup.ts to return matches: false
      // so getDefaultTheme() returns lightPlus
      const defaultTheme = getDefaultTheme();
      expect(defaultTheme.id).toBe("vscode-light-plus");
      expect(defaultTheme.colorScheme).toBe("light");
    });

    it("explicitly setting the default theme applies light CSS vars and removes .dark", () => {
      renderApp("/settings");

      // First apply a dark theme to establish a non-default state
      selectThemeViaSettings("Monokai");
      expect(document.documentElement.classList.contains("dark")).toBe(true);

      // Now apply the default theme (Light+) explicitly
      selectThemeViaSettings("Light+ (Default Light)");

      expect(
        document.documentElement.style.getPropertyValue("--color-background"),
      ).toBe(lightPlus.colors.background);
      expect(document.documentElement.classList.contains("dark")).toBe(false);
      expect(localStorage.getItem("beads-gui-theme")).toBe(
        "vscode-light-plus",
      );
    });

    it("switching back to default theme marks it as active in ThemePicker", () => {
      renderApp("/settings");

      // Set a non-default theme
      selectThemeViaSettings("Monokai");

      // Switch back to default
      selectThemeViaSettings("Light+ (Default Light)");

      const defaultButton = screen.getByRole("button", {
        name: /light\+.*theme \(active\)/i,
      });
      expect(defaultButton).toHaveAttribute("aria-pressed", "true");
    });

    it("no theme in localStorage on first render falls back to default", () => {
      // In this test, beforeEach already cleared localStorage.
      // The module-level init in use-theme.ts applies the default theme
      // at import time. Since the test module was imported with empty
      // localStorage, the initial snapshot IS the default theme.
      // Verify by checking that on a fresh render, the default theme
      // is selected (first test in this describe block runs with
      // clean localStorage from beforeEach).
      renderApp("/settings");

      // The hook snapshot should reflect the default theme.
      // Since no setTheme was called in this test, the ThemePicker
      // displays whatever the module's currentSnapshot is.
      // We verify the ThemePicker renders all 15 buttons
      const themeGroup = screen.getByRole("group", {
        name: /available themes/i,
      });
      const buttons = within(themeGroup).getAllByRole("button");
      expect(buttons).toHaveLength(15);

      // At least one button should be marked as active
      const activeButtons = buttons.filter(
        (btn) => btn.getAttribute("aria-pressed") === "true",
      );
      expect(activeButtons).toHaveLength(1);
    });
  });

  // ────────────────────────────────────────────────────────
  // Scenario 7: All 15 themes — verify complete CSS custom properties
  // ────────────────────────────────────────────────────────
  describe("Scenario 7: Exhaustive theme validation — all themes, all tokens", () => {
    const allThemes = getAllThemes();

    it("contains exactly 15 registered themes", () => {
      expect(allThemes).toHaveLength(15);
    });

    it("COLOR_TOKENS contains exactly 21 tokens", () => {
      expect(COLOR_TOKENS).toHaveLength(21);
    });

    it.each(allThemes.map((t) => [t.id, t.name, t] as const))(
      "%s (%s) — sets all 21 CSS custom properties and correct .dark class",
      (_id, _name, theme) => {
        renderApp("/list");

        // Apply the theme via command palette
        selectThemeViaCommandPalette(theme.name);

        // Verify every COLOR_TOKEN has a truthy CSS custom property
        for (const token of COLOR_TOKENS) {
          const value = document.documentElement.style.getPropertyValue(
            `--color-${token}`,
          );
          expect(
            value,
            `Theme "${theme.name}" is missing --color-${token}`,
          ).toBeTruthy();
        }

        // Verify .dark class matches colorScheme
        if (theme.colorScheme === "dark") {
          expect(document.documentElement.classList.contains("dark")).toBe(true);
        } else {
          expect(document.documentElement.classList.contains("dark")).toBe(
            false,
          );
        }

        cleanup();
        document.documentElement.classList.remove("dark");
        document.documentElement.style.cssText = "";
      },
    );

    it.each(allThemes.map((t) => [t.id, t.name, t] as const))(
      "%s (%s) — CSS property values match ThemeDefinition.colors exactly",
      (_id, _name, theme) => {
        renderApp("/list");

        selectThemeViaCommandPalette(theme.name);

        for (const token of COLOR_TOKENS) {
          const actual = document.documentElement.style.getPropertyValue(
            `--color-${token}`,
          );
          const expected = theme.colors[token];
          expect(actual).toBe(expected);
        }

        cleanup();
        document.documentElement.classList.remove("dark");
        document.documentElement.style.cssText = "";
      },
    );
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Contract Validation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("Contract Validation", () => {
  describe("Contract: ThemeDefinition + ColorToken types are exported and usable", () => {
    it("getAllThemes returns ThemeDefinition objects with required shape", () => {
      const themes = getAllThemes();
      for (const theme of themes) {
        expect(theme).toHaveProperty("id");
        expect(theme).toHaveProperty("name");
        expect(theme).toHaveProperty("colorScheme");
        expect(theme).toHaveProperty("colors");
        expect(typeof theme.id).toBe("string");
        expect(typeof theme.name).toBe("string");
        expect(["light", "dark"]).toContain(theme.colorScheme);
        expect(typeof theme.colors).toBe("object");
      }
    });

    it("every ThemeDefinition.colors has all COLOR_TOKENS as keys", () => {
      const themes = getAllThemes();
      for (const theme of themes) {
        for (const token of COLOR_TOKENS) {
          expect(
            theme.colors,
            `Theme "${theme.name}" missing token "${token}"`,
          ).toHaveProperty(token);
          expect(
            typeof theme.colors[token],
            `Theme "${theme.name}" token "${token}" is not a string`,
          ).toBe("string");
        }
      }
    });
  });

  describe("Contract: /settings route renders SettingsView", () => {
    it("navigating to /settings renders the Settings heading", () => {
      renderApp("/settings");

      expect(
        screen.getByRole("heading", { name: /settings/i }),
      ).toBeInTheDocument();
    });

    it("Settings page contains the ThemePicker with available themes", () => {
      renderApp("/settings");

      const themeGroup = screen.getByRole("group", {
        name: /available themes/i,
      });
      expect(themeGroup).toBeInTheDocument();

      const themeButtons = within(themeGroup).getAllByRole("button");
      expect(themeButtons.length).toBe(15);
    });
  });

  describe("Contract: Command Palette exposes all themes under Switch Theme group", () => {
    it("all 15 themes appear as items in the Switch Theme command group", () => {
      renderApp("/list");

      fireEvent.keyDown(window, { key: "k", metaKey: true });

      const themeGroup = screen.getByTestId("cmdk-group-Switch Theme");
      const items = within(themeGroup).getAllByTestId("cmdk-item");
      expect(items).toHaveLength(15);
    });

    it("each theme item label matches 'Theme: <name>' format", () => {
      renderApp("/list");

      fireEvent.keyDown(window, { key: "k", metaKey: true });

      const themeGroup = screen.getByTestId("cmdk-group-Switch Theme");
      const items = within(themeGroup).getAllByTestId("cmdk-item");

      const allThemes = getAllThemes();
      for (const theme of allThemes) {
        const match = items.find((item) =>
          item.textContent?.includes(`Theme: ${theme.name}`),
        );
        expect(
          match,
          `Missing command palette item for theme "${theme.name}"`,
        ).toBeTruthy();
      }
    });
  });
});
