export const meta = {
  title: 'High Contrast Theme',
  description: 'Switch to High Contrast Dark for maximum accessibility, then reset to Light+ default.',
  startPath: '/settings',
};

export default async function scene({ page, cap, helpers }) {
  const { moveTo, sleep } = helpers;

  cap.mark('High Contrast Dark \u2014 Maximum contrast for accessibility');
  await sleep(1500);
  const hcCard = page.locator('button[aria-label*="High Contrast Dark"]').first();
  if (await hcCard.isVisible({ timeout: 2000 }).catch(() => false)) {
    await moveTo(hcCard);
    await sleep(800);
    await hcCard.click();
    await sleep(3000);
  }

  cap.mark('Light+ Default \u2014 Reset to VS Code default light');
  const defaultCard = page
    .locator('button[aria-label*="Light+"], button[aria-label*="Default Light"]')
    .first();
  if (await defaultCard.isVisible({ timeout: 2000 }).catch(() => false)) {
    await moveTo(defaultCard);
    await sleep(800);
    await defaultCard.click();
    await sleep(2000);
  }
}
