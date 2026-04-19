export const meta = {
  title: '404 Page',
  description: 'Designed not-found page with navigation back to the app.',
  startPath: '/nonexistent-page',
};

export default async function scene({ cap, helpers }) {
  const { sleep } = helpers;

  cap.mark('404 Page \u2014 Designed not-found page with navigation');
  await sleep(5000);
}
