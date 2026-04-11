import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";
import type { SortingState } from "@tanstack/react-table";
import type { IssueStatus, Priority, IssueType } from "@beads-gui/shared";
import { type FilterState } from "@/components/issue-table/filter-bar";

const VALID_STATUSES = new Set<string>(["open", "in_progress", "closed", "blocked", "deferred"]);
const VALID_PRIORITIES = new Set<number>([0, 1, 2, 3, 4]);
const VALID_TYPES = new Set<string>(["task", "bug", "epic", "feature", "chore", "event", "gate", "molecule"]);
const VALID_SORT_COLUMNS = new Set(["id", "title", "status", "priority", "issue_type", "assignee", "created_at", "updated_at", "due_at"]);

/** Parse URL search params into FilterState + SortingState with validation. */
function parseFilters(params: URLSearchParams): FilterState {
  const rawStatus = params.get("status")?.split(",").filter(Boolean) ?? [];
  const rawPriority = params.get("priority")?.split(",").filter(Boolean).map(Number) ?? [];
  const rawType = params.get("type")?.split(",").filter(Boolean) ?? [];

  return {
    status: rawStatus.filter((s) => VALID_STATUSES.has(s)) as IssueStatus[],
    priority: rawPriority.filter((p) => VALID_PRIORITIES.has(p)) as Priority[],
    issue_type: rawType.filter((t) => VALID_TYPES.has(t)) as IssueType[],
    assignee: params.get("assignee") ?? "",
    search: params.get("search") ?? "",
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
      setSearchParams(serializeToParams(next, sorting), { replace: true });
    },
    [sorting, setSearchParams],
  );

  const setSorting = useCallback(
    (next: SortingState) => {
      setSearchParams(serializeToParams(filters, next), { replace: true });
    },
    [filters, setSearchParams],
  );

  return { filters, sorting, setFilters, setSorting };
}
