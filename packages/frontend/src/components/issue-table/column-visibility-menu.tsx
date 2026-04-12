import type { Table } from "@tanstack/react-table";
import type { IssueListItem } from "@beads-gui/shared";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ColumnVisibilityMenuProps {
  table: Table<IssueListItem>;
}

export function ColumnVisibilityMenu({ table }: ColumnVisibilityMenuProps) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      // Trigger entrance animation on next frame
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="h-8 rounded border border-border bg-background px-3 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        aria-label="Toggle column visibility"
        aria-expanded={open}
      >
        Columns
      </button>
      {open && (
        <div
          className={cn(
            "absolute right-0 top-full mt-1 z-20 min-w-[180px] rounded border border-border bg-background p-2 shadow-lg",
            "transition-all duration-150 ease-out origin-top-right",
            visible
              ? "opacity-100 scale-100 translate-y-0"
              : "opacity-0 scale-95 -translate-y-1",
          )}
        >
          {table.getAllLeafColumns().map((column) => {
            // Don't allow hiding the select column
            if (column.id === "select") return null;
            return (
              <label
                key={column.id}
                className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={column.getIsVisible()}
                  onChange={column.getToggleVisibilityHandler()}
                  className="h-3.5 w-3.5 rounded border-border"
                />
                <span className="capitalize">{column.id.replaceAll("_", " ")}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
