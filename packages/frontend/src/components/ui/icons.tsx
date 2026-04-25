/**
 * Shared icon components for buttons across the UI.
 * All icons render at 14×14 by default, use currentColor, and are aria-hidden
 * so the parent button's text or aria-label provides the accessible name.
 */

interface IconProps {
  size?: number;
  className?: string;
}

function svgProps(size: number) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 16 16",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };
}

export function CheckIcon({ size = 14, className }: IconProps = {}) {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M3 8.5l3 3 7-7" />
    </svg>
  );
}

export function PlusIcon({ size = 14, className }: IconProps = {}) {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M8 3v10M3 8h10" />
    </svg>
  );
}

export function XIcon({ size = 14, className }: IconProps = {}) {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

export function SaveIcon({ size = 14, className }: IconProps = {}) {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M3 3h8l2 2v8a1 1 0 01-1 1H3a1 1 0 01-1-1V4a1 1 0 011-1z" />
      <path d="M5 3v3h5V3" />
      <path d="M5 14v-4h6v4" />
    </svg>
  );
}

export function SendIcon({ size = 14, className }: IconProps = {}) {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M14 2L2 7l4.5 2L14 2z" />
      <path d="M14 2L9 14l-2-5" />
    </svg>
  );
}

export function ArrowLeftIcon({ size = 14, className }: IconProps = {}) {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M13 8H3M7 4L3 8l4 4" />
    </svg>
  );
}

export function ChevronDownIcon({ size = 12, className }: IconProps = {}) {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}

export function RefreshIcon({ size = 14, className }: IconProps = {}) {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M2 8a6 6 0 0110.5-4M14 8a6 6 0 01-10.5 4" />
      <path d="M12 2v3h-3M4 14v-3h3" />
    </svg>
  );
}

export function ReloadIcon({ size = 14, className }: IconProps = {}) {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M2 8a6 6 0 1011-3.5" />
      <path d="M13 1.5v3h-3" />
    </svg>
  );
}

export function ListIcon({ size = 14, className }: IconProps = {}) {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M5 4h9M5 8h9M5 12h9" />
      <circle cx="2.5" cy="4" r="0.6" fill="currentColor" />
      <circle cx="2.5" cy="8" r="0.6" fill="currentColor" />
      <circle cx="2.5" cy="12" r="0.6" fill="currentColor" />
    </svg>
  );
}

export function BoardIcon({ size = 14, className }: IconProps = {}) {
  return (
    <svg {...svgProps(size)} className={className}>
      <rect x="2" y="2.5" width="3.5" height="11" rx="0.5" />
      <rect x="6.25" y="2.5" width="3.5" height="7" rx="0.5" />
      <rect x="10.5" y="2.5" width="3.5" height="9" rx="0.5" />
    </svg>
  );
}

export function GraphIcon({ size = 14, className }: IconProps = {}) {
  return (
    <svg {...svgProps(size)} className={className}>
      <circle cx="3.5" cy="3.5" r="1.5" />
      <circle cx="12.5" cy="3.5" r="1.5" />
      <circle cx="8" cy="12.5" r="1.5" />
      <path d="M5 4h6M4.5 5l3 6M11.5 5l-3 6" />
    </svg>
  );
}

export function ZoomInIcon({ size = 14, className }: IconProps = {}) {
  return (
    <svg {...svgProps(size)} className={className}>
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5l3 3M5 7h4M7 5v4" />
    </svg>
  );
}

export function ZoomOutIcon({ size = 14, className }: IconProps = {}) {
  return (
    <svg {...svgProps(size)} className={className}>
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5l3 3M5 7h4" />
    </svg>
  );
}

export function FitViewIcon({ size = 14, className }: IconProps = {}) {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M2 5V2h3M14 5V2h-3M2 11v3h3M14 11v3h-3" />
      <rect x="5.5" y="5.5" width="5" height="5" rx="0.5" />
    </svg>
  );
}

export function EyeIcon({ size = 14, className }: IconProps = {}) {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z" />
      <circle cx="8" cy="8" r="1.75" />
    </svg>
  );
}

export function EyeOffIcon({ size = 14, className }: IconProps = {}) {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M2.5 4.5C4 7 6 8.5 8 8.5s4-1.5 5.5-4M8 8.5v2M5 7.8l-1 2M11 7.8l1 2M2 4l1.5 1.5M14 4l-1.5 1.5" />
    </svg>
  );
}

export function FilterIcon({ size = 14, className }: IconProps = {}) {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M2 3h12l-4.5 6v4l-3-1.5V9L2 3z" />
    </svg>
  );
}

