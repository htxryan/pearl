export const meta = {
  title: 'Graph View',
  description: 'Dependency graph with Dagre layout, color-coded edges, zoom & pan.',
  startPath: '/graph',
};

export default async function scene({ page, cap, helpers }) {
  const { sleep } = helpers;

  cap.mark('Graph View \u2014 Dependency visualization with Dagre layout');
  await sleep(6000);

  cap.mark('Color-coded Edges \u2014 blocks (red), depends_on (blue), relates (purple)');
  await sleep(4000);

  cap.mark('Interactive Graph \u2014 Zoom, pan, click to highlight chains');
  for (let i = 0; i < 3; i++) {
    await page.mouse.wheel(0, -100);
    await sleep(500);
  }
  await sleep(1500);
  await page.mouse.move(720, 450);
  await page.mouse.down();
  await page.mouse.move(500, 300, { steps: 25 });
  await page.mouse.up();
  await sleep(1500);
  for (let i = 0; i < 4; i++) {
    await page.mouse.wheel(0, 100);
    await sleep(350);
  }
  await sleep(2000);
}
