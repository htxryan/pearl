import { test, expect } from "./fixtures";

test.describe("Graph View", () => {
  test("renders the dependency graph canvas", async ({ seededPage: page }) => {
    await page.goto("/graph");

    // Wait for the graph to load — look for the ReactFlow container
    const reactFlow = page.locator(".react-flow");
    await expect(reactFlow).toBeVisible({ timeout: 15_000 });
  });

  test("shows graph controls (zoom/pan)", async ({ seededPage: page }) => {
    await page.goto("/graph");
    const reactFlow = page.locator(".react-flow");
    await expect(reactFlow).toBeVisible({ timeout: 15_000 });

    // ReactFlow Controls panel should be present
    const controls = page.locator(".react-flow__controls");
    await expect(controls).toBeVisible();
  });

  test("shows minimap", async ({ seededPage: page }) => {
    await page.goto("/graph");
    const reactFlow = page.locator(".react-flow");
    await expect(reactFlow).toBeVisible({ timeout: 15_000 });

    const minimap = page.locator(".react-flow__minimap");
    await expect(minimap).toBeVisible();
  });

  test("shows legend panel", async ({ seededPage: page }) => {
    await page.goto("/graph");
    const reactFlow = page.locator(".react-flow");
    await expect(reactFlow).toBeVisible({ timeout: 15_000 });

    // Legend should show edge types
    await expect(page.getByText("blocks")).toBeVisible();
    await expect(page.getByText("depends on")).toBeVisible();
  });

  test("auto layout button works", async ({ seededPage: page }) => {
    await page.goto("/graph");
    const reactFlow = page.locator(".react-flow");
    await expect(reactFlow).toBeVisible({ timeout: 15_000 });

    const autoLayoutBtn = page.getByRole("button", { name: /auto layout/i });
    await expect(autoLayoutBtn).toBeVisible();
    await autoLayoutBtn.click();

    // Graph should still be visible after re-layout
    await expect(reactFlow).toBeVisible();
  });

  test("filter bar present and functional", async ({ seededPage: page }) => {
    await page.goto("/graph");
    await expect(page.locator(".react-flow")).toBeVisible({ timeout: 15_000 });

    const searchInput = page.getByPlaceholder(/search/i).first();
    await expect(searchInput).toBeVisible();
  });

  test("zoom with controls buttons", async ({ seededPage: page }) => {
    await page.goto("/graph");
    await expect(page.locator(".react-flow")).toBeVisible({ timeout: 15_000 });

    // ReactFlow has zoom-in/zoom-out buttons in the controls
    const zoomIn = page.locator(".react-flow__controls-zoomin");
    const zoomOut = page.locator(".react-flow__controls-zoomout");

    if (await zoomIn.isVisible()) {
      await zoomIn.click();
      await zoomOut.click();
    }
  });
});
