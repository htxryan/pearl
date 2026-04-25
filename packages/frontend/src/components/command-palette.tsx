import { useEffect, useMemo, useRef, useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import {
  closeCommandPalette,
  useAllCommandActions,
  useCommandPaletteOpen,
} from "@/hooks/use-command-palette";
import { useMediaQuery } from "@/hooks/use-media-query";

export function CommandPalette() {
  const open = useCommandPaletteOpen();
  const actions = useAllCommandActions();
  const inputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [isVisible, setIsVisible] = useState<boolean | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  useEffect(() => {
    if (open) {
      setIsMounted(true);
      setSearch("");
      requestAnimationFrame(() => {
        setIsVisible(true);
        inputRef.current?.focus();
      });
    } else {
      if (isVisible !== null) setIsVisible(false);
      const timer = setTimeout(() => setIsMounted(false), 150);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const groups = useMemo(() => {
    const grouped = new Map<string, typeof actions>();
    for (const action of actions) {
      const group = action.group ?? "Actions";
      const existing = grouped.get(group) ?? [];
      existing.push(action);
      grouped.set(group, existing);
    }
    return grouped;
  }, [actions]);

  if (!open && !isMounted) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          closeCommandPalette();
        }
      }}
    >
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-150 ${isVisible ? "opacity-100" : "opacity-0"}`}
        onClick={closeCommandPalette}
      />

      <Command
        className="relative z-50 w-full max-w-lg overflow-hidden border border-border shadow-2xl"
        style={{
          animation:
            prefersReducedMotion || isVisible === null
              ? "none"
              : isVisible
                ? "cmd-spring-in 250ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards"
                : "cmd-fade-out 150ms ease-in forwards",
        }}
        loop
        shouldFilter={false}
      >
        <div className="flex items-center gap-2 border-b border-border px-4">
          <svg
            className="h-4 w-4 shrink-0 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <CommandInput
            ref={inputRef}
            placeholder="Type a command..."
            value={search}
            onValueChange={setSearch}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <CommandList>
          <CommandEmpty>No commands found.</CommandEmpty>

          {[...groups.entries()].map(([group, groupActions]) => {
            const filterText = search.trim().toLowerCase();
            const filtered = filterText
              ? groupActions.filter((a) => a.label.toLowerCase().includes(filterText))
              : groupActions;
            if (filtered.length === 0) return null;
            return (
              <CommandGroup key={group} heading={group}>
                {filtered.map((action) => (
                  <CommandItem
                    key={action.id}
                    value={action.label}
                    className="justify-between"
                    onSelect={() => {
                      closeCommandPalette();
                      action.handler();
                    }}
                  >
                    <span>{action.label}</span>
                    {action.shortcut && <CommandShortcut>{action.shortcut}</CommandShortcut>}
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })}
        </CommandList>
      </Command>
    </div>
  );
}
