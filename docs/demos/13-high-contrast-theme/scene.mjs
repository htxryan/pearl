export const meta = {
  title: 'High Contrast Theme',
  description: 'Switch to High Contrast Dark for maximum accessibility, then reset to Light+ default.',
  startPath: '/settings',
};

export default async function scene({ page, cap, helpers }) {
  const { hlLocator, hlOff, moveTo, sleep } = helpers;

  cap.mark('High Contrast Dark \u2014 Maximum contrast for accessibility');
  await sleep(1500);
  const hcCard = page.locator('button[aria-label*="High Contrast Dark"]').first();
  if (await hcCard.count()) {
    // HC Dark lives near the bottom of the 15-theme grid — must scroll it into
    // view before moveTo, or bounding-box points to an off-screen coordinate.
    await hcCard.scrollIntoViewIfNeeded().catch(() => {});
    await sleep(500);
    await hlLocator(hcCard, 6);
    await moveTo(hcCard);
    await sleep(800);
    await hcCard.click();
    await sleep(3500);
    await hlOff();
  }

  cap.mark('Light+ Default \u2014 Reset to VS Code default light');
  const defaultCard = page
    .locator('button[aria-label*="Light+"], button[aria-label*="Default Light"]')
    .first();
  if (await defaultCard.count()) {
    await defaultCard.scrollIntoViewIfNeeded().catch(() => {});
    await sleep(500);
    await hlLocator(defaultCard, 6);
    await moveTo(defaultCard);
    await sleep(800);
    await defaultCard.click();
    await sleep(2500);
    await hlOff();
  }
}
