export const meta = {
  title: 'Detail View',
  description:
    'Open an issue; breadcrumb navigation, inline field editing, status/priority badges, markdown editor, dependency autocomplete, activity timeline.',
  startPath: '/list',
};

export default async function scene({ page, cap, helpers }) {
  const { hl, hlLocator, hlOff, moveTo, scrollToHeading, sleep } = helpers;

  cap.mark('Detail View \u2014 Click issue title to open full detail');
  // Click the title cell (3rd td), NOT the checkbox in the first cell.
  const titleCell = page.locator('tbody tr td').nth(2).first();
  await moveTo(titleCell);
  await sleep(1000);
  await titleCell.click();
  await sleep(3000);

  const inDetail = page.url().includes('/issues/');
  console.log(`  Verified detail view: ${inDetail}`);
  if (!inDetail) return;

  cap.mark('Breadcrumb Navigation \u2014 Shows origin view for quick return');
  await hl('nav[aria-label="Breadcrumb"]', 8);
  await sleep(4000);
  await hlOff();

  cap.mark('Inline Field Editing \u2014 Click any field to edit in place');
  await hl('.grid-cols-2', 8);
  await sleep(4000);
  await hlOff();

  cap.mark('Status Badges & Priority \u2014 Brand accent color system');
  await sleep(3000);

  cap.mark('Markdown Editor \u2014 Write/Preview tabs + formatting toolbar');
  await scrollToHeading('Description');
  await sleep(1000);
  const editBtn = page.locator('button', { hasText: /^Edit$/ }).first();
  if (await editBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await hlLocator(editBtn, 6);
    await moveTo(editBtn);
    await sleep(800);
    await editBtn.click();
    await sleep(2500);
    await hlOff();
    const previewTab = page.locator('button', { hasText: /^Preview$/ }).first();
    if (await previewTab.isVisible({ timeout: 1000 }).catch(() => false)) {
      await moveTo(previewTab);
      await sleep(500);
      await previewTab.click();
      await sleep(3000);
    }
    const cancelBtn = page.locator('button', { hasText: /^Cancel$/ }).first();
    if (await cancelBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await cancelBtn.click();
      await sleep(800);
    }
  }

  cap.mark('Dependency Autocomplete \u2014 Search issues by title to link');
  await scrollToHeading('Dependencies');
  await sleep(1000);
  const addBtn = page.locator('button', { hasText: '+ Add' }).first();
  if (await addBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await hlLocator(addBtn, 6);
    await moveTo(addBtn);
    await sleep(800);
    await addBtn.click();
    await sleep(800);
    const depInput = page.locator('input[role="combobox"]').first();
    if (await depInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await page.keyboard.type('epic', { delay: 80 });
      await sleep(3500);
      await page.keyboard.press('Escape');
      await sleep(500);
    }
    await hlOff();
  }

  cap.mark('Activity Timeline \u2014 Event history with field change diffs');
  await scrollToHeading('Activity');
  await sleep(4000);

  cap.mark('Close Detail \u2014 Press Escape to return to list');
  await sleep(800);
  await page.keyboard.press('Escape');
  await sleep(2500);
}
