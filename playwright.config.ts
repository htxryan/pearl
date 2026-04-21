import { defineConfig, devices } from "@playwright/test";
import { resolve } from "node:path";

// Backend runs in embedded mode (auto-detected from sample-project/.beads/metadata.json).
// Writes go to the primary DB via bd CLI; reads come from a replica that syncs after each write.
const sharedWebServer = [
  {
    command: "pnpm --filter pearl-bdui dev",
    url: "http://127.0.0.1:3456/api/health",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    cwd: "./sample-project",
    env: {
      BEADS_DB_PATH: resolve("sample-project/.beads/embeddeddolt/sample_project"),
      // Must match `database` field in sample-project/.beads/metadata.json
      DOLT_DATABASE: "sample_project",
    },
    stdout: "pipe" as const,
    stderr: "pipe" as const,
  },
  {
    command: "pnpm --filter @pearl/frontend dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    stdout: "pipe" as const,
    stderr: "pipe" as const,
  },
];

export default defineConfig({
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [["html", { open: "never" }], ["github"]]
    : [["html", { open: "never" }]],
  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: "http://localhost:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: process.env.CI ? "off" : "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      testDir: "./e2e",
      testIgnore: [
        "**/write-tests/**",
        "**/*-proof.spec.ts",
        // 7qf proof-gaps fixture targets beads-gui-7qf, which only exists in
        // the author's dev DB — not in sample_project. Excluded from CI.
        "**/7qf-proof-gaps.spec.ts",
      ],
      use: { ...devices["Desktop Chrome"] },
      workers: process.env.CI ? 4 : 2,
    },
    {
      name: "write-tests",
      testDir: "./e2e/write-tests",
      testIgnore: ["**/*-proof.spec.ts"],
      dependencies: ["chromium"], // run after read tests
      use: { ...devices["Desktop Chrome"] },
      workers: 1, // writes are serial (Dolt lock)
    },
  ],

  webServer: sharedWebServer,
});
