import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { Dependency, IssueListItem } from "@beads-gui/shared";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { PriorityIndicator } from "@/components/ui/priority-indicator";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useIssue } from "@/hooks/use-issues";
import * as api from "@/lib/api-client";

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
  const [showAddForm, setShowAddForm] = useState(false);

  // Split into blocking (this issue blocks others) and blocked-by (this issue depends on)
  const blockedBy = dependencies.filter((d) => d.issue_id === issueId);
  const blocking = dependencies.filter((d) => d.depends_on_id === issueId);

  const [addError, setAddError] = useState<string | null>(null);

  const handleAdd = (selectedId: string) => {
    setAddError(null);
    onAdd(selectedId)
      .then(() => {
        setShowAddForm(false);
      })
      .catch(() => {
        setAddError("Failed to add dependency. Check the issue ID and try again.");
      });
  };

  // IDs already linked as dependencies (both directions) + self
  const excludedIds = useMemo(() => {
    const ids = new Set<string>([issueId]);
    for (const d of dependencies) {
      ids.add(d.issue_id);
      ids.add(d.depends_on_id);
    }
    return ids;
  }, [issueId, dependencies]);

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest">
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
          <DependencyAutocomplete
            excludedIds={excludedIds}
            onSelect={handleAdd}
            isAdding={isAdding}
          />
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

function DependencyAutocomplete({
  excludedIds,
  onSelect,
  isAdding,
}: {
  excludedIds: Set<string>;
  onSelect: (issueId: string) => void;
  isAdding: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<IssueListItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        params.set("search", trimmed);
        params.set("sort", "updated_at");
        params.set("direction", "desc");
        params.set("limit", "20");
        params.set("fields", "id,title,status,priority,issue_type,assignee,owner,created_at,updated_at,due_at,pinned,labels");
        const issues = await api.fetchIssues(params);
        const filtered = issues.filter((i) => !excludedIds.has(i.id));
        setResults(filtered.slice(0, 8));
        setHighlightIndex(filtered.length > 0 ? 0 : -1);
        setIsOpen(true);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, excludedIds]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex < 0 || !listRef.current) return;
    const item = listRef.current.children[highlightIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [highlightIndex]);

  const handleSelect = useCallback(
    (id: string) => {
      onSelect(id);
      setQuery("");
      setResults([]);
      setIsOpen(false);
    },
    [onSelect],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightIndex((prev) => (prev + 1) % results.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightIndex((prev) => (prev - 1 + results.length) % results.length);
        break;
      case "Enter":
        e.preventDefault();
        if (highlightIndex >= 0 && highlightIndex < results.length) {
          handleSelect(results[highlightIndex].id);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative mb-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <svg
            className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (results.length > 0) setIsOpen(true);
            }}
            placeholder="Search issues by title or ID..."
            className="w-full text-sm bg-transparent border border-border rounded pl-7 pr-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
            autoFocus
            disabled={isAdding}
            role="combobox"
            aria-expanded={isOpen}
            aria-autocomplete="list"
            aria-controls="dep-autocomplete-list"
            aria-activedescendant={
              highlightIndex >= 0 ? `dep-option-${highlightIndex}` : undefined
            }
          />
          {isSearching && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
            </div>
          )}
        </div>
      </div>

      {/* Dropdown results */}
      {isOpen && (
        <div
          ref={listRef}
          id="dep-autocomplete-list"
          role="listbox"
          className="absolute z-50 mt-1 w-full max-h-64 overflow-auto rounded-lg border border-border bg-background shadow-lg"
        >
          {results.length === 0 && !isSearching && query.trim() && (
            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
              No matching issues found.
            </div>
          )}
          {results.map((issue, i) => (
            <button
              key={issue.id}
              id={`dep-option-${i}`}
              role="option"
              aria-selected={i === highlightIndex}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                i === highlightIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50"
              }`}
              onMouseEnter={() => setHighlightIndex(i)}
              onClick={() => handleSelect(issue.id)}
            >
              <PriorityIndicator priority={issue.priority} />
              <StatusBadge status={issue.status} />
              <span className="truncate flex-1">{issue.title}</span>
              <code className="shrink-0 text-[11px] text-muted-foreground/60">
                {issue.id}
              </code>
            </button>
          ))}
        </div>
      )}
    </div>
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
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <>
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
          onClick={() => setShowConfirm(true)}
          className="text-xs text-muted-foreground hover:text-destructive shrink-0"
          title="Remove dependency"
        >
          x
        </button>
      </div>
      <ConfirmDialog
        isOpen={showConfirm}
        onConfirm={() => {
          setShowConfirm(false);
          onRemove();
        }}
        onCancel={() => setShowConfirm(false)}
        title="Remove dependency?"
        description={`Remove the dependency link to ${issue?.title ?? targetId}?`}
        confirmLabel="Remove"
      />
    </>
  );
}
