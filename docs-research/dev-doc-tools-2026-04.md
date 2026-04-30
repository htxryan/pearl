# Developer Documentation Tools — Landscape Survey (April 2026)

> Research scope: documentation platforms suited for developer-tool projects (CLIs, SDKs, APIs, libraries, dashboards) with an AI-focused lens.
> Pricing snapshot date: April 2026. Verify current pricing before committing.

---

## 1. TL;DR

**Primary recommendation: Astro Starlight** — free, fully open-source, framework-agnostic (React components work natively), zero-JavaScript-by-default output that is fast for end-users, first-class `llms.txt` plugin support, excellent built-in accessibility and search, and trivially replicated across N projects. For API reference generation, pair it with the embedded **Scalar** `@scalar/api-reference` React component (open-source core, MIT).

**Runner-up: Docusaurus** — if the team already lives in React and needs mature versioning support or the broader plugin ecosystem. It is slightly heavier and slower to build but has overwhelming social proof (React, Jest, Prettier, Supabase, Temporal, Algolia all use it) and a very mature `docusaurus-plugin-openapi-docs` for REST reference pages. Both tools are 100% free/open-source and scale to any number of projects without licensing friction.

**Avoid Mintlify and GitBook for this use case**: AI features on Mintlify are paywalled at $300/month; GitBook AI requires $249+/site/month. Neither fits a free-first, multi-project brief.

---

## 2. Decision Matrix

| Tool | Price | AI / LLM features | TS / React fit | Multi-project | Learning curve | Hosting model |
|---|---|---|---|---|---|---|
| **Astro Starlight** | Free / OSS | llms.txt plugin, community AI search | Excellent (React islands) | Excellent — one template, many repos | Low | Self-host / any CDN |
| **Docusaurus** | Free / OSS | llms.txt plugins, Algolia search | Excellent (React-native) | Good — copy config per repo | Low–Medium | Self-host / any CDN |
| **Fumadocs** | Free / OSS | llms.txt + llms-full.txt built-in, AI chat (Inkeep / Vercel AI SDK) | Excellent (Next.js / React) | Good | Medium (Next.js dependency) | Self-host (Next.js) |
| **VitePress** | Free / OSS | llms.txt plugin (community) | Vue-native; React not first-class | Excellent | Low (if Vue) | Self-host / any CDN |
| **Scalar** (API ref) | Free core / $72/mo Pro | None native | React component, TS types | Excellent — embed anywhere | Very low | Self-host or hosted |
| **MkDocs Material** | Free (Insiders released) | None native | Python-centric; no React | Excellent | Low (Python/YAML) | Self-host / any CDN |
| **Mintlify** | Free hobby; $300/mo Pro | AI writing agent (Pro only), llms.txt on all tiers | Reasonable MDX | Per-site cost pain | Low | Hosted-only |
| **GitBook** | $65/site/mo; $249 for AI | AI agent Beta (paid) | No code-level control | High per-site cost | Very low | Hosted-only |

---

## 3. Detailed Profiles

### 3.1 Astro Starlight

**What it is:** A full-featured documentation theme built on the Astro framework, shipping zero JavaScript by default with island architecture for interactive components.

**Pricing:** Completely free and open source. No tiers, no paywalls, MIT licensed. Self-host on any static CDN (Netlify, Cloudflare Pages, Vercel, GitHub Pages).

**Strengths for developer-tool docs:**
- Sub-50 KB first visit (2.5% of HTTP archive median) — critical for CLI/SDK docs that compete for developer attention.
- Built-in Pagefind full-text search, dark/light mode, i18n, and sidebar nav — zero configuration needed.
- Framework-agnostic: React (JSX/TSX), Vue, Svelte, Solid all work as "islands." A TypeScript/React team can drop in React components without rewriting anything.
- `starlight-llms-txt` plugin generates `llms.txt`, `llms-full.txt`, and `llms-small.txt` (optimized for small context windows) — first-class AI discoverability.
- Type-safe frontmatter via Astro Content Collections catches errors at build time.
- "Starlight Telescope" (Feb 2026 addition) — keyboard-first fuzzy-search nav for power users.

