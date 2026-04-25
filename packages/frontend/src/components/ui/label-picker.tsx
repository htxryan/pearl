import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import type { LabelColor, LabelWithCount } from "@pearl/shared";
import { LABEL_COLORS } from "@pearl/shared";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCreateLabel, useLabels } from "@/hooks/use-labels";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import { LABEL_PALETTE, LabelBadge } from "./label-badge";

interface LabelPickerProps {
  selected: string[];
  selectedColors: Record<string, LabelColor>;
  onChange: (labels: string[]) => void;
  allowCreate?: boolean;
  placeholder?: string;
  className?: string;
}

export function LabelPicker({
  selected,
  selectedColors,
  onChange,
  allowCreate = true,
  placeholder = "Search labels...",
  className,
}: LabelPickerProps) {
  const [search, setSearch] = useState("");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [newLabelColor, setNewLabelColor] = useState<LabelColor | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: allLabels = [] } = useLabels();
  const createLabel = useCreateLabel();

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const filteredLabels = useMemo(
    () =>
      allLabels.filter(
        (l) => !selectedSet.has(l.name) && l.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [allLabels, selectedSet, search],
  );

  const searchTrimmed = search.trim();
  const exactMatch = allLabels.some((l) => l.name.toLowerCase() === searchTrimmed.toLowerCase());
  const canCreate =
    allowCreate && searchTrimmed.length > 0 && !exactMatch && !selectedSet.has(searchTrimmed);

  const selectLabel = useCallback(
    (labelName: string) => {
      onChange([...selected, labelName]);
      setSearch("");
      inputRef.current?.focus();
    },
    [selected, onChange],
  );

  const removeLabel = useCallback(
    (labelName: string) => {
      onChange(selected.filter((l) => l !== labelName));
    },
    [selected, onChange],
  );

  const handleCreateNew = useCallback(
    async (name: string, color?: LabelColor) => {
      const assignedColor = color ?? LABEL_COLORS[Math.floor(Math.random() * LABEL_COLORS.length)];
      try {
        await createLabel.mutateAsync({ name, color: assignedColor });
        selectLabel(name);
      } catch (err) {
        console.error("Label creation failed:", err);
      }
      setShowColorPicker(false);
      setNewLabelColor(null);
    },
    [createLabel, selectLabel],
  );

  const labelColorMap = useMemo(() => {
    const map: Record<string, LabelColor> = { ...selectedColors };
    for (const label of allLabels) {
      if (!map[label.name]) map[label.name] = label.color as LabelColor;
    }
    return map;
  }, [selectedColors, allLabels]);

  const handleValueChange = useCallback(
    (values: string[] | null) => {
      if (!values) return;
      const added = values.find((v) => !selectedSet.has(v));
      if (added) {
        selectLabel(added);
      } else {
        onChange(values);
      }
    },
    [selectedSet, selectLabel, onChange],
  );

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <ComboboxPrimitive.Root
        multiple
        value={selected}
        onValueChange={handleValueChange}
        onInputValueChange={(val) => setSearch(val)}
        modal={false}
      >
        <div
          className="flex flex-wrap items-center gap-1.5 min-h-[36px] rounded-lg border border-border bg-background px-2 py-1 cursor-text focus-within:ring-2 focus-within:ring-ring"
          onClick={() => inputRef.current?.focus()}
        >
          {selected.map((label) => (
            <LabelBadge
              key={label}
              name={label}
              color={labelColorMap[label]}
              removable
              onRemove={() => removeLabel(label)}
            />
          ))}
          <ComboboxPrimitive.Input
            ref={inputRef}
            placeholder={selected.length === 0 ? placeholder : ""}
            className="text-sm bg-transparent border-none outline-none min-w-[80px] flex-1"
            aria-label="Search labels"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                e.preventDefault();
                if (showColorPicker) {
                  setShowColorPicker(false);
                }
              }
              if (e.key === "Backspace" && !search && selected.length > 0) {
                removeLabel(selected[selected.length - 1]);
              }
              if (e.key === "Enter" && canCreate) {
                e.preventDefault();
                e.stopPropagation();
                handleCreateNew(searchTrimmed);
              }
            }}
          />
        </div>

        <ComboboxPrimitive.Portal>
          <ComboboxPrimitive.Positioner sideOffset={4}>
            <ComboboxPrimitive.Popup className="z-50 w-[var(--anchor-width)] rounded-lg border border-border bg-background shadow-lg max-h-60 overflow-hidden transition-[opacity,transform] duration-150 data-[starting-style]:opacity-0 data-[starting-style]:scale-95 data-[ending-style]:opacity-0 data-[ending-style]:scale-95">
              {showColorPicker ? (
                <ColorPickerPanel
                  labelName={searchTrimmed}
                  selectedColor={newLabelColor}
                  onSelectColor={setNewLabelColor}
                  onConfirm={() => handleCreateNew(searchTrimmed, newLabelColor ?? undefined)}
                  onCancel={() => setShowColorPicker(false)}
                />
              ) : (
                <>
                  <VirtualizedLabelList labels={filteredLabels} labelColorMap={labelColorMap} />
                  {canCreate && (
                    <div
                      role="option"
                      aria-selected={false}
                      className="flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm hover:bg-accent border-t border-border"
                      onClick={() => setShowColorPicker(true)}
                    >
                      <span className="text-muted-foreground">Create</span>
                      <span className="font-medium">&ldquo;{searchTrimmed}&rdquo;</span>
                    </div>
                  )}
                  <ComboboxPrimitive.Empty className="px-3 py-2 text-sm text-muted-foreground">
                    No matching labels
                  </ComboboxPrimitive.Empty>
                </>
              )}
            </ComboboxPrimitive.Popup>
          </ComboboxPrimitive.Positioner>
        </ComboboxPrimitive.Portal>
      </ComboboxPrimitive.Root>
    </div>
  );
}

