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
}: DetailHeaderProps) {
  return (
    <div className="shrink-0 bg-muted/30 px-4 sm:px-6 py-4">
      <div className="flex items-center justify-between gap-4">
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
        <div className="flex items-center gap-2">
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
          <Button
            variant="ghost"
            size="sm"
            onClick={onNavigateBack}
            aria-label="Close detail view"
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
