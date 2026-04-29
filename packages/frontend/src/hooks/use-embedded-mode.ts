import { useRef } from "react";
import { useHealth } from "./use-issues";

export { EmbeddedModeProvider, useIsEmbeddedMode } from "./embedded-mode-context";

export function useEmbeddedModeDetection(): {
  isEmbedded: boolean;
  showModal: boolean;
  isLoading: boolean;
} {
  const lockedRef = useRef(false);
  const { data: health, isLoading } = useHealth();
  const isEmbedded = health?.dolt_mode === "embedded";

  if (isEmbedded) lockedRef.current = true;

  const locked = lockedRef.current;
  return {
    isEmbedded: locked,
    showModal:
      locked && typeof window !== "undefined" && !window.__PEARL_TEST_SUPPRESS_MIGRATION_MODAL__,
    isLoading: locked ? false : isLoading,
  };
}
