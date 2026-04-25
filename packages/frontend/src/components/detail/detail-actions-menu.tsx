import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

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

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  const busy = isUpdatePending || isClosePending || isDeletePending;

  return (
    <div className="relative" ref={containerRef}>
      <Button
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
          role="menu"
          className="absolute top-full right-0 z-50 mt-1 w-48 rounded border border-border bg-popover py-1 shadow-md"
        >
          {!isClosed && (
            <>
              <MenuItem
                icon={<ClaimIcon />}
                label={isUpdatePending ? "Claiming..." : "Claim"}
                onClick={() => {
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
              <div className="my-1 h-px bg-border" />
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
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent focus:bg-accent focus:outline-none disabled:opacity-50 disabled:pointer-events-none ${
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

function svgProps(size = 14) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 16 16",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };
}

function ActionsIcon() {
  return (
    <svg {...svgProps(14)}>
      <circle cx="3" cy="8" r="1.25" />
      <circle cx="8" cy="8" r="1.25" />
      <circle cx="13" cy="8" r="1.25" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg {...svgProps(12)}>
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}

function ClaimIcon() {
  return (
    <svg {...svgProps(14)}>
      <path d="M3 8l3 3 7-7" />
    </svg>
  );
}

function CloseIssueIcon() {
  return (
    <svg {...svgProps(14)}>
      <circle cx="8" cy="8" r="6" />
      <path d="M5.5 8l2 2 3-4" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg {...svgProps(14)}>
      <path d="M3 4h10" />
      <path d="M5 4V2.5a.5.5 0 01.5-.5h5a.5.5 0 01.5.5V4" />
      <path d="M4 4l.7 9a1 1 0 001 .9h4.6a1 1 0 001-.9L12 4" />
      <path d="M7 7v5M9 7v5" />
    </svg>
  );
}
