import type { IssueListItem } from "@pearl/shared";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { BeadId } from "@/components/ui/bead-id";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { PriorityIndicator } from "@/components/ui/priority-indicator";
import { StatusBadge } from "@/components/ui/status-badge";
import { closeSearchPalette, useSearchPaletteOpen } from "@/hooks/use-command-palette";
import { useMediaQuery } from "@/hooks/use-media-query";
import * as api from "@/lib/api-client";
import { getRecencyMap, markIssueOpened, sortByRecency } from "@/lib/issue-recency";

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
        const isEmptyQuery = !search.trim();
        if (search.trim()) {
          params.set("search", search.trim());
        }
        params.set("sort", "updated_at");
        params.set("direction", "desc");
        params.set("limit", isEmptyQuery ? "100" : "10");

        api
          .fetchIssues(params)
          .then((results) => {
            if (!controller.signal.aborted) {
              const ranked = isEmptyQuery
                ? sortByRecency(results, getRecencyMap()).slice(0, 10)
                : results.slice(0, 10);
              setIssues(ranked);
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
    markIssueOpened(id);
    closeSearchPalette();
    navigate(`/issues/${id}`);
  };

  if (!open && !isMounted) return null;

  const issueHeading = search.trim() ? `Issues matching "${search.trim()}"` : "Recent issues";

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
        className="relative z-50 w-full max-w-lg overflow-hidden border border-border shadow-2xl"
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
          <CommandInput
            ref={inputRef}
            placeholder="Search issues..."
            value={search}
            onValueChange={setSearch}
          />
          {search && (
            <button
              type="button"
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

        <CommandList>
          {!isSearching && (
            <CommandEmpty>
              <p>No issues found.</p>
              <p className="mt-1 text-xs text-muted-foreground/60">Try a different search term.</p>
            </CommandEmpty>
          )}

          <CommandGroup heading={issueHeading}>
            {isSearching && issues.length === 0 && (
              <div className="px-2 py-2 text-sm text-muted-foreground">Searching...</div>
            )}
            {issues.map((issue) => (
              <CommandItem
                key={issue.id}
                value={`${issue.id} ${issue.title}`}
                className="gap-2"
                onSelect={() => handleIssueSelect(issue.id)}
              >
                <PriorityIndicator priority={issue.priority} />
                <StatusBadge status={issue.status} />
                <span className="truncate flex-1">{issue.title}</span>
                <BeadId
                  id={issue.id}
                  interactive={false}
                  className="shrink-0 text-[11px] text-muted-foreground/60"
                />
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
}
