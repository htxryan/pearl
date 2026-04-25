import {
  createContext,
  forwardRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

interface DropdownContextValue {
  open: boolean;
  setOpen: (next: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  menuRef: React.RefObject<HTMLDivElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

const DropdownContext = createContext<DropdownContextValue | null>(null);

function useDropdown(): DropdownContextValue {
  const ctx = useContext(DropdownContext);
  if (!ctx) throw new Error("DropdownMenu subcomponents must be used inside <DropdownMenu>");
  return ctx;
}

interface DropdownMenuProps {
  children: ReactNode;
  /** Controlled open state. Omit for uncontrolled. */
  open?: boolean;
  /** Called when the open state should change. Required when `open` is provided. */
  onOpenChange?: (open: boolean) => void;
}

export function DropdownMenu({ children, open: openProp, onOpenChange }: DropdownMenuProps) {
  const [openState, setOpenState] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : openState;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) setOpenState(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open, setOpen]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handle(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [open, setOpen]);

  // Focus the first non-disabled menuitem when the panel opens
  useEffect(() => {
    if (!open || !menuRef.current) return;
    const first = menuRef.current.querySelector<HTMLButtonElement>(
      '[role="menuitem"]:not(:disabled)',
    );
    first?.focus();
  }, [open]);

  const value = useMemo<DropdownContextValue>(
    () => ({ open, setOpen, triggerRef, menuRef, containerRef }),
    [open, setOpen],
  );

  return (
    <DropdownContext.Provider value={value}>
      <div className="relative" ref={containerRef}>
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

interface DropdownMenuTriggerProps {
  /**
   * Render-prop receiving the props that must be spread onto the trigger
   * (typically a Button). Use this when wrapping a custom button component.
   */
  children: (props: {
    ref: React.RefObject<HTMLButtonElement | null>;
    onClick: () => void;
    "aria-haspopup": "menu";
    "aria-expanded": boolean;
  }) => ReactNode;
}

export function DropdownMenuTrigger({ children }: DropdownMenuTriggerProps) {
  const { open, setOpen, triggerRef } = useDropdown();
  return (
    <>
      {children({
        ref: triggerRef,
        onClick: () => setOpen(!open),
        "aria-haspopup": "menu",
        "aria-expanded": open,
      })}
    </>
  );
}

interface DropdownMenuContentProps {
  children: ReactNode;
  /** Panel horizontal alignment. Default "start". */
  align?: "start" | "end";
  /** Tailwind width class. Default "w-48". */
  width?: string;
  /** Extra classes to merge onto the panel. */
  className?: string;
}

export function DropdownMenuContent({
  children,
  align = "start",
  width = "w-48",
  className,
}: DropdownMenuContentProps) {
  const { open, menuRef } = useDropdown();

  const handleKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      const items = menuRef.current?.querySelectorAll<HTMLButtonElement>(
        '[role="menuitem"]:not(:disabled)',
      );
      if (!items?.length) return;

      const current = document.activeElement as HTMLElement;
      const idx = Array.from(items).indexOf(current as HTMLButtonElement);

      let next: number | undefined;
      if (e.key === "ArrowDown") next = idx < items.length - 1 ? idx + 1 : 0;
      else if (e.key === "ArrowUp") next = idx > 0 ? idx - 1 : items.length - 1;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = items.length - 1;

      if (next !== undefined) {
        e.preventDefault();
        items[next].focus();
      }
    },
    [menuRef],
  );

  if (!open) return null;

  return (
    <div
      ref={menuRef}
      role="menu"
      onKeyDown={handleKeyDown}
      className={cn(
        "absolute top-full z-50 mt-1 rounded border border-border bg-background py-1 shadow-md",
        align === "end" ? "right-0" : "left-0",
        width,
        className,
      )}
    >
      {children}
    </div>
  );
}

interface DropdownMenuItemProps {
  icon?: ReactNode;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  destructive?: boolean;
  /** Show a chevron-right indicator (e.g., for items that open submenus). */
  hasSubmenu?: boolean;
  /** Trailing content rendered after the label (e.g., custom indicator). */
  trailing?: ReactNode;
  /** Close the dropdown after `onClick` fires. Default true. */
  closeOnSelect?: boolean;
}

export const DropdownMenuItem = forwardRef<HTMLButtonElement, DropdownMenuItemProps>(
  function DropdownMenuItem(
    { icon, children, onClick, disabled, destructive, hasSubmenu, trailing, closeOnSelect = true },
    ref,
  ) {
    const close = useDropdownClose();
    const handleClick = () => {
      onClick?.();
      if (closeOnSelect) close();
    };
    return (
      <button
        ref={ref}
        type="button"
        role="menuitem"
        tabIndex={-1}
        onClick={handleClick}
        disabled={disabled}
        className={cn(
          "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm",
          "hover:bg-accent focus:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          "disabled:opacity-50 disabled:pointer-events-none",
          destructive && "text-destructive",
        )}
      >
        {icon && (
          <span className="shrink-0 text-muted-foreground" aria-hidden="true">
            {icon}
          </span>
        )}
        <span className="flex-1">{children}</span>
        {hasSubmenu && (
          <span className="shrink-0 text-muted-foreground" aria-hidden="true">
            <ChevronRight />
          </span>
        )}
        {trailing}
      </button>
    );
  },
);

export function DropdownMenuSeparator() {
  return <hr className="my-1 border-border" />;
}

/** Imperatively close the dropdown from inside its content (e.g., from a custom panel). */
export function useDropdownClose(): () => void {
  const { setOpen, triggerRef } = useDropdown();
  return useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, [setOpen, triggerRef]);
}

// Inline minimal chevron-right to avoid a circular dep with the shared icons module.
function ChevronRight() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
