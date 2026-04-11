import { useEffect, useRef } from "react";

export interface KeyBinding {
  key: string;
  modifiers?: Array<"meta" | "ctrl" | "shift" | "alt">;
  handler: () => void;
  description?: string;
}

interface ScopeEntry {
  scope: string;
  bindings: KeyBinding[];
}

// Global focus scope stack — Shell pushes global, views push scoped
const scopeStack: ScopeEntry[] = [];

function isInputElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

function matchesBinding(e: KeyboardEvent, binding: KeyBinding): boolean {
  if (e.key.toLowerCase() !== binding.key.toLowerCase()) return false;
  const mods = binding.modifiers ?? [];
  if (mods.includes("meta") !== e.metaKey) return false;
  if (mods.includes("ctrl") !== e.ctrlKey) return false;
  if (mods.includes("shift") !== e.shiftKey) return false;
  if (mods.includes("alt") !== e.altKey) return false;
  return true;
}

// Global keyboard listener
if (typeof window !== "undefined") {
  window.addEventListener("keydown", (e) => {
    // Walk the scope stack from top to bottom
    for (let i = scopeStack.length - 1; i >= 0; i--) {
      const entry = scopeStack[i];
      for (const binding of entry.bindings) {
        if (matchesBinding(e, binding)) {
          // Skip number shortcuts when typing in inputs
          const hasNoModifiers = !binding.modifiers?.length;
          if (hasNoModifiers && isInputElement(e.target)) continue;

          e.preventDefault();
          e.stopPropagation();
          binding.handler();
          return;
        }
      }
    }
  });
}

/**
 * Register keyboard shortcuts in a named scope.
 * Scopes stack: the topmost matching scope wins.
 * Shortcuts are removed when the component unmounts.
 */
export function useKeyboardScope(scope: string, bindings: KeyBinding[]) {
  const entryRef = useRef<ScopeEntry | null>(null);

  useEffect(() => {
    const entry: ScopeEntry = { scope, bindings };
    entryRef.current = entry;
    scopeStack.push(entry);

    return () => {
      const idx = scopeStack.indexOf(entry);
      if (idx !== -1) scopeStack.splice(idx, 1);
      entryRef.current = null;
    };
  }, [scope, bindings]);
}

/**
 * Get all currently registered bindings (for command palette display).
 */
export function getRegisteredBindings(): Array<{ scope: string } & KeyBinding> {
  const result: Array<{ scope: string } & KeyBinding> = [];
  for (const entry of scopeStack) {
    for (const binding of entry.bindings) {
      result.push({ scope: entry.scope, ...binding });
    }
  }
  return result;
}

