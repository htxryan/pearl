import type { ReactNode } from "react";
import { NotificationBell } from "./notification-bell";

function isMacPlatform(): boolean {
  // navigator.userAgentData is the modern API; fall back to userAgent
  const platform = (navigator as any).userAgentData?.platform ?? navigator.userAgent;
  return /mac/i.test(platform);
}

export function Header({ mobileMenuButton }: { mobileMenuButton?: ReactNode }) {
  return (
    <header className="flex h-14 items-center bg-surface-raised border-b border-border px-4 gap-2">
      {mobileMenuButton}
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
