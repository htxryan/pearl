export const meta = {
  title: 'Onboarding Tour',
  description: 'Progressive 5-step welcome shown to new users on first visit to the list view.',
  startPath: '/list',
  showOnboarding: true,
};

export default async function scene({ page, cap, helpers }) {
  const { moveTo, sleep } = helpers;

  cap.mark('Onboarding Tour \u2014 Progressive 5-step welcome for new users');
  await page.mouse.move(720, 300);
  await sleep(4000);

  const nextBtn = page.locator('button', { hasText: /Next|Get started/i }).first();
  if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await moveTo(nextBtn);
    await sleep(800);
    await nextBtn.click();
    await sleep(2500);
    if (await nextBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await nextBtn.click();
      await sleep(2500);
    }
  }
  const skipBtn = page.locator('button', { hasText: /Skip/i }).first();
  if (await skipBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await skipBtn.click();
    await sleep(800);
  }
}
