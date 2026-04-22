import type { IssueListItem } from "@pearl/shared";
import { Command } from "cmdk";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { BeadId } from "@/components/ui/bead-id";
import { PriorityIndicator } from "@/components/ui/priority-indicator";
import { StatusBadge } from "@/components/ui/status-badge";
import { closeSearchPalette, useSearchPaletteOpen } from "@/hooks/use-command-palette";
import { useMediaQuery } from "@/hooks/use-media-query";
import * as api from "@/lib/api-client";

export function SearchPalette() {
  const open = useSearchPaletteOpen();
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [issues, setIssues] = useState<IssueListItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isVisible, setIsVisible] = useState<boolean | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (open) {
      setIsMounted(true);
      setSearch("");
      setIssues([]);
      setIsSearching(false);
      abortRef.current?.abort();
      abortRef.current = null;
      requestAnimationFrame(() => {
        setIsVisible(true);
        inputRef.current?.focus();
      });
    } else {
      abortRef.current?.abort();
      abortRef.current = null;
      if (isVisible !== null) setIsVisible(false);
      const timer = setTimeout(() => setIsMounted(false), 150);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      setIssues([]);
      return;
    }

    setIsSearching(true);

    const timer = setTimeout(
      () => {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        const params = new URLSearchParams();
        if (search.trim()) {
          params.set("search", search.trim());
        }
        params.set("sort", "updated_at");
        params.set("direction", "desc");
        params.set("limit", "10");

        api
          .fetchIssues(params)
          .then((results) => {
            if (!controller.signal.aborted) {
              setIssues(results.slice(0, 10));
              setIsSearching(false);
            }
          })
          .catch(() => {
            if (!controller.signal.aborted) {
              setIssues([]);
              setIsSearching(false);
            }
          });
      },
      search ? 200 : 0,
    );

    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, [open, search]);

  const handleIssueSelect = (id: string) => {
    closeSearchPalette();
    navigate(`/issues/${id}`);
  };

  if (!open && !isMounted) return null;

  const issueHeading = search.trim() ? `Issues matching "${search.trim()}"` : "Recent issues";

  const groupHeadingClass =
    "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground/70 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Search issues"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          closeSearchPalette();
        }
      }}
    >
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-150 ${isVisible ? "opacity-100" : "opacity-0"}`}
        onClick={closeSearchPalette}
      />

      <Command
        className="relative z-50 w-full max-w-lg overflow-hidden rounded-xl border border-border bg-background shadow-2xl"
        style={{
          animation:
            prefersReducedMotion || isVisible === null
              ? "none"
              : isVisible
                ? "cmd-spring-in 250ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards"
                : "cmd-fade-out 150ms ease-in forwards",
        }}
        loop
        shouldFilter={false}
      >
        <div className="flex items-center gap-2 border-b border-border px-4">
          <svg
            className="h-4 w-4 shrink-0 text-muted-foreground"
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
          <Command.Input
            ref={inputRef}
            placeholder="Search issues..."
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
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <Command.List className="max-h-80 overflow-auto p-2">
          {!isSearching && (
            <Command.Empty className="px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">No issues found.</p>
              <p className="mt-1 text-xs text-muted-foreground/60">Try a different search term.</p>
            </Command.Empty>
          )}

          <Command.Group heading={issueHeading} className={groupHeadingClass}>
            {isSearching && issues.length === 0 && (
              <div className="px-2 py-2 text-sm text-muted-foreground">Searching...</div>
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
                <BeadId id={issue.id} className="shrink-0 text-[11px] text-muted-foreground/60" />
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}
