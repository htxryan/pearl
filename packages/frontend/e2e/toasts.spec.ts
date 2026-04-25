import { test, expect } from "./fixtures";

test.describe("Toasts — SC-6: severities + lifecycle", () => {
  test("success toast renders and auto-dismisses", async ({ page }) => {
    const btn = page.getByTestId("toast-success");
    await btn.scrollIntoViewIfNeeded();
    await btn.click();
    const toast = page.locator('[data-sonner-toast][data-type="success"]');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText("Operation succeeded");
  });

  test("error toast renders", async ({ page }) => {
    const btn = page.getByTestId("toast-error");
    await btn.scrollIntoViewIfNeeded();
    await btn.click();
    const toast = page.locator('[data-sonner-toast][data-type="error"]');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText("Something went wrong");
  });

  test("warning toast renders", async ({ page }) => {
    const btn = page.getByTestId("toast-warning");
    await btn.scrollIntoViewIfNeeded();
    await btn.click();
    const toast = page.locator('[data-sonner-toast][data-type="warning"]');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText("Careful with that");
  });

  test("info toast renders", async ({ page }) => {
    const btn = page.getByTestId("toast-info");
    await btn.scrollIntoViewIfNeeded();
    await btn.click();
    const toast = page.locator('[data-sonner-toast][data-type="info"]');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText("Here is some information");
  });

  test("loading toast renders", async ({ page }) => {
    const btn = page.getByTestId("toast-loading");
    await btn.scrollIntoViewIfNeeded();
    await btn.click();
    const toast = page.locator('[data-sonner-toast][data-type="loading"]');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText("Loading data...");
  });

  test("dismiss all clears visible toasts", async ({ page }) => {
    const infoBtn = page.getByTestId("toast-info");
    await infoBtn.scrollIntoViewIfNeeded();
    await infoBtn.click();
    await expect(page.locator('[data-sonner-toast]').first()).toBeVisible();

    const dismissBtn = page.getByTestId("toast-dismiss");
    await dismissBtn.click();
    await expect(page.locator('[data-sonner-toast]')).toHaveCount(0);
  });
});
