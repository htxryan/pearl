import { useState, useRef, useEffect, useCallback } from "react";
import type { Priority, IssueStatus } from "@beads-gui/shared";
import { Button } from "@/components/ui/button";

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: 0, label: "P0 — Critical" },
  { value: 1, label: "P1 — High" },
  { value: 2, label: "P2 — Medium" },
  { value: 3, label: "P3 — Low" },
  { value: 4, label: "P4 — Backlog" },
];

interface BulkActionBarProps {
  selectedCount: number;
  onClose: () => void;
  onClearSelection: () => void;
  onReassign: (assignee: string) => void;
  onReprioritize: (priority: Priority) => void;
  onChangeStatus: (status: IssueStatus) => void;
  onAddLabel: (label: string) => void;
  onRemoveLabel: (label: string) => void;
  isClosing: boolean;
  isUpdating: boolean;
}

export function BulkActionBar({
  selectedCount,
  onClose,
  onClearSelection,
  onReassign,
  onReprioritize,
  onChangeStatus,
  onAddLabel,
  onRemoveLabel,
  isClosing,
  isUpdating,
}: BulkActionBarProps) {
  const [showReassign, setShowReassign] = useState(false);
  const [showPriority, setShowPriority] = useState(false);
  const [assigneeInput, setAssigneeInput] = useState("");
  const reassignRef = useRef<HTMLDivElement>(null);
  const priorityRef = useRef<HTMLDivElement>(null);
  const assigneeInputRef = useRef<HTMLInputElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    if (!showReassign && !showPriority) return;
    function handleClickOutside(e: MouseEvent) {
      if (showReassign && reassignRef.current && !reassignRef.current.contains(e.target as Node)) {
        setShowReassign(false);
      }
      if (showPriority && priorityRef.current && !priorityRef.current.contains(e.target as Node)) {
        setShowPriority(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showReassign, showPriority]);

  // Focus the assignee input when the dropdown opens
  useEffect(() => {
    if (showReassign) {
      assigneeInputRef.current?.focus();
    }
  }, [showReassign]);

  const handleReassignSubmit = useCallback(() => {
    const value = assigneeInput.trim();
    if (!value) return;
    onReassign(value);
    setAssigneeInput("");
    setShowReassign(false);
  }, [assigneeInput, onReassign]);

  const handlePrioritySelect = useCallback(
    (priority: Priority) => {
      onReprioritize(priority);
      setShowPriority(false);
    },
    [onReprioritize],
  );

  if (selectedCount === 0) return null;

  const busy = isClosing || isUpdating;

  return (
    <div className="flex items-center gap-3 rounded border border-border bg-accent/50 px-4 py-2">
      <span className="text-sm font-medium">
        {selectedCount} issue{selectedCount !== 1 ? "s" : ""} selected
      </span>

      {/* Reassign dropdown */}
      <div className="relative" ref={reassignRef}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setShowReassign((prev) => !prev);
            setShowPriority(false);
          }}
          disabled={busy}
        >
          Reassign
        </Button>
        {showReassign && (
          <div className="absolute top-full left-0 z-50 mt-1 w-60 rounded border border-border bg-popover p-3 shadow-md">
            <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="bulk-assignee-input">
              Assignee
            </label>
            <input
              id="bulk-assignee-input"
              ref={assigneeInputRef}
              type="text"
              value={assigneeInput}
              onChange={(e) => setAssigneeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleReassignSubmit();
                }
                if (e.key === "Escape") {
                  setShowReassign(false);
                }
              }}
              placeholder="Enter assignee name..."
              className="mb-2 h-8 w-full rounded border border-border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <Button
              size="sm"
              onClick={handleReassignSubmit}
              disabled={!assigneeInput.trim()}
              className="w-full"
            >
              Reassign
            </Button>
          </div>
        )}
      </div>

      {/* Reprioritize dropdown */}
      <div className="relative" ref={priorityRef}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setShowPriority((prev) => !prev);
            setShowReassign(false);
          }}
          disabled={busy}
        >
          Set priority
        </Button>
        {showPriority && (
          <div className="absolute top-full left-0 z-50 mt-1 w-44 rounded border border-border bg-popover py-1 shadow-md">
            {PRIORITY_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => handlePrioritySelect(value)}
                className="block w-full px-3 py-1.5 text-left text-sm hover:bg-accent focus:bg-accent focus:outline-none"
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <Button
        variant="destructive"
        size="sm"
        onClick={onClose}
        disabled={busy}
      >
        {isClosing ? "Closing..." : "Close selected"}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearSelection}
        disabled={busy}
      >
        Clear selection
      </Button>
    </div>
  );
}
