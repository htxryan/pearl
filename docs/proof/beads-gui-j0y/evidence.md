# Proof: Server Mode — Pure Connect to External Dolt

**Epic:** beads-gui-j0y
**Date:** 2026-04-12
**Commit:** d384caf

## Acceptance Criteria Verification

### 1. Backend starts in server mode connecting to standalone dolt sql-server

**Evidence:** `server.ts:174-182` — When `isServerMode` is true, startup() skips DoltServerManager entirely and calls `createDoltPool(config)` directly with the configured `doltHost:doltPort`.

```typescript
if (isServerMode) {
  app.log.info(`Connecting to external Dolt SQL server at ${config.doltHost}:${config.doltPort}...`);
  createDoltPool(config);
  app.log.info("Connection pool created for external Dolt server");
}
```

### 2. Reads work through the external server

**Evidence:** The connection pool created by `createDoltPool(config)` connects to `config.doltHost:config.doltPort` (pool.ts:53-54). All read queries go through `queryWithRetry()` which uses this pool. No code path changes needed — the pool abstraction handles this transparently.

### 3. Writes work through bd CLI (configured with bd dolt set host/port)

**Evidence:** `WriteService` delegates to `IssueWriter`, `DependencyWriter`, `CommentWriter` which all shell out to `bd` CLI. In server mode, `onAfterWrite` is `undefined` (server.ts:101), so `syncAfterWrite()` returns immediately (write-service.ts:118: `if (!this.onAfterWrite) return`). The bd CLI is responsible for its own connection configuration.

### 4. Health endpoint reports correctly in server mode

**Evidence:** `health.ts:13-15` — When `config.doltMode === "server"`, the health route calls `serverModeHealth()` which:
- Gets the pool via `getPool()`
- Runs `SELECT 1` to verify connectivity
- Returns `status: "healthy"` / `dolt_server: "running"` on success
- Returns `status: "unhealthy"` / `dolt_server: "error"` on failure

### 5. No DoltServerManager subprocess in server mode

**Evidence:** `server.ts:31-36` — `doltManager` is initialized as `null`. The `DoltServerManager` constructor is only called inside `if (!isServerMode)`. Shutdown also guards: `if (doltManager) { await doltManager.stop(); }` (server.ts:215-217).

### 6. All 294+ tests pass

**Evidence:** Full test run output:
- Backend: **7 test files, 84 tests passed**
- Frontend: **13 test files, 240 tests passed**
- **Total: 324 tests passed, 0 failed**

## Files Modified

| File | Change |
|------|--------|
| `packages/backend/src/server.ts` | Startup/shutdown branching for server vs embedded mode |
| `packages/backend/src/routes/health.ts` | Mode-aware health check (pool SELECT 1 vs DoltServerManager state) |

## Files NOT Modified (by design)

| File | Reason |
|------|--------|
| `packages/backend/src/write-service/write-service.ts` | Already handles `onAfterWrite === undefined` — no-op sync is automatic |
| `packages/backend/src/config.ts` | Already supports `doltMode: "server"` with host/port from metadata |
| `packages/backend/src/dolt/pool.ts` | Pool creation is mode-agnostic — uses `config.doltHost:config.doltPort` |

## Type Safety

TypeScript `--noEmit` passes with zero errors. The `DoltServerManager | null` type is threaded through:
- `server.ts`: `let doltManager: DoltServerManager | null = null`
- `health.ts`: `doltManager: DoltServerManager | null` parameter
- Non-null assertions (`!`) used only in embedded-mode code paths where `doltManager` is guaranteed non-null
