import type { IssueStatus } from "@beads-gui/shared";
import { cn } from "@/lib/utils";

const statusConfig: Record<IssueStatus, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  in_progress: { label: "In Progress", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
  closed: { label: "Closed", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  blocked: { label: "Blocked", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
  deferred: { label: "Deferred", className: "bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400" },
};

export function StatusBadge({ status, className }: { status: IssueStatus; className?: string }) {
  const config = statusConfig[status] ?? { label: status, className: "bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400" };
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
