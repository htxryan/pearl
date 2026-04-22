import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePersistedState } from "@/hooks/use-persisted-state";

export type DetailPanelMode = "panel" | "modal";

interface DetailPanelContextValue {
  openIssueId: string | null;
  mode: DetailPanelMode;
  openDetail: (id: string) => void;
  closeDetail: () => void;
  toggleMode: () => void;
  setMode: (mode: DetailPanelMode) => void;
}

const DetailPanelContext = createContext<DetailPanelContextValue | null>(null);

export function DetailPanelProvider({ children }: { children: ReactNode }) {
  const [openIssueId, setOpenIssueId] = useState<string | null>(null);
  const [mode, setMode] = usePersistedState<DetailPanelMode>("beads:detail-panel-mode", "panel");

  useEffect(() => {
    localStorage.removeItem("beads:detail-panel-issue");
    localStorage.removeItem("beads:panel-mode");
  }, []);

  const openDetail = useCallback(
    (id: string) => {
      setOpenIssueId(id);
    },
    [setOpenIssueId],
  );

  const closeDetail = useCallback(() => {
    setOpenIssueId(null);
  }, [setOpenIssueId]);

  const toggleMode = useCallback(() => {
    setMode((prev) => (prev === "panel" ? "modal" : "panel"));
  }, [setMode]);

  const value = useMemo(
    () => ({ openIssueId, mode, openDetail, closeDetail, toggleMode, setMode }),
    [openIssueId, mode, openDetail, closeDetail, toggleMode, setMode],
  );

  return <DetailPanelContext.Provider value={value}>{children}</DetailPanelContext.Provider>;
}

export function useDetailPanel(): DetailPanelContextValue {
  const ctx = useContext(DetailPanelContext);
  if (!ctx) throw new Error("useDetailPanel must be used within DetailPanelProvider");
  return ctx;
}
