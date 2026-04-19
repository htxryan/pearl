import type { IssueListItem, IssueStatus, LabelColor, Priority } from "@pearl/shared";
import { createColumnHelper } from "@tanstack/react-table";
import { useCallback, useEffect, useRef, useState } from "react";
import { AssigneePicker } from "@/components/ui/assignee-picker";
import { CustomSelect } from "@/components/ui/custom-select";
import { DatePicker } from "@/components/ui/date-picker";
import { LabelBadge } from "@/components/ui/label-badge";
import { LabelPicker } from "@/components/ui/label-picker";
import { PriorityIndicator } from "@/components/ui/priority-indicator";
import { RelativeTime } from "@/components/ui/relative-time";
import { StatusBadge } from "@/components/ui/status-badge";
import { TypeBadge } from "@/components/ui/type-badge";
import { shortId } from "@/lib/format-id";

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
      className="font-medium truncate max-w-[400px] block"
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
      cell: (info) => (
        <code
          className="whitespace-nowrap text-[11px] text-muted-foreground/70"
          title={info.getValue()}
        >
          {shortId(info.getValue())}
        </code>
      ),
      size: 140,
      minSize: 120,
    }),
    col.accessor("title", {
      header: "Title",
      cell: (info) => {
        const issue = info.row.original;
        const progress = epicProgress?.get(issue.id);
        const isExpanded = expandedEpics?.has(issue.id);
        return (
          <div className="flex items-center gap-2 min-w-0">
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
              <span className="font-medium truncate max-w-[400px] block">{info.getValue()}</span>
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
      minSize: 150,
    }),
    col.accessor("status", {
      header: "Status",
      cell: (info) => {
        const status = info.getValue();
        if (onStatusChange) {
          return (
            <CustomSelect<IssueStatus>
              value={status}
              options={[
                { value: "open", label: "Open" },
                { value: "in_progress", label: "In Progress" },
                { value: "closed", label: "Closed" },
                { value: "deferred", label: "Deferred" },
              ]}
              onChange={(v) => onStatusChange(info.row.original.id, v)}
              aria-label={`Change status for ${info.row.original.title}`}
              size="sm"
              triggerClassName="border-none bg-transparent px-0 hover:bg-accent"
              renderOption={(opt) => <StatusBadge status={opt.value} />}
            />
          );
        }
        return <StatusBadge status={status} />;
      },
      size: 120,
    }),
    col.accessor("priority", {
      header: "Priority",
      cell: (info) => {
        const priority = info.getValue();
        if (onPriorityChange) {
          return (
            <CustomSelect<Priority>
              value={priority}
              options={[
                { value: 0 as Priority, label: "P0 — Critical" },
                { value: 1 as Priority, label: "P1 — High" },
                { value: 2 as Priority, label: "P2 — Medium" },
                { value: 3 as Priority, label: "P3 — Low" },
                { value: 4 as Priority, label: "P4 — Backlog" },
              ]}
              onChange={(v) => onPriorityChange(info.row.original.id, v)}
              aria-label={`Change priority for ${info.row.original.title}`}
              size="sm"
              triggerClassName="border-none bg-transparent px-0 hover:bg-accent"
              renderOption={(opt) => (
                <span className="flex items-center gap-2">
                  <PriorityIndicator priority={opt.value} />
                  <span>{opt.label}</span>
                </span>
              )}
            />
          );
        }
        return <PriorityIndicator priority={priority} />;
      },
      size: 80,
    }),
    col.accessor("issue_type", {
      header: "Type",
      cell: (info) => <TypeBadge type={info.getValue()} />,
      size: 80,
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
      size: 120,
    }),
    col.accessor("created_at", {
      header: "Created",
      cell: (info) => (
        <RelativeTime iso={info.getValue()} className="text-xs text-muted-foreground" />
      ),
      size: 90,
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
      size: 90,
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
      size: 160,
      enableSorting: false,
    }),
    col.accessor("has_attachments", {
      id: "has_attachments",
      header: () => (
        <svg
          className="h-4 w-4 text-muted-foreground"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-label="Attachments"
        >
          <rect x="2" y="3" width="12" height="10" rx="1.5" />
          <circle cx="5.5" cy="6.5" r="1" />
          <path d="M2 11l3-3 2.5 2.5L11 7l3 3" />
        </svg>
      ),
      cell: (info) =>
        info.getValue() ? (
          <svg
            className="h-4 w-4 text-muted-foreground"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-label="Has attachments"
          >
            <rect x="2" y="3" width="12" height="10" rx="1.5" />
            <circle cx="5.5" cy="6.5" r="1" />
            <path d="M2 11l3-3 2.5 2.5L11 7l3 3" />
          </svg>
        ) : null,
      size: 40,
      enableSorting: false,
    }),
  ];
}
