export const meta = {
  title: 'Theme Picker',
  description: 'Settings page theme picker — 15 VS Code themes. Picks Monokai, then shows it on the board.',
  startPath: '/settings',
};

export default async function scene({ page, cap, helpers }) {
  const { hl, hlLocator, hlOff, injectOverlays, moveTo, sleep } = helpers;

  cap.mark('Settings \u2014 Navigate via sidebar gear icon (shortcut: 4)');
  const settingsLink = page.locator('a[href="/settings"]').first();
  if (await settingsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
    await hlLocator(settingsLink, 6);
    await moveTo(settingsLink);
    await sleep(2000);
    await hlOff();
  }
  await page.mouse.move(720, 450);
  await sleep(2000);

  cap.mark('Theme Picker \u2014 15 VS Code themes with color swatches');
  await hl('[role="group"][aria-label="Available themes"]', 8);
  await sleep(5000);
  await hlOff();

  cap.mark('Monokai \u2014 Bold, colorful dark theme');
  const monokaiCard = page.locator('button[aria-label*="Monokai theme"]').first();
  if (await monokaiCard.isVisible({ timeout: 2000 }).catch(() => false)) {
    await moveTo(monokaiCard);
    await sleep(1000);
    await monokaiCard.click();
    await sleep(3000);
  }

  cap.mark('Monokai Board \u2014 Dark theme with accent colors');
  await page.goto('http://localhost:5173/board');
  await page.waitForLoadState('networkidle').catch(() => {});
  await injectOverlays();
  await page.mouse.move(720, 450);
  await sleep(5000);
}
