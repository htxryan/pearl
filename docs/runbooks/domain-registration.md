---
title: domain-registration
type: note
permalink: pearl/runbooks/domain-registration
---

# Domain Registration Runbook (E1)

> Bead: `beads-gui-85pk` — Marketing site E1: Domain & DNS
> Spec: `docs/specs/marketing-site.md` §13.1, §8 Assumption 1
> Chosen domain: **`getpearl.dev`**
> Last updated: 2026-04-30 (domain selected, code wired; **awaiting your manual purchase**)

This runbook covers everything you need to (a) register `getpearl.dev` through Cloudflare Registrar, (b) configure DNS, (c) install the Cloudflare Pages GitHub App with the correct scope, and (d) close E1 so the loop can pick up E4 + E5.

---

## 1. Decision

**Chosen domain**: `getpearl.dev`. Rationale: classic SaaS-CTA pattern (Stripe, Heroku, Cursor convention), maximum clarity for a dev-tool audience, available at Cloudflare Registrar wholesale (~$10–12/yr), well under the $25/yr budget. Verified available via DNS NS lookup on 2026-04-30 (no nameservers, NXDOMAIN response).

A wider shortlist with personality-tier alternates was reviewed (incl. `pearlforge.dev`, `onbeads.dev`, `pearlbead.dev`, `theloom.dev`, `tallybead.dev`) and `getpearl.dev` was selected for its broadest appeal and lowest brand risk.

## 2. Pre-purchase checklist

- [x] Domain selected: `getpearl.dev`
- [x] Availability confirmed via DNS (re-verified 2026-04-30)
- [ ] Re-verify availability in the Cloudflare dashboard search before checkout: `https://dash.cloudflare.com/?to=/:account/domains/register/getpearl.dev`
- [ ] Confirm price ≤ $15/yr (wholesale `.dev` should be ~$10–12)
- [ ] WHOIS privacy enabled (Cloudflare default; do not opt out)

## 3. Purchase steps (manual — Cloudflare Registrar)

1. Sign in to Cloudflare → "Domain Registration" → "Register Domains"
2. Search `getpearl.dev`
3. Add to cart, proceed to checkout
4. Confirm:
   - Auto-renew **ON** (so the site doesn't accidentally expire)
   - WHOIS privacy **ON** (default)
   - Billing/contact info matches your records
5. Pay; registration is typically instant for `.dev`

## 4. DNS configuration

Cloudflare auto-creates the zone on registration. Apex (`@`) and `www` records depend on what's hosting the site. Since the site is on Cloudflare Pages (E4), the records are added automatically when you attach `getpearl.dev` to the Pages project. **Do not pre-create A/AAAA records for the apex** — let Pages handle it.

Manual additions you may want:
- `www` → CNAME flattening to apex (or 301 redirect) — Pages can handle this from its dashboard
- `MX` records (optional — only if you want email at this domain). Skip for v1; the site doesn't send/receive mail.

## 5. Install Cloudflare Pages GitHub App (U12 — security invariant)

**Critical**: install as a **GitHub App scoped to `htxryan/pearl` only**, NOT OAuth, NOT org-wide.

1. In Cloudflare Pages → "Connect to Git"
2. Choose **GitHub App** (not OAuth)
3. On the GitHub authorization screen, choose **"Only select repositories"** → check **`htxryan/pearl`** only
4. Confirm the install — verify on `https://github.com/settings/installations` that the Cloudflare Pages app shows access to a single repo

**Do not** add any environment variables to the Pages project at v1. This invariant is asserted in CI by Epic 4.

## 6. Close E1

Once `getpearl.dev` is registered:

1. (No code change needed — `siteUrl` already set to `https://getpearl.dev` in `packages/site/src/config.ts`.)
2. Verify build still passes: `pnpm --filter @pearl/site build`
3. Close the bead: `bd close beads-gui-85pk`
4. The loop's dependency graph will then unblock E4 (Build & deploy pipeline). Re-launch the loop with: `bash .compound-agent/infinity-loop.sh` in a screen session, or ask the assistant to re-launch.

## 7. Post-purchase verification (E5 sanity, do once)

- `dig +short NS getpearl.dev` returns Cloudflare nameservers (e.g., `*.ns.cloudflare.com`)
- `curl -sI https://getpearl.dev` returns HTTP/2 200 with HSTS header (after E4 attaches the project)
- README badge in `htxryan/pearl` resolves to the homepage
- GitHub repo "Website" field equals `https://getpearl.dev`

## 8. Prep work already completed

The architect-prep run (2026-04-30) did the following so all that remains is the manual purchase:

- ✅ DNS-based availability sweep on ~70 candidates across themes (Pearl-prefix, oyster/shell metaphor, beads-companion, abacus/counting, threading/loom)
- ✅ User selected `getpearl.dev` from the shortlist
- ✅ Centralized `siteUrl` and `ogImageUrl` in `packages/site/src/config.ts`
- ✅ Refactored `astro.config.ts` to consume the centralized constants
- ✅ Set `siteUrl = "https://getpearl.dev"`
- ✅ Verified the site still builds clean with the chosen URL
- ✅ This runbook (covers purchase + DNS + GitHub App + close-out)