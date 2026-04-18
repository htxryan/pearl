import {
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  ISSUE_TYPES,
  type IssueStatus,
  type IssueType,
  type Priority,
} from "@pearl/shared";
import type { SortingState } from "@tanstack/react-table";
import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";
import type { FilterState, GroupByField } from "@/components/issue-table/filter-bar";
import {
  DATE_RANGE_OPTIONS,
  type DateRange,
  STRUCTURAL_FILTER_OPTIONS,
  type StructuralFilter,
} from "@/lib/query-syntax";

export const VALID_STATUSES = new Set<string>(ISSUE_STATUSES);
export const VALID_PRIORITIES = new Set<number>(ISSUE_PRIORITIES);
const VALID_TYPES = new Set<string>(ISSUE_TYPES);
const VALID_SORT_COLUMNS = new Set([
  "id",
  "title",
  "status",
  "priority",
  "issue_type",
  "assignee",
  "created_at",
  "updated_at",
  "due_at",
]);
const VALID_DATE_RANGES = new Set<string>(DATE_RANGE_OPTIONS);
const VALID_STRUCTURAL = new Set<string>(STRUCTURAL_FILTER_OPTIONS);
const VALID_GROUP_BY = new Set(["status", "priority", "assignee", "issue_type"]);

/** Parse URL search params into FilterState + SortingState with validation. */
function parseFilters(params: URLSearchParams): FilterState {
  const rawStatus = params.get("status")?.split(",").filter(Boolean) ?? [];
  const rawPriority = params.get("priority")?.split(",").filter(Boolean).map(Number) ?? [];
  const rawType = params.get("type")?.split(",").filter(Boolean) ?? [];
  const rawLabels = params.get("labels")?.split(",").filter(Boolean) ?? [];
  const rawDateRanges = params.get("dateRanges")?.split(",").filter(Boolean) ?? [];
  const rawStructural = params.get("structural")?.split(",").filter(Boolean) ?? [];
  const rawGroupBy = params.get("groupBy") ?? "";

  return {
    status: rawStatus.filter((s) => VALID_STATUSES.has(s)) as IssueStatus[],
    priority: rawPriority.filter((p) => VALID_PRIORITIES.has(p)) as Priority[],
    issue_type: rawType.filter((t) => VALID_TYPES.has(t)) as IssueType[],
    assignee: params.get("assignee") ?? "",
    search: params.get("search") ?? "",
    labels: rawLabels,
    dateRanges: rawDateRanges.filter((d) => VALID_DATE_RANGES.has(d)) as DateRange[],
    structural: rawStructural.filter((s) => VALID_STRUCTURAL.has(s)) as StructuralFilter[],
    groupBy: VALID_GROUP_BY.has(rawGroupBy) ? (rawGroupBy as GroupByField) : null,
  };
}

function parseSorting(params: URLSearchParams): SortingState {
  const sort = params.get("sort");
  const dir = params.get("dir");
  if (!sort || !VALID_SORT_COLUMNS.has(sort)) return [{ id: "priority", desc: false }];
  return [{ id: sort, desc: dir === "desc" }];
}

/** Serialize FilterState + SortingState into URLSearchParams. */
function serializeToParams(filters: FilterState, sorting: SortingState): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.status.length) params.set("status", filters.status.join(","));
  if (filters.priority.length) params.set("priority", filters.priority.join(","));
  if (filters.issue_type.length) params.set("type", filters.issue_type.join(","));
  if (filters.assignee) params.set("assignee", filters.assignee);
  if (filters.search) params.set("search", filters.search);
  if (filters.labels.length) params.set("labels", filters.labels.join(","));
  if (filters.dateRanges.length) params.set("dateRanges", filters.dateRanges.join(","));
  if (filters.structural.length) params.set("structural", filters.structural.join(","));
  if (filters.groupBy) params.set("groupBy", filters.groupBy);
  if (sorting.length > 0) {
    params.set("sort", sorting[0].id);
    params.set("dir", sorting[0].desc ? "desc" : "asc");
  }
  return params;
}

const DEFAULT_ACTIVE_STATUSES: IssueStatus[] = ["open", "in_progress", "deferred", "blocked"];

/** Build API query params from filter state + sorting. */
export function buildApiParams(filters: FilterState, sorting: SortingState): URLSearchParams {
  const params = new URLSearchParams();
  const statusList = filters.status.length > 0 ? filters.status : DEFAULT_ACTIVE_STATUSES;
  params.set("status", statusList.join(","));
  if (filters.priority.length) params.set("priority", filters.priority.join(","));
  if (filters.issue_type.length) params.set("issue_type", filters.issue_type.join(","));
  if (filters.assignee) params.set("assignee", filters.assignee);
  if (filters.search) params.set("search", filters.search);
  if (filters.labels.length) params.set("labels", filters.labels.join(","));
  if (filters.dateRanges.length) params.set("date_ranges", filters.dateRanges.join(","));
  if (filters.structural.length) params.set("structural", filters.structural.join(","));
  if (sorting.length > 0) {
    params.set("sort", sorting[0].id);
    params.set("direction", sorting[0].desc ? "desc" : "asc");
  }
  return params;
}

export function useUrlFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);
  const sorting = useMemo(() => parseSorting(searchParams), [searchParams]);

  const setFilters = useCallback(
    (next: FilterState) => {
      setSearchParams((prev) => serializeToParams(next, parseSorting(prev)), { replace: true });
    },
    [setSearchParams],
  );

  const setSorting = useCallback(
    (next: SortingState) => {
      setSearchParams((prev) => serializeToParams(parseFilters(prev), next), { replace: true });
    },
    [setSearchParams],
  );

  return { filters, sorting, setFilters, setSorting };
}
