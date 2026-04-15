# Proof: Embedded Replica Sync Verification

**Epic**: beads-gui-nxc  
**Date**: 2026-04-12  
**Verifier**: Claude (automated)

## Summary

All 12 checklist items from the "Prove It: Embedded replica sync verification" epic
have been verified. The embedded read replica architecture eliminates the production
write bug (database lock errors) by routing all reads through a replica and all writes
through the `bd` CLI to the primary database.

---

## Checklist Evidence

### 1. Start backend: `pnpm dev`

**Result**: PASS

Server started successfully in embedded mode:
```
[20:20:45] INFO: Starting Dolt SQL server on port 3307...
[20:20:45] INFO: Database path: .beads/embeddeddolt/sample_project
[20:20:45] INFO: [replica] Creating replica at .beads/__replica__/sample_project...
[20:20:45] INFO: [replica] Replica created, starting SQL server on replica
[20:20:46] INFO: [dolt] Server state: running
[20:20:46] INFO: Dolt SQL server is running, creating connection pool...
[20:20:46] INFO: Server listening at http://127.0.0.1:3456
```

Health check returned:
```json
{"status":"healthy","dolt_server":"running","uptime_seconds":3,"version":"0.1.0"}
```

---

### 2. POST /api/issues creates an issue -- NO LOCK ERROR

**Result**: PASS

```bash
curl -s -X POST http://127.0.0.1:3456/api/issues \
  -H 'Content-Type: application/json' \
  -d '{"title":"Test issue from verification","description":"...","type":"task","priority":2}'
```

Response (201):
```json
{
  "success": true,
  "data": {
    "id": "sample-project-mfd",
    "title": "Test issue from verification",
    "status": "open",
    "priority": 2,
    "issue_type": "task"
  },
  "invalidationHints": [{"entity":"issues"},{"entity":"stats"},{"entity":"events"}]
}
```

No lock error. Write serialized through WriteQueue, replica synced after write.

---

### 3. PATCH /api/issues/:id updates fields -- NO LOCK ERROR

**Result**: PASS

```bash
curl -s -X PATCH http://127.0.0.1:3456/api/issues/sample-project-mfd \
  -H 'Content-Type: application/json' \
  -d '{"title":"Updated test issue","priority":1}'
```

Response (200):
```json
{
  "success": true,
  "data": [{
    "id": "sample-project-mfd",
    "title": "Updated test issue",
    "priority": 1,
    "updated_at": "2026-04-12T20:21:09Z"
  }]
}
```

No lock error. Title and priority both updated successfully.

---

### 4. DELETE /api/issues/:id closes an issue -- NO LOCK ERROR

**Result**: PASS

First attempt failed with `CLI_ERROR` because the issue had active dependencies
(correct business logic -- `bd close` refuses to close a blocked issue). After removing
the dependency, close succeeded:

```bash
curl -s -X DELETE "http://127.0.0.1:3456/api/issues/sample-project-jjt?reason=verification+test"
```

Response (200):
```json
{
  "success": true,
  "data": [{
    "id": "sample-project-jjt",
    "status": "closed",
    "closed_at": "2026-04-12T20:22:39Z",
    "close_reason": "verification test"
  }]
}
```

No lock error. The initial CLI_ERROR was expected business logic, not a database lock.

---

### 5. POST /api/dependencies adds dependency -- NO LOCK ERROR

**Result**: PASS

```bash
curl -s -X POST http://127.0.0.1:3456/api/dependencies \
  -H 'Content-Type: application/json' \
  -d '{"issue_id":"sample-project-jjt","depends_on_id":"sample-project-mfd","type":"blocks"}'
```

Response (200):
```json
{
  "success": true,
  "data": {
    "depends_on_id": "sample-project-mfd",
    "issue_id": "sample-project-jjt",
    "status": "added",
    "type": "blocks"
  }
}
```

No lock error.

---

### 6. POST /api/issues/:id/comments adds comment -- NO LOCK ERROR

**Result**: PASS

```bash
curl -s -X POST http://127.0.0.1:3456/api/issues/sample-project-mfd/comments \
  -H 'Content-Type: application/json' \
  -d '{"text":"This is a test comment from the prove-it verification."}'
```

