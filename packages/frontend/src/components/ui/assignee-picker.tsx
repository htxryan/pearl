import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { IssueListItem } from "@pearl/shared";
import { issueKeys } from "@/hooks/use-issues";
import { cn } from "@/lib/utils";

interface AssigneePickerProps {
  value: string;
  onChange: (assignee: string) => void;
  onClose: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export function AssigneePicker({
  value,
  onChange,
  onClose,
  className,
  style,
}: AssigneePickerProps) {
  const [search, setSearch] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const queryClient = useQueryClient();

  // Derive unique assignee list from cached issues data
  const assignees = useMemo(() => {
    const lists = queryClient.getQueriesData<IssueListItem[]>({
      queryKey: issueKeys.lists(),
    });
    const set = new Set<string>();
    for (const [, list] of lists) {
      if (!list) continue;
      for (const issue of list) {
        if (issue.assignee) set.add(issue.assignee);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [queryClient]);

  // Filter list as user types
  const filtered = useMemo(() => {
    if (!search.trim()) return assignees;
    const q = search.toLowerCase();
    return assignees.filter((a) => a.toLowerCase().includes(q));
  }, [assignees, search]);

  const searchTrimmed = search.trim();
  const exactMatch = assignees.some((a) => a.toLowerCase() === searchTrimmed.toLowerCase());
  const canCreate = searchTrimmed.length > 0 && !exactMatch;
  const totalOptions = filtered.length + (canCreate ? 1 : 0);

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Click outside handler
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Reset highlight when search changes
  useEffect(() => {
    setHighlightIndex(0);
  }, [search]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!listRef.current) return;
    const item = listRef.current.children[highlightIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [highlightIndex]);

  const selectAssignee = useCallback(
    (assignee: string) => {
      onChange(assignee);
      onClose();
    },
    [onChange, onClose],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      if (totalOptions === 0) {
        if (e.key === "Enter" && canCreate) {
          e.preventDefault();
          selectAssignee(searchTrimmed);
        }
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIndex((prev) => (prev + 1) % totalOptions);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIndex((prev) => (prev - 1 + totalOptions) % totalOptions);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (highlightIndex < filtered.length) {
          selectAssignee(filtered[highlightIndex]);
        } else if (canCreate) {
          selectAssignee(searchTrimmed);
        }
      }
    },
    [totalOptions, highlightIndex, filtered, canCreate, searchTrimmed, selectAssignee, onClose],
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed z-50 rounded-lg border border-border bg-background shadow-lg w-56 max-h-64 overflow-hidden",
        className,
      )}
      style={style}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-2 border-b border-border">
        <input
          ref={inputRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search assignees..."
          className="w-full text-sm bg-transparent border-none outline-none placeholder:text-muted-foreground"
          aria-label="Search assignees"
          role="combobox"
          aria-expanded
          aria-haspopup="listbox"
          aria-autocomplete="list"
        />
      </div>
      <ul ref={listRef} role="listbox" className="overflow-y-auto max-h-48 py-1">
        {filtered.map((assignee, i) => (
          <li
            key={assignee}
            role="option"
            aria-selected={i === highlightIndex}
            className={cn(
              "px-3 py-1.5 cursor-pointer text-sm truncate",
              i === highlightIndex ? "bg-accent" : "hover:bg-accent",
              assignee === value && "font-medium",
            )}
            onMouseEnter={() => setHighlightIndex(i)}
            onClick={() => selectAssignee(assignee)}
          >
            {assignee}
          </li>
        ))}
        {canCreate && (
          <li
            role="option"
            aria-selected={highlightIndex === filtered.length}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm",
              highlightIndex === filtered.length ? "bg-accent" : "hover:bg-accent",
            )}
            onMouseEnter={() => setHighlightIndex(filtered.length)}
            onClick={() => selectAssignee(searchTrimmed)}
          >
            <span className="text-muted-foreground">Assign to</span>
            <span className="font-medium truncate">&ldquo;{searchTrimmed}&rdquo;</span>
          </li>
        )}
        {filtered.length === 0 && !canCreate && (
          <li className="px-3 py-2 text-sm text-muted-foreground">No matching assignees</li>
        )}
      </ul>
    </div>
  );
}
