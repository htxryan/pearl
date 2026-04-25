import type { IssueStatus, Priority } from "@pearl/shared";
import { ISSUE_STATUSES } from "@pearl/shared";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import {
  ActionsIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
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

type SubView = null | "menu" | "reassign" | "priority" | "status" | "addLabel" | "removeLabel";

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
  const [view, setView] = useState<SubView>(null);
  const [assigneeInput, setAssigneeInput] = useState("");
  const [labelInput, setLabelInput] = useState("");
  const [removeLabelInput, setRemoveLabelInput] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const assigneeInputRef = useRef<HTMLInputElement>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);
  const removeLabelInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (view === null) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setView(null);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [view]);

  useEffect(() => {
    if (view === null) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (view === "menu") {
          setView(null);
          triggerRef.current?.focus();
        } else {
          setView("menu");
        }
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [view]);

  // Focus inputs or first menu item when sub-view opens
  useEffect(() => {
    if (view === "reassign") assigneeInputRef.current?.focus();
    else if (view === "addLabel") labelInputRef.current?.focus();
    else if (view === "removeLabel") removeLabelInputRef.current?.focus();
    else if (view === "menu" && menuRef.current) {
      const first = menuRef.current.querySelector<HTMLButtonElement>(
        '[role="menuitem"]:not(:disabled)',
      );
      first?.focus();
    }
  }, [view]);

  const handleMenuKeyDown = useCallback((e: ReactKeyboardEvent<HTMLDivElement>) => {
    const items = menuRef.current?.querySelectorAll<HTMLButtonElement>(
      '[role="menuitem"]:not(:disabled)',
    );
    if (!items?.length) return;

    const current = document.activeElement as HTMLElement;
    const idx = Array.from(items).indexOf(current as HTMLButtonElement);

    let next: number | undefined;
    if (e.key === "ArrowDown") {
      next = idx < items.length - 1 ? idx + 1 : 0;
    } else if (e.key === "ArrowUp") {
      next = idx > 0 ? idx - 1 : items.length - 1;
    } else if (e.key === "Home") {
      next = 0;
    } else if (e.key === "End") {
      next = items.length - 1;
    }

    if (next !== undefined) {
      e.preventDefault();
      items[next].focus();
    }
  }, []);

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
  const isOpen = view !== null;

  return (
    <div className="flex items-center gap-3 rounded border border-border bg-accent/50 px-4 py-2">
      <span className="text-sm font-medium">
        {selectedCount} issue{selectedCount !== 1 ? "s" : ""} selected
      </span>

      <div className="relative" ref={containerRef}>
        <Button
          ref={triggerRef}
          variant="outline"
          size="sm"
          onClick={() => setView(isOpen ? null : "menu")}
          disabled={busy}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          className="gap-1.5"
        >
          <ActionsIcon />
          Actions
          <ChevronDownIcon />
        </Button>

        {view === "menu" && (
          <div
            ref={menuRef}
            role="menu"
            onKeyDown={handleMenuKeyDown}
            className="absolute top-full left-0 z-50 mt-1 w-56 rounded border border-border bg-popover py-1 shadow-md"
          >
            <MenuItem
              icon={<ReassignIcon />}
              label="Reassign"
              onClick={() => setView("reassign")}
            />
            <MenuItem
              icon={<PriorityIcon />}
              label="Set priority"
              onClick={() => setView("priority")}
              hasSubmenu
            />
            <MenuItem
              icon={<StatusIcon />}
              label="Set status"
              onClick={() => setView("status")}
              hasSubmenu
            />
            <MenuItem
              icon={<TagPlusIcon />}
              label="Add label"
              onClick={() => setView("addLabel")}
            />
            <MenuItem
              icon={<TagMinusIcon />}
              label="Remove label"
              onClick={() => setView("removeLabel")}
            />
            <hr className="my-1 border-border" />
            <MenuItem
              icon={<CloseIssueIcon />}
              label={isClosing ? "Closing..." : "Close selected"}
              onClick={() => {
                setView(null);
                onClose();
              }}
              disabled={isClosing}
            />
            <MenuItem
              icon={<TrashIcon />}
              label={isDeleting ? "Deleting..." : "Delete"}
              onClick={() => {
                setView(null);
                onDelete();
              }}
              disabled={isDeleting}
              destructive
            />
          </div>
        )}

        {view === "priority" && (
          <SubmenuPanel onBack={() => setView("menu")} title="Set priority">
            {PRIORITY_OPTIONS.map(({ value, label }) => (
              <button
                type="button"
                key={value}
                onClick={() => {
                  onReprioritize(value);
                  setView(null);
                }}
                className="block w-full px-3 py-1.5 text-left text-sm hover:bg-accent focus:bg-accent focus:outline-none"
              >
                {label}
              </button>
            ))}
          </SubmenuPanel>
        )}

        {view === "status" && (
          <SubmenuPanel onBack={() => setView("menu")} title="Set status">
            {STATUS_OPTIONS.map(({ value, label }) => (
              <button
                type="button"
                key={value}
                onClick={() => {
                  onChangeStatus(value);
                  setView(null);
                }}
                className="block w-full px-3 py-1.5 text-left text-sm hover:bg-accent focus:bg-accent focus:outline-none"
              >
                {label}
              </button>
            ))}
          </SubmenuPanel>
        )}

        {view === "reassign" && (
          <SubmenuPanel onBack={() => setView("menu")} title="Reassign" wide>
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
          <SubmenuPanel onBack={() => setView("menu")} title="Add label" wide>
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
          <SubmenuPanel onBack={() => setView("menu")} title="Remove label" wide>
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
      </div>

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

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  hasSubmenu?: boolean;
}

function MenuItem({ icon, label, onClick, disabled, destructive, hasSubmenu }: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      tabIndex={-1}
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent focus:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none ${
        destructive ? "text-destructive" : ""
      }`}
    >
      <span className="shrink-0 text-muted-foreground" aria-hidden="true">
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      {hasSubmenu && (
        <span className="shrink-0 text-muted-foreground" aria-hidden="true">
          <ChevronRightIcon />
        </span>
      )}
    </button>
  );
}

function SubmenuPanel({
  title,
  onBack,
  children,
  wide,
}: {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className={`absolute top-full left-0 z-50 mt-1 rounded border border-border bg-popover shadow-md ${
        wide ? "w-64" : "w-48"
      }`}
    >
      <button
        type="button"
        onClick={onBack}
        className="flex w-full items-center gap-1 border-b border-border px-3 py-1.5 text-left text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground focus:bg-accent focus:outline-none"
      >
        <ChevronLeftIcon />
        <span>{title}</span>
      </button>
      <div className="py-1">{children}</div>
    </div>
  );
}
