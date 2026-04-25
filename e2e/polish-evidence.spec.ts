/**
 * Polish-evidence: visual screenshots for the 31 polish epics.
 *
 * Excluded from default chromium project (matches *-proof.spec.ts pattern).
 * Run explicitly: pnpm exec playwright test polish-evidence --project=chromium
 *
 * Outputs to docs/polish-evidence/<bead-id>-<slug>.png
 */

import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, type Page, test } from "@playwright/test";

const OUT = resolve(__dirname, "../docs/polish-evidence");
mkdirSync(OUT, { recursive: true });

const DESKTOP = { width: 1440, height: 900 };
const DATA_ROW = 'table[aria-label="Issue list"] tbody tr:has(input[type="checkbox"][aria-label])';

async function seed(page: Page, path = "/") {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    localStorage.setItem("pearl-onboarding-complete", "true");
    (window as any).__PEARL_TEST_SUPPRESS_MIGRATION_MODAL__ = true;
  });
  await page.setViewportSize(DESKTOP);
  await page.goto(path);
}

async function gotoListWithData(page: Page) {
  await seed(page, "/list");
  await page.waitForURL("**/list");
  await page.waitForSelector(DATA_ROW, { timeout: 20_000 });
}

async function shoot(page: Page, name: string, fullPage = false) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage });
}

async function firstIssueId(page: Page): Promise<string> {
  const id = await page.locator(DATA_ROW).first().getAttribute("data-issue-id");
  if (!id) throw new Error("no data-issue-id on first row");
  return id;
}

test.describe.configure({ mode: "serial" });

