import type { IssueStatus, Priority } from "@pearl/shared";
import { ISSUE_STATUSES } from "@pearl/shared";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ActionsIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  CloseIssueIcon,
  PriorityIcon,
  ReassignIcon,
  StatusIcon,
  TagMinusIcon,
  TagPlusIcon,
  TrashIcon,
  XIcon,
} from "@/components/ui/icons";

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

type View = null | "menu" | "reassign" | "priority" | "status" | "addLabel" | "removeLabel";

interface BulkActionBarProps {
  selectedCount: number;
  onClose: () => void;
  onDelete: () => void;
  onClearSelection: () => void;
  onReassign: (assignee: string) => void;
  onReprioritize: (priority: Priority) => void;
  onChangeStatus: (status: IssueStatus) => void;
  onAddLabel: (label: string) => void;
  onRemoveLabel: (label: string) => void;
  isClosing: boolean;
  isDeleting: boolean;
  isUpdating: boolean;
}

export function BulkActionBar({
  selectedCount,
  onClose,
  onDelete,
  onClearSelection,
  onReassign,
  onReprioritize,
  onChangeStatus,
  onAddLabel,
  onRemoveLabel,
  isClosing,
  isDeleting,
  isUpdating,
}: BulkActionBarProps) {
  const [view, setView] = useState<View>(null);
  const [assigneeInput, setAssigneeInput] = useState("");
  const [labelInput, setLabelInput] = useState("");
  const [removeLabelInput, setRemoveLabelInput] = useState("");
  const assigneeInputRef = useRef<HTMLInputElement>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);
  const removeLabelInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the input when entering an input sub-view.
  useEffect(() => {
    if (view === "reassign") assigneeInputRef.current?.focus();
    else if (view === "addLabel") labelInputRef.current?.focus();
    else if (view === "removeLabel") removeLabelInputRef.current?.focus();
  }, [view]);

  const handleReassignSubmit = useCallback(() => {
    const value = assigneeInput.trim();
    if (!value) return;
    onReassign(value);
    setAssigneeInput("");
    setView(null);
  }, [assigneeInput, onReassign]);

  const handleAddLabelSubmit = useCallback(() => {
    const value = labelInput.trim();
    if (!value) return;
    onAddLabel(value);
    setLabelInput("");
    setView(null);
  }, [labelInput, onAddLabel]);

  const handleRemoveLabelSubmit = useCallback(() => {
    const value = removeLabelInput.trim();
    if (!value) return;
    onRemoveLabel(value);
    setRemoveLabelInput("");
    setView(null);
  }, [removeLabelInput, onRemoveLabel]);

  if (selectedCount === 0) return null;

  const busy = isClosing || isUpdating || isDeleting;
  const isInputView = view === "reassign" || view === "addLabel" || view === "removeLabel";
  const width = view === "menu" ? "w-56" : isInputView ? "w-64" : "w-48";

  return (
    <div className="flex items-center gap-3 rounded border border-border bg-accent/50 px-4 py-2">
      <span className="text-sm font-medium">
        {selectedCount} issue{selectedCount !== 1 ? "s" : ""} selected
      </span>

      <DropdownMenu open={view !== null} onOpenChange={(next) => setView(next ? "menu" : null)}>
        <DropdownMenuTrigger>
          {(p) => (
            <Button {...p} variant="outline" size="sm" disabled={busy} className="gap-1.5">
              <ActionsIcon />
              Actions
              <ChevronDownIcon />
            </Button>
          )}
        </DropdownMenuTrigger>

        <DropdownMenuContent width={width}>
          {view === "menu" && (
            <>
              <DropdownMenuItem
                icon={<ReassignIcon />}
                onClick={() => setView("reassign")}
                closeOnSelect={false}
              >
                Reassign
              </DropdownMenuItem>
              <DropdownMenuItem
                icon={<PriorityIcon />}
                onClick={() => setView("priority")}
                hasSubmenu
                closeOnSelect={false}
              >
                Set priority
              </DropdownMenuItem>
              <DropdownMenuItem
                icon={<StatusIcon />}
                onClick={() => setView("status")}
                hasSubmenu
                closeOnSelect={false}
              >
                Set status
              </DropdownMenuItem>
              <DropdownMenuItem
                icon={<TagPlusIcon />}
                onClick={() => setView("addLabel")}
                closeOnSelect={false}
              >
                Add label
              </DropdownMenuItem>
              <DropdownMenuItem
                icon={<TagMinusIcon />}
                onClick={() => setView("removeLabel")}
                closeOnSelect={false}
              >
                Remove label
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem icon={<CloseIssueIcon />} onClick={onClose} disabled={isClosing}>
                {isClosing ? "Closing..." : "Close selected"}
              </DropdownMenuItem>
              <DropdownMenuItem
                icon={<TrashIcon />}
                onClick={onDelete}
                disabled={isDeleting}
                destructive
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </DropdownMenuItem>
            </>
          )}

          {view === "priority" && (
            <SubmenuPanel title="Set priority" onBack={() => setView("menu")}>
              {PRIORITY_OPTIONS.map(({ value, label }) => (
                <DropdownMenuItem
                  key={value}
                  onClick={() => {
                    onReprioritize(value);
                    setView(null);
                  }}
                >
                  {label}
                </DropdownMenuItem>
              ))}
            </SubmenuPanel>
          )}

          {view === "status" && (
            <SubmenuPanel title="Set status" onBack={() => setView("menu")}>
              {STATUS_OPTIONS.map(({ value, label }) => (
                <DropdownMenuItem
                  key={value}
                  onClick={() => {
                    onChangeStatus(value);
                    setView(null);
                  }}
                >
                  {label}
                </DropdownMenuItem>
              ))}
            </SubmenuPanel>
          )}

          {view === "reassign" && (
            <SubmenuPanel title="Reassign" onBack={() => setView("menu")}>
              <div className="p-3">
                <label
                  className="mb-1 block text-xs font-medium text-muted-foreground"
                  htmlFor="bulk-assignee-input"
                >
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
                  }}
                  placeholder="Enter assignee name..."
                  className="mb-2 h-8 w-full rounded border border-border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <Button
                  size="sm"
                  onClick={handleReassignSubmit}
                  disabled={!assigneeInput.trim()}
                  className="w-full gap-1.5"
                >
                  <ReassignIcon />
                  Reassign
                </Button>
              </div>
            </SubmenuPanel>
          )}

          {view === "addLabel" && (
            <SubmenuPanel title="Add label" onBack={() => setView("menu")}>
              <div className="p-3">
                <label
                  className="mb-1 block text-xs font-medium text-muted-foreground"
                  htmlFor="bulk-label-input"
                >
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
                  }}
                  placeholder="Enter label name..."
                  className="mb-2 h-8 w-full rounded border border-border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <Button
                  size="sm"
                  onClick={handleAddLabelSubmit}
                  disabled={!labelInput.trim()}
                  className="w-full gap-1.5"
                >
                  <TagPlusIcon />
                  Add label
                </Button>
              </div>
            </SubmenuPanel>
          )}

          {view === "removeLabel" && (
            <SubmenuPanel title="Remove label" onBack={() => setView("menu")}>
              <div className="p-3">
                <label
                  className="mb-1 block text-xs font-medium text-muted-foreground"
                  htmlFor="bulk-remove-label-input"
                >
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
                  }}
                  placeholder="Enter label to remove..."
                  className="mb-2 h-8 w-full rounded border border-border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <Button
                  size="sm"
                  onClick={handleRemoveLabelSubmit}
                  disabled={!removeLabelInput.trim()}
                  className="w-full gap-1.5"
                >
                  <TagMinusIcon />
                  Remove label
                </Button>
              </div>
            </SubmenuPanel>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="ghost"
        size="sm"
        onClick={onClearSelection}
        disabled={busy}
        className="gap-1.5"
      >
        <XIcon />
        Clear selection
      </Button>
    </div>
  );
}

function SubmenuPanel({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onBack}
        className="flex w-full items-center gap-1 border-b border-border px-3 py-1.5 text-left text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground focus:bg-accent focus:outline-none"
      >
        <ChevronLeftIcon />
        <span>{title}</span>
      </button>
      <div className="py-1">{children}</div>
    </>
  );
}
