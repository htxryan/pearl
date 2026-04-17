import { useCallback, useState } from "react";
import { useFilterPresets } from "@/hooks/use-filter-presets";
import { addToast } from "@/hooks/use-toast";
import { DATE_RANGE_LABELS, STRUCTURAL_FILTER_LABELS } from "@/lib/query-syntax";
import { cn } from "@/lib/utils";
import type { FilterState, GroupByField } from "./filter-bar-types";
import { GROUP_BY_LABELS } from "./filter-bar-types";

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
  return (
    <select
      multiple
      value={selected.map(String)}
      onChange={(e) => {
        const values = Array.from(e.target.selectedOptions, (o) =>
          typeof options[0] === "number" ? (Number(o.value) as T) : (o.value as T),
        );
        onChange(values);
      }}
      className="h-8 min-w-[100px] rounded border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
      aria-label={`Filter by ${label}`}
    >
      {options.map((opt) => (
        <option key={String(opt)} value={String(opt)}>
          {(labels as Record<string, string>)[String(opt)]}
        </option>
      ))}
    </select>
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
        className="ml-0.5 text-muted-foreground hover:text-foreground"
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
      {filters.status.map((s) => (
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

// ─── PresetSelector ───────────────────────────────────

export function PresetSelector({
  filters,
  onChange,
}: {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}) {
  const { presets, save: savePreset, remove: removePreset } = useFilterPresets();
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [presetName, setPresetName] = useState("");

  const handleSavePreset = useCallback(() => {
    if (!presetName.trim()) return;
    savePreset(presetName.trim(), filters);
    addToast({ message: `Saved view "${presetName.trim()}"`, variant: "success" });
    setPresetName("");
    setShowSaveInput(false);
  }, [presetName, savePreset, filters]);

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {presets.map((preset) => (
        <button
          key={preset.id}
          onClick={() => onChange(preset.filters)}
          className="group inline-flex items-center gap-1 h-7 rounded-full border border-border bg-background px-3 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
        >
          {preset.name}
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              removePreset(preset.id);
              addToast({ message: `Removed view "${preset.name}"`, variant: "info" });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                removePreset(preset.id);
                addToast({ message: `Removed view "${preset.name}"`, variant: "info" });
              }
            }}
            className="hidden group-hover:inline ml-0.5 text-muted-foreground hover:text-destructive"
            aria-label={`Remove preset ${preset.name}`}
          >
            &times;
          </span>
        </button>
      ))}
      {hasActiveFilters(filters) && !showSaveInput && (
        <button
          onClick={() => setShowSaveInput(true)}
          className="h-7 rounded-full border border-dashed border-border px-3 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
        >
          + Save view
        </button>
      )}
      {showSaveInput && (
        <div className="inline-flex items-center gap-1">
          <input
            autoFocus
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSavePreset();
              if (e.key === "Escape") {
                setShowSaveInput(false);
                setPresetName("");
              }
            }}
            placeholder="View name..."
            className="h-7 w-32 rounded border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            onClick={handleSavePreset}
            disabled={!presetName.trim()}
            className="h-7 rounded bg-primary px-2 text-xs text-primary-foreground disabled:opacity-50"
          >
            Save
          </button>
          <button
            onClick={() => {
              setShowSaveInput(false);
              setPresetName("");
            }}
            className="h-7 rounded px-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
}

export function hasActiveFilters(filters: FilterState): boolean {
  return (
    filters.status.length > 0 ||
    filters.priority.length > 0 ||
    filters.issue_type.length > 0 ||
    filters.assignee !== "" ||
    filters.search !== "" ||
    filters.labels.length > 0 ||
    filters.dateRanges.length > 0 ||
    filters.structural.length > 0
  );
}

// ─── countActiveFilters ───────────────────────────────

export function countActiveFilters(filters: FilterState): number {
  let count = 0;
  if (filters.status.length > 0) count += filters.status.length;
  if (filters.priority.length > 0) count += filters.priority.length;
  if (filters.issue_type.length > 0) count += filters.issue_type.length;
  if (filters.assignee) count += 1;
  if (filters.search) count += 1;
  if (filters.labels.length > 0) count += filters.labels.length;
  if (filters.dateRanges.length > 0) count += filters.dateRanges.length;
  if (filters.structural.length > 0) count += filters.structural.length;
  return count;
}