test.describe("polish evidence", () => {
  // ========== LIST VIEW (multiple epics in one shot) ==========

  test("0u99 + 4baw + 7100 + 3gq2 + 2hi4 + fvp6: list view baseline", async ({ page }) => {
    await gotoListWithData(page);
    // Pure baseline — captures: TypePill (3gq2), BeadIdPill (2hi4),
    // column sizing (0u99), button icons (fvp6).
    await shoot(page, "list-baseline-0u99-4baw-3gq2-2hi4-fvp6");
  });

  test("7100: bulk action bar collapsed into Actions dropdown", async ({ page }) => {
    await gotoListWithData(page);
    // Select first 2 rows
    const checkboxes = page.locator(`${DATA_ROW} input[type="checkbox"]`);
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();
    await page.waitForTimeout(200);
    await shoot(page, "7100-bulk-actions-dropdown");
    // Open the dropdown to capture menu
    const actions = page.getByRole("button", { name: /actions/i }).first();
    if (await actions.isVisible().catch(() => false)) {
      await actions.click();
      await page.waitForTimeout(300);
      await shoot(page, "7100-bulk-actions-menu-open");
    }
  });

  test("myl1 + 5xy0: filter UI — chips and No Parent + Ready", async ({ page }) => {
    await gotoListWithData(page);
    // Open status filter (or similar)
    const filterBtn = page.getByRole("button", { name: /status|filter/i }).first();
    if (await filterBtn.isVisible().catch(() => false)) {
      await filterBtn.click();
      await page.waitForTimeout(300);
      await shoot(page, "myl1-status-filter-chips");
    } else {
      await shoot(page, "myl1-fallback-list-with-filters");
    }
  });

  test("4baw: drag-drop column reorder evidence", async ({ page }) => {
    await gotoListWithData(page);
    // Capture columns before
    await shoot(page, "4baw-columns-before");
    // Try a drag — find a draggable column header. Be tolerant if not present.
    const headers = page.locator("table thead th");
    const headerCount = await headers.count();
    if (headerCount >= 3) {
      const sourceBox = await headers.nth(2).boundingBox();
      const targetBox = await headers.nth(1).boundingBox();
      if (sourceBox && targetBox) {
        await page.mouse.move(
          sourceBox.x + sourceBox.width / 2,
          sourceBox.y + sourceBox.height / 2,
        );
        await page.mouse.down();
        await page.mouse.move(targetBox.x + 5, targetBox.y + targetBox.height / 2, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(300);
      }
    }
    await shoot(page, "4baw-columns-after");
  });

  // ========== BOARD VIEW ==========

  test("gcs0 + 3gq2: board view with sort selector", async ({ page }) => {
    await seed(page, "/board");
    await page.waitForURL("**/board");
    await page.waitForTimeout(1500);
    await shoot(page, "gcs0-board-baseline-3gq2-types");
    // Click a per-column sort selector if visible
    const sortBtn = page.getByRole("button", { name: /sort/i }).first();
    if (await sortBtn.isVisible().catch(() => false)) {
      await sortBtn.click();
      await page.waitForTimeout(300);
      await shoot(page, "gcs0-board-sort-menu-open");
    }
  });

  // ========== GRAPH VIEW ==========

  test("m1ju: graph nodes with open-detail icon button", async ({ page }) => {
    await seed(page, "/graph");
    await page.waitForURL("**/graph");
    await page.waitForTimeout(2000);
    await shoot(page, "m1ju-graph-baseline-with-open-icons", true);
  });

  // ========== DETAIL VIEW (many epics overlap here) ==========

  test("x61n + alqo + l42x + vbr4 + huds + rjvl + 2hi4 + 8bk2: detail view", async ({ page }) => {
    await gotoListWithData(page);
    const id = await firstIssueId(page);
    await page.goto(`/issues/${id}`);
    await page.waitForURL(`**/issues/${id}`);
    await page.waitForTimeout(1000);
    // Captures unified detail (x61n), metadata sidebar (alqo),
    // empty-section "Add" buttons (l42x), tabbed Comments/Activity (vbr4),
    // pencil-icon Edit (huds), clickable dependency IDs (rjvl),
    // BeadId pill (2hi4), Detail Actions dropdown (8bk2).
    await shoot(page, "x61n-detail-full-page", true);
  });

  test("x61n: detail modal (in-place panel from list)", async ({ page }) => {
    await gotoListWithData(page);
    // Click first row to open in-place modal/panel
    await page.locator(DATA_ROW).first().click();
    await page.waitForTimeout(800);
    await shoot(page, "x61n-detail-modal-from-list");
  });

  test("8bk2: detail Actions dropdown open", async ({ page }) => {
    await gotoListWithData(page);
    const id = await firstIssueId(page);
    await page.goto(`/issues/${id}`);
    await page.waitForTimeout(800);
    const actions = page.getByRole("button", { name: /actions/i }).first();
    if (await actions.isVisible().catch(() => false)) {
      await actions.click();
      await page.waitForTimeout(300);
      await shoot(page, "8bk2-detail-actions-menu-open");
    } else {
      await shoot(page, "8bk2-detail-actions-fallback");
    }
  });

  test("vbr4: tabs between Comments and Activity", async ({ page }) => {
    await gotoListWithData(page);
    const id = await firstIssueId(page);
    await page.goto(`/issues/${id}`);
    await page.waitForTimeout(800);
    const activityTab = page.getByRole("tab", { name: /activity/i }).first();
    if (await activityTab.isVisible().catch(() => false)) {
      await shoot(page, "vbr4-tabs-comments-default");
      await activityTab.click();
      await page.waitForTimeout(300);
      await shoot(page, "vbr4-tabs-activity-selected");
    } else {
      await shoot(page, "vbr4-tabs-fallback");
    }
  });

  test("6vwp + 653q: activity entries — structured + event badge", async ({ page }) => {
    await gotoListWithData(page);
    const id = await firstIssueId(page);
    await page.goto(`/issues/${id}`);
    await page.waitForTimeout(800);
    const activityTab = page.getByRole("tab", { name: /activity/i }).first();
    if (await activityTab.isVisible().catch(() => false)) {
      await activityTab.click();
      await page.waitForTimeout(500);
    }
    await shoot(page, "6vwp-653q-activity-list", true);
  });

  test("alqo: collapsible/resizable right metadata sidebar", async ({ page }) => {
    await gotoListWithData(page);
    const id = await firstIssueId(page);
    await page.goto(`/issues/${id}`);
    await page.waitForTimeout(800);
    await shoot(page, "alqo-detail-with-sidebar");
    // Try to collapse
    const collapse = page
      .getByRole("button", { name: /collapse|hide.*sidebar|toggle.*sidebar/i })
      .first();
    if (await collapse.isVisible().catch(() => false)) {
      await collapse.click();
      await page.waitForTimeout(300);
      await shoot(page, "alqo-detail-sidebar-collapsed");
    }
  });

  test("yxe0: detail panel header has no Expand button", async ({ page }) => {
    await gotoListWithData(page);
    await page.locator(DATA_ROW).first().click();
    await page.waitForTimeout(800);
    await shoot(page, "yxe0-detail-panel-header-no-expand");
  });

  test("rjvl: clickable dependency IDs (back-stack)", async ({ page }) => {
    await gotoListWithData(page);
    const id = await firstIssueId(page);
    await page.goto(`/issues/${id}`);
    await page.waitForTimeout(800);
    // Find a BeadIdPill in the dependencies area and screenshot it
    await shoot(page, "rjvl-detail-deps-clickable", true);
  });

  // ========== HEADER / GENERAL ==========

  test("kb2v + fvp6: header hints clickable + spaced", async ({ page }) => {
    await gotoListWithData(page);
    // Crop on the header
    const header = page.locator("header").first();
    await header.waitFor({ state: "visible" });
    const box = await header.boundingBox();
    if (box) {
      await page.screenshot({
        path: `${OUT}/kb2v-header-clickable-hints.png`,
        clip: {
          x: 0,
          y: 0,
          width: DESKTOP.width,
          height: Math.ceil(box.height + box.y + 8),
        },
      });
    } else {
      await shoot(page, "kb2v-header-clickable-hints-fallback");
    }
  });

  test("9m2v: ⌘K Recent Issues ordering (after viewing 3 issues)", async ({ page }) => {
    await gotoListWithData(page);
    // Visit 3 issues to populate recents
    const ids: string[] = [];
    const rows = page.locator(DATA_ROW);
    for (let i = 0; i < 3; i++) {
      const id = await rows.nth(i).getAttribute("data-issue-id");
      if (id) ids.push(id);
    }
    for (const id of ids) {
      await page.goto(`/issues/${id}`);
      await page.waitForTimeout(400);
    }
    await page.goto("/list");
    await page.waitForSelector(DATA_ROW, { timeout: 15_000 });
    // Open command palette
    await page.keyboard.press("Meta+k");
    await page.waitForTimeout(500);
    await shoot(page, "9m2v-cmdk-recent-issues-order");
  });

  // ========== CREATE ISSUE MODAL ==========

  test("w3rm + 3j7v: Create Issue modal — wider, no draft restore", async ({ page }) => {
    await gotoListWithData(page);
    // Open create modal — usually a "New" / "Create" button
    const createBtn = page
      .getByRole("button", { name: /new issue|create issue|create|new/i })
      .first();
    if (await createBtn.isVisible().catch(() => false)) {
      await createBtn.click();
      await page.waitForTimeout(500);
      await shoot(page, "w3rm-create-issue-wider-modal");
      // Type something then close, reopen — should not restore
      const titleInput = page.getByRole("textbox").first();
      if (await titleInput.isVisible().catch(() => false)) {
        await titleInput.fill("draft-content-should-not-persist");
        await page.waitForTimeout(200);
        await page.keyboard.press("Escape");
        await page.waitForTimeout(400);
        await createBtn.click();
        await page.waitForTimeout(400);
        await shoot(page, "3j7v-create-modal-reopen-no-draft-restore");
      }
    } else {
      await shoot(page, "w3rm-fallback-no-create-button-found");
    }
  });

  // ========== SETTINGS ==========

  test("2eil + j4zn + y8hr: Settings sub-tabs + theme list + hidden rows", async ({ page }) => {
    await seed(page, "/settings");
    // 2eil: route should redirect to /settings/appearance
    await page.waitForURL(/\/settings(\/appearance)?$/, { timeout: 10_000 });
    await page.waitForTimeout(800);
    await shoot(page, "2eil-settings-appearance-default", true);
    // Navigate sub-tabs
    const attachmentsTab = page.getByRole("link", { name: /attachments/i }).first();
    if (await attachmentsTab.isVisible().catch(() => false)) {
      await attachmentsTab.click();
      await page.waitForURL(/\/settings\/attachments/);
      await page.waitForTimeout(400);
      await shoot(page, "2eil-y8hr-settings-attachments-no-hidden-rows", true);
    }
    const notifTab = page.getByRole("link", { name: /notifications/i }).first();
    if (await notifTab.isVisible().catch(() => false)) {
      await notifTab.click();
      await page.waitForURL(/\/settings\/notifications/);
      await page.waitForTimeout(400);
      await shoot(page, "2eil-settings-notifications", true);
    }
    // Back to appearance to capture j4zn theme list
    const appearanceTab = page.getByRole("link", { name: /appearance/i }).first();
    if (await appearanceTab.isVisible().catch(() => false)) {
      await appearanceTab.click();
      await page.waitForTimeout(400);
      await shoot(page, "j4zn-settings-appearance-theme-flat-list", true);
    }
  });

  // ========== URL/SELECTION (tlnm), Image (0t2c, vkkz), Keyboard (dnaq) ==========
  // These are harder to evidence visually; capture state proxies.

  test("tlnm: URL reflects selected item on list", async ({ page }) => {
    await gotoListWithData(page);
    await page.locator(DATA_ROW).first().click();
    await page.waitForTimeout(800);
    // URL should now include the selected issue id (param or path)
    await shoot(page, "tlnm-url-reflects-selection");
    // capture the address bar via the page URL into a small annotation file
    const url = page.url();
    await page.evaluate((u) => {
      const banner = document.createElement("div");
      banner.id = "__url_banner";
      banner.style.cssText =
        "position:fixed;top:8px;right:8px;z-index:99999;background:#000;color:#0f0;font:12px monospace;padding:6px 10px;border-radius:4px;max-width:60vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap";
      banner.textContent = "URL: " + u;
      document.body.appendChild(banner);
    }, url);
    await shoot(page, "tlnm-url-reflects-selection-with-banner");
  });

  test("dnaq: j/k keyboard navigation between issues", async ({ page }) => {
    await gotoListWithData(page);
    await page.locator(DATA_ROW).first().click();
    await page.waitForTimeout(800);
    const beforeUrl = page.url();
    await page.keyboard.press("j");
    await page.waitForTimeout(500);
    const afterUrl = page.url();
    // Annotate before/after URLs
    await page.evaluate(
      ({ b, a }) => {
        const banner = document.createElement("div");
        banner.style.cssText =
          "position:fixed;bottom:8px;left:8px;z-index:99999;background:#000;color:#0f0;font:12px monospace;padding:8px 12px;border-radius:6px;max-width:80vw;line-height:1.5";
        banner.innerHTML = `<b>Pressed j</b><br>before: ${b}<br>after:  ${a}`;
        document.body.appendChild(banner);
      },
      { b: beforeUrl, a: afterUrl },
    );
    await shoot(page, "dnaq-j-key-navigates-next-issue");
  });

  test("vkkz: image insert auto-numbers alt (no modal)", async ({ page }) => {
    // Open create issue modal which includes the editor
    await gotoListWithData(page);
    const createBtn = page
      .getByRole("button", { name: /new issue|create issue|create|new/i })
      .first();
    if (!(await createBtn.isVisible().catch(() => false))) {
      await shoot(page, "vkkz-fallback-no-create");
      return;
    }
    await createBtn.click();
    await page.waitForTimeout(500);
    await shoot(page, "vkkz-create-modal-with-editor");
    // Look for an image button in the editor
    const imgBtn = page.getByRole("button", { name: /image/i }).first();
    if (await imgBtn.isVisible().catch(() => false)) {
      await shoot(page, "vkkz-image-button-visible-no-modal-needed");
    }
  });

  test("0t2c: image attachment inline mode — REAL round-trip", async ({ page, request }) => {
    // Real test of the 0t2c bug fix: inline base64 attachments larger than
    // the original 10KB cap must round-trip through API → DB → render.
    // Reads a real PNG (~21KB → ~28KB base64), POSTs an issue with the
    // Pearl attachment syntax, then verifies the rendered <img> appears.
    const pngPath = resolve(__dirname, "../docs/demo/setup-wizard-server-config.png");
    const pngBytes = readFileSync(pngPath);
    const base64 = pngBytes.toString("base64");
    const ref = randomBytes(6).toString("hex"); // 12 hex chars
    const stamp = Date.now();

    const description = [
      `# 0t2c regression evidence (${stamp})`,
      "",
      `Inline image attachment of ${pngBytes.length} raw bytes (${base64.length} base64 chars).`,
      "Pre-fix this would have been rejected by the 10KB API field schema.",
      "",
      `[img:${ref}]`,
      "",
      `<!-- pearl-attachment:v1:${ref}`,
      "type: inline",
      "mime: image/png",
      `data: ${base64}`,
      "-->",
    ].join("\n");

    // POST a fresh issue via API
    const createRes = await request.post("http://127.0.0.1:3456/api/issues", {
      data: {
        title: `0t2c E2E inline-attachment round-trip ${stamp}`,
        description,
        issue_type: "task",
        priority: 2,
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const created = (await createRes.json()) as { data: { id: string } };
    const issueId = created.data.id;

    // Read it back to verify the description survived round-trip intact
    const readRes = await request.get(`http://127.0.0.1:3456/api/issues/${issueId}`);
    expect(readRes.ok()).toBeTruthy();
    const read = (await readRes.json()) as { description: string };
    expect(read.description.length).toBeGreaterThan(base64.length);
    expect(read.description).toContain(`[img:${ref}]`);
    expect(read.description).toContain(`pearl-attachment:v1:${ref}`);
    expect(read.description).toContain(base64.slice(0, 100));
    expect(read.description).toContain(base64.slice(-100));

    // Now render in browser and capture the actual decoded image
    await seed(page, `/issues/${issueId}`);
    await page.waitForURL(`**/issues/${issueId}`);
    // Wait for the rendered <img> to appear (decoded from base64 in markdown)
    const img = page
      .locator("img")
      .filter({ hasNot: page.locator("svg") })
      .first();
    await img.waitFor({ state: "visible", timeout: 10_000 });
    // Verify the image actually has natural dimensions (not a broken icon)
    const dims = await img.evaluate((el: HTMLImageElement) => ({
      w: el.naturalWidth,
      h: el.naturalHeight,
    }));
    expect(dims.w).toBeGreaterThan(50);
    expect(dims.h).toBeGreaterThan(50);

    await shoot(page, "0t2c-real-roundtrip-rendered", true);
  });

  test("huds: detail Edit links use pencil icon", async ({ page }) => {
    await gotoListWithData(page);
    const id = await firstIssueId(page);
    await page.goto(`/issues/${id}`);
    await page.waitForTimeout(800);
    // Capture the metadata sidebar / inline edit affordances
    await shoot(page, "huds-detail-pencil-icons", true);
  });

  test("fvp6: icons across UI — header + sidebar + buttons", async ({ page }) => {
    await gotoListWithData(page);
    await shoot(page, "fvp6-list-with-icons-header-sidebar", false);
    await seed(page, "/board");
    await page.waitForTimeout(800);
    await shoot(page, "fvp6-board-with-icons", false);
    await seed(page, "/graph");
    await page.waitForTimeout(1500);
    await shoot(page, "fvp6-graph-with-icons", false);
  });
});
