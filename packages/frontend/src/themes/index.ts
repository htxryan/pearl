import { abyss } from "./definitions/abyss";
import { darkPlus } from "./definitions/dark-plus";
import { hcDark } from "./definitions/hc-dark";
import { hcLight } from "./definitions/hc-light";
import { kimbieDark } from "./definitions/kimbie-dark";
import { lightPlus } from "./definitions/light-plus";
import { monokai } from "./definitions/monokai";
import { monokaiDimmed } from "./definitions/monokai-dimmed";
import { quietLight } from "./definitions/quiet-light";
import { red } from "./definitions/red";
import { solarizedDark } from "./definitions/solarized-dark";
import { solarizedLight } from "./definitions/solarized-light";
import { tomorrowNightBlue } from "./definitions/tomorrow-night-blue";
import { vsDark } from "./definitions/vs-dark";
import { vsLight } from "./definitions/vs-light";

import type { ColorToken, ThemeDefinition } from "./types";
import { COLOR_TOKENS } from "./types";

export const themes: ThemeDefinition[] = [
  lightPlus,
  darkPlus,
  vsLight,
  vsDark,
  monokai,
  monokaiDimmed,
  solarizedLight,
  solarizedDark,
  abyss,
  kimbieDark,
  quietLight,
  red,
  tomorrowNightBlue,
  hcDark,
  hcLight,
];

export function getAllThemes(): ThemeDefinition[] {
  return [...themes];
}

export function getTheme(id: string): ThemeDefinition | undefined {
  return themes.find((theme) => theme.id === id);
}

export function getDefaultTheme(): ThemeDefinition {
  if (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches
  ) {
    return darkPlus;
  }
  return lightPlus;
}

// Re-export types for convenience
export type { ColorToken, ThemeDefinition } from "./types";
export { COLOR_TOKENS } from "./types";

// Dev-mode validation: check that every theme has all required color tokens
if (import.meta.env.DEV) {
  for (const theme of themes) {
    for (const token of COLOR_TOKENS) {
      if (!(token in theme.colors)) {
        console.warn(`Theme "${theme.name}" is missing color token: ${token}`);
      }
    }
  }
}
