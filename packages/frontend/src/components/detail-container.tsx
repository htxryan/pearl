import { useEffect, useRef } from "react";
import { IssuePanel } from "@/components/issue-table/issue-panel";
import { useDetailPanel } from "@/hooks/use-detail-panel";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useIsCompact } from "@/hooks/use-media-query";

export function DetailContainer() {
  const { openIssueId, mode, closeDetail, toggleMode } = useDetailPanel();
  const isCompact = useIsCompact();
  const containerRef = useRef<HTMLDivElement>(null);

  const isOpen = openIssueId !== null;
  const isOverlay = mode === "modal" || isCompact;

  useFocusTrap(containerRef, isOpen && isOverlay);

  useEffect(() => {
    if (!isOpen || !isOverlay) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDetail();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, isOverlay, closeDetail]);

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
        <div className="absolute inset-0 bg-black/50" onClick={closeDetail} aria-hidden="true" />
        <div className="absolute inset-4 sm:inset-8 lg:inset-12 bg-background rounded-lg shadow-2xl overflow-hidden animate-modal-enter flex flex-col">
          <IssuePanel
            key={openIssueId}
            issueId={openIssueId}
            onClose={closeDetail}
            onToggleMode={toggleMode}
            currentMode={mode}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-[420px] shrink-0 border-l border-border bg-background overflow-hidden animate-slide-in-right">
      <IssuePanel
        key={openIssueId}
        issueId={openIssueId}
        onClose={closeDetail}
        onToggleMode={toggleMode}
        currentMode={mode}
      />
    </div>
  );
}
