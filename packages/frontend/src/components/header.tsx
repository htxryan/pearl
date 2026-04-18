import type { ReactNode } from "react";
import { useIsEmbeddedMode } from "@/hooks/use-embedded-mode";
import { useSyncReplica } from "@/hooks/use-issues";
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

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M1.5 1.5v4h4" />
      <path d="M2.3 9.5a5.5 5.5 0 1 0 1.2-4L1.5 5.5" />
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
  const syncMutation = useSyncReplica();
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
      <button
        type="button"
        onClick={() => syncMutation.mutate()}
        disabled={syncMutation.isPending || isReadOnly}
        title="Sync from primary database"
        className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-border bg-surface-raised px-2.5 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <RefreshIcon className={syncMutation.isPending ? "animate-spin" : undefined} />
        <span className="hidden sm:inline">Sync</span>
      </button>
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
