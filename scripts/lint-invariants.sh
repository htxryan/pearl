#!/usr/bin/env bash
# Negative invariant gates for the shadcn/BaseUI migration (spec §8.5).
#
# N2: No data-[state= Tailwind classes (Radix-era selectors)
# N3: No asChild prop usage (BaseUI uses render prop instead)
# N4: No --color-* tokens outside @theme inline blocks
# N6: dangerouslySetInnerHTML count must not exceed baseline
#
# N1 is enforced by TypeScript (dead imports cause tsc errors).
# N5 is enforced by lint-lucide-imports.sh.
#
# Usage: ./scripts/lint-invariants.sh
# Exit 0 = pass, Exit 1 = violations found.

set -euo pipefail

FRONTEND_SRC="packages/frontend/src"
ERRORS=0
N6_BASELINE=0

count_grep() {
  local pattern=$1; shift
  local count=0
  count=$(grep -rc -- "$pattern" "$@" 2>/dev/null | awk -F: '{s+=$2} END {print s+0}' || true)
  echo "${count:-0}"
}

# --- N2: No data-[state= Tailwind variants ---
N2_COUNT=$(count_grep 'data-\[state=' "$FRONTEND_SRC" --include='*.tsx' --include='*.ts' --include='*.css')
if [ "$N2_COUNT" -gt 0 ]; then
  echo "N2 VIOLATION: found $N2_COUNT occurrences of data-[state= (Radix-era selector)"
  grep -rn -- 'data-\[state=' "$FRONTEND_SRC" --include='*.tsx' --include='*.ts' --include='*.css' 2>/dev/null || true
  ERRORS=$((ERRORS + 1))
else
  echo "N2 PASSED: no data-[state= selectors found."
fi

# --- N3: No asChild prop ---
N3_COUNT=$(count_grep 'asChild' "$FRONTEND_SRC" --include='*.tsx' --include='*.ts')
if [ "$N3_COUNT" -gt 0 ]; then
  echo "N3 VIOLATION: found $N3_COUNT occurrences of asChild prop"
  grep -rn -- 'asChild' "$FRONTEND_SRC" --include='*.tsx' --include='*.ts' 2>/dev/null || true
  ERRORS=$((ERRORS + 1))
else
  echo "N3 PASSED: no asChild prop usage found."
fi

# --- N4: No --color-* tokens outside @theme inline ---
N4_FILES=(
  "$FRONTEND_SRC/index.css"
  "$FRONTEND_SRC/hooks/use-theme.ts"
)

N4_PATTERN='(--color-|var\(--color-)(background|foreground|primary|secondary|accent|destructive|muted|popover|card|border|input|ring|success|info|warning|danger|surface)'

N4_VIOLATIONS=0
for f in "${N4_FILES[@]}"; do
  if [ ! -f "$f" ]; then
    continue
  fi

  if [ "$f" = "$FRONTEND_SRC/index.css" ]; then
    HITS=$(perl -ne '
      if (/\@theme\s+inline\s*\{/) { $in_theme = 1; next }
      if ($in_theme && /^\s*\}/) { $in_theme = 0; next }
      next if $in_theme;
      print if /(--color-|var\(--color-)(background|foreground|primary|secondary|accent|destructive|muted|popover|card|border|input|ring|success|info|warning|danger|surface)/;
    ' "$f")
  else
    HITS=$(grep -E "$N4_PATTERN" "$f" 2>/dev/null || true)
  fi

  if [ -n "$HITS" ]; then
    echo "N4 VIOLATION in $f:"
    echo "$HITS"
    N4_VIOLATIONS=$((N4_VIOLATIONS + 1))
  fi
done

if [ -d "$FRONTEND_SRC/themes" ]; then
  THEME_HITS=$(grep -rE "$N4_PATTERN" "$FRONTEND_SRC/themes" --include='*.ts' --include='*.tsx' 2>/dev/null || true)
  if [ -n "$THEME_HITS" ]; then
    echo "N4 VIOLATION in themes/:"
    echo "$THEME_HITS"
    N4_VIOLATIONS=$((N4_VIOLATIONS + 1))
  fi
fi

if [ "$N4_VIOLATIONS" -gt 0 ]; then
  echo "N4 FAILED: --color-* tokens found outside @theme inline block."
  ERRORS=$((ERRORS + 1))
else
  echo "N4 PASSED: no --color-* tokens outside @theme inline."
fi

# --- N6: dangerouslySetInnerHTML count ---
N6_COUNT=$(count_grep 'dangerouslySetInnerHTML' "$FRONTEND_SRC" --include='*.tsx' --include='*.ts')
if [ "$N6_COUNT" -gt "$N6_BASELINE" ]; then
  echo "N6 VIOLATION: dangerouslySetInnerHTML count is $N6_COUNT (baseline: $N6_BASELINE)"
  grep -rn -- 'dangerouslySetInnerHTML' "$FRONTEND_SRC" --include='*.tsx' --include='*.ts' 2>/dev/null || true
  ERRORS=$((ERRORS + 1))
else
  echo "N6 PASSED: dangerouslySetInnerHTML count ($N6_COUNT) within baseline ($N6_BASELINE)."
fi

# --- Summary ---
echo
if [ "$ERRORS" -gt 0 ]; then
  echo "INVARIANTS FAILED: $ERRORS gate(s) violated."
  exit 1
else
  echo "ALL INVARIANTS PASSED: N2, N3, N4, N6 gates green."
  exit 0
fi
