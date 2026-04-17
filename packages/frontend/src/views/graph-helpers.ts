import dagre from "@dagrejs/dagre";
import type { Dependency, DependencyType, IssueListItem } from "@pearl/shared";
import { type Edge, MarkerType } from "@xyflow/react";
import type { GraphNodeType } from "@/components/graph/graph-node";
import { NODE_HEIGHT, NODE_WIDTH } from "@/components/graph/graph-node";

// ─── Constants ─────────────────────────────────────────

export const PERFORMANCE_CAP = 200;

export const edgeColorByType: Partial<Record<DependencyType, string>> = {
  blocks: "#ef4444", // red
  depends_on: "#3b82f6", // blue
  relates_to: "#a855f7", // purple
  discovered_from: "#6b7280", // gray
};

export const edgeDashByType: Partial<Record<DependencyType, string | undefined>> = {
  blocks: undefined,
  depends_on: undefined,
  relates_to: "5,5",
  discovered_from: "3,3",
};

export const DEFAULT_EDGE_COLOR = "#6b7280";

export const statusColors: Record<string, string> = {
  open: "#3b82f6",
  in_progress: "#f59e0b",
  closed: "#22c55e",
  blocked: "#ef4444",
  deferred: "#9ca3af",
};

// ─── Dependency type labels ──────────────────────────

export function depTypeLabel(type: DependencyType): string {
  switch (type) {
    case "blocks":
      return "blocks";
    case "depends_on":
      return "depends on";
    case "relates_to":
      return "relates to";
    case "discovered_from":
      return "discovered";
    default:
      return type;
  }
}

// ─── Cluster Helpers ──────────────────────────────────

export interface ClusterInfo {
  epicId: string;
  epicTitle: string;
  childIds: string[];
}

export function computeClusters(
  issues: IssueListItem[],
  deps: Dependency[],
): Map<string, ClusterInfo> {
  const issueMap = new Map(issues.map((i) => [i.id, i]));
  const clusters = new Map<string, ClusterInfo>();

  for (const dep of deps) {
    if (dep.type === "contains" && issueMap.has(dep.issue_id) && issueMap.has(dep.depends_on_id)) {
      // Convention: issue_id is the epic (container), depends_on_id is the child
      const epic = issueMap.get(dep.issue_id)!;
      if (!clusters.has(epic.id)) {
        clusters.set(epic.id, {
          epicId: epic.id,
          epicTitle: epic.title,
          childIds: [],
        });
      }
      clusters.get(epic.id)!.childIds.push(dep.depends_on_id);
    }
  }

  return clusters;
}

// ─── Layout ────────────────────────────────────────────

