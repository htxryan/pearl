import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { SettingsView } from "./settings-view";

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
    const listbox = screen.getByRole("listbox", { name: "Available themes" });
    const options = within(listbox).getAllByRole("option");
    expect(options).toHaveLength(3);
  });

  it("shows active indicator on the current theme", () => {
    renderSettings();
    const activeOption = screen.getByRole("option", { name: /Dark\+.*active/i });
    expect(activeOption).toHaveAttribute("aria-selected", "true");
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
    const lightOption = screen.getByRole("option", { name: /Light\+/i });
    fireEvent.click(lightOption);
    expect(mockSetTheme).toHaveBeenCalledWith("vscode-light-plus");
  });

  it("calls setTheme when Enter is pressed on a theme card", () => {
    renderSettings();
    const monokaiOption = screen.getByRole("option", { name: /Monokai/i });
    fireEvent.keyDown(monokaiOption, { key: "Enter" });
    expect(mockSetTheme).toHaveBeenCalledWith("vscode-monokai");
  });

  it("calls setTheme when Space is pressed on a theme card", () => {
    renderSettings();
    const monokaiOption = screen.getByRole("option", { name: /Monokai/i });
    fireEvent.keyDown(monokaiOption, { key: " " });
    expect(mockSetTheme).toHaveBeenCalledWith("vscode-monokai");
  });

  it("theme cards are focusable", () => {
    renderSettings();
    const options = screen.getAllByRole("option");
    for (const option of options) {
      expect(option.tagName).toBe("BUTTON");
    }
  });

  it("renders color swatches on each theme card", () => {
    renderSettings();
    // Each card has 5 swatch spans (background, foreground, primary, accent, muted)
    const listbox = screen.getByRole("listbox", { name: "Available themes" });
    const swatches = listbox.querySelectorAll("[aria-hidden='true']");
    expect(swatches).toHaveLength(15); // 3 themes × 5 swatches
  });
});
