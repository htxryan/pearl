import type { ReactNode } from "react";
import { useIsEmbeddedMode } from "@/hooks/use-embedded-mode";
import { isMacPlatform } from "@/lib/utils";
import { NotificationBell } from "./notification-bell";

function PlusIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="8" y1="3" x2="8" y2="13" />
      <line x1="3" y1="8" x2="13" y2="8" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export function Header({
  mobileMenuButton,
  onCreateIssue,
  onSearchIssues,
}: {
  mobileMenuButton?: ReactNode;
  onCreateIssue?: () => void;
  onSearchIssues?: () => void;
}) {
  const isReadOnly = useIsEmbeddedMode();
  const isMac = isMacPlatform();

  return (
    <header className="flex h-14 items-center bg-surface-raised border-b border-border px-4 gap-2">
      {mobileMenuButton}
      <span className="text-sm text-muted-foreground hidden sm:inline">
        Press{" "}
        <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs">
          {isMac ? "⌘K" : "Ctrl+K"}
        </kbd>{" "}
        for commands{" "}
        <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs">
          {isMac ? "⌘F" : "Ctrl+F"}
        </kbd>{" "}
        to search
      </span>
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
            <PlusIcon />
            <span className="hidden sm:inline">Create Issue</span>
          </button>
        )}
        {onSearchIssues && (
          <button
            type="button"
            onClick={onSearchIssues}
            aria-label="Open search"
            className="inline-flex h-11 sm:h-auto items-center justify-center rounded-[var(--radius)] border border-border px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            data-testid="search-issues-btn"
          >
            <SearchIcon />
          </button>
        )}
        <NotificationBell />
      </div>
    </header>
  );
}
