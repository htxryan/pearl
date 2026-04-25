import { test, expect } from "./fixtures";

test.describe("Sidebar mobile — SC-15", () => {
  test("stub: showcase page is responsive", async ({ page }) => {
    await expect(page.getByTestId("primitive-showcase")).toBeVisible();
  });
});
