#!/usr/bin/env bash
# N5 invariant: enforce per-icon lucide-react imports.
#
# Checks:
# 1. No wildcard imports (import * from "lucide-react")
# 2. No default imports (import Icons from "lucide-react")
# 3. Per-file named import count <= MAX_NAMES (default 10)
#
# Biome's import organizer merges named imports from the same module
# into a single statement, so the threshold is per-file, not per-statement.
# A threshold of 10 catches barrel-import abuse while accommodating
# components that legitimately use several icons (e.g. action menus).
#
# Usage: ./scripts/lint-lucide-imports.sh [max_names]
# Exit 0 = pass, Exit 1 = violations found.

set -euo pipefail

MAX_NAMES=${1:-10}
ERRORS=0

# Check 1: No wildcard imports
WILDCARD=$(grep -rn 'import \* .* from "lucide-react"' packages/frontend/src/ 2>/dev/null || true)
if [ -n "$WILDCARD" ]; then
  echo "N5 VIOLATION: wildcard import from lucide-react (breaks tree-shaking):"
  echo "$WILDCARD"
  echo
  ERRORS=$((ERRORS + 1))
fi

# Check 2: No default imports
DEFAULT=$(grep -rn 'import [A-Z][a-zA-Z]* from "lucide-react"' packages/frontend/src/ 2>/dev/null | grep -v 'import {' || true)
if [ -n "$DEFAULT" ]; then
  echo "N5 VIOLATION: default import from lucide-react:"
  echo "$DEFAULT"
  echo
  ERRORS=$((ERRORS + 1))
fi

# Check 3: Per-file named import count
while IFS= read -r file; do
  COUNT=$(perl -0777 -ne '
    my $total = 0;
    while (/import\s*\{([^}]+)\}\s*from\s*"lucide-react"/g) {
      my @items = grep { /\S/ } split(/,/, $1);
      $total += scalar @items;
    }
    print $total;
  ' "$file")

  if [ "$COUNT" -gt "$MAX_NAMES" ]; then
    echo "N5 VIOLATION: $file imports $COUNT lucide icons (max $MAX_NAMES)"
    ERRORS=$((ERRORS + 1))
  fi
done < <(grep -rl '"lucide-react"' packages/frontend/src/ 2>/dev/null | sort)

if [ "$ERRORS" -gt 0 ]; then
  echo
  echo "N5 FAILED: $ERRORS violation(s) found."
  echo "Use per-icon named imports: import { Check } from \"lucide-react\""
  echo "Never use: import * as Icons from \"lucide-react\""
  exit 1
else
  echo "N5 PASSED: all lucide-react imports are per-icon named imports (<= $MAX_NAMES per file)."
  exit 0
fi
