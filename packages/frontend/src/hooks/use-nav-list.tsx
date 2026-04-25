import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";

const STORAGE_KEY = "beads:nav-list";

interface NavListContextValue {
  /** Push the currently-visible, ordered list of issue IDs (from the active list/board view). */
  setIds: (ids: string[]) => void;
  /** Returns the id immediately after `currentId` in the nav list, or null if none. */
  getNext: (currentId: string | null) => string | null;
  /** Returns the id immediately before `currentId` in the nav list, or null if none. */
  getPrev: (currentId: string | null) => string | null;
}

const NavListContext = createContext<NavListContextValue | null>(null);

function loadFromStorage(): string[] {
  if (typeof sessionStorage === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.every((x) => typeof x === "string") ? parsed : [];
  } catch {
    return [];
  }
}

function saveToStorage(ids: string[]) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // quota exceeded or storage disabled — ignore
  }
}

function shallowEqual(a: string[], b: string[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export function NavListProvider({ children }: { children: ReactNode }) {
  const idsRef = useRef<string[] | null>(null);
  if (idsRef.current === null) idsRef.current = loadFromStorage();

  const setIds = useCallback((newIds: string[]) => {
    const prev = idsRef.current ?? [];
    if (shallowEqual(prev, newIds)) return;
    idsRef.current = newIds;
    saveToStorage(newIds);
  }, []);

  const getNext = useCallback((currentId: string | null): string | null => {
    if (!currentId) return null;
    const list = idsRef.current ?? [];
    const idx = list.indexOf(currentId);
    if (idx === -1 || idx >= list.length - 1) return null;
    return list[idx + 1];
  }, []);

  const getPrev = useCallback((currentId: string | null): string | null => {
    if (!currentId) return null;
    const list = idsRef.current ?? [];
    const idx = list.indexOf(currentId);
    if (idx <= 0) return null;
    return list[idx - 1];
  }, []);

  const value = useMemo<NavListContextValue>(
    () => ({ setIds, getNext, getPrev }),
    [setIds, getNext, getPrev],
  );

  return <NavListContext.Provider value={value}>{children}</NavListContext.Provider>;
}

/**
 * No-op fallback for tests / environments without NavListProvider. Keeps the
 * hook safe to call from any list view without forcing every test wrapper to
 * mount the provider.
 */
const NOOP_VALUE: NavListContextValue = {
  setIds: () => {},
  getNext: () => null,
  getPrev: () => null,
};

export function useNavList(): NavListContextValue {
  return useContext(NavListContext) ?? NOOP_VALUE;
}

/** Convenience: push a list of IDs into the nav list whenever the array changes. */
export function useSetNavList(ids: string[]) {
  const { setIds } = useNavList();
  useEffect(() => {
    setIds(ids);
  }, [ids, setIds]);
}
