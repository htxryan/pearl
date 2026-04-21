export const meta = {
  title: 'Keyboard Navigation & Bulk Selection',
  description: 'j/k to move rows, x to toggle selection, bulk action bar appears.',
  startPath: '/list',
};

export default async function scene({ page, cap, helpers }) {
  const { moveTo, sleep } = helpers;

  cap.mark('Keyboard Navigation \u2014 j/k to move rows, x to select');
  await sleep(1000);
  for (const key of ['j', 'j', 'j', 'k']) {
    await page.keyboard.press(key);
    await sleep(700);
  }
  await sleep(2000);

  cap.mark('Bulk Selection \u2014 Press x to toggle, bulk bar appears');
  for (const key of ['x', 'j', 'x', 'j', 'x']) {
    await page.keyboard.press(key);
    await sleep(600);
  }
  await sleep(2000);

  cap.mark('Bulk Actions \u2014 Reassign, Set Priority, Close with confirmation');
  await sleep(5000);

  const clearSel = page.locator('button', { hasText: /Clear selection/i }).first();
  if (await clearSel.isVisible({ timeout: 1000 }).catch(() => false)) {
    await moveTo(clearSel);
    await sleep(500);
    await clearSel.click();
    await sleep(800);
  }
}
