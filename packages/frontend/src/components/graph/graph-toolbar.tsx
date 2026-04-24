import type { IssueListItem } from "@pearl/shared";
import type { RefObject } from "react";
import type { FilterState } from "@/components/issue-table/filter-bar";
import { FilterBar } from "@/components/issue-table/filter-bar";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-media-query";

interface GraphToolbarProps {
  filters: FilterState;
  onFiltersChange: (f: FilterState) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  allIssues: IssueListItem[];
  displayIssues: IssueListItem[];
  isOverCap: boolean;
  hasClusters: boolean;
  showCriticalPath: boolean;
  selectedNodeId: string | null;
  onCollapseAll: () => void;
  onExpandAll: () => void;
  onToggleCriticalPath: () => void;
  onAutoLayout: () => void;
  onClearSelection: () => void;
  onOpenDetail: (id: string) => void;
}

export function GraphToolbar({
  filters,
  onFiltersChange,
  searchInputRef,
  allIssues,
  displayIssues,
  isOverCap,
  hasClusters,
  showCriticalPath,
  selectedNodeId,
  onCollapseAll,
  onExpandAll,
  onToggleCriticalPath,
  onAutoLayout,
  onClearSelection,
  onOpenDetail,
}: GraphToolbarProps) {
  const isMobile = useIsMobile();

  return (
    <div className="shrink-0 bg-muted/30 px-4 py-3">
      <div className={`flex gap-4 ${isMobile ? "flex-col" : "items-center justify-between"}`}>
        <FilterBar
          filters={filters}
          onChange={onFiltersChange}
          searchInputRef={searchInputRef}
          hideGroupBy
        />
        <div className="flex items-center gap-2 shrink-0">
          {isOverCap && (
            <span className="text-xs text-muted-foreground">
              Showing {displayIssues.length} of {allIssues.length} issues
            </span>
          )}
          {hasClusters && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={onCollapseAll}
                className="min-h-[44px] md:min-h-0"
                title="Collapse all clusters"
              >
                Collapse
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onExpandAll}
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
            onClick={onToggleCriticalPath}
            className="min-h-[44px] md:min-h-0"
            title="Show critical path (C)"
          >
            Critical Path
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onAutoLayout}
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
            type="button"
            onClick={onClearSelection}
            className="text-xs underline hover:text-foreground"
          >
            Clear
          </button>
          <span className="text-border">|</span>
          <button
            type="button"
            onClick={() => onOpenDetail(selectedNodeId)}
            className="text-xs underline hover:text-foreground"
          >
            Open detail
          </button>
        </div>
      )}
    </div>
  );
}
