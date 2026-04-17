import type { IssueStatus, IssueType, Priority } from "@pearl/shared";
import type { DateRange, StructuralFilter } from "@/lib/query-syntax";

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
