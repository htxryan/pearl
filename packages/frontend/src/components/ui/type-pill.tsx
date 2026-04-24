import type { IssueType } from "@pearl/shared";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";

type IconProps = { className?: string };

function TaskIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="2.5" y="2.5" width="11" height="11" rx="2" />
      <path d="M5.5 8.5l2 2L11 6.5" />
    </svg>
  );
}

function BugIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 5a3 3 0 0 1 6 0" />
      <rect x="4.5" y="5" width="7" height="8" rx="3.5" />
      <path d="M1.5 8h3M11.5 8h3M2 4.5l2.5 1.5M14 4.5l-2.5 1.5M2 12l2.5-1.5M14 12l-2.5-1.5M8 5v8" />
    </svg>
  );
}

function EpicIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
      <path d="M2 4l2.5 2.5L8 3l3.5 3.5L14 4v8H2V4zm0 9h12v1H2v-1z" />
    </svg>
  );
}

function FeatureIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
      <path d="M8 1.5l1.9 3.85 4.25.62-3.08 3 .73 4.24L8 11.2l-3.8 2 .72-4.24-3.07-3 4.24-.62L8 1.5z" />
    </svg>
  );
}

function ChoreIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M10.5 2.5a2.5 2.5 0 0 0-1.8 4.25L2.5 12.94l1.56 1.56 6.19-6.2A2.5 2.5 0 1 0 10.5 2.5z" />
    </svg>
  );
}

function EventIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" />
      <path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" />
    </svg>
  );
}

function GateIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3.5 2v12" />
      <path d="M3.5 3h9l-2 2.5L12.5 8h-9" fill="currentColor" fillOpacity="0.2" />
    </svg>
  );
}

function MoleculeIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="1.5" fill="currentColor" />
      <circle cx="3" cy="4" r="1.5" />
      <circle cx="13" cy="4" r="1.5" />
      <circle cx="3" cy="12" r="1.5" />
      <circle cx="13" cy="12" r="1.5" />
      <path d="M4.2 4.8l2.6 2.4M11.8 4.8L9.2 7.2M4.2 11.2l2.6-2.4M11.8 11.2L9.2 8.8" />
    </svg>
  );
}

export interface TypePillConfig {
  label: string;
  /** Tailwind classes for the pill background + text color. */
  className: string;
  Icon: ComponentType<IconProps>;
}

/**
 * Single source of truth for bead-type visuals. Add a new entry here to make
 * the new type render everywhere TypePill is used.
 */
export const TYPE_PILL_CONFIG: Record<IssueType, TypePillConfig> = {
  task: {
    label: "Task",
    className: "bg-info/15 text-info dark:text-info",
    Icon: TaskIcon,
  },
  bug: {
    label: "Bug",
    className: "bg-danger/15 text-danger dark:text-danger",
    Icon: BugIcon,
  },
  epic: {
    label: "Epic",
    className: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
    Icon: EpicIcon,
  },
  feature: {
    label: "Feature",
    className: "bg-success/15 text-success dark:text-success",
    Icon: FeatureIcon,
  },
  chore: {
    label: "Chore",
    className: "bg-muted text-muted-foreground",
    Icon: ChoreIcon,
  },
  event: {
    label: "Event",
    className: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
    Icon: EventIcon,
  },
  gate: {
    label: "Gate",
    className: "bg-warning/15 text-warning dark:text-warning",
    Icon: GateIcon,
  },
  molecule: {
    label: "Molecule",
    className: "bg-pink-500/15 text-pink-700 dark:text-pink-300",
    Icon: MoleculeIcon,
  },
};

const FALLBACK_CONFIG: TypePillConfig = {
  label: "Unknown",
  className: "bg-muted text-muted-foreground",
  Icon: ChoreIcon,
};

interface TypePillProps {
  type: IssueType;
  /** Hide the label text and render icon only. */
  iconOnly?: boolean;
  className?: string;
}

export function TypePill({ type, iconOnly = false, className }: TypePillProps) {
  const config = TYPE_PILL_CONFIG[type] ?? { ...FALLBACK_CONFIG, label: type };
  const Icon = config.Icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium",
        iconOnly ? "h-5 w-5 justify-center p-0" : "px-1.5 py-0.5 text-xs",
        config.className,
        className,
      )}
      title={iconOnly ? config.label : undefined}
      role={iconOnly ? "img" : undefined}
      aria-label={iconOnly ? config.label : undefined}
    >
      <Icon className="h-3 w-3 shrink-0" />
      {!iconOnly && <span>{config.label}</span>}
    </span>
  );
}
