import { test, expect } from "./fixtures";

const THEMES = [
  "vscode-light-plus",
  "vscode-dark-plus",
  "vscode-vs-light",
  "vscode-vs-dark",
  "vscode-monokai",
  "vscode-monokai-dimmed",
  "vscode-solarized-light",
  "vscode-solarized-dark",
  "vscode-abyss",
  "vscode-kimbie-dark",
  "vscode-quiet-light",
  "vscode-red",
  "vscode-tomorrow-night-blue",
  "vscode-hc-dark",
  "vscode-hc-light",
] as const;

const PRIMITIVE_SECTIONS = [
  "showcase-button",
  "showcase-status-badge",
  "showcase-priority-indicator",
  "showcase-type-pill",
  "showcase-label-badge",
  "showcase-empty-state",
] as const;

for (const themeId of THEMES) {
  test.describe(`Theme: ${themeId}`, () => {
    test.use({ showcaseTheme: themeId });

    test(`full-page snapshot`, async ({ page }) => {
      await expect(page).toHaveScreenshot(`${themeId}-full.png`);
    });

    for (const section of PRIMITIVE_SECTIONS) {
      test(`${section} snapshot`, async ({ page }) => {
        const el = page.getByTestId(section);
        await expect(el).toHaveScreenshot(`${themeId}-${section}.png`);
      });
    }
  });
}
