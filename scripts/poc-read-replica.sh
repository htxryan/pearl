#!/bin/bash
# ─────────────────────────────────────────────────────────
# POC: Read Replica for Dolt Embedded Lock Resolution
#
# Proves that:
# 1. bd CLI can write to the primary DB (no lock conflict)
# 2. A Dolt SQL server on a replica can serve reads
# 3. dolt_pull syncs writes from primary → replica through the running server
# ─────────────────────────────────────────────────────────
set -euo pipefail

PRIMARY_DIR="$(pwd)/.beads/embeddeddolt/beads_gui"
REPLICA_PARENT="/tmp/beads-read-replica-poc"
REPLICA_DIR="$REPLICA_PARENT/beads_gui"
REPLICA_PORT=3308
DB_NAME="beads_gui"

log() { echo -e "\n\033[1;34m=== $1 ===\033[0m"; }
ok()  { echo -e "  \033[1;32m✓ $1\033[0m"; }
fail() { echo -e "  \033[1;31m✗ $1\033[0m"; }

cleanup() {
  log "Cleanup"
  kill "$SQL_PID" 2>/dev/null || true
  wait "$SQL_PID" 2>/dev/null || true
  rm -rf "$REPLICA_PARENT"
  ok "Cleaned up replica and SQL server"
}
trap cleanup EXIT

# ─── Step 1: Verify primary exists ───
log "Step 1: Verify primary DB exists"
if [ ! -d "$PRIMARY_DIR/.dolt" ]; then
  fail "Primary DB not found at $PRIMARY_DIR"
  exit 1
fi
ISSUE_COUNT_BEFORE=$(cd "$PRIMARY_DIR" && dolt sql -q "SELECT count(*) as cnt FROM issues" -r csv 2>/dev/null | tail -1)
ok "Primary DB exists with $ISSUE_COUNT_BEFORE issues"

# ─── Step 2: Create replica via copy + remote ───
log "Step 2: Create read replica"
rm -rf "$REPLICA_PARENT"
mkdir -p "$REPLICA_PARENT"
cp -r "$PRIMARY_DIR" "$REPLICA_DIR"
cd "$REPLICA_DIR"
# Remove any existing remotes, add primary as file:// remote
dolt remote remove origin 2>/dev/null || true
dolt remote add primary "file://${PRIMARY_DIR}" 2>/dev/null || true
REMOTES=$(dolt remote -v 2>/dev/null | head -5)
cd - > /dev/null
ok "Replica created at $REPLICA_DIR"
echo "  Remotes: $REMOTES"

# ─── Step 3: Start SQL server on REPLICA ───
log "Step 3: Start Dolt SQL server on replica (port $REPLICA_PORT)"
cd "$REPLICA_PARENT"
dolt sql-server --host 127.0.0.1 --port "$REPLICA_PORT" --no-auto-commit &
SQL_PID=$!
cd - > /dev/null
sleep 3

# Verify it's running
if kill -0 "$SQL_PID" 2>/dev/null; then
  ok "SQL server running (PID $SQL_PID)"
else
  fail "SQL server failed to start"
  exit 1
fi

# ─── Step 4: Verify reads work through replica ───
log "Step 4: Verify reads from replica SQL server"
REPLICA_COUNT=$(mysql -h 127.0.0.1 -P "$REPLICA_PORT" -u root -N -e "SELECT count(*) FROM issues" "$DB_NAME" 2>/dev/null)
if [ "$REPLICA_COUNT" = "$ISSUE_COUNT_BEFORE" ]; then
  ok "Replica serves $REPLICA_COUNT issues (matches primary)"
else
  fail "Replica count ($REPLICA_COUNT) != primary count ($ISSUE_COUNT_BEFORE)"
  exit 1
fi

# ─── Step 5: Write to PRIMARY via bd CLI ───
log "Step 5: Write to primary via bd CLI (the critical test)"
echo "  Attempting: bd create --title='POC read-replica test' --type=task --priority=4"
BD_OUTPUT=$(bd create --title="POC read-replica test $(date +%s)" --type=task --priority=4 2>&1) || true
echo "  bd output: $BD_OUTPUT"

if echo "$BD_OUTPUT" | grep -q "Created issue"; then
  ok "bd CLI write SUCCEEDED (no lock error!)"
  NEW_ID=$(echo "$BD_OUTPUT" | grep -o 'beads-gui-[a-z0-9]*')
  echo "  New issue: $NEW_ID"
else
  fail "bd CLI write FAILED"
  echo "  This means the primary is still locked. Check for stale processes."
  exit 1
fi

