#!/usr/bin/env bash
# N5 invariant: enforce per-icon lucide-react imports.
#
# Checks:
# 1. No wildcard imports (import * from "lucide-react")
# 2. No default imports (import Icons from "lucide-react")
# 3. No combined imports (import Icons, { Check } from "lucide-react")
# 4. Per-file named import count <= MAX_NAMES (default 10)
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

# Use perl for all checks — handles multiline imports and all edge cases
while IFS= read -r file; do
  VIOLATIONS=$(perl -0777 -ne '
    # Check 1: wildcard imports (import * as X from "lucide-react")
    while (/import\s+\*\s+as\s+\w+\s+from\s*"lucide-react"/gs) {
      print "wildcard\n";
    }

    # Check 2: default imports (import Foo from "lucide-react") — no braces
    while (/import\s+([a-zA-Z_]\w*)(?:\s+from\s*"lucide-react")/gs) {
      my $name = $1;
      next if $name eq "type";
      print "default:$name\n";
    }

    # Check 3: combined imports (import Foo, { Bar } from "lucide-react")
    while (/import\s+([a-zA-Z_]\w*)\s*,\s*\{[^}]*\}\s*from\s*"lucide-react"/gs) {
      print "combined:$1\n";
    }
  ' "$file")

  if [ -n "$VIOLATIONS" ]; then
    while IFS= read -r v; do
      case "$v" in
        wildcard)
          echo "N5 VIOLATION: wildcard import from lucide-react in $file"
          ;;
        default:*)
          echo "N5 VIOLATION: default import '${v#default:}' from lucide-react in $file"
          ;;
        combined:*)
          echo "N5 VIOLATION: combined default+named import '${v#combined:}' from lucide-react in $file"
          ;;
      esac
      ERRORS=$((ERRORS + 1))
    done <<< "$VIOLATIONS"
  fi

  # Check 4: Per-file named import count
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
