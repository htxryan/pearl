import type { RefObject } from "react";
import { IssuePanel } from "@/components/issue-table/issue-panel";

interface ListPanelOverlayProps {
  panelIssueId: string;
  slideOverRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
}

export function ListPanelOverlay({ panelIssueId, slideOverRef, onClose }: ListPanelOverlayProps) {
  return (
    <div
      ref={slideOverRef}
      className="fixed inset-0 z-40"
      role="dialog"
      aria-modal="true"
      aria-label="Issue detail panel"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="absolute inset-y-0 right-0 w-full max-w-md bg-background shadow-lg overflow-hidden animate-slide-in-right">
        <IssuePanel key={panelIssueId} issueId={panelIssueId} onClose={onClose} />
      </div>
    </div>
  );
}

interface ListSidePanelProps {
  panelIssueId: string;
  onClose: () => void;
}

export function ListSidePanel({ panelIssueId, onClose }: ListSidePanelProps) {
  return (
    <div className="w-[420px] shrink-0 border-l border-border bg-background overflow-hidden">
      <IssuePanel key={panelIssueId} issueId={panelIssueId} onClose={onClose} />
    </div>
  );
}
