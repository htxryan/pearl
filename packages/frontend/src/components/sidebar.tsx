import { NavLink } from "react-router";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

// Inline SVG icons — consistent 16x16, stroke-based
function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <line x1="2" y1="4" x2="14" y2="4" />
      <line x1="2" y1="8" x2="14" y2="8" />
      <line x1="2" y1="12" x2="10" y2="12" />
    </svg>
  );
}

function BoardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="2" width="3.5" height="12" rx="0.5" />
      <rect x="6.25" y="2" width="3.5" height="8" rx="0.5" />
      <rect x="11" y="2" width="3.5" height="10" rx="0.5" />
    </svg>
  );
}

function GraphIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="4" cy="4" r="2" />
      <circle cx="12" cy="4" r="2" />
      <circle cx="8" cy="12" r="2" />
      <line x1="5.5" y1="5.5" x2="7" y2="10.5" />
      <line x1="10.5" y1="5.5" x2="9" y2="10.5" />
    </svg>
  );
}

const navItems: { to: string; label: string; shortcut: string; icon: ReactNode }[] = [
  { to: "/list", label: "List", shortcut: "1", icon: <ListIcon /> },
  { to: "/board", label: "Board", shortcut: "2", icon: <BoardIcon /> },
  { to: "/graph", label: "Graph", shortcut: "3", icon: <GraphIcon /> },
];

export function Sidebar() {
  return (
    <aside className="flex w-56 shrink-0 flex-col bg-muted/50">
      <div className="flex h-14 items-center px-4">
        <span className="text-lg font-semibold tracking-tight">Beads</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center justify-between rounded-[var(--radius)] px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )
            }
          >
            <span className="flex items-center gap-2">
              {item.icon}
              {item.label}
            </span>
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              {item.shortcut}
            </kbd>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