**Weaknesses / friction:**
- No built-in doc versioning (unlike Docusaurus). Community workarounds exist but are not official.
- Astro is a fifth framework to learn if the team is purely TypeScript/React; not difficult but non-zero.
- Plugin ecosystem is younger than Docusaurus (~200K downloads vs ~3M).

**AI-relevant features:**
- `starlight-llms-txt`: generates all llms.txt variants. Community plugins exist for integrating AI chat widgets (Inkeep, kapa.ai, Pagefind-based conversational search).
- No native MCP server as of April 2026, but the llms-full.txt output is directly consumable by any agent pipeline.
- Zero vendor lock-in makes it straightforward to build a RAG pipeline on top.

**Stack fit:** Excellent. pnpm + Astro works out of the box (`pnpm create astro --template starlight`). React 19 components work as islands. TypeScript is the default configuration language. The pearl project's Vite familiarity transfers directly — Astro uses Vite under the hood.

**Multi-project story:** Copy one `astro.config.mjs` and `src/content/docs/` directory. Each project gets an independent static site. No per-project licensing, no central service required.

**Notable users:** Cloudflare (developer docs), WPEngine (Atlas Platform docs), Arcjet, Patchstack, and the Astro project itself.

---

### 3.2 Docusaurus (v3)

**What it is:** Meta's open-source static site generator purpose-built for documentation, React-native, with mature versioning and plugin ecosystem.

**Pricing:** Free, Apache 2.0 licensed. No paid tiers.

**Strengths for developer-tool docs:**
- Native versioning: maintain docs for multiple library versions simultaneously — a standout advantage for SDK and library authors.
- Largest documentation-specific plugin ecosystem: `docusaurus-plugin-openapi-docs` (Palo Alto Networks) and `@scalar/docusaurus` both generate beautiful REST API reference pages from OpenAPI specs.
- React + MDX everywhere: blog posts, custom pages, and doc pages all use the same React component model; easy to build interactive demos.
- Battle-tested at scale: React, Jest, Prettier, Redux, Testing Library, Supabase, Algolia, Hasura, Temporal all ship docs here. Hundreds of thousands of production deployments.
- `docusaurus-plugin-llms` and `docusaurus-plugin-llms-txt` both generate compliant `llms.txt` and `llms-full.txt` files.

**Weaknesses / friction:**
- Webpack-based (v3 has experimental Rspack support). Cold builds are noticeably slower than Vite/Astro.
- Heavier JavaScript footprint than Astro. First page load is measurably larger.
- Plugin dependency conflicts with pnpm are occasionally reported (strict linking mode can surface transitive dependency issues).

**AI-relevant features:**
- Two llms.txt plugins with batch processing for large sites.
- Algolia DocSearch integration (free for OSS projects) provides high-quality semantic search.
- No native AI authoring or chat — these require third-party integrations (Inkeep, kapa.ai, etc.).

**Stack fit:** Excellent. React-native, TypeScript configs, pnpm-compatible. The monorepo structure described in the pearl project (multiple packages with a shared `packages/` layout) is a documented Docusaurus use case.

**Multi-project story:** Each project gets its own `docusaurus.config.ts`. Versioning across multiple packages (e.g., `bd` CLI + `pearl-bdui` API) is a first-class supported pattern.

**Notable users:** React, Jest, Prettier, Supabase, Algolia, Hasura, Temporal, Redux family.

---

### 3.3 Fumadocs

**What it is:** A modular React.js documentation framework for Next.js (and other React runtimes) with native AI/LLM features and TypeScript Twoslash support.

**Pricing:** Free, MIT licensed, 100% open source.

