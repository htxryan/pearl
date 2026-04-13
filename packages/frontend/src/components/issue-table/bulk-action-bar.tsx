import { useState, useRef, useEffect, useCallback } from "react";
import type { Priority, IssueStatus } from "@beads-gui/shared";
import { ISSUE_STATUSES } from "@beads-gui/shared";
import { Button } from "@/components/ui/button";

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: 0, label: "P0 — Critical" },
  { value: 1, label: "P1 — High" },
  { value: 2, label: "P2 — Medium" },
  { value: 3, label: "P3 — Low" },
  { value: 4, label: "P4 — Backlog" },
];

const STATUS_OPTIONS: { value: IssueStatus; label: string }[] = ISSUE_STATUSES.map((s) => ({
  value: s,
  label: s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
}));

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
  const [showStatus, setShowStatus] = useState(false);
  const [showAddLabel, setShowAddLabel] = useState(false);
  const [showRemoveLabel, setShowRemoveLabel] = useState(false);
  const [assigneeInput, setAssigneeInput] = useState("");
  const [labelInput, setLabelInput] = useState("");
  const [removeLabelInput, setRemoveLabelInput] = useState("");
  const reassignRef = useRef<HTMLDivElement>(null);
  const priorityRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const addLabelRef = useRef<HTMLDivElement>(null);
  const removeLabelRef = useRef<HTMLDivElement>(null);
  const assigneeInputRef = useRef<HTMLInputElement>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);
  const removeLabelInputRef = useRef<HTMLInputElement>(null);

  const closeAllDropdowns = useCallback(() => {
    setShowReassign(false);
    setShowPriority(false);
    setShowStatus(false);
    setShowAddLabel(false);
    setShowRemoveLabel(false);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    if (!showReassign && !showPriority && !showStatus && !showAddLabel && !showRemoveLabel) return;
    function handleClickOutside(e: MouseEvent) {
      if (showReassign && reassignRef.current && !reassignRef.current.contains(e.target as Node)) {
        setShowReassign(false);
      }
      if (showPriority && priorityRef.current && !priorityRef.current.contains(e.target as Node)) {
        setShowPriority(false);
      }
      if (showStatus && statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setShowStatus(false);
      }
      if (showAddLabel && addLabelRef.current && !addLabelRef.current.contains(e.target as Node)) {
        setShowAddLabel(false);
      }
      if (showRemoveLabel && removeLabelRef.current && !removeLabelRef.current.contains(e.target as Node)) {
        setShowRemoveLabel(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showReassign, showPriority, showStatus, showAddLabel, showRemoveLabel]);

  // Focus inputs when dropdowns open
  useEffect(() => {
    if (showReassign) assigneeInputRef.current?.focus();
  }, [showReassign]);

  useEffect(() => {
    if (showAddLabel) labelInputRef.current?.focus();
  }, [showAddLabel]);

  useEffect(() => {
    if (showRemoveLabel) removeLabelInputRef.current?.focus();
  }, [showRemoveLabel]);

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

  const handleStatusSelect = useCallback(
    (status: IssueStatus) => {
      onChangeStatus(status);
      setShowStatus(false);
    },
    [onChangeStatus],
  );

  const handleAddLabelSubmit = useCallback(() => {
    const value = labelInput.trim();
    if (!value) return;
    onAddLabel(value);
    setLabelInput("");
    setShowAddLabel(false);
  }, [labelInput, onAddLabel]);

  const handleRemoveLabelSubmit = useCallback(() => {
    const value = removeLabelInput.trim();
    if (!value) return;
    onRemoveLabel(value);
    setRemoveLabelInput("");
    setShowRemoveLabel(false);
  }, [removeLabelInput, onRemoveLabel]);

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
            const next = !showReassign;
            closeAllDropdowns();
            setShowReassign(next);
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
            const next = !showPriority;
            closeAllDropdowns();
            setShowPriority(next);
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

      {/* Set status dropdown */}
      <div className="relative" ref={statusRef}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const next = !showStatus;
            closeAllDropdowns();
            setShowStatus(next);
          }}
          disabled={busy}
        >
          Set status
        </Button>
        {showStatus && (
          <div className="absolute top-full left-0 z-50 mt-1 w-44 rounded border border-border bg-popover py-1 shadow-md">
            {STATUS_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => handleStatusSelect(value)}
                className="block w-full px-3 py-1.5 text-left text-sm hover:bg-accent focus:bg-accent focus:outline-none"
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Add label dropdown */}
      <div className="relative" ref={addLabelRef}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const next = !showAddLabel;
            closeAllDropdowns();
            setShowAddLabel(next);
          }}
          disabled={busy}
        >
          Add label
        </Button>
        {showAddLabel && (
          <div className="absolute top-full left-0 z-50 mt-1 w-60 rounded border border-border bg-popover p-3 shadow-md">
            <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="bulk-label-input">
              Label
            </label>
            <input
              id="bulk-label-input"
              ref={labelInputRef}
              type="text"
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddLabelSubmit();
                }
                if (e.key === "Escape") {
                  setShowAddLabel(false);
                }
              }}
              placeholder="Enter label name..."
              className="mb-2 h-8 w-full rounded border border-border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <Button
              size="sm"
              onClick={handleAddLabelSubmit}
              disabled={!labelInput.trim()}
              className="w-full"
            >
              Add label
            </Button>
          </div>
        )}
      </div>

      {/* Remove label dropdown */}
      <div className="relative" ref={removeLabelRef}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const next = !showRemoveLabel;
            closeAllDropdowns();
            setShowRemoveLabel(next);
          }}
          disabled={busy}
        >
          Remove label
        </Button>
        {showRemoveLabel && (
          <div className="absolute top-full left-0 z-50 mt-1 w-60 rounded border border-border bg-popover p-3 shadow-md">
            <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="bulk-remove-label-input">
              Label
            </label>
            <input
              id="bulk-remove-label-input"
              ref={removeLabelInputRef}
              type="text"
              value={removeLabelInput}
              onChange={(e) => setRemoveLabelInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleRemoveLabelSubmit();
                }
                if (e.key === "Escape") {
                  setShowRemoveLabel(false);
                }
              }}
              placeholder="Enter label to remove..."
              className="mb-2 h-8 w-full rounded border border-border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <Button
              size="sm"
              onClick={handleRemoveLabelSubmit}
              disabled={!removeLabelInput.trim()}
              className="w-full"
            >
              Remove label
            </Button>
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
