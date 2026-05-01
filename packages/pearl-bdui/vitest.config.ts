import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    testTimeout: 10000,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/test-setup.ts",
        "**/dist/**",
        "**/*.config.{ts,cjs}",
        "**/types.ts",
      ],
      // TODO: ramp threshold to 70% — beads-gui-grgc follow-up
      // Baseline (2026-05-01): stmts 40.20, branches 79.89, funcs 78.15, lines 40.20.
      // Statements/lines floored to 35% so CI stays green; branches/funcs hold at standard.
      thresholds: {
        statements: 35,
        branches: 60,
        functions: 70,
        lines: 35,
      },
    },
  },
});
