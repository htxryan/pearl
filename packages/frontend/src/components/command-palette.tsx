import { Command } from "cmdk";
import {
  useCommandPaletteOpen,
  closeCommandPalette,
  useAllCommandActions,
} from "@/hooks/use-command-palette";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import type { IssueListItem } from "@beads-gui/shared";
import * as api from "@/lib/api-client";
import { StatusBadge } from "@/components/ui/status-badge";
import { PriorityIndicator } from "@/components/ui/priority-indicator";

export function CommandPalette() {
  const open = useCommandPaletteOpen();
  const actions = useAllCommandActions();
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [issues, setIssues] = useState<IssueListItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (open) {
      setSearch("");
      setIssues([]);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Fetch issues when search text changes (debounced)
  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const params = new URLSearchParams();
        if (search.trim()) {
          params.set("search", search.trim());
        }
        // Show recent issues by default, or search results
        params.set("sort", "updated_at");
        params.set("direction", "desc");
        const results = await api.fetchIssues(params);
        setIssues(results.slice(0, 10));
      } catch {
        // Silently fail — command palette still shows actions
        setIssues([]);
      } finally {
        setIsSearching(false);
      }
    }, search ? 200 : 0); // No delay for initial load, 200ms debounce for search

    return () => clearTimeout(timer);
  }, [open, search]);

  // Group actions by group field (memoized)
  const groups = useMemo(() => {
    const grouped = new Map<string, typeof actions>();
    for (const action of actions) {
      const group = action.group ?? "Actions";
      const existing = grouped.get(group) ?? [];
      existing.push(action);
      grouped.set(group, existing);
    }
    return grouped;
  }, [actions]);

  const handleIssueSelect = (id: string) => {
    closeCommandPalette();
    navigate(`/issues/${id}`);
  };

  if (!open) return null;

  const showIssues = issues.length > 0 || isSearching;
  const issueHeading = search.trim()
    ? `Issues matching "${search.trim()}"`
    : "Recent issues";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          closeCommandPalette();
        }
      }}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={closeCommandPalette} />

      {/* Palette */}
      <Command
        className="relative z-50 w-full max-w-lg overflow-hidden rounded-xl border border-border bg-background shadow-2xl"
        loop
        shouldFilter={false}
      >
        <Command.Input
          ref={inputRef}
          placeholder="Search issues or type a command..."
          value={search}
          onValueChange={setSearch}
          className="w-full border-b border-border bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
        />
        <Command.List className="max-h-80 overflow-auto p-2">
          <Command.Empty className="px-4 py-6 text-center text-sm text-muted-foreground">
            No results found.
          </Command.Empty>

          {/* Issue results */}
          {showIssues && (
            <Command.Group
              heading={issueHeading}
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
            >
              {isSearching && issues.length === 0 && (
                <div className="px-2 py-2 text-sm text-muted-foreground">
                  Searching...
                </div>
              )}
              {issues.map((issue) => (
                <Command.Item
                  key={issue.id}
                  value={`${issue.id} ${issue.title}`}
                  onSelect={() => handleIssueSelect(issue.id)}
                  className="flex cursor-pointer items-center gap-2 rounded-[var(--radius)] px-2 py-2 text-sm transition-colors duration-100 aria-selected:bg-accent aria-selected:text-accent-foreground"
                >
                  <PriorityIndicator priority={issue.priority} />
                  <StatusBadge status={issue.status} />
                  <span className="truncate flex-1">{issue.title}</span>
                  <code className="shrink-0 text-xs text-muted-foreground">
                    {issue.id}
                  </code>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {/* Command groups */}
          {[...groups.entries()].map(([group, groupActions]) => {
            const searchLower = search.trim().toLowerCase();
            const filtered = searchLower
              ? groupActions.filter((a) => a.label.toLowerCase().includes(searchLower))
              : groupActions;
            if (filtered.length === 0) return null;
            return (
            <Command.Group
              key={group}
              heading={group}
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
            >
              {filtered.map((action) => (
                <Command.Item
                  key={action.id}
                  value={action.label}
                  onSelect={() => {
                    closeCommandPalette();
                    action.handler();
                  }}
                  className="flex cursor-pointer items-center justify-between rounded-[var(--radius)] px-2 py-2 text-sm transition-colors duration-100 aria-selected:bg-accent aria-selected:text-accent-foreground"
                >
                  <span>{action.label}</span>
                  {action.shortcut && (
                    <kbd className="ml-auto rounded border border-border bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                      {action.shortcut}
                    </kbd>
                  )}
                </Command.Item>
              ))}
            </Command.Group>
            );
          })}
        </Command.List>
      </Command>
    </div>
  );
}
