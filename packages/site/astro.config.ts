import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  site: "https://pearl.dev",
  integrations: [
    starlight({
      title: "Pearl",
      logo: {
        src: "./src/assets/logo.svg",
      },
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/htxryan/pearl",
        },
      ],
      customCss: [
        "./src/styles/tokens.css",
        "./src/styles/starlight-overrides.css",
      ],
      sidebar: [
        {
          label: "Getting Started",
          items: [
            { label: "Quickstart", slug: "docs/quickstart" },
            { label: "Install & Modes", slug: "docs/install" },
          ],
        },
        {
          label: "Reference",
          items: [
            { label: "Configuration", slug: "docs/configuration" },
            { label: "Themes", slug: "docs/themes" },
          ],
        },
        {
          label: "Help",
          items: [
            { label: "FAQ", slug: "docs/faq" },
            { label: "Troubleshooting", slug: "docs/troubleshooting" },
          ],
        },
      ],
      head: [
        {
          tag: "meta",
          attrs: {
            property: "og:image",
            content: "https://pearl.dev/og/site.png",
          },
        },
      ],
      pagefind: true,
    }),
  ],
  build: {
    assets: "_assets",
  },
  vite: {
    build: {
      cssMinify: true,
    },
  },
});
