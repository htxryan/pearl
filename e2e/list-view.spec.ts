import { test, expect, issueTable } from "./fixtures";

test.describe("List View", () => {
  test("loads and displays issues in a table", async ({ seededPage: page }) => {
    const table = issueTable(page);
    await expect(table).toBeVisible();

    const rows = table.locator("tbody tr");
    await expect(rows.first()).toBeVisible();
    expect(await rows.count()).toBeGreaterThan(0);
  });

  test("shows column headers", async ({ seededPage: page }) => {
    const table = issueTable(page);
    await expect(table.getByRole("columnheader", { name: /title/i })).toBeVisible();
    await expect(table.getByRole("columnheader", { name: /status/i })).toBeVisible();
    await expect(table.getByRole("columnheader", { name: /priority/i })).toBeVisible();
  });

  test("clicking an issue row navigates to detail view", async ({ seededPage: page }) => {
    const table = issueTable(page);
    const firstRow = table.locator("tbody tr").first();

    // Click the title cell (nth(2) = Title column, after checkbox and ID)
    await firstRow.locator("td").nth(2).click();
    await page.waitForURL("**/issues/**");
    await expect(page.getByLabel("Breadcrumb")).toBeVisible();
  });

  test("search filter narrows results", async ({ seededPage: page }) => {
    const searchInput = page.getByPlaceholder(/search/i).first();
    await searchInput.fill("Epic");

    // Wait for debounce + request
    await page.waitForTimeout(500);
    const rows = issueTable(page).locator("tbody tr");
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);

    // First result should contain "Epic"
    const firstTitle = await rows.first().locator("td").nth(2).textContent();
    expect(firstTitle?.toLowerCase()).toContain("epic");
  });

  test("sort by column header click", async ({ seededPage: page }) => {
    const table = issueTable(page);
    const priorityHeader = table.getByRole("columnheader", { name: /priority/i });

    await priorityHeader.click();
    await expect(
      page.getByLabel("Sorted ascending").or(page.getByLabel("Sorted descending")).first(),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("column visibility menu is present", async ({ seededPage: page }) => {
    const columnsBtn = page.getByLabel("Toggle column visibility");
    await expect(columnsBtn).toBeVisible();
    await columnsBtn.click();

    // Menu should be expanded
    await expect(columnsBtn).toHaveAttribute("aria-expanded", "true");

    // Click button again to close
    await columnsBtn.click();
  });

  test("keyboard navigation: j/k moves active row", async ({ seededPage: page }) => {
    const rows = issueTable(page).locator("tbody tr");
    const rowCount = await rows.count();
    if (rowCount < 2) return;

    await page.keyboard.press("j");
    await expect(rows.nth(0)).toHaveAttribute("aria-selected", "true");

    await page.keyboard.press("j");
    await expect(rows.nth(1)).toHaveAttribute("aria-selected", "true");

    await page.keyboard.press("k");
    await expect(rows.nth(0)).toHaveAttribute("aria-selected", "true");
  });

  test("keyboard navigation: x toggles selection", async ({ seededPage: page }) => {
    const rows = issueTable(page).locator("tbody tr");
    if ((await rows.count()) < 1) return;

    await page.keyboard.press("j");
    await page.keyboard.press("x");

    // Bulk action bar should show "issue selected" text
    await expect(page.getByText("issue selected")).toBeVisible({ timeout: 5_000 });
  });

  test("keyboard: Enter opens the active issue", async ({ seededPage: page }) => {
    await page.keyboard.press("j");
    await page.keyboard.press("Enter");
    await page.waitForURL("**/issues/**");
  });

  test("quick-add input is visible and has placeholder", async ({ seededPage: page }) => {
    const quickAdd = page.getByLabel("Quick add issue");
    await expect(quickAdd).toBeVisible();
    await expect(quickAdd).toHaveAttribute("placeholder", /quick add/i);
  });

  test("shows data after loading", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("beads-gui-onboarding-complete", "true");
    });
    await page.goto("/list");

    await expect(page.getByRole("table", { name: "Issue list" })).toBeVisible({ timeout: 15_000 });
    const rows = page.getByRole("table", { name: "Issue list" }).locator("tbody tr");
    expect(await rows.count()).toBeGreaterThan(0);
  });
});
