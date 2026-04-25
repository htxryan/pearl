import { test as base } from "@playwright/test";

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.goto("/__showcase");
    await page.waitForSelector('[data-testid="primitive-showcase"]');
    await use(page);
  },
});

export { expect } from "@playwright/test";
