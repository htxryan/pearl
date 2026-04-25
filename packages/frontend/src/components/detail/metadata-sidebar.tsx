import type { Issue, LabelColor } from "@pearl/shared";
import { ISSUE_PRIORITIES, ISSUE_TYPES, SETTABLE_STATUSES } from "@pearl/shared";
import { useCallback, useEffect, useId, useRef } from "react";
import { FieldEditor } from "@/components/detail/field-editor";
import { DatePicker } from "@/components/ui/date-picker";
import { LabelPicker } from "@/components/ui/label-picker";
import { RelativeTime } from "@/components/ui/relative-time";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { FieldRow, SelectField, statusLabel } from "@/views/detail-components";

const COLLAPSED_KEY = "issueDetail.sidebarCollapsed";
const WIDTH_KEY = "issueDetail.sidebarWidth";
export const DEFAULT_SIDEBAR_WIDTH = 280;
export const MIN_SIDEBAR_WIDTH = 220;
export const MAX_SIDEBAR_WIDTH = 480;

export function useMetadataSidebarState() {
  const [collapsed, setCollapsed] = usePersistedState<boolean>(COLLAPSED_KEY, false);
  const [rawWidth, setRawWidth] = usePersistedState<number>(WIDTH_KEY, DEFAULT_SIDEBAR_WIDTH);
  const clamp = useCallback(
    (v: number) => Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, v)),
    [],
  );
  const width = clamp(rawWidth);
  const setWidth = useCallback((v: number) => setRawWidth(clamp(v)), [setRawWidth, clamp]);
  return { collapsed, setCollapsed, width, setWidth };
}

export type MetadataSidebarLayout = "sidebar" | "inline";

interface MetadataSidebarProps {
  issue: Issue;
  onFieldUpdate: (field: string, value: unknown) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  /** Only used when layout === "sidebar". */
  width: number;
  /** Only used when layout === "sidebar". */
  onWidthChange: (width: number) => void;
  layout?: MetadataSidebarLayout;
}

export function MetadataSidebar({
  issue,
  onFieldUpdate,
  collapsed,
  onToggleCollapsed,
  width,
  onWidthChange,
  layout = "sidebar",
}: MetadataSidebarProps) {
  if (layout === "inline") {
    return (
      <InlineMetadata
        issue={issue}
        onFieldUpdate={onFieldUpdate}
        collapsed={collapsed}
        onToggleCollapsed={onToggleCollapsed}
      />
    );
  }
  return (
    <SidebarMetadata
      issue={issue}
      onFieldUpdate={onFieldUpdate}
      collapsed={collapsed}
      onToggleCollapsed={onToggleCollapsed}
      width={width}
      onWidthChange={onWidthChange}
    />
  );
}

function SidebarMetadata({
  issue,
  onFieldUpdate,
  collapsed,
  onToggleCollapsed,
  width,
  onWidthChange,
}: {
  issue: Issue;
  onFieldUpdate: (field: string, value: unknown) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  width: number;
  onWidthChange: (width: number) => void;
}) {
  const isDraggingRef = useRef(false);

  const onDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDraggingRef.current = true;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const startX = e.clientX;
      const startWidth = width;

      const onMove = (ev: MouseEvent) => {
        if (!isDraggingRef.current) return;
        // Left edge of right sidebar: cursor moving left → wider sidebar.
        const delta = startX - ev.clientX;
        const next = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, startWidth + delta));
        onWidthChange(next);
      };
      const onUp = () => {
        isDraggingRef.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [width, onWidthChange],
  );

  useEffect(() => {
    return () => {
      if (isDraggingRef.current) {
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
  }, []);

  if (collapsed) {
    return (
      <aside
        className="shrink-0 w-8 border-l border-border bg-muted/20 flex flex-col items-center py-2"
        aria-label="Issue metadata"
      >
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label="Expand metadata sidebar"
          aria-expanded={false}
          title="Expand metadata sidebar"
          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft />
        </button>
        <div
          className="mt-3 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          Fields
        </div>
      </aside>
    );
  }

  return (
    <aside
      className="shrink-0 relative border-l border-border bg-muted/10 flex flex-col"
      style={{ width: `${width}px` }}
      aria-label="Issue metadata"
    >
      <button
        type="button"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize metadata sidebar"
        aria-valuemin={MIN_SIDEBAR_WIDTH}
        aria-valuemax={MAX_SIDEBAR_WIDTH}
        aria-valuenow={width}
        tabIndex={0}
        onMouseDown={onDragStart}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 40 : 10;
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            onWidthChange(Math.min(MAX_SIDEBAR_WIDTH, width + step));
          } else if (e.key === "ArrowRight") {
            e.preventDefault();
            onWidthChange(Math.max(MIN_SIDEBAR_WIDTH, width - step));
          }
        }}
        className="absolute left-0 top-0 bottom-0 w-1 -translate-x-1/2 cursor-col-resize hover:bg-primary/40 active:bg-primary/60 transition-colors z-10"
      />

      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h2 className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest">
          Fields
        </h2>
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label="Collapse metadata sidebar"
          aria-expanded={true}
          title="Collapse metadata sidebar"
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight />
        </button>
      </div>

      <div className="flex-1 overflow-auto px-4 pb-4 space-y-3">
        <FieldsList issue={issue} onFieldUpdate={onFieldUpdate} />
      </div>
    </aside>
  );
}

