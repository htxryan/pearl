import type { IssueType } from "@beads-gui/shared";
import { cn } from "@/lib/utils";

const typeConfig: Record<IssueType, { label: string; className: string }> = {
  task: { label: "Task", className: "text-blue-600 dark:text-blue-400" },
  bug: { label: "Bug", className: "text-red-600 dark:text-red-400" },
  epic: { label: "Epic", className: "text-purple-600 dark:text-purple-400" },
  feature: { label: "Feature", className: "text-green-600 dark:text-green-400" },
  chore: { label: "Chore", className: "text-gray-500 dark:text-gray-400" },
  event: { label: "Event", className: "text-cyan-600 dark:text-cyan-400" },
  gate: { label: "Gate", className: "text-orange-600 dark:text-orange-400" },
  molecule: { label: "Molecule", className: "text-pink-600 dark:text-pink-400" },
};

export function TypeBadge({ type, className }: { type: IssueType; className?: string }) {
  const config = typeConfig[type] ?? { label: type, className: "text-gray-500 dark:text-gray-400" };
  return (
    <span className={cn("text-xs font-medium", config.className, className)}>
      {config.label}
    </span>
  );
}
