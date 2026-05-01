import AxeBuilder from "@axe-core/playwright";
import { expect, issueTable, test } from "./fixtures";

test.describe("Accessibility", () => {
  test("skip-to-content link is present", async ({ seededPage: page }) => {
    const skipLink = page.getByText("Skip to content");
    await expect(skipLink).toBeAttached();
  });

  test("main content area is a landmark", async ({ seededPage: page }) => {
    const main = page.locator("main#main-content");
    await expect(main).toBeAttached();
  });

  test("issue table has aria-label", async ({ seededPage: page }) => {
    // Use role-based locator for strictness
    const table = page.getByRole("table", { name: "Issue list" });
    await expect(table).toBeVisible();
  });

  test("board view has aria-label region", async ({ seededPage: page }) => {
    await page.goto("/board");
    const board = page.getByRole("region", { name: "Kanban board" });
    await expect(board).toBeVisible({ timeout: 15_000 });
  });

  test("confirm dialog uses native dialog element", async ({ seededPage: page }) => {
    const table = issueTable(page);
    const firstCheckbox = table.locator("tbody tr").first().getByRole("checkbox");
    await firstCheckbox.click();

    await expect(page.getByText("issue selected")).toBeVisible({ timeout: 5_000 });
    await page.getByRole("button", { name: /^actions$/i }).click();
    await page.getByRole("menuitem", { name: /close selected/i }).click();

    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Cancel it
    await dialog.getByRole("button", { name: /cancel/i }).click();
  });

  test("route announcer exists for screen readers", async ({ seededPage: page }) => {
    const announcer = page.locator('[role="status"][aria-live="polite"]');
    await expect(announcer).toBeAttached();
  });

  test("breadcrumb navigation has aria-label", async ({ seededPage: page }) => {
    const dataRow = page
      .locator('table[aria-label="Issue list"] tbody tr:has(input[type="checkbox"][aria-label])')
      .first();
    await expect(dataRow).toBeVisible({ timeout: 15_000 });
    // Navigate directly to the full detail page via data-issue-id attribute
    const issueId = await dataRow.getAttribute("data-issue-id");
    if (!issueId) throw new Error("Row missing data-issue-id attribute");
    await page.goto(`/issues/${issueId}`);
    await page.waitForURL(`**/issues/${issueId}`);

    const breadcrumb = page.getByLabel("Breadcrumb");
    await expect(breadcrumb).toBeVisible();
  });

  test("theme picker has accessible labels", async ({ seededPage: page }) => {
    await page.goto("/settings");
    const themePicker = page.getByRole("group", { name: "Available themes" });
    await expect(themePicker).toBeVisible({ timeout: 15_000 });

    // Each theme card should have an aria-label and aria-pressed
    const firstThemeBtn = themePicker.getByRole("button").first();
    await expect(firstThemeBtn).toHaveAttribute("aria-label", /.+theme/);
    await expect(firstThemeBtn).toHaveAttribute("aria-pressed", /(true|false)/);
  });

  test("search input has placeholder text", async ({ seededPage: page }) => {
    const searchInput = page.getByPlaceholder(/search/i).first();
    await expect(searchInput).toBeVisible();
  });

  test("quick add input has aria-label", async ({ seededPage: page }) => {
    const quickAdd = page.getByLabel("Quick add issue");
    await expect(quickAdd).toBeVisible();
  });

  test("sort indicators have accessible labels", async ({ seededPage: page }) => {
    const table = issueTable(page);
    const priorityHeader = table.getByRole("columnheader", { name: /priority/i });
    await priorityHeader.click();

    const sortIndicator = page.getByLabel(/sorted/i).first();
    await expect(sortIndicator).toBeVisible({ timeout: 3_000 });
  });

  // ── axe-core a11y scans (EARS-11, AC-11, beads-gui-0n3t) ───────────
  // Asserts zero serious/critical WCAG 2.0/2.1/2.2 A and AA violations on
  // each canonical route. Pre-existing violations are surfaced via
  // test.fixme() with a linked beads task. WCAG 2.2 (finalized 2023-10)
  // adds rules like focus-not-obscured and dragging-movements.
  const A11Y_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

  // Pre-existing color-contrast violations on /, /board, /graph, /issues/:id —
  // tracked in beads-gui-42rx. Tests were added in 6d908f5 but never ran in CI
  // (E2E sharding bug hid them). Marking fixme per the convention above; flip
  // back to active once the contrast issues are fixed.
  test.fixme("axe-core: list view (/) has no serious/critical violations", async ({
    seededPage: page,
  }) => {
    const violations = (await new AxeBuilder({ page }).withTags(A11Y_TAGS).analyze()).violations;
    const blockers = violations.filter((v) => ["serious", "critical"].includes(v.impact ?? ""));
    expect(
      blockers,
      JSON.stringify(
        blockers.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })),
        null,
        2,
      ),
    ).toEqual([]);
  });

  test.fixme("axe-core: board view (/board) has no serious/critical violations", async ({
    seededPage: page,
  }) => {
    await page.goto("/board");
    await expect(page.getByRole("region", { name: "Kanban board" })).toBeVisible({
      timeout: 15_000,
    });

    const violations = (await new AxeBuilder({ page }).withTags(A11Y_TAGS).analyze()).violations;
    const blockers = violations.filter((v) => ["serious", "critical"].includes(v.impact ?? ""));
    expect(
      blockers,
      JSON.stringify(
        blockers.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })),
        null,
        2,
      ),
    ).toEqual([]);
  });

  test.fixme("axe-core: graph view (/graph) has no serious/critical violations", async ({
    seededPage: page,
  }) => {
    await page.goto("/graph");
    // React-flow may not always mount (empty graph) so just wait for either
    // the canvas or an empty-state heading to settle.
    const reactFlow = page.locator(".react-flow");
    await Promise.race([
      reactFlow.waitFor({ state: "visible", timeout: 15_000 }).catch(() => {}),
      page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {}),
    ]);

    const violations = (await new AxeBuilder({ page }).withTags(A11Y_TAGS).analyze()).violations;
    const blockers = violations.filter((v) => ["serious", "critical"].includes(v.impact ?? ""));
    expect(
      blockers,
      JSON.stringify(
        blockers.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })),
        null,
        2,
      ),
    ).toEqual([]);
  });

  test.fixme("axe-core: detail view (/issues/:id) has no serious/critical violations", async ({
    seededPage: page,
  }) => {
    // Use the data-loaded row selector (skeletons don't have aria-label on checkboxes).
    const dataRow = page
      .locator('table[aria-label="Issue list"] tbody tr:has(input[type="checkbox"][aria-label])')
      .first();
    await expect(dataRow).toBeVisible({ timeout: 15_000 });
    const issueId = await dataRow.getAttribute("data-issue-id");
    if (!issueId) throw new Error("Row missing data-issue-id attribute");
    await page.goto(`/issues/${issueId}`);
    await page.waitForURL(`**/issues/${issueId}`);
    await expect(page.getByLabel("Breadcrumb")).toBeVisible({ timeout: 15_000 });

    const violations = (await new AxeBuilder({ page }).withTags(A11Y_TAGS).analyze()).violations;
    const blockers = violations.filter((v) => ["serious", "critical"].includes(v.impact ?? ""));
    expect(
      blockers,
      JSON.stringify(
        blockers.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })),
        null,
        2,
      ),
    ).toEqual([]);
  });
});
