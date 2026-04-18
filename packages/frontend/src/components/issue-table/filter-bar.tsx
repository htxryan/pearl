import { ISSUE_PRIORITIES, ISSUE_STATUSES, ISSUE_TYPES } from "@pearl/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { CustomSelect } from "@/components/ui/custom-select";
import { LabelPicker } from "@/components/ui/label-picker";
import { useIsMobile } from "@/hooks/use-media-query";
import {
  DATE_RANGE_LABELS,
  DATE_RANGE_OPTIONS,
  type DateRange,
  hasQuerySyntax,
  parseQuerySyntax,
  STRUCTURAL_FILTER_LABELS,
  STRUCTURAL_FILTER_OPTIONS,
  type StructuralFilter,
} from "@/lib/query-syntax";
import { cn } from "@/lib/utils";
import {
  countActiveFilters,
  FilterPills,
  hasActiveFilters,
  MultiSelect,
  PRIORITY_LABELS,
  PresetDropdown,
  STATUS_LABELS,
  TYPE_LABELS,
} from "./filter-bar-parts";
import type { FilterState, GroupByField } from "./filter-bar-types";
import { EMPTY_FILTERS, GROUP_BY_LABELS, SHOW_ALL_FILTERS } from "./filter-bar-types";

export type { FilterState, GroupByField };
export { EMPTY_FILTERS, GROUP_BY_LABELS, SHOW_ALL_FILTERS };

const ALL_STATUSES = ISSUE_STATUSES;
const ALL_PRIORITIES = ISSUE_PRIORITIES;
const ALL_TYPES = ISSUE_TYPES;

interface FilterBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
  hideGroupBy?: boolean;
}

