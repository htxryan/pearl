import { useCallback, useRef, useState, useEffect } from "react";
import { ISSUE_STATUSES, ISSUE_PRIORITIES, ISSUE_TYPES, type IssueStatus, type IssueType, type Priority } from "@beads-gui/shared";
import { cn } from "@/lib/utils";

export interface FilterState {
  status: IssueStatus[];
  priority: Priority[];
  issue_type: IssueType[];
  assignee: string;
  search: string;
  labels: string[];
}

export const EMPTY_FILTERS: FilterState = {
  status: [],
  priority: [],
  issue_type: [],
  assignee: "",
  search: "",
  labels: [],
};

const ALL_STATUSES = ISSUE_STATUSES;
const ALL_PRIORITIES = ISSUE_PRIORITIES;
const ALL_TYPES = ISSUE_TYPES;
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

  // Local state for debounced text inputs
  const [localSearch, setLocalSearch] = useState(filters.search);
  const [localAssignee, setLocalAssignee] = useState(filters.assignee);

  // Sync external → local (e.g., "Clear all") and cancel pending debounce
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const assigneeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => { setLocalSearch(filters.search); clearTimeout(searchTimer.current); }, [filters.search]);
  useEffect(() => { setLocalAssignee(filters.assignee); clearTimeout(assigneeTimer.current); }, [filters.assignee]);
  useEffect(() => () => { clearTimeout(searchTimer.current); clearTimeout(assigneeTimer.current); }, []);

  // Refs to avoid stale closures in debounced callbacks
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const handleSearchChange = useCallback((value: string) => {
    setLocalSearch(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      onChangeRef.current({ ...filtersRef.current, search: value });
    }, 300);
  }, []);

  const handleAssigneeChange = useCallback((value: string) => {
    setLocalAssignee(value);
    clearTimeout(assigneeTimer.current);
    assigneeTimer.current = setTimeout(() => {
      onChangeRef.current({ ...filtersRef.current, assignee: value });
    }, 300);
  }, []);

  const setField = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
      onChange({ ...filters, [key]: value });
    },
    [filters, onChange],
  );

  // Local state for debounced labels input
  const [localLabels, setLocalLabels] = useState(filters.labels.join(","));
  const labelsTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => { setLocalLabels(filters.labels.join(",")); clearTimeout(labelsTimer.current); }, [filters.labels]);
  useEffect(() => () => clearTimeout(labelsTimer.current), []);

  const handleLabelsChange = useCallback((value: string) => {
    setLocalLabels(value);
    clearTimeout(labelsTimer.current);
    labelsTimer.current = setTimeout(() => {
      const parsed = value.split(",").map((s) => s.trim()).filter(Boolean);
      onChangeRef.current({ ...filtersRef.current, labels: parsed });
    }, 300);
  }, []);

  const hasActiveFilters =
    filters.status.length > 0 ||
    filters.priority.length > 0 ||
    filters.issue_type.length > 0 ||
    filters.assignee !== "" ||
    filters.search !== "" ||
    filters.labels.length > 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={localSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search issues... (/)"
            className="h-8 w-56 rounded border border-border bg-background pl-3 pr-8 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            aria-label="Search issues"
          />
          {localSearch && (
            <button
              onClick={() => {
                clearTimeout(searchTimer.current);
                setLocalSearch("");
                setField("search", "");
              }}
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
          value={localAssignee}
          onChange={(e) => handleAssigneeChange(e.target.value)}
          placeholder="Assignee"
          className="h-8 w-32 rounded border border-border bg-background px-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          aria-label="Filter by assignee"
        />

        {/* Labels */}
        <input
          type="text"
          value={localLabels}
          onChange={(e) => handleLabelsChange(e.target.value)}
          placeholder="Labels (comma-sep)"
          className="h-8 w-40 rounded border border-border bg-background px-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          aria-label="Filter by labels"
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
          {filters.labels.map((l) => (
            <FilterPill
              key={`label-${l}`}
              label={`Label: ${l}`}
              onRemove={() => setField("labels", filters.labels.filter((x) => x !== l))}
            />
          ))}
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
