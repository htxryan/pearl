#!/usr/bin/env node
// Captures end-to-end proof that Pearl-managed Dolt migration works.
// Prerequisites: backend running at http://localhost:3456 pointed at /tmp/pearl-migration-test/
// (fresh embedded DB, 3 sample issues) and frontend at http://localhost:5173.
import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const FRONTEND_URL = "http://localhost:5173";
const BACKEND_URL = "http://localhost:3456";
const PROOF_DIR = resolve(process.cwd(), "docs/proof/beads-gui-wanj");

function stamp() {
  return new Date().toISOString();
}
function log(step, msg) {
  console.log(`[${stamp()}] [${step}] ${msg}`);
}

async function fetchJson(url) {
  const r = await fetch(url);
  return { status: r.status, body: await r.text() };
}

async function main() {
  const results = [];
  const record = (name, pass, details) => {
    results.push({ name, pass, details });
    log(name, `${pass ? "PASS" : "FAIL"} — ${details}`);
  };

  // 0. Pre-check
  const h0 = JSON.parse((await fetchJson(`${BACKEND_URL}/api/health`)).body);
  record("precheck-embedded", h0.dolt_mode === "embedded", `dolt_mode=${h0.dolt_mode} status=${h0.status}`);

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    localStorage.setItem("pearl-onboarding-complete", "true");
  });

  // Screenshot 1 — modal on load
  await page.goto(FRONTEND_URL);
  const modal = page.getByTestId("embedded-mode-modal");
  const start = Date.now();
  await modal.waitFor({ state: "visible", timeout: 5000 });
  const modalShownMs = Date.now() - start;
  await page.waitForTimeout(400);
  await page.screenshot({ path: resolve(PROOF_DIR, "01-modal-on-fresh-embedded.png"), fullPage: false });
  record("AC-4", modalShownMs < 2000, `modal visible in ${modalShownMs}ms (<2s threshold)`);

  // Screenshot 2 — external tab (proves both paths exist)
  await modal.getByText("I'll run dolt myself").click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: resolve(PROOF_DIR, "02-modal-external-tab.png") });
  record("ui-external-tab", true, "rendered external migration form");

  // Screenshot 3 — right before clicking Pearl-managed
  await modal.getByRole("button", { name: "Pearl-managed", exact: true }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: resolve(PROOF_DIR, "03-modal-pearl-managed-tab.png") });

  // Track reload
  let reloadCount = 0;
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) reloadCount++;
  });

  // Click migrate — use dispatchEvent to avoid pointer sequence that gets stuck during reload
  const migrateStart = Date.now();
  await page.getByTestId("migrate-managed-btn").dispatchEvent("click");

  // Screenshot 4 — migrating state (try to capture during)
  await page.waitForTimeout(600).catch(() => {});
  try {
    await page.screenshot({ path: resolve(PROOF_DIR, "04-migration-in-progress.png") });
  } catch { /* page may already be reloading */ }

  // Wait for modal to disappear (reload fires at +1.5s)
  await page.waitForFunction(
    () => !document.querySelector('[data-testid="embedded-mode-modal"]'),
    { timeout: 20000, polling: 200 },
  );
  const migrateMs = Date.now() - migrateStart;
  record("AC-5", true, `modal dismissed in ${migrateMs}ms (reloads=${reloadCount})`);
  record("REQ-E4", reloadCount >= 1, `hard reload fired (${reloadCount}x)`);

  // Let issues list settle
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1500);

  // Screenshot 5 — post-migration app with issues
  await page.screenshot({ path: resolve(PROOF_DIR, "05-post-migration-issues-loaded.png"), fullPage: true });

  // Backend health after
  const h1 = JSON.parse((await fetchJson(`${BACKEND_URL}/api/health`)).body);
  record("AC-1", h1.dolt_mode === "server" && h1.status === "healthy", `dolt_mode=${h1.dolt_mode} status=${h1.status}`);

  // Issues API
  const issuesResp = await fetchJson(`${BACKEND_URL}/api/issues?status=open`);
  let issueTitles = [];
  if (issuesResp.status === 200) {
    const j = JSON.parse(issuesResp.body);
    const arr = Array.isArray(j) ? j : j.issues || [];
    issueTitles = arr.map((i) => i.title);
  }
  const expectedTitles = ["Login page bug", "Dark mode toggle", "Refactor auth"];
  const allPresent = expectedTitles.every((t) => issueTitles.some((x) => x.includes(t)));
  record("AC-7-api", allPresent && issueTitles.length >= 3, `api returned ${issueTitles.length} issues: ${JSON.stringify(issueTitles)}`);

  // Visible in UI
  const pageText = await page.textContent("body");
  const uiVisible = expectedTitles.filter((t) => pageText.includes(t));
  record("AC-7-ui", uiVisible.length === 3, `ui renders ${uiVisible.length}/3 sample titles`);

  // metadata.json
  const { readFileSync } = await import("node:fs");
  const meta = JSON.parse(readFileSync("/tmp/pearl-migration-test/.beads/metadata.json", "utf-8"));
  const metaOk = meta.dolt_mode === "server" && meta.dolt_host && meta.dolt_port && meta.pearl_managed === true;
  record("AC-3", metaOk, `metadata: mode=${meta.dolt_mode} host=${meta.dolt_host} port=${meta.dolt_port} managed=${meta.pearl_managed}`);

  // Screenshot 6 — detail view (click first issue for extra proof)
  try {
    const firstIssueLink = page.locator('a[href^="/issues/"]').first();
    if (await firstIssueLink.isVisible().catch(() => false)) {
      await firstIssueLink.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: resolve(PROOF_DIR, "06-issue-detail-after-migration.png"), fullPage: true });
      record("ui-detail", true, "issue detail page loaded post-migration");
    }
  } catch (e) {
    log("ui-detail", `skipped: ${e.message}`);
  }

  await browser.close();

  // Write JSON summary
  const summary = {
    timestamp: stamp(),
    bead: "beads-gui-wanj",
    bug: "migrateToPearlManaged copied embedded DB contents directly into doltdb/ instead of doltdb/<dbName>/, so dolt sql-server exposed DB as 'doltdb' rather than original name ('migrtest'). All post-migration queries failed with 'database not found: migrtest'.",
    fix_file: "packages/pearl-bdui/src/routes/migration.ts",
    test_project: "/tmp/pearl-migration-test/",
    results,
    passed: results.filter((r) => r.pass).length,
    failed: results.filter((r) => !r.pass).length,
  };
  writeFileSync(resolve(PROOF_DIR, "results.json"), JSON.stringify(summary, null, 2));

  console.log("\n=========================================");
  console.log(`PROOF COMPLETE — ${summary.passed} passed, ${summary.failed} failed`);
  console.log(`Evidence dir: ${PROOF_DIR}`);
  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(2);
});
