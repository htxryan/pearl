---
spec: marketing-site
generated: 2026-04-29
phase: architect-gate-2
permalink: pearl/specs/marketing-site-advisory-brief
---

# Advisory Fleet Brief — Pearl Marketing Site

**Advisors consulted**: Security & Reliability + Simplicity & Alternatives (claude); Scalability & Performance + Organizational & Delivery (gemini).
**Advisors unavailable**: None — all four lenses produced valid feedback.

## P0 Concerns

- **Domain availability is a leap of faith** *(Gemini, Org & Delivery)*
  - **Detail**: Spec §1 + Assumption 1 hard-bind the brand to a `.dev` domain at ≤ $15/yr. Premium pricing or unavailability blocks the entire critical path.
  - **Mitigation**: Run a Cloudflare Registrar availability sweep **before** any other epic begins; commit a ranked shortlist (3 candidates + 1 fallback) in the Domain epic; do not start the Site Shell epic until the domain is registered.

- **Synchronous link-checking will become a CI tax** *(Gemini, Scalability)*
  - **Detail**: UB2 fails the build on dead links. As content grows, external link checks (GitHub, npm) push build past the 5-min E2 budget and create flaky PRs.
  - **Mitigation**: Split UB2 → **UB2a** (internal links: hard-fail per PR) + **UB2b** (external links: scheduled GHA run weekly, warns only). Documented as a spec amendment below.

## P1 Concerns

- **Starlight may be over-spec'd for ≤ 6 docs pages** *(Claude, Simplicity)*
  - **Detail**: Starlight ships Pagefind, sidebar IA, versioning, and a theming-override surface designed for hundreds of pages. The spec already flags "Starlight theming fights with marketing palette" (§11) — a self-inflicted wound at this scale. v1 alternative: hand-rolled `/docs/[slug].astro` reading MDX, defer Starlight until > ~15 pages.
  - **User direction**: Starlight was explicitly chosen during Phase 1 clarification. Surface this as a decision point at Gate 2: keep Starlight (commit to its tax), or revise to vanilla Astro docs.
  - **If keeping Starlight**: stick strictly to CSS custom properties (no `.astro` component overrides) — this is also Gemini's Org P2 concern.

- **Decomposition is over-fragmented** *(Claude, Simplicity)*
  - **Detail**: 7 epics for a one-maintainer static site is ceremony exceeding the work. "Domain & DNS" = one CF dashboard session; "Repo integration & launch" = two README edits.
  - **Mitigation**: Collapse to 4 epics (proposed below). Integration Verification scope folds into the Build & Deploy epic's verification contract.

- **CSP and security headers absent from spec** *(Claude, Security)*
  - **Detail**: HTTPS-only (U1) and self-hosted fonts (U5) are good but spec is silent on CSP, HSTS preload, Referrer-Policy, X-Content-Type-Options, Permissions-Policy, frame-ancestors. Lighthouse Best Practices ≥ 95 does not enforce a real CSP.
  - **Mitigation**: Add **U11** (security headers) requiring `_headers` file with strict CSP, HSTS preload, Referrer-Policy strict-origin-when-cross-origin, X-Content-Type-Options nosniff, Permissions-Policy restrictive defaults. Verify in CI.

- **Preview-deploy supply-chain risk + Cloudflare GitHub OAuth scope** *(Claude, Security)*
  - **Detail**: E1 builds any PR touching `packages/site/**`. CF Pages historically asks for broad GitHub OAuth scope. A malicious PR or compromised dep could host phishing content on a `*.pages.dev` subdomain or exfiltrate secrets if any are added.
  - **Mitigation**: Add invariants: (a) install CF Pages **GitHub App** scoped to `htxryan/pearl` only — not OAuth; (b) **no secrets in CF Pages build env** — invariant; (c) require approval for outside-contributor PR builds; (d) document in launch checklist.

- **Content authoring bottleneck** *(Gemini, Org & Delivery)*
  - **Detail**: Single maintainer is responsible for both code AND 3-5 technical guides. Risk of shipping a shell with empty docs.
  - **Mitigation**: Plan content as a parallel epic that **can ship in stages** (Quickstart-only is a valid first-public release; other guides land incrementally). Consider sourcing some content directly from the existing README.

## P2 Concerns

- **Pagefind index growth** *(Gemini, Scalability)* — non-issue at 6 pages, but monitor `.pagefind` directory size in CI as content grows.
- **Font payload / LCP risk** *(Gemini, Scalability)* — use variable font files only, `font-display: swap`, preload critical weight.
- **CF Pages free tier limits (500 builds/mo, 20 min timeout)** *(Gemini, Scalability)* — use CF Pages' build-skip rule to ignore non-`packages/site/**` changes.
- **Dependency pinning posture undefined** *(Claude, Security)* — require committed pnpm lockfile, exact-pin Astro + Starlight, document update cadence; Renovate/Dependabot policy needed.
- **UB1 (retain previous deploy on health-check failure) is weaker than implied** *(Claude, Security)* — CF Pages does not health-check post-deploy. Either implement post-deploy smoke check via GHA + rollback, or downgrade UB1 to "build failure retains previous."
- **Pagefind index integrity not verified** *(Claude, Security)* — add CI smoke that asserts `.pagefind` directory exists and has > N entries.
- **OG image generation surface** *(Claude, Security + Simplicity)* — use static OG images committed to repo for v1; defer dynamic generation. Drop "OG on every page"; require OG on `/`, `/docs/`, and one per top-level docs section.
- **`packages/site/` location vs. monorepo coupling** *(Claude, Simplicity)* — exclude from default `pnpm test/build/typecheck` filters so app changes don't trigger site CI and vice versa.
- **Drop O1 (analytics)** *(Claude, Simplicity)* — KPIs (run/star/read) aren't measurable from CF Web Analytics anyway. Star count via GitHub API badge is sufficient. Recommend removing.
- **Visual regression testing** *(Claude, Simplicity)* — VRT setup is multi-day work for ~zero ROI on a 6-page site. Replace with manual smoke checklist before promoting prod alias.
- **Lighthouse ≥ 95 on all four categories is a tax, not a goal** *(Claude, Simplicity)* — recommend softening Performance ≥ 85 mobile, others ≥ 95.

