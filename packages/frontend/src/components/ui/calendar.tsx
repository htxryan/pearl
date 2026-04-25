import type { ComponentProps } from "react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";

type CalendarProps = ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays
      className={cn("text-sm", className)}
      classNames={{
        months: "flex flex-col",
        month_caption: "flex justify-center items-center h-8 font-medium text-foreground",
        nav: "flex items-center gap-1",
        button_previous:
          "absolute left-1 top-0 h-8 w-8 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground",
        button_next:
          "absolute right-1 top-0 h-8 w-8 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground",
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
        ...classNames,
      }}
      {...props}
    />
  );
}

export type { CalendarProps };
export { Calendar };
