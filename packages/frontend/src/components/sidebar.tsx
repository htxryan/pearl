import { type ReactNode, useCallback, useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useHealth } from "@/hooks/use-issues";
import { useIsMobile } from "@/hooks/use-media-query";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { cn } from "@/lib/utils";

// Inline SVG icons — consistent 16x16, stroke-based
function ListIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <line x1="2" y1="4" x2="14" y2="4" />
      <line x1="2" y1="8" x2="14" y2="8" />
      <line x1="2" y1="12" x2="10" y2="12" />
    </svg>
  );
}

function BoardIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="1.5" y="2" width="3.5" height="12" rx="0.5" />
      <rect x="6.25" y="2" width="3.5" height="8" rx="0.5" />
      <rect x="11" y="2" width="3.5" height="10" rx="0.5" />
    </svg>
  );
}

function GraphIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <circle cx="4" cy="4" r="2" />
      <circle cx="12" cy="4" r="2" />
      <circle cx="8" cy="12" r="2" />
      <line x1="5.5" y1="5.5" x2="7" y2="10.5" />
      <line x1="10.5" y1="5.5" x2="9" y2="10.5" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="8" cy="8" r="2" />
      <path d="M13.5 8a5.5 5.5 0 00-.4-1.6l1.3-1-.8-1.4-1.5.6a5.5 5.5 0 00-1.3-1.1l.2-1.6-1.5-.4-.7 1.4A5.5 5.5 0 008 2.5a5.5 5.5 0 00-.8.1L6.5 1.2 5 1.6l.2 1.6a5.5 5.5 0 00-1.3 1.1l-1.5-.6-.8 1.4 1.3 1A5.5 5.5 0 002.5 8c0 .6.1 1.1.4 1.6l-1.3 1 .8 1.4 1.5-.6c.4.4.8.8 1.3 1.1l-.2 1.6 1.5.4.7-1.4c.3 0 .5.1.8.1s.5 0 .8-.1l.7 1.4 1.5-.4-.2-1.6c.5-.3.9-.7 1.3-1.1l1.5.6.8-1.4-1.3-1c.3-.5.4-1 .4-1.6z" />
    </svg>
  );
}

function CollapseIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="10 3 5 8 10 13" />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 3 11 8 6 13" />
    </svg>
  );
}

function HamburgerIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <line x1="3" y1="5" x2="17" y2="5" />
      <line x1="3" y1="10" x2="17" y2="10" />
      <line x1="3" y1="15" x2="17" y2="15" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <line x1="5" y1="5" x2="15" y2="15" />
      <line x1="15" y1="5" x2="5" y2="15" />
    </svg>
  );
}

const mainNavItems: { to: string; label: string; shortcut: string; icon: () => ReactNode }[] = [
  { to: "/list", label: "List", shortcut: "1", icon: () => <ListIcon /> },
  { to: "/board", label: "Board", shortcut: "2", icon: () => <BoardIcon /> },
  { to: "/graph", label: "Graph", shortcut: "3", icon: () => <GraphIcon /> },
];

const settingsItem = {
  to: "/settings",
  label: "Settings",
  shortcut: "4",
  icon: () => <SettingsIcon />,
};

function NavItem({
  item,
  mobile,
  collapsed,
}: {
  item: { to: string; label: string; shortcut: string; icon: () => ReactNode };
  mobile?: boolean;
  collapsed?: boolean;
}) {
  return (
    <NavLink
      to={item.to}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          "flex items-center rounded-[var(--radius)] text-sm font-medium transition-colors",
          mobile ? "py-3 min-h-[44px]" : "py-2",
          collapsed ? "justify-center px-2" : "justify-between px-3",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        )
      }
    >
      {collapsed ? (
        <span className="flex items-center">{item.icon()}</span>
      ) : (
        <>
          <span className="flex items-center gap-2">
            {item.icon()}
            <span className="truncate">{item.label}</span>
          </span>
          <kbd className="shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
            {item.shortcut}
          </kbd>
        </>
      )}
    </NavLink>
  );
}

