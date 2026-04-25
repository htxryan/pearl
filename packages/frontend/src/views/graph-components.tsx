import { BaseEdge, type EdgeProps, getBezierPath, Panel, useReactFlow } from "@xyflow/react";
import { Maximize, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// ─── Custom Edge with hover label ────────────────────

export function HoverLabelEdge({
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

export const edgeTypes = { hoverLabel: HoverLabelEdge };

// ─── Graph Controls ───────────────────────────────────

export function GraphControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <Panel position="top-right">
      <div className="flex flex-col gap-1 bg-background/80 backdrop-blur-sm rounded-lg border border-border p-1 shadow-sm">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="outline"
                size="icon-sm"
                className="h-8 w-8"
                onClick={() => zoomIn()}
                aria-label="Zoom in"
              />
            }
          >
            <ZoomIn size={14} />
          </TooltipTrigger>
          <TooltipContent>Zoom in</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="outline"
                size="icon-sm"
                className="h-8 w-8"
                onClick={() => zoomOut()}
                aria-label="Zoom out"
              />
            }
          >
            <ZoomOut size={14} />
          </TooltipTrigger>
          <TooltipContent>Zoom out</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="outline"
                size="icon-sm"
                className="h-8 w-8"
                onClick={() => fitView({ padding: 0.3, minZoom: 0.5, maxZoom: 2 })}
                aria-label="Fit view"
              />
            }
          >
            <Maximize size={14} />
          </TooltipTrigger>
          <TooltipContent>Fit view</TooltipContent>
        </Tooltip>
      </div>
    </Panel>
  );
}

// ─── Legend ─────────────────────────────────────────────

export function Legend() {
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
        <span className="inline-block w-4 h-0.5 border-t-2 border-dashed border-purple-500" />{" "}
        relates
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block w-4 h-0.5 border-t-2 border-dashed border-gray-500" />{" "}
        discovered
      </span>
    </div>
  );
}

// ─── Skeleton ──────────────────────────────────────────

export function GraphSkeleton() {
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
          <div
            className="absolute skeleton-shimmer rounded"
            style={{ left: 80, top: 8, width: 40, height: 24 }}
          />
          <div
            className="absolute skeleton-shimmer rounded"
            style={{ left: 30, top: 48, width: 40, height: 24 }}
          />
          <div
            className="absolute skeleton-shimmer rounded"
            style={{ left: 130, top: 48, width: 40, height: 24 }}
          />
          <div
            className="absolute skeleton-shimmer rounded"
            style={{ left: 60, top: 88, width: 40, height: 24 }}
          />
          <div
            className="absolute skeleton-shimmer rounded"
            style={{ left: 100, top: 88, width: 40, height: 24 }}
          />
        </div>
        <span className="text-sm text-muted-foreground">Loading dependency graph...</span>
      </div>
    </div>
  );
}
