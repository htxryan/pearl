export const meta = {
  title: 'Filters & Presets',
  description:
    'Pick statuses from the MultiSelect filter, save/recall filter combos via the Preset dropdown, then Clear all.',
  startPath: '/list',
};

export default async function scene({ page, cap, helpers }) {
  const { hlLocator, hlOff, moveTo, sleep } = helpers;

  cap.mark('Status Filter \u2014 Multi-select with status, priority, type, labels');
  const statusBtn = page.locator('button[role="combobox"][aria-label="Filter by status"]').first();
  if (await statusBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await hlLocator(statusBtn, 8);
    await moveTo(statusBtn);
    await sleep(800);
    await statusBtn.click();
    await sleep(2500); // let the listbox open and settle
    // Pick "Open" (or whatever is first) to create an active filter for the preset demo.
    const openOpt = page.locator('[role="option"]', { hasText: /^Open$/i }).first();
    if (await openOpt.isVisible({ timeout: 1500 }).catch(() => false)) {
      await moveTo(openOpt);
      await sleep(500);
      await openOpt.click();
      await sleep(1500);
    }
    // Close the listbox by clicking the trigger again.
    await statusBtn.click();
    await sleep(1000);
    await hlOff();
  }

  cap.mark('Active Filters \u2014 Applied filters show as removable pills');
  await sleep(2500);

  cap.mark('Preset Dropdown \u2014 Saved filter combos + built-in views');
  // Preset button has aria-haspopup="listbox" and sits at the top-left of the
  // filter bar. Match by role + haspopup rather than text (label varies).
  const presetBtn = page.locator('button[aria-haspopup="listbox"]').first();
  if (await presetBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await hlLocator(presetBtn, 8);
    await moveTo(presetBtn);
    await sleep(800);
    await presetBtn.click();
    await sleep(3500); // let the dropdown settle so viewers can read options
    // Close by clicking the trigger.
    await presetBtn.click();
    await sleep(800);
    await hlOff();
  }

  cap.mark('Clear All \u2014 One click removes every active filter');
  const clearAll = page.locator('button', { hasText: /^Clear all$/i }).first();
  if (await clearAll.isVisible({ timeout: 1500 }).catch(() => false)) {
    await hlLocator(clearAll, 6);
    await moveTo(clearAll);
    await sleep(800);
    await clearAll.click();
    await sleep(1500);
    await hlOff();
  }
}
