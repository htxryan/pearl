import { Command } from "cmdk";
import {
  useCommandPaletteOpen,
  closeCommandPalette,
  useAllCommandActions,
} from "@/hooks/use-command-palette";
import { useEffect, useRef } from "react";

export function CommandPalette() {
  const open = useCommandPaletteOpen();
  const actions = useAllCommandActions();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      // Focus the input when palette opens
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  if (!open) return null;

  // Group actions by group field
  const groups = new Map<string, typeof actions>();
  for (const action of actions) {
    const group = action.group ?? "Actions";
    const existing = groups.get(group) ?? [];
    existing.push(action);
    groups.set(group, existing);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeCommandPalette();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          closeCommandPalette();
        }
      }}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" />

      {/* Palette */}
      <Command
        className="relative z-50 w-full max-w-lg overflow-hidden rounded-xl border border-border bg-background shadow-2xl"
        loop
      >
        <Command.Input
          ref={inputRef}
          placeholder="Type a command..."
          className="w-full border-b border-border bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
        />
        <Command.List className="max-h-80 overflow-auto p-2">
          <Command.Empty className="px-4 py-6 text-center text-sm text-muted-foreground">
            No results found.
          </Command.Empty>
          {[...groups.entries()].map(([group, groupActions]) => (
            <Command.Group
              key={group}
              heading={group}
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
            >
              {groupActions.map((action) => (
                <Command.Item
                  key={action.id}
                  value={action.label}
                  onSelect={() => {
                    closeCommandPalette();
                    action.handler();
                  }}
                  className="flex cursor-pointer items-center justify-between rounded-[var(--radius)] px-2 py-2 text-sm aria-selected:bg-accent aria-selected:text-accent-foreground"
                >
                  <span>{action.label}</span>
                  {action.shortcut && (
                    <kbd className="ml-auto rounded border border-border bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                      {action.shortcut}
                    </kbd>
                  )}
                </Command.Item>
              ))}
            </Command.Group>
          ))}
        </Command.List>
      </Command>
    </div>
  );
}