## Strengths (consensus)

- Static-first delivery is the correct floor of complexity (both advisors).
- Atomic deploy + retain-on-failure intent is the right shape (Claude).
- Self-hosted fonts (U5) eliminates a real third-party-CDN risk (Claude).
- No-cookies / no-tracking removes GDPR exposure entirely (Claude).
- Edge-native via CF Pages maximizes TTFB (Gemini).
- Non-goals list is disciplined (Claude).
- Single static bundle on CF Pages is the right hosting floor (Claude).
- Domain budget cap (<$25/yr) is a useful forcing function (Claude).
- Standardized monorepo tooling reduces context-switching cost (Gemini).

## Alternative Approaches Suggested

- **Drop Starlight; hand-roll `/docs/[slug].astro` for v1.** *(Claude)* Recovers theming consistency, removes Pagefind tax, defers Starlight's upgrade burden. User has explicitly chosen Starlight; surface as Gate 2 decision.
- **Collapse to 3-4 epics from 7.** *(Claude)* Match epic ceremony to scale. Proposed 4-epic plan below.
- **Auto-generate API reference docs from TS types** *(Gemini)* to ease content-authoring bottleneck. Out of scope for v1; flag for v2.

## Confidence Summary

| Advisor | Confidence | Justification |
|---|---|---|
| Security & Reliability (claude) | **MEDIUM** | Architecture is fundamentally low-risk (static, no auth, no PII), but multiple implicit assumptions (CSP, OAuth scope, preview-deploy isolation) need to become explicit before launch. |
| Simplicity & Alternatives (claude) | **HIGH** | The destination is clearly a small static site; spec has accreted infrastructure (Starlight, Pagefind, VRT, 7 epics, Lighthouse-95-everywhere, O1) for needs that don't yet exist. |
| Scalability & Performance (gemini) | **HIGH** | Tech stack is purpose-built for this scale; CF Pages removes most infrastructure-level bottlenecks. |
| Organizational & Delivery (gemini) | **MEDIUM** | Technical plan solid; delivery risk concentrated in maintainer's content-authoring bandwidth. |

## Proposed Spec Amendments (for Gate 2 review)

If the user accepts the advisory feedback, the following spec changes are proposed before Phase 3 decomposition:

1. **Keep Starlight** (user direction), but enforce: CSS-custom-properties theming only, no `.astro` component overrides.
2. **Split UB2** → UB2a (internal: blocking PR check) + UB2b (external: weekly scheduled GHA, non-blocking).
3. **Add U11 (security headers)**: `_headers` file with CSP, HSTS preload, Referrer-Policy, X-Content-Type-Options, Permissions-Policy. Verify in CI.
4. **Add U12 (build provenance)**: Cloudflare Pages installs as a GitHub App scoped to `htxryan/pearl` only; no secrets in CF Pages build env; outside-contributor PR builds require approval.
5. **Add U13 (dependency hygiene)**: pnpm-lock.yaml committed, Astro + Starlight exact-pinned, documented update cadence (e.g., monthly Renovate sweep).
6. **Soften U6**: Lighthouse Performance ≥ 85 mobile (Moto G4); Accessibility / Best Practices / SEO ≥ 95.
7. **Tighten U7**: OG metadata required on `/` and `/docs/`; per-page Twitter cards default to site-level fallback. Static OG images for v1.
8. **Clarify UB1**: build failure retains previous deploy (honest re: CF Pages reality); add CI smoke check (curl `/`, `/docs/`, sitemap) post-deploy with manual rollback runbook.
9. **Drop O1** (analytics) — KPIs aren't measurable from CF Web Analytics in any actionable way; star-count badge suffices.
10. **Drop VRT from delivery profile** — replace with manual smoke checklist.
11. **Collapse decomposition preview from 7 → 4 epics**:
    - **Epic 1: Domain & DNS** — registration, DNS, repo "Website" field. Critical path; runs first.
    - **Epic 2: Site shell, brand, marketing landing & content (incl. /docs Starlight)** — the bulk of the work; one cohesive ship-it surface.
    - **Epic 3: Build & deploy pipeline** — CF Pages connection, preview deploys, link checking (UB2a/b), Lighthouse budgets, security headers, smoke checks.
    - **Epic 4: Launch & integration verification** — README badge, Website field, sitemap, OG images, end-to-end smoke. (Replaces standalone IV epic.)
12. **Workspace isolation**: exclude `packages/site/` from default `pnpm test/build/typecheck` matrices via filtered scripts so app and site CI don't bleed.