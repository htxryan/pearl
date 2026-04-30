# @pearl/site

Marketing site and documentation for Pearl, built with [Astro](https://astro.build/) and [Starlight](https://starlight.astro.build/).

## URLs

| Environment | URL |
|-------------|-----|
| Production | `https://getpearl.dev` |
| Preview | `https://<branch>.pearl-site.pages.dev` |
| Pages dashboard | `https://dash.cloudflare.com/?to=/:account/pages/view/pearl-site` |

**CF Pages project name:** `pearl-site`

## Development

```bash
pnpm --filter @pearl/site dev      # Start dev server at localhost:4321
pnpm --filter @pearl/site build    # Build to packages/site/dist/
pnpm --filter @pearl/site preview  # Preview built site locally
```

## Deployment

Cloudflare Pages deploys automatically via the CF Pages GitHub App:

- **PR opened/updated** → preview deploy at `<branch>.pearl-site.pages.dev`
- **Merge to main** → production deploy to `getpearl.dev` (< 5 min)
- **Non-site changes** → build skipped (watch paths: `packages/site/**`)

### CF Pages Build Configuration

| Setting | Value |
|---------|-------|
| Framework preset | Astro |
| Build command | `pnpm --filter @pearl/site build` |
| Build output directory | `packages/site/dist` |
| Root directory | `/` |
| Node.js version | `24` (matches `.nvmrc`) |
| Build watch paths | `packages/site/**` |

### Required Setup (one-time)

1. Create CF Pages project named `pearl-site` in Cloudflare dashboard
2. Connect via GitHub App, scoped to `htxryan/pearl` only
3. Configure build settings per table above
4. Add custom domain `getpearl.dev` in Pages > Custom domains
5. Enable "Require approval for outside contributors" in Pages > Settings
6. Verify: no environment variables set (build must be hermetic)

### Post-Setup Verification

```bash
# GitHub App scoped to single repo
gh api /user/installations --jq '.installations[] | select(.app_slug | contains("cloudflare")) | .repository_selection'
# Should print: "selected" (not "all")

# CF Pages build env is empty (hermetic build)
curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/pearl-site" \
  | jq '.result.deployment_configs.production.env_vars // {} | length'
# Should print: 0

# All 5 security headers present
curl -sI https://getpearl.dev/ | grep -iE '^(content-security-policy|strict-transport|x-content-type|referrer-policy|permissions-policy):'
```

## CI Checks

All checks run on PRs touching `packages/site/**`:

| Check | Workflow | Blocking |
|-------|----------|----------|
| Security headers match golden file | `site-ci.yml` | Yes |
| Pagefind index integrity | `site-ci.yml` | Yes |
| Internal links (offline) | `site-ci.yml` | Yes |
| Lighthouse budgets | `site-ci.yml` | Yes |
| Post-deploy smoke | `site-smoke.yml` | Yes |
| External links | `site-links-external.yml` | No (weekly) |

## Security Headers

The `public/_headers` file defines the Cloudflare Pages headers envelope. Changes must also update the golden file at `docs/specs/headers-golden.txt` — CI enforces byte-for-byte parity.

Headers served:
- `Content-Security-Policy` (CSP with `frame-ancestors 'none'`, `base-uri 'self'`)
- `Strict-Transport-Security` (HSTS preload, 2-year max-age)
- `Referrer-Policy` (strict-origin-when-cross-origin)
- `X-Content-Type-Options` (nosniff)
- `Permissions-Policy` (all features denied)
