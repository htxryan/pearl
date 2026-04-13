import { Outlet, useNavigate } from "react-router";
import { useMemo, useState, useCallback } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { CommandPalette } from "./command-palette";
import { HealthBanner } from "./health-banner";
import { CreateIssueDialog } from "./detail/create-issue-dialog";
import { ToastContainer } from "./toast-container";
import { useKeyboardScope } from "@/hooks/use-keyboard-scope";
import {
  toggleCommandPalette,
  useCommandPaletteActions,
  type CommandAction,
} from "@/hooks/use-command-palette";
import { undoLast, useCanUndo } from "@/hooks/use-undo";
import { KeyboardHelpOverlay, toggleKeyboardHelp } from "./keyboard-help";
import { PageTransition } from "./page-transition";
import { OnboardingBanner } from "./onboarding";
import { useRouteAnnouncer } from "@/hooks/use-route-announcer";
import { useTheme } from "@/hooks/use-theme";
import { getAllThemes } from "@/themes";

export function AppShell() {
  const navigate = useNavigate();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const openCreateDialog = useCallback(() => setCreateDialogOpen(true), []);
  const canUndo = useCanUndo();
  const { setTheme } = useTheme();

  // Global keyboard shortcuts
  const bindings = useMemo(
    () => [
      {
        key: "k",
        modifiers: ["meta" as const],
        handler: () => toggleCommandPalette(),
        description: "Toggle command palette",
      },
      {
        key: "z",
        modifiers: ["meta" as const],
        handler: () => { undoLast(); },
        description: "Undo last action",
      },
      {
        key: "?",
        modifiers: ["shift" as const],
        handler: () => toggleKeyboardHelp(),
        description: "Show keyboard shortcuts",
      },
      {
        key: "1",
        handler: () => navigate("/list"),
        description: "Go to List view",
      },
      {
        key: "2",
        handler: () => navigate("/board"),
        description: "Go to Board view",
      },
      {
        key: "3",
        handler: () => navigate("/graph"),
        description: "Go to Graph view",
      },
    ],
    [navigate],
  );

  useKeyboardScope("shell", bindings);

  // Register navigation commands in command palette
  const commands: CommandAction[] = useMemo(
    () => [
      {
        id: "nav-list",
        label: "Go to List View",
        shortcut: "1",
        group: "Navigation",
        handler: () => navigate("/list"),
      },
      {
        id: "nav-board",
        label: "Go to Board View",
        shortcut: "2",
        group: "Navigation",
        handler: () => navigate("/board"),
      },
      {
        id: "nav-graph",
        label: "Go to Graph View",
        shortcut: "3",
        group: "Navigation",
        handler: () => navigate("/graph"),
      },
      {
        id: "create-issue",
        label: "Create Issue",
        group: "Actions",
        handler: openCreateDialog,
      },
      {
        id: "keyboard-help",
        label: "Show keyboard shortcuts",
        shortcut: "?",
        group: "Actions",
        handler: () => toggleKeyboardHelp(),
      },
      ...(canUndo
        ? [
            {
              id: "undo-last",
              label: "Undo last action",
              shortcut: "⌘Z",
              group: "Actions",
              handler: () => { undoLast(); },
            },
          ]
        : []),
      ...getAllThemes().map((t) => ({
        id: `theme-${t.id}`,
        label: `Theme: ${t.name}`,
        group: "Themes",
        handler: () => setTheme(t.id),
      })),
    ],
    [navigate, openCreateDialog, canUndo, setTheme],
  );

  useCommandPaletteActions("shell", commands);

  const announcerRef = useRouteAnnouncer();

  return (
    <div className="flex h-screen min-w-[1024px] max-w-[2560px] overflow-hidden bg-background text-foreground">
      {/* Skip to content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:text-sm focus:font-medium focus:shadow-lg"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Skip to content
      </a>
      {/* Route change announcer for screen readers */}
      <div
        ref={announcerRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <HealthBanner />
        <Header />
        <OnboardingBanner />
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-auto outline-none">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>
      <CommandPalette />
      <CreateIssueDialog
        isOpen={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
      />
      <KeyboardHelpOverlay />
      <ToastContainer />
    </div>
  );
}
