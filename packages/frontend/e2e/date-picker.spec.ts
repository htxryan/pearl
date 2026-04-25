import { test, expect } from "./fixtures";

test.describe("DatePicker — SC-13", () => {
  test("stub: date picker primitives render in showcase", async ({ page }) => {
    await expect(page.getByTestId("primitive-showcase")).toBeVisible();
  });
});
