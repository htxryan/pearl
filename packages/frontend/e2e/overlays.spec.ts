import { test, expect } from "./fixtures";

test.describe("Overlays — SC-3, SC-4: focus trap + return", () => {
  test("stub: overlay primitives render in showcase", async ({ page }) => {
    await expect(page.getByTestId("primitive-showcase")).toBeVisible();
  });
});
