export const meta = {
  title: 'Command Palette',
  description: 'Cmd+K opens commands + fuzzy issue search.',
  startPath: '/list',
};

export default async function scene({ page, cap, helpers }) {
  const { sleep } = helpers;

  cap.mark('Command Palette \u2014 Press Cmd+K for commands & issue search');
  await sleep(800);
  await page.keyboard.press('Meta+k');
  await sleep(3500);

  cap.mark('Issue Search \u2014 Type to find any issue by title or ID');
  await page.keyboard.type('dependency', { delay: 80 });
  await sleep(4000);
  await page.keyboard.press('Escape');
  await sleep(1500);
}
