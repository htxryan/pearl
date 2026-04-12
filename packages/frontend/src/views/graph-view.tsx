import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  type Edge,
  type NodeMouseHandler,
  type ColorMode,
  MarkerType,
} from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import type { IssueListItem, Dependency, DependencyType } from "@beads-gui/shared";
import { useIssues } from "@/hooks/use-issues";
import { useAllDependencies } from "@/hooks/use-dependencies";
import { useKeyboardScope } from "@/hooks/use-keyboard-scope";
import { useCommandPaletteActions, type CommandAction } from "@/hooks/use-command-palette";
import { useUrlFilters, buildApiParams } from "@/hooks/use-url-filters";
import { useTheme } from "@/hooks/use-theme";
import { FilterBar, EMPTY_FILTERS } from "@/components/issue-table/filter-bar";
import {
  GraphNode,
  NODE_WIDTH,
  NODE_HEIGHT,
  type GraphNodeType,
} from "@/components/graph/graph-node";

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

// ─── Node Types (stable ref) ──────────────────────────

const nodeTypes = { graphNode: GraphNode };

// ─── Layout ────────────────────────────────────────────

function computeLayout(
  issues: IssueListItem[],
  deps: Dependency[],
  highlightedIds: Set<string>,
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
      },
    };
  });

  const edges: Edge[] = validEdges.map((dep) => {
    const color = edgeColorByType[dep.type] ?? DEFAULT_EDGE_COLOR;
    return {
      id: `${dep.depends_on_id}-${dep.type}-${dep.issue_id}`,
      source: dep.depends_on_id,
      target: dep.issue_id,
      type: "default",
      style: {
        stroke: color,
        strokeDasharray: edgeDashByType[dep.type],
        strokeWidth: 2,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color,
        width: 16,
        height: 16,
      },
      label: dep.type === "relates_to" ? "relates" : undefined,
      labelStyle: { fontSize: 10, fill: "#888" },
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

  // Blocking chain highlight
  const highlightedIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    return findBlockingChain(selectedNodeId, allDeps);
  }, [selectedNodeId, allDeps]);

  // Compute layout
  const layoutResult = useMemo(
    () => computeLayout(displayIssues, allDeps, highlightedIds),
    [displayIssues, allDeps, highlightedIds],
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
    const result = computeLayout(displayIssues, allDeps, highlightedIds);
    setNodesRef.current(result.nodes);
    setEdgesRef.current(result.edges);
  }, [displayIssues, allDeps, highlightedIds]);

  // Node click → select for highlight
  const handleNodeClick: NodeMouseHandler<GraphNodeType> = useCallback(
    (_event, node) => {
      setSelectedNodeId((prev) => (prev === node.id ? null : node.id));
    },
    [],
  );

  // Double-click → navigate to detail
  const handleNodeDoubleClick: NodeMouseHandler<GraphNodeType> = useCallback(
    (_event, node) => {
      navigate(`/issues/${node.id}`, { state: { from: "/graph" } });
    },
    [navigate],
  );

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
  const colorMode: ColorMode = theme === "dark" ? "dark" : "light";

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="shrink-0 border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-4">
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
            <button
              onClick={handleAutoLayout}
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-border bg-background hover:bg-muted transition-colors"
              title="Re-run Dagre layout (L)"
            >
              Auto Layout
            </button>
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
            nodeTypes={nodeTypes}
            colorMode={colorMode}
            fitView
            fitViewOptions={{ padding: 0.2, maxZoom: 1.5 }}
            minZoom={0.1}
            maxZoom={3}

          >
            <Background />
            <Controls />
            <MiniMap
              nodeStrokeWidth={3}
              pannable
              zoomable
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
    <div className="flex items-center gap-4 px-3 py-2 text-[10px] text-muted-foreground bg-background/80 backdrop-blur-sm rounded-md border border-border">
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
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-full border-4 border-muted border-t-foreground animate-spin" />
        <span className="text-sm text-muted-foreground">Loading dependency graph...</span>
      </div>
    </div>
  );
}
