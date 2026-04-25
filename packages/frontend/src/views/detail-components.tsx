import type { IssueStatus } from "@pearl/shared";
import { Children } from "react";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";
import { ArrowLeftIcon } from "@/components/ui/icons";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

// ─── Helper Components ─────────────────────────────────

export function DetailSections({ children }: { children: React.ReactNode }) {
  const items = Children.toArray(children).filter(Boolean);
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      {items.map((child, i) => (
        <ScrollRevealSection key={i} index={i}>
          {child}
        </ScrollRevealSection>
      ))}
    </div>
  );
}

/** Wraps a detail section with scroll-triggered fade-up entrance. */
function ScrollRevealSection({ children, index }: { children: React.ReactNode; index: number }) {
  const [ref, revealed] = useScrollReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={revealed ? "animate-fade-up [animation-fill-mode:backwards]" : "opacity-0"}
      style={revealed ? { animationDelay: `${index * 60}ms` } : undefined}
    >
      {children}
    </div>
  );
}

export function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground w-24 shrink-0">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

export function SelectField({
  value,
  options,
  onChange,
  label,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  label: string;
}) {
  return <CustomSelect value={value} options={options} onChange={onChange} aria-label={label} />;
}

export function DetailSkeleton() {
  return (
    <div className="flex flex-col h-full">
      {/* Header skeleton */}
      <div className="shrink-0 bg-muted/30 px-4 sm:px-6 py-4 space-y-3">
        <div className="h-4 skeleton-shimmer rounded w-32" />
        <div className="h-7 skeleton-shimmer rounded w-80" />
      </div>
      {/* Content skeleton */}
      <div className="flex-1 p-4 sm:p-6 space-y-8 max-w-4xl">
        {/* Fields grid skeleton */}
        <div className="space-y-2">
          <div className="h-3 skeleton-shimmer rounded w-16 mb-3" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3 skeleton-shimmer rounded w-16" />
                <div className="h-5 skeleton-shimmer rounded w-28" />
              </div>
            ))}
          </div>
        </div>
        {/* Description skeleton */}
        <div className="space-y-2">
          <div className="h-3 skeleton-shimmer rounded w-24 mb-3" />
          <div className="space-y-2">
            <div className="h-4 skeleton-shimmer rounded w-full" />
            <div className="h-4 skeleton-shimmer rounded w-5/6" />
            <div className="h-4 skeleton-shimmer rounded w-3/4" />
          </div>
        </div>
        {/* Activity skeleton */}
        <div className="space-y-2">
          <div className="h-3 skeleton-shimmer rounded w-20" />
          <div className="h-12 skeleton-shimmer rounded" />
        </div>
      </div>
    </div>
  );
}

// ─── Utility Functions ─────────────────────────────────

export function statusLabel(status: IssueStatus): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Error View ────────────────────────────────────────

export function DetailErrorView({
  error,
  id,
  backPath,
  backLabel,
  onBack,
}: {
  error: Error | null;
  id: string;
  backPath: string;
  backLabel: string;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <div className="text-4xl">!</div>
      <h2 className="text-xl font-semibold">Issue not found</h2>
      <p className="text-muted-foreground">{error?.message ?? `Could not load issue ${id}`}</p>
      <Button variant="outline" onClick={onBack} className="gap-1.5">
        <ArrowLeftIcon />
        Back to {backLabel.toLowerCase()}
      </Button>
    </div>
  );
}
