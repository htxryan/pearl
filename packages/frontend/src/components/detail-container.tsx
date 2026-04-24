import { useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import { IssueDetail } from "@/components/detail/issue-detail";
import { useDetailPanel } from "@/hooks/use-detail-panel";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useIsCompact } from "@/hooks/use-media-query";

export function DetailContainer() {
  const { openIssueId, mode, closeDetail, guardedClose, toggleMode, setCloseGuard } =
    useDetailPanel();
  const isCompact = useIsCompact();
  const navigate = useNavigate();
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);

  const isOpen = openIssueId !== null;
  const isOverlay = mode === "modal" || isCompact;

  useFocusTrap(containerRef, isOpen && isOverlay);

  const handleExpand = useCallback(() => {
    if (!openIssueId) return;
    if (!guardedClose()) return;
    navigate(`/issues/${openIssueId}`, {
      state: { from: location.pathname + location.search },
    });
  }, [openIssueId, guardedClose, navigate, location]);

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
            onExpand={handleExpand}
            onSetCloseGuard={setCloseGuard}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-[420px] shrink-0 border-l border-border bg-background overflow-hidden animate-slide-in-right">
      <IssueDetail
        key={openIssueId}
        id={openIssueId}
        onClose={closeDetail}
        onToggleMode={toggleMode}
        currentMode={mode}
        onExpand={handleExpand}
        onSetCloseGuard={setCloseGuard}
      />
    </div>
  );
}
