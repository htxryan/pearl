import { test, expect } from "./fixtures";

test.describe("Overlays — SC-IV-3: focus trap + return", () => {
  test("Dialog returns focus to trigger after close", async ({ page }) => {
    const trigger = page.getByTestId("dialog-trigger");
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();

    const closeBtn = page.getByTestId("dialog-close");
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();

    await expect(closeBtn).not.toBeVisible();
    await expect(trigger).toBeFocused();
  });

  test("Dialog traps focus inside when open", async ({ page }) => {
    const trigger = page.getByTestId("dialog-trigger");
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();

    const closeBtn = page.getByTestId("dialog-close");
    await expect(closeBtn).toBeVisible();

    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");

    const focusedElement = await page.evaluate(() =>
      document.activeElement?.closest("[role='dialog']") !== null
    );
    expect(focusedElement).toBe(true);

    await page.keyboard.press("Escape");
    await expect(closeBtn).not.toBeVisible();
  });

  test("Dialog Escape key returns focus to trigger", async ({ page }) => {
    const trigger = page.getByTestId("dialog-trigger");
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();

    const closeBtn = page.getByTestId("dialog-close");
    await expect(closeBtn).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(closeBtn).not.toBeVisible();
    await expect(trigger).toBeFocused();
  });

  test("DropdownMenu closes after item selection", async ({ page }) => {
    const trigger = page.getByTestId("dropdown-trigger");
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();

    const item = page.getByTestId("dropdown-item-1");
    await expect(item).toBeVisible();
    await item.click();

    await expect(item).not.toBeVisible();
  });

  test("DropdownMenu Escape returns focus to trigger", async ({ page }) => {
    const trigger = page.getByTestId("dropdown-trigger");
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();

    const item = page.getByTestId("dropdown-item-1");
    await expect(item).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(item).not.toBeVisible();
    await expect(trigger).toBeFocused();
  });
});
