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
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    if (open) {
      setIsMounted(true);
      setSearch("");
      setIssues([]);
      // Trigger entrance animation
      requestAnimationFrame(() => {
        setIsVisible(true);
        inputRef.current?.focus();
      });
    } else {
      setIsVisible(false);
      // Delay unmount until exit transition completes
      const timer = setTimeout(() => setIsMounted(false), 150);
      return () => clearTimeout(timer);
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

  if (!open && !isMounted) return null;

  const showIssues = issues.length > 0 || isSearching;
  const issueHeading = search.trim()
    ? `Issues matching "${search.trim()}"`
    : "Recent issues";

  const groupHeadingClass =
    "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground/70 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider";

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
      {/* Backdrop with blur */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-150 ${isVisible ? "opacity-100" : "opacity-0"}`}
        onClick={closeCommandPalette}
      />

      {/* Palette with spring open / fade close */}
      <Command
        className="relative z-50 w-full max-w-lg overflow-hidden rounded-xl border border-border bg-background shadow-2xl"
        style={{
          animation: isVisible
            ? "cmd-spring-in 250ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards"
            : "cmd-fade-out 150ms ease-in forwards",
        }}
        loop
        shouldFilter={false}
      >
        {/* Search input with icon */}
        <div className="flex items-center gap-2 border-b border-border px-4">
          <svg className="h-4 w-4 shrink-0 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <Command.Input
            ref={inputRef}
            placeholder="Search issues or type a command..."
            value={search}
            onValueChange={setSearch}
            className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <Command.List className="max-h-80 overflow-auto p-2">
          <Command.Empty className="px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">No results found.</p>
            <p className="mt-1 text-xs text-muted-foreground/60">Try a different search term or browse commands below.</p>
          </Command.Empty>

          {/* Issue results */}
          {showIssues && (
            <Command.Group heading={issueHeading} className={groupHeadingClass}>
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
                  <code className="shrink-0 text-[11px] text-muted-foreground/60">
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
            <Command.Group key={group} heading={group} className={groupHeadingClass}>
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
                    <kbd className="ml-auto rounded border border-border bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground/70 font-mono">
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
