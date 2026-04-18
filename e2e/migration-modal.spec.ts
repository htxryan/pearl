import { expect, test } from "@playwright/test";

test.describe("Embedded mode migration modal", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("pearl-onboarding-complete", "true");
    });
  });

  test("modal renders when backend reports embedded mode (AC-4)", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL("**/list");

    const modal = page.getByTestId("embedded-mode-modal");
    await expect(modal).toBeVisible({ timeout: 5_000 });
    await expect(modal.getByText("Migration Required")).toBeVisible();
    await expect(modal.getByText("Embedded mode is deprecated")).toBeVisible();
  });

  test("Escape does not close the modal (AC-10)", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL("**/list");

    const modal = page.getByTestId("embedded-mode-modal");
    await expect(modal).toBeVisible({ timeout: 5_000 });

    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    await expect(modal).toBeVisible();
  });

  test("backdrop click does not close the modal (AC-10)", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL("**/list");

    const modal = page.getByTestId("embedded-mode-modal");
    await expect(modal).toBeVisible({ timeout: 5_000 });

    await page.mouse.click(10, 10);
    await page.waitForTimeout(500);
    await expect(modal).toBeVisible();
  });

  test("no close button present on the modal (AC-10)", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL("**/list");

    const modal = page.getByTestId("embedded-mode-modal");
    await expect(modal).toBeVisible({ timeout: 5_000 });

    const closeButton = modal.getByRole("button", { name: /close/i });
    await expect(closeButton).not.toBeVisible();
  });

  test("Create Issue button is disabled while modal is open (AC-9)", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL("**/list");

    const modal = page.getByTestId("embedded-mode-modal");
    await expect(modal).toBeVisible({ timeout: 5_000 });

    const createBtn = page.getByTestId("create-issue-btn");
    await expect(createBtn).toBeDisabled();
  });

  test("modal shows both managed and external tabs", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL("**/list");

    const modal = page.getByTestId("embedded-mode-modal");
    await expect(modal).toBeVisible({ timeout: 5_000 });

    await expect(modal.getByText("Pearl-managed")).toBeVisible();
    await expect(modal.getByText("I'll run dolt myself")).toBeVisible();

    await expect(modal.getByTestId("migrate-managed-btn")).toBeVisible();
  });

  test("external tab shows host/port inputs and test connection button", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL("**/list");

    const modal = page.getByTestId("embedded-mode-modal");
    await expect(modal).toBeVisible({ timeout: 5_000 });

    await modal.getByText("I'll run dolt myself").click();

    await expect(modal.getByTestId("migration-host-input")).toBeVisible();
    await expect(modal.getByTestId("migration-port-input")).toBeVisible();
    await expect(modal.getByTestId("test-connection-btn")).toBeVisible();
    await expect(modal.getByTestId("migrate-external-btn")).toBeVisible();
    await expect(modal.getByTestId("migrate-external-btn")).toBeDisabled();
  });

  test("external migration button disabled until connection test passes", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL("**/list");

    const modal = page.getByTestId("embedded-mode-modal");
    await expect(modal).toBeVisible({ timeout: 5_000 });

    await modal.getByText("I'll run dolt myself").click();
    await expect(modal.getByTestId("migrate-external-btn")).toBeDisabled();
  });

  test("test connection to unreachable host shows error (AC-8 UI)", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL("**/list");

    const modal = page.getByTestId("embedded-mode-modal");
    await expect(modal).toBeVisible({ timeout: 5_000 });

    await modal.getByText("I'll run dolt myself").click();
    await modal.getByTestId("migration-host-input").fill("192.0.2.1");
    await modal.getByTestId("migration-port-input").fill("9999");

    await modal.getByTestId("test-connection-btn").click();

    const errorMsg = modal.getByTestId("migration-error");
    await expect(errorMsg).toBeVisible({ timeout: 15_000 });
    await expect(modal).toBeVisible();
  });

  test("managed migration shows copyable command block", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL("**/list");

    const modal = page.getByTestId("embedded-mode-modal");
    await expect(modal).toBeVisible({ timeout: 5_000 });

    await modal.getByText("I'll run dolt myself").click();

    const codeBlock = modal.locator(".font-mono");
    await expect(codeBlock).toBeVisible();
    await expect(codeBlock).toContainText("dolt sql-server");
  });
});
