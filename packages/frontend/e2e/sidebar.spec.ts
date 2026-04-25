import { test, expect } from "./fixtures";

test.describe("Sidebar — desktop collapse + cookie persistence", () => {
  test("toggle button collapses and expands sidebar", async ({ page }) => {
    const toggle = page.getByTestId("sidebar-demo-toggle");
    await toggle.scrollIntoViewIfNeeded();

    const title = page.getByTestId("sidebar-demo-title");
    await expect(title).toHaveText("Expanded");

    await toggle.click();
    await expect(title).toHaveText("Collapsed");

    await toggle.click();
    await expect(title).toHaveText("Expanded");
  });

  test("collapse state persists in cookie on toggle", async ({ page }) => {
    const toggle = page.getByTestId("sidebar-demo-toggle");
    await toggle.scrollIntoViewIfNeeded();

    await toggle.click();
    await expect(page.getByTestId("sidebar-demo-title")).toHaveText("Collapsed");

    const cookies = await page.context().cookies();
    const sidebarCookie = cookies.find((c) => c.name === "sidebar:state");
    expect(sidebarCookie).toBeDefined();
    expect(sidebarCookie!.value).toBe("false");
  });
});
