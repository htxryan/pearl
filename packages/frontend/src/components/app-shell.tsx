import { Outlet, useNavigate } from "react-router";
import { useMemo, useState, useCallback } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { CommandPalette } from "./command-palette";
import { HealthBanner } from "./health-banner";
import { CreateIssueDialog } from "./detail/create-issue-dialog";
import { useKeyboardScope } from "@/hooks/use-keyboard-scope";
import {
  toggleCommandPalette,
  useCommandPaletteActions,
  type CommandAction,
} from "@/hooks/use-command-palette";

export function AppShell() {
  const navigate = useNavigate();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const openCreateDialog = useCallback(() => setCreateDialogOpen(true), []);

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
    ],
    [navigate, openCreateDialog],
  );

  useCommandPaletteActions("shell", commands);

  return (
    <div className="flex h-screen min-w-[1024px] max-w-[2560px] overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <HealthBanner />
        <Header />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
      <CommandPalette />
      <CreateIssueDialog
        isOpen={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
      />
    </div>
  );
}
