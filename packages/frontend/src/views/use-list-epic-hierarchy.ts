import type { Dependency, IssueListItem } from "@pearl/shared";
import { useCallback, useMemo, useState } from "react";
import type { EpicProgress } from "@/components/issue-table/columns";

export function useListEpicHierarchy(issues: IssueListItem[], allDeps: Dependency[]) {
  // Compute epic progress from dependency graph
  const epicProgress = useMemo(() => {
    const map = new Map<string, EpicProgress>();
    const issueStatusMap = new Map(issues.map((i) => [i.id, i.status]));

    const epicIds = new Set(issues.filter((i) => i.issue_type === "epic").map((i) => i.id));

    for (const dep of allDeps) {
      if (
        dep.type === "contains" &&
        epicIds.has(dep.issue_id) &&
        dep.depends_on_id !== dep.issue_id
      ) {
        const existing = map.get(dep.issue_id) ?? { done: 0, total: 0, childIds: [] };
        existing.childIds.push(dep.depends_on_id);
        existing.total += 1;
        const childStatus = issueStatusMap.get(dep.depends_on_id);
        if (childStatus === "closed") existing.done += 1;
        map.set(dep.issue_id, existing);
      }
    }

    return map;
  }, [issues, allDeps]);

  // Compute child IDs (issues that are children of any epic)
  const childIssueIds = useMemo(() => {
    const ids = new Set<string>();
    for (const progress of epicProgress.values()) {
      for (const childId of progress.childIds) ids.add(childId);
    }
    return ids;
  }, [epicProgress]);

  // Top-level only filter
  const [topLevelOnly, setTopLevelOnly] = useState(false);

  // Expanded epics for inline children
  const [expandedEpics, setExpandedEpics] = useState<Set<string>>(new Set());

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedEpics((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Filter issues for top-level only
  const displayIssues = useMemo(() => {
    if (!topLevelOnly) return issues;
    return issues.filter((i) => !childIssueIds.has(i.id));
  }, [issues, topLevelOnly, childIssueIds]);

  // Build expanded list with inline children
  const tableIssues = useMemo(() => {
    const expandedChildIds = new Set<string>();
    if (!topLevelOnly) {
      for (const epicId of expandedEpics) {
        const progress = epicProgress.get(epicId);
        if (progress) {
          for (const childId of progress.childIds) expandedChildIds.add(childId);
        }
      }
    }

    const result: IssueListItem[] = [];
    for (const issue of displayIssues) {
      if (expandedChildIds.has(issue.id)) continue;

      result.push(issue);
      if (expandedEpics.has(issue.id)) {
        const progress = epicProgress.get(issue.id);
        if (progress) {
          const childItems = issues.filter((i) => progress.childIds.includes(i.id));
          result.push(...childItems);
        }
      }
    }
    return result;
  }, [displayIssues, expandedEpics, epicProgress, issues, topLevelOnly]);

  return {
    epicProgress,
    topLevelOnly,
    setTopLevelOnly,
    expandedEpics,
    handleToggleExpand,
    tableIssues,
  };
}
