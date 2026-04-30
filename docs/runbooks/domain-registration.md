# Domain Registration Runbook (E1)

> Bead: `beads-gui-85pk` — Marketing site E1: Domain & DNS
> Spec: `docs/specs/marketing-site.md` §13.1, §8 Assumption 1
> Last updated: 2026-04-30 (prep work performed; **awaiting your domain selection + purchase**)

This runbook covers everything you need to (a) pick a domain, (b) register it through Cloudflare Registrar, (c) configure DNS, (d) install the Cloudflare Pages GitHub App with the correct scope, and (e) close E1 so the loop can pick up E4 + E5.

---

## 1. Decision criteria (recap from architect Gate 1)

- TLD: prefer `.dev`
- Brand: prefer "pearl"; open to playful alternatives
- Budget: under $25/yr (Cloudflare Registrar wholesale puts most `.dev` at ~$10–12/yr)
- Registrar: Cloudflare Registrar (single dashboard with DNS + Pages)

## 2. Availability shortlist (verified via DNS NS lookup, 2026-04-30)

`pearl.dev` is **taken** (Google Domains nameservers). The following Pearl-themed `.dev` domains had no NS records at check time and are very likely available at Cloudflare wholesale pricing. **Re-verify availability in the Cloudflare dashboard before purchase** — DNS-based checks have a small false-positive window for parked-but-unconfigured domains.

### Top recommendations (ranked)

| Rank | Domain | Pattern | Notes |
|---|---|---|---|
| 1 | **getpearl.dev** | SaaS "get this" | Common dev-tool convention; reads naturally as a CTA |
| 2 | **trypearl.dev** | SaaS "try this" | Mirrors the `npx pearl-bdui` evaluation flow |
| 3 | **usepearl.dev** | imperative | Matches dev-tool documentation tone |
| 4 | **pearlbd.dev** | abbreviation | Short, mirrors the `pearl-bdui` package name (bd = beads) |
| 5 | **runpearl.dev** | imperative | Matches `npx pearl-bdui` (the run vibe) |

### Strong alternates

| Domain | Notes |
|---|---|
| `pearlboard.dev` | Highlights the board view (a key feature) |
| `pearlflow.dev` | Highlights graph view + workflow |
| `pearlbeads.dev` | Most explicit "Pearl + Beads" connection (verbose) |
| `pearldash.dev` | Generic dashboard framing |
| `pearlhq.dev` | "headquarters" framing |
| `pearlworks.dev` | Generic |
| `pearlui.dev` | Drops the Beads connection, lower distinctiveness |
| `openpearl.dev` | Could be confused with the OpenPearl programming language |
| `pearltracks.dev` | Less obvious meaning |
| `hellopearl.dev` | Cute, less serious |

## 3. Pre-purchase checklist

- [ ] Decide on the final domain (re-verify availability in the Cloudflare dashboard search — `https://dash.cloudflare.com/?to=/:account/domains/register/<domain>`)
- [ ] Confirm the price is under $25/yr (wholesale `.dev` should be ~$10–12)
- [ ] Confirm WHOIS privacy is enabled (Cloudflare default; do not opt out)

## 4. Purchase steps (manual — Cloudflare Registrar)

1. Sign in to Cloudflare → "Domain Registration" → "Register Domains"
2. Search the chosen domain
3. Add to cart, proceed to checkout
4. Confirm:
   - Auto-renew **ON** (so the site doesn't accidentally expire)
   - WHOIS privacy **ON** (default)
   - Billing/contact info matches your records
5. Pay; registration is typically instant for `.dev`

## 5. DNS configuration

Cloudflare auto-creates the zone on registration. Apex (`@`) and `www` records depend on what's hosting the site. Since the site is on Cloudflare Pages (E4), the records are added automatically when you attach the custom domain to the Pages project. **Do not pre-create A/AAAA records for the apex** — let Pages handle it.

Manual additions you may want:
- `www` → CNAME flattening to apex (or 301 redirect) — Pages can handle this from its dashboard
- `MX` records (optional — only if you want email at this domain). Skip for v1; the site doesn't send/receive mail.

## 6. Install Cloudflare Pages GitHub App (U12 — security invariant)

**Critical**: install as a **GitHub App scoped to `htxryan/pearl` only**, NOT OAuth, NOT org-wide.

1. In Cloudflare Pages → "Connect to Git"
2. Choose **GitHub App** (not OAuth)
3. On the GitHub authorization screen, choose **"Only select repositories"** → check **`htxryan/pearl`** only
4. Confirm the install — verify on `https://github.com/settings/installations` that the Cloudflare Pages app shows access to a single repo

**Do not** add any environment variables to the Pages project at v1. This invariant is asserted in CI by Epic 4.

## 7. Close E1 + update site config

Once the domain is registered:

1. Update `packages/site/src/config.ts` — replace the placeholder `siteUrl`:
   ```ts
   export const siteUrl = "https://<your-chosen-domain>";
   ```
2. Verify the site builds: `pnpm --filter @pearl/site build`
3. Commit: `chore(site): set production domain to <domain>`
4. Close the bead: `bd close beads-gui-85pk`
5. The loop will then unblock E4 (Build & deploy pipeline). Re-launch the loop with: `bash .compound-agent/infinity-loop.sh` in a screen session, or ask the assistant to re-launch.

## 8. Post-purchase verification (E5 sanity, do once)

- `dig +short NS <domain>` returns Cloudflare nameservers (e.g., `*.ns.cloudflare.com`)
- `curl -sI https://<domain>` returns HTTP/2 200 with HSTS header (after E4 attaches the project)
- README badge in `htxryan/pearl` resolves to the homepage
- GitHub repo "Website" field equals `https://<domain>`

## 9. Prep work already completed

The architect-prep run (2026-04-30) did the following so you only need to handle the manual purchase:

- ✅ DNS-based availability check on 18 `.dev` candidates
- ✅ Top-5 + alternates shortlist scored against decision criteria
- ✅ Centralized `siteUrl` and `ogImageUrl` in `packages/site/src/config.ts`
- ✅ Refactored `astro.config.ts` to consume the centralized constants
- ✅ Verified the site still builds with the placeholder URL (`pearl.example`)
- ✅ This runbook (covers purchase + DNS + GitHub App + close-out)
