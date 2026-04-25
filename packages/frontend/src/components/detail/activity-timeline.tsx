import type { Event } from "@pearl/shared";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";
import { RelativeTime } from "@/components/ui/relative-time";

interface ActivityTimelineProps {
  events: Event[];
}

interface FieldChange {
  field: string;
  label: string;
  before: string | null;
  after: string | null;
  longText?: boolean;
}

interface ParsedEvent {
  verb: string;
  changes: FieldChange[];
}

interface EventGroup {
  key: string;
  events: Event[];
  representative: Event;
  parsed: ParsedEvent;
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
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [events],
  );

  const filteredEvents = useMemo(
    () =>
      filterType === "all" ? sortedEvents : sortedEvents.filter((e) => e.event_type === filterType),
    [sortedEvents, filterType],
  );

  const groupedEvents = useMemo(() => groupAdjacentEvents(filteredEvents), [filteredEvents]);

  const visibleGroups = groupedEvents.slice(0, visibleCount);
  const hasMore = visibleCount < groupedEvents.length;

  const handleTimestampClick = useCallback((eventId: string) => {
    const anchor = `#event-${eventId}`;
    const url = `${window.location.pathname}${window.location.search}${anchor}`;
    navigator.clipboard?.writeText(window.location.origin + url).catch(() => {
      // Fallback: update the URL hash so the link is at least visible
    });
    window.location.hash = `event-${eventId}`;
  }, []);

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest">
          Activity ({groupedEvents.length})
        </h2>
        <CustomSelect
          value={filterType}
          options={EVENT_FILTER_OPTIONS}
          onChange={(value) => {
            setFilterType(value);
            setVisibleCount(PAGE_SIZE);
          }}
          aria-label="Filter events by type"
          size="sm"
        />
      </div>

      {visibleGroups.length > 0 ? (
        <div className="relative pl-4 border-l-2 border-border space-y-3">
          {visibleGroups.map((group) => {
            const event = group.representative;
            const count = group.events.length;
            const { verb, changes } = group.parsed;
            return (
              <div key={group.key} id={`event-${event.id}`} className="relative">
                <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-border" />

                <div className="text-sm">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{event.actor}</span>
                    <span className="text-muted-foreground">{verb}</span>
                    {count > 1 && (
                      <span className="text-xs text-muted-foreground/60 font-medium">
                        &times;{count}
                      </span>
                    )}
                  </div>
                  {changes.length > 0 && (
                    <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                      {changes.map((change) => (
                        <li key={change.field} className="flex flex-wrap items-baseline gap-1">
                          <span className="font-medium text-foreground/80">{change.label}</span>
                          {change.longText ? (
                            <span className="italic">updated</span>
                          ) : (
                            <>
                              <ValueChip value={change.before} />
                              <span aria-hidden="true">→</span>
                              <ValueChip value={change.after} />
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  {event.comment && (
                    <p className="mt-1 text-muted-foreground text-xs">{event.comment}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => handleTimestampClick(event.id)}
                    className="text-xs text-muted-foreground hover:text-foreground hover:underline cursor-pointer bg-transparent border-none p-0"
                    title="Copy link to this event"
                  >
                    <RelativeTime
                      iso={event.created_at}
                      className="text-xs text-muted-foreground"
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center py-6 text-muted-foreground">
          <span className="text-3xl opacity-20 mb-1" aria-hidden="true">
            &#9716;
          </span>
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
            Show more ({groupedEvents.length - visibleCount} remaining)
          </Button>
        </div>
      )}
    </section>
  );
}

function ValueChip({ value }: { value: string | null }) {
  if (value === null || value === "") {
    return <span className="italic">none</span>;
  }
  return (
    <span className="font-mono text-foreground/80 bg-muted/40 rounded px-1 break-all">{value}</span>
  );
}

export function groupAdjacentEvents(events: Event[]): EventGroup[] {
  const groups: EventGroup[] = [];
  for (const event of events) {
    const parsed = parseEvent(event);
    const prev = groups[groups.length - 1];
    if (
      prev &&
      prev.representative.actor === event.actor &&
      prev.representative.event_type === event.event_type &&
      prev.representative.old_value === event.old_value &&
      prev.representative.new_value === event.new_value &&
      !event.comment &&
      !prev.representative.comment
    ) {
      prev.events.push(event);
    } else {
      groups.push({
        key: event.id,
        events: [event],
        representative: event,
        parsed,
      });
    }
  }
  return groups;
}

// ─── Event parsing ───────────────────────────────────

const HIDDEN_FIELDS = new Set([
  "id",
  "issue_id",
  "created_at",
  "updated_at",
  "closed_at",
  "content_hash",
  "owner",
  "created_by",
  "has_attachments",
  "close_reason",
  "deleted",
]);

const LONG_TEXT_FIELDS = new Set(["description", "design", "acceptance_criteria", "notes"]);

const FIELD_LABELS: Record<string, string> = {
  status: "status",
  priority: "priority",
  issue_type: "type",
  assignee: "assignee",
  title: "title",
  description: "description",
  design: "design",
  acceptance_criteria: "acceptance criteria",
  notes: "notes",
  estimated_minutes: "estimate",
  due: "due date",
  due_at: "due date",
  labels: "labels",
};

export function parseEvent(event: Event): ParsedEvent {
  const verb = describeVerb(event);
  const changes = extractFieldChanges(event);
  return { verb, changes };
}

function describeVerb(event: Event): string {
  switch (event.event_type) {
    case "created":
      return "created this issue";
    case "closed":
      return "closed this issue";
    case "reopened":
      return "reopened this issue";
    case "claimed":
      return "claimed this issue";
    case "comment_added":
    case "commented":
      return "added a comment";
    case "dependency_added":
      return event.new_value ? `added dependency on ${event.new_value}` : "added a dependency";
    case "dependency_removed":
      return event.old_value ? `removed dependency on ${event.old_value}` : "removed a dependency";
    case "label_added":
      return event.new_value ? `added label ${event.new_value}` : "added a label";
    case "label_removed":
      return event.old_value ? `removed label ${event.old_value}` : "removed a label";
    case "status_change":
    case "status_changed":
      return "changed status";
    case "priority_change":
      return "changed priority";
    case "title_change":
      return "renamed the issue";
    case "assignee_change":
      return "changed assignee";
    case "description_change":
      return "edited the description";
    case "label_change":
      return "updated labels";
    case "updated":
      return "updated this issue";
    default:
      return event.event_type.replace(/_/g, " ");
  }
}

export function extractFieldChanges(event: Event): FieldChange[] {
  const oldObj = parseJsonObj(event.old_value);
  const newObj = parseJsonObj(event.new_value);

  // Pearl-style "row + changes" event: old_value is a full row snapshot,
  // new_value contains only the fields that changed. Iterate over new_value's
  // keys so we render exactly the fields the user touched.
  if (oldObj && newObj) {
    const changes: FieldChange[] = [];
    for (const key of Object.keys(newObj)) {
      if (HIDDEN_FIELDS.has(key)) continue;
      const before = oldObj[key];
      const after = newObj[key];
      if (deepEqual(before, after)) continue;
      changes.push(buildFieldChange(key, before, after));
    }
    return changes;
  }

  // Scalar-pair events from the bd CLI: old_value/new_value are single scalars.
  // Map the event_type to a logical field.
  const scalarField = SCALAR_EVENT_FIELD[event.event_type];
  if (scalarField) {
    if (
      (event.old_value === null || event.old_value === "") &&
      (event.new_value === null || event.new_value === "")
    ) {
      return [];
    }
    return [buildFieldChange(scalarField, event.old_value, event.new_value)];
  }

  return [];
}

const SCALAR_EVENT_FIELD: Record<string, string> = {
  status_change: "status",
  status_changed: "status",
  priority_change: "priority",
  title_change: "title",
  assignee_change: "assignee",
  description_change: "description",
  label_change: "labels",
};

function buildFieldChange(field: string, before: unknown, after: unknown): FieldChange {
  return {
    field,
    label: FIELD_LABELS[field] ?? field.replace(/_/g, " "),
    before: formatScalar(field, before),
    after: formatScalar(field, after),
    longText: LONG_TEXT_FIELDS.has(field),
  };
}

function formatScalar(field: string, val: unknown): string | null {
  if (val === null || val === undefined) return null;
  if (val === "") return null;
  if (Array.isArray(val)) {
    if (val.length === 0) return null;
    return val
      .map((el) => (typeof el === "object" && el !== null ? JSON.stringify(el) : String(el)))
      .join(", ");
  }
  if (typeof val === "object") {
    return JSON.stringify(val);
  }
  if (field === "priority" && typeof val === "number") {
    return `P${val}`;
  }
  if (field === "priority" && typeof val === "string" && /^[0-4]$/.test(val)) {
    return `P${val}`;
  }
  const ENUM_FIELDS = new Set(["status", "priority", "issue_type", "event_type"]);
  if (ENUM_FIELDS.has(field)) {
    return String(val).replace(/_/g, " ");
  }
  return String(val);
}

function parseJsonObj(val: string | null): Record<string, unknown> | null {
  if (val === null || val === "") return null;
  const trimmed = val.trim();
  if (trimmed[0] !== "{") return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // not JSON
  }
  return null;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (typeof a === "object" && typeof b === "object") {
    const keysA = Object.keys(a as Record<string, unknown>);
    const keysB = Object.keys(b as Record<string, unknown>);
    if (keysA.length !== keysB.length) return false;
    for (const k of keysA) {
      if (!deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]))
        return false;
    }
    return true;
  }
  return false;
}
