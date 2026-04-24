import { DEFAULT_SETTINGS } from "@pearl/shared";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Navigate, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AppearanceSettingsTab,
  AttachmentsSettingsTab,
  NotificationsSettingsTab,
  SettingsView,
} from "./settings-view";

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

function renderSettings(initialPath = "/settings/appearance") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/settings" element={<SettingsView />}>
          <Route index element={<Navigate to="/settings/appearance" replace />} />
          <Route path="appearance" element={<AppearanceSettingsTab />} />
          <Route path="attachments" element={<AttachmentsSettingsTab />} />
          <Route path="notifications" element={<NotificationsSettingsTab />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("SettingsView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("layout and tab sidebar", () => {
    it("renders the Settings heading", () => {
      renderSettings();
      expect(screen.getByRole("heading", { name: "Settings", level: 1 })).toBeInTheDocument();
    });

    it("renders a sidebar nav with Appearance, Attachments, and Notifications links", () => {
      renderSettings();
      const nav = screen.getByRole("navigation", { name: /settings sections/i });
      expect(within(nav).getByRole("link", { name: "Appearance" })).toBeInTheDocument();
      expect(within(nav).getByRole("link", { name: "Attachments" })).toBeInTheDocument();
      expect(within(nav).getByRole("link", { name: "Notifications" })).toBeInTheDocument();
    });

    it("links point to nested tab routes", () => {
      renderSettings();
      const nav = screen.getByRole("navigation", { name: /settings sections/i });
      expect(within(nav).getByRole("link", { name: "Appearance" })).toHaveAttribute(
        "href",
        "/settings/appearance",
      );
      expect(within(nav).getByRole("link", { name: "Attachments" })).toHaveAttribute(
        "href",
        "/settings/attachments",
      );
      expect(within(nav).getByRole("link", { name: "Notifications" })).toHaveAttribute(
        "href",
        "/settings/notifications",
      );
    });

    it("redirects /settings to /settings/appearance (index route)", () => {
      renderSettings("/settings");
      expect(screen.getByRole("heading", { name: "Appearance", level: 2 })).toBeInTheDocument();
    });
  });

  describe("Appearance tab", () => {
    it("renders the Appearance section with description", () => {
      renderSettings("/settings/appearance");
      expect(screen.getByRole("heading", { name: "Appearance", level: 2 })).toBeInTheDocument();
      expect(screen.getByText(/choose a theme/i)).toBeInTheDocument();
    });

    it("renders the theme picker with all themes", () => {
      renderSettings("/settings/appearance");
      const group = screen.getByRole("group", { name: "Available themes" });
      const buttons = within(group).getAllByRole("button");
      expect(buttons).toHaveLength(3);
    });

    it("shows active indicator on the current theme", () => {
      renderSettings("/settings/appearance");
      const activeButton = screen.getByRole("button", { name: /Dark\+.*active/i });
      expect(activeButton).toHaveAttribute("aria-pressed", "true");
    });

    it("shows theme names and color scheme labels", () => {
      renderSettings("/settings/appearance");
      expect(screen.getByText("Dark+ (Default Dark)")).toBeInTheDocument();
      expect(screen.getByText("Light+ (Default Light)")).toBeInTheDocument();
      expect(screen.getByText("Monokai")).toBeInTheDocument();
      const darkLabels = screen.getAllByText("dark");
      expect(darkLabels.length).toBe(2);
      expect(screen.getByText("light")).toBeInTheDocument();
    });

    it("calls setTheme when a theme card is clicked", () => {
      renderSettings("/settings/appearance");
      const lightButton = screen.getByRole("button", { name: /Light\+/i });
      fireEvent.click(lightButton);
      expect(mockSetTheme).toHaveBeenCalledWith("vscode-light-plus");
    });

    it("theme cards are focusable buttons", () => {
      renderSettings("/settings/appearance");
      const group = screen.getByRole("group", { name: "Available themes" });
      const buttons = within(group).getAllByRole("button");
      for (const button of buttons) {
        expect(button.tagName).toBe("BUTTON");
      }
    });

    it("renders color swatches on each theme card", () => {
      renderSettings("/settings/appearance");
      const group = screen.getByRole("group", { name: "Available themes" });
      const swatches = group.querySelectorAll("[aria-hidden='true']");
      expect(swatches).toHaveLength(15);
    });

    it("does not render the Attachments tab content", () => {
      renderSettings("/settings/appearance");
      expect(
        screen.queryByRole("heading", { name: "Attachments", level: 2 }),
      ).not.toBeInTheDocument();
    });
  });

  describe("Attachments tab", () => {
    it("renders the Attachments section", () => {
      renderSettings("/settings/attachments");
      expect(screen.getByRole("heading", { name: "Attachments", level: 2 })).toBeInTheDocument();
      expect(screen.getByText(/configure how image attachments/i)).toBeInTheDocument();
    });

    it("renders storage mode radio buttons", () => {
      renderSettings("/settings/attachments");
      expect(screen.getByLabelText(/inline/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/local filesystem/i)).toBeInTheDocument();
    });

    it("shows warning banner when storageMode is local", () => {
      renderSettings("/settings/attachments");
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText(/not collaborative/i)).toBeInTheDocument();
    });

    it("shows local scope selector when mode is local", () => {
      renderSettings("/settings/attachments");
      expect(screen.getByText(/project scope/i)).toBeInTheDocument();
      expect(screen.getByText(/user scope/i)).toBeInTheDocument();
    });

    it("shows encoding policy fields", () => {
      renderSettings("/settings/attachments");
      expect(screen.getByLabelText(/maximum file size/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/maximum dimension/i)).toBeInTheDocument();
      expect(screen.getByText("WebP")).toBeInTheDocument();
      expect(screen.getByText(/always enabled/i)).toBeInTheDocument();
    });

    it("renders save and reset buttons", () => {
      renderSettings("/settings/attachments");
      expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /reset to defaults/i })).toBeInTheDocument();
    });

    it("hides local-only controls when mode is inline", () => {
      renderSettings("/settings/attachments");
      const inlineRadio = screen.getByLabelText(/inline/i);
      fireEvent.click(inlineRadio);
      expect(screen.queryByText(/project scope/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/user scope/i)).not.toBeInTheDocument();
    });

    it("does not render the Appearance tab content", () => {
      renderSettings("/settings/attachments");
      expect(screen.queryByRole("group", { name: "Available themes" })).not.toBeInTheDocument();
    });
  });

  describe("Notifications tab", () => {
    it("renders the Notifications section", () => {
      renderSettings("/settings/notifications");
      expect(screen.getByRole("heading", { name: "Notifications", level: 2 })).toBeInTheDocument();
    });

    it("does not render the Attachments tab content", () => {
      renderSettings("/settings/notifications");
      expect(
        screen.queryByRole("heading", { name: "Attachments", level: 2 }),
      ).not.toBeInTheDocument();
    });
  });
});
