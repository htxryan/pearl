import type { IssueListItem, IssueStatus, LabelColor, Priority } from "@pearl/shared";
import { createColumnHelper } from "@tanstack/react-table";
import { useCallback, useEffect, useRef, useState } from "react";

import { AssigneePicker } from "@/components/ui/assignee-picker";
import { AttachmentIcon } from "@/components/ui/attachment-icon";
import { BeadId } from "@/components/ui/bead-id";
import { DatePicker } from "@/components/ui/date-picker";
import { LabelBadge } from "@/components/ui/label-badge";
import { LabelPicker } from "@/components/ui/label-picker";
import { PriorityIndicator } from "@/components/ui/priority-indicator";
import { RelativeTime } from "@/components/ui/relative-time";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { TypePill } from "@/components/ui/type-pill";

const col = createColumnHelper<IssueListItem>();

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isDateOverdue(iso: string): boolean {
  const due = new Date(iso + "T00:00:00");
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

// ─── Inline Title Editor ─────────────────────────────────
function InlineTitleEditor({
  value,
  issueId,
  onTitleChange,
}: {
  value: string;
  issueId: string;
  onTitleChange: (id: string, title: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync with external value changes
  useEffect(() => {
    if (!isEditing) setEditValue(value);
  }, [value, isEditing]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== value) {
      onTitleChange(issueId, trimmed);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleSave();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            handleCancel();
          }
          e.stopPropagation();
        }}
        onClick={(e) => e.stopPropagation()}
        className="w-full bg-transparent border border-border rounded px-2 py-0.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-ring"
      />
    );
  }

  return (
    <span
      className="min-w-0 flex-1 font-medium truncate block"
      onDoubleClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
    >
      {value}
    </span>
  );
}

// ─── Inline Assignee Editor ──────────────────────────────
function InlineAssigneeEditor({
  value,
  issueId,
  onAssigneeChange,
}: {
  value: string | null;
  issueId: string;
  onAssigneeChange: (id: string, assignee: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPopoverStyle({
      top: rect.bottom + 4,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 232)),
    });
  }, []);

  // Reposition on scroll/resize while open
  useEffect(() => {
    if (!isOpen) return;
    const reposition = () => updatePosition();
    window.addEventListener("scroll", reposition, { passive: true, capture: true });
    window.addEventListener("resize", reposition, { passive: true });
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [isOpen, updatePosition]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    updatePosition();
    setIsOpen(true);
  };

  return (
    <>
      <span ref={triggerRef} onClick={handleClick} className="cursor-pointer">
        {value ? (
          <span className="text-sm truncate">{value}</span>
        ) : (
          <span className="text-xs text-muted-foreground/50 italic">—</span>
        )}
      </span>
      {isOpen && (
        <AssigneePicker
          value={value ?? ""}
          onChange={(assignee) => onAssigneeChange(issueId, assignee)}
          onClose={() => setIsOpen(false)}
          style={popoverStyle}
        />
      )}
    </>
  );
}

// ─── Inline Label Editor ────────────────────────────────
function InlineLabelEditor({
  labels,
  labelColors,
  issueId,
  onLabelsChange,
}: {
  labels: string[];
  labelColors: Record<string, LabelColor>;
  issueId: string;
  onLabelsChange: (id: string, labels: string[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const handleChange = useCallback(
    (newLabels: string[]) => {
      onLabelsChange(issueId, newLabels);
    },
    [issueId, onLabelsChange],
  );

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPopoverStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 268)),
      zIndex: 50,
    });
  }, []);

  // Reposition on scroll/resize while open
  useEffect(() => {
    if (!isOpen) return;
    const reposition = () => updatePosition();
    window.addEventListener("scroll", reposition, { passive: true, capture: true });
    window.addEventListener("resize", reposition, { passive: true });
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [isOpen, updatePosition]);

  const handleOpen = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      updatePosition();
      setIsOpen((prev) => !prev);
    },
    [updatePosition],
  );

  return (
    <div ref={containerRef} className="relative">
      <div
        ref={triggerRef}
        onClick={handleOpen}
        className="flex gap-1 flex-wrap cursor-pointer min-h-[20px]"
      >
        {labels.length === 0 && <span className="text-xs text-muted-foreground/50 italic">—</span>}
        {labels.slice(0, 3).map((label) => (
          <LabelBadge
            key={label}
            name={label}
            color={labelColors[label] as LabelColor | undefined}
            size="sm"
          />
        ))}
        {labels.length > 3 && (
          <span className="text-xs text-muted-foreground">+{labels.length - 3}</span>
        )}
      </div>
      {isOpen && (
        <div style={popoverStyle} className="w-[260px]" onClick={(e) => e.stopPropagation()}>
          <LabelPicker
            selected={labels}
            selectedColors={labelColors}
            onChange={handleChange}
            placeholder="Search labels..."
          />
        </div>
      )}
    </div>
  );
}

