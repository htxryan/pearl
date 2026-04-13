import type { ReactNode } from "react";

function isMacPlatform(): boolean {
  // navigator.userAgentData is the modern API; fall back to userAgent
  const platform = (navigator as any).userAgentData?.platform ?? navigator.userAgent;
  return /mac/i.test(platform);
}

export function Header({ mobileMenuButton }: { mobileMenuButton?: ReactNode }) {
  return (
    <header className="flex h-14 items-center bg-muted/30 px-4 gap-2">
      {mobileMenuButton}
      <span className="text-sm text-muted-foreground hidden sm:inline">
        Press{" "}
        <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs">
          {isMacPlatform() ? "⌘K" : "Ctrl+K"}
        </kbd>{" "}
        for command palette
      </span>
      {/* On mobile, show a shorter label */}
      <span className="text-sm text-muted-foreground sm:hidden">
        <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs">
          {isMacPlatform() ? "⌘K" : "Ctrl+K"}
        </kbd>
      </span>
    </header>
  );
}
