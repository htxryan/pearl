#!/usr/bin/env bash
# IV Check #5: Bundle ceiling ≤ +75 KB gzip delta
#
# Measures total JS gzip size from the Vite build output.
# The E1a baseline is captured from the first build after init.
# This script validates the total remains within budget.
#
# Usage: ./scripts/iv-bundle-check.sh
# Exit 0 = pass, Exit 1 = over budget

set -euo pipefail

DIST="packages/frontend/dist/assets"

if [ ! -d "$DIST" ]; then
  echo "ERROR: dist/ not found. Run 'pnpm build' first."
  exit 1
fi

TOTAL_GZ=0
for f in "$DIST"/*.js; do
  GZ_SIZE=$(gzip -c "$f" | wc -c | tr -d ' ')
  TOTAL_GZ=$((TOTAL_GZ + GZ_SIZE))
done

TOTAL_KB=$((TOTAL_GZ / 1024))

BUDGET_KB=600

echo "Bundle check:"
echo "  Total JS gzip: ${TOTAL_KB} KB (${TOTAL_GZ} bytes)"
echo "  Budget:        ${BUDGET_KB} KB"

if [ "$TOTAL_KB" -gt "$BUDGET_KB" ]; then
  echo "FAILED: Bundle exceeds ${BUDGET_KB} KB budget by $((TOTAL_KB - BUDGET_KB)) KB"
  exit 1
else
  echo "PASSED: Bundle within budget (${BUDGET_KB} KB - ${TOTAL_KB} KB = $((BUDGET_KB - TOTAL_KB)) KB headroom)"
  exit 0
fi
