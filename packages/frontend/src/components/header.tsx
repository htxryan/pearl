function isMacPlatform(): boolean {
  // navigator.userAgentData is the modern API; fall back to userAgent
  const platform = (navigator as any).userAgentData?.platform ?? navigator.userAgent;
  return /mac/i.test(platform);
}

export function Header() {
  return (
    <header className="flex h-14 items-center bg-muted/30 px-4">
      <span className="text-sm text-muted-foreground">
        Press{" "}
        <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs">
          {isMacPlatform() ? "⌘K" : "Ctrl+K"}
        </kbd>{" "}
        for command palette
      </span>
    </header>
  );
}
