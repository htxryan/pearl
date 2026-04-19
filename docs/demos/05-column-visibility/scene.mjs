export const meta = {
  title: 'Column Visibility',
  description: 'Toggle which columns show in the issue table; preference persists in localStorage.',
  startPath: '/list',
};

export default async function scene({ page, cap, helpers }) {
  const { hlLocator, hlOff, moveTo, sleep } = helpers;

  cap.mark('Column Visibility \u2014 Toggle columns, persists in localStorage');
  const colBtn = page.locator('button[aria-label="Toggle column visibility"]').first();
  if (!(await colBtn.isVisible({ timeout: 2000 }).catch(() => false))) return;

  await hlLocator(colBtn, 6);
  await moveTo(colBtn);
  await sleep(1000);
  await colBtn.click();
  await sleep(3500);
  await colBtn.click();
  await sleep(1000);
  await hlOff();
}
