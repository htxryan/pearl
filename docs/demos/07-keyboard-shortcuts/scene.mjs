export const meta = {
  title: 'Keyboard Shortcuts',
  description: 'Press ? to open the full keyboard shortcut reference overlay.',
  startPath: '/list',
};

export default async function scene({ page, cap, helpers }) {
  const { moveTo, sleep } = helpers;

  cap.mark('Keyboard Shortcuts \u2014 Press ? for full shortcut reference');
  await sleep(800);
  await page.keyboard.press('Shift+?');
  await sleep(5000);

  // Escape does NOT close this overlay — must use the close button.
  const closeBtn = page.locator('[aria-label="Close"]').first();
  if (await closeBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    await moveTo(closeBtn);
    await sleep(500);
    await closeBtn.click();
  }
  await sleep(1500);
}
