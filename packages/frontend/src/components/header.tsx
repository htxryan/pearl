import type { ReactNode } from "react";
import { useIsEmbeddedMode } from "@/hooks/use-embedded-mode";
import { NotificationBell } from "./notification-bell";

function isMacPlatform(): boolean {
  const platform = (navigator as any).userAgentData?.platform ?? navigator.userAgent;
  return /mac/i.test(platform);
}

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

export function Header({
  mobileMenuButton,
  onCreateIssue,
}: {
  mobileMenuButton?: ReactNode;
  onCreateIssue?: () => void;
}) {
  const isReadOnly = useIsEmbeddedMode();

  return (
    <header className="flex h-14 items-center bg-surface-raised border-b border-border px-4 gap-2">
      {mobileMenuButton}
      {onCreateIssue && (
        <button
          type="button"
          onClick={onCreateIssue}
          disabled={isReadOnly}
          className="inline-flex items-center gap-1.5 rounded-[var(--radius)] bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          data-testid="create-issue-btn"
        >
          <PlusIcon />
          <span className="hidden sm:inline">Create Issue</span>
        </button>
      )}
      <span className="text-sm text-muted-foreground hidden sm:inline">
        Press{" "}
        <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs">
          {isMacPlatform() ? "⌘K" : "Ctrl+K"}
        </kbd>{" "}
        for command palette
      </span>
      <div className="ml-auto">
        <NotificationBell />
      </div>
    </header>
  );
}