export function FilterBar({ filters, onChange, searchInputRef, hideGroupBy }: FilterBarProps) {
  const internalRef = useRef<HTMLInputElement>(null);
  const inputRef = searchInputRef ?? internalRef;
  const isMobile = useIsMobile();
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // Local state for debounced text inputs
  const [localSearch, setLocalSearch] = useState(filters.search);
  const [localAssignee, setLocalAssignee] = useState(filters.assignee);

  // Sync external -> local (e.g., "Clear all") and cancel pending debounce
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const assigneeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    setLocalSearch(filters.search);
    clearTimeout(searchTimer.current);
  }, [filters.search]);
  useEffect(() => {
    setLocalAssignee(filters.assignee);
    clearTimeout(assigneeTimer.current);
  }, [filters.assignee]);
  useEffect(
    () => () => {
      clearTimeout(searchTimer.current);
      clearTimeout(assigneeTimer.current);
    },
    [],
  );

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
          ...EMPTY_FILTERS,
          groupBy: filtersRef.current.groupBy, // preserve groupBy across queries
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

  const [showMore, setShowMore] = useState(
    () => filters.assignee !== "" || filters.dateRanges.length > 0,
  );
  useEffect(() => {
    if (filters.assignee !== "" || filters.dateRanges.length > 0) {
      setShowMore(true);
    }
  }, [filters.assignee, filters.dateRanges]);
  const activeCount = countActiveFilters(filters);

  const groupByOptions: { value: GroupByField | "__none__"; label: string }[] = [
    { value: "__none__" as GroupByField, label: "None" },
    ...(Object.keys(GROUP_BY_LABELS) as GroupByField[]).map((key) => ({
      value: key,
      label: GROUP_BY_LABELS[key],
    })),
  ];

  // Shared filter controls
  const filterControls = (
    <>
      <div
        className={cn("flex items-center gap-2", isMobile ? "flex-col items-stretch" : "flex-wrap")}
      >
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
              isMobile ? "w-full min-h-[44px]" : "w-56",
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

        {/* Labels */}
        <LabelPicker
          selected={filters.labels}
          selectedColors={{}}
          onChange={handleLabelsChange}
          allowCreate={false}
          placeholder="Filter by labels"
          className={isMobile ? "w-full" : "w-48"}
        />

        {/* Structural filters */}
        <CustomSelect<StructuralFilter>
          value={null}
          options={STRUCTURAL_FILTER_OPTIONS.map((opt) => ({
            value: opt,
            label: STRUCTURAL_FILTER_LABELS[opt],
            disabled: filters.structural.includes(opt),
          }))}
          onChange={(value) => {
            if (!filters.structural.includes(value)) {
              onChange({ ...filters, structural: [...filters.structural, value] });
            }
          }}
          placeholder="Properties..."
          aria-label="Filter by properties"
          className="min-w-[120px]"
        />

        {/* Group by with None option — hidden on Board (columns are always by status) */}
        {!hideGroupBy && (
          <CustomSelect<GroupByField | "__none__">
            value={filters.groupBy}
            options={groupByOptions}
            onChange={(value) =>
              onChange({
                ...filters,
                groupBy: value === ("__none__" as string) ? null : (value as GroupByField),
              })
            }
            placeholder="Group by..."
            aria-label="Group by"
            className="min-w-[100px]"
          />
        )}

        {/* More filters toggle */}
        {!showMore && (
          <button
            onClick={() => setShowMore(true)}
            className={cn(
              "h-8 rounded border border-dashed border-border px-3 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors",
              isMobile && "min-h-[44px]",
            )}
          >
            More filters
          </button>
        )}

        {/* Assignee (hidden by default) */}
        {showMore && (
          <input
            type="text"
            value={localAssignee}
            onChange={(e) => handleAssigneeChange(e.target.value)}
            placeholder="Assignee"
            className={cn(
              "h-8 rounded border border-border bg-background px-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring",
              isMobile ? "w-full min-h-[44px]" : "w-32",
            )}
            aria-label="Filter by assignee"
          />
        )}

        {/* Date range (hidden by default) */}
        {showMore && (
          <CustomSelect<DateRange>
            value={null}
            options={DATE_RANGE_OPTIONS.map((opt) => ({
              value: opt,
              label: DATE_RANGE_LABELS[opt],
              disabled: filters.dateRanges.includes(opt),
            }))}
            onChange={(value) => {
              if (!filters.dateRanges.includes(value)) {
                onChange({ ...filters, dateRanges: [...filters.dateRanges, value] });
              }
            }}
            placeholder="Date filter..."
            aria-label="Filter by date range"
            className="min-w-[120px]"
          />
        )}

        {hasActiveFilters(filters) && (
          <button
            onClick={() => {
              onChange(SHOW_ALL_FILTERS);
              setShowMore(false);
            }}
            className={cn(
              "h-8 rounded px-3 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors",
              isMobile && "min-h-[44px]",
            )}
          >
            Clear all
          </button>
        )}
      </div>
    </>
  );

  // Mobile: collapsed behind "Filters" button
  if (isMobile) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <PresetDropdown filters={filters} onChange={onChange} />
          <button
            onClick={() => setFiltersExpanded((prev) => !prev)}
            className={cn(
              "inline-flex items-center gap-1.5 h-9 min-h-[44px] rounded border px-3 text-sm font-medium transition-colors",
              filtersExpanded || hasActiveFilters(filters)
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
            aria-expanded={filtersExpanded}
            aria-label="Toggle filters"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
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
          {hasActiveFilters(filters) && (
            <button
              onClick={() => onChange(SHOW_ALL_FILTERS)}
              className="h-9 min-h-[44px] rounded px-3 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              Clear
            </button>
          )}
        </div>
        {filtersExpanded && filterControls}
        <FilterPills filters={filters} setField={setField} />
      </div>
    );
  }

  // Desktop: always visible
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <PresetDropdown filters={filters} onChange={onChange} />
      </div>
      {filterControls}
      <FilterPills filters={filters} setField={setField} />
    </div>
  );
}
