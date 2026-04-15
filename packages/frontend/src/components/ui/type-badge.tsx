import type { IssueType } from "@pearl/shared";
import { cn } from "@/lib/utils";

const typeConfig: Record<IssueType, { label: string; className: string }> = {
  task: { label: "Task", className: "text-info" },
  bug: { label: "Bug", className: "text-danger" },
  epic: { label: "Epic", className: "text-purple-600 dark:text-purple-400" },
  feature: { label: "Feature", className: "text-success" },
  chore: { label: "Chore", className: "text-muted-foreground" },
  event: { label: "Event", className: "text-cyan-600 dark:text-cyan-400" },
  gate: { label: "Gate", className: "text-warning" },
  molecule: { label: "Molecule", className: "text-pink-600 dark:text-pink-400" },
};

export function TypeBadge({ type, className }: { type: IssueType; className?: string }) {
  const config = typeConfig[type] ?? { label: type, className: "text-muted-foreground" };
  return (
    <span className={cn("text-xs font-medium", config.className, className)}>
      {config.label}
    </span>
  );
}
