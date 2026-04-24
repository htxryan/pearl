import type { Dependency } from "@pearl/shared";
import type { Edge, NodeMouseHandler } from "@xyflow/react";
import { useEdgesState, useNodesState } from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GraphNodeType } from "@/components/graph/graph-node";
import { SHOW_ALL_FILTERS } from "@/components/issue-table/filter-bar";
import { type CommandAction, useCommandPaletteActions } from "@/hooks/use-command-palette";
import { useAllDependencies } from "@/hooks/use-dependencies";
import { useDetailPanel } from "@/hooks/use-detail-panel";
import { useIssues } from "@/hooks/use-issues";
import { useKeyboardScope } from "@/hooks/use-keyboard-scope";
import { buildApiParams, useUrlFilters } from "@/hooks/use-url-filters";
import {
  computeClusters,
  computeLayout,
  findBlockingChain,
  findCriticalPath,
  getSubgraph,
  PERFORMANCE_CAP,
} from "@/views/graph-helpers";

export function useGraphView() {
  const { openDetail } = useDetailPanel();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { filters, setFilters } = useUrlFilters();
  const apiParams = useMemo(
    () => buildApiParams(filters, [{ id: "priority", desc: false }]),
    [filters],
  );

  const { data: allIssues = [], isLoading: issuesLoading } = useIssues(apiParams);
  const { data: allDeps = [], isLoading: depsLoading } = useAllDependencies();
  const isLoading = issuesLoading || depsLoading;

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showCriticalPath, setShowCriticalPath] = useState(false);
  const [collapsedClusters, setCollapsedClusters] = useState<Set<string>>(new Set());

  const allIssueIds = useMemo(() => new Set(allIssues.map((i) => i.id)), [allIssues]);
  useEffect(() => {
    if (selectedNodeId && !allIssueIds.has(selectedNodeId)) setSelectedNodeId(null);
  }, [selectedNodeId, allIssueIds]);

  const isOverCap = allIssues.length > PERFORMANCE_CAP;
  const displayIssues = useMemo(
    () => getSubgraph(allIssues, allDeps, selectedNodeId, PERFORMANCE_CAP),
    [allIssues, allDeps, selectedNodeId],
  );

  const clusters = useMemo(() => computeClusters(displayIssues, allDeps), [displayIssues, allDeps]);

  const visibleIssues = useMemo(() => {
    if (collapsedClusters.size === 0) return displayIssues;
    const hiddenIds = new Set<string>();
    for (const epicId of collapsedClusters) {
      const cluster = clusters.get(epicId);
      if (cluster) {
        for (const childId of cluster.childIds) hiddenIds.add(childId);
      }
    }
    return displayIssues.filter((i) => !hiddenIds.has(i.id));
  }, [displayIssues, collapsedClusters, clusters]);

  const visibleIssueIds = useMemo(() => new Set(visibleIssues.map((i) => i.id)), [visibleIssues]);
  useEffect(() => {
    if (selectedNodeId && !visibleIssueIds.has(selectedNodeId)) setSelectedNodeId(null);
  }, [selectedNodeId, visibleIssueIds]);

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
      if (dep.type === "contains") continue;
      const newIssueId = srcHidden ? childToEpic.get(dep.issue_id)! : dep.issue_id;
      const newDependsOnId = tgtHidden ? childToEpic.get(dep.depends_on_id)! : dep.depends_on_id;
      if (newIssueId === newDependsOnId) continue;
      const key = `${newIssueId}-${dep.type}-${newDependsOnId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({ ...dep, issue_id: newIssueId, depends_on_id: newDependsOnId });
    }
    return result;
  }, [allDeps, collapsedClusters, clusters]);

  const collapsedEpicChildCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const epicId of collapsedClusters) {
      const cluster = clusters.get(epicId);
      if (cluster) counts.set(epicId, cluster.childIds.length);
    }
    return counts;
  }, [collapsedClusters, clusters]);

  const highlightedIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    return findBlockingChain(selectedNodeId, allDeps);
  }, [selectedNodeId, allDeps]);

  const criticalPathEdges = useMemo(() => {
    if (!showCriticalPath) return new Set<string>();
    return findCriticalPath(visibleIssues, visibleDeps);
  }, [showCriticalPath, visibleIssues, visibleDeps]);

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

  const [nodes, setNodes, onNodesChange] = useNodesState<GraphNodeType>(layoutResult.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(layoutResult.edges);

  const setNodesRef = useRef(setNodes);
  const setEdgesRef = useRef(setEdges);
  setNodesRef.current = setNodes;
  setEdgesRef.current = setEdges;

  const prevLayoutRef = useRef(layoutResult);
  useEffect(() => {
    if (prevLayoutRef.current !== layoutResult) {
      prevLayoutRef.current = layoutResult;
      setNodesRef.current(layoutResult.nodes);
      setEdgesRef.current(layoutResult.edges);
    }
  }, [layoutResult]);

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

  const handlePaneClick = useCallback(() => setSelectedNodeId(null), []);

  const handleNodeClick: NodeMouseHandler<GraphNodeType> = useCallback((_event, node) => {
    setSelectedNodeId((prev) => (prev === node.id ? null : node.id));
  }, []);

  const handleNodeDoubleClick: NodeMouseHandler<GraphNodeType> = useCallback(
    (_event, node) => {
      const cluster = clusters.get(node.id);
      if (cluster) {
        setCollapsedClusters((prev) => {
          const next = new Set(prev);
          if (next.has(node.id)) next.delete(node.id);
          else next.add(node.id);
          return next;
        });
      } else {
        openDetail(node.id);
      }
    },
    [openDetail, clusters],
  );

  const handleCollapseAll = useCallback(
    () => setCollapsedClusters(new Set(clusters.keys())),
    [clusters],
  );
  const handleExpandAll = useCallback(() => setCollapsedClusters(new Set()), []);
  const handleToggleCriticalPath = useCallback(() => setShowCriticalPath((prev) => !prev), []);
  const handleClearSelection = useCallback(() => setSelectedNodeId(null), []);

  const keyBindings = useMemo(
    () => [
      { key: "/", handler: () => searchInputRef.current?.focus(), description: "Focus search" },
      { key: "Escape", handler: handleClearSelection, description: "Clear selection" },
      { key: "l", handler: handleAutoLayout, description: "Re-run auto layout" },
      { key: "p", handler: handleToggleCriticalPath, description: "Toggle critical path" },
    ],
    [handleAutoLayout, handleClearSelection, handleToggleCriticalPath],
  );
  useKeyboardScope("graph", keyBindings);

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
        handler: () => setFiltersRef.current(SHOW_ALL_FILTERS),
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

  return {
    searchInputRef,
    filters,
    setFilters,
    allIssues,
    displayIssues,
    isLoading,
    isOverCap,
    clusters,
    selectedNodeId,
    showCriticalPath,
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    handleAutoLayout,
    handlePaneClick,
    handleNodeClick,
    handleNodeDoubleClick,
    handleCollapseAll,
    handleExpandAll,
    handleToggleCriticalPath,
    handleClearSelection,
    openDetail,
  };
}
