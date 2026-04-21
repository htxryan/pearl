import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["docs/proof/beads-gui-yqe6.1/*.test.ts"],
    testTimeout: 10000,
  },
});
