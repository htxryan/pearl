import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://pearl.dev",
  build: {
    assets: "_assets",
  },
  vite: {
    build: {
      cssMinify: true,
    },
  },
});
