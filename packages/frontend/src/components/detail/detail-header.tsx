import type { Issue } from "@pearl/shared";
import { FieldEditor } from "@/components/detail/field-editor";
import { BeadId } from "@/components/ui/bead-id";
import { Button } from "@/components/ui/button";
import { CloseIcon } from "@/components/ui/close-icon";
import { PriorityIndicator } from "@/components/ui/priority-indicator";
import { StatusBadge } from "@/components/ui/status-badge";
import { TypeBadge } from "@/components/ui/type-badge";

interface DetailHeaderProps {
  issue: Issue;
  backLabel: string;
  onNavigateBack: () => void;
  onClaim: () => void;
  onRequestClose: () => void;
  onRequestDelete: () => void;
  isUpdatePending: boolean;
  isClosePending: boolean;
  isDeletePending: boolean;
  onFieldUpdate: (field: string, value: unknown) => void;
  isDirty: boolean;
  dirtyFields: Set<string>;
  /** When provided, shows a mode toggle (panel ↔ modal). Container-mode-specific. */
  onToggleMode?: () => void;
  currentMode?: "panel" | "modal";
  /** When provided, shows an "Expand" button that opens the full-page route. */
  onExpand?: () => void;
}

function MaximizeIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 2h4v4M6 14H2v-4M14 2L9.5 6.5M2 14l4.5-4.5" />
    </svg>
  );
}

function SidebarIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="12" height="12" rx="2" />
      <path d="M10 2v12" />
    </svg>
  );
}

export function DetailHeader({
  issue,
  backLabel,
  onNavigateBack,
  onClaim,
  onRequestClose,
  onRequestDelete,
  isUpdatePending,
  isClosePending,
  isDeletePending,
  onFieldUpdate,
  isDirty,
  dirtyFields,
  onToggleMode,
  currentMode,
  onExpand,
}: DetailHeaderProps) {
  return (
    <div className="shrink-0 bg-muted/30 px-4 sm:px-6 py-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <nav className="flex items-center gap-1.5 text-sm shrink-0" aria-label="Breadcrumb">
            <button
              type="button"
              onClick={onNavigateBack}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {backLabel}
            </button>
            <span className="text-muted-foreground">/</span>
            <BeadId id={issue.id} className="text-muted-foreground" />
          </nav>
          <StatusBadge status={issue.status} />
          <PriorityIndicator priority={issue.priority} />
          <TypeBadge type={issue.issue_type} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {issue.status !== "closed" && (
            <>
              <Button variant="outline" size="sm" onClick={onClaim} disabled={isUpdatePending}>
                Claim
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={onRequestClose}
                disabled={isClosePending}
              >
                Close
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onRequestDelete}
            disabled={isDeletePending}
            className="text-destructive hover:bg-destructive/10 border-destructive/30"
          >
            Delete
          </Button>
          <div className="w-px h-5 bg-border" />
          {onToggleMode && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleMode}
              title={currentMode === "panel" ? "Switch to modal view" : "Switch to panel view"}
              aria-label={currentMode === "panel" ? "Switch to modal view" : "Switch to panel view"}
            >
              {currentMode === "panel" ? <MaximizeIcon /> : <SidebarIcon />}
            </Button>
          )}
          {onExpand && (
            <Button variant="ghost" size="sm" onClick={onExpand} title="Open full detail view">
              Expand
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onNavigateBack}
            aria-label="Close panel"
            title="Close (Esc)"
          >
            <CloseIcon />
          </Button>
        </div>
      </div>

      <FieldEditor
        value={issue.title}
        field="title"
        onSave={(val) => onFieldUpdate("title", val)}
        className="mt-3"
        renderDisplay={(val) => (
          <h1 className="text-2xl font-semibold cursor-pointer hover:text-muted-foreground transition-colors">
            {val}
          </h1>
        )}
      />

      {isDirty && (
        <div className="mt-2 text-xs text-warning-foreground">
          Unsaved changes in: {Array.from(dirtyFields).join(", ")}
        </div>
      )}
    </div>
  );
}
