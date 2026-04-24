import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useHealth } from "@/hooks/use-issues";
import { displayId } from "@/lib/format-id";
import { cn } from "@/lib/utils";

interface BeadIdProps {
  id: string;
  className?: string;
  /**
   * When false, renders a visual-only pill (no link, no copy button).
   * Use for contexts where the pill is nested inside an already-clickable
   * parent (e.g. a card button or command-palette row) where nested
   * interactive controls would be confusing.
   */
  interactive?: boolean;
}

export function BeadId({ id, className, interactive = true }: BeadIdProps) {
  const { data: health } = useHealth();
  const label = displayId(id, health?.project_prefix);
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const pillBase =
    "inline-flex items-center gap-1 rounded-full bg-muted/60 px-1.5 py-0.5 font-mono align-middle max-w-full";

  // Visual-only pill (no click handlers) — used inside clickable parents.
  if (!interactive) {
    return (
      <span
        className={cn(pillBase, "text-muted-foreground", className)}
        title={id}
        aria-label={label || id}
      >
        <TagIcon className="shrink-0 opacity-70" />
        <span className="truncate">{label || id}</span>
      </span>
    );
  }

  function handleLinkClick(e: React.MouseEvent | React.KeyboardEvent) {
    e.stopPropagation();
    if ("preventDefault" in e) e.preventDefault();
    navigate(`/issues/${encodeURIComponent(id)}`);
  }

  function handleCopyClick(e: React.MouseEvent | React.KeyboardEvent) {
    e.stopPropagation();
    if ("preventDefault" in e) e.preventDefault();
    const writer = navigator.clipboard?.writeText;
    if (!writer) return;
    writer
      .call(navigator.clipboard, id)
      .then(() => {
        setCopied(true);
        if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
        copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  }

  if (copied) {
    return (
      <span
        className={cn(
          pillBase,
          "text-success-foreground bg-success/20 dark:bg-success/30",
          className,
        )}
        role="status"
        aria-live="polite"
      >
        <CheckIcon className="shrink-0" />
        <span>Copied</span>
      </span>
    );
  }

  return (
    <span
      className={cn(pillBase, "text-muted-foreground", className)}
      title={id}
      data-bead-id-pill=""
    >
      <TagIcon className="shrink-0 opacity-70" aria-hidden="true" />
      <span
        role="link"
        tabIndex={0}
        onClick={handleLinkClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") handleLinkClick(e);
        }}
        className="truncate cursor-pointer hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-sm"
        aria-label={`Open ${id}`}
      >
        {label || id}
      </span>
      <span
        role="button"
        tabIndex={0}
        onClick={handleCopyClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") handleCopyClick(e);
        }}
        className="shrink-0 inline-flex items-center justify-center opacity-60 hover:opacity-100 hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-sm"
        aria-label={`Copy ${id}`}
        title={`Copy ${id}`}
      >
        <CopyIcon />
      </span>
    </span>
  );
}

function TagIcon({ className, ...rest }: { className?: string; "aria-hidden"?: "true" }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={rest["aria-hidden"] ?? "true"}
    >
      <path d="M2 7V2.5A.5.5 0 0 1 2.5 2H7l7 7-4.5 4.5L2 7z" />
      <circle cx="5" cy="5" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="5" y="5" width="9" height="9" rx="1.5" />
      <path d="M3 11V3a1 1 0 0 1 1-1h7" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 8.5l3.5 3.5L13 5" />
    </svg>
  );
}
