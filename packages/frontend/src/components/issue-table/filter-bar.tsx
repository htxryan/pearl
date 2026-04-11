import { useCallback, useRef } from "react";
import type { IssueStatus, IssueType, Priority } from "@beads-gui/shared";
import { cn } from "@/lib/utils";

export interface FilterState {
  status: IssueStatus[];
  priority: Priority[];
  issue_type: IssueType[];
  assignee: string;
  search: string;
}

export const EMPTY_FILTERS: FilterState = {
  status: [],
  priority: [],
  issue_type: [],
  assignee: "",
  search: "",
};

const ALL_STATUSES: IssueStatus[] = ["open", "in_progress", "closed", "blocked", "deferred"];
const ALL_PRIORITIES: Priority[] = [0, 1, 2, 3, 4];
const ALL_TYPES: IssueType[] = ["task", "bug", "epic", "feature", "chore", "event", "gate", "molecule"];
const PRIORITY_LABELS: Record<Priority, string> = { 0: "P0", 1: "P1", 2: "P2", 3: "P3", 4: "P4" };
const STATUS_LABELS: Record<IssueStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  closed: "Closed",
  blocked: "Blocked",
  deferred: "Deferred",
};
const TYPE_LABELS: Record<IssueType, string> = {
  task: "Task", bug: "Bug", epic: "Epic", feature: "Feature",
  chore: "Chore", event: "Event", gate: "Gate", molecule: "Molecule",
};

interface FilterBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
}

function MultiSelect<T extends string | number>({
  label,
  options,
  selected,
  labels,
  onChange,
}: {
  label: string;
  options: T[];
  selected: T[];
  labels: Record<string & T, string> | Record<number & T, string>;
  onChange: (values: T[]) => void;
}) {
  return (
    <select
      multiple
      value={selected.map(String)}
      onChange={(e) => {
        const values = Array.from(e.target.selectedOptions, (o) =>
          typeof options[0] === "number" ? (Number(o.value) as T) : (o.value as T),
        );
        onChange(values);
      }}
      className="h-8 min-w-[100px] rounded border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
      aria-label={`Filter by ${label}`}
    >
      {options.map((opt) => (
        <option key={String(opt)} value={String(opt)}>
          {(labels as Record<string, string>)[String(opt)]}
        </option>
      ))}
    </select>
  );
}

export function FilterBar({ filters, onChange, searchInputRef }: FilterBarProps) {
  const internalRef = useRef<HTMLInputElement>(null);
  const inputRef = searchInputRef ?? internalRef;

  const setField = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
      onChange({ ...filters, [key]: value });
    },
    [filters, onChange],
  );

  const hasActiveFilters =
    filters.status.length > 0 ||
    filters.priority.length > 0 ||
    filters.issue_type.length > 0 ||
    filters.assignee !== "" ||
    filters.search !== "";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={filters.search}
            onChange={(e) => setField("search", e.target.value)}
            placeholder="Search issues... (/)"
            className="h-8 w-56 rounded border border-border bg-background pl-3 pr-8 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            aria-label="Search issues"
          />
          {filters.search && (
            <button
              onClick={() => setField("search", "")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              &times;
            </button>
          )}
        </div>

        {/* Status filter */}
        <MultiSelect
          label="status"
          options={ALL_STATUSES}
          selected={filters.status}
          labels={STATUS_LABELS}
          onChange={(v) => setField("status", v)}
        />

        {/* Priority filter */}
        <MultiSelect
          label="priority"
          options={ALL_PRIORITIES}
          selected={filters.priority}
          labels={PRIORITY_LABELS}
          onChange={(v) => setField("priority", v)}
        />

        {/* Type filter */}
        <MultiSelect
          label="type"
          options={ALL_TYPES}
          selected={filters.issue_type}
          labels={TYPE_LABELS}
          onChange={(v) => setField("issue_type", v)}
        />

        {/* Assignee */}
        <input
          type="text"
          value={filters.assignee}
          onChange={(e) => setField("assignee", e.target.value)}
          placeholder="Assignee"
          className="h-8 w-32 rounded border border-border bg-background px-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          aria-label="Filter by assignee"
        />

        {hasActiveFilters && (
          <button
            onClick={() => onChange(EMPTY_FILTERS)}
            className="h-8 rounded px-3 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Active filter pills */}
      {hasActiveFilters && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {filters.status.map((s) => (
            <FilterPill
              key={`status-${s}`}
              label={`Status: ${STATUS_LABELS[s]}`}
              onRemove={() => setField("status", filters.status.filter((x) => x !== s))}
            />
          ))}
          {filters.priority.map((p) => (
            <FilterPill
              key={`priority-${p}`}
              label={`Priority: ${PRIORITY_LABELS[p]}`}
              onRemove={() => setField("priority", filters.priority.filter((x) => x !== p))}
            />
          ))}
          {filters.issue_type.map((t) => (
            <FilterPill
              key={`type-${t}`}
              label={`Type: ${TYPE_LABELS[t]}`}
              onRemove={() => setField("issue_type", filters.issue_type.filter((x) => x !== t))}
            />
          ))}
          {filters.assignee && (
            <FilterPill
              label={`Assignee: ${filters.assignee}`}
              onRemove={() => setField("assignee", "")}
            />
          )}
          {filters.search && (
            <FilterPill
              label={`Search: "${filters.search}"`}
              onRemove={() => setField("search", "")}
            />
          )}
        </div>
      )}
    </div>
  );
}

function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-xs text-accent-foreground",
      )}
    >
      {label}
      <button
        onClick={onRemove}
        className="ml-0.5 text-muted-foreground hover:text-foreground"
        aria-label={`Remove filter: ${label}`}
      >
        &times;
      </button>
    </span>
  );
}
