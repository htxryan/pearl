import { useCallback, useMemo, useState } from "react";
import { Outlet, useNavigate } from "react-router";
import {
  type CommandAction,
  toggleCommandPalette,
  toggleSearchPalette,
  useCommandPaletteActions,
} from "@/hooks/use-command-palette";
import { EmbeddedModeProvider, useEmbeddedModeDetection } from "@/hooks/use-embedded-mode";
import { useKeyboardScope } from "@/hooks/use-keyboard-scope";
import { useNotificationPoller } from "@/hooks/use-notifications";
import { useRouteAnnouncer } from "@/hooks/use-route-announcer";
import { useTheme } from "@/hooks/use-theme";
import { undoLast, useCanUndo } from "@/hooks/use-undo";
import { getAllThemes } from "@/themes";
import { CommandPalette } from "./command-palette";
import { CreateIssueDialog } from "./detail/create-issue-dialog";
import { EmbeddedModeModal } from "./embedded-mode-modal";
import { Header } from "./header";
import { HealthBanner } from "./health-banner";
import { KeyboardHelpOverlay, toggleKeyboardHelp } from "./keyboard-help";
import { OnboardingBanner } from "./onboarding";
import { PageTransition } from "./page-transition";
import { SearchPalette } from "./search-palette";
import { MobileDrawer, MobileMenuButton, Sidebar, toggleSidebar } from "./sidebar";
import { ToastContainer } from "./toast-container";

export function AppShell() {
  const navigate = useNavigate();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const openCreateDialog = useCallback(() => setCreateDialogOpen(true), []);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const canUndo = useCanUndo();
  const { setTheme } = useTheme();
  const { isEmbedded, showModal } = useEmbeddedModeDetection();

  useNotificationPoller();

  const bindings = useMemo(
    () => [
      {
        key: "k",
        modifiers: ["meta" as const],
        handler: () => toggleCommandPalette(),
        description: "Toggle command palette",
      },
      {
        key: "f",
        modifiers: ["meta" as const],
        handler: () => toggleSearchPalette(),
        description: "Toggle issue search",
        skipInInput: true,
      },
      {
        key: "z",
        modifiers: ["meta" as const],
        handler: () => {
          undoLast();
        },
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
      {
        key: "4",
        handler: () => navigate("/settings"),
        description: "Go to Settings",
      },
      {
        key: "[",
        handler: () => toggleSidebar(),
        description: "Toggle sidebar",
      },
    ],
    [navigate],
  );

  useKeyboardScope("shell", bindings);

  const commands: CommandAction[] = useMemo(
    () => [
      {
        id: "search-issues",
        label: "Search Issues",
        shortcut: "⌘F",
        group: "Actions",
        handler: () => toggleSearchPalette(),
      },
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
        id: "nav-settings",
        label: "Go to Settings",
        shortcut: "4",
        group: "Navigation",
        handler: () => navigate("/settings"),
      },
      {
        id: "create-issue",
        label: "Create Issue",
        group: "Actions",
        handler: openCreateDialog,
      },
      {
        id: "toggle-sidebar",
        label: "Toggle sidebar",
        shortcut: "[",
        group: "Actions",
        handler: () => toggleSidebar(),
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
              handler: () => {
                undoLast();
              },
            },
          ]
        : []),
      ...getAllThemes().map((t) => ({
        id: `theme-${t.id}`,
        label: `Theme: ${t.name}`,
        group: "Switch Theme",
        handler: () => setTheme(t.id),
      })),
    ],
    [navigate, openCreateDialog, canUndo, setTheme],
  );

  useCommandPaletteActions("shell", commands);

  const announcerRef = useRouteAnnouncer();

  return (
    <EmbeddedModeProvider value={isEmbedded}>
      <div className="flex h-screen max-w-[2560px] overflow-hidden bg-background text-foreground">
        {showModal && <EmbeddedModeModal />}
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
        <div
          ref={announcerRef}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        />
        <Sidebar />
        <MobileDrawer isOpen={mobileDrawerOpen} onClose={() => setMobileDrawerOpen(false)} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <HealthBanner />
          <Header
            mobileMenuButton={<MobileMenuButton onClick={() => setMobileDrawerOpen(true)} />}
            onCreateIssue={openCreateDialog}
            onSearchIssues={() => toggleSearchPalette()}
          />
          <OnboardingBanner />
          <main id="main-content" tabIndex={-1} className="flex-1 overflow-auto outline-none">
            <PageTransition>
              <Outlet />
            </PageTransition>
          </main>
        </div>
        <CommandPalette />
        <SearchPalette />
        <CreateIssueDialog isOpen={createDialogOpen} onClose={() => setCreateDialogOpen(false)} />
        <KeyboardHelpOverlay />
        <ToastContainer />
      </div>
    </EmbeddedModeProvider>
  );
}