Response (201):
```json
{
  "success": true,
  "data": {
    "id": "019d835b-3ae8-7791-8e01-c7b29a9eec6e",
    "issue_id": "sample-project-mfd",
    "author": "Ryan Henderson",
    "text": "This is a test comment from the prove-it verification."
  }
}
```

No lock error.

---

### 7. GET /api/issues returns the newly created/modified data (sync works)

**Result**: PASS

After creating, updating, and closing issues, `GET /api/issues` returned all mutations
correctly:

- `sample-project-mfd`: title="Updated test issue", priority=1 (reflects PATCH)
- `sample-project-jjt`: status="closed" (reflects DELETE)
- All 5 rapid-test issues present

The replica sync mechanism (stop SQL -> copy primary -> replica -> restart SQL) correctly
propagates all writes to the read path.

---

### 8. Rapid test: create 5 issues in sequence, all succeed

**Result**: PASS

```
=== Issue 1 === success=True id=sample-project-hs5
=== Issue 2 === success=True id=sample-project-4sm
=== Issue 3 === success=True id=sample-project-5fz
=== Issue 4 === success=True id=sample-project-y88
=== Issue 5 === success=True id=sample-project-pd1
```

All 5 issues created successfully in sequence. The WriteQueue serialization prevents
any lock contention between rapid writes.

---

### 9. All 294+ unit tests pass

**Result**: PASS (324 tests)

```
Backend:  84 tests passed (7 test files)
Frontend: 240 tests passed (13 test files)
Total:    324 tests passed
```

Test files include:
- `replica-sync.test.ts` (7 tests) -- replica create/sync/cleanup
- `server-manager.test.ts` (6 tests) -- dolt server lifecycle
- `write-serialization.integration.test.ts` (12 tests) -- write queue serialization
- `queue.test.ts` (3 tests) -- write queue behavior
- `config.test.ts` (20 tests) -- config/mode detection
- `errors.test.ts` (8 tests) -- error handling
- `errors.integration.test.ts` (28 tests) -- error integration

---

### 10. Typecheck clean

**Result**: PASS

```
packages/shared typecheck: Done
packages/backend typecheck: Done
packages/frontend typecheck: Done
```

All 3 packages pass `tsc --noEmit` with zero errors.

---

### 11. Replica directory created on startup

**Result**: PASS

On server startup, the log shows:
```
[replica] Creating replica at .beads/__replica__/sample_project...
[replica] Replica created, starting SQL server on replica
```

Verified by filesystem:
```
$ ls .beads/__replica__/sample_project/
.claude  .compound-agent  .dolt  .doltcfg  config.yaml
```

The replica is a full copy of the primary database, and the SQL server runs on
the replica (not the primary), ensuring reads never interfere with writes.

---

### 12. Replica cleaned up on shutdown

**Result**: PASS

Tested by sending SIGINT to the server process:
```
$ kill -INT <pid>
$ ls .beads/__replica__/sample_project/
ls: No such file or directory
REPLICA CLEANED UP ON SHUTDOWN
```

The `shutdown()` function in `server.ts` (line 193-203) calls:
1. `destroyPool()` -- close all DB connections
2. `doltManager.stop()` -- stop the Dolt SQL server
3. `cleanupReplica(config.replicaPath)` -- remove the replica directory

---

## Architecture Verification

The embedded replica design correctly addresses the production write bug:

| Concern | Solution | Verified |
|---------|----------|----------|
| Read/write lock contention | Reads go to replica, writes go to primary via `bd` CLI | Yes |
| Write serialization | All mutations serialized through `WriteQueue` | Yes |
| Replica freshness | Replica synced after every write (stop/copy/restart cycle) | Yes |
| Sync barrier | `beginSync()/endSync()` makes reads wait during sync | Yes (code review + tests) |
| Sync timeout | 30-second timeout prevents indefinite hangs | Yes (code review) |
| Recovery | If sync fails, server auto-recovers pool and SQL server | Yes (code review + tests) |
| Cleanup | Replica removed on graceful shutdown | Yes |
