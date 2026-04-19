export const meta = {
  title: 'Quick Add',
  description: 'Type a title and press Enter to create an issue from the list view.',
  startPath: '/list',
};

export default async function scene({ page, cap, helpers }) {
  const { hlLocator, hlOff, moveTo, sleep } = helpers;

  cap.mark('Quick Add \u2014 Type a title and press Enter to create');
  const quickAdd = page.locator('input[placeholder*="Quick add"], input[aria-label*="Quick add"]').first();
  if (!(await quickAdd.isVisible({ timeout: 2000 }).catch(() => false))) return;

  await hlLocator(quickAdd, 8);
  await moveTo(quickAdd);
  await sleep(1000);
  await quickAdd.click();
  await sleep(400);
  await page.keyboard.type('Demo: instant issue creation', { delay: 50 });
  await sleep(3000);
  await page.keyboard.press('Escape');
  await sleep(800);
  await hlOff();
}
