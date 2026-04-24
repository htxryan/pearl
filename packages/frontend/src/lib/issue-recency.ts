const STORAGE_KEY = "pearl:issue-recency";
const MAX_ENTRIES = 200;

type RecencyMap = Record<string, string>;

function readMap(): RecencyMap {
  if (typeof window === "undefined" || !window.localStorage) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const result: RecencyMap = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "string") result[k] = v;
    }
    return result;
  } catch {
    return {};
  }
}

function writeMap(map: RecencyMap) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const entries = Object.entries(map);
    if (entries.length > MAX_ENTRIES) {
      entries.sort((a, b) => (a[1] < b[1] ? 1 : a[1] > b[1] ? -1 : 0));
      const trimmed: RecencyMap = {};
      for (const [k, v] of entries.slice(0, MAX_ENTRIES)) trimmed[k] = v;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore quota / disabled storage
  }
}

export function markIssueOpened(id: string, when: Date = new Date()): void {
  if (!id) return;
  const map = readMap();
  map[id] = when.toISOString();
  writeMap(map);
}

export function getIssueOpenedAt(id: string): string | undefined {
  return readMap()[id];
}

export function getRecencyMap(): RecencyMap {
  return readMap();
}

/**
 * The most recent moment the issue was "opened" — viewed locally OR modified
 * (whichever is more recent). Returns an ISO timestamp.
 */
export function mostRecentOpenedAt(
  issue: { id: string; updated_at: string },
  recency: RecencyMap = readMap(),
): string {
  const viewed = recency[issue.id];
  if (viewed && viewed > issue.updated_at) return viewed;
  return issue.updated_at;
}

export function sortByRecency<T extends { id: string; updated_at: string }>(
  issues: readonly T[],
  recency: RecencyMap = readMap(),
): T[] {
  return [...issues].sort((a, b) => {
    const aTs = mostRecentOpenedAt(a, recency);
    const bTs = mostRecentOpenedAt(b, recency);
    if (aTs === bTs) return 0;
    return aTs < bTs ? 1 : -1;
  });
}

// Test-only escape hatch.
export function __resetIssueRecencyForTests(): void {
  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}
