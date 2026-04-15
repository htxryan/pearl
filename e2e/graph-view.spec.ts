import { test, expect } from "./fixtures";

// React Flow controls/minimap require WebGL which headless Chrome in CI
// doesn't always provide. Skip control-dependent tests in CI.
const skipInCI = !!process.env.CI;

test.describe("Graph View", () => {
  test("renders the dependency graph canvas", async ({ seededPage: page }) => {
    await page.goto("/graph");
    const reactFlow = page.locator(".react-flow");
    await expect(reactFlow).toBeVisible({ timeout: 15_000 });
  });

  test("shows graph controls (zoom/pan)", async ({ seededPage: page }) => {
    test.skip(skipInCI, "React Flow controls need WebGL unavailable in headless CI");
    await page.goto("/graph");
    await expect(page.locator(".react-flow")).toBeVisible({ timeout: 15_000 });

    const controls = page.locator(".react-flow__controls");
    await expect(controls).toBeVisible({ timeout: 10_000 });
  });

  test("shows minimap", async ({ seededPage: page }) => {
    test.skip(skipInCI, "React Flow minimap needs WebGL unavailable in headless CI");
    await page.goto("/graph");
    await expect(page.locator(".react-flow")).toBeVisible({ timeout: 15_000 });

    const minimap = page.locator(".react-flow__minimap");
    await expect(minimap).toBeVisible();
  });

  test("shows legend panel", async ({ seededPage: page }) => {
    test.skip(skipInCI, "React Flow legend depends on controls rendering");
    await page.goto("/graph");
    await expect(page.locator(".react-flow")).toBeVisible({ timeout: 15_000 });

    await expect(page.getByText("blocks")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("depends on")).toBeVisible({ timeout: 10_000 });
  });

  test("auto layout button is functional", async ({ seededPage: page }) => {
    await page.goto("/graph");
    await expect(page.locator(".react-flow")).toBeVisible({ timeout: 15_000 });

    const autoLayoutBtn = page.getByRole("button", { name: /auto layout/i });
    await expect(autoLayoutBtn).toBeVisible();
    await autoLayoutBtn.click();

    // Graph remains visible after layout
    await expect(page.locator(".react-flow")).toBeVisible();
  });

  test("filter bar present on graph view", async ({ seededPage: page }) => {
    await page.goto("/graph");
    await expect(page.locator(".react-flow")).toBeVisible({ timeout: 15_000 });

    const searchInput = page.getByPlaceholder(/search/i).first();
    await expect(searchInput).toBeVisible();
  });

  test("zoom in/out controls work", async ({ seededPage: page }) => {
    test.skip(skipInCI, "React Flow controls need WebGL unavailable in headless CI");
    await page.goto("/graph");
    await expect(page.locator(".react-flow")).toBeVisible({ timeout: 15_000 });

    const zoomIn = page.locator(".react-flow__controls-zoomin");
    const zoomOut = page.locator(".react-flow__controls-zoomout");

    await expect(zoomIn).toBeVisible({ timeout: 10_000 });
    await expect(zoomOut).toBeVisible({ timeout: 10_000 });
    await zoomIn.click();
    await zoomOut.click();
  });

  test("graph renders nodes for issues", async ({ seededPage: page }) => {
    await page.goto("/graph");
    await expect(page.locator(".react-flow")).toBeVisible({ timeout: 15_000 });

    // ReactFlow renders nodes
    const nodes = page.locator(".react-flow__node");
    await expect(nodes.first()).toBeVisible({ timeout: 10_000 });
  });
});
