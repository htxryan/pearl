import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";
import type { SortingState } from "@tanstack/react-table";
import { ISSUE_STATUSES, ISSUE_PRIORITIES, ISSUE_TYPES, type IssueStatus, type Priority, type IssueType } from "@beads-gui/shared";
import { type FilterState } from "@/components/issue-table/filter-bar";

export const VALID_STATUSES = new Set<string>(ISSUE_STATUSES);
export const VALID_PRIORITIES = new Set<number>(ISSUE_PRIORITIES);
const VALID_TYPES = new Set<string>(ISSUE_TYPES);
const VALID_SORT_COLUMNS = new Set(["id", "title", "status", "priority", "issue_type", "assignee", "created_at", "updated_at", "due_at"]);

/** Parse URL search params into FilterState + SortingState with validation. */
function parseFilters(params: URLSearchParams): FilterState {
  const rawStatus = params.get("status")?.split(",").filter(Boolean) ?? [];
  const rawPriority = params.get("priority")?.split(",").filter(Boolean).map(Number) ?? [];
  const rawType = params.get("type")?.split(",").filter(Boolean) ?? [];

  const rawLabels = params.get("labels")?.split(",").filter(Boolean) ?? [];

  return {
    status: rawStatus.filter((s) => VALID_STATUSES.has(s)) as IssueStatus[],
    priority: rawPriority.filter((p) => VALID_PRIORITIES.has(p)) as Priority[],
    issue_type: rawType.filter((t) => VALID_TYPES.has(t)) as IssueType[],
    assignee: params.get("assignee") ?? "",
    search: params.get("search") ?? "",
    labels: rawLabels,
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
  if (sorting.length > 0) {
    params.set("sort", sorting[0].id);
    params.set("dir", sorting[0].desc ? "desc" : "asc");
  }
  return params;
}

/** Build API query params from filter state + sorting. */
export function buildApiParams(filters: FilterState, sorting: SortingState): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.status.length) params.set("status", filters.status.join(","));
  if (filters.priority.length) params.set("priority", filters.priority.join(","));
  if (filters.issue_type.length) params.set("issue_type", filters.issue_type.join(","));
  if (filters.assignee) params.set("assignee", filters.assignee);
  if (filters.search) params.set("search", filters.search);
  if (filters.labels.length) params.set("labels", filters.labels.join(","));
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
