import { useCallback, useRef, useState, useEffect } from "react";
import { ISSUE_STATUSES, ISSUE_PRIORITIES, ISSUE_TYPES, type IssueStatus, type IssueType, type Priority } from "@beads-gui/shared";
import { cn } from "@/lib/utils";
import { useFilterPresets } from "@/hooks/use-filter-presets";
import { addToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-media-query";
import { LabelPicker } from "@/components/ui/label-picker";
import {
  parseQuerySyntax,
  hasQuerySyntax,
  DATE_RANGE_OPTIONS,
  DATE_RANGE_LABELS,
  STRUCTURAL_FILTER_OPTIONS,
  STRUCTURAL_FILTER_LABELS,
  type DateRange,
  type StructuralFilter,
} from "@/lib/query-syntax";

export interface FilterState {
  status: IssueStatus[];
  priority: Priority[];
  issue_type: IssueType[];
  assignee: string;
  search: string;
  labels: string[];
  dateRanges: DateRange[];
  structural: StructuralFilter[];
  groupBy: GroupByField | null;
}

export type GroupByField = "status" | "priority" | "assignee" | "issue_type";

export const GROUP_BY_LABELS: Record<GroupByField, string> = {
  status: "Status",
  priority: "Priority",
  assignee: "Assignee",
  issue_type: "Type",
};

export const EMPTY_FILTERS: FilterState = {
  status: [],
  priority: [],
  issue_type: [],
  assignee: "",
  search: "",
  labels: [],
  dateRanges: [],
  structural: [],
  groupBy: null,
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

function countActiveFilters(filters: FilterState): number {
  let count = 0;
  if (filters.status.length > 0) count += filters.status.length;
  if (filters.priority.length > 0) count += filters.priority.length;
  if (filters.issue_type.length > 0) count += filters.issue_type.length;
  if (filters.assignee) count += 1;
  if (filters.search) count += 1;
  if (filters.labels.length > 0) count += filters.labels.length;
  if (filters.dateRanges.length > 0) count += filters.dateRanges.length;
  if (filters.structural.length > 0) count += filters.structural.length;
  return count;
}

export function FilterBar({ filters, onChange, searchInputRef }: FilterBarProps) {
  const internalRef = useRef<HTMLInputElement>(null);
  const inputRef = searchInputRef ?? internalRef;
  const { presets, save: savePreset, remove: removePreset } = useFilterPresets();
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [presetName, setPresetName] = useState("");
  const isMobile = useIsMobile();
  const [filtersExpanded, setFiltersExpanded] = useState(false);

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
      // Check if input contains structured query syntax
      if (hasQuerySyntax(value)) {
        const parsed = parseQuerySyntax(value);
        const merged: FilterState = {
          ...filtersRef.current,
          search: parsed.freeText,
          ...(parsed.filters.status?.length ? { status: parsed.filters.status } : {}),
          ...(parsed.filters.priority?.length ? { priority: parsed.filters.priority } : {}),
          ...(parsed.filters.issue_type?.length ? { issue_type: parsed.filters.issue_type } : {}),
          ...(parsed.filters.assignee ? { assignee: parsed.filters.assignee } : {}),
          ...(parsed.filters.labels?.length ? { labels: parsed.filters.labels } : {}),
          ...(parsed.dateRanges.length ? { dateRanges: parsed.dateRanges } : {}),
          ...(parsed.structural.length ? { structural: parsed.structural } : {}),
        };
        // Update local search to show only the free text portion
        setLocalSearch(parsed.freeText);
        onChangeRef.current(merged);
      } else {
        onChangeRef.current({ ...filtersRef.current, search: value });
      }
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

  const handleLabelsChange = useCallback((labels: string[]) => {
    onChangeRef.current({ ...filtersRef.current, labels });
  }, []);

  const hasActiveFilters =
    filters.status.length > 0 ||
    filters.priority.length > 0 ||
    filters.issue_type.length > 0 ||
    filters.assignee !== "" ||
    filters.search !== "" ||
    filters.labels.length > 0 ||
    filters.dateRanges.length > 0 ||
    filters.structural.length > 0;

  const activeCount = countActiveFilters(filters);

  const handleSavePreset = () => {
    if (!presetName.trim()) return;
    savePreset(presetName.trim(), filters);
    addToast({ message: `Saved view "${presetName.trim()}"`, variant: "success" });
    setPresetName("");
    setShowSaveInput(false);
  };

  // Shared filter controls
  const filterControls = (
    <>
      <div className={cn("flex items-center gap-2", isMobile ? "flex-col items-stretch" : "flex-wrap")}>
        {/* Search */}
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={localSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search issues... (/)"
            className={cn(
              "h-8 rounded border border-border bg-background pl-3 pr-8 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring",
              isMobile ? "w-full" : "w-56",
            )}
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
          className={cn(
            "h-8 rounded border border-border bg-background px-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring",
            isMobile ? "w-full" : "w-32",
          )}
          aria-label="Filter by assignee"
        />

        {/* Labels */}
        <LabelPicker
          selected={filters.labels}
          selectedColors={{}}
          onChange={handleLabelsChange}
          allowCreate={false}
          placeholder="Filter by labels"
          className={isMobile ? "w-full" : "w-48"}
        />

        {/* Date range */}
        <select
          value=""
          onChange={(e) => {
            const value = e.target.value as DateRange;
            if (value && !filters.dateRanges.includes(value)) {
              onChange({ ...filters, dateRanges: [...filters.dateRanges, value] });
            }
            e.target.value = "";
          }}
          className="h-8 min-w-[120px] rounded border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          aria-label="Filter by date range"
        >
          <option value="">Date filter...</option>
          {DATE_RANGE_OPTIONS.map((opt) => (
            <option key={opt} value={opt} disabled={filters.dateRanges.includes(opt)}>
              {DATE_RANGE_LABELS[opt]}
            </option>
          ))}
        </select>

        {/* Structural filters */}
        <select
          value=""
          onChange={(e) => {
            const value = e.target.value as StructuralFilter;
            if (value && !filters.structural.includes(value)) {
              onChange({ ...filters, structural: [...filters.structural, value] });
            }
            e.target.value = "";
          }}
          className="h-8 min-w-[120px] rounded border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          aria-label="Filter by properties"
        >
          <option value="">Properties...</option>
          {STRUCTURAL_FILTER_OPTIONS.map((opt) => (
            <option key={opt} value={opt} disabled={filters.structural.includes(opt)}>
              {STRUCTURAL_FILTER_LABELS[opt]}
            </option>
          ))}
        </select>

        {/* Group by */}
        <select
          value={filters.groupBy ?? ""}
          onChange={(e) => {
            const value = e.target.value as GroupByField | "";
            onChange({ ...filters, groupBy: value || null });
          }}
          className="h-8 min-w-[100px] rounded border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          aria-label="Group by"
        >
          <option value="">Group by...</option>
          {(Object.keys(GROUP_BY_LABELS) as GroupByField[]).map((key) => (
            <option key={key} value={key}>{GROUP_BY_LABELS[key]}</option>
          ))}
        </select>

        {hasActiveFilters && (
          <button
            onClick={() => onChange(EMPTY_FILTERS)}
            className="h-8 rounded px-3 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            Clear all
          </button>
        )}
      </div>
    </>
  );

  // Preset selector (shared between mobile/desktop)
  const presetSelector = (
    <div className="flex items-center gap-1.5 flex-wrap">
      {presets.map((preset) => (
        <button
          key={preset.id}
          onClick={() => onChange(preset.filters)}
          className="group inline-flex items-center gap-1 h-7 rounded-full border border-border bg-background px-3 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
        >
          {preset.name}
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              removePreset(preset.id);
              addToast({ message: `Removed view "${preset.name}"`, variant: "info" });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                removePreset(preset.id);
                addToast({ message: `Removed view "${preset.name}"`, variant: "info" });
              }
            }}
            className="hidden group-hover:inline ml-0.5 text-muted-foreground hover:text-destructive"
            aria-label={`Remove preset ${preset.name}`}
          >
            &times;
          </span>
        </button>
      ))}
      {hasActiveFilters && !showSaveInput && (
        <button
          onClick={() => setShowSaveInput(true)}
          className="h-7 rounded-full border border-dashed border-border px-3 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
        >
          + Save view
        </button>
      )}
      {showSaveInput && (
        <div className="inline-flex items-center gap-1">
          <input
            autoFocus
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSavePreset();
              if (e.key === "Escape") { setShowSaveInput(false); setPresetName(""); }
            }}
            placeholder="View name..."
            className="h-7 w-32 rounded border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            onClick={handleSavePreset}
            disabled={!presetName.trim()}
            className="h-7 rounded bg-primary px-2 text-xs text-primary-foreground disabled:opacity-50"
          >
            Save
          </button>
          <button
            onClick={() => { setShowSaveInput(false); setPresetName(""); }}
            className="h-7 rounded px-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );

  // Active filter pills
  const filterPills = hasActiveFilters ? (
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
      {filters.dateRanges.map((d) => (
        <FilterPill
          key={`date-${d}`}
          label={`Date: ${DATE_RANGE_LABELS[d]}`}
          onRemove={() => setField("dateRanges", filters.dateRanges.filter((x) => x !== d))}
        />
      ))}
      {filters.structural.map((s) => (
        <FilterPill
          key={`struct-${s}`}
          label={STRUCTURAL_FILTER_LABELS[s]}
          onRemove={() => setField("structural", filters.structural.filter((x) => x !== s))}
        />
      ))}
      {filters.groupBy && (
        <FilterPill
          label={`Group: ${GROUP_BY_LABELS[filters.groupBy]}`}
          onRemove={() => setField("groupBy", null)}
        />
      )}
      {filters.search && (
        <FilterPill
          label={`Search: "${filters.search}"`}
          onRemove={() => setField("search", "")}
        />
      )}
    </div>
  ) : null;

  // Mobile: collapsed behind "Filters" button
  if (isMobile) {
    return (
      <div className="flex flex-col gap-2">
        {presetSelector}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFiltersExpanded((prev) => !prev)}
            className={cn(
              "inline-flex items-center gap-1.5 h-9 min-h-[44px] rounded border px-3 text-sm font-medium transition-colors",
              filtersExpanded || hasActiveFilters
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
            aria-expanded={filtersExpanded}
            aria-label="Toggle filters"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="2" y1="4" x2="14" y2="4" />
              <line x1="4" y1="8" x2="12" y2="8" />
              <line x1="6" y1="12" x2="10" y2="12" />
            </svg>
            Filters
            {activeCount > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-primary text-[10px] font-semibold text-primary-foreground px-1">
                {activeCount}
              </span>
            )}
          </button>
          {hasActiveFilters && (
            <button
              onClick={() => onChange(EMPTY_FILTERS)}
              className="h-9 min-h-[44px] rounded px-3 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              Clear
            </button>
          )}
        </div>
        {filtersExpanded && filterControls}
        {filterPills}
      </div>
    );
  }

  // Desktop: always visible
  return (
    <div className="flex flex-col gap-2">
      {presetSelector}
      {filterControls}
      {filterPills}
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
