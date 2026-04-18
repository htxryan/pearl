/**
 * Parses structured query syntax from the search bar.
 *
 * Supported syntax: `status:open priority:0 assignee:ryan type:bug`
 * Remaining text becomes the free-text search term.
 *
 * Recognized keys: status, priority, type, assignee, label, due, has, is, no
 */

import type { IssueStatus, IssueType, Priority } from "@pearl/shared";
import { ISSUE_PRIORITIES, ISSUE_STATUSES, ISSUE_TYPES } from "@pearl/shared";

const VALID_STATUSES = new Set<string>(ISSUE_STATUSES);
const VALID_PRIORITIES = new Set<number>(ISSUE_PRIORITIES);
const VALID_TYPES = new Set<string>(ISSUE_TYPES);

export const DATE_RANGE_OPTIONS = [
  "overdue",
  "due_today",
  "due_this_week",
  "due_next_7_days",
  "no_due_date",
  "created_today",
  "created_this_week",
  "created_last_week",
] as const;

export type DateRange = (typeof DATE_RANGE_OPTIONS)[number];

export const DATE_RANGE_LABELS: Record<DateRange, string> = {
  overdue: "Overdue",
  due_today: "Due Today",
  due_this_week: "Due This Week",
  due_next_7_days: "Due Next 7 Days",
  no_due_date: "No Due Date",
  created_today: "Created Today",
  created_this_week: "Created This Week",
  created_last_week: "Created Last Week",
};

const VALID_DATE_RANGES = new Set<string>(DATE_RANGE_OPTIONS);

export const STRUCTURAL_FILTER_OPTIONS = [
  "has_dependency",
  "is_blocked",
  "not_blocked",
  "is_epic",
  "no_assignee",
] as const;

export type StructuralFilter = (typeof STRUCTURAL_FILTER_OPTIONS)[number];

export const STRUCTURAL_FILTER_LABELS: Record<StructuralFilter, string> = {
  has_dependency: "Has Any Dependency",
  is_blocked: "Is Blocked (Open Deps)",
  not_blocked: "Not Blocked",
  is_epic: "Is Epic",
  no_assignee: "No Assignee",
};

const VALID_STRUCTURAL = new Set<string>(STRUCTURAL_FILTER_OPTIONS);

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

export const SHOW_ALL_FILTERS: FilterState = {
  ...EMPTY_FILTERS,
  status: [...ISSUE_STATUSES] as IssueStatus[],
};

export function isShowingAllStatuses(statuses: IssueStatus[]): boolean {
  if (statuses.length !== ISSUE_STATUSES.length) return false;
  const set = new Set(statuses);
  return ISSUE_STATUSES.every((s) => set.has(s));
}

/** Token pattern: `key:value` or `key:"value with spaces"` */
const TOKEN_RE = /(\w+):(?:"([^"]*)"|([\S]+))/g;

export interface ParsedQuery {
  filters: Partial<FilterState>;
  dateRanges: DateRange[];
  structural: StructuralFilter[];
  freeText: string;
}

/**
 * Detects if the input contains structured query syntax (key:value pairs).
 */
export function hasQuerySyntax(input: string): boolean {
  TOKEN_RE.lastIndex = 0;
  return TOKEN_RE.test(input);
}

/**
 * Parse structured query syntax from the search bar input.
 * Returns partial filters to merge, plus remaining free text.
 */