// ─── Inline Date Editor ─────────────────────────────────
function InlineDateEditor({
  value,
  issueId,
  onDueDateChange,
}: {
  value: string | null;
  issueId: string;
  onDueDateChange: (id: string, date: string | null) => void;
}) {
  const handleChange = useCallback(
    (date: string | null) => {
      onDueDateChange(issueId, date);
    },
    [issueId, onDueDateChange],
  );

  const isOverdue = value ? isDateOverdue(value) : false;

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <DatePicker
        value={value}
        onChange={handleChange}
        placeholder="—"
        className={
          isOverdue
            ? "[&_button]:text-destructive [&_button]:font-medium"
            : "[&_button]:text-muted-foreground"
        }
      />
    </div>
  );
}

export interface EpicProgress {
  done: number;
  total: number;
  childIds: string[];
}

export function buildColumns({
  onStatusChange,
  onPriorityChange,
  onTitleChange,
  onAssigneeChange,
  onLabelsChange,
  onDueDateChange,
  epicProgress,
  expandedEpics,
  onToggleExpand,
}: {
  onStatusChange?: (id: string, status: IssueStatus) => void;
  onPriorityChange?: (id: string, priority: Priority) => void;
  onTitleChange?: (id: string, title: string) => void;
  onAssigneeChange?: (id: string, assignee: string) => void;
  onLabelsChange?: (id: string, labels: string[]) => void;
  onDueDateChange?: (id: string, date: string | null) => void;
  epicProgress?: Map<string, EpicProgress>;
  expandedEpics?: Set<string>;
  onToggleExpand?: (id: string) => void;
}) {
  return [
    col.display({
      id: "select",
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
          className="h-4 w-4 rounded border-border"
          aria-label="Select all rows"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          className="h-4 w-4 rounded border-border"
          aria-label={`Select ${row.original.title}`}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      size: 40,
      enableResizing: false,
      enableSorting: false,
    }),
    col.accessor("id", {
      header: "ID",
      cell: (info) => <BeadId id={info.getValue()} className="whitespace-nowrap text-[11px]" />,
      enableResizing: false,
    }),
    col.accessor("title", {
      header: "Title",
      cell: (info) => {
        const issue = info.row.original;
        const progress = epicProgress?.get(issue.id);
        const isExpanded = expandedEpics?.has(issue.id);
        return (
          <div className="flex items-center gap-2 min-w-0 w-full">
            {progress && onToggleExpand && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand(issue.id);
                }}
                className="shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-accent text-muted-foreground text-xs"
                aria-label={isExpanded ? "Collapse children" : "Expand children"}
              >
                {isExpanded ? "\u25BC" : "\u25B6"}
              </button>
            )}
            {onTitleChange ? (
              <InlineTitleEditor
                value={info.getValue()}
                issueId={issue.id}
                onTitleChange={onTitleChange}
              />
            ) : (
              <span className="min-w-0 flex-1 font-medium truncate block">{info.getValue()}</span>
            )}
            {progress && (
              <span
                className="shrink-0 inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground"
                title={`${progress.done} of ${progress.total} children done`}
              >
                {progress.done}/{progress.total} done
              </span>
            )}
          </div>
        );
      },
      size: 320,
      minSize: 40,
      enableResizing: true,
      meta: { flex: true },
    }),
    col.accessor("status", {
      header: "Status",
      cell: (info) => {
        const status = info.getValue();
        if (onStatusChange) {
          return (
            <Select
              value={status}
              onValueChange={(v) => {
                if (v) onStatusChange(info.row.original.id, v as IssueStatus);
              }}
              modal={false}
            >
              <SelectTrigger
                size="sm"
                className="border-none bg-transparent px-0 hover:bg-accent"
                aria-label={`Change status for ${info.row.original.title}`}
              >
                <SelectValue>
                  {(v: string | null) => (v ? <StatusBadge status={v as IssueStatus} /> : "Status")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(
                  [
                    { value: "open", label: "Open" },
                    { value: "in_progress", label: "In Progress" },
                    { value: "closed", label: "Closed" },
                    { value: "deferred", label: "Deferred" },
                  ] as const
                ).map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} label={opt.label}>
                    <StatusBadge status={opt.value} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }
        return <StatusBadge status={status} />;
      },
      enableResizing: false,
    }),
    col.accessor("priority", {
      header: "Priority",
      cell: (info) => {
        const priority = info.getValue();
        if (onPriorityChange) {
          return (
            <Select
              value={priority}
              onValueChange={(v) => {
                if (v != null) onPriorityChange(info.row.original.id, v as Priority);
              }}
              modal={false}
            >
              <SelectTrigger
                size="sm"
                className="border-none bg-transparent px-0 hover:bg-accent"
                aria-label={`Change priority for ${info.row.original.title}`}
              >
                <SelectValue>
                  {(v: number | null) =>
                    v != null ? <PriorityIndicator priority={v as Priority} /> : "Priority"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(
                  [
                    { value: 0, label: "P0 — Critical" },
                    { value: 1, label: "P1 — High" },
                    { value: 2, label: "P2 — Medium" },
                    { value: 3, label: "P3 — Low" },
                    { value: 4, label: "P4 — Backlog" },
                  ] as const
                ).map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} label={opt.label}>
                    <span className="flex items-center gap-2">
                      <PriorityIndicator priority={opt.value as Priority} />
                      <span>{opt.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }
        return <PriorityIndicator priority={priority} />;
      },
      enableResizing: false,
    }),
    col.accessor("issue_type", {
      header: "Type",
      cell: (info) => <TypePill type={info.getValue()} />,
      enableResizing: false,
    }),
    col.accessor("assignee", {
      header: "Assignee",
      cell: (info) => {
        const val = info.getValue();
        if (onAssigneeChange) {
          return (
            <InlineAssigneeEditor
              value={val}
              issueId={info.row.original.id}
              onAssigneeChange={onAssigneeChange}
            />
          );
        }
        return val ? (
          <span className="text-sm truncate">{val}</span>
        ) : (
          <span className="text-xs text-muted-foreground/50 italic">—</span>
        );
      },
      enableResizing: false,
    }),
    col.accessor("created_at", {
      header: "Created",
      cell: (info) => (
        <RelativeTime iso={info.getValue()} className="text-xs text-muted-foreground" />
      ),
      enableResizing: false,
    }),
    col.accessor("due_at", {
      header: "Due",
      cell: (info) => {
        const val = info.getValue();
        if (onDueDateChange) {
          return (
            <InlineDateEditor
              value={val}
              issueId={info.row.original.id}
              onDueDateChange={onDueDateChange}
            />
          );
        }
        const isOverdue = val && isDateOverdue(val);
        return (
          <span
            className={`text-xs ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}
          >
            {formatDate(val)}
          </span>
        );
      },
      enableResizing: false,
    }),
    col.accessor("labels", {
      header: "Labels",
      cell: (info) => {
        const labels = info.getValue();
        const colorMap = info.row.original.labelColors ?? {};
        if (onLabelsChange) {
          return (
            <InlineLabelEditor
              labels={labels}
              labelColors={colorMap}
              issueId={info.row.original.id}
              onLabelsChange={onLabelsChange}
            />
          );
        }
        if (!labels.length) return null;
        return (
          <div className="flex gap-1 flex-wrap">
            {labels.slice(0, 3).map((label) => (
              <LabelBadge
                key={label}
                name={label}
                color={colorMap[label] as LabelColor | undefined}
                size="sm"
              />
            ))}
            {labels.length > 3 && (
              <span className="text-xs text-muted-foreground">+{labels.length - 3}</span>
            )}
          </div>
        );
      },
      enableResizing: false,
      enableSorting: false,
    }),
    col.accessor("has_attachments", {
      id: "has_attachments",
      header: () => <AttachmentIcon />,
      cell: (info) => (info.getValue() ? <AttachmentIcon /> : null),
      enableResizing: false,
      enableSorting: false,
    }),
  ];
}
