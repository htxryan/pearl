import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useSearchParams } from "react-router";
import { usePersistedState } from "@/hooks/use-persisted-state";

export type DetailPanelMode = "panel" | "modal";

/** Returns true if close should proceed, false to cancel. */
export type CloseGuard = () => boolean;

interface DetailPanelContextValue {
  openIssueId: string | null;
  mode: DetailPanelMode;
  openDetail: (id: string) => void;
  closeDetail: () => void;
  /** Check the close guard, then close if allowed. Returns false if cancelled. */
  guardedClose: () => boolean;
  toggleMode: () => void;
  setMode: (mode: DetailPanelMode) => void;
  setCloseGuard: (guard: CloseGuard | null) => void;
}

const DetailPanelContext = createContext<DetailPanelContextValue | null>(null);

const ITEM_PARAM = "item";

export function DetailPanelProvider({ children }: { children: ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mode, setMode] = usePersistedState<DetailPanelMode>("beads:detail-panel-mode", "panel");

  const openIssueId = searchParams.get(ITEM_PARAM);

  const closeGuardRef = useRef<CloseGuard | null>(null);
  const openIssueIdRef = useRef<string | null>(null);

  useEffect(() => {
    openIssueIdRef.current = openIssueId;
  }, [openIssueId]);

  useEffect(() => {
    localStorage.removeItem("beads:detail-panel-issue");
    localStorage.removeItem("beads:panel-mode");
  }, []);

  const setCloseGuard = useCallback((guard: CloseGuard | null) => {
    closeGuardRef.current = guard;
  }, []);

  const checkGuard = useCallback((): boolean => {
    if (closeGuardRef.current && !closeGuardRef.current()) return false;
    return true;
  }, []);

  const openDetail = useCallback(
    (id: string) => {
      const current = openIssueIdRef.current;
      if (current === id) return;
      if (current !== null && current !== id) {
        if (!checkGuard()) return;
        closeGuardRef.current = null;
      }
      openIssueIdRef.current = id;
      // Switching between items uses replace to avoid history bloat;
      // opening from a closed panel pushes a new entry so back closes it.
      const replace = current !== null;
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set(ITEM_PARAM, id);
          return next;
        },
        { replace },
      );
    },
    [checkGuard, setSearchParams],
  );

  const closeDetail = useCallback(() => {
    if (openIssueIdRef.current === null) return;
    closeGuardRef.current = null;
    openIssueIdRef.current = null;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete(ITEM_PARAM);
        return next;
      },
      { replace: false },
    );
  }, [setSearchParams]);

  const guardedClose = useCallback((): boolean => {
    if (!checkGuard()) return false;
    closeDetail();
    return true;
  }, [checkGuard, closeDetail]);

  const toggleMode = useCallback(() => {
    setMode((prev) => (prev === "panel" ? "modal" : "panel"));
  }, [setMode]);

  const value = useMemo(
    () => ({
      openIssueId,
      mode,
      openDetail,
      closeDetail,
      guardedClose,
      toggleMode,
      setMode,
      setCloseGuard,
    }),
    [openIssueId, mode, openDetail, closeDetail, guardedClose, toggleMode, setMode, setCloseGuard],
  );

  return <DetailPanelContext.Provider value={value}>{children}</DetailPanelContext.Provider>;
}

export function useDetailPanel(): DetailPanelContextValue {
  const ctx = useContext(DetailPanelContext);
  if (!ctx) throw new Error("useDetailPanel must be used within DetailPanelProvider");
  return ctx;
}
