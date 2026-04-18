import type { Dependency, IssueListItem } from "@pearl/shared";
import {
  Background,
  type ColorMode,
  type Edge,
  MiniMap,
  type NodeMouseHandler,
  Panel,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { GraphNode, type GraphNodeType } from "@/components/graph/graph-node";
import { EMPTY_FILTERS, FilterBar } from "@/components/issue-table/filter-bar";
import { Button } from "@/components/ui/button";
import { type CommandAction, useCommandPaletteActions } from "@/hooks/use-command-palette";
import { useAllDependencies } from "@/hooks/use-dependencies";
import { useIssues } from "@/hooks/use-issues";
import { useKeyboardScope } from "@/hooks/use-keyboard-scope";
import { useIsMobile } from "@/hooks/use-media-query";
import { useTheme } from "@/hooks/use-theme";
import { buildApiParams, useUrlFilters } from "@/hooks/use-url-filters";
import { edgeTypes, GraphControls, GraphSkeleton, Legend } from "@/views/graph-components";
import {
  computeClusters,
  computeLayout,
  findBlockingChain,
  findCriticalPath,
  getSubgraph,
  PERFORMANCE_CAP,
  statusColors,
} from "@/views/graph-helpers";

import "@xyflow/react/dist/style.css";

// ─── Node Types (stable ref) ──────────────────────────

const nodeTypes = { graphNode: GraphNode };

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
  const clusters = useMemo(() => computeClusters(displayIssues, allDeps), [displayIssues, allDeps]);

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
    return displayIssues.filter((i) => !hiddenIds.has(i.id));
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
    () =>
      computeLayout(
        visibleIssues,
        visibleDeps,
        highlightedIds,
        selectedNodeId,
        criticalPathEdges,
        collapsedEpicChildCounts,
      ),
    [
      visibleIssues,
      visibleDeps,
      highlightedIds,
      selectedNodeId,
      criticalPathEdges,
      collapsedEpicChildCounts,
    ],
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
    const result = computeLayout(
      visibleIssues,
      visibleDeps,
      highlightedIds,
      selectedNodeId,
      criticalPathEdges,
      collapsedEpicChildCounts,
    );
    setNodesRef.current(result.nodes);
    setEdgesRef.current(result.edges);
  }, [
    visibleIssues,
    visibleDeps,
    highlightedIds,
    selectedNodeId,
    criticalPathEdges,
    collapsedEpicChildCounts,
  ]);

  // Pane click → clear selection
  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  // Node click → select for highlight
  const handleNodeClick: NodeMouseHandler<GraphNodeType> = useCallback((_event, node) => {
    setSelectedNodeId((prev) => (prev === node.id ? null : node.id));
  }, []);

  // Double-click → toggle cluster for epics, navigate for others
  const handleNodeDoubleClick: NodeMouseHandler<GraphNodeType> = useCallback(
    (_event, node) => {
      const cluster = clusters.get(node.id);
      if (cluster) {
        setCollapsedClusters((prev) => {
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
        handler: () => setShowCriticalPath((prev) => !prev),
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
        handler: () => setShowCriticalPath((prev) => !prev),
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
          <FilterBar filters={filters} onChange={setFilters} searchInputRef={searchInputRef} />
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
              onClick={() => setShowCriticalPath((prev) => !prev)}
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
            <span className="text-5xl opacity-20" aria-hidden="true">
              &#9737;
            </span>
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
            fitViewOptions={{ padding: 0.3, minZoom: 0.5, maxZoom: 2 }}
            minZoom={0.3}
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
                backgroundColor: "var(--color-surface, var(--color-muted))",
                borderRadius: "var(--radius)",
                border: "1px solid var(--color-border)",
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
