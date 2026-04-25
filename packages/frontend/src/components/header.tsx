import type { ReactNode } from "react";
import { PlusIcon, SearchIcon } from "@/components/ui/icons";
import { useIsEmbeddedMode } from "@/hooks/use-embedded-mode";
import { isMacPlatform } from "@/lib/utils";
import { NotificationBell } from "./notification-bell";

export function Header({
  mobileMenuButton,
  onCreateIssue,
  onSearchIssues,
  onOpenCommands,
}: {
  mobileMenuButton?: ReactNode;
  onCreateIssue?: () => void;
  onSearchIssues?: () => void;
  onOpenCommands?: () => void;
}) {
  const isReadOnly = useIsEmbeddedMode();
  const isMac = isMacPlatform();
  const hintButtonClass =
    "inline-flex items-center gap-1.5 rounded-[var(--radius)] px-1.5 py-1 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  const kbdClass = "rounded border border-border bg-muted px-1.5 py-0.5 text-xs";

  return (
    <header className="flex h-14 items-center bg-surface-raised border-b border-border px-4 gap-2">
      {mobileMenuButton}
      <div className="hidden sm:flex items-center gap-6">
        {onOpenCommands && (
          <button
            type="button"
            onClick={onOpenCommands}
            className={hintButtonClass}
            aria-label="Open command palette"
            data-testid="header-hint-commands"
          >
            <kbd className={kbdClass}>{isMac ? "⌘K" : "Ctrl+K"}</kbd>
            <span>for commands</span>
          </button>
        )}
        {onSearchIssues && (
          <button
            type="button"
            onClick={onSearchIssues}
            className={hintButtonClass}
            aria-label="Open search"
            data-testid="header-hint-search"
          >
            <kbd className={kbdClass}>{isMac ? "⌘F" : "Ctrl+F"}</kbd>
            <span>to search</span>
          </button>
        )}
      </div>
      <div className="ml-auto flex items-center gap-2">
        {onCreateIssue && (
          <button
            type="button"
            onClick={onCreateIssue}
            disabled={isReadOnly}
            aria-label="Create Issue"
            className="inline-flex h-11 sm:h-auto items-center justify-center gap-1.5 rounded-[var(--radius)] bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            data-testid="create-issue-btn"
          >
            <PlusIcon size={16} />
            <span className="hidden sm:inline">Create Issue</span>
          </button>
        )}
        {onSearchIssues && (
          <button
            type="button"
            onClick={onSearchIssues}
            aria-label="Open search"
            className="sm:hidden inline-flex h-11 items-center justify-center rounded-[var(--radius)] border border-border px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            data-testid="search-issues-btn"
          >
            <SearchIcon size={16} />
          </button>
        )}
        <NotificationBell />
      </div>
    </header>
  );
}
