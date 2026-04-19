export const meta = {
  title: 'Theme Switcher via Command Palette',
  description: 'Cmd+K → Switch Theme → Solarized Light, then shows the warm palette applied on the list view.',
  startPath: '/list',
};

export default async function scene({ page, cap, helpers }) {
  const { injectOverlays, moveTo, sleep } = helpers;

  cap.mark('Command Palette \u2014 Switch Theme for quick access');
  await page.keyboard.press('Meta+k');
  await sleep(1000);
  await page.keyboard.type('Switch Theme', { delay: 60 });
  await sleep(3000);

  cap.mark('Solarized Light \u2014 Warm, readable light palette');
  const solarizedOption = page.locator('li', { hasText: 'Solarized Light' }).first();
  if (await solarizedOption.isVisible({ timeout: 2000 }).catch(() => false)) {
    await moveTo(solarizedOption);
    await sleep(800);
    await solarizedOption.click();
  } else {
    // Fallback: pick via settings page if palette doesn't surface the option.
    await page.keyboard.press('Escape');
    await sleep(500);
    await page.goto('http://localhost:5173/settings');
    await page.waitForLoadState('networkidle').catch(() => {});
    await injectOverlays();
    const solCard = page.locator('button[aria-label*="Solarized Light"]').first();
    if (await solCard.isVisible({ timeout: 2000 }).catch(() => false)) {
      await solCard.click();
    }
  }
  await sleep(2500);

  cap.mark('Solarized Light List \u2014 Warm tones across the interface');
  await page.goto('http://localhost:5173/list');
  await page.waitForLoadState('networkidle').catch(() => {});
  await injectOverlays();
  await page.mouse.move(720, 450);
  await sleep(5000);
}