**Strengths for developer-tool docs:**
- **Best-in-class AI/LLM features among OSS tools**: `llms.txt`, `llms-full.txt`, and per-page `.mdx` endpoint (append `.mdx` to any URL for raw markdown). `LLMCopyButton` component lets users copy page content for pasting into LLMs. AI chat via Vercel AI SDK + OpenRouter or Inkeep is documented and packaged.
- **TypeScript Twoslash**: displays inferred type information inline in code blocks — ideal for SDK and library docs.
- OpenAPI integration (`fumadocs-openapi`) generates interactive API playground pages from OpenAPI specs.
- React Server Components support means docs can pull live data (e.g., latest version numbers, changelog entries) at request time.
- Headless architecture: `fumadocs-core` (logic) + `fumadocs-ui` (components) are separated, enabling deep customization.

**Weaknesses / friction:**
- **Next.js dependency is real**: the framework is designed for Next.js App Router. Using it with the pearl project would mean adding a Next.js app to the monorepo (or hosting docs externally). For a Vite + React project team, this is a context switch.
- Newer and smaller community than Docusaurus. Fewer third-party themes and plugins.
- Notable users are mostly startups (Unkey, Arktype) — fewer Fortune-500 reference deployments than Docusaurus.

**AI-relevant features:** The strongest of any free tool in this survey. Built-in llms.txt generation, per-page markdown endpoints, AI search chat, and explicit "AI agent middleware" that detects AI user agents and serves markdown instead of HTML.

**Stack fit:** Good if Next.js is acceptable. `pnpm create fumadocs-app` bootstraps instantly. TypeScript-first throughout. The pearl monorepo could host docs as a separate `apps/docs` Next.js app.

**Multi-project story:** Identical to Docusaurus — copy the app directory per project. No central server required; each site is a standalone Next.js static export or serverless deployment.

**Notable users:** Unkey, Arktype, Million.js, Shadcn UI documentation ecosystem contributors.

---

### 3.4 Scalar (API Reference)

**What it is:** An open-source, MIT-licensed API reference renderer with first-class OpenAPI/Swagger support, a React component for embedding, and a hosted cloud product.

**Pricing:**
- **Open-source core**: completely free, MIT. `@scalar/api-reference-react` is a drop-in npm package.
- **Hosted cloud (Free tier)**: 1 subdomain, 3 viewer seats, full API reference features, custom CSS/JS. Genuinely useful for small teams.
- **Pro**: $72/month for 3 editors. Adds Git Sync, custom domains, RBAC.
- **SDK generation add-ons**: $100/SDK/month per language (TypeScript, Python, etc.). These are optional.

