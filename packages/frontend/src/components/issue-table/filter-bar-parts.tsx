import { useCallback, useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CustomSelect } from "@/components/ui/custom-select";
import { useFilterPresets } from "@/hooks/use-filter-presets";
import { addToast } from "@/hooks/use-toast";
import {
  ACTIVE_FILTERS,
  DATE_RANGE_LABELS,
  EMPTY_FILTERS,
  STRUCTURAL_FILTER_LABELS,
} from "@/lib/query-syntax";
import { cn } from "@/lib/utils";
import type { FilterState } from "./filter-bar-types";
import { GROUP_BY_LABELS, isDefaultStatuses, isShowingAllStatuses } from "./filter-bar-types";

// ─── Constants ────────────────────────────────────────

export const PRIORITY_LABELS: Record<number, string> = {
  0: "P0",
  1: "P1",
  2: "P2",
  3: "P3",
  4: "P4",
};
export const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  closed: "Closed",
  blocked: "Blocked",
  deferred: "Deferred",
};
export const TYPE_LABELS: Record<string, string> = {
  task: "Task",
  bug: "Bug",
  epic: "Epic",
  feature: "Feature",
  chore: "Chore",
  event: "Event",
  gate: "Gate",
  molecule: "Molecule",
};

// ─── MultiSelect ──────────────────────────────────────

export function MultiSelect<T extends string | number>({
  label,
  options,
  selected,
  labels,
  onChange,
}: {
  label: string;
  options: T[];
  selected: T[];
  labels: Record<string & T, string> | Record<number & T, string>;
  onChange: (values: T[]) => void;
}) {
  const selectOptions = options.map((opt) => ({
    value: opt,
    label: (labels as Record<string, string>)[String(opt)],
  }));

  return (
    <CustomSelect<T>
      multiple
      value={selected}
      options={selectOptions}
      onChange={onChange}
      placeholder={label.charAt(0).toUpperCase() + label.slice(1)}
      aria-label={`Filter by ${label}`}
      className="min-w-[100px]"
    />
  );
}

// ─── FilterPill ───────────────────────────────────────

export function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-xs text-accent-foreground",
      )}
    >
      {label}
      <button
        onClick={onRemove}
        className="ml-0.5 min-w-[28px] min-h-[28px] inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
        aria-label={`Remove filter: ${label}`}
      >
        &times;
      </button>
    </span>
  );
}

// ─── FilterPills ──────────────────────────────────────

export function FilterPills({
  filters,
  setField,
}: {
  filters: FilterState;
  setField: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
}) {
  if (!hasActiveFilters(filters)) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {!isShowingAllStatuses(filters.status) &&
        !isDefaultStatuses(filters.status) &&
        filters.status.map((s) => (
          <FilterPill
            key={`status-${s}`}
            label={`Status: ${STATUS_LABELS[s]}`}
            onRemove={() =>
              setField(
                "status",
                filters.status.filter((x) => x !== s),
              )
            }
          />
        ))}
      {filters.priority.map((p) => (
        <FilterPill
          key={`priority-${p}`}
          label={`Priority: ${PRIORITY_LABELS[p]}`}
          onRemove={() =>
            setField(
              "priority",
              filters.priority.filter((x) => x !== p),
            )
          }
        />
      ))}
      {filters.issue_type.map((t) => (
        <FilterPill
          key={`type-${t}`}
          label={`Type: ${TYPE_LABELS[t]}`}
          onRemove={() =>
            setField(
              "issue_type",
              filters.issue_type.filter((x) => x !== t),
            )
          }
        />
      ))}
      {filters.assignee && (
        <FilterPill
          label={`Assignee: ${filters.assignee}`}
          onRemove={() => setField("assignee", "")}
        />
      )}
      {filters.labels.map((l) => (
        <FilterPill
          key={`label-${l}`}
          label={`Label: ${l}`}
          onRemove={() =>
            setField(
              "labels",
              filters.labels.filter((x) => x !== l),
            )
          }
        />
      ))}
      {filters.dateRanges.map((d) => (
        <FilterPill
          key={`date-${d}`}
          label={`Date: ${DATE_RANGE_LABELS[d]}`}
          onRemove={() =>
            setField(
              "dateRanges",
              filters.dateRanges.filter((x) => x !== d),
            )
          }
        />
      ))}
      {filters.structural.map((s) => (
        <FilterPill
          key={`struct-${s}`}
          label={STRUCTURAL_FILTER_LABELS[s]}
          onRemove={() =>
            setField(
              "structural",
              filters.structural.filter((x) => x !== s),
            )
          }
        />
      ))}
      {filters.groupBy && (
        <FilterPill
          label={`Group: ${GROUP_BY_LABELS[filters.groupBy]}`}
          onRemove={() => setField("groupBy", null)}
        />
      )}
      {filters.search && (
        <FilterPill label={`Search: "${filters.search}"`} onRemove={() => setField("search", "")} />
      )}
    </div>
  );
}

