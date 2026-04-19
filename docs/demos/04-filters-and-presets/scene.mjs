export const meta = {
  title: 'Filters & Presets',
  description: 'Filter by status, priority, type, assignee, labels; save & recall filter combos.',
  startPath: '/list',
};

export default async function scene({ page, cap, helpers }) {
  const { hlLocator, hlOff, moveTo, sleep } = helpers;

  cap.mark('Filters \u2014 Status, Priority, Type, Assignee, Labels, Search');
  const statusSel = page.locator('select[aria-label="Filter by status"]');
  if (await statusSel.isVisible({ timeout: 2000 }).catch(() => false)) {
    await hlLocator(statusSel, 80);
    await moveTo(statusSel);
    await sleep(1000);
    await statusSel.selectOption('open');
    await sleep(3000);
    await hlOff();
  }

  cap.mark('Filter Presets \u2014 Save and instantly recall filter combos');
  const saveBtn = page.locator('button', { hasText: /Save view/i }).first();
  if (await saveBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    await hlLocator(saveBtn, 6);
    await moveTo(saveBtn);
    await sleep(1000);
    await saveBtn.click();
    await sleep(3000);
    await page.keyboard.press('Escape');
    await sleep(800);
    await hlOff();
  }

  const clearAll = page.locator('button', { hasText: /Clear all/i }).first();
  if (await clearAll.isVisible({ timeout: 1000 }).catch(() => false)) {
    await clearAll.click();
    await sleep(800);
  }
}
