interface PencilIconProps {
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function PencilIcon({ size = 14, strokeWidth = 1.5, className }: PencilIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M11.5 2.5l2 2L5 13H3v-2l8.5-8.5z" />
      <path d="M10 4l2 2" />
    </svg>
  );
}
