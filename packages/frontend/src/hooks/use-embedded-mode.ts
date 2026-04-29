import { useMemo, useRef } from "react";
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

  const locked = useMemo(() => {
    if (isEmbedded) lockedRef.current = true;
    return lockedRef.current;
  }, [isEmbedded]);

  return {
    isEmbedded: locked,
    showModal: locked && !window.__PEARL_TEST_SUPPRESS_MIGRATION_MODAL__,
    isLoading: locked ? false : isLoading,
  };
}
