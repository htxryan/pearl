import type * as React from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useIsMobile } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "./sheet";

const SIDEBAR_COOKIE_NAME = "sidebar:state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const LEGACY_LOCALSTORAGE_KEY = "pearl:sidebar-collapsed";
const SIDEBAR_WIDTH = "14rem";
const SIDEBAR_WIDTH_COLLAPSED = "3.5rem";

function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  try {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : undefined;
  } catch {
    return undefined;
  }
}

function setCookie(name: string, value: string, maxAge: number) {
  try {
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  } catch {
    // cookies disabled — silent fallback to in-memory
  }
}

function migrateLegacySidebarState(): boolean | null {
  try {
    const stored = localStorage.getItem(LEGACY_LOCALSTORAGE_KEY);
    if (stored !== null) {
      const wasCollapsed = JSON.parse(stored) as boolean;
      const isOpen = !wasCollapsed;
      setCookie(SIDEBAR_COOKIE_NAME, String(isOpen), SIDEBAR_COOKIE_MAX_AGE);
      localStorage.removeItem(LEGACY_LOCALSTORAGE_KEY);
      return isOpen;
    }
  } catch {
    // localStorage unavailable or invalid JSON
  }
  return null;
}

function getInitialState(): boolean {
  const cookie = getCookie(SIDEBAR_COOKIE_NAME);
  if (cookie !== undefined) {
    // Cookie exists — clean up legacy key if present but don't use its value
    try {
      localStorage.removeItem(LEGACY_LOCALSTORAGE_KEY);
    } catch {
      // ignore
    }
    return cookie === "true";
  }

  const migrated = migrateLegacySidebarState();
  if (migrated !== null) return migrated;

  return true; // default: open
}

interface SidebarContextValue {
  open: boolean;
  setOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  toggleOpen: () => void;
  isMobile: boolean;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
  return ctx;
}

interface SidebarProviderProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultOpen?: boolean;
}

export function SidebarProvider({
  defaultOpen,
  className,
  children,
  ...props
}: SidebarProviderProps) {
  const isMobile = useIsMobile();
  const [open, _setOpen] = useState(() => defaultOpen ?? getInitialState());
  const [openMobile, setOpenMobile] = useState(false);

  const setOpen = useCallback((value: boolean | ((prev: boolean) => boolean)) => {
    _setOpen((prev) => {
      const next = typeof value === "function" ? value(prev) : value;
      setCookie(SIDEBAR_COOKIE_NAME, String(next), SIDEBAR_COOKIE_MAX_AGE);
      return next;
    });
  }, []);

  const toggleOpen = useCallback(() => setOpen((prev) => !prev), [setOpen]);

  const value = useMemo<SidebarContextValue>(
    () => ({ open, setOpen, toggleOpen, isMobile, openMobile, setOpenMobile }),
    [open, setOpen, toggleOpen, isMobile, openMobile],
  );

  return (
    <SidebarContext value={value}>
      <div
        className={cn("group/sidebar flex min-h-svh w-full", className)}
        style={
          {
            "--sidebar-width": SIDEBAR_WIDTH,
            "--sidebar-width-collapsed": SIDEBAR_WIDTH_COLLAPSED,
          } as React.CSSProperties
        }
        {...props}
      >
        {children}
      </div>
    </SidebarContext>
  );
}

interface SidebarProps extends React.HTMLAttributes<HTMLElement> {
  collapsible?: "icon" | "none";
}

export function Sidebar({ collapsible = "icon", className, children, ...props }: SidebarProps) {
  const { open, isMobile, openMobile, setOpenMobile } = useSidebar();

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent
          side="left"
          className="w-72 max-w-[85vw] p-0 [&>button:last-child]:top-3 [&>button:last-child]:right-3"
        >
          <div className="flex h-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <>
      <aside
        data-state={open ? "expanded" : "collapsed"}
        data-collapsible={collapsible}
        className={cn(
          "flex shrink-0 flex-col bg-surface-raised border-r border-border transition-[width] duration-200 ease-in-out overflow-hidden",
          "group/sidebar-inner",
          open ? "w-[var(--sidebar-width)]" : "w-[var(--sidebar-width-collapsed)]",
          className,
        )}
        {...props}
      >
        {children}
      </aside>
    </>
  );
}

export function SidebarHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex h-14 items-center px-3", className)} {...props} />;
}

export function SidebarContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <nav className={cn("flex flex-1 flex-col p-2 overflow-hidden", className)} {...props} />;
}

export function SidebarFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-auto border-t border-border pt-2 px-2", className)} {...props} />;
}

export function SidebarTrigger({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { toggleOpen, open } = useSidebar();

  return (
    <button
      type="button"
      onClick={toggleOpen}
      aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
      title={open ? "Collapse sidebar" : "Expand sidebar"}
      className={cn(
        "inline-flex items-center justify-center h-8 w-8 rounded-[var(--radius)] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function SidebarMenu({ className, ...props }: React.HTMLAttributes<HTMLUListElement>) {
  return <ul className={cn("flex flex-col gap-1", className)} {...props} />;
}

export function SidebarMenuItem({ className, ...props }: React.HTMLAttributes<HTMLLIElement>) {
  return <li className={cn("", className)} {...props} />;
}

export {
  getCookie,
  LEGACY_LOCALSTORAGE_KEY,
  migrateLegacySidebarState,
  SIDEBAR_COOKIE_NAME,
  setCookie,
};
