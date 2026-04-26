import type { IssueListItem, IssueStatus } from "@pearl/shared";

/** Per-column sort modes available on the Board view. */
export type BoardSortMode = "modified" | "priority" | "created" | "title";

export const BOARD_SORT_MODES: ReadonlyArray<{ value: BoardSortMode; label: string }> = [
  { value: "modified", label: "Modified" },
  { value: "created", label: "Created" },
  { value: "priority", label: "Priority" },
  { value: "title", label: "Title" },
] as const;

export const DEFAULT_BOARD_SORT: BoardSortMode = "modified";

/**
 * Per-column sort state. Missing entries fall back to {@link DEFAULT_BOARD_SORT}.
 * Stored in localStorage so each user's choice persists across sessions.
 */
export type BoardColumnSort = Partial<Record<IssueStatus, BoardSortMode>>;

export const BOARD_COLUMN_SORT_STORAGE_KEY = "pearl:board:column-sort";

/** Newest first by `updated_at`, falling back to `created_at` for ties or missing values. */
function compareModifiedDesc(a: IssueListItem, b: IssueListItem): number {
  const aMod = a.updated_at || a.created_at;
  const bMod = b.updated_at || b.created_at;
  if (aMod !== bMod) return bMod.localeCompare(aMod);
  return b.created_at.localeCompare(a.created_at);
}

/** Newest first by `created_at`. */
function compareCreatedDesc(a: IssueListItem, b: IssueListItem): number {
  if (a.created_at !== b.created_at) return b.created_at.localeCompare(a.created_at);
  return compareModifiedDesc(a, b);
}

/** Alphabetical by title (case-insensitive), then by modified as tiebreaker. */
function compareTitleAsc(a: IssueListItem, b: IssueListItem): number {
  const cmp = a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
  if (cmp !== 0) return cmp;
  return compareModifiedDesc(a, b);
}

/** Sort issues per the chosen mode. Returns a new array; does not mutate input. */
export function sortIssuesForColumn(
  issues: ReadonlyArray<IssueListItem>,
  mode: BoardSortMode,
): IssueListItem[] {
  const next = [...issues];
  switch (mode) {
    case "priority":
      next.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return compareModifiedDesc(a, b);
      });
      break;
    case "created":
      next.sort(compareCreatedDesc);
      break;
    case "title":
      next.sort(compareTitleAsc);
      break;
    case "modified":
      next.sort(compareModifiedDesc);
      break;
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown board sort mode: ${_exhaustive}`);
    }
  }
  return next;
}

export function getColumnSort(state: BoardColumnSort, status: IssueStatus): BoardSortMode {
  return state[status] ?? DEFAULT_BOARD_SORT;
}
