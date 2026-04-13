import { useState, useRef, useEffect, useCallback } from "react";
import { DayPicker } from "react-day-picker";
import { format, parse, isValid } from "date-fns";
import { parseRelativeDate } from "@/lib/parse-relative-date";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value: string | null; // ISO date string (YYYY-MM-DD) or null
  onChange: (date: string | null) => void;
  placeholder?: string;
  className?: string;
}

function toDate(iso: string | null): Date | undefined {
  if (!iso) return undefined;
  const d = new Date(iso + "T00:00:00");
  return isValid(d) ? d : undefined;
}

function toISO(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Set date",
  className,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [relativeInput, setRelativeInput] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});

  const selectedDate = toDate(value);

  const updatePopoverPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const above = spaceBelow < 360;

    setPopoverStyle({
      position: "fixed",
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 308)),
      ...(above
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
      zIndex: 50,
    });
  }, []);

  const open = useCallback(() => {
    setRelativeInput("");
    updatePopoverPosition();
    setIsOpen(true);
  }, [updatePopoverPosition]);

  const close = useCallback(() => {
    setIsOpen(false);
    setRelativeInput("");
  }, []);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, close]);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, close]);

  const handleDaySelect = (day: Date | undefined) => {
    if (day) {
      onChange(toISO(day));
    }
    close();
  };

  const handleRelativeInput = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const text = relativeInput.trim();
      if (!text) return;

      // Try relative parse first
      const relative = parseRelativeDate(text);
      if (relative) {
        onChange(toISO(relative));
        close();
        return;
      }

      // Try direct date parse (YYYY-MM-DD or MM/DD/YYYY)
      const parsed = parse(text, "yyyy-MM-dd", new Date());
      if (isValid(parsed)) {
        onChange(toISO(parsed));
        close();
        return;
      }
      const parsed2 = parse(text, "MM/dd/yyyy", new Date());
      if (isValid(parsed2)) {
        onChange(toISO(parsed2));
        close();
        return;
      }
    }
  };

  const handleClear = () => {
    onChange(null);
    close();
  };

  const displayValue = selectedDate
    ? format(selectedDate, "MMM d, yyyy")
    : null;

  return (
    <div ref={containerRef} className={cn("relative inline-block", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (isOpen) close();
          else open();
        }}
        className={cn(
          "inline-flex items-center gap-1.5 text-sm rounded-lg px-3 py-2 border border-border",
          "bg-transparent hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring transition-colors",
          !displayValue && "text-muted-foreground",
        )}
      >
        <span className="text-muted-foreground text-xs">&#128197;</span>
        {displayValue || placeholder}
      </button>

      {isOpen && (
        <div
          style={popoverStyle}
          className="w-[300px] rounded-xl border border-border bg-background shadow-lg p-3 animate-fade-up [animation-duration:150ms]"
        >
          {/* Relative date input */}
          <input
            ref={inputRef}
            value={relativeInput}
            onChange={(e) => setRelativeInput(e.target.value)}
            onKeyDown={handleRelativeInput}
            placeholder="e.g. tomorrow, next friday, in 2 weeks"
            className="w-full text-sm bg-transparent border border-border rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60"
          />

          {/* Calendar */}
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={handleDaySelect}
            showOutsideDays
            classNames={{
              root: "text-sm",
              months: "flex flex-col",
              month_caption: "flex justify-center items-center h-8 font-medium text-foreground",
              nav: "flex items-center gap-1",
              button_previous: "absolute left-1 top-0 h-8 w-8 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground",
              button_next: "absolute right-1 top-0 h-8 w-8 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground",
              month_grid: "w-full border-collapse",
              weekdays: "flex",
              weekday: "w-9 text-center text-[11px] font-medium text-muted-foreground py-1",
              week: "flex",
              day: "w-9 h-9 flex items-center justify-center rounded text-sm cursor-pointer hover:bg-accent transition-colors",
              day_button: "w-full h-full flex items-center justify-center rounded",
              selected: "bg-primary text-primary-foreground hover:bg-primary/90",
              today: "ring-1 ring-primary font-semibold",
              outside: "text-muted-foreground/40",
              disabled: "text-muted-foreground/30 cursor-not-allowed",
            }}
          />

          {/* Clear button */}
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground py-1.5 rounded hover:bg-accent transition-colors"
            >
              Clear date
            </button>
          )}
        </div>
      )}
    </div>
  );
}
