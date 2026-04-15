# Proof: Server Mode Verification (beads-gui-w90)

**Date**: 2026-04-12
**Epic**: Prove It: Server mode verification
**Depends on**: beads-gui-j0y (Epic: Server mode — pure connect to external Dolt)

## Summary

Server mode works end-to-end: standalone Dolt SQL server, backend connecting as external client, health checks, reads, writes, full test suite, clean typecheck. One bug found and fixed during verification (metadata key mismatch between `bd` CLI and backend config).

---

## Checklist Results

| # | Check | Result | Details |
|---|-------|--------|---------|
| 1 | Start standalone dolt sql-server on port 3307 | PASS | `dolt sql-server --host 127.0.0.1 --port 3307` started, `SELECT 1` confirmed |
| 2 | Configure bd for server mode | PASS | `bd dolt set host 127.0.0.1; bd dolt set port 3307` — wrote `dolt_server_host`/`dolt_server_port` to metadata.json |
| 3 | Set DOLT_MODE=server | PASS | metadata.json `dolt_mode: "server"` |
| 4 | Start backend — no subprocess started | PASS | Logs: "Connecting to external Dolt SQL server at 127.0.0.1:3307" — no "Starting Dolt SQL server" or "[replica]" messages |
| 5 | GET /api/health returns healthy | PASS | HTTP 200, `{"status":"healthy","dolt_server":"running","uptime_seconds":0,"version":"0.1.0"}` |
| 6 | GET /api/issues returns data | PASS | Returns 100 issues from the Dolt database via connection pool |
| 7 | POST /api/issues creates issue | PASS | Created beads-gui-1y1 and beads-gui-1y7; both verified via `bd show` and GET /api/issues/:id |
| 8 | All unit tests pass | PASS | 324 tests (84 backend + 240 frontend), 0 failures |
| 9 | Typecheck clean | PASS | All 3 packages (shared, backend, frontend) — zero errors |

---

## Bug Found and Fixed

### Metadata key mismatch between `bd` CLI and backend config

**Problem**: `bd dolt set host` writes `dolt_server_host` to metadata.json, but `config.ts` only reads `dolt_host`. Same for port. This caused the backend to throw: `"dolt_mode is 'server' but no dolt_host configured"`.

**Fix** (packages/backend/src/config.ts):
- Line 57: Added fallback `metadata?.dolt_server_host` after `metadata?.dolt_host`
- Line 69: Added fallback `metadata?.dolt_server_port` after `metadata?.dolt_port`
- Updated `BeadsMetadata` interface to include `dolt_server_host` and `dolt_server_port`

**Verification**: After fix, backend starts cleanly reading either key format.

## Discovery: --no-auto-commit causes stale reads

**Observation**: When the standalone Dolt server is started with `--no-auto-commit`, pool connections hold a stale snapshot. After `bd` CLI writes (which create Dolt commits), existing pool connections don't see the new data until they reconnect or start a new transaction.

**Resolution**: Restarting the Dolt server without `--no-auto-commit` fixed the issue. Write-then-read cycle works correctly with autocommit enabled. The DoltServerManager uses `--no-auto-commit` for embedded mode (where it controls the server), but standalone server mode users should not use this flag.

---

## Evidence Logs

### 1. Standalone Dolt server startup
```
$ dolt sql-server --host 127.0.0.1 --port 3307
$ dolt --host 127.0.0.1 --port 3307 --user root --password "" --no-tls sql -q "SELECT 1 as alive"
+-------+
| alive |
+-------+
| 1     |
+-------+

$ dolt --host 127.0.0.1 --port 3307 --user root --password "" --no-tls sql -q "SHOW DATABASES"
+--------------------+
| Database           |
+--------------------+
| beads_gui          |
| information_schema |
| mysql              |
+--------------------+
```

### 2. bd server mode configuration
```
$ bd dolt set host 127.0.0.1
Set host = 127.0.0.1 (in metadata.json)

$ bd dolt set port 3307
Set port = 3307 (in metadata.json)
```

metadata.json after configuration:
```json
{
  "database": "dolt",
  "backend": "dolt",
  "dolt_mode": "server",
  "dolt_server_host": "127.0.0.1",
  "dolt_server_port": 3307,
  "dolt_database": "beads_gui",
  "project_id": "9b3071dc-35f6-4e10-b11b-67c92ac20347"
}
```

### 3. Backend startup in server mode
```
  Beads GUI Backend running at http://127.0.0.1:3456
  Dolt SQL server on port 3307

[20:43:05] INFO: Connecting to external Dolt SQL server at 127.0.0.1:3307...
[20:43:05] INFO: Connection pool created for external Dolt server
[20:43:05] INFO: Server listening at http://127.0.0.1:3456
```

Key: No "Starting Dolt SQL server" or "[replica]" messages — confirms no subprocess spawned.

### 4. Health endpoint
```
$ curl -s http://127.0.0.1:3456/api/health
{"status":"healthy","dolt_server":"running","uptime_seconds":0,"version":"0.1.0"}

$ curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3456/api/health
200
```

### 5. Issues list endpoint
```
$ curl -s http://127.0.0.1:3456/api/issues | python3 -c "import json,sys; print(f'Total issues: {len(json.load(sys.stdin))}')"
Total issues: 100
```

### 6. Create issue (write path)
```
$ curl -s -X POST http://127.0.0.1:3456/api/issues \
  -H "Content-Type: application/json" \
  -d '{"title": "Test issue from server mode verification", ...}'

{
    "success": true,
    "data": {
        "id": "beads-gui-1y1",
        "title": "Test issue from server mode verification",
        "status": "open",
        ...
    }
}
```

Verified via bd CLI:
```
$ bd show beads-gui-1y1
○ beads-gui-1y1 · Test issue from server mode verification   [● P2 · OPEN]
```

Verified via GET endpoint (after autocommit fix):
```
$ curl -s http://127.0.0.1:3456/api/issues/beads-gui-1y1
{"id":"beads-gui-1y1","title":"Test issue from server mode verification","status":"open",...}
```

### 7. Write-then-read cycle
```
$ curl -s -X POST http://127.0.0.1:3456/api/issues \
  -d '{"title": "Write-then-read verification", ...}'
→ id: beads-gui-1y7

$ curl -s http://127.0.0.1:3456/api/issues/beads-gui-1y7
→ Status: open - Title: Write-then-read verification
```

### 8. Test suite (324 tests)
```
Backend:  7 test files, 84 tests passed
Frontend: 13 test files, 240 tests passed
Total:    324 tests, 0 failures
```

### 9. Typecheck
```
packages/shared typecheck: Done
packages/backend typecheck: Done
packages/frontend typecheck: Done
```
