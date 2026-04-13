import type { IssueStatus } from "@beads-gui/shared";
import { cn } from "@/lib/utils";

const statusConfig: Record<IssueStatus, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-info/15 text-info-foreground" },
  in_progress: { label: "In Progress", className: "bg-warning/15 text-warning-foreground" },
  closed: { label: "Closed", className: "bg-success/15 text-success-foreground" },
  blocked: { label: "Blocked", className: "bg-danger/15 text-danger-foreground" },
  deferred: { label: "Deferred", className: "bg-muted text-muted-foreground" },
};

export function StatusBadge({ status, className }: { status: IssueStatus; className?: string }) {
  const config = statusConfig[status] ?? { label: status, className: "bg-muted text-muted-foreground" };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
