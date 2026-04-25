import type { Event } from "@pearl/shared";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDownIcon } from "@/components/ui/icons";
import { RelativeTime } from "@/components/ui/relative-time";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface ActivityTimelineProps {
  events: Event[];
  /** When true, the section heading is omitted (the parent renders the label, e.g. a tab). */
  hideTitle?: boolean;
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
  { value: "reopened", label: "Reopened" },
];

const FILTER_EVENT_TYPES: Record<string, string[]> = {
  status_change: ["status_change", "status_changed"],
  priority_change: ["priority_change"],
  comment_added: ["comment_added", "commented"],
  title_change: ["title_change"],
  assignee_change: ["assignee_change"],
  dependency_added: ["dependency_added"],
  dependency_removed: ["dependency_removed"],
  description_change: ["description_change"],
  label_change: ["label_change", "label_added", "label_removed"],
  created: ["created"],
  closed: ["closed"],
  claimed: ["claimed"],
  reopened: ["reopened"],
};

export function ActivityTimeline({ events, hideTitle = false }: ActivityTimelineProps) {
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
      filterType === "all"
        ? sortedEvents
        : sortedEvents.filter((e) => FILTER_EVENT_TYPES[filterType]?.includes(e.event_type)),
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
      <div className={cn("flex items-center mb-3", hideTitle ? "justify-end" : "justify-between")}>
        {!hideTitle && (
          <h2 className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest">
            Activity ({groupedEvents.length})
          </h2>
        )}
        <Select
          value={filterType}
          onValueChange={(value) => {
            if (value) {
              setFilterType(value);
              setVisibleCount(PAGE_SIZE);
            }
          }}
          modal={false}
        >
          <SelectTrigger size="sm" aria-label="Filter events by type">
            <SelectValue placeholder="All events" />
          </SelectTrigger>
          <SelectContent>
            {EVENT_FILTER_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {visibleGroups.length > 0 ? (
        <div className="relative pl-4 border-l-2 border-border space-y-3">
          {visibleGroups.map((group) => {
            const event = group.representative;
            const count = group.events.length;
            const { verb, changes } = group.parsed;
            const meta = getEventTypeMeta(event.event_type);
            return (
              <div key={group.key} id={`event-${event.id}`} className="relative">
                <div
                  className={cn(
                    "absolute -left-[26px] top-0.5 w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-background",
                    meta.iconBgClass,
                  )}
                  aria-hidden="true"
                >
                  <EventTypeIcon
                    kind={meta.key}
                    className={cn("w-2.5 h-2.5", meta.iconColorClass)}
                  />
                </div>

                <div className="text-sm">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{event.actor}</span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                        meta.badgeClass,
                      )}
                      title={`Event type: ${meta.label}`}
                    >
                      <EventTypeIcon
                        kind={meta.key}
                        className={cn("w-2.5 h-2.5", meta.iconColorClass)}
                      />
                      {meta.label}
                    </span>
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
            className="gap-1.5"
          >
            <ChevronDownIcon size={14} />
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
      getEventTypeMeta(prev.representative.event_type).key ===
        getEventTypeMeta(event.event_type).key &&
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
const ENUM_FIELDS = new Set(["status", "priority", "issue_type", "event_type"]);

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

// ─── Event-type metadata (icon + label + color) ─────

export interface EventTypeMeta {
  key: EventTypeKey;
  label: string;
  iconBgClass: string;
  iconColorClass: string;
  badgeClass: string;
}

type EventTypeKey =
  | "create"
  | "close"
  | "reopen"
  | "claim"
  | "comment"
  | "status"
  | "priority"
  | "edit"
  | "assignee"
  | "labels"
  | "depend-add"
  | "depend-remove"
  | "update"
  | "other";

const EVENT_TYPE_META_BY_TYPE: Record<string, EventTypeMeta> = {
  created: {
    key: "create",
    label: "created",
    iconBgClass: "bg-success/20",
    iconColorClass: "text-success",
    badgeClass: "bg-success/15 text-success-foreground",
  },
  closed: {
    key: "close",
    label: "closed",
    iconBgClass: "bg-success/20",
    iconColorClass: "text-success",
    badgeClass: "bg-success/15 text-success-foreground",
  },
  reopened: {
    key: "reopen",
    label: "reopened",
    iconBgClass: "bg-warning/20",
    iconColorClass: "text-warning",
    badgeClass: "bg-warning/15 text-warning-foreground",
  },
  claimed: {
    key: "claim",
    label: "claimed",
    iconBgClass: "bg-info/20",
    iconColorClass: "text-info",
    badgeClass: "bg-info/15 text-info-foreground",
  },
  comment_added: {
    key: "comment",
    label: "comment",
    iconBgClass: "bg-muted",
    iconColorClass: "text-muted-foreground",
    badgeClass: "bg-muted text-muted-foreground",
  },
  commented: {
    key: "comment",
    label: "comment",
    iconBgClass: "bg-muted",
    iconColorClass: "text-muted-foreground",
    badgeClass: "bg-muted text-muted-foreground",
  },
  status_change: {
    key: "status",
    label: "status",
    iconBgClass: "bg-warning/20",
    iconColorClass: "text-warning",
    badgeClass: "bg-warning/15 text-warning-foreground",
  },
  status_changed: {
    key: "status",
    label: "status",
    iconBgClass: "bg-warning/20",
    iconColorClass: "text-warning",
    badgeClass: "bg-warning/15 text-warning-foreground",
  },
  priority_change: {
    key: "priority",
    label: "priority",
    iconBgClass: "bg-danger/20",
    iconColorClass: "text-danger",
    badgeClass: "bg-danger/15 text-danger-foreground",
  },
  title_change: {
    key: "edit",
    label: "title",
    iconBgClass: "bg-muted",
    iconColorClass: "text-muted-foreground",
    badgeClass: "bg-muted text-muted-foreground",
  },
  assignee_change: {
    key: "assignee",
    label: "assignee",
    iconBgClass: "bg-info/20",
    iconColorClass: "text-info",
    badgeClass: "bg-info/15 text-info-foreground",
  },
  description_change: {
    key: "edit",
    label: "description",
    iconBgClass: "bg-muted",
    iconColorClass: "text-muted-foreground",
    badgeClass: "bg-muted text-muted-foreground",
  },
  label_change: {
    key: "labels",
    label: "labels",
    iconBgClass: "bg-info/20",
    iconColorClass: "text-info",
    badgeClass: "bg-info/15 text-info-foreground",
  },
  label_added: {
    key: "labels",
    label: "label added",
    iconBgClass: "bg-info/20",
    iconColorClass: "text-info",
    badgeClass: "bg-info/15 text-info-foreground",
  },
  label_removed: {
    key: "labels",
    label: "label removed",
    iconBgClass: "bg-muted",
    iconColorClass: "text-muted-foreground",
    badgeClass: "bg-muted text-muted-foreground",
  },
  dependency_added: {
    key: "depend-add",
    label: "dependency added",
    iconBgClass: "bg-info/20",
    iconColorClass: "text-info",
    badgeClass: "bg-info/15 text-info-foreground",
  },
  dependency_removed: {
    key: "depend-remove",
    label: "dependency removed",
    iconBgClass: "bg-muted",
    iconColorClass: "text-muted-foreground",
    badgeClass: "bg-muted text-muted-foreground",
  },
  updated: {
    key: "update",
    label: "update",
    iconBgClass: "bg-muted",
    iconColorClass: "text-muted-foreground",
    badgeClass: "bg-muted text-muted-foreground",
  },
};

const FALLBACK_META: EventTypeMeta = {
  key: "other",
  label: "event",
  iconBgClass: "bg-muted",
  iconColorClass: "text-muted-foreground",
  badgeClass: "bg-muted text-muted-foreground",
};

export function getEventTypeMeta(eventType: string): EventTypeMeta {
  const meta = EVENT_TYPE_META_BY_TYPE[eventType];
  if (meta) return meta;
  const label = eventType.replace(/_/g, " ").trim();
  return { ...FALLBACK_META, label: label || "event" };
}

function EventTypeIcon({ kind, className }: { kind: EventTypeKey; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      {renderIconPath(kind)}
    </svg>
  );
}

function renderIconPath(kind: EventTypeKey): ReactNode {
  switch (kind) {
    case "create":
      return (
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z"
          clipRule="evenodd"
        />
      );
    case "close":
      return (
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clipRule="evenodd"
        />
      );
    case "reopen":
      return (
        <path
          fillRule="evenodd"
          d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0v2.43l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z"
          clipRule="evenodd"
        />
      );
    case "claim":
    case "assignee":
      return (
        <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
      );
    case "comment":
      return (
        <path
          fillRule="evenodd"
          d="M3.505 2.365A41.369 41.369 0 019 2c1.863 0 3.697.124 5.495.365 1.247.167 2.18 1.108 2.435 2.268a4.45 4.45 0 00-.577-.069 43.141 43.141 0 00-4.706 0C9.229 4.696 7.5 6.727 7.5 8.998v2.24c0 1.413.67 2.735 1.76 3.562l-2.98 2.98A.75.75 0 015 17.25v-3.443c-.501-.048-1-.106-1.495-.172C2.033 13.438 1 12.162 1 10.72V5.28c0-1.441 1.033-2.717 2.505-2.914z"
          clipRule="evenodd"
        />
      );
    case "status":
      return (
        <path
          fillRule="evenodd"
          d="M13.2 2.24a.75.75 0 00.04 1.06l2.1 1.95H6.75a.75.75 0 000 1.5h8.59l-2.1 1.95a.75.75 0 101.02 1.1l3.5-3.25a.75.75 0 000-1.1l-3.5-3.25a.75.75 0 00-1.06.04zm-6.4 8a.75.75 0 00-1.06-.04l-3.5 3.25a.75.75 0 000 1.1l3.5 3.25a.75.75 0 101.02-1.1l-2.1-1.95h8.59a.75.75 0 000-1.5H4.66l2.1-1.95a.75.75 0 00.04-1.06z"
          clipRule="evenodd"
        />
      );
    case "priority":
      return (
        <path
          fillRule="evenodd"
          d="M3.5 2.75a.75.75 0 00-1.5 0v14.5a.75.75 0 001.5 0v-4.392l1.657-.348a6.449 6.449 0 014.271.572 7.948 7.948 0 005.965.524l2.078-.64A.75.75 0 0018 12.25v-8.5a.75.75 0 00-.904-.734l-2.38.501a7.25 7.25 0 01-4.186-.363l-.502-.2a8.75 8.75 0 00-5.053-.439l-1.475.31V2.75z"
          clipRule="evenodd"
        />
      );
    case "edit":
    case "update":
      return (
        <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
      );
    case "labels":
      return (
        <path
          fillRule="evenodd"
          d="M5.5 16.5a8.045 8.045 0 005.715-2.365l4.985-4.985a3 3 0 00-4.243-4.243L6.972 9.892A8.045 8.045 0 004.607 15.6l-.857.857a.75.75 0 101.06 1.06l.69-.69c.25.108.516.193.793.252.227.05.46.082.694.097a.75.75 0 00.052-.001zM13 7a1 1 0 100-2 1 1 0 000 2z"
          clipRule="evenodd"
        />
      );
    case "depend-add":
      return (
        <path
          fillRule="evenodd"
          d="M12.232 4.232a2.5 2.5 0 013.536 3.536l-1.225 1.224a.75.75 0 001.061 1.06l1.224-1.224a4 4 0 00-5.656-5.656l-3 3a4 4 0 00.225 5.865.75.75 0 00.977-1.138 2.5 2.5 0 01-.142-3.667l3-3zm-3.586 9.586a2.5 2.5 0 01-3.536-3.536l1.225-1.224a.75.75 0 00-1.061-1.06l-1.224 1.224a4 4 0 105.656 5.656l3-3a4 4 0 00-.225-5.865.75.75 0 00-.977 1.138 2.5 2.5 0 01.142 3.667l-3 3z"
          clipRule="evenodd"
        />
      );
    case "depend-remove":
      return (
        <path
          fillRule="evenodd"
          d="M2.22 2.22a.75.75 0 011.06 0l14.5 14.5a.75.75 0 11-1.06 1.06L13.6 14.66l-1.954 1.954a4 4 0 01-5.656-5.656l1.224-1.224a.75.75 0 011.06 0l.001.001a.75.75 0 010 1.06l-1.224 1.224a2.5 2.5 0 003.536 3.536l1.954-1.954-7.32-7.32-.001.001a4 4 0 00.225 5.865.75.75 0 11-.977 1.138 5.5 5.5 0 01-.69-7.59L2.22 3.28a.75.75 0 010-1.06z"
          clipRule="evenodd"
        />
      );
    default:
      return <circle cx="10" cy="10" r="3" />;
  }
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
