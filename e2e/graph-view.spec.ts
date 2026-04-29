import { expect, test } from "./fixtures";

async function navigateToGraph(page: import("@playwright/test").Page) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.goto("/graph");
    const reactFlow = page.locator(".react-flow");
    const errorHeading = page.getByRole("heading", { name: "Something went wrong" });
    const winner = await Promise.race([
      reactFlow
        .waitFor({ state: "visible", timeout: 15_000 })
        .then(() => "ok" as const)
        .catch(() => "timeout" as const),
      errorHeading
        .waitFor({ state: "visible", timeout: 15_000 })
        .then(() => "error" as const)
        .catch(() => "timeout" as const),
    ]);
    if (winner === "ok") return;
  }
  throw new Error("Graph view failed to load after 3 attempts");
}

test.describe("Graph View", () => {
  test("renders the dependency graph canvas", async ({ seededPage: page }) => {
    await navigateToGraph(page);
  });

  test("shows graph controls (zoom/pan)", async ({ seededPage: page }) => {
    await navigateToGraph(page);

    await expect(page.getByLabel("Zoom in")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByLabel("Zoom out")).toBeVisible();
    await expect(page.getByLabel("Fit view")).toBeVisible();
  });

  test("shows minimap", async ({ seededPage: page }) => {
    await navigateToGraph(page);

    const minimap = page.locator(".react-flow__minimap");
    await expect(minimap).toBeVisible({ timeout: 10_000 });
  });

  test("shows legend panel", async ({ seededPage: page }) => {
    await navigateToGraph(page);

    // Legend contains "Edges:" label followed by edge type descriptions
    const legend = page.getByText("Edges:").locator("..");
    await expect(legend).toBeVisible({ timeout: 10_000 });
    await expect(legend.getByText("blocks")).toBeVisible();
    await expect(legend.getByText("depends on")).toBeVisible();
  });

  test("auto layout button is functional", async ({ seededPage: page }) => {
    await navigateToGraph(page);

    const autoLayoutBtn = page.getByRole("button", { name: /auto layout/i });
    await expect(autoLayoutBtn).toBeVisible({ timeout: 10_000 });
    await autoLayoutBtn.click();

    await expect(page.locator(".react-flow")).toBeVisible();
  });

  test("filter bar present on graph view", async ({ seededPage: page }) => {
    await navigateToGraph(page);

    const searchInput = page.getByPlaceholder(/search/i).first();
    await expect(searchInput).toBeVisible();
  });

  test("zoom in/out controls work", async ({ seededPage: page }) => {
    await navigateToGraph(page);
    // Wait for graph to settle (nodes rendered and layout complete)
    await expect(page.locator(".react-flow__node").first()).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(500);

    const zoomIn = page.getByLabel("Zoom in");
    const zoomOut = page.getByLabel("Zoom out");

    await expect(zoomIn).toBeVisible();
    await expect(zoomOut).toBeVisible();
    await zoomIn.click({ force: true });
    await zoomOut.click({ force: true });
  });

  test("graph renders nodes for issues", async ({ seededPage: page }) => {
    await navigateToGraph(page);

    const nodes = page.locator(".react-flow__node");
    await expect(nodes.first()).toBeVisible({ timeout: 10_000 });
  });
});
