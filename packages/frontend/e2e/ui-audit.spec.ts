import { test, expect } from "@playwright/test";

const VIEWPORTS = [
  { name: "mobile", width: 320, height: 568 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "laptop", width: 1280, height: 720 },
  { name: "desktop", width: 1920, height: 1080 },
  { name: "ultrawide", width: 2560, height: 1080 },
] as const;

const AUDIT_DIR = "e2e/audit-screenshots";

test.describe("UI Audit — Showcase Primitives", () => {
  for (const vp of VIEWPORTS) {
    test(`showcase full page @ ${vp.name} (${vp.width}px)`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/__showcase");
      await page.waitForSelector('[data-testid="primitive-showcase"]');
      await page.waitForTimeout(500);
      await page.screenshot({
        path: `${AUDIT_DIR}/showcase-full-${vp.name}.png`,
        fullPage: true,
      });
    });
  }

  const showcaseSections = [
    "showcase-button",
    "showcase-badge",
    "showcase-avatar",
    "showcase-card",
    "showcase-input-textarea",
    "showcase-skeleton",
    "showcase-tooltip",
    "showcase-status-badge",
    "showcase-priority-indicator",
    "showcase-type-pill",
    "showcase-label-badge",
    "showcase-empty-state",
    "showcase-toast",
    "showcase-overlays",
    "showcase-sidebar",
  ];

  for (const section of showcaseSections) {
    test(`showcase section: ${section} @ laptop`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto("/__showcase");
      await page.waitForSelector('[data-testid="primitive-showcase"]');
      const el = page.locator(`[data-testid="${section}"]`);
      await el.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await el.screenshot({
        path: `${AUDIT_DIR}/section-${section}.png`,
      });
    });

    test(`showcase section: ${section} @ mobile`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 568 });
      await page.goto("/__showcase");
      await page.waitForSelector('[data-testid="primitive-showcase"]');
      const el = page.locator(`[data-testid="${section}"]`);
      await el.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await el.screenshot({
        path: `${AUDIT_DIR}/section-${section}-mobile.png`,
      });
    });
  }
});

test.describe("UI Audit — App Pages", () => {
  for (const vp of VIEWPORTS) {
    test(`list view @ ${vp.name} (${vp.width}px)`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/list");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: `${AUDIT_DIR}/list-${vp.name}.png`,
        fullPage: true,
      });
    });

    test(`board view @ ${vp.name} (${vp.width}px)`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/board");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: `${AUDIT_DIR}/board-${vp.name}.png`,
        fullPage: true,
      });
    });

    test(`graph view @ ${vp.name} (${vp.width}px)`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/graph");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1500);
      await page.screenshot({
        path: `${AUDIT_DIR}/graph-${vp.name}.png`,
        fullPage: true,
      });
    });

    test(`settings view @ ${vp.name} (${vp.width}px)`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/settings");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);
      await page.screenshot({
        path: `${AUDIT_DIR}/settings-${vp.name}.png`,
        fullPage: true,
      });
    });

    test(`404 view @ ${vp.name} (${vp.width}px)`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/nonexistent-page");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);
      await page.screenshot({
        path: `${AUDIT_DIR}/404-${vp.name}.png`,
        fullPage: true,
      });
    });
  }
});

test.describe("UI Audit — Detail View", () => {
  test("navigate to first issue detail", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/list");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const dataRow = page.locator(
      'tbody tr:has(input[type="checkbox"][aria-label])'
    );
    const firstRow = dataRow.first();
    if ((await firstRow.count()) > 0) {
      await firstRow.click();
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: `${AUDIT_DIR}/detail-modal-laptop.png`,
        fullPage: true,
      });
    }
  });

  for (const vp of [VIEWPORTS[0], VIEWPORTS[2], VIEWPORTS[4]]) {
    test(`detail page direct nav @ ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/list");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);

      const dataRow = page.locator(
        'tbody tr:has(input[type="checkbox"][aria-label])'
      );
      const firstRow = dataRow.first();
      if ((await firstRow.count()) > 0) {
        const beadIdCell = firstRow.locator("td").first();
        const beadIdText = await beadIdCell.textContent();
        if (beadIdText) {
          const id = beadIdText.trim();
          await page.goto(`/issues/${id}`);
          await page.waitForLoadState("networkidle");
          await page.waitForTimeout(1000);
          await page.screenshot({
            path: `${AUDIT_DIR}/detail-fullpage-${vp.name}.png`,
            fullPage: true,
          });
        }
      }
    });
  }
});

test.describe("UI Audit — Interactive States", () => {
  test("filter bar interactions @ laptop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/list");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const filterInput = page.locator(
      'input[placeholder*="Filter"], input[placeholder*="Search"], input[type="search"]'
    );
    if ((await filterInput.count()) > 0) {
      await filterInput.first().click();
      await page.waitForTimeout(300);
      await page.screenshot({
        path: `${AUDIT_DIR}/filter-bar-focused.png`,
      });
    }
  });

  test("sidebar collapsed @ laptop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/list");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const sidebarToggle = page.locator(
      '[data-testid="sidebar-toggle"], button[aria-label*="sidebar"], button[aria-label*="Sidebar"]'
    );
    if ((await sidebarToggle.count()) > 0) {
      await sidebarToggle.first().click();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: `${AUDIT_DIR}/sidebar-collapsed.png`,
        fullPage: true,
      });
    }
  });

  test("command palette @ laptop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/list");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    await page.keyboard.press("Meta+k");
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `${AUDIT_DIR}/command-palette.png`,
    });
  });
});

test.describe("UI Audit — Showcase Overlay States", () => {
  test("dialog open @ laptop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/__showcase");
    await page.waitForSelector('[data-testid="primitive-showcase"]');

    await page.locator('[data-testid="dialog-trigger"]').click();
    await page.waitForTimeout(300);
    await page.screenshot({
      path: `${AUDIT_DIR}/dialog-open.png`,
    });
  });

  test("dropdown open @ laptop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/__showcase");
    await page.waitForSelector('[data-testid="primitive-showcase"]');

    await page.locator('[data-testid="dropdown-trigger"]').click();
    await page.waitForTimeout(300);
    await page.screenshot({
      path: `${AUDIT_DIR}/dropdown-open.png`,
    });
  });

  test("toast variants @ laptop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/__showcase");
    await page.waitForSelector('[data-testid="primitive-showcase"]');

    for (const variant of ["success", "error", "warning", "info", "loading"]) {
      await page.locator(`[data-testid="toast-${variant}"]`).click();
      await page.waitForTimeout(200);
    }
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `${AUDIT_DIR}/toasts-all.png`,
    });
  });
});
