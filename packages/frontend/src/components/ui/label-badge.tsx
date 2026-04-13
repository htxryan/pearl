import type { LabelColor } from "@beads-gui/shared";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

/**
 * Predefined label color palette.
 * Each color has light and dark variants with WCAG AA compliant contrast (4.5:1+).
 * bg = background, text = foreground text color.
 */
export const LABEL_PALETTE: Record<LabelColor, { bg: string; text: string; darkBg: string; darkText: string }> = {
  red:    { bg: "#fde8e8", text: "#991b1b", darkBg: "#450a0a", darkText: "#fca5a5" },
  orange: { bg: "#fff3e0", text: "#9a3412", darkBg: "#431407", darkText: "#fdba74" },
  yellow: { bg: "#fef9c3", text: "#854d0e", darkBg: "#422006", darkText: "#fde047" },
  green:  { bg: "#dcfce7", text: "#166534", darkBg: "#052e16", darkText: "#86efac" },
  teal:   { bg: "#ccfbf1", text: "#115e59", darkBg: "#042f2e", darkText: "#5eead4" },
  blue:   { bg: "#dbeafe", text: "#1e40af", darkBg: "#1e1b4b", darkText: "#93c5fd" },
  purple: { bg: "#ede9fe", text: "#5b21b6", darkBg: "#2e1065", darkText: "#c4b5fd" },
  pink:   { bg: "#fce7f3", text: "#9d174d", darkBg: "#500724", darkText: "#f9a8d4" },
  gray:   { bg: "#f3f4f6", text: "#374151", darkBg: "#1f2937", darkText: "#d1d5db" },
};

/** Fallback color for labels without a definition */
const FALLBACK: { bg: string; text: string; darkBg: string; darkText: string } = LABEL_PALETTE.gray;

function getColors(color?: LabelColor) {
  return color ? (LABEL_PALETTE[color] ?? FALLBACK) : FALLBACK;
}

interface LabelBadgeProps {
  name: string;
  color?: LabelColor;
  size?: "sm" | "default";
  removable?: boolean;
  onRemove?: () => void;
  className?: string;
}

export function LabelBadge({ name, color, size = "default", removable, onRemove, className }: LabelBadgeProps) {
  const colors = getColors(color);
  const { theme } = useTheme();
  const isDark = theme.colorScheme === "dark";
  const bg = isDark ? colors.darkBg : colors.bg;
  const text = isDark ? colors.darkText : colors.text;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        size === "sm" ? "px-1.5 py-0 text-[10px]" : "px-2 py-0.5 text-xs",
        removable && "gap-1",
        className,
      )}
      style={{ backgroundColor: bg, color: text }}
    >
      {name}
      {removable && onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="opacity-60 hover:opacity-100 focus:opacity-100 text-current"
          aria-label={`Remove label ${name}`}
        >
          &times;
        </button>
      )}
    </span>
  );
}
