import { useCallback, useEffect, useRef } from "react";
import { IssueDetail } from "@/components/detail/issue-detail";
import { useDetailPanel } from "@/hooks/use-detail-panel";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useIsCompact } from "@/hooks/use-media-query";
import { usePersistedState } from "@/hooks/use-persisted-state";

const PANEL_WIDTH_KEY = "detailPanel.width";
export const DEFAULT_PANEL_WIDTH = 420;
export const MIN_PANEL_WIDTH = 300;
export const MAX_PANEL_WIDTH = 800;

function usePanelWidth() {
  const [rawWidth, setRawWidth] = usePersistedState<number>(PANEL_WIDTH_KEY, DEFAULT_PANEL_WIDTH);
  const clamp = useCallback(
    (v: number) => Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, v)),
    [],
  );
  const width =
    typeof rawWidth === "number" && Number.isFinite(rawWidth)
      ? clamp(rawWidth)
      : DEFAULT_PANEL_WIDTH;
  const setWidth = useCallback((v: number) => setRawWidth(clamp(v)), [setRawWidth, clamp]);
  return { width, setWidth };
}

export function DetailContainer() {
  const { openIssueId, mode, closeDetail, guardedClose, toggleMode, setCloseGuard } =
    useDetailPanel();
  const isCompact = useIsCompact();
  const containerRef = useRef<HTMLDivElement>(null);
  const { width, setWidth } = usePanelWidth();
  const widthRef = useRef(width);
  widthRef.current = width;
  const isDraggingRef = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  const isOpen = openIssueId !== null;
  const isOverlay = mode === "modal" || isCompact;

  useFocusTrap(containerRef, isOpen && isOverlay);

  const onDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDraggingRef.current = true;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const startX = e.clientX;
      const startWidth = widthRef.current;

      const onMove = (ev: MouseEvent) => {
        if (!isDraggingRef.current) return;
        const delta = startX - ev.clientX;
        const next = Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, startWidth + delta));
        setWidth(next);
      };
      const onUp = () => {
        isDraggingRef.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        cleanupRef.current = null;
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
      cleanupRef.current = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
    },
    [setWidth],
  );

  useEffect(() => {
    return () => {
      if (isDraggingRef.current) {
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
      cleanupRef.current?.();
    };
  }, []);

  if (!isOpen || !openIssueId) return null;

  if (mode === "modal" || isCompact) {
    return (
      <div
        ref={containerRef}
        className="fixed inset-0 z-50"
        role="dialog"
        aria-modal="true"
        aria-label="Issue detail"
      >
        <div
          className="absolute inset-0 bg-black/50"
          onClick={() => guardedClose()}
          aria-hidden="true"
        />
        <div className="absolute inset-4 sm:inset-8 lg:inset-12 bg-background rounded-lg shadow-2xl overflow-hidden animate-modal-enter flex flex-col">
          <IssueDetail
            key={openIssueId}
            id={openIssueId}
            onClose={closeDetail}
            onToggleMode={toggleMode}
            currentMode={mode}
            onSetCloseGuard={setCloseGuard}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="detail-panel"
      className="relative shrink-0 border-l border-border bg-background animate-slide-in-right"
      style={{ width: `${width}px` }}
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize detail panel"
        aria-valuemin={MIN_PANEL_WIDTH}
        aria-valuemax={MAX_PANEL_WIDTH}
        aria-valuenow={width}
        tabIndex={0}
        onMouseDown={onDragStart}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 40 : 10;
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            setWidth(Math.min(MAX_PANEL_WIDTH, width + step));
          } else if (e.key === "ArrowRight") {
            e.preventDefault();
            setWidth(Math.max(MIN_PANEL_WIDTH, width - step));
          }
        }}
        className="absolute left-0 top-0 bottom-0 w-4 -translate-x-1/2 cursor-col-resize z-10 flex items-stretch justify-center group"
      >
        <div className="w-0.5 group-hover:bg-primary/40 group-active:bg-primary/60 transition-colors" />
      </div>
      <div className="overflow-hidden h-full">
        <IssueDetail
          key={openIssueId}
          id={openIssueId}
          onClose={closeDetail}
          onToggleMode={toggleMode}
          currentMode={mode}
          onSetCloseGuard={setCloseGuard}
          forceInlineMetadata
        />
      </div>
    </div>
  );
}
