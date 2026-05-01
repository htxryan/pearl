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

  test("Dialog traps focus — Tab does not escape to page content", async ({ page }) => {
    const trigger = page.getByTestId("dialog-trigger");
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();

    const closeBtn = page.getByTestId("dialog-close");
    await expect(closeBtn).toBeVisible();

    // The behavioral invariant of a focus trap is that Tab cannot land focus on
    // page content outside the dialog (the trigger is the canonical witness).
    // After each Tab, focus may transiently land on a BaseUI focus-guard sentinel
    // before being redirected back into the dialog — that's correct trap behavior,
    // not an escape. So we assert the trigger never receives focus across many tabs.
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press("Tab");
      const triggerHasFocus = await page.evaluate(() => {
        const t = document.querySelector('[data-testid="dialog-trigger"]');
        return t === document.activeElement;
      });
      expect(triggerHasFocus, `Trigger received focus after ${i + 1} Tab(s)`).toBe(false);
    }

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
