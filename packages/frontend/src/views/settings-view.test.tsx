import { DEFAULT_SETTINGS } from "@pearl/shared";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsView } from "./settings-view";

// Mock useSettings hook
const mockMutate = vi.fn();
vi.mock("@/hooks/use-settings", () => ({
  useSettings: () => ({
    data: DEFAULT_SETTINGS,
    isLoading: false,
  }),
  useUpdateSettings: () => ({
    mutate: mockMutate,
    isPending: false,
    isError: false,
    isSuccess: false,
  }),
}));

// Mock useTheme hook
const mockSetTheme = vi.fn();
vi.mock("@/hooks/use-theme", () => ({
  useTheme: () => ({
    themeId: "vscode-dark-plus",
    theme: {
      id: "vscode-dark-plus",
      name: "Dark+ (Default Dark)",
      colorScheme: "dark",
      colors: {
        background: "#1e1e1e",
        foreground: "#d4d4d4",
        primary: "#569cd6",
        accent: "#264f78",
        muted: "#2d2d2d",
      },
    },
    setTheme: mockSetTheme,
  }),
}));

// Mock getAllThemes
vi.mock("@/themes", () => ({
  getAllThemes: () => [
    {
      id: "vscode-dark-plus",
      name: "Dark+ (Default Dark)",
      colorScheme: "dark",
      colors: {
        background: "#1e1e1e",
        foreground: "#d4d4d4",
        primary: "#569cd6",
        accent: "#264f78",
        muted: "#2d2d2d",
      },
    },
    {
      id: "vscode-light-plus",
      name: "Light+ (Default Light)",
      colorScheme: "light",
      colors: {
        background: "#ffffff",
        foreground: "#000000",
        primary: "#0078d4",
        accent: "#f0f0f0",
        muted: "#e0e0e0",
      },
    },
    {
      id: "vscode-monokai",
      name: "Monokai",
      colorScheme: "dark",
      colors: {
        background: "#272822",
        foreground: "#f8f8f2",
        primary: "#a6e22e",
        accent: "#49483e",
        muted: "#3e3d32",
      },
    },
  ],
}));

function renderSettings() {
  return render(
    <MemoryRouter initialEntries={["/settings"]}>
      <SettingsView />
    </MemoryRouter>,
  );
}

describe("SettingsView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the Settings heading", () => {
    renderSettings();
    expect(screen.getByRole("heading", { name: "Settings", level: 1 })).toBeInTheDocument();
  });

  it("renders the Appearance section with description", () => {
    renderSettings();
    expect(screen.getByRole("heading", { name: "Appearance", level: 2 })).toBeInTheDocument();
    expect(screen.getByText(/choose a theme/i)).toBeInTheDocument();
  });

  it("renders the theme picker with all themes", () => {
    renderSettings();
    const group = screen.getByRole("group", { name: "Available themes" });
    const buttons = within(group).getAllByRole("button");
    expect(buttons).toHaveLength(3);
  });

  it("shows active indicator on the current theme", () => {
    renderSettings();
    const activeButton = screen.getByRole("button", { name: /Dark\+.*active/i });
    expect(activeButton).toHaveAttribute("aria-pressed", "true");
  });

  it("shows theme names and color scheme labels", () => {
    renderSettings();
    expect(screen.getByText("Dark+ (Default Dark)")).toBeInTheDocument();
    expect(screen.getByText("Light+ (Default Light)")).toBeInTheDocument();
    expect(screen.getByText("Monokai")).toBeInTheDocument();
    // Color scheme labels
    const darkLabels = screen.getAllByText("dark");
    expect(darkLabels.length).toBe(2); // Dark+ and Monokai
    expect(screen.getByText("light")).toBeInTheDocument();
  });

  it("calls setTheme when a theme card is clicked", () => {
    renderSettings();
    const lightButton = screen.getByRole("button", { name: /Light\+/i });
    fireEvent.click(lightButton);
    expect(mockSetTheme).toHaveBeenCalledWith("vscode-light-plus");
  });

  it("theme cards are focusable buttons", () => {
    renderSettings();
    const group = screen.getByRole("group", { name: "Available themes" });
    const buttons = within(group).getAllByRole("button");
    for (const button of buttons) {
      expect(button.tagName).toBe("BUTTON");
    }
  });

  it("renders color swatches on each theme card", () => {
    renderSettings();
    // Each card has 5 swatch spans (background, foreground, primary, accent, muted)
    const group = screen.getByRole("group", { name: "Available themes" });
    const swatches = group.querySelectorAll("[aria-hidden='true']");
    expect(swatches).toHaveLength(15); // 3 themes × 5 swatches
  });

  // ─── Attachment Settings Tests ──────────────────────────────
  it("renders the Attachments section", () => {
    renderSettings();
    expect(screen.getByRole("heading", { name: "Attachments", level: 2 })).toBeInTheDocument();
    expect(screen.getByText(/configure how image attachments/i)).toBeInTheDocument();
  });

  it("renders storage mode radio buttons", () => {
    renderSettings();
    const inlineRadio = screen.getByLabelText(/inline/i);
    const localRadio = screen.getByLabelText(/local filesystem/i);
    expect(inlineRadio).toBeInTheDocument();
    expect(localRadio).toBeInTheDocument();
  });

  it("shows warning banner when storageMode is local", () => {
    renderSettings();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/not collaborative/i)).toBeInTheDocument();
  });

  it("shows local scope selector when mode is local", () => {
    renderSettings();
    expect(screen.getByText(/project scope/i)).toBeInTheDocument();
    expect(screen.getByText(/user scope/i)).toBeInTheDocument();
  });

  it("shows encoding policy fields", () => {
    renderSettings();
    expect(screen.getByLabelText(/maximum file size/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/maximum dimension/i)).toBeInTheDocument();
    expect(screen.getByText("WebP")).toBeInTheDocument();
    expect(screen.getByText(/always enabled/i)).toBeInTheDocument();
  });

  it("renders save and reset buttons", () => {
    renderSettings();
    expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reset to defaults/i })).toBeInTheDocument();
  });

  it("hides local-only controls when mode is inline", () => {
    renderSettings();
    const inlineRadio = screen.getByLabelText(/inline/i);
    fireEvent.click(inlineRadio);
    expect(screen.queryByText(/project scope/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/user scope/i)).not.toBeInTheDocument();
  });
});
