import { Background, type ColorMode, MiniMap, Panel, ReactFlow } from "@xyflow/react";
import { useCallback } from "react";
import { GraphNode, type GraphNodeType } from "@/components/graph/graph-node";
import { GraphToolbar } from "@/components/graph/graph-toolbar";
import { useTheme } from "@/hooks/use-theme";
import { edgeTypes, GraphControls, GraphSkeleton, Legend } from "@/views/graph-components";
import { statusColors } from "@/views/graph-helpers";
import { useGraphView } from "@/views/use-graph-view";

import "@xyflow/react/dist/style.css";

const nodeTypes = { graphNode: GraphNode };

export function GraphView() {
  const { theme } = useTheme();
  const {
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
  } = useGraphView();

  const minimapNodeColor = useCallback((node: GraphNodeType) => {
    const status = node.data?.issue?.status;
    return (statusColors as Record<string, string>)[status ?? ""] ?? "#6b7280";
  }, []);

  const minimapMaskColor =
    theme.colorScheme === "dark" ? "rgba(0, 0, 0, 0.3)" : "rgba(0, 0, 0, 0.1)";
  const colorMode: ColorMode = theme.colorScheme === "dark" ? "dark" : "light";

  return (
    <div className="flex flex-col h-full">
      <GraphToolbar
        filters={filters}
        onFiltersChange={setFilters}
        searchInputRef={searchInputRef}
        allIssues={allIssues}
        displayIssues={displayIssues}
        isOverCap={isOverCap}
        hasClusters={clusters.size > 0}
        showCriticalPath={showCriticalPath}
        selectedNodeId={selectedNodeId}
        onCollapseAll={handleCollapseAll}
        onExpandAll={handleExpandAll}
        onToggleCriticalPath={handleToggleCriticalPath}
        onAutoLayout={handleAutoLayout}
        onClearSelection={handleClearSelection}
        onOpenDetail={openDetail}
      />

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
            nodesDraggable={false}
            nodesConnectable={false}
            colorMode={colorMode}
            fitView
            fitViewOptions={{ padding: 0.3, minZoom: 0.5, maxZoom: 2 }}
            minZoom={0.3}
            maxZoom={3}
            proOptions={{ hideAttribution: true }}
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
