import { test as base } from "@playwright/test";

type ShowcaseFixtures = {
  showcaseTheme: string | undefined;
};

export const test = base.extend<ShowcaseFixtures>({
  showcaseTheme: [undefined, { option: true }],
  page: async ({ page, showcaseTheme }, use) => {
    if (showcaseTheme) {
      await page.addInitScript((theme) => {
        localStorage.setItem("pearl-theme", theme);
      }, showcaseTheme);
    }
    await page.goto("/__showcase");
    await page.waitForSelector('[data-testid="primitive-showcase"]');
    await use(page);
  },
});

export { expect } from "@playwright/test";
