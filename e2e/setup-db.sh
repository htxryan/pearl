#!/usr/bin/env bash
# Setup the sample-project Dolt database for E2E tests.
# Idempotent: skips if database already exists.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DB_DIR="$REPO_ROOT/sample-project/.beads/embeddeddolt/sample_project"
SEED_SQL="$SCRIPT_DIR/seed.sql"

if [ ! -f "$SEED_SQL" ]; then
  echo "ERROR: seed.sql not found at $SEED_SQL" >&2
  exit 1
fi

# Skip if database already initialized (has .dolt directory)
if [ -d "$DB_DIR/.dolt" ]; then
  echo "Database already initialized at $DB_DIR, skipping."
  exit 0
fi

echo "Initializing Dolt database at $DB_DIR..."
mkdir -p "$DB_DIR"
cd "$DB_DIR"
dolt init --name "CI" --email "ci@test.local"

echo "Importing seed data..."
dolt sql < "$SEED_SQL"
dolt add .
dolt commit -m "Seed E2E test data"

echo "Database seeded successfully."
