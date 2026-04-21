/**
 * Standalone Playwright config for the Gate 2 browser benchmark.
 * No web servers needed — the test spins up its own HTTP server.
 *
 * Run:
 *   npx playwright test --config docs/proof/beads-gui-yqe6.1/playwright.config.ts
 */
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	timeout: 120_000,
	expect: { timeout: 30_000 },
	reporter: [["list"]],
	projects: [
		{
			name: "bench-chromium",
			testDir: ".",
			testMatch: "browser-benchmark.spec.ts",
			use: {
				...devices["Desktop Chrome"],
				// Enable performance.memory via Chrome flags
				launchOptions: {
					args: ["--enable-precise-memory-info"],
				},
			},
		},
	],
});
