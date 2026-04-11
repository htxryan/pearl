import { useState } from "react";
import type { Event } from "@beads-gui/shared";
import { Button } from "@/components/ui/button";

interface ActivityTimelineProps {
  events: Event[];
}

const PAGE_SIZE = 20;

export function ActivityTimeline({ events }: ActivityTimelineProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  const visibleEvents = sortedEvents.slice(0, visibleCount);
  const hasMore = visibleCount < sortedEvents.length;

  return (
    <section>
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        Activity ({events.length})
      </h2>

      {visibleEvents.length > 0 ? (
        <div className="relative pl-4 border-l-2 border-border space-y-3">
          {visibleEvents.map((event) => (
            <div key={event.id} className="relative">
              {/* Dot on timeline */}
              <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-border" />

              <div className="text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{event.actor}</span>
                  <span className="text-muted-foreground">
                    {describeEvent(event)}
                  </span>
                </div>
                {event.comment && (
                  <p className="mt-1 text-muted-foreground text-xs">
                    {event.comment}
                  </p>
                )}
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(event.created_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No activity yet.</p>
      )}

      {hasMore && (
        <div className="mt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
          >
            Show more ({sortedEvents.length - visibleCount} remaining)
          </Button>
        </div>
      )}
    </section>
  );
}

function describeEvent(event: Event): string {
  const { event_type, old_value, new_value } = event;

  switch (event_type) {
    case "status_change":
      return `changed status from ${formatValue(old_value)} to ${formatValue(new_value)}`;
    case "priority_change":
      return `changed priority from ${formatValue(old_value)} to ${formatValue(new_value)}`;
    case "assignee_change":
      return `changed assignee from ${formatValue(old_value)} to ${formatValue(new_value)}`;
    case "title_change":
      return `changed title`;
    case "description_change":
      return `updated description`;
    case "dependency_added":
      return `added dependency on ${formatValue(new_value)}`;
    case "dependency_removed":
      return `removed dependency on ${formatValue(old_value)}`;
    case "comment_added":
      return `added a comment`;
    case "created":
      return `created this issue`;
    case "closed":
      return `closed this issue`;
    case "claimed":
      return `claimed this issue`;
    case "label_change":
      return `updated labels`;
    default:
      return event_type.replace(/_/g, " ");
  }
}

function formatValue(val: string | null): string {
  if (val === null || val === "") return "none";
  return val.replace(/_/g, " ");
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
