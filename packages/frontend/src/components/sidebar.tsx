import { type ReactNode, useEffect } from "react";
import { NavLink, useLocation, useSearchParams } from "react-router";
import { XIcon } from "@/components/ui/icons";
import {
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  Sidebar as SidebarPrimitive,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { VIEW_PATHS } from "@/hooks/use-filter-sync";
import { useHealth } from "@/hooks/use-issues";
import { cn } from "@/lib/utils";

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
  const [searchParams] = useSearchParams();
  const search = searchParams.toString();
  const to =
    VIEW_PATHS.has(item.to) && search ? { pathname: item.to, search: `?${search}` } : item.to;

  return (
    <NavLink
      to={to}
      title={collapsed ? item.label : undefined}
      aria-label={collapsed ? item.label : undefined}
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
      <span className="flex items-center">
        <span className="shrink-0">{item.icon()}</span>
        <span
          className={cn(
            "truncate overflow-hidden transition-[opacity,max-width,margin] duration-200",
            collapsed ? "max-w-0 opacity-0 ml-0" : "max-w-48 opacity-100 ml-2",
          )}
        >
          {item.label}
        </span>
      </span>
      {!mobile && (
        <kbd
          className={cn(
            "rounded border bg-muted text-xs text-muted-foreground overflow-hidden whitespace-nowrap transition-[opacity,max-width,padding,border-color] duration-200",
            collapsed
              ? "max-w-0 opacity-0 px-0 py-0 border-transparent"
              : "max-w-10 opacity-100 px-1.5 py-0.5 border-border",
          )}
        >
          {item.shortcut}
        </kbd>
      )}
    </NavLink>
  );
}

const TOGGLE_EVENT = "pearl:toggle-sidebar";

export function toggleSidebar() {
  window.dispatchEvent(new CustomEvent(TOGGLE_EVENT));
}

function SidebarBranding({ collapsed }: { collapsed?: boolean }) {
  const { data: health } = useHealth();
  const projectPrefix = health?.project_prefix;

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden whitespace-nowrap transition-[opacity,max-width] duration-200",
        collapsed ? "max-w-0 opacity-0" : "max-w-48 opacity-100",
      )}
    >
      <span className="text-lg font-semibold tracking-tight leading-tight truncate">
        {projectPrefix ?? "Pearl"}
      </span>
      {projectPrefix && (
        <span className="text-[10px] text-muted-foreground leading-tight">Pearl</span>
      )}
    </div>
  );
}

export function AppSidebar() {
  const { open, toggleOpen, isMobile, setOpenMobile } = useSidebar();
  const location = useLocation();

  useEffect(() => {
    if (isMobile) return;
    const handler = () => toggleOpen();
    window.addEventListener(TOGGLE_EVENT, handler);
    return () => window.removeEventListener(TOGGLE_EVENT, handler);
  }, [toggleOpen, isMobile]);

  useEffect(() => {
    setOpenMobile(false);
  }, [location.pathname, setOpenMobile]);

  const collapsed = !open && !isMobile;

  return (
    <SidebarPrimitive>
      <SidebarHeader className="justify-between">
        {isMobile ? (
          <>
            <SidebarBranding />
            <button
              type="button"
              onClick={() => setOpenMobile(false)}
              className="inline-flex items-center justify-center h-11 w-11 rounded-[var(--radius)] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Close navigation menu"
            >
              <XIcon size={20} />
            </button>
          </>
        ) : (
          <>
            <SidebarBranding collapsed={collapsed} />
            <SidebarTrigger className={cn(collapsed && "mx-auto")}>
              {collapsed ? <ExpandIcon /> : <CollapseIcon />}
            </SidebarTrigger>
          </>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {mainNavItems.map((item) => (
            <SidebarMenuItem key={item.to}>
              <NavItem item={item} mobile={isMobile} collapsed={collapsed} />
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <NavItem item={settingsItem} mobile={isMobile} collapsed={collapsed} />
      </SidebarFooter>
    </SidebarPrimitive>
  );
}

export function MobileMenuButton() {
  const { isMobile, setOpenMobile } = useSidebar();

  if (!isMobile) return null;

  return (
    <button
      type="button"
      onClick={() => setOpenMobile(true)}
      className="inline-flex items-center justify-center h-11 w-11 rounded-[var(--radius)] text-foreground hover:bg-accent transition-colors"
      aria-label="Open navigation menu"
    >
      <HamburgerIcon />
    </button>
  );
}

export { SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuItem };
