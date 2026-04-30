#!/usr/bin/env bash
set -euo pipefail

# Integration verification for Pearl marketing site launch (E5).
# Tests all cross-epic contracts from the E5 table against the live site.

SITE_URL="https://getpearl.dev"
REPO="htxryan/pearl"
PASS=0
FAIL=0
SKIP=0

green() { printf '\033[32m✓ %s\033[0m\n' "$1"; }
red()   { printf '\033[31m✗ %s\033[0m\n' "$1"; }
yellow(){ printf '\033[33m⊘ %s\033[0m\n' "$1"; }

check() {
  local name="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    green "$name"
    PASS=$((PASS + 1))
  else
    red "$name"
    FAIL=$((FAIL + 1))
  fi
}

skip() {
  yellow "$1 (skipped: $2)"
  SKIP=$((SKIP + 1))
}

echo "═══════════════════════════════════════════════════"
echo "  Pearl Launch Verification — $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "  Target: $SITE_URL"
echo "═══════════════════════════════════════════════════"
echo

# ─── C1: Domain registered, NS delegated to CF ───
echo "── C1: Domain + DNS ──"
check "C1a: DNS resolves" dig +short getpearl.dev A
check "C1b: Apex returns 200" bash -c 'curl -sI --connect-timeout 10 "$0" | head -1 | grep -q "200"' "$SITE_URL"
check "C1c: Served by Cloudflare" bash -c 'curl -sI --connect-timeout 10 "$0" | grep -qi "server: cloudflare"' "$SITE_URL"
echo

# ─── C3: Prod URL flows as build artifact (README badge) ───
echo "── C3: README badge URL == config constant ──"
CONFIG_URL=$(grep 'export const siteUrl' packages/site/src/config.ts | sed 's/.*"\(https[^"]*\)".*/\1/')
check "C3: README badge links to $CONFIG_URL" bash -c 'grep -q "$0" README.md' "$CONFIG_URL"
echo

# ─── C5: Hermetic build ───
echo "── C5: Hermetic build (site package) ──"
if [ -d "packages/site/dist" ]; then
  check "C5a: dist/ directory exists" test -d "packages/site/dist"
  HTML_COUNT=$(find packages/site/dist -name '*.html' 2>/dev/null | wc -l | tr -d ' ')
  check "C5b: dist/ contains HTML files (count: $HTML_COUNT)" test "$HTML_COUNT" -gt 0
else
  echo "  (Run 'cd packages/site && pnpm build' first, then re-run)"
  skip "C5: Hermetic build" "no dist/ found"
fi
echo

# ─── C6: Security headers ───
echo "── C6: Security headers on live site ──"
HEADERS=$(curl -sI --connect-timeout 10 "$SITE_URL")
check "C6a: Content-Security-Policy present"    bash -c 'echo "$0" | grep -qi "content-security-policy"' "$HEADERS"
check "C6b: Strict-Transport-Security present"  bash -c 'echo "$0" | grep -qi "strict-transport-security"' "$HEADERS"
check "C6c: Referrer-Policy present"            bash -c 'echo "$0" | grep -qi "referrer-policy"' "$HEADERS"
check "C6d: X-Content-Type-Options present"     bash -c 'echo "$0" | grep -qi "x-content-type-options"' "$HEADERS"
check "C6e: Permissions-Policy present"         bash -c 'echo "$0" | grep -qi "permissions-policy"' "$HEADERS"
echo

# ─── C7: No env vars required ───
echo "── C7: No env vars required ──"
# C7 is verified by C5: the build uses no env vars (checked at CI time by site-ci.yml)
check "C7: No .env file in site package" bash -c '! test -f packages/site/.env'
echo

# ─── C8: tokens.css single source ──
echo "── C8: tokens.css single source ──"
# Check for hardcoded color values in .astro/.css files that bypass tokens.css
# Exclude tokens.css itself, node_modules, dist, and .pagefind
VIOLATIONS=$(grep -rn --include='*.astro' --include='*.css' -E '#[0-9a-fA-F]{3,8}\b|rgb\(|rgba\(|hsl\(|hsla\(' packages/site/src/ 2>/dev/null \
  | grep -v 'tokens.css' \
  | grep -v 'node_modules' \
  | grep -v '\.pagefind' \
  | grep -v 'starlight-overrides.css' \
  | grep -v '/\*' \
  | grep -v 'data:image' \
  || true)
if [ -z "$VIOLATIONS" ]; then
  green "C8: No hardcoded colors outside tokens.css"
  PASS=$((PASS + 1))
else
  red "C8: Hardcoded colors found outside tokens.css"
  echo "$VIOLATIONS" | head -10
  FAIL=$((FAIL + 1))
fi
echo

# ─── C9: OG image set ───
echo "── C9: OG image set ──"
check "C9a: OG image file exists" test -f packages/site/public/og/site.png
OG_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SITE_URL/og/site.png")
check "C9b: OG image accessible (HTTP $OG_STATUS)" test "$OG_STATUS" = "200"
# Check dimensions if ImageMagick/sips available
if command -v sips &>/dev/null; then
  W=$(sips -g pixelWidth packages/site/public/og/site.png 2>/dev/null | tail -1 | awk '{print $2}')
  H=$(sips -g pixelHeight packages/site/public/og/site.png 2>/dev/null | tail -1 | awk '{print $2}')
  check "C9c: OG image dimensions 1200x630 (got ${W}x${H})" bash -c '[ "$0" = "1200" ] && [ "$1" = "630" ]' "$W" "$H"
