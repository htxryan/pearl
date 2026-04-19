export function AttachmentIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={`${className} text-muted-foreground`}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-label="Has attachments"
    >
      <rect x="2" y="3" width="12" height="10" rx="1.5" />
      <circle cx="5.5" cy="6.5" r="1" />
      <path d="M2 11l3-3 2.5 2.5L11 7l3 3" />
    </svg>
  );
}