export function PlugIcon({ size = 14, className }: IconProps = {}) {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M5 7V3M11 7V3" />
      <rect x="3.5" y="7" width="9" height="4" rx="1" />
      <path d="M8 11v3" />
    </svg>
  );
}

export function ArrowRightIcon({ size = 14, className }: IconProps = {}) {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

export function TrashIcon({ size = 14, className }: IconProps = {}) {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M3 4h10" />
      <path d="M5 4V2.5a.5.5 0 01.5-.5h5a.5.5 0 01.5.5V4" />
      <path d="M4 4l.7 9a1 1 0 001 .9h4.6a1 1 0 001-.9L12 4" />
      <path d="M7 7v5M9 7v5" />
    </svg>
  );
}

export function PencilIcon({ size = 14, className }: IconProps = {}) {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M11.5 2.5l2 2L5 13H3v-2l8.5-8.5z" />
      <path d="M10 4l2 2" />
    </svg>
  );
}

export function ActionsIcon({ size = 14, className }: IconProps = {}) {
  return (
    <svg {...svgProps(size)} className={className}>
      <circle cx="3" cy="8" r="1.25" />
      <circle cx="8" cy="8" r="1.25" />
      <circle cx="13" cy="8" r="1.25" />
    </svg>
  );
}

export function ChevronRightIcon({ size = 12, className }: IconProps = {}) {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M6 4l4 4-4 4" />
    </svg>
  );
}

export function ChevronLeftIcon({ size = 12, className }: IconProps = {}) {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M10 4L6 8l4 4" />
    </svg>
  );
}

export function ReassignIcon({ size = 14, className }: IconProps = {}) {
  return (
    <svg {...svgProps(size)} className={className}>
      <circle cx="6" cy="5" r="2.5" />
      <path d="M2 13c0-2.2 1.8-4 4-4s4 1.8 4 4" />
      <path d="M11 6h4M13 4v4" />
    </svg>
  );
}

export function PriorityIcon({ size = 14, className }: IconProps = {}) {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M3 14V2" />
      <path d="M3 2h8l-1.5 3L11 8H3" />
    </svg>
  );
}

export function StatusIcon({ size = 14, className }: IconProps = {}) {
  return (
    <svg {...svgProps(size)} className={className}>
      <circle cx="8" cy="8" r="6" strokeDasharray="2 2" />
      <path d="M5.5 8l2 2 3-4" />
    </svg>
  );
}

export function TagPlusIcon({ size = 14, className }: IconProps = {}) {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M2 8V3a1 1 0 011-1h5l6 6-5 5-6-6z" />
      <circle cx="5" cy="5" r="0.75" fill="currentColor" />
      <path d="M11.5 11.5h3M13 10v3" />
    </svg>
  );
}

export function TagMinusIcon({ size = 14, className }: IconProps = {}) {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M2 8V3a1 1 0 011-1h5l6 6-5 5-6-6z" />
      <circle cx="5" cy="5" r="0.75" fill="currentColor" />
      <path d="M11.5 11.5h3" />
    </svg>
  );
}

export function CloseIssueIcon({ size = 14, className }: IconProps = {}) {
  return (
    <svg {...svgProps(size)} className={className}>
      <circle cx="8" cy="8" r="6" />
      <path d="M5.5 8l2 2 3-4" />
    </svg>
  );
}

export function SearchIcon({ size = 14, className }: IconProps = {}) {
  return (
    <svg {...svgProps(size)} className={className}>
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5l3 3" />
    </svg>
  );
}

export function LinkIcon({ size = 14, className }: IconProps = {}) {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M7 9l2-2" />
      <path d="M9.5 6.5l1.25-1.25a2 2 0 012.83 2.83L12.33 9.33a2 2 0 01-2.83 0" />
      <path d="M6.5 9.5L5.25 10.75a2 2 0 01-2.83-2.83L3.67 6.67a2 2 0 012.83 0" />
    </svg>
  );
}

export function ImageIcon({ size = 14, className }: IconProps = {}) {
  return (
    <svg {...svgProps(size)} className={className} fill="currentColor" stroke="none">
      <rect x="1" y="3" width="14" height="10" rx="1.5" fill="none" stroke="currentColor" />
      <circle cx="5" cy="6.5" r="1.25" />
      <path d="M1.5 12l3.5-4 2.5 3 2-2 4 4H2.5a1 1 0 01-1-1z" />
    </svg>
  );
}

export function ListBulletIcon({ size = 14, className }: IconProps = {}) {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M5 4h9M5 8h9M5 12h9" />
      <circle cx="2.5" cy="4" r="0.6" fill="currentColor" />
      <circle cx="2.5" cy="8" r="0.6" fill="currentColor" />
      <circle cx="2.5" cy="12" r="0.6" fill="currentColor" />
    </svg>
  );
}
