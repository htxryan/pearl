# Proof Evidence: beads-gui-2fo — Embedded mode read replica + sync

## Epic Summary

Implemented the read replica pattern for embedded mode to fix the production write lock bug.
- PRIMARY DB: `.beads/embeddeddolt/<name>/` — bd CLI writes here (exclusive, uncontested)
- REPLICA: derived `__replica__/<name>/` — SQL server reads from here (separate copy)
- SYNC: after each bd CLI write → stop SQL server → copy primary → replica → restart

## Files Changed

| File | Change | Lines |
|------|--------|-------|
| `packages/backend/src/dolt/replica-sync.ts` | NEW — createReplica, syncReplica, cleanupReplica | 35 |
| `packages/backend/src/dolt/replica-sync.test.ts` | NEW — 7 unit tests for replica operations | 131 |
| `packages/backend/src/dolt/server-manager.ts` | MOD — accept optional dbPath parameter | +5/-2 |
| `packages/backend/src/dolt/server-manager.test.ts` | NEW — 6 unit tests for server manager | 70 |
| `packages/backend/src/server.ts` | MOD — wire replica lifecycle into startup/shutdown/sync | +39/-2 |
| `packages/backend/src/write-service/write-service.ts` | MOD — add onAfterWrite callback + syncAfterWrite | +21/-2 |

## Evidence 1: All Tests Pass (84 backend tests)

```
 ✓ src/dolt/server-manager.test.ts (6 tests) 2ms
 ✓ src/errors.test.ts (8 tests) 2ms
 ✓ src/errors.integration.test.ts (28 tests) 4ms
 ✓ src/config.test.ts (20 tests) 4ms
 ✓ src/dolt/replica-sync.test.ts (7 tests) 20ms
 ✓ src/write-service/queue.test.ts (3 tests) 102ms
 ✓ src/write-service/write-serialization.integration.test.ts (12 tests) 271ms

 Test Files  7 passed (7)
      Tests  84 passed (84)
```

All 324 tests (84 backend + 240 frontend) pass. Zero regressions.

## Evidence 2: Type Safety (0 errors across all packages)

```
packages/shared typecheck: Done
packages/backend typecheck: Done
packages/frontend typecheck: Done
```

## Evidence 3: Replica Sync Unit Tests

The `replica-sync.test.ts` tests prove:
1. **createReplica** — copies primary directory to replica path with all nested files
2. **createReplica** — removes stale replica before copying (no leftover state)
3. **createReplica** — creates parent directories if missing (`__replica__/`)
4. **syncReplica** — overwrites replica with fresh primary contents
5. **syncReplica** — removes files deleted from primary (clean overwrite)
6. **cleanupReplica** — removes the replica directory entirely
7. **cleanupReplica** — does not throw if replica does not exist

## Evidence 4: Architecture Traceability

### Epic requirement → Implementation mapping

| Requirement | Implementation | Verified |
|-------------|---------------|----------|
| `createReplica(primaryPath, replicaPath)` | `replica-sync.ts:createReplica()` | 3 unit tests |
| `syncReplica(primaryPath, replicaPath)` | `replica-sync.ts:syncReplica()` | 2 unit tests |
| `cleanupReplica(replicaPath)` | `replica-sync.ts:cleanupReplica()` | 2 unit tests |
| DoltServerManager accepts dbPath | Constructor param `dbPath?: string`, used as `cwd` in start() | Type check + unit test |
| Startup creates replica | `server.ts:startup()` calls `createReplica()` when `isEmbedded` | Type check |
| SQL server on REPLICA | `DoltServerManager` constructed with `config.replicaPath` | Type check |
| Pool connects to replica | Pool uses same port/host, db name matches (same basename) | Type check |
| Post-write sync hook | `WriteService` accepts `onAfterWrite` callback | Type check |
| Sync = stop→copy→restart→pool | `server.ts:onAfterWrite` closure: destroyPool→stop→syncReplica→start→createDoltPool | Code review |
| Sync serialized through WriteQueue | `syncAfterWrite()` called inside `queue.enqueue()` callback | Code review |
| Shutdown cleans up replica | `server.ts:shutdown()` calls `cleanupReplica()` when `isEmbedded` | Type check |
| Sync failure non-fatal | `syncAfterWrite()` catches errors, logs, continues | Code review |

### Key constraint: bd CLI writes to PRIMARY (unchanged)

The WriteService's IssueWriter/DependencyWriter/CommentWriter all use `runBd(config, args)` which
uses `config.doltDbPath` (the PRIMARY path) as `cwd`. This was NOT changed — bd CLI still writes
to the primary database exclusively.

### Key constraint: Sync serialized through WriteQueue

The `syncAfterWrite()` call happens inside each `queue.enqueue()` callback. Since WriteQueue
serializes all operations, no concurrent syncs or writes can interleave. The sequence is:
1. bd CLI write completes (on primary)
2. syncAfterWrite() runs (still inside queue task)
3. Pool destroyed, server stopped, files copied, server restarted, pool recreated
4. Queue task resolves, next queued write can begin

## Evidence 5: No Regression in Existing Behavior

- Server mode (`doltMode: "server"`) unaffected: `isEmbedded` is false, `serverDbPath` is undefined, no replica created
- All 20 config tests pass: replicaPath derivation, mode detection, credentials
- All 12 write serialization integration tests pass: queue ordering preserved
- All 28 error integration tests pass: error codes and retry logic unchanged
- All 240 frontend tests pass: no API contract changes

## Evidence 6: Safety Properties

1. **Write isolation**: bd CLI writes to primary only (cwd unchanged)
2. **Read consistency**: replica is a full copy, SQL server sees consistent state
3. **No concurrent syncs**: WriteQueue serializes all writes + syncs
4. **Graceful failure**: sync errors logged but don't fail write responses
5. **Clean shutdown**: replica directory removed on shutdown
6. **No lock conflicts**: SQL server never touches primary; bd CLI never touches replica
