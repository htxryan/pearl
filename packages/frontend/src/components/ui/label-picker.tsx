import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import type { LabelColor, LabelWithCount } from "@pearl/shared";
import { LABEL_COLORS } from "@pearl/shared";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCreateLabel, useLabels } from "@/hooks/use-labels";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import { ComboboxEmpty, ComboboxInput } from "./combobox";
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
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

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

  const itemCount = filteredLabels.length + (canCreate ? 1 : 0);

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

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (showColorPicker) {
        if (e.key === "Escape") {
          e.stopPropagation();
          e.preventDefault();
          setShowColorPicker(false);
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          if (itemCount === 0) break;
          setHighlightedIndex((prev) => (prev < itemCount - 1 ? prev + 1 : 0));
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          if (itemCount === 0) break;
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : itemCount - 1));
          break;
        }
        case "Home": {
          e.preventDefault();
          if (itemCount > 0) setHighlightedIndex(0);
          break;
        }
        case "End": {
          e.preventDefault();
          if (itemCount > 0) setHighlightedIndex(itemCount - 1);
          break;
        }
        case "Enter": {
          if (highlightedIndex >= 0 && highlightedIndex < filteredLabels.length) {
            e.preventDefault();
            e.stopPropagation();
            selectLabel(filteredLabels[highlightedIndex].name);
            setHighlightedIndex(-1);
          } else if (highlightedIndex === filteredLabels.length && canCreate) {
            e.preventDefault();
            e.stopPropagation();
            setShowColorPicker(true);
          } else if (canCreate && filteredLabels.length === 0) {
            e.preventDefault();
            e.stopPropagation();
            handleCreateNew(searchTrimmed);
          }
          break;
        }
        case "Escape": {
          e.stopPropagation();
          setHighlightedIndex(-1);
          break;
        }
        case "Backspace": {
          if (!search && selected.length > 0) {
            removeLabel(selected[selected.length - 1]);
          }
          break;
        }
      }
    },
    [
      showColorPicker,
      itemCount,
      highlightedIndex,
      filteredLabels,
      canCreate,
      searchTrimmed,
      search,
      selected,
      selectLabel,
      removeLabel,
      handleCreateNew,
    ],
  );

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <ComboboxPrimitive.Root
        multiple
        value={selected}
        onValueChange={handleValueChange}
        onInputValueChange={(val) => {
          setSearch(val);
          setHighlightedIndex(-1);
        }}
        modal={false}
      >
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: click delegates focus to inner ComboboxInput */}
        {/* biome-ignore lint/a11y/noStaticElementInteractions: visual container delegates to inner input */}
        <div
          className="flex flex-wrap items-center gap-1.5 min-h-[36px] rounded-lg border border-border bg-background px-2 py-1 cursor-text ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
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
          <ComboboxInput
            ref={inputRef}
            placeholder={selected.length === 0 ? placeholder : ""}
            className="min-w-[80px] flex-1 w-auto"
            aria-label="Search labels"
            onKeyDown={handleKeyDown}
          />
        </div>

        <ComboboxPrimitive.Portal>
          <ComboboxPrimitive.Positioner sideOffset={4} className="z-[60]">
            <ComboboxPrimitive.Popup className="w-[var(--anchor-width)] rounded-lg border border-border bg-background shadow-lg max-h-60 overflow-hidden transition-[opacity,transform] duration-150 data-[starting-style]:opacity-0 data-[starting-style]:scale-95 data-[ending-style]:opacity-0 data-[ending-style]:scale-95">
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
                  <LabelList
                    labels={filteredLabels}
                    labelColorMap={labelColorMap}
                    highlightedIndex={highlightedIndex}
                  />
                  {canCreate && (
                    <div
                      role="option"
                      tabIndex={-1}
                      aria-selected={false}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm hover:bg-accent outline-none border-t border-border",
                        highlightedIndex === filteredLabels.length && "bg-accent",
                      )}
                      onClick={() => setShowColorPicker(true)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setShowColorPicker(true);
                        }
                      }}
                    >
                      <span className="text-muted-foreground">Create</span>
                      <span className="font-medium">&ldquo;{searchTrimmed}&rdquo;</span>
                    </div>
                  )}
                  <ComboboxEmpty>No matching labels</ComboboxEmpty>
                </>
              )}
            </ComboboxPrimitive.Popup>
          </ComboboxPrimitive.Positioner>
        </ComboboxPrimitive.Portal>
      </ComboboxPrimitive.Root>
    </div>
  );
}

function LabelList({
  labels,
  labelColorMap,
  highlightedIndex,
}: {
  labels: LabelWithCount[];
  labelColorMap: Record<string, LabelColor>;
  highlightedIndex: number;
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

  useEffect(() => {
    if (highlightedIndex < 0 || highlightedIndex >= labels.length) return;
    const item = parentRef.current?.querySelector(`[data-index="${highlightedIndex}"]`);
    item?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex, labels.length]);

  if (!useVirtual) {
    return (
      <div ref={parentRef} className="overflow-y-auto max-h-52 py-1">
        {labels.map((label, index) => (
          <ComboboxPrimitive.Item
            key={label.name}
            data-index={index}
            value={label.name}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm outline-none",
              "data-[highlighted]:bg-accent",
              index === highlightedIndex && "bg-accent",
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
              data-index={virtualRow.index}
              value={label.name}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm outline-none absolute left-0 right-0",
                "data-[highlighted]:bg-accent",
                virtualRow.index === highlightedIndex && "bg-accent",
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