export function parseQuerySyntax(input: string): ParsedQuery {
  const result: ParsedQuery = {
    filters: {},
    dateRanges: [],
    structural: [],
    freeText: "",
  };

  const statuses: IssueStatus[] = [];
  const priorities: Priority[] = [];
  const types: IssueType[] = [];
  const labels: string[] = [];
  let assignee = "";

  // Extract all key:value tokens
  let remaining = input;
  TOKEN_RE.lastIndex = 0;
  let match: RegExpExecArray | null;

  // Collect all matches first, then remove them from remaining
  const matches: { full: string; key: string; value: string }[] = [];
  while ((match = TOKEN_RE.exec(input)) !== null) {
    matches.push({
      full: match[0],
      key: match[1].toLowerCase(),
      value: match[2] ?? match[3], // Quoted or unquoted
    });
  }

  for (const { full, key, value } of matches) {
    let consumed = false;

    switch (key) {
      case "status": {
        // Support comma-separated: status:open,in_progress
        const vals = value.split(",");
        for (const v of vals) {
          if (VALID_STATUSES.has(v)) {
            statuses.push(v as IssueStatus);
            consumed = true;
          }
        }
        break;
      }
      case "priority":
      case "p": {
        const vals = value.split(",");
        for (const v of vals) {
          const n = Number(v);
          if (VALID_PRIORITIES.has(n)) {
            priorities.push(n as Priority);
            consumed = true;
          }
        }
        break;
      }
      case "type": {
        const vals = value.split(",");
        for (const v of vals) {
          if (VALID_TYPES.has(v)) {
            types.push(v as IssueType);
            consumed = true;
          }
        }
        break;
      }
      case "assignee": {
        assignee = value;
        consumed = true;
        break;
      }
      case "label": {
        labels.push(value);
        consumed = true;
        break;
      }
      case "due": {
        // Map natural language to date range
        const mapped = mapDueQuery(value);
        if (mapped && VALID_DATE_RANGES.has(mapped)) {
          result.dateRanges.push(mapped as DateRange);
          consumed = true;
        }
        break;
      }
      case "created": {
        const mapped = mapCreatedQuery(value);
        if (mapped && VALID_DATE_RANGES.has(mapped)) {
          result.dateRanges.push(mapped as DateRange);
          consumed = true;
        }
        break;
      }
      case "has": {
        if (value === "dependency" || value === "dep") {
          result.structural.push("has_dependency");
          consumed = true;
        }
        break;
      }
      case "is": {
        if (value === "blocked") {
          result.structural.push("is_blocked");
          consumed = true;
        } else if (value === "not_blocked" || value === "notblocked") {
          result.structural.push("not_blocked");
          consumed = true;
        } else if (value === "epic") {
          result.structural.push("is_epic");
          consumed = true;
        }
        break;
      }
      case "not": {
        if (value === "blocked") {
          result.structural.push("not_blocked");
          consumed = true;
        }
        break;
      }
      case "no": {
        if (value === "assignee") {
          result.structural.push("no_assignee");
          consumed = true;
        } else if (value === "due" || value === "due_date") {
          result.dateRanges.push("no_due_date");
          consumed = true;
        }
        break;
      }
    }

    if (consumed) {
      remaining = remaining.replace(full, "");
    }
  }

  // Build partial filter state
  if (statuses.length) result.filters.status = statuses;
  if (priorities.length) result.filters.priority = priorities;
  if (types.length) result.filters.issue_type = types;
  if (assignee) result.filters.assignee = assignee;
  if (labels.length) result.filters.labels = labels;

  // Clean up remaining text
  result.freeText = remaining.replace(/\s+/g, " ").trim();

  return result;
}

function mapDueQuery(value: string): string | null {
  const v = value.toLowerCase().replace(/[_-]/g, "");
  if (v === "today") return "due_today";
  if (v === "thisweek" || v === "week") return "due_this_week";
  if (v === "next7days" || v === "next7") return "due_next_7_days";
  if (v === "overdue" || v === "past") return "overdue";
  if (v === "none" || v === "no") return "no_due_date";
  return null;
}

function mapCreatedQuery(value: string): string | null {
  const v = value.toLowerCase().replace(/[_-]/g, "");
  if (v === "today") return "created_today";
  if (v === "thisweek" || v === "week") return "created_this_week";
  if (v === "lastweek") return "created_last_week";
  return null;
}
