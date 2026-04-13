import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import type { LabelColor, LabelWithCount } from "@beads-gui/shared";
import { LABEL_COLORS } from "@beads-gui/shared";
import { useLabels, useCreateLabel } from "@/hooks/use-labels";
import { useTheme } from "@/hooks/use-theme";
import { LabelBadge, LABEL_PALETTE } from "./label-badge";
import { cn } from "@/lib/utils";

interface LabelPickerProps {
  /** Currently selected label names */
  selected: string[];
  /** Map of label name → color for currently selected labels */
  selectedColors: Record<string, LabelColor>;
  /** Called when selection changes */
  onChange: (labels: string[]) => void;
  /** Whether to allow creating new labels inline */
  allowCreate?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Additional className for the container */
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
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [newLabelColor, setNewLabelColor] = useState<LabelColor | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const { data: allLabels = [] } = useLabels();
  const createLabel = useCreateLabel();

  // Filter labels by search (memoized to avoid recomputing on every render)
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const filteredLabels = useMemo(
    () => allLabels.filter(
      (l) => !selectedSet.has(l.name) && l.name.toLowerCase().includes(search.toLowerCase()),
    ),
    [allLabels, selectedSet, search],
  );

  const searchTrimmed = search.trim();
  const exactMatch = allLabels.some((l) => l.name.toLowerCase() === searchTrimmed.toLowerCase());
  const canCreate = allowCreate && searchTrimmed.length > 0 && !exactMatch && !selectedSet.has(searchTrimmed);

  // Total options: filtered + optional "create new"
  const totalOptions = filteredLabels.length + (canCreate ? 1 : 0);

  // Click outside handler
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowColorPicker(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Reset highlight when search changes
  useEffect(() => {
    setHighlightIndex(0);
  }, [search]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!listRef.current) return;
    const item = listRef.current.children[highlightIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [highlightIndex]);

  const selectLabel = useCallback((labelName: string) => {
    onChange([...selected, labelName]);
    setSearch("");
    setHighlightIndex(0);
    inputRef.current?.focus();
  }, [selected, onChange]);

  const removeLabel = useCallback((labelName: string) => {
    onChange(selected.filter((l) => l !== labelName));
  }, [selected, onChange]);

  const handleCreateNew = useCallback(async (name: string, color?: LabelColor) => {
    const assignedColor = color ?? LABEL_COLORS[Math.floor(Math.random() * LABEL_COLORS.length)];
    try {
      await createLabel.mutateAsync({ name, color: assignedColor });
      selectLabel(name);
    } catch {
      // Label creation failed — don't add to selection
    }
    setShowColorPicker(false);
    setNewLabelColor(null);
  }, [createLabel, selectLabel]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setIsOpen(true);
      return;
    }

    if (e.key === "Escape") {
      if (showColorPicker) {
        setShowColorPicker(false);
      } else {
        setIsOpen(false);
      }
      return;
    }

    if (e.key === "Backspace" && !search && selected.length > 0) {
      removeLabel(selected[selected.length - 1]);
      return;
    }

    if (!isOpen || totalOptions === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev + 1) % totalOptions);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev - 1 + totalOptions) % totalOptions);
    } else if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      if (highlightIndex < filteredLabels.length) {
        selectLabel(filteredLabels[highlightIndex].name);
      } else if (canCreate) {
        // Quick-create with random color (Enter key = fast path)
        handleCreateNew(searchTrimmed);
      }
    }
  }, [isOpen, showColorPicker, search, selected, totalOptions, filteredLabels, highlightIndex, canCreate, selectLabel, removeLabel, handleCreateNew, searchTrimmed]);

  const labelColorMap = useMemo(() => {
    const map: Record<string, LabelColor> = { ...selectedColors };
    for (const label of allLabels) {
      if (!map[label.name]) map[label.name] = label.color as LabelColor;
    }
    return map;
  }, [selectedColors, allLabels]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Selected labels + input */}
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
        <input
          ref={inputRef}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selected.length === 0 ? placeholder : ""}
          aria-label="Search labels"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          className="text-sm bg-transparent border-none outline-none min-w-[80px] flex-1"
        />
      </div>

      {/* Dropdown */}
      {isOpen && (totalOptions > 0 || search) && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-background shadow-lg max-h-60 overflow-hidden">
          {showColorPicker ? (
            <ColorPickerPanel
              labelName={searchTrimmed}
              selectedColor={newLabelColor}
              onSelectColor={setNewLabelColor}
              onConfirm={() => handleCreateNew(searchTrimmed, newLabelColor ?? undefined)}
              onCancel={() => setShowColorPicker(false)}
            />
          ) : (
            <ul ref={listRef} role="listbox" className="overflow-y-auto max-h-60 py-1">
              {filteredLabels.map((label, i) => (
                <li
                  key={label.name}
                  role="option"
                  aria-selected={i === highlightIndex}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm",
                    i === highlightIndex ? "bg-accent" : "hover:bg-muted",
                  )}
                  onMouseEnter={() => setHighlightIndex(i)}
                  onClick={() => selectLabel(label.name)}
                >
                  <LabelBadge name={label.name} color={label.color as LabelColor} size="sm" />
                  <span className="text-xs text-muted-foreground ml-auto">{label.count}</span>
                </li>
              ))}
              {canCreate && (
                <li
                  role="option"
                  aria-selected={highlightIndex === filteredLabels.length}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm",
                    highlightIndex === filteredLabels.length ? "bg-accent" : "hover:bg-muted",
                  )}
                  onMouseEnter={() => setHighlightIndex(filteredLabels.length)}
                  onClick={() => setShowColorPicker(true)}
                >
                  <span className="text-muted-foreground">Create</span>
                  <span className="font-medium">&ldquo;{searchTrimmed}&rdquo;</span>
                </li>
              )}
              {filteredLabels.length === 0 && !canCreate && (
                <li className="px-3 py-2 text-sm text-muted-foreground">No matching labels</li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/** Compact color picker for selecting a label color from the palette */
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
      <div className="text-sm font-medium">
        Color for &ldquo;{labelName}&rdquo;
      </div>
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
