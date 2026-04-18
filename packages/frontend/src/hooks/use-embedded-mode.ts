import { createContext, useContext } from "react";
import { useHealth } from "./use-issues";

const EmbeddedModeContext = createContext(false);

export const EmbeddedModeProvider = EmbeddedModeContext.Provider;

export function useIsEmbeddedMode(): boolean {
  return useContext(EmbeddedModeContext);
}

export function useEmbeddedModeDetection(): {
  isEmbedded: boolean;
  isLoading: boolean;
} {
  const { data: health, isLoading } = useHealth();
  return {
    isEmbedded: health?.dolt_mode === "embedded",
    isLoading,
  };
}