function InlineMetadata({
  issue,
  onFieldUpdate,
  collapsed,
  onToggleCollapsed,
}: {
  issue: Issue;
  onFieldUpdate: (field: string, value: unknown) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const fieldsId = useId();
  return (
    <div className="bg-muted/10">
      <button
        type="button"
        onClick={onToggleCollapsed}
        aria-expanded={!collapsed}
        aria-controls={fieldsId}
        className="flex items-center justify-between w-full px-4 sm:px-6 py-3 text-left hover:bg-muted/30 transition-colors"
      >
        <h2 className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest">
          Fields
        </h2>
        <svg
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
            collapsed ? "" : "rotate-180"
          }`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {!collapsed && (
        <div id={fieldsId} className="px-4 sm:px-6 pb-4 space-y-3">
          <FieldsList issue={issue} onFieldUpdate={onFieldUpdate} />
        </div>
      )}
    </div>
  );
}

function FieldsList({
  issue,
  onFieldUpdate,
}: {
  issue: Issue;
  onFieldUpdate: (field: string, value: unknown) => void;
}) {
  return (
    <>
      <FieldRow label="Labels">
        <LabelPicker
          selected={issue.labels}
          selectedColors={(issue.labelColors ?? {}) as Record<string, LabelColor>}
          onChange={(labels) => onFieldUpdate("labels", labels)}
        />
      </FieldRow>
      <FieldRow label="Updated">
        <RelativeTime iso={issue.updated_at} className="text-sm text-muted-foreground" />
      </FieldRow>
      <FieldRow label="Created">
        <span className="text-sm text-muted-foreground">
          <RelativeTime iso={issue.created_at} /> by {issue.created_by}
        </span>
      </FieldRow>
      <FieldRow label="Due Date">
        <DatePicker
          value={issue.due_at ? issue.due_at.slice(0, 10) : null}
          onChange={(date) => onFieldUpdate("due", date)}
        />
      </FieldRow>
      <FieldRow label="Assignee">
        <FieldEditor
          value={issue.assignee ?? ""}
          field="assignee"
          onSave={(val) => onFieldUpdate("assignee", val || null)}
          placeholder="Unassigned"
        />
      </FieldRow>
      <FieldRow label="Priority">
        <SelectField
          value={String(issue.priority)}
          options={ISSUE_PRIORITIES.map((p) => ({ value: String(p), label: `P${p}` }))}
          onChange={(v) => onFieldUpdate("priority", Number(v))}
          label="Priority"
        />
      </FieldRow>
      <FieldRow label="Status">
        <SelectField
          value={issue.status}
          options={SETTABLE_STATUSES.map((s) => ({ value: s, label: statusLabel(s) }))}
          onChange={(v) => onFieldUpdate("status", v)}
          label="Status"
        />
      </FieldRow>
      <FieldRow label="Type">
        <SelectField
          value={issue.issue_type}
          options={ISSUE_TYPES.map((t) => ({
            value: t,
            label: t.charAt(0).toUpperCase() + t.slice(1),
          }))}
          onChange={(v) => onFieldUpdate("issue_type", v)}
          label="Type"
        />
      </FieldRow>
      <FieldRow label="Owner">
        <span className="text-sm">{issue.owner}</span>
      </FieldRow>
      {issue.closed_at && (
        <FieldRow label="Closed">
          <RelativeTime iso={issue.closed_at} className="text-sm text-muted-foreground" />
        </FieldRow>
      )}
    </>
  );
}

function ChevronLeft() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 12L6 8l4-4" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 4l4 4-4 4" />
    </svg>
  );
}
