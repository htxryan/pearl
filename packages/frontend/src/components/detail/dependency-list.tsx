import { useState } from "react";
import type { Dependency } from "@beads-gui/shared";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useIssue } from "@/hooks/use-issues";

interface DependencyListProps {
  issueId: string;
  dependencies: Dependency[];
  onAdd: (dependsOnId: string) => void;
  onRemove: (dependsOnId: string) => void;
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

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newDepId.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setNewDepId("");
    setShowAddForm(false);
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
          onClick={() => setShowAddForm(!showAddForm)}
          className="text-xs"
        >
          {showAddForm ? "Cancel" : "+ Add"}
        </Button>
      </div>

      {showAddForm && (
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
                onRemove={() => onRemove(dep.depends_on_id)}
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
                onRemove={() => onRemove(dep.issue_id)}
              />
            ))}
          </div>
        </div>
      )}

      {dependencies.length === 0 && !showAddForm && (
        <p className="text-sm text-muted-foreground">No dependencies.</p>
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
