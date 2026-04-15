import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  ReactFlow,
  Background,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  useReactFlow,
  BaseEdge,
  getBezierPath,
  type Edge,
  type EdgeProps,
  type NodeMouseHandler,
  type ColorMode,
  MarkerType,
} from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import type { IssueListItem, Dependency, DependencyType } from "@pearl/shared";
import { useIssues } from "@/hooks/use-issues";
import { useAllDependencies } from "@/hooks/use-dependencies";
import { useKeyboardScope } from "@/hooks/use-keyboard-scope";
import { useCommandPaletteActions, type CommandAction } from "@/hooks/use-command-palette";
import { useUrlFilters, buildApiParams } from "@/hooks/use-url-filters";
import { useTheme } from "@/hooks/use-theme";
import { useIsMobile } from "@/hooks/use-media-query";
import { FilterBar, EMPTY_FILTERS } from "@/components/issue-table/filter-bar";
import {
  GraphNode,
  NODE_WIDTH,
  NODE_HEIGHT,
  type GraphNodeType,
} from "@/components/graph/graph-node";
import { Button } from "@/components/ui/button";

import "@xyflow/react/dist/style.css";

// ─── Constants ─────────────────────────────────────────

const PERFORMANCE_CAP = 200;

const edgeColorByType: Partial<Record<DependencyType, string>> = {
  blocks: "#ef4444",       // red
  depends_on: "#3b82f6",   // blue
  relates_to: "#a855f7",   // purple
  discovered_from: "#6b7280", // gray
};

const edgeDashByType: Partial<Record<DependencyType, string | undefined>> = {
  blocks: undefined,
  depends_on: undefined,
  relates_to: "5,5",
  discovered_from: "3,3",
};

const DEFAULT_EDGE_COLOR = "#6b7280";

const statusColors: Record<string, string> = {
  open: "#3b82f6",
  in_progress: "#f59e0b",
  closed: "#22c55e",
  blocked: "#ef4444",
  deferred: "#9ca3af",
};

// ─── Node Types (stable ref) ──────────────────────────

const nodeTypes = { graphNode: GraphNode };

// ─── Dependency type labels ──────────────────────────

function depTypeLabel(type: DependencyType): string {
  switch (type) {
    case "blocks": return "blocks";
    case "depends_on": return "depends on";
    case "relates_to": return "relates to";
    case "discovered_from": return "discovered";
    default: return type;
  }
}

// ─── Custom Edge with hover label ────────────────────

function HoverLabelEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  style,
  markerEnd,
  data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  return (
    <>
      {/* Visible edge */}
      <BaseEdge path={edgePath} style={style} markerEnd={markerEnd} />
      {/* Invisible wider path for hover detection + label */}
      <g className="group">
        <path
          d={edgePath}
          fill="none"
          stroke="transparent"
          strokeWidth={20}
          className="pointer-events-auto"
        />
        {data?.label != null && (
          <foreignObject
            x={labelX - 50}
            y={labelY - 14}
            width={100}
            height={28}
            className="pointer-events-none overflow-visible"
          >
            <div className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-[10px] font-medium text-muted-foreground bg-background/90 backdrop-blur-sm border border-border rounded px-1.5 py-0.5 whitespace-nowrap w-fit mx-auto">
              {String(data.label)}
            </div>
          </foreignObject>
        )}
      </g>
    </>
  );
}

// ─── Edge Types (stable ref) ─────────────────────────

const edgeTypes = { hoverLabel: HoverLabelEdge };

// ─── Cluster Helpers ──────────────────────────────────

interface ClusterInfo {
  epicId: string;
  epicTitle: string;
  childIds: string[];
}