export function computeLayout(
  issues: IssueListItem[],
  deps: Dependency[],
  highlightedIds: Set<string>,
  selectedNodeId: string | null,
  criticalPathEdges: Set<string> = new Set(),
  collapsedEpicChildCounts: Map<string, number> = new Map(),
): { nodes: GraphNodeType[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph({ multigraph: true });
  g.setGraph({
    rankdir: "TB",
    nodesep: 40,
    ranksep: 60,
    marginx: 20,
    marginy: 20,
  });
  g.setDefaultEdgeLabel(() => ({}));

  // Build a set of issue IDs for fast lookup
  const issueMap = new Map<string, IssueListItem>();
  for (const issue of issues) {
    issueMap.set(issue.id, issue);
  }

  // Add nodes
  for (const issue of issues) {
    g.setNode(issue.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  // Add edges (only for issues that exist in our filtered set)
  const validEdges: Dependency[] = [];
  for (const dep of deps) {
    if (issueMap.has(dep.issue_id) && issueMap.has(dep.depends_on_id)) {
      // Edge direction: depends_on_id → issue_id (dependency points upward)
      g.setEdge(dep.depends_on_id, dep.issue_id, {}, dep.type);
      validEdges.push(dep);
    }
  }

  dagre.layout(g);

  const nodes: GraphNodeType[] = issues.map((issue) => {
    const nodeWithPosition = g.node(issue.id);
    // Fallback to (0,0) if dagre fails to position a node
    const x = nodeWithPosition?.x ?? 0;
    const y = nodeWithPosition?.y ?? 0;
    return {
      id: issue.id,
      type: "graphNode" as const,
      position: {
        x: x - NODE_WIDTH / 2,
        y: y - NODE_HEIGHT / 2,
      },
      data: {
        issue,
        highlighted: highlightedIds.has(issue.id),
        dimmed: highlightedIds.size > 0 && !highlightedIds.has(issue.id),
        selected: issue.id === selectedNodeId,
        clusterChildCount: collapsedEpicChildCounts.get(issue.id) ?? undefined,
      },
    };
  });

  const edges: Edge[] = validEdges.map((dep) => {
    const baseColor = edgeColorByType[dep.type] ?? DEFAULT_EDGE_COLOR;
    const hasSelection = highlightedIds.size > 0;
    const bothHighlighted =
      hasSelection && highlightedIds.has(dep.depends_on_id) && highlightedIds.has(dep.issue_id);
    const eitherDimmed =
      hasSelection && (!highlightedIds.has(dep.depends_on_id) || !highlightedIds.has(dep.issue_id));

    // Critical path: this specific edge is on the critical path
    const onCriticalPath =
      criticalPathEdges.size > 0 && criticalPathEdges.has(`${dep.depends_on_id}->${dep.issue_id}`);

    // Priority: blocking chain highlight > critical path > default
    let color = baseColor;
    let strokeWidth = 2;
    let filter: string | undefined;
    let opacity = 1;

    if (bothHighlighted) {
      // Blocking chain takes highest priority
      color = baseColor;
      strokeWidth = 3;
      filter = `drop-shadow(0 0 4px ${baseColor})`;
    } else if (onCriticalPath && !eitherDimmed) {
      // Critical path styling (only when not dimmed by blocking chain selection)
      color = "#818cf8"; // indigo accent
      strokeWidth = 3;
      filter = `drop-shadow(0 0 4px #818cf8)`;
    }

    if (eitherDimmed) {
      opacity = 0.3;
    }

    return {
      id: `${dep.depends_on_id}-${dep.type}-${dep.issue_id}`,
      source: dep.depends_on_id,
      target: dep.issue_id,
      type: "hoverLabel",
      data: { label: depTypeLabel(dep.type) },
      style: {
        stroke: color,
        strokeDasharray: edgeDashByType[dep.type],
        strokeWidth,
        filter,
        opacity,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color,
        width: 16,
        height: 16,
      },
    };
  });

  return { nodes, edges };
}

// ─── Blocking Chain ────────────────────────────────────

export function findBlockingChain(issueId: string, deps: Dependency[]): Set<string> {
  const result = new Set<string>();
  result.add(issueId);

  // Build adjacency: for each issue, what does it depend on?
  const dependsOn = new Map<string, string[]>();
  // Also build reverse: what does it block?
  const blocks = new Map<string, string[]>();

  for (const dep of deps) {
    if (dep.type === "blocks" || dep.type === "depends_on") {
      // issue_id depends on depends_on_id
      const existing = dependsOn.get(dep.issue_id) || [];
      existing.push(dep.depends_on_id);
      dependsOn.set(dep.issue_id, existing);

      const blocking = blocks.get(dep.depends_on_id) || [];
      blocking.push(dep.issue_id);
      blocks.set(dep.depends_on_id, blocking);
    }
  }

  // BFS upstream (what this issue depends on, transitively)
  const upstream = [issueId];
  while (upstream.length > 0) {
    const current = upstream.pop()!;
    const parents = dependsOn.get(current) || [];
    for (const p of parents) {
      if (!result.has(p)) {
        result.add(p);
        upstream.push(p);
      }
    }
  }

  // BFS downstream (what depends on this issue, transitively)
  const downstream = [issueId];
  while (downstream.length > 0) {
    const current = downstream.pop()!;
    const children = blocks.get(current) || [];
    for (const c of children) {
      if (!result.has(c)) {
        result.add(c);
        downstream.push(c);
      }
    }
  }

  return result;
}

// ─── Critical Path ────────────────────────────────────

export function findCriticalPath(issues: IssueListItem[], deps: Dependency[]): Set<string> {
  // Build adjacency list: depends_on_id → issue_id (upstream to downstream)
  const issueIds = new Set(issues.map((i) => i.id));
  const children = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const id of issueIds) {
    children.set(id, []);
    inDegree.set(id, 0);
  }

  for (const dep of deps) {
    if (
      (dep.type === "blocks" || dep.type === "depends_on") &&
      issueIds.has(dep.issue_id) &&
      issueIds.has(dep.depends_on_id)
    ) {
      children.get(dep.depends_on_id)!.push(dep.issue_id);
      inDegree.set(dep.issue_id, (inDegree.get(dep.issue_id) ?? 0) + 1);
    }
  }

  // Topological sort with longest path tracking
  const dist = new Map<string, number>();
  const parent = new Map<string, string | null>();
  const queue: string[] = [];

  for (const [id, deg] of inDegree) {
    if (deg === 0) {
      queue.push(id);
      dist.set(id, 1);
      parent.set(id, null);
    }
  }

  // Process in topological order
  let i = 0;
  while (i < queue.length) {
    const current = queue[i++];
    const currentDist = dist.get(current) ?? 1;
    for (const child of children.get(current) ?? []) {
      const newDist = currentDist + 1;
      if (newDist > (dist.get(child) ?? 0)) {
        dist.set(child, newDist);
        parent.set(child, current);
      }
      inDegree.set(child, (inDegree.get(child) ?? 0) - 1);
      if (inDegree.get(child) === 0) {
        queue.push(child);
      }
    }
  }

  // Detect cycles: nodes in cycles never reach in-degree 0
  if (queue.length < issueIds.size) {
    return new Set<string>();
  }

  // Find the node with maximum distance (end of critical path)
  let maxDist = 0;
  let endNode: string | null = null;
  for (const [id, d] of dist) {
    if (d > maxDist) {
      maxDist = d;
      endNode = id;
    }
  }

  // Trace back to build the critical path as edge keys (source->target)
  const edgeKeys = new Set<string>();
  let current = endNode;
  while (current != null) {
    const prev = parent.get(current) ?? null;
    if (prev != null) {
      edgeKeys.add(`${prev}->${current}`);
    }
    current = prev;
  }

  return edgeKeys;
}

// ─── Performance Subgraph ──────────────────────────────

export function getSubgraph(
  issues: IssueListItem[],
  deps: Dependency[],
  centerId: string | null,
  maxNodes: number,
): IssueListItem[] {
  if (issues.length <= maxNodes) return issues;
  if (!centerId) {
    // No center node selected — take the first maxNodes by priority
    return issues.slice(0, maxNodes);
  }

  // BFS from center node to get nearest neighbors
  const issueIds = new Set(issues.map((i) => i.id));
  const adj = new Map<string, string[]>();
  for (const dep of deps) {
    if (issueIds.has(dep.issue_id) && issueIds.has(dep.depends_on_id)) {
      const a = adj.get(dep.issue_id) || [];
      a.push(dep.depends_on_id);
      adj.set(dep.issue_id, a);
      const b = adj.get(dep.depends_on_id) || [];
      b.push(dep.issue_id);
      adj.set(dep.depends_on_id, b);
    }
  }

  const selected = new Set<string>();
  const queue = [centerId];
  selected.add(centerId);

  while (queue.length > 0 && selected.size < maxNodes) {
    const current = queue.shift()!;
    for (const neighbor of adj.get(current) || []) {
      if (!selected.has(neighbor) && selected.size < maxNodes) {
        selected.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  // Fill remaining slots with unselected issues (isolated nodes)
  if (selected.size < maxNodes) {
    for (const issue of issues) {
      if (selected.size >= maxNodes) break;
      selected.add(issue.id);
    }
  }

  const issueMap = new Map(issues.map((i) => [i.id, i]));
  return [...selected].map((id) => issueMap.get(id)!).filter(Boolean);
}
