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
  },
});
