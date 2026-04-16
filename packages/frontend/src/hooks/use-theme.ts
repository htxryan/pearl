import { useCallback, useSyncExternalStore } from "react";
import type { ThemeDefinition } from "@/themes";
import { getDefaultTheme, getTheme } from "@/themes";

const STORAGE_KEY = "pearl-theme";
const CACHE_KEY = "pearl-theme-cache";

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let listeners: Array<() => void> = [];

function subscribe(listener: () => void) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function emitChange() {
  listeners.forEach((l) => l());
}

// ---------------------------------------------------------------------------
// Resolve the effective theme from storage or system default
// ---------------------------------------------------------------------------

function getStoredThemeId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    // localStorage unavailable
    return null;
  }
}

function getEffectiveTheme(): ThemeDefinition {
  const storedId = getStoredThemeId();
  if (storedId) {
    const theme = getTheme(storedId);
    if (theme) return theme;
  }
  return getDefaultTheme();
}

// ---------------------------------------------------------------------------
// Apply a theme to the document
// ---------------------------------------------------------------------------

function applyTheme(theme: ThemeDefinition) {
  const root = document.documentElement;

  // Toggle .dark class based on colorScheme
  root.classList.toggle("dark", theme.colorScheme === "dark");

  // Apply CSS custom properties
  for (const [token, value] of Object.entries(theme.colors)) {
    root.style.setProperty(`--color-${token}`, value);
  }
}

// ---------------------------------------------------------------------------
// Persist theme choice
// ---------------------------------------------------------------------------

function persistTheme(theme: ThemeDefinition) {
  try {
    localStorage.setItem(STORAGE_KEY, theme.id);
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ colorScheme: theme.colorScheme, colors: theme.colors }),
    );
  } catch {
    // localStorage unavailable
  }
}

// ---------------------------------------------------------------------------
// Module-level initialization — runs at import time to prevent FOTC
// ---------------------------------------------------------------------------

if (typeof document !== "undefined") {
  applyTheme(getEffectiveTheme());
}

// ---------------------------------------------------------------------------
// Snapshot for useSyncExternalStore — must return a referentially-stable value
// when nothing has changed.
// ---------------------------------------------------------------------------

let currentSnapshot = getEffectiveTheme();

function getSnapshot(): ThemeDefinition {
  return currentSnapshot;
}

// ---------------------------------------------------------------------------
// Public hook
// ---------------------------------------------------------------------------

export function useTheme(): {
  themeId: string;
  theme: ThemeDefinition;
  setTheme: (id: string) => void;
} {
  const theme = useSyncExternalStore(subscribe, getSnapshot);

  const setTheme = useCallback((id: string) => {
    const resolved = getTheme(id) ?? getDefaultTheme();
    currentSnapshot = resolved;
    applyTheme(resolved);
    persistTheme(resolved);
    emitChange();
  }, []);

  return { themeId: theme.id, theme, setTheme };
}
