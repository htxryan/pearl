import { useCallback, useSyncExternalStore } from "react";
import type { ThemeDefinition } from "@/themes";
import { getDefaultTheme, getTheme } from "@/themes";

const STORAGE_KEY = "pearl-theme";
const CACHE_KEY = "pearl-theme-cache";

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

function getStoredThemeId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
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

function applyTheme(theme: ThemeDefinition) {
  const root = document.documentElement;
  const isDark = theme.colorScheme === "dark";

  root.classList.toggle("dark", isDark);
  root.style.colorScheme = isDark ? "dark" : "light";

  const toRemove: string[] = [];
  for (let i = 0; i < root.style.length; i++) {
    const prop = root.style[i];
    if (prop.startsWith("--") && !prop.startsWith("--shadow") && !prop.startsWith("--spacing")) {
      toRemove.push(prop);
    }
  }
  for (const prop of toRemove) {
    root.style.removeProperty(prop);
  }

  for (const [token, value] of Object.entries(theme.colors)) {
    root.style.setProperty("--" + token, value);
  }
}

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

if (typeof document !== "undefined") {
  applyTheme(getEffectiveTheme());
}

let currentSnapshot = getEffectiveTheme();

function getSnapshot(): ThemeDefinition {
  return currentSnapshot;
}

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
