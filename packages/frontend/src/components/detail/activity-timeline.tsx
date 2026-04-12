import { useState, useMemo, useCallback } from "react";
import type { Event } from "@beads-gui/shared";
import { Button } from "@/components/ui/button";
import { RelativeTime } from "@/components/ui/relative-time";

interface ActivityTimelineProps {
  events: Event[];
}

const PAGE_SIZE = 20;

const EVENT_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All events" },
  { value: "status_change", label: "Status changes" },
  { value: "priority_change", label: "Priority changes" },
  { value: "comment_added", label: "Comments" },
  { value: "title_change", label: "Title changes" },
  { value: "assignee_change", label: "Assignee changes" },
  { value: "dependency_added", label: "Dependencies added" },
  { value: "dependency_removed", label: "Dependencies removed" },
  { value: "description_change", label: "Description changes" },
  { value: "label_change", label: "Label changes" },
  { value: "created", label: "Created" },
  { value: "closed", label: "Closed" },
  { value: "claimed", label: "Claimed" },
];

export function ActivityTimeline({ events }: ActivityTimelineProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [filterType, setFilterType] = useState<string>("all");

  const sortedEvents = useMemo(
    () =>
      [...events].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      ),
    [events],
  );

  const filteredEvents = useMemo(
    () =>
      filterType === "all"
        ? sortedEvents
        : sortedEvents.filter((e) => e.event_type === filterType),
    [sortedEvents, filterType],
  );

  const visibleEvents = filteredEvents.slice(0, visibleCount);
  const hasMore = visibleCount < filteredEvents.length;

  const handleTimestampClick = useCallback((eventId: string) => {
    const anchor = `#event-${eventId}`;
    const url = `${window.location.pathname}${window.location.search}${anchor}`;
    navigator.clipboard.writeText(window.location.origin + url).catch(() => {
      // Fallback: update the URL hash so the link is at least visible
    });
    window.location.hash = `event-${eventId}`;
  }, []);

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest">
          Activity ({filteredEvents.length})
        </h2>
        <select
          value={filterType}
          onChange={(e) => {
            setFilterType(e.target.value);
            setVisibleCount(PAGE_SIZE);
          }}
          className="text-xs border border-border rounded px-1.5 py-0.5 bg-background text-foreground"
          aria-label="Filter events by type"
        >
          {EVENT_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {visibleEvents.length > 0 ? (
        <div className="relative pl-4 border-l-2 border-border space-y-3">
          {visibleEvents.map((event) => (
            <div key={event.id} id={`event-${event.id}`} className="relative">
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
                <button
                  type="button"
                  onClick={() => handleTimestampClick(event.id)}
                  className="text-xs text-muted-foreground hover:text-foreground hover:underline cursor-pointer bg-transparent border-none p-0"
                  title="Copy link to this event"
                >
                  <RelativeTime iso={event.created_at} className="text-xs text-muted-foreground" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center py-6 text-muted-foreground">
          <span className="text-3xl opacity-20 mb-1" aria-hidden="true">&#9716;</span>
          <p className="text-sm">
            {filterType === "all"
              ? "No activity yet. Changes will appear here."
              : "No matching events for this filter."}
          </p>
        </div>
      )}

      {hasMore && (
        <div className="mt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
          >
            Show more ({filteredEvents.length - visibleCount} remaining)
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
      return `changed title from "${formatValue(old_value)}" to "${formatValue(new_value)}"`;

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
