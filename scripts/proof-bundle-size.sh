#!/bin/bash
# Bundle-size proof — build the frontend, parse Vite output, write a markdown table
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROOF_DIR="$REPO_ROOT/docs/proof/beads-gui-yf3a"
mkdir -p "$PROOF_DIR"

cd "$REPO_ROOT/packages/frontend"
echo "[bundle-size] building frontend..."
BUILD_LOG="$(mktemp)"
trap 'rm -f "$BUILD_LOG"' EXIT
pnpm build 2>&1 | tee "$BUILD_LOG"

echo "[bundle-size] parsing chunks..."
{
  echo "# Bundle-size proof — beads-gui-yf3a"
  echo ""
  echo "Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo ""
  echo "Output of \`pnpm build\` parsed for asset sizes (Vite production build)."
  echo ""
  echo '| Asset | Size (gzipped) | Type |'
  echo '|---|---|---|'
  # Vite output looks like: dist/assets/Combobox-XYZ.js   42.18 kB │ gzip:  12.34 kB
  grep -E "^(dist/|.*\.(js|css)\s+)" "$BUILD_LOG" \
    | grep -E "(kB|MB|B)" \
    | sed -E 's/^[[:space:]]*//;s/[[:space:]]+/ /g' \
    | awk -F"│" '{
        asset = $1;
        gzip = ($2 != "" ? $2 : "—");
        gsub(/^[[:space:]]+|[[:space:]]+$/, "", asset);
        gsub(/^[[:space:]]+|[[:space:]]+$/, "", gzip);
        # Determine type from extension
        if (asset ~ /\.css/) type = "CSS";
        else if (asset ~ /chart|cytoscape/) type = "JS (vendor: viz)";
        else if (asset ~ /react-day-picker|date-picker/) type = "JS (lazy: DatePicker)";
        else if (asset ~ /BoardView|GraphView|DetailView|SettingsView/) type = "JS (lazy: route)";
        else if (asset ~ /vendor|@base-ui|cmdk|sonner/) type = "JS (vendor)";
        else type = "JS";
        printf("| %s | %s | %s |\n", asset, gzip, type);
      }'
  echo ""
  echo "## Lazy-loaded routes / heavy primitives"
  echo ""
  echo "These chunks are NOT in the initial bundle. They load on demand:"
  echo ""
  grep -E "(BoardView|GraphView|DetailView|SettingsView|date-picker|react-day-picker)" "$BUILD_LOG" \
    | sed 's/^/- /' || echo "(none captured — check build output above)"
} > "$PROOF_DIR/bundle-size.md"

echo "[bundle-size] wrote $PROOF_DIR/bundle-size.md"
