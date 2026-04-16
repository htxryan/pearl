import { formatRelativeTime } from "@/lib/utils";

function formatAbsoluteTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface RelativeTimeProps {
  iso: string;
  className?: string;
}

export function RelativeTime({ iso, className }: RelativeTimeProps) {
  return (
    <time dateTime={iso} title={formatAbsoluteTime(iso)} className={className}>
      {formatRelativeTime(iso)}
    </time>
  );
}