function VirtualizedLabelList({
  labels,
  labelColorMap,
}: {
  labels: LabelWithCount[];
  labelColorMap: Record<string, LabelColor>;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const useVirtual = labels.length > 50;

  const virtualizer = useVirtualizer({
    count: labels.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32,
    overscan: 5,
    enabled: useVirtual,
  });

  if (!useVirtual) {
    return (
      <div className="overflow-y-auto max-h-52 py-1">
        {labels.map((label) => (
          <ComboboxPrimitive.Item
            key={label.name}
            value={label.name}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm outline-none",
              "data-[highlighted]:bg-accent",
            )}
          >
            <LabelBadge name={label.name} color={label.color as LabelColor} size="sm" />
            <span className="text-xs text-muted-foreground ml-auto">{label.count}</span>
          </ComboboxPrimitive.Item>
        ))}
      </div>
    );
  }

  return (
    <div ref={parentRef} className="overflow-y-auto max-h-52 py-1">
      <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const label = labels[virtualRow.index];
          return (
            <ComboboxPrimitive.Item
              key={label.name}
              value={label.name}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm outline-none absolute left-0 right-0",
                "data-[highlighted]:bg-accent",
              )}
              style={{
                height: virtualRow.size,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <LabelBadge
                name={label.name}
                color={labelColorMap[label.name] ?? (label.color as LabelColor)}
                size="sm"
              />
              <span className="text-xs text-muted-foreground ml-auto">{label.count}</span>
            </ComboboxPrimitive.Item>
          );
        })}
      </div>
    </div>
  );
}

function ColorPickerPanel({
  labelName,
  selectedColor,
  onSelectColor,
  onConfirm,
  onCancel,
}: {
  labelName: string;
  selectedColor: LabelColor | null;
  onSelectColor: (color: LabelColor) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { theme } = useTheme();
  const isDark = theme.colorScheme === "dark";

  return (
    <div className="p-3 space-y-3">
      <div className="text-sm font-medium">Color for &ldquo;{labelName}&rdquo;</div>
      <div className="grid grid-cols-5 gap-2">
        {LABEL_COLORS.map((c) => {
          const pal = LABEL_PALETTE[c];
          const bg = isDark ? pal.darkBg : pal.bg;
          const border = selectedColor === c ? "ring-2 ring-ring ring-offset-1" : "";
          return (
            <button
              key={c}
              type="button"
              onClick={() => onSelectColor(c)}
              className={cn("h-7 w-full rounded-md transition-shadow", border)}
              style={{ backgroundColor: bg }}
              aria-label={c}
              title={c}
            />
          );
        })}
      </div>
      {selectedColor && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Preview:</span>
          <LabelBadge name={labelName} color={selectedColor} />
        </div>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onConfirm}
          className="flex-1 h-8 rounded bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
        >
          {selectedColor ? "Create" : "Create (random color)"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-8 rounded px-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
