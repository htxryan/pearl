import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import { siteUrl, ogImageUrl } from "./src/config";

export default defineConfig({
  site: siteUrl,
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
            content: ogImageUrl,
          },
        },
      ],
      lastUpdated: true,
      pagefind: true,
      disable404Route: true,
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
