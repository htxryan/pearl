import { defineConfig, devices } from "@playwright/test";

// Stripped-down config for the Polish 2 proof spec. Hits the running dev
// server on :5173 directly — no webServer auto-start, no build step.

export default defineConfig({
  testDir: "./e2e",
  testMatch: /proof-polish-2\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:5173",
    trace: "off",
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
});
