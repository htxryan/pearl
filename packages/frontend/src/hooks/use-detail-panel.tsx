import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

export function DetailPanelProvider({ children }: { children: ReactNode }) {
  const [openIssueId, setOpenIssueId] = useState<string | null>(null);
  const [mode, setMode] = usePersistedState<DetailPanelMode>("beads:detail-panel-mode", "panel");

  const closeGuardRef = useRef<CloseGuard | null>(null);
  const openIssueIdRef = useRef<string | null>(null);

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
      if (openIssueIdRef.current !== null && openIssueIdRef.current !== id) {
        if (!checkGuard()) return;
        closeGuardRef.current = null;
      }
      openIssueIdRef.current = id;
      setOpenIssueId(id);
    },
    [checkGuard],
  );

  const closeDetail = useCallback(() => {
    closeGuardRef.current = null;
    openIssueIdRef.current = null;
    setOpenIssueId(null);
  }, []);

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
