import { NavLink } from "react-router";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/list", label: "List", shortcut: "1" },
  { to: "/board", label: "Board", shortcut: "2" },
  { to: "/graph", label: "Graph", shortcut: "3" },
] as const;

export function Sidebar() {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-muted/40">
      <div className="flex h-14 items-center border-b border-border px-4">
        <span className="text-lg font-semibold">Beads</span>
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
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )
            }
          >
            <span>{item.label}</span>
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              {item.shortcut}
            </kbd>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
