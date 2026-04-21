export const meta = {
  title: 'Board View',
  description: 'Kanban columns with draggable issue cards.',
  startPath: '/board',
};

export default async function scene({ page, cap, helpers }) {
  const { hlLocator, hlOff, moveTo, sleep } = helpers;

  cap.mark('Board View \u2014 Kanban columns with drag-and-drop');
  await sleep(5000);

  cap.mark('Kanban Cards \u2014 Status color bars, priority heat, avatars');
  const card = page.locator('[aria-roledescription="draggable issue card"]').first();
  if (await card.isVisible({ timeout: 2000 }).catch(() => false)) {
    await hlLocator(card, 6);
    await moveTo(card);
    await sleep(4000);
    await hlOff();
  }

  await page.mouse.wheel(400, 0);
  await sleep(2000);
  await page.mouse.wheel(-400, 0);
  await sleep(2000);

  cap.mark('Drag-and-Drop \u2014 Move cards between status columns');
  if (await card.isVisible({ timeout: 2000 }).catch(() => false)) {
    const box = await card.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 });
      await sleep(500);
      await page.mouse.down();
      await sleep(300);
      await page.mouse.move(box.x + 300, box.y, { steps: 30 });
      await sleep(1500);
      await page.mouse.up();
      await sleep(2500);
    }
  }
}
