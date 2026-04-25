import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import type { IssueListItem } from "@pearl/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const [inputValue, setInputValue] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

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

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) onClose();
    },
    [onClose],
  );

  const handleSelect = useCallback(
    (assignee: string | null) => {
      if (assignee) {
        onChange(assignee);
        onClose();
      }
    },
    [onChange, onClose],
  );

  const searchTrimmed = inputValue.trim();
  const exactMatch = assignees.some((a) => a.toLowerCase() === searchTrimmed.toLowerCase());
  const canCreate = searchTrimmed.length > 0 && !exactMatch;

  const handleCreateAssignee = useCallback(() => {
    if (canCreate) {
      onChange(searchTrimmed);
      onClose();
    }
  }, [canCreate, searchTrimmed, onChange, onClose]);

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
      <ComboboxPrimitive.Root
        value={value}
        onValueChange={handleSelect}
        onInputValueChange={(val) => setInputValue(val)}
        open
        onOpenChange={handleOpenChange}
        modal={false}
      >
        <div className="p-2 border-b border-border">
          <ComboboxPrimitive.Input
            ref={inputRef}
            placeholder="Search assignees..."
            className="w-full text-sm bg-transparent border-none outline-none placeholder:text-muted-foreground"
            aria-label="Search assignees"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }
              if (e.key === "Enter" && canCreate) {
                e.preventDefault();
                e.stopPropagation();
                handleCreateAssignee();
              }
            }}
          />
        </div>
        <ComboboxPrimitive.Popup className="overflow-y-auto max-h-48 py-1">
          {assignees.map((assignee) => (
            <ComboboxPrimitive.Item
              key={assignee}
              value={assignee}
              className={cn(
                "px-3 py-1.5 cursor-pointer text-sm truncate outline-none",
                "data-[highlighted]:bg-accent",
                "data-[selected]:font-medium",
              )}
            >
              {assignee}
            </ComboboxPrimitive.Item>
          ))}
          {canCreate && (
            <div
              role="option"
              tabIndex={0}
              aria-selected={false}
              className="flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm hover:bg-accent outline-none focus:bg-accent"
              onClick={handleCreateAssignee}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleCreateAssignee();
                }
              }}
            >
              <span className="text-muted-foreground">Assign to</span>
              <span className="font-medium truncate">&ldquo;{searchTrimmed}&rdquo;</span>
            </div>
          )}
          <ComboboxPrimitive.Empty className="px-3 py-2 text-sm text-muted-foreground">
            No matching assignees
          </ComboboxPrimitive.Empty>
        </ComboboxPrimitive.Popup>
      </ComboboxPrimitive.Root>
    </div>
  );
}
