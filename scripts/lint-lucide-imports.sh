#!/usr/bin/env bash
# N5 invariant: reject lucide-react barrel imports with > 4 named exports.
# Usage: ./scripts/lint-lucide-imports.sh [max_names]
# Exit 0 = pass, Exit 1 = violations found.

set -euo pipefail

MAX_NAMES=${1:-4}
VIOLATIONS=0

while IFS= read -r file; do
  # Extract all import-from-lucide blocks (handles multi-line imports)
  perl -0777 -ne '
    while (/import\s*\{([^}]+)\}\s*from\s*"lucide-react"/g) {
      my $names = $1;
      my @items = grep { /\S/ } split(/,/, $names);
      my $count = scalar @items;
      if ($count > '"$MAX_NAMES"') {
        print "VIOLATION ($count names): '"'"'$ENV{FILE}'"'"'\n";
        print "  import { " . join(", ", map { s/^\s+|\s+$//gr } @items) . " } from \"lucide-react\"\n\n";
      }
    }
  ' "$file"
done < <(find packages/frontend/src -name '*.tsx' -o -name '*.ts' | sort)

# Re-run to count violations for exit code
COUNT=$(find packages/frontend/src \( -name '*.tsx' -o -name '*.ts' \) -print0 | \
  xargs -0 perl -0777 -ne '
    while (/import\s*\{([^}]+)\}\s*from\s*"lucide-react"/g) {
      my @items = grep { /\S/ } split(/,/, $1);
      print "v\n" if scalar @items > '"$MAX_NAMES"';
    }
  ' | wc -l)

if [ "$COUNT" -gt 0 ]; then
  echo "N5 FAILED: $COUNT lucide-react import(s) exceed $MAX_NAMES named exports."
  echo "Split large imports into multiple statements with <= $MAX_NAMES names each."
  exit 1
else
  echo "N5 PASSED: all lucide-react imports have <= $MAX_NAMES named exports."
  exit 0
fi