# ─── Step 6: Verify primary has the new issue ───
log "Step 6: Verify primary has the new issue"
PRIMARY_COUNT_AFTER=$(cd "$PRIMARY_DIR" && dolt sql -q "SELECT count(*) as cnt FROM issues" -r csv 2>/dev/null | tail -1)
ok "Primary now has $PRIMARY_COUNT_AFTER issues (was $ISSUE_COUNT_BEFORE)"

# ─── Step 7: Sync replica via dolt_pull through SQL ───
log "Step 7: Sync replica from primary"

# First check what branch we're on and what remotes/branches exist
CURRENT_BRANCH=$(mysql -h 127.0.0.1 -P "$REPLICA_PORT" -u root -N -e "SELECT active_branch()" "$DB_NAME" 2>/dev/null)
echo "  Current branch: $CURRENT_BRANCH"

# Fetch from primary
echo "  Fetching from primary..."
FETCH_RESULT=$(mysql -h 127.0.0.1 -P "$REPLICA_PORT" -u root -N -e "CALL dolt_fetch('primary')" "$DB_NAME" 2>&1) || true
echo "  Fetch result: $FETCH_RESULT"

# List remote branches to find the right ref
REMOTE_BRANCHES=$(mysql -h 127.0.0.1 -P "$REPLICA_PORT" -u root -N -e "SELECT name FROM dolt_branches WHERE name LIKE 'remotes/%'" "$DB_NAME" 2>/dev/null) || true
echo "  Remote branches: $REMOTE_BRANCHES"

# Try merge with the current branch name from primary
echo "  Merging primary/$CURRENT_BRANCH..."
MERGE_RESULT=$(mysql -h 127.0.0.1 -P "$REPLICA_PORT" -u root -N -e "CALL dolt_merge('primary/$CURRENT_BRANCH')" "$DB_NAME" 2>&1) || true
echo "  Merge result: $MERGE_RESULT"

# If that didn't work, try a hard reset to the fetched ref
if echo "$MERGE_RESULT" | grep -qi "error\|not found"; then
  echo "  Trying dolt_reset to primary/$CURRENT_BRANCH..."
  RESET_RESULT=$(mysql -h 127.0.0.1 -P "$REPLICA_PORT" -u root -N -e "CALL dolt_reset('--hard', 'primary/$CURRENT_BRANCH')" "$DB_NAME" 2>&1) || true
  echo "  Reset result: $RESET_RESULT"
fi

# Last resort: check remote tracking refs
REFS=$(mysql -h 127.0.0.1 -P "$REPLICA_PORT" -u root -N -e "SELECT * FROM dolt_remote_branches" "$DB_NAME" 2>&1) || true
echo "  Remote tracking refs: $REFS"

# ─── Step 8: Verify replica sees the new issue ───
log "Step 8: Verify replica sees the new issue after sync"
REPLICA_COUNT_AFTER=$(mysql -h 127.0.0.1 -P "$REPLICA_PORT" -u root -N -e "SELECT count(*) FROM issues" "$DB_NAME" 2>/dev/null)
if [ "$REPLICA_COUNT_AFTER" = "$PRIMARY_COUNT_AFTER" ]; then
  ok "Replica synced! Now has $REPLICA_COUNT_AFTER issues (matches primary)"
else
  fail "Replica count ($REPLICA_COUNT_AFTER) != primary count ($PRIMARY_COUNT_AFTER)"
  echo "  Sync may need a different approach"
fi

# ─── Step 9: Verify the specific new issue is readable ───
log "Step 9: Verify new issue is queryable through replica"
if [ -n "${NEW_ID:-}" ]; then
  FOUND=$(mysql -h 127.0.0.1 -P "$REPLICA_PORT" -u root -N -e "SELECT title FROM issues WHERE id='$NEW_ID'" "$DB_NAME" 2>/dev/null)
  if [ -n "$FOUND" ]; then
    ok "New issue found in replica: $FOUND"
  else
    fail "New issue $NEW_ID not found in replica"
  fi
fi

# ─── Summary ───
log "POC Summary"
echo "  Primary DB: $PRIMARY_DIR"
echo "  Replica DB: $REPLICA_DIR"
echo "  SQL Server: port $REPLICA_PORT (PID $SQL_PID)"
echo "  Issues before: $ISSUE_COUNT_BEFORE"
echo "  Issues after (primary): $PRIMARY_COUNT_AFTER"
echo "  Issues after (replica): $REPLICA_COUNT_AFTER"
echo ""
if [ "$REPLICA_COUNT_AFTER" = "$PRIMARY_COUNT_AFTER" ]; then
  echo -e "  \033[1;32m✓ READ REPLICA APPROACH WORKS\033[0m"
  echo "  bd CLI writes succeed without lock errors"
  echo "  SQL server reads stay current via dolt_pull"
  echo "  No code changes needed to write service"
else
  echo -e "  \033[1;33m⚠ PARTIAL SUCCESS — sync needs investigation\033[0m"
fi
