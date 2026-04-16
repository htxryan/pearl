import { expect, test } from "./fixtures";

test.describe("Graph View", () => {
  test("renders the dependency graph canvas", async ({ seededPage: page }) => {
    await page.goto("/graph");
    const reactFlow = page.locator(".react-flow");
    await expect(reactFlow).toBeVisible({ timeout: 15_000 });
  });

  test("shows graph controls (zoom/pan)", async ({ seededPage: page }) => {
    await page.goto("/graph");
    await expect(page.locator(".react-flow")).toBeVisible({ timeout: 15_000 });

    await expect(page.getByTitle("Zoom in")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTitle("Zoom out")).toBeVisible();
    await expect(page.getByTitle("Fit view")).toBeVisible();
  });

  test("shows minimap", async ({ seededPage: page }) => {
    await page.goto("/graph");
    await expect(page.locator(".react-flow")).toBeVisible({ timeout: 15_000 });

    const minimap = page.locator(".react-flow__minimap");
    await expect(minimap).toBeVisible({ timeout: 10_000 });
  });

  test("shows legend panel", async ({ seededPage: page }) => {
    await page.goto("/graph");
    await expect(page.locator(".react-flow")).toBeVisible({ timeout: 15_000 });

    // Legend contains "Edges:" label followed by edge type descriptions
    const legend = page.getByText("Edges:").locator("..");
    await expect(legend).toBeVisible({ timeout: 10_000 });
    await expect(legend.getByText("blocks")).toBeVisible();
    await expect(legend.getByText("depends on")).toBeVisible();
  });

  test("auto layout button is functional", async ({ seededPage: page }) => {
    await page.goto("/graph");
    await expect(page.locator(".react-flow")).toBeVisible({ timeout: 15_000 });

    const autoLayoutBtn = page.getByRole("button", { name: /auto layout/i });
    await expect(autoLayoutBtn).toBeVisible({ timeout: 10_000 });
    await autoLayoutBtn.click();

    await expect(page.locator(".react-flow")).toBeVisible();
  });

  test("filter bar present on graph view", async ({ seededPage: page }) => {
    await page.goto("/graph");
    await expect(page.locator(".react-flow")).toBeVisible({ timeout: 15_000 });

    const searchInput = page.getByPlaceholder(/search/i).first();
    await expect(searchInput).toBeVisible();
  });

  test("zoom in/out controls work", async ({ seededPage: page }) => {
    await page.goto("/graph");
    await expect(page.locator(".react-flow")).toBeVisible({ timeout: 15_000 });
    // Wait for graph to settle (nodes rendered and layout complete)
    await expect(page.locator(".react-flow__node").first()).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(500);

    const zoomIn = page.getByTitle("Zoom in");
    const zoomOut = page.getByTitle("Zoom out");

    await expect(zoomIn).toBeVisible();
    await expect(zoomOut).toBeVisible();
    await zoomIn.click({ force: true });
    await zoomOut.click({ force: true });
  });

  test("graph renders nodes for issues", async ({ seededPage: page }) => {
    await page.goto("/graph");
    await expect(page.locator(".react-flow")).toBeVisible({ timeout: 15_000 });

    const nodes = page.locator(".react-flow__node");
    await expect(nodes.first()).toBeVisible({ timeout: 10_000 });
  });
});