// ─── Preset Dropdown (Jira-style) ────────────────────

function arraysEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

function filtersMatch(a: FilterState, b: FilterState): boolean {
  return (
    arraysEqual(a.status, b.status) &&
    arraysEqual(a.priority, b.priority) &&
    arraysEqual(a.issue_type, b.issue_type) &&
    a.assignee === b.assignee &&
    a.search === b.search &&
    arraysEqual(a.labels, b.labels) &&
    arraysEqual(a.dateRanges, b.dateRanges) &&
    arraysEqual(a.structural, b.structural) &&
    a.groupBy === b.groupBy
  );
}

function isUserPreset(id: string): boolean {
  return /^preset-\d+$/.test(id);
}

export function PresetDropdown({
  filters,
  onChange,
}: {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}) {
  const {
    presets,
    activePresetId,
    save: savePreset,
    remove: removePreset,
    selectPreset,
  } = useFilterPresets();
  const [open, setOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const exactMatch = presets.find((p) => filtersMatch(p.filters, filters));
  const selectedPreset = activePresetId ? presets.find((p) => p.id === activePresetId) : null;
  const hasUnsavedChanges = selectedPreset && !exactMatch;

  useEffect(() => {
    if (exactMatch && exactMatch.id !== activePresetId) {
      selectPreset(exactMatch.id);
    }
  }, [exactMatch, activePresetId, selectPreset]);

  const label = exactMatch
    ? exactMatch.name
    : selectedPreset && hasUnsavedChanges
      ? selectedPreset.name
      : filtersMatch(filters, ACTIVE_FILTERS)
        ? "Active Issues"
        : hasActiveFilters(filters)
          ? "Custom"
          : "All Issues";

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1.5 h-8 rounded border px-3 text-sm font-medium transition-colors",
          exactMatch
            ? "border-primary/50 bg-primary/5 text-primary hover:border-primary/70"
            : hasUnsavedChanges
              ? "border-amber-500/50 bg-amber-500/5 text-amber-700 dark:text-amber-400 hover:border-amber-500/70"
              : "border-border text-foreground hover:border-foreground/30",
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <line x1="2" y1="4" x2="14" y2="4" />
          <line x1="4" y1="8" x2="12" y2="8" />
          <line x1="6" y1="12" x2="10" y2="12" />
        </svg>
        {label}
        {hasUnsavedChanges && (
          <span
            className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500"
            role="img"
            aria-label="Modified"
          />
        )}
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={cn("shrink-0 opacity-50 transition-transform", open && "rotate-180")}
        >
          <path d="M3 4.5L6 7.5L9 4.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 min-w-[220px] rounded-lg border border-border bg-background shadow-lg py-1">
          {/* Active Issues (clear) */}
          <button
            type="button"
            onClick={() => {
              onChange(ACTIVE_FILTERS);
              selectPreset(null);
              setOpen(false);
            }}
            className={cn(
              "flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent",
              !exactMatch && !hasActiveFilters(filters) && "font-medium",
            )}
          >
            Active Issues
          </button>

          <div className="my-1 border-t border-border" />

          {/* Built-in + user presets */}
          {presets.map((preset) => (
            <div key={preset.id} className="group flex items-center">
              <button
                type="button"
                onClick={() => {
                  onChange(preset.filters);
                  selectPreset(preset.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex-1 text-left px-3 py-1.5 text-sm hover:bg-accent",
                  (exactMatch?.id === preset.id ||
                    (hasUnsavedChanges && activePresetId === preset.id)) &&
                    "font-medium text-primary",
                )}
              >
                {preset.name}
                {hasUnsavedChanges && activePresetId === preset.id && (
                  <span className="ml-1.5 text-xs text-amber-500">(modified)</span>
                )}
              </button>
              {isUserPreset(preset.id) ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPendingDelete({ id: preset.id, name: preset.name });
                    setOpen(false);
                  }}
                  className="hidden group-hover:inline-flex items-center justify-center w-6 h-6 mr-1 text-muted-foreground hover:text-destructive"
                  aria-label={`Remove ${preset.name}`}
                >
                  &times;
                </button>
              ) : null}
            </div>
          ))}

          {/* Save as new filter (always available when there are active filters) */}
          {hasActiveFilters(filters) && !exactMatch && (
            <>
              <div className="my-1 border-t border-border" />
              <SaveAsInline
                filters={filters}
                savePreset={savePreset}
                onClose={() => setOpen(false)}
              />
            </>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        title="Delete saved filter?"
        description={`Are you sure you want to delete "${pendingDelete?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => {
          if (!pendingDelete) return;
          removePreset(pendingDelete.id);
          addToast({ message: `Removed "${pendingDelete.name}"`, variant: "info" });
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

function SaveAsInline({
  filters,
  savePreset,
  onClose,
}: {
  filters: FilterState;
  savePreset: (name: string, filters: FilterState) => string;
  onClose: () => void;
}) {
  const [showInput, setShowInput] = useState(false);
  const [newName, setNewName] = useState("");

  const handleSave = useCallback(() => {
    if (!newName.trim()) return;
    savePreset(newName.trim(), filters);
    addToast({ message: `Saved filter "${newName.trim()}"`, variant: "success" });
    setNewName("");
    setShowInput(false);
    onClose();
  }, [newName, savePreset, filters, onClose]);

  if (!showInput) {
    return (
      <button
        type="button"
        onClick={() => setShowInput(true)}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent"
      >
        Save as new filter...
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1 px-3 py-1.5">
      <input
        autoFocus
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") {
            setShowInput(false);
            setNewName("");
          }
        }}
        placeholder="Filter name..."
        className="h-7 flex-1 min-w-0 rounded border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
      />
      <button
        type="button"
        onClick={handleSave}
        disabled={!newName.trim()}
        className="h-7 rounded bg-primary px-2 text-xs text-primary-foreground disabled:opacity-50"
      >
        Save
      </button>
    </div>
  );
}

// ─── UnsavedChangesBar ───────────────────────────────

export function UnsavedChangesBar({
  filters,
  onChange,
}: {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}) {
  const { presets, activePresetId, save: savePreset, update: updatePreset } = useFilterPresets();
  const [showSaveAs, setShowSaveAs] = useState(false);
  const [newName, setNewName] = useState("");

  const exactMatch = presets.find((p) => filtersMatch(p.filters, filters));
  const selectedPreset = activePresetId ? presets.find((p) => p.id === activePresetId) : null;
  const hasUnsavedChanges = selectedPreset && !exactMatch;

  if (!hasUnsavedChanges || !selectedPreset) return null;

  const handleSave = () => {
    updatePreset(selectedPreset.id, filters);
    addToast({ message: `Updated "${selectedPreset.name}"`, variant: "success" });
  };

  const handleDiscard = () => {
    onChange(selectedPreset.filters);
  };

  const handleSaveAs = () => {
    if (!newName.trim()) return;
    savePreset(newName.trim(), filters);
    addToast({ message: `Saved filter "${newName.trim()}"`, variant: "success" });
    setNewName("");
    setShowSaveAs(false);
  };

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Modified</span>

      {isUserPreset(selectedPreset.id) && (
        <button
          type="button"
          onClick={handleSave}
          className="h-7 rounded border border-primary/30 bg-primary/10 px-2.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
        >
          Save
        </button>
      )}

      {!showSaveAs ? (
        <button
          type="button"
          onClick={() => setShowSaveAs(true)}
          className="h-7 rounded border border-border px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
        >
          Save As
        </button>
      ) : (
        <div className="flex items-center gap-1">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveAs();
              if (e.key === "Escape") {
                setShowSaveAs(false);
                setNewName("");
              }
            }}
            onBlur={() => {
              if (!newName.trim()) {
                setShowSaveAs(false);
                setNewName("");
              }
            }}
            placeholder="Filter name..."
            className="h-7 w-32 rounded border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            type="button"
            onClick={handleSaveAs}
            disabled={!newName.trim()}
            className="h-7 rounded bg-primary px-2 text-xs text-primary-foreground disabled:opacity-50"
          >
            Save
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={handleDiscard}
        className="h-7 rounded border border-border px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
      >
        Discard
      </button>
    </div>
  );
}

export function hasActiveFilters(filters: FilterState): boolean {
  const hasNonDefaultStatus =
    filters.status.length > 0 &&
    !isShowingAllStatuses(filters.status) &&
    !isDefaultStatuses(filters.status);
  return (
    hasNonDefaultStatus ||
    filters.priority.length > 0 ||
    filters.issue_type.length > 0 ||
    filters.assignee !== "" ||
    filters.search !== "" ||
    filters.labels.length > 0 ||
    filters.dateRanges.length > 0 ||
    filters.structural.length > 0 ||
    filters.groupBy !== null
  );
}

// ─── countActiveFilters ───────────────────────────────

export function countActiveFilters(filters: FilterState): number {
  let count = 0;
  if (
    filters.status.length > 0 &&
    !isShowingAllStatuses(filters.status) &&
    !isDefaultStatuses(filters.status)
  )
    count += filters.status.length;
  if (filters.priority.length > 0) count += filters.priority.length;
  if (filters.issue_type.length > 0) count += filters.issue_type.length;
  if (filters.assignee) count += 1;
  if (filters.search) count += 1;
  if (filters.labels.length > 0) count += filters.labels.length;
  if (filters.dateRanges.length > 0) count += filters.dateRanges.length;
  if (filters.structural.length > 0) count += filters.structural.length;
  return count;
}
