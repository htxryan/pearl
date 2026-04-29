import { createContext, useContext } from "react";

export const EmbeddedModeContext = createContext(false);

export const EmbeddedModeProvider = EmbeddedModeContext.Provider;

export function useIsEmbeddedMode(): boolean {
  return useContext(EmbeddedModeContext);
}

declare global {
  interface Window {
    __PEARL_TEST_SUPPRESS_MIGRATION_MODAL__?: boolean;
  }
}
