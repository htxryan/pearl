export const meta = {
  title: 'List View',
  description: 'Issue table + sidebar navigation intro.',
  startPath: '/list',
};

export default async function scene({ page, cap, helpers }) {
  const { hl, hlOff, moveTo, sleep } = helpers;

  cap.mark('List View \u2014 Issue table with custom typography & accent color');
  await hl('main');
  await sleep(5000);
  await hlOff();

  cap.mark('Sidebar \u2014 Navigation icons with keyboard shortcut hints');
  await hl('aside, nav', 4);
  await moveTo(page.locator('a[href="/list"]').first());
  await sleep(4000);
  await hlOff();
}
