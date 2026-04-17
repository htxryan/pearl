import { useCallback, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface SelectOption<T extends string | number = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface BaseProps<T extends string | number = string> {
  options: SelectOption<T>[];
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  "aria-label"?: string;
  renderOption?: (option: SelectOption<T>, selected: boolean) => React.ReactNode;
  size?: "sm" | "md";
}

interface SingleSelectProps<T extends string | number = string> extends BaseProps<T> {
  multiple?: false;
  value: T | null;
  onChange: (value: T) => void;
}

interface MultiSelectProps<T extends string | number = string> extends BaseProps<T> {
  multiple: true;
  value: T[];
  onChange: (values: T[]) => void;
}

type CustomSelectProps<T extends string | number = string> =
  | SingleSelectProps<T>
  | MultiSelectProps<T>;

export function CustomSelect<T extends string | number = string>(props: CustomSelectProps<T>) {
  const { options, placeholder, className, triggerClassName, renderOption, size = "md" } = props;
  const ariaLabel = props["aria-label"];
  const isMulti = props.multiple === true;

  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const listboxId = useId();

  const enabledOptions = options.filter((o) => !o.disabled);

  const isSelected = useCallback(
    (optValue: T): boolean => {
      if (isMulti) {
        return (props as MultiSelectProps<T>).value.includes(optValue);
      }
      return (props as SingleSelectProps<T>).value === optValue;
    },
    [isMulti, props],
  );

  const getDisplayLabel = (): string => {
    if (isMulti) {
      const selected = (props as MultiSelectProps<T>).value;
      if (selected.length === 0) return placeholder ?? "Select...";
      const labels = selected.map((v) => options.find((o) => o.value === v)?.label ?? String(v));
      return labels.join(", ");
    }
    const val = (props as SingleSelectProps<T>).value;
    if (val === null || val === undefined) return placeholder ?? "Select...";
    return options.find((o) => o.value === val)?.label ?? String(val);
  };

  const hasValue = isMulti
    ? (props as MultiSelectProps<T>).value.length > 0
    : (props as SingleSelectProps<T>).value !== null &&
      (props as SingleSelectProps<T>).value !== undefined;

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownHeight = Math.min(options.length * 36 + 8, 256);
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const showAbove = spaceBelow < dropdownHeight && rect.top > spaceBelow;
    const dropdownWidth = Math.max(rect.width, 140);

    setDropdownStyle({
      position: "fixed",
      left: Math.max(4, Math.min(rect.left, window.innerWidth - dropdownWidth - 4)),
      width: dropdownWidth,
      ...(showAbove ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
      zIndex: 50,
    });
  }, [options.length]);

  const openDropdown = useCallback(() => {
    updatePosition();
    setOpen(true);
    setHighlightIndex(-1);
  }, [updatePosition]);

  const closeDropdown = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  const handleSelect = useCallback(
    (optValue: T) => {
      if (isMulti) {
        const mp = props as MultiSelectProps<T>;
        const next = mp.value.includes(optValue)
          ? mp.value.filter((v) => v !== optValue)
          : [...mp.value, optValue];
        mp.onChange(next);
      } else {
        (props as SingleSelectProps<T>).onChange(optValue);
        closeDropdown();
      }
    },
    [isMulti, props, closeDropdown],
  );

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

  useEffect(() => {
    if (!open) return;
    const reposition = () => updatePosition();
    window.addEventListener("scroll", reposition, { passive: true, capture: true });
    window.addEventListener("resize", reposition, { passive: true });
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open || !listRef.current || highlightIndex < 0) return;
    const item = listRef.current.children[highlightIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [open, highlightIndex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) {
        if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
          e.preventDefault();
          openDropdown();
        }
        return;
      }

      switch (e.key) {
        case "Escape":
          e.preventDefault();
          e.stopPropagation();
          closeDropdown();
          break;
        case "ArrowDown":
          e.preventDefault();
          setHighlightIndex((prev) => {
            const next = prev + 1;
            return next >= enabledOptions.length ? 0 : next;
          });
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightIndex((prev) => {
            const next = prev - 1;
            return next < 0 ? enabledOptions.length - 1 : next;
          });
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          if (highlightIndex >= 0 && highlightIndex < enabledOptions.length) {
            handleSelect(enabledOptions[highlightIndex].value);
          }
          break;
      }
    },
    [open, openDropdown, closeDropdown, enabledOptions, highlightIndex, handleSelect],
  );

  const sizeClasses =
    size === "sm" ? "h-7 px-2 text-xs" : "min-h-[44px] sm:min-h-0 h-8 px-2 text-xs sm:text-sm";

  const activeDescendantId =
    open && highlightIndex >= 0 ? `${listboxId}-opt-${highlightIndex}` : undefined;

  return (
    <div ref={containerRef} className={cn("relative inline-block", className)}>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={activeDescendantId}
        aria-label={ariaLabel}
        onClick={(e) => {
          e.stopPropagation();
          if (open) closeDropdown();
          else openDropdown();
        }}
        onKeyDown={handleKeyDown}
        className={cn(
          "inline-flex items-center justify-between gap-1 rounded border bg-background cursor-pointer transition-colors",
          "focus:outline-none focus:ring-1 focus:ring-ring",
          sizeClasses,
          hasValue && isMulti
            ? "border-primary/50 bg-primary/5 text-primary hover:border-primary/70"
            : "border-border hover:border-foreground/30",
          !hasValue && "text-muted-foreground",
          triggerClassName,
        )}
      >
        <span className="truncate">{getDisplayLabel()}</span>
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
        <div
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-multiselectable={isMulti || undefined}
          style={dropdownStyle}
          className="rounded-lg border border-border bg-background shadow-lg overflow-y-auto max-h-64 py-1"
        >
          {options.map((opt) => {
            const selected = isSelected(opt.value);
            const enabledIdx = enabledOptions.indexOf(opt);
            const highlighted = enabledIdx === highlightIndex;
            return (
              <div
                key={String(opt.value)}
                id={enabledIdx >= 0 ? `${listboxId}-opt-${enabledIdx}` : undefined}
                role="option"
                tabIndex={-1}
                aria-selected={selected}
                aria-disabled={opt.disabled || undefined}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm",
                  highlighted && "bg-accent",
                  !highlighted && !opt.disabled && "hover:bg-accent",
                  opt.disabled && "opacity-40 cursor-not-allowed",
                  selected && !isMulti && "font-medium",
                )}
                onMouseEnter={() => {
                  if (!opt.disabled) setHighlightIndex(enabledIdx);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!opt.disabled) handleSelect(opt.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (!opt.disabled) handleSelect(opt.value);
                  }
                }}
              >
                {isMulti && (
                  <span
                    className={cn(
                      "flex items-center justify-center w-4 h-4 rounded border shrink-0",
                      selected
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-border",
                    )}
                  >
                    {selected && (
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 10 10"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M2 5.5L4 7.5L8 3" />
                      </svg>
                    )}
                  </span>
                )}
                {renderOption ? (
                  renderOption(opt, selected)
                ) : (
                  <span className="truncate">{opt.label}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
