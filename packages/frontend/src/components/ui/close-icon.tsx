interface CloseIconProps {
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function CloseIcon({ size = 16, strokeWidth = 1.5, className }: CloseIconProps) {
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
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}