const SIDEBAR_COLLAPSED_KEY = "pearl:sidebar-collapsed";
const TOGGLE_EVENT = "pearl:toggle-sidebar";

export function toggleSidebar() {
  window.dispatchEvent(new CustomEvent(TOGGLE_EVENT));
}

/** Desktop sidebar — always visible at >= 768px */
export function Sidebar() {
  const isMobile = useIsMobile();
  const { data: health } = useHealth();
  const projectPrefix = health?.project_prefix;
  const [collapsed, setCollapsed] = usePersistedState(SIDEBAR_COLLAPSED_KEY, false);

  useEffect(() => {
    const handler = () => setCollapsed((prev) => !prev);
    window.addEventListener(TOGGLE_EVENT, handler);
    return () => window.removeEventListener(TOGGLE_EVENT, handler);
  }, [setCollapsed]);

  if (isMobile) return null;

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col bg-surface-raised border-r border-border transition-[width] duration-200 ease-in-out",
        collapsed ? "w-14" : "w-56",
      )}
    >
      <div className="flex h-14 items-center justify-between px-3">
        {!collapsed && (
          <div className="flex flex-col overflow-hidden">
            <span className="text-lg font-semibold tracking-tight leading-tight truncate">
              {projectPrefix ?? "Pearl"}
            </span>
            {projectPrefix && (
              <span className="text-[10px] text-muted-foreground leading-tight">Pearl</span>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          className={cn(
            "inline-flex items-center justify-center h-8 w-8 rounded-[var(--radius)] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0",
            collapsed && "mx-auto",
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ExpandIcon /> : <CollapseIcon />}
        </button>
      </div>
      <nav className="flex flex-1 flex-col p-2 overflow-hidden">
        <div className="flex flex-col gap-1">
          {mainNavItems.map((item) => (
            <NavItem key={item.to} item={item} collapsed={collapsed} />
          ))}
        </div>
        <div className="mt-auto border-t border-border pt-2">
          <NavItem item={settingsItem} collapsed={collapsed} />
        </div>
      </nav>
    </aside>
  );
}

/** Mobile hamburger button — visible at < 768px */
export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center justify-center h-11 w-11 rounded-[var(--radius)] text-foreground hover:bg-accent transition-colors"
      aria-label="Open navigation menu"
    >
      <HamburgerIcon />
    </button>
  );
}

/** Mobile drawer overlay — slides in from left */
export function MobileDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const location = useLocation();
  const drawerRef = useRef<HTMLDivElement>(null);
  const { data: health } = useHealth();
  const projectPrefix = health?.project_prefix;

  // Focus trap — confines Tab navigation inside the drawer while open
  useFocusTrap(drawerRef, isOpen);

  // Close drawer on route change.
  // Intentionally omits isOpen and onClose from deps: we only want to fire
  // when the pathname changes, not on every render (onClose is often an inline arrow).
  useEffect(() => {
    if (isOpen) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleKeyDown]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={drawerRef}
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      {/* Drawer panel */}
      <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-background shadow-lg flex flex-col animate-slide-in-left">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex flex-col">
            <span className="text-lg font-semibold tracking-tight leading-tight">
              {projectPrefix ?? "Pearl"}
            </span>
            {projectPrefix && (
              <span className="text-[10px] text-muted-foreground leading-tight">Pearl</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center h-11 w-11 rounded-[var(--radius)] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Close navigation menu"
          >
            <CloseIcon />
          </button>
        </div>
        <nav className="flex flex-1 flex-col p-2">
          <div className="flex flex-col gap-1">
            {mainNavItems.map((item) => (
              <NavItem key={item.to} item={item} mobile />
            ))}
          </div>
          <div className="mt-auto border-t border-border pt-2">
            <NavItem item={settingsItem} mobile />
          </div>
        </nav>
      </aside>
    </div>
  );
}
