import { format, isValid, parse } from "date-fns";
import { useCallback, useEffect, useRef, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { parseRelativeDate } from "@/lib/parse-relative-date";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value: string | null;
  onChange: (date: string | null) => void;
  placeholder?: string;
  className?: string;
}

function toDate(iso: string | null): Date | undefined {
  if (!iso) return undefined;
  const d = new Date(`${iso}T00:00:00`);
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
  const [open, setOpen] = useState(false);
  const [relativeInput, setRelativeInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedDate = toDate(value);

  useEffect(() => {
    if (open) {
      setRelativeInput("");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const close = useCallback(() => {
    setOpen(false);
    setRelativeInput("");
  }, []);

  const handleDaySelect = (day: Date | undefined) => {
    if (day) {
      onChange(toISO(day));
    }
    close();
  };

  const handleRelativeInput = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      e.preventDefault();
      close();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const text = relativeInput.trim();
      if (!text) return;

      const relative = parseRelativeDate(text);
      if (relative && isValid(relative)) {
        onChange(toISO(relative));
        close();
        return;
      }

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

  const displayValue = selectedDate ? format(selectedDate, "MMM d, yyyy") : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "inline-flex items-center gap-1.5 text-sm rounded-lg px-3 py-2 border border-border",
          "bg-transparent hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring transition-colors",
          !displayValue && "text-muted-foreground",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
        aria-label={displayValue ? `Change date, currently ${displayValue}` : "Set date"}
      >
        <CalendarIcon />
        {displayValue || placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-3" align="start">
        <input
          ref={inputRef}
          value={relativeInput}
          onChange={(e) => setRelativeInput(e.target.value)}
          onKeyDown={handleRelativeInput}
          placeholder="e.g. tomorrow, next friday, in 2 weeks"
          className="w-full text-sm bg-transparent border border-border rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60"
        />

        <Calendar mode="single" selected={selectedDate} onSelect={handleDaySelect} />

        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground py-1.5 rounded hover:bg-accent transition-colors"
          >
            Clear date
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

function CalendarIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-muted-foreground shrink-0"
    >
      <rect x="2" y="3" width="12" height="11" rx="1.5" />
      <line x1="2" y1="7" x2="14" y2="7" />
      <line x1="5.5" y1="1.5" x2="5.5" y2="4.5" />
      <line x1="10.5" y1="1.5" x2="10.5" y2="4.5" />
    </svg>
  );
}

export default DatePicker;