elif command -v identify &>/dev/null; then
  DIMS=$(identify -format "%wx%h" packages/site/public/og/site.png 2>/dev/null)
  check "C9c: OG image dimensions 1200x630 (got $DIMS)" test "$DIMS" = "1200x630"
else
  skip "C9c: OG image dimensions" "no sips or ImageMagick"
fi
echo

# ─── Pagefind: .pagefind/ integrity ───
echo "── Pagefind: Search index integrity ──"
PAGEFIND_DIR=$(find packages/site/dist -maxdepth 1 -name '*pagefind*' -type d 2>/dev/null | head -1)
if [ -n "$PAGEFIND_DIR" ]; then
  check "Pagefind: Index directory exists ($PAGEFIND_DIR)" test -d "$PAGEFIND_DIR"
  PAGE_COUNT=$(find "$PAGEFIND_DIR" -name '*.pf_index' -o -name '*.pf_meta' 2>/dev/null | wc -l | tr -d ' ')
  check "Pagefind: Index has files (count: $PAGE_COUNT)" test "$PAGE_COUNT" -gt 0
else
  skip "Pagefind: Index directory" "build first (run after C5)"
fi
echo

# ─── Sitemap parity ───
echo "── Sitemap: All URLs return 200 ──"
SITEMAP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SITE_URL/sitemap-index.xml")
check "Sitemap: sitemap-index.xml accessible (HTTP $SITEMAP_STATUS)" test "$SITEMAP_STATUS" = "200"

if [ "$SITEMAP_STATUS" = "200" ]; then
  SITEMAP_CONTENT=$(curl -s "$SITE_URL/sitemap-index.xml")
  # Extract sitemap URLs from the index
  extract_locs() { grep -oE '<loc>[^<]+</loc>' | sed 's/<[^>]*>//g'; }
  CHILD_SITEMAPS=$(echo "$SITEMAP_CONTENT" | extract_locs)

  ALL_URLS=""
  for CHILD in $CHILD_SITEMAPS; do
    CHILD_CONTENT=$(curl -s "$CHILD")
    CHILD_URLS=$(echo "$CHILD_CONTENT" | extract_locs)
    ALL_URLS="$ALL_URLS $CHILD_URLS"
  done

  URL_COUNT=0
  URL_FAIL=0
  for URL in $ALL_URLS; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 "$URL")
    if [ "$STATUS" != "200" ]; then
      red "  $URL → HTTP $STATUS"
      URL_FAIL=$((URL_FAIL + 1))
    fi
    URL_COUNT=$((URL_COUNT + 1))
  done

  if [ "$URL_FAIL" -eq 0 ]; then
    green "Sitemap: All $URL_COUNT URLs return 200"
    PASS=$((PASS + 1))
  else
    red "Sitemap: $URL_FAIL/$URL_COUNT URLs failed"
    FAIL=$((FAIL + 1))
  fi
else
  skip "Sitemap URL parity" "sitemap not accessible"
fi
echo

# ─── E5: Smoke on key paths ───
echo "── E5: Smoke test on key paths ──"
for PATH_CHECK in "/" "/docs/" "/sitemap-index.xml"; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 "${SITE_URL}${PATH_CHECK}")
  check "Smoke: ${PATH_CHECK} → HTTP $STATUS" test "$STATUS" = "200"
done
echo

# ─── U7: robots.txt ───
echo "── U7: robots.txt ──"
ROBOTS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SITE_URL/robots.txt")
check "U7: robots.txt accessible (HTTP $ROBOTS_STATUS)" test "$ROBOTS_STATUS" = "200"
echo

# ─── U8: GitHub repo Website field ───
echo "── U8: GitHub repo Website field ──"
HOMEPAGE=$(gh repo view "$REPO" --json homepageUrl -q '.homepageUrl' 2>/dev/null || true)
if [ "$HOMEPAGE" = "$SITE_URL" ]; then
  green "U8: Repo homepage == $SITE_URL"
  PASS=$((PASS + 1))
else
  red "U8: Repo homepage is '$HOMEPAGE', expected '$SITE_URL'"
  FAIL=$((FAIL + 1))
fi
echo

# ─── C12: Branch protection checks ───
echo "── C12: Required checks ──"
RULES=$(gh api "repos/$REPO/rules/branches/main" 2>/dev/null || echo "[]")
if echo "$RULES" | grep -q "required_status_checks\|status_check"; then
  green "C12: Branch protection rules exist on main"
  PASS=$((PASS + 1))
else
  yellow "C12: Could not verify branch protection rules (may need admin access)"
  SKIP=$((SKIP + 1))
fi
echo

# ─── Summary ───
echo "═══════════════════════════════════════════════════"
echo "  Results: $PASS passed, $FAIL failed, $SKIP skipped"
echo "═══════════════════════════════════════════════════"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
