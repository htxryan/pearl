import { useState } from "react";
import type { Dependency } from "@beads-gui/shared";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useIssue } from "@/hooks/use-issues";

interface DependencyListProps {
  issueId: string;
  dependencies: Dependency[];
  onAdd: (dependsOnId: string) => Promise<unknown>;
  onRemove: (issueId: string, dependsOnId: string) => void;
  isAdding: boolean;
}

export function DependencyList({
  issueId,
  dependencies,
  onAdd,
  onRemove,
  isAdding,
}: DependencyListProps) {
  const [newDepId, setNewDepId] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  // Split into blocking (this issue blocks others) and blocked-by (this issue depends on)
  const blockedBy = dependencies.filter((d) => d.issue_id === issueId);
  const blocking = dependencies.filter((d) => d.depends_on_id === issueId);

  const [addError, setAddError] = useState<string | null>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newDepId.trim();
    if (!trimmed) return;
    setAddError(null);
    onAdd(trimmed)
      .then(() => {
        setNewDepId("");
        setShowAddForm(false);
      })
      .catch(() => {
        setAddError("Failed to add dependency. Check the issue ID and try again.");
      });
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Dependencies ({dependencies.length})
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setShowAddForm(!showAddForm);
            setAddError(null);
          }}
          className="text-xs"
        >
          {showAddForm ? "Cancel" : "+ Add"}
        </Button>
      </div>

      {showAddForm && (
        <>
          <form onSubmit={handleAdd} className="flex items-center gap-2 mb-3">
            <input
              value={newDepId}
              onChange={(e) => setNewDepId(e.target.value)}
              placeholder="Issue ID (e.g., beads-gui-abc)"
              className="flex-1 text-sm bg-transparent border border-border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
            <Button type="submit" size="sm" disabled={!newDepId.trim() || isAdding}>
              {isAdding ? "Adding..." : "Add"}
            </Button>
          </form>
          {addError && (
            <p className="text-xs text-destructive mb-3">{addError}</p>
          )}
        </>
      )}

      {/* Blocked by (depends on) */}
      {blockedBy.length > 0 && (
        <div className="mb-3">
          <h3 className="text-xs font-medium text-muted-foreground mb-1.5">
            Depends on
          </h3>
          <div className="space-y-1.5">
            {blockedBy.map((dep) => (
              <DependencyRow
                key={`${dep.issue_id}-${dep.depends_on_id}`}
                targetId={dep.depends_on_id}
                onRemove={() => onRemove(dep.issue_id, dep.depends_on_id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Blocking (others depend on this) */}
      {blocking.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-muted-foreground mb-1.5">
            Blocks
          </h3>
          <div className="space-y-1.5">
            {blocking.map((dep) => (
              <DependencyRow
                key={`${dep.issue_id}-${dep.depends_on_id}`}
                targetId={dep.issue_id}
                onRemove={() => onRemove(dep.issue_id, dep.depends_on_id)}
              />
            ))}
          </div>
        </div>
      )}

      {dependencies.length === 0 && !showAddForm && (
        <div className="flex flex-col items-center py-6 text-muted-foreground">
          <span className="text-3xl opacity-20 mb-1" aria-hidden="true">&#8644;</span>
          <p className="text-sm">No dependencies. Add one to track blockers.</p>
        </div>
      )}
    </section>
  );
}

function DependencyRow({
  targetId,
  onRemove,
}: {
  targetId: string;
  onRemove: () => void;
}) {
  const { data: issue } = useIssue(targetId);

  return (
    <div className="flex items-center justify-between gap-2 rounded border border-border px-3 py-1.5">
      <div className="flex items-center gap-2 min-w-0">
        <code className="text-xs text-muted-foreground shrink-0">{targetId}</code>
        {issue && (
          <>
            <StatusBadge status={issue.status} />
            <span className="text-sm truncate">{issue.title}</span>
          </>
        )}
      </div>
      <button
        onClick={onRemove}
        className="text-xs text-muted-foreground hover:text-destructive shrink-0"
        title="Remove dependency"
      >
        x
      </button>
    </div>
  );
}
