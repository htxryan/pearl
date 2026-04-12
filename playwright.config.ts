import { defineConfig, devices } from "@playwright/test";
import { resolve } from "node:path";

const sharedWebServer = [
  {
    command: "pnpm --filter @beads-gui/backend dev",
    url: "http://127.0.0.1:3456/api/health",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    cwd: "./sample-project",
    env: {
      BEADS_DB_PATH: resolve("sample-project/.beads/embeddeddolt/sample_project"),
    },
    stdout: "pipe" as const,
    stderr: "pipe" as const,
  },
  {
    command: "pnpm --filter @beads-gui/frontend dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    stdout: "pipe" as const,
    stderr: "pipe" as const,
  },
];

export default defineConfig({
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [["html", { open: "never" }], ["github"]]
    : [["html", { open: "never" }]],
  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: "http://localhost:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      testDir: "./e2e",
      testIgnore: "**/write-tests/**",
      use: { ...devices["Desktop Chrome"] },
      workers: 1,
    },
    {
      name: "write-tests",
      testDir: "./e2e/write-tests",
      use: { ...devices["Desktop Chrome"] },
      workers: 1,
    },
  ],

  webServer: sharedWebServer,
});