function computeClusters(
  issues: IssueListItem[],
  deps: Dependency[],
): Map<string, ClusterInfo> {
  const issueMap = new Map(issues.map(i => [i.id, i]));
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

function computeLayout(
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
      hasSelection &&
      highlightedIds.has(dep.depends_on_id) &&
      highlightedIds.has(dep.issue_id);
    const eitherDimmed =
      hasSelection &&
      (!highlightedIds.has(dep.depends_on_id) || !highlightedIds.has(dep.issue_id));

    // Critical path: this specific edge is on the critical path
    const onCriticalPath =
      criticalPathEdges.size > 0 &&
      criticalPathEdges.has(`${dep.depends_on_id}->${dep.issue_id}`);

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

function findBlockingChain(
  issueId: string,
  deps: Dependency[],
): Set<string> {
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

function findCriticalPath(
  issues: IssueListItem[],
  deps: Dependency[],
): Set<string> {
  // Build adjacency list: depends_on_id → issue_id (upstream to downstream)
  const issueIds = new Set(issues.map(i => i.id));
  const children = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const id of issueIds) {
    children.set(id, []);
    inDegree.set(id, 0);
  }

  for (const dep of deps) {
    if ((dep.type === "blocks" || dep.type === "depends_on") &&
        issueIds.has(dep.issue_id) && issueIds.has(dep.depends_on_id)) {
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

function getSubgraph(
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

// ─── Graph Controls ───────────────────────────────────

function GraphControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <Panel position="bottom-right">
      <div className="flex flex-col gap-1 bg-background/80 backdrop-blur-sm rounded-lg border border-border p-1 shadow-sm">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => zoomIn()}
          title="Zoom in"
        >
          +
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => zoomOut()}
          title="Zoom out"
        >
          {"\u2212"}
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => fitView({ padding: 0.2, maxZoom: 1.5 })}
          title="Fit view"
        >
          {"\u2299"}
        </Button>
      </div>
    </Panel>
  );
}

// ─── Main Component ───────────────────────────────────

export function GraphView() {
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { theme } = useTheme();

  // Shared URL filter state
  const { filters, setFilters } = useUrlFilters();
  const apiParams = useMemo(
    () => buildApiParams(filters, [{ id: "priority", desc: false }]),
    [filters],
  );

  // Data fetching
  const { data: allIssues = [], isLoading: issuesLoading } = useIssues(apiParams);
  const { data: allDeps = [], isLoading: depsLoading } = useAllDependencies();
  const isLoading = issuesLoading || depsLoading;

  // Selected node for highlighting
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showCriticalPath, setShowCriticalPath] = useState(false);
  const [collapsedClusters, setCollapsedClusters] = useState<Set<string>>(new Set());

  // Clear selection when the selected node is no longer in the filtered set
  const allIssueIds = useMemo(() => new Set(allIssues.map((i) => i.id)), [allIssues]);
  useEffect(() => {
    if (selectedNodeId && !allIssueIds.has(selectedNodeId)) {
      setSelectedNodeId(null);
    }
  }, [selectedNodeId, allIssueIds]);

  // Performance cap + subgraph
  const isOverCap = allIssues.length > PERFORMANCE_CAP;
  const displayIssues = useMemo(
    () => getSubgraph(allIssues, allDeps, selectedNodeId, PERFORMANCE_CAP),
    [allIssues, allDeps, selectedNodeId],
  );

  // Compute clusters from contains relationships
  const clusters = useMemo(
    () => computeClusters(displayIssues, allDeps),
    [displayIssues, allDeps],
  );

  // Filter out collapsed cluster children
  const visibleIssues = useMemo(() => {
    if (collapsedClusters.size === 0) return displayIssues;
    const hiddenIds = new Set<string>();
    for (const epicId of collapsedClusters) {
      const cluster = clusters.get(epicId);
      if (cluster) {
        for (const childId of cluster.childIds) {
          hiddenIds.add(childId);
        }
      }
    }
    return displayIssues.filter(i => !hiddenIds.has(i.id));
  }, [displayIssues, collapsedClusters, clusters]);

  // Clear selection when the selected node is hidden by cluster collapse
  const visibleIssueIds = useMemo(() => new Set(visibleIssues.map((i) => i.id)), [visibleIssues]);
  useEffect(() => {
    if (selectedNodeId && !visibleIssueIds.has(selectedNodeId)) {
      setSelectedNodeId(null);
    }
  }, [selectedNodeId, visibleIssueIds]);

  // Re-route deps involving hidden children to their parent epic
  const visibleDeps = useMemo(() => {
    if (collapsedClusters.size === 0) return allDeps;
    const hiddenIds = new Set<string>();
    const childToEpic = new Map<string, string>();
    for (const epicId of collapsedClusters) {
      const cluster = clusters.get(epicId);
      if (cluster) {
        for (const childId of cluster.childIds) {
          hiddenIds.add(childId);
          childToEpic.set(childId, epicId);
        }
      }
    }

    const result: Dependency[] = [];
    const seen = new Set<string>();

    for (const dep of allDeps) {
      const srcHidden = hiddenIds.has(dep.issue_id);
      const tgtHidden = hiddenIds.has(dep.depends_on_id);

      if (!srcHidden && !tgtHidden) {
        result.push(dep);
        continue;
      }

      // Skip "contains" edges (they define the cluster itself)
      if (dep.type === "contains") continue;

      // Reroute hidden ends to their parent epic
      const newIssueId = srcHidden ? childToEpic.get(dep.issue_id)! : dep.issue_id;
      const newDependsOnId = tgtHidden ? childToEpic.get(dep.depends_on_id)! : dep.depends_on_id;

      // Skip self-loops (both ends map to the same epic)
      if (newIssueId === newDependsOnId) continue;

      // Deduplicate rerouted edges
      const key = `${newIssueId}-${dep.type}-${newDependsOnId}`;
      if (seen.has(key)) continue;
      seen.add(key);

      result.push({ ...dep, issue_id: newIssueId, depends_on_id: newDependsOnId });
    }

    return result;
  }, [allDeps, collapsedClusters, clusters]);

  // Build collapsed epic child counts for badge display
  const collapsedEpicChildCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const epicId of collapsedClusters) {
      const cluster = clusters.get(epicId);
      if (cluster) {
        counts.set(epicId, cluster.childIds.length);
      }
    }
    return counts;
  }, [collapsedClusters, clusters]);

  // Blocking chain highlight
  const highlightedIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    return findBlockingChain(selectedNodeId, allDeps);
  }, [selectedNodeId, allDeps]);

  // Critical path highlight
  const criticalPathEdges = useMemo(() => {
    if (!showCriticalPath) return new Set<string>();
    return findCriticalPath(visibleIssues, visibleDeps);
  }, [showCriticalPath, visibleIssues, visibleDeps]);

  // Compute layout
  const layoutResult = useMemo(
    () => computeLayout(visibleIssues, visibleDeps, highlightedIds, selectedNodeId, criticalPathEdges, collapsedEpicChildCounts),
    [visibleIssues, visibleDeps, highlightedIds, selectedNodeId, criticalPathEdges, collapsedEpicChildCounts],
  );

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState<GraphNodeType>(layoutResult.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(layoutResult.edges);

  // Update nodes/edges when data changes
  const prevLayoutRef = useRef(layoutResult);
  useEffect(() => {
    if (prevLayoutRef.current !== layoutResult) {
      prevLayoutRef.current = layoutResult;
      setNodesRef.current(layoutResult.nodes);
      setEdgesRef.current(layoutResult.edges);
    }
  }, [layoutResult]);

  // Auto-layout — use refs for setNodes/setEdges to avoid cascading re-renders
  const setNodesRef = useRef(setNodes);
  const setEdgesRef = useRef(setEdges);
  setNodesRef.current = setNodes;
  setEdgesRef.current = setEdges;

  const handleAutoLayout = useCallback(() => {
    const result = computeLayout(visibleIssues, visibleDeps, highlightedIds, selectedNodeId, criticalPathEdges, collapsedEpicChildCounts);
    setNodesRef.current(result.nodes);
    setEdgesRef.current(result.edges);
  }, [visibleIssues, visibleDeps, highlightedIds, selectedNodeId, criticalPathEdges, collapsedEpicChildCounts]);

  // Pane click → clear selection
  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  // Node click → select for highlight
  const handleNodeClick: NodeMouseHandler<GraphNodeType> = useCallback(
    (_event, node) => {
      setSelectedNodeId((prev) => (prev === node.id ? null : node.id));
    },
    [],
  );

  // Double-click → toggle cluster for epics, navigate for others
  const handleNodeDoubleClick: NodeMouseHandler<GraphNodeType> = useCallback(
    (_event, node) => {
      const cluster = clusters.get(node.id);
      if (cluster) {
        setCollapsedClusters(prev => {
          const next = new Set(prev);
          if (next.has(node.id)) {
            next.delete(node.id);
          } else {
            next.add(node.id);
          }
          return next;
        });
      } else {
        navigate(`/issues/${node.id}`, { state: { from: "/graph" } });
      }
    },
    [navigate, clusters],
  );

  // MiniMap styling
  const minimapNodeColor = useCallback((node: GraphNodeType) => {
    const status = node.data?.issue?.status;
    return statusColors[status] ?? "#6b7280";
  }, []);

  const minimapMaskColor =
    theme.colorScheme === "dark" ? "rgba(0, 0, 0, 0.3)" : "rgba(0, 0, 0, 0.1)";

  // Keyboard shortcuts
  const keyBindings = useMemo(
    () => [
      {
        key: "/",
        handler: () => searchInputRef.current?.focus(),
        description: "Focus search",
      },
      {
        key: "Escape",
        handler: () => setSelectedNodeId(null),
        description: "Clear selection",
      },
      {
        key: "l",
        handler: handleAutoLayout,
        description: "Re-run auto layout",
      },
      {
        key: "c",
        handler: () => setShowCriticalPath(prev => !prev),
        description: "Toggle critical path",
      },
    ],
    [handleAutoLayout],
  );

  useKeyboardScope("graph", keyBindings);

  // Command palette actions — use refs for handlers to keep the actions array stable
  const handleAutoLayoutRef = useRef(handleAutoLayout);
  handleAutoLayoutRef.current = handleAutoLayout;
  const setFiltersRef = useRef(setFilters);
  setFiltersRef.current = setFilters;

  const paletteActions: CommandAction[] = useMemo(
    () => [
      {
        id: "graph-focus-search",
        label: "Focus search",
        shortcut: "/",
        group: "Graph",
        handler: () => searchInputRef.current?.focus(),
      },
      {
        id: "graph-clear-filters",
        label: "Clear all filters",
        group: "Graph",
        handler: () => setFiltersRef.current(EMPTY_FILTERS),
      },
      {
        id: "graph-auto-layout",
        label: "Re-run auto layout",
        shortcut: "l",
        group: "Graph",
        handler: () => handleAutoLayoutRef.current(),
      },
      {
        id: "graph-toggle-critical-path",
        label: "Toggle critical path",
        shortcut: "c",
        group: "Graph",
        handler: () => setShowCriticalPath(prev => !prev),
      },
      {
        id: "graph-clear-selection",
        label: "Clear node selection",
        shortcut: "Escape",
        group: "Graph",
        handler: () => setSelectedNodeId(null),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useCommandPaletteActions("graph-view", paletteActions);

  // Color mode for React Flow
  const colorMode: ColorMode = theme.colorScheme === "dark" ? "dark" : "light";
  const isMobile = useIsMobile();

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="shrink-0 bg-muted/30 px-4 py-3">
        <div className={`flex gap-4 ${isMobile ? "flex-col" : "items-center justify-between"}`}>
          <FilterBar
            filters={filters}
            onChange={setFilters}
            searchInputRef={searchInputRef}
          />
          <div className="flex items-center gap-2 shrink-0">
            {isOverCap && (
              <span className="text-xs text-muted-foreground">
                Showing {displayIssues.length} of {allIssues.length} issues
              </span>
            )}
            {clusters.size > 0 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCollapsedClusters(new Set(clusters.keys()))}
                  className="min-h-[44px] md:min-h-0"
                  title="Collapse all clusters"
                >
                  Collapse
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCollapsedClusters(new Set())}
                  className="min-h-[44px] md:min-h-0"
                  title="Expand all clusters"
                >
                  Expand
                </Button>
              </div>
            )}
            <Button
              variant={showCriticalPath ? "default" : "outline"}
              size="sm"
              onClick={() => setShowCriticalPath(prev => !prev)}
              className="min-h-[44px] md:min-h-0"
              title="Show critical path (C)"
            >
              Critical Path
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoLayout}
              className="min-h-[44px] md:min-h-0"
              title="Re-run Dagre layout (L)"
            >
              Auto Layout
            </Button>
          </div>
        </div>
        {selectedNodeId && (
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              Highlighting blocking chain for{" "}
              <span className="font-mono font-medium text-foreground">{selectedNodeId}</span>
            </span>
            <button
              onClick={() => setSelectedNodeId(null)}
              className="text-xs underline hover:text-foreground"
            >
              Clear
            </button>
            <span className="text-border">|</span>
            <button
              onClick={() => navigate(`/issues/${selectedNodeId}`, { state: { from: "/graph" } })}
              className="text-xs underline hover:text-foreground"
            >
              Open detail
            </button>
          </div>
        )}
      </div>

      {/* Graph */}
      <div className="flex-1">
        {isLoading && allIssues.length === 0 ? (
          <GraphSkeleton />
        ) : allIssues.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
            <span className="text-5xl opacity-20" aria-hidden="true">&#9737;</span>
            <p>No issues match the current filters.</p>
            <p className="text-sm">Try adjusting filters or create issues with dependencies.</p>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            onNodeDoubleClick={handleNodeDoubleClick}
            onPaneClick={handlePaneClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            colorMode={colorMode}
            fitView
            fitViewOptions={{ padding: 0.2, maxZoom: 1.5 }}
            minZoom={0.1}
            maxZoom={3}
          >
            <Background />
            <GraphControls />
            <MiniMap
              nodeStrokeWidth={3}
              pannable
              zoomable
              nodeColor={minimapNodeColor}
              maskColor={minimapMaskColor}
              style={{
                backgroundColor: 'var(--color-surface, var(--color-muted))',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--color-border)',
              }}
            />
            <Panel position="bottom-left">
              <Legend />
            </Panel>
          </ReactFlow>
        )}
      </div>
    </div>
  );
}

