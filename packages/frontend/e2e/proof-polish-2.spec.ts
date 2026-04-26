import { test, expect } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Drives the running DEV server (port 5173) which has the latest loop output.
// Saves screenshots into the repo's docs/proof/beads-gui-g2c0/ folder so they
// land in the PR/diff alongside the changes.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const APP = "http://localhost:5173";
const PROOF_DIR = path.resolve(__dirname, "..", "..", "..", "docs", "proof", "beads-gui-g2c0");
const ATTACH_ISSUE = "beads-gui-8uah";

test.use({ viewport: { width: 1440, height: 900 } });

const shot = (page: any, name: string) =>
  page.screenshot({ path: path.join(PROOF_DIR, name), fullPage: false });

// Dismiss the onboarding banner if present
const dismissOnboarding = async (page: any) => {
  await page.evaluate(() => {
    localStorage.setItem("pearl:onboarding-completed", "true");
  });
};

const goto = async (page: any, url: string) => {
  await page.addInitScript(() => {
    localStorage.setItem("pearl:onboarding-completed", "true");
  });
  await page.goto(url);
  await page.waitForLoadState("networkidle");
};

test.describe("Polish 2 — proof of 12 closed epics", () => {
  test("g2c0.2 — attachments render on beads-gui-8uah (scrolled to attachments)", async ({
    page,
  }) => {
    await goto(page, `${APP}/list?status=open%2Cin_progress%2Cdeferred%2Cblocked&item=${ATTACH_ISSUE}`);
    // Scroll the ATTACHMENTS heading into view
    const attachHeading = page.getByText(/^ATTACHMENTS/i).first();
    await attachHeading.scrollIntoViewIfNeeded({ timeout: 5000 });
    await page.waitForTimeout(500);
    await shot(page, "g2c0.2-attachments.png");
  });

  test("g2c0.13 — full-page issue modal main content fills width", async ({ page }) => {
    await goto(page, `${APP}/list?status=open%2Cin_progress%2Cdeferred%2Cblocked&item=${ATTACH_ISSUE}`);
    // Switch to modal/fullscreen view
    const switchToModal = page.getByRole("button", { name: /switch to modal view/i }).first();
    await switchToModal.click();
    await page.waitForTimeout(500);
    await shot(page, "g2c0.13-modal-content-width.png");
  });

  test("g2c0.1 — resizable side panel handle visible", async ({ page }) => {
    await goto(page, `${APP}/list?status=open%2Cin_progress%2Cdeferred%2Cblocked&item=${ATTACH_ISSUE}`);
    // Hover near the resize handle (left edge of the panel)
    const handle = page.getByRole("separator", { name: /resize/i }).first();
    if (await handle.count()) {
      await handle.hover();
    }
    await page.waitForTimeout(300);
    await shot(page, "g2c0.1-side-panel-default.png");
  });

  test("g2c0.1 + g2c0.3 — narrow side panel: handle works AND FIELDS don't overflow", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem("pearl:onboarding-completed", "true");
      // Forced narrow panel width
      localStorage.setItem("detailPanel.width", JSON.stringify(360));
    });
    await page.goto(`${APP}/list?status=open%2Cin_progress%2Cdeferred%2Cblocked&item=${ATTACH_ISSUE}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(700);
    await shot(page, "g2c0.1-3-side-panel-narrow.png");
  });

  test("g2c0.4 — labels combobox: clean focus ring + keyboard nav", async ({ page }) => {
    await goto(page, `${APP}/list?status=open%2Cin_progress%2Cdeferred%2Cblocked&item=${ATTACH_ISSUE}`);
    const labelsInput = page.getByPlaceholder(/search.*label/i).first();
    await labelsInput.click();
    await page.waitForTimeout(400);
    await shot(page, "g2c0.4-labels-combobox-open.png");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(300);
    await shot(page, "g2c0.4-labels-combobox-arrow-nav.png");
    await page.keyboard.press("Escape");
  });

  test("g2c0.6 — top-bar Priority filter dropdown anchored to trigger", async ({ page }) => {
    await goto(page, `${APP}/list?status=open%2Cin_progress%2Cdeferred%2Cblocked`);
    // The toolbar trigger has aria-label "Filter by Priority"
    const trigger = page.getByLabel("Filter by Priority").first();
    await trigger.click();
    await page.waitForTimeout(400);
    await shot(page, "g2c0.6-priority-dropdown-anchor.png");
    await page.keyboard.press("Escape");
  });

  test("g2c0.8 — search modal stays inside viewport (default + short)", async ({ page }) => {
    await goto(page, `${APP}/list?status=open%2Cin_progress%2Cdeferred%2Cblocked`);
    await page.keyboard.press("Meta+f");
    await page.waitForTimeout(400);
    await shot(page, "g2c0.8-search-modal-default.png");
    await page.setViewportSize({ width: 1440, height: 600 });
    await page.waitForTimeout(300);
    await shot(page, "g2c0.8-search-modal-short-viewport.png");
    await page.keyboard.press("Escape");
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test("g2c0.11 — board view default sort: newest Modified first", async ({ page }) => {
    await goto(page, `${APP}/board?status=open%2Cin_progress%2Cdeferred%2Cblocked`);
    await page.waitForTimeout(500);
    await shot(page, "g2c0.11-board-default.png");
    // Open the column-sort dropdown on the Open column
    const openColumnSort = page.getByRole("button", { name: /^modified/i }).first();
    if (await openColumnSort.count()) {
      await openColumnSort.click();
      await page.waitForTimeout(400);
      await shot(page, "g2c0.11-board-sort-menu.png");
      await page.keyboard.press("Escape");
    }
  });

  test("g2c0.5 — date picker chevrons no longer overlap input (FIELDS Set date)", async ({
    page,
  }) => {
    await goto(page, `${APP}/list?status=open%2Cin_progress%2Cdeferred%2Cblocked&item=${ATTACH_ISSUE}`);
    // Click the Set date trigger inside the FIELDS panel (button containing "Set date")
    const setDate = page.locator("button", { hasText: /^Set date$/i }).first();
    await setDate.click();
    await page.waitForTimeout(500);
    await shot(page, "g2c0.5-date-picker-open.png");
    await page.keyboard.press("Escape");
  });

  test("g2c0.9 — Create Issue modal width + textarea height", async ({ page }) => {
    await goto(page, `${APP}/list?status=open%2Cin_progress%2Cdeferred%2Cblocked`);
    const createBtn = page.getByRole("button", { name: /^create issue$/i }).first();
    await createBtn.click();
    await page.waitForTimeout(500);
    await shot(page, "g2c0.9-create-issue-modal.png");
    await page.keyboard.press("Escape");
  });

  test("g2c0.10 — toast on issue create with linkable BeadId", async ({ page }) => {
    await goto(page, `${APP}/list?status=open%2Cin_progress%2Cdeferred%2Cblocked`);
    const createBtn = page.getByRole("button", { name: /^create issue$/i }).first();
    await createBtn.click();
    await page.waitForTimeout(400);
    const titleInput = page.getByRole("textbox", { name: /title/i }).first();
    await titleInput.fill(`Proof-it test issue ${Date.now()}`);
    const submit = page.getByRole("button", { name: /^create issue$/i }).last();
    await submit.click();
    await page.waitForTimeout(1500);
    await shot(page, "g2c0.10-toast-on-create.png");
  });

  test("g2c0.12 — list view default column order: ID, Type, Title, Status", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("pearl:onboarding-completed", "true");
      // Clear any persisted column-order/visibility state
      Object.keys(localStorage)
        .filter((k) => k.toLowerCase().includes("column"))
        .forEach((k) => localStorage.removeItem(k));
    });
    await page.goto(`${APP}/list?status=open%2Cin_progress%2Cdeferred%2Cblocked`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(400);
    await shot(page, "g2c0.12-list-column-order.png");
  });
});
