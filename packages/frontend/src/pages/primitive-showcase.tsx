import type { IssueStatus, IssueType, LabelColor, Priority } from "@pearl/shared";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LabelBadge } from "@/components/ui/label-badge";
import { PriorityIndicator } from "@/components/ui/priority-indicator";
import { StatusBadge } from "@/components/ui/status-badge";
import { TypePill } from "@/components/ui/type-pill";

const STATUSES: IssueStatus[] = ["open", "in_progress", "closed", "blocked", "deferred"];
const PRIORITIES: Priority[] = [0, 1, 2, 3, 4];
const ISSUE_TYPES: IssueType[] = [
  "task",
  "bug",
  "epic",
  "feature",
  "chore",
  "event",
  "gate",
  "molecule",
];
const LABEL_COLORS: LabelColor[] = [
  "red",
  "orange",
  "yellow",
  "green",
  "teal",
  "blue",
  "purple",
  "pink",
  "gray",
];

export function PrimitiveShowcase() {
  return (
    <div
      data-testid="primitive-showcase"
      className="min-h-screen bg-background text-foreground p-8 space-y-12"
    >
      <h1 className="text-2xl font-bold">Primitive Showcase</h1>

      <section data-testid="showcase-button">
        <h2 className="text-lg font-semibold mb-4">Button</h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="default">Default</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
          <Button size="icon" aria-label="Icon button">
            +
          </Button>
          <Button disabled>Disabled</Button>
        </div>
      </section>

      <section data-testid="showcase-status-badge">
        <h2 className="text-lg font-semibold mb-4">StatusBadge</h2>
        <div className="flex flex-wrap gap-3">
          {STATUSES.map((s) => (
            <StatusBadge key={s} status={s} />
          ))}
        </div>
      </section>

      <section data-testid="showcase-priority-indicator">
        <h2 className="text-lg font-semibold mb-4">PriorityIndicator</h2>
        <div className="flex flex-wrap gap-3">
          {PRIORITIES.map((p) => (
            <PriorityIndicator key={p} priority={p} />
          ))}
        </div>
      </section>

      <section data-testid="showcase-type-pill">
        <h2 className="text-lg font-semibold mb-4">TypePill</h2>
        <div className="flex flex-wrap gap-3">
          {ISSUE_TYPES.map((t) => (
            <TypePill key={t} type={t} />
          ))}
        </div>
        <div className="flex flex-wrap gap-3 mt-3">
          {ISSUE_TYPES.map((t) => (
            <TypePill key={`${t}-icon`} type={t} iconOnly />
          ))}
        </div>
      </section>

      <section data-testid="showcase-label-badge">
        <h2 className="text-lg font-semibold mb-4">LabelBadge</h2>
        <div className="flex flex-wrap gap-3">
          {LABEL_COLORS.map((c) => (
            <LabelBadge key={c} name={c} color={c} />
          ))}
          <LabelBadge name="removable" color="blue" removable onRemove={() => {}} />
        </div>
      </section>

      <section data-testid="showcase-empty-state">
        <h2 className="text-lg font-semibold mb-4">EmptyState</h2>
        <EmptyState
          icon="📋"
          title="No items found"
          description="Try adjusting your filters or creating a new item."
        />
      </section>
    </div>
  );
}