// ─── Legend ─────────────────────────────────────────────

function Legend() {
  return (
    <div className="flex items-center gap-4 flex-wrap px-3 py-2 text-[10px] text-muted-foreground bg-background/80 backdrop-blur-sm rounded-md border border-border max-w-[calc(100vw-2rem)]">
      <span className="font-medium">Edges:</span>
      <span className="flex items-center gap-1">
        <span className="inline-block w-4 h-0.5 bg-red-500" /> blocks
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block w-4 h-0.5 bg-blue-500" /> depends on
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block w-4 h-0.5 border-t-2 border-dashed border-purple-500" /> relates
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block w-4 h-0.5 border-t-2 border-dashed border-gray-500" /> discovered
      </span>
    </div>
  );
}

// ─── Skeleton ──────────────────────────────────────────

function GraphSkeleton() {
  return (
    <div
      className="flex items-center justify-center h-full"
      role="status"
      aria-label="Loading graph"
      aria-busy
    >
      <div className="flex flex-col items-center gap-4">
        {/* Placeholder network diagram */}
        <div className="relative opacity-20" style={{ width: 200, height: 120 }}>
          <svg width="200" height="120" viewBox="0 0 200 120" className="absolute inset-0">
            <line x1="100" y1="20" x2="50" y2="60" stroke="currentColor" strokeWidth="2" />
            <line x1="100" y1="20" x2="150" y2="60" stroke="currentColor" strokeWidth="2" />
            <line x1="50" y1="60" x2="80" y2="100" stroke="currentColor" strokeWidth="2" />
            <line x1="150" y1="60" x2="120" y2="100" stroke="currentColor" strokeWidth="2" />
          </svg>
          <div className="absolute skeleton-shimmer rounded" style={{ left: 80, top: 8, width: 40, height: 24 }} />
          <div className="absolute skeleton-shimmer rounded" style={{ left: 30, top: 48, width: 40, height: 24 }} />
          <div className="absolute skeleton-shimmer rounded" style={{ left: 130, top: 48, width: 40, height: 24 }} />
          <div className="absolute skeleton-shimmer rounded" style={{ left: 60, top: 88, width: 40, height: 24 }} />
          <div className="absolute skeleton-shimmer rounded" style={{ left: 100, top: 88, width: 40, height: 24 }} />
        </div>
        <span className="text-sm text-muted-foreground">Loading dependency graph...</span>
      </div>
    </div>
  );
}
