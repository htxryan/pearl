import type { Priority } from "@beads-gui/shared";
import { cn } from "@/lib/utils";

const priorityConfig: Record<Priority, { label: string; className: string }> = {
  0: { label: "P0", className: "bg-red-600 text-white" },
  1: { label: "P1", className: "bg-orange-500 text-white" },
  2: { label: "P2", className: "bg-yellow-500 text-yellow-950" },
  3: { label: "P3", className: "bg-blue-400 text-white" },
  4: { label: "P4", className: "bg-gray-300 text-gray-700 dark:bg-gray-600 dark:text-gray-200" },
};

export function PriorityIndicator({ priority, className }: { priority: Priority; className?: string }) {
  const config = priorityConfig[priority] ?? { label: `P${priority}`, className: "bg-gray-300 text-gray-700" };
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded px-1.5 py-0.5 text-xs font-bold tabular-nums",
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
