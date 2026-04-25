import { X } from "lucide-react";
import { useMemo, useSyncExternalStore } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isMacPlatform } from "@/lib/utils";

// ─── State ─────────────────────────────────────────────
let isOpen = false;
let version = 0;
const listeners = new Set<() => void>();

function notify() {
  version++;
  for (const l of [...listeners]) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function toggleKeyboardHelp() {
  isOpen = !isOpen;
  notify();
}

export function closeKeyboardHelp() {
  isOpen = false;
  notify();
}

function useKeyboardHelpOpen() {
  return useSyncExternalStore(subscribe, () => isOpen);
}

// ─── Shortcut data ─────────────────────────────────────
interface ShortcutGroup {
  name: string;
  shortcuts: { key: string; description: string }[];
}

function buildShortcutGroups(isMac: boolean): ShortcutGroup[] {
  const mod = isMac ? "⌘" : "Ctrl+";
  return [
    {
      name: "Navigation",
      shortcuts: [
        { key: "1", description: "Go to List view" },
        { key: "2", description: "Go to Board view" },
        { key: "3", description: "Go to Graph view" },
      ],
    },
    {
      name: "Actions",
      shortcuts: [
        { key: `${mod}K`, description: "Open command palette" },
        { key: `${mod}F`, description: "Search issues" },
        { key: `${mod}Z`, description: "Undo last action" },
        { key: "c", description: "Create new issue" },
        { key: "?", description: "Show keyboard shortcuts" },
      ],
    },
    {
      name: "List View",
      shortcuts: [
        { key: "j", description: "Move to next row" },
        { key: "k", description: "Move to previous row" },
        { key: "Enter", description: "Open selected issue" },
        { key: "x", description: "Toggle row selection" },
        { key: "/", description: "Focus search" },
      ],
    },
    {
      name: "Board View",
      shortcuts: [{ key: "/", description: "Focus search" }],
    },
    {
      name: "Graph View",
      shortcuts: [
        { key: "/", description: "Focus search" },
        { key: "l", description: "Re-run auto layout" },
        { key: "p", description: "Toggle critical path" },
        { key: "Esc", description: "Clear selection" },
      ],
    },
    {
      name: "Detail View",
      shortcuts: [{ key: "Esc", description: "Close detail / back to list" }],
    },
    {
      name: "Image Attachments",
      shortcuts: [
        { key: "Enter", description: "Open lightbox (on focused pill or gallery tile)" },
        { key: "→", description: "Next image in lightbox" },
        { key: "←", description: "Previous image in lightbox" },
        { key: "Home", description: "First image" },
        { key: "End", description: "Last image" },
        { key: "Esc", description: "Close lightbox" },
        { key: "?", description: "Show shortcuts (while lightbox is open)" },
      ],
    },
  ];
}

// ─── Component ─────────────────────────────────────────
export function KeyboardHelpOverlay() {
  const open = useKeyboardHelpOpen();
  const shortcutGroups = useMemo(() => buildShortcutGroups(isMacPlatform()), []);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) closeKeyboardHelp();
      }}
    >
      <DialogContent className="max-w-lg overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogClose className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors">
            <X size={16} />
            <span className="sr-only">Close</span>
          </DialogClose>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-auto px-6 py-4 space-y-6">
          {shortcutGroups.map((group) => (
            <div key={group.name}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                {group.name}
              </h3>
              <div className="space-y-1">
                {group.shortcuts.map((shortcut) => (
                  <div key={shortcut.key} className="flex items-center justify-between py-1">
                    <span className="text-sm">{shortcut.description}</span>
                    <kbd className="rounded border border-border bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
