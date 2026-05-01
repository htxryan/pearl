// Use `vite`'s defineConfig and cast the result. vitest@3.2.4 augments Vite's
// UserConfig with `test` in a chunk file that isn't re-exported through
// `vitest/config`, so `vitest/config`'s defineConfig rejects `test` at the type
// level even though it works at runtime. See https://github.com/vitest-dev/vitest/issues.
import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // @ts-expect-error — see comment above
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**"],
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
      // Baseline (2026-05-01): stmts 67.85, branches 78.13, funcs 61.94, lines 67.85.
      // Statements/lines floored to 60%, functions to 55% so CI stays green.
      thresholds: {
        statements: 60,
        branches: 60,
        functions: 55,
        lines: 60,
      },
    },
  },
});
