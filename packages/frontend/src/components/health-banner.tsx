import { useHealth } from "@/hooks/use-issues";

export function HealthBanner() {
  const { data: health, error, isLoading } = useHealth();

  // Don't show anything while loading initially
  if (isLoading) return null;

  // Network error — backend unreachable
  if (error) {
    return (
      <div className="flex items-center gap-2 border-b border-destructive bg-destructive/10 px-4 py-2 text-sm text-destructive">
        <span className="font-medium">Backend unavailable</span>
        <span className="text-destructive/80">— Cannot connect to the server. Retrying...</span>
      </div>
    );
  }

  // Backend reachable but Dolt is not running
  if (health && health.dolt_server !== "running") {
    return (
      <div className="flex items-center gap-2 border-b border-warning bg-warning/10 px-4 py-2 text-sm text-warning-foreground">
        <span className="font-medium">Database unavailable</span>
        <span className="text-warning-foreground/80">
          — Dolt server status: {health.dolt_server}. Some features may not work.
        </span>
      </div>
    );
  }

  return null;
}
