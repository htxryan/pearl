import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ActionsIcon,
  CheckIcon,
  ChevronDownIcon,
  CloseIssueIcon,
  TrashIcon,
} from "@/components/ui/icons";

interface DetailActionsMenuProps {
  isClosed: boolean;
  onClaim: () => void;
  onRequestClose: () => void;
  onRequestDelete: () => void;
  isUpdatePending: boolean;
  isClosePending: boolean;
  isDeletePending: boolean;
}

export function DetailActionsMenu({
  isClosed,
  onClaim,
  onRequestClose,
  onRequestDelete,
  isUpdatePending,
  isClosePending,
  isDeletePending,
}: DetailActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isClaimPending, setIsClaimPending] = useState(false);

  useEffect(() => {
    if (!isUpdatePending) setIsClaimPending(false);
  }, [isUpdatePending]);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && menuRef.current) {
      const first = menuRef.current.querySelector<HTMLButtonElement>(
        '[role="menuitem"]:not(:disabled)',
      );
      first?.focus();
    }
  }, [isOpen]);

  const handleMenuKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const items = menuRef.current?.querySelectorAll<HTMLButtonElement>(
      '[role="menuitem"]:not(:disabled)',
    );
    if (!items?.length) return;

    const current = document.activeElement as HTMLElement;
    const idx = Array.from(items).indexOf(current as HTMLButtonElement);

    let next: number | undefined;
    if (e.key === "ArrowDown") {
      next = idx < items.length - 1 ? idx + 1 : 0;
    } else if (e.key === "ArrowUp") {
      next = idx > 0 ? idx - 1 : items.length - 1;
    } else if (e.key === "Home") {
      next = 0;
    } else if (e.key === "End") {
      next = items.length - 1;
    }

    if (next !== undefined) {
      e.preventDefault();
      items[next].focus();
    }
  }, []);

  const busy = isUpdatePending || isClosePending || isDeletePending;

  return (
    <div className="relative" ref={containerRef}>
      <Button
        ref={triggerRef}
        variant="outline"
        size="sm"
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={busy}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="gap-1.5"
      >
        <ActionsIcon />
        Actions
        <ChevronDownIcon />
      </Button>

      {isOpen && (
        <div
          ref={menuRef}
          role="menu"
          onKeyDown={handleMenuKeyDown}
          className="absolute top-full right-0 z-50 mt-1 w-48 rounded border border-border bg-background py-1 shadow-md"
        >
          {!isClosed && (
            <>
              <MenuItem
                icon={<CheckIcon />}
                label={isClaimPending ? "Claiming..." : "Claim"}
                onClick={() => {
                  setIsClaimPending(true);
                  setIsOpen(false);
                  onClaim();
                }}
                disabled={isUpdatePending}
              />
              <MenuItem
                icon={<CloseIssueIcon />}
                label={isClosePending ? "Closing..." : "Close"}
                onClick={() => {
                  setIsOpen(false);
                  onRequestClose();
                }}
                disabled={isClosePending}
                destructive
              />
              <hr className="my-1 border-border" />
            </>
          )}
          <MenuItem
            icon={<TrashIcon />}
            label={isDeletePending ? "Deleting..." : "Delete"}
            onClick={() => {
              setIsOpen(false);
              onRequestDelete();
            }}
            disabled={isDeletePending}
            destructive
          />
        </div>
      )}
    </div>
  );
}

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

function MenuItem({ icon, label, onClick, disabled, destructive }: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      tabIndex={-1}
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent focus:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none ${
        destructive ? "text-destructive" : ""
      }`}
    >
      <span className="shrink-0 text-muted-foreground" aria-hidden="true">
        {icon}
      </span>
      <span className="flex-1">{label}</span>
    </button>
  );
}
