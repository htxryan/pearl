import { useAttachmentBlob, useAttachmentClick } from "@/hooks/use-attachment-context";

export type AttachmentPillStatus = "loading" | "loaded" | "error";

interface AttachmentPillProps {
  "data-ref": string;
  "data-index": number;
}

export function AttachmentPill(props: AttachmentPillProps) {
  const ref = props["data-ref"];
  const index = props["data-index"];
  const { status, objectUrl, error } = useAttachmentBlob(ref);
  const handleClick = useAttachmentClick();

  if (status === "loading") {
    return <AttachmentPillSkeleton index={index} />;
  }

  if (status === "error") {
    return <AttachmentPillBroken ref_={ref} reason={error ?? "Load failed"} />;
  }

  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium cursor-pointer hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors align-baseline"
      aria-label={`Attachment ${index}`}
      data-ref={ref}
      data-index={index}
      onClick={() => handleClick?.(ref)}
    >
      {objectUrl ? (
        <img
          src={objectUrl}
          alt=""
          className="h-4 w-4 rounded-sm object-cover"
          aria-hidden="true"
        />
      ) : (
        <ImageIcon />
      )}
      <span>{index}</span>
    </button>
  );
}

function AttachmentPillSkeleton({ index }: { index: number }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground text-xs font-medium animate-pulse motion-reduce:animate-none align-baseline"
      role="status"
      aria-label={`Loading attachment ${index}`}
    >
      <span className="h-4 w-4 rounded-sm bg-muted-foreground/20" aria-hidden="true" />
      <span>{index}</span>
    </span>
  );
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max)}…`;
}

function AttachmentPillBroken({ ref_, reason }: { ref_: string; reason: string }) {
  const safeReason = truncate(reason, 80);
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-destructive/10 text-destructive text-xs font-medium align-baseline"
      role="img"
      aria-label={`Broken attachment ${ref_.slice(0, 12)}: ${safeReason}`}
      title={safeReason}
    >
      <BrokenIcon />
      <span className="font-mono">{ref_.slice(0, 8)}</span>
    </span>
  );
}

function ImageIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
      <circle cx="5.5" cy="6" r="1.5" />
      <path d="M1.5 11l3.5-3.5 2.5 2.5 2-2L14.5 13" strokeLinejoin="round" />
    </svg>
  );
}

function BrokenIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
      <path d="M4 5l8 6M12 5l-8 6" strokeLinecap="round" />
    </svg>
  );
}
