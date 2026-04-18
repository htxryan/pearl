import { createContext, useContext } from "react";
import { useHealth } from "./use-issues";

const EmbeddedModeContext = createContext(false);

export const EmbeddedModeProvider = EmbeddedModeContext.Provider;

export function useIsEmbeddedMode(): boolean {
  return useContext(EmbeddedModeContext);
}

export function useEmbeddedModeDetection(): {
  isEmbedded: boolean;
  showModal: boolean;
  isLoading: boolean;
} {
  const { data: health, isLoading } = useHealth();
  const isEmbedded = health?.dolt_mode === "embedded";
  return {
    isEmbedded,
    showModal:
      isEmbedded &&
      typeof window !== "undefined" &&
      !window.__PEARL_TEST_SUPPRESS_MIGRATION_MODAL__,
    isLoading,
  };
}

declare global {
  interface Window {
    __PEARL_TEST_SUPPRESS_MIGRATION_MODAL__?: boolean;
  }
}