**Strengths for developer-tool docs:**
- The most visually polished API reference renderer available in 2026, consistently cited as "best-looking" in comparisons.
- Works as an embedded React component (`@scalar/api-reference-react`) — can be dropped into any Docusaurus, Starlight, or plain React app without using their hosted platform.
- Interactive API playground (send real requests from the docs page), dark mode, deep linking, and global search across the entire spec.
- Framework integrations: official plugins for Docusaurus, Fastify (directly relevant to pearl's backend), Express, NestJS, Hono, etc.
- Fastify plugin: `@scalar/fastify-api-reference` serves the reference UI directly from the API server at a configurable path.

**Weaknesses / friction:**
- SDK generation pricing ($100/language/month) is steep for small teams.
- No native prose documentation — Scalar is an API reference renderer, not a general docs platform. Pair with Starlight or Docusaurus for guides/tutorials.
- AI features are limited to an experimental "Agent" product on the hosted platform (metered at $0.02/message in production).

**AI-relevant features:** No built-in llms.txt support. The structured OpenAPI JSON the renderer consumes is already highly machine-readable and can feed directly into agent pipelines. The hosted platform has an early-stage AI agent feature.

**Stack fit:** Excellent for the Fastify backend in the pearl project. `@scalar/fastify-api-reference` can be registered as a Fastify plugin in minutes. TypeScript types included.

**Multi-project story:** The open-source npm component approach means zero licensing overhead for N projects. Each project embeds the component or registers the framework plugin independently.

**Notable users:** Used by developers across the API tooling space; cited across Apidog, DigitalAPI, and Ferndesk comparisons as the current visual benchmark for API docs.

---

### 3.5 MkDocs Material (for completeness)

**What it is:** The dominant Python documentation theme, recently released all formerly-paid Insiders features as free in version 9.7.0 (November 2025).

**Pricing:** Now fully free. The sponsorware model has ended. The project is entering maintenance mode; the team is building Zensical as a successor.

**Strengths:** Excellent for Python-centric projects. Search, tags, blog, social cards, code annotations — all free now.

**Weaknesses for this user:** Python toolchain is a context switch for a TypeScript/React team. No React components. The project is in maintenance mode with no new features planned. The successor (Zensical) does not yet have a public release timeline.

**AI-relevant features:** None native. Community plugins exist for llms.txt.

**Verdict:** Skip for TypeScript projects. Use for Python-heavy documentation if needed elsewhere.

---

## 4. Honorable Mentions / Skip List

| Tool | Verdict | Reason |
|---|---|---|
| **VitePress** | Honorable mention | Excellent for Vue-native teams. Fastest builds, simplest config. But React is not first-class (no islands) — a friction point for this stack. |
| **Nextra 4.0** | Honorable mention | Next.js-powered like Fumadocs, App Router, good Vercel integration. Loses to Fumadocs on AI features and OpenAPI support. Wins on simplicity if the team is Vercel-first. |
| **Mintlify** | Skip | Pro plan at $300/month for AI features. Free tier excludes AI entirely. Hosted-only (no self-host). Expensive for multi-project use. |
| **GitBook** | Skip | $65+/site/month for basic paid features; AI requires $249+/site. Per-site pricing is punishing at scale. |
| **Fern** | Niche pick | Excellent if the primary output is SDK generation from an OpenAPI spec (TypeScript, Python, Go, etc.) and documentation is secondary. The Docs free tier (Hobby: $0, 250 AI credits/month) is genuinely useful. Postman acquisition (Jan 2026) introduces some long-term uncertainty. SDK pricing ($250/SDK/month) is expensive. |
| **Redocly** | Niche pick | Best-in-class for complex OpenAPI specs with enterprise governance needs. Free Redoc OSS is solid. The commercial platform pricing is opaque (custom). Overkill for most developer-tool docs. |
| **TypeDoc / TSDoc** | Complementary tool | Not a docs platform — generates API reference from TypeScript inline comments. Should be used **alongside** a primary platform (Starlight or Docusaurus), not instead of one. Free, MIT licensed. |
| **kapa.ai / Inkeep** | Complementary tool | RAG-over-docs AI chat layers that integrate with Docusaurus, Starlight, Fumadocs. Not documentation platforms themselves. Inkeep has a free tier; kapa.ai is paid. |

---

## 5. Final Recommendation

### Primary: Astro Starlight + Scalar (embedded)

**For all developer-tool project types in this ecosystem** — CLI docs, SDK guides, API reference, web dashboard help center — the combination of Astro Starlight (prose + guides) with the embedded Scalar React component (API reference) covers every documentation category at zero cost.

**Rationale grounded in the user's four criteria:**

1. **AI-focused use case**: `starlight-llms-txt` generates all three llms.txt variants with one config line. Zero-JS static output means every page is served as clean markdown-via-`.mdx`-equivalent to AI agents. The pearl project's Fastify API can serve `@scalar/fastify-api-reference` for machine-readable OpenAPI output. The combination is fully LLM-consumable without any additional infrastructure.

2. **Free/low-cost preference**: Both tools are fully free and open-source. Hosting on Cloudflare Pages or GitHub Pages adds no cost. No per-seat or per-project fees at any scale.

3. **Multi-project scaling**: `pnpm create astro --template starlight` is a 30-second bootstrap. One configuration file governs each site. Adding a fifth or fifteenth project requires no vendor conversation. The pearl monorepo's pnpm workspace can host all documentation as separate `apps/docs-*` directories sharing the root `node_modules`.

4. **TypeScript stack fit**: Astro uses Vite (the same bundler the pearl frontend already uses), TypeScript-first config, and React islands for any interactive component. The pearl team's existing React + TypeScript skills transfer directly.

**Category-specific guidance:**
- *CLI tools (like `bd`)*: Starlight with a "Commands" reference section generated from TypeDoc JSON output. TypeDoc + `typedoc-plugin-markdown` can generate MDX pages from TypeScript types automatically.
- *APIs (like the Fastify backend)*: `@scalar/fastify-api-reference` at `/reference` route on the API server + the same spec rendered in Starlight via `@scalar/api-reference-react` for hosted docs.
- *SDKs and TypeScript libraries*: Fumadocs becomes a compelling upgrade path if AI chat and TypeScript Twoslash are high priorities. It is a lateral move, not a regression.

### Fallback: Docusaurus

Choose Docusaurus over Starlight if:
- Doc versioning across multiple library versions is a hard requirement (Starlight lacks this natively).
- The team wants to lean on a larger, older plugin ecosystem.
- Existing Docusaurus familiarity already exists on the team.

The tradeoff is slower builds, heavier page weight, and slightly more configuration for the pnpm monorepo setup.

---

## 6. Getting-Started Notes (Astro Starlight)

### Installation

```bash
pnpm create astro --template starlight
```

The wizard scaffolds a complete project. Answer the prompts for project name, TypeScript strictness, and whether to install dependencies.

### Recommended directory layout

```
my-project-docs/
  astro.config.mjs        # Starlight configuration (sidebar, title, social links)
  src/
    content/
      docs/               # All documentation pages as .md or .mdx files
        index.mdx         # Landing page (maps to /)
        getting-started.md
        reference/
          cli.md
          api.md
    assets/               # Images and static files referenced in docs
  public/                 # Files served at root (favicon, robots.txt, llms.txt)
  package.json
```

### Adding llms.txt support

```bash
pnpm add starlight-llms-txt
```

In `astro.config.mjs`:

```js
import starlightLlmsTxt from 'starlight-llms-txt';
// add to plugins: [starlightLlmsTxt()] in the Starlight integration config
```

This generates `/llms.txt`, `/llms-full.txt`, and `/llms-small.txt` at build time.

### Adding Scalar API reference

```bash
pnpm add @scalar/api-reference-react
```

Create `src/pages/api-reference.astro`, import the component with `client:only="react"`, and point it at your OpenAPI spec URL.

For the Fastify backend directly, register the plugin:

```bash
pnpm add @scalar/fastify-api-reference
```

### Canonical tutorial

Starlight official docs: https://starlight.astro.build/getting-started/

---

## 7. Confidence Note

**Directly verified (fetched primary sources):**
- Fern pricing tiers (fetched `buildwithfern.com/pricing`): Hobby free with 250 AI credits; Team $150/mo; SDK Basic $250/mo.
- Scalar pricing (fetched `scalar.com/pricing`): Free tier confirmed with 1 subdomain, 3 viewers; Pro at $72/month.
- Material for MkDocs Insiders (fetched announcement): All Insiders features confirmed free as of November 2025 v9.7.0; project in maintenance mode; Zensical successor confirmed.
- Fumadocs AI/LLM features (fetched `fumadocs.dev/docs/integrations/llms`): llms.txt, llms-full.txt, per-page `.mdx` endpoint, LLMCopyButton all confirmed.
- Starlight getting-started install command (fetched `starlight.astro.build/getting-started/`): `pnpm create astro --template starlight` confirmed.

**Based on secondary sources (search results, aggregator sites) — verify before committing:**
- Mintlify pricing ($300/mo Pro, AI on paid only): confirmed by three independent aggregator sources (featurebase.app, bunnydesk.ai, ferndesk.com) but not fetched directly from mintlify.com/pricing.
- GitBook pricing ($65/site Pro, $249 Ultimate): confirmed by multiple aggregators; direct pricing page not fetched.
- Docusaurus notable users (React, Jest, Supabase, Temporal): well-established industry knowledge, confirmed in search results but not verified against each project's current docs setup.
- MkDocs Material Insiders repository deletion on May 1, 2026: stated in the fetched blog post — if reading this after that date, the repository may already be gone.
- Fern acquisition by Postman (January 2026): reported by apicoding.com; not confirmed from Postman or Fern primary sources.
