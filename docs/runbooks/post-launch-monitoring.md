# Post-Launch Monitoring Runbook (E5)

> Bead: `beads-gui-etar` — Marketing site E5: Launch & integration verification (IV)
> Spec: `docs/specs/marketing-site.md` §13.4
> Domain: **`getpearl.dev`**
> Last updated: 2026-04-30 (launch verification complete)

This runbook covers ongoing monitoring for the Pearl marketing site after launch.

---

## 1. Automated Monitoring (CI/CD)

The following workflows run automatically and require no manual intervention:

| Workflow | Trigger | What it checks |
|---|---|---|
| `site-ci.yml` | Push/PR to `packages/site/**` | Build, headers golden-file parity, Pagefind integrity, internal links, Lighthouse budgets |
| `site-smoke.yml` | `deployment_status` success or manual | Critical paths (/, /docs/, /sitemap-index.xml), sitemap URL parity, all 5 security headers |
| `site-links-external.yml` | Weekly (Monday 09:30 UTC) | External link rot; opens GitHub issue on failure |

**Action on failure**: CI failures block merge. Smoke failures surface as failed GitHub Actions runs. External link issues appear as auto-opened issues.

## 2. Manual Verification Script

Run the launch verification script for a comprehensive contract check:

```bash
bash scripts/verify-launch.sh
```

This tests 26 assertions across 13 contract groups (DNS, headers, OG images, Pagefind, sitemap parity, README badge, and GitHub repo homepage). Run after any infrastructure change (domain, DNS, Cloudflare Pages config).

## 3. What to Monitor

### Domain & DNS (check quarterly)

```bash
dig +short NS getpearl.dev          # Should return *.ns.cloudflare.com
dig +short A getpearl.dev           # Should return Cloudflare IPs
curl -sI https://getpearl.dev | head -1  # Should return HTTP/2 200
```

- Verify auto-renew is ON in Cloudflare Registrar dashboard
- Domain expiry: check `whois getpearl.dev` for `Registry Expiry Date`

### Security Headers (checked automatically by CI)

All 5 headers must be present on every response:

1. Content-Security-Policy
2. Strict-Transport-Security (HSTS with preload)
3. Referrer-Policy
4. X-Content-Type-Options
5. Permissions-Policy

**Golden file**: `docs/specs/headers-golden.txt` — CI enforces byte-for-byte parity with `packages/site/public/_headers`.

### Lighthouse Budgets (checked automatically by CI)

| Metric | Threshold | Action |
|---|---|---|
| Performance | >= 85 (warning) | Investigate if trending down |
| Accessibility | >= 95 (error) | Fix immediately |
| Best Practices | >= 95 (error) | Fix immediately |
| SEO | >= 95 (error) | Fix immediately |

### Search Engine Indexing

After launch, submit sitemaps to:
- Google Search Console: `https://search.google.com/search-console`
- Bing Webmaster Tools: `https://www.bing.com/webmasters`

Sitemap URL: `https://getpearl.dev/sitemap-index.xml`

Check indexing status monthly until all pages are indexed.

## 4. Incident Response

### Site down (getpearl.dev returns non-200)

1. Check Cloudflare status: `https://www.cloudflarestatus.com/`
2. Check DNS: `dig +short A getpearl.dev`
3. Check Pages deployment: Cloudflare dashboard > Pages > pearl
4. If Pages-specific: check recent deployments, rollback if needed
5. Run `bash scripts/verify-launch.sh` to identify which contract broke

### Header regression

If smoke test reports missing headers:
1. Check `packages/site/public/_headers` matches `docs/specs/headers-golden.txt`
2. Verify Cloudflare isn't stripping headers (check Pages settings)
3. Fix and push; CI will validate

### Lighthouse regression

1. Run locally: `cd packages/site && pnpm build && npx lhci autorun`
2. Identify the regression (new assets, unoptimized images, etc.)
3. Fix before merging

### External link rot

1. Check the auto-opened GitHub issue from `site-links-external.yml`
2. Update or remove broken links
3. Close the issue when fixed

## 5. Maintenance Schedule

| Frequency | Task |
|---|---|
| Continuous | CI runs on every push/PR (build, headers, links, Lighthouse) |
| Per-deploy | Smoke test runs automatically on Cloudflare Pages deployment |
| Weekly | External link check (Monday 09:30 UTC, non-blocking) |
| Monthly | Check search engine indexing status |
| Quarterly | Verify domain renewal, DNS, HSTS preload status |
| Annually | Review Lighthouse budgets, update if standards change |

## 6. Cloudflare Pages GitHub App (Security Invariant)

The Cloudflare Pages GitHub App MUST remain scoped to `htxryan/pearl` only. Verify at `https://github.com/settings/installations`. Do not expand scope to organization-wide.

No environment variables should be configured on the Pages project. This is asserted by CI.
