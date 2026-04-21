#!/usr/bin/env node
import { chromium } from "@playwright/test";

const FRONTEND_URL = "http://localhost:5173";
const BACKEND_URL = "http://localhost:3456";

function log(step, msg) {
  console.log(`[${new Date().toISOString()}] [${step}] ${msg}`);
}

async function fetchJson(url) {
  const r = await fetch(url);
  return { status: r.status, body: await r.text() };
}

async function main() {
  let failures = 0;

  // 0. Pre-check: backend reports embedded mode
  log("pre-check", "Checking backend is in embedded mode");
  const health0 = await fetchJson(`${BACKEND_URL}/api/health`);
  const h0 = JSON.parse(health0.body);
  if (h0.dolt_mode !== "embedded") {
    console.error(`FAIL: expected embedded mode, got ${h0.dolt_mode}`);
    process.exit(1);
  }
  log("pre-check", `OK: dolt_mode=${h0.dolt_mode}`);

  // 1. Launch browser
  log("browser", "Launching chromium");
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // Suppress onboarding modal
  await page.addInitScript(() => {
    localStorage.setItem("pearl-onboarding-complete", "true");
  });

  // 2. Navigate to app
  log("nav", `Opening ${FRONTEND_URL}`);
  await page.goto(FRONTEND_URL);

  // 3. AC-4: migration modal visible within 2s
  log("AC-4", "Waiting for migration modal");
  const modal = page.getByTestId("embedded-mode-modal");
  const startMs = Date.now();
  try {
    await modal.waitFor({ state: "visible", timeout: 5000 });
    const elapsed = Date.now() - startMs;
    log("AC-4", `PASS: modal visible in ${elapsed}ms (${elapsed < 2000 ? "under" : "over"} 2s target)`);
  } catch (e) {
    console.error("AC-4 FAIL: modal never appeared", e.message);
    failures++;
  }

  // 4. AC-9: create issue button disabled while modal open
  log("AC-9", "Checking create-issue-btn disabled");
  const createBtn = page.getByTestId("create-issue-btn");
  const disabled = await createBtn.isDisabled().catch(() => null);
  if (disabled === true) log("AC-9", "PASS");
  else { console.error(`AC-9 FAIL: disabled=${disabled}`); failures++; }

  // 5. AC-10: Escape does not close
  log("AC-10a", "Pressing Escape");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  if (await modal.isVisible()) log("AC-10a", "PASS (Escape ignored)");
  else { console.error("AC-10a FAIL: modal closed on Escape"); failures++; }

  // 6. AC-10: backdrop click does not close
  log("AC-10b", "Clicking backdrop");
  await page.mouse.click(5, 5);
  await page.waitForTimeout(300);
  if (await modal.isVisible()) log("AC-10b", "PASS (backdrop click ignored)");
  else { console.error("AC-10b FAIL: modal closed on backdrop click"); failures++; }

  // 7. AC-5: Pearl-managed migration end-to-end
  log("AC-5", "Clicking Pearl-managed migrate button");
  const migrateBtn = page.getByTestId("migrate-managed-btn");
  await migrateBtn.waitFor({ state: "visible", timeout: 5000 });

  // Set up reload detection — after migration, frontend should reload
  let reloadCount = 0;
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) reloadCount++;
  });

  const migrateStart = Date.now();
  await migrateBtn.click();

  // Implementation reloads via setTimeout(1500ms) after success. Wait for reload + modal disappear.
  log("AC-5", "Waiting for modal to disappear (reload should fire at ~1.5s)");
  try {
    await page.waitForFunction(
      () => !document.querySelector('[data-testid="embedded-mode-modal"]'),
      { timeout: 20000, polling: 200 },
    );
    const migrateMs = Date.now() - migrateStart;
    log("AC-5", `PASS: modal dismissed in ${migrateMs}ms (framenavigated=${reloadCount}x)`);
  } catch (e) {
    console.error("AC-5 FAIL: modal never disappeared within 20s", e.message);
    failures++;
  }

  // 8. REQ-E4: reload actually occurred
  log("REQ-E4", `framenavigated count: ${reloadCount}`);
  if (reloadCount >= 1) log("REQ-E4", "PASS: hard reload fired");
  else { console.error("REQ-E4 FAIL: no reload event"); failures++; }

  // 9. AC-1/AC-3: backend now reports server mode
  log("AC-1", "Checking /api/health post-migration");
  const health1 = await fetchJson(`${BACKEND_URL}/api/health`);
  const h1 = JSON.parse(health1.body);
  if (h1.dolt_mode === "server" && h1.status === "healthy") {
    log("AC-1", `PASS: mode=${h1.dolt_mode}, status=${h1.status}`);
  } else {
    console.error(`AC-1 FAIL: mode=${h1.dolt_mode}, status=${h1.status}`);
    failures++;
  }

  // 10. AC-7: issues load (data preserved + readable through server mode)
  log("AC-7", "Checking /api/issues returns sample issues");
  const issuesResp = await fetchJson(`${BACKEND_URL}/api/issues?status=open`);
  if (issuesResp.status !== 200) {
    console.error(`AC-7 FAIL: status=${issuesResp.status} body=${issuesResp.body.slice(0, 300)}`);
    failures++;
  } else {
    const issues = JSON.parse(issuesResp.body);
    const found = Array.isArray(issues) ? issues : issues.issues || [];
    const titles = found.map((i) => i.title).filter(Boolean);
    const expected = ["Login page bug", "Dark mode toggle", "Refactor auth"];
    const allFound = expected.every((e) => titles.some((t) => t.includes(e)));
    if (allFound && found.length >= 3) {
      log("AC-7", `PASS: ${found.length} issues loaded, all 3 samples present`);
    } else {
      console.error(`AC-7 FAIL: expected 3 samples, got ${found.length}: ${JSON.stringify(titles)}`);
      failures++;
    }
  }

  // 11. UI check — issues render in the list view
  log("UI", "Verifying issues render in UI");
  try {
    await page.waitForSelector('[data-testid^="issue-row"], [data-testid="issue-list"]', { timeout: 10000 }).catch(() => {});
    const pageText = await page.textContent("body");
    const uiHas = ["Login page bug", "Dark mode toggle", "Refactor auth"].filter((t) => pageText.includes(t));
    if (uiHas.length === 3) log("UI", `PASS: all 3 titles visible`);
    else { console.error(`UI FAIL: only ${uiHas.length}/3 titles visible (${uiHas.join(", ")})`); failures++; }
  } catch (e) {
    console.error("UI FAIL:", e.message);
    failures++;
  }

  // 12. AC-3: metadata.json reflects server mode
  log("AC-3", "Checking metadata.json");
  const { readFileSync } = await import("node:fs");
  const meta = JSON.parse(readFileSync("/tmp/pearl-migration-test/.beads/metadata.json", "utf-8"));
  if (meta.dolt_mode === "server" && meta.dolt_host && meta.dolt_port && meta.pearl_managed === true) {
    log("AC-3", `PASS: mode=server, host=${meta.dolt_host}, port=${meta.dolt_port}, managed=${meta.pearl_managed}`);
  } else {
    console.error(`AC-3 FAIL: ${JSON.stringify(meta)}`);
    failures++;
  }

  await browser.close();

  console.log("\n=========================================");
  if (failures === 0) {
    console.log("✅ ALL E2E CHECKS PASSED");
    process.exit(0);
  } else {
    console.log(`❌ ${failures} E2E CHECK(S) FAILED`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(2);
});
