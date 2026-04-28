# Troubleshooting

Common issues and solutions for Pearl and the Beads issue tracker.

## Dolt Server

### "Dolt unavailable" or connection refused

The backend cannot reach the Dolt SQL server.

**Symptoms:** API returns 503, logs show `ECONNREFUSED` or `doltUnavailableError`.

**Causes & fixes:**

1. **Pearl-managed server failed to start.** Check the Pearl backend's console output (Pino logs) for errors. Common: the Dolt binary is not on `$PATH` — install Dolt or set `DOLT_PATH`.
2. **External server is down.** Verify with `dolt sql-server --host 127.0.0.1 --port 3307` or check the process you're connecting to.
3. **Wrong host/port.** Verify `DOLT_HOST` and `DOLT_PORT` env vars match your running server. Check `.beads/metadata.json` for the configured values.

### Port conflicts (3307-3309 occupied)

Pearl-managed mode tries ports 3307, 3308, and 3309. If all are taken, startup or migration fails.

**Diagnose:**

```bash
lsof -i :3307-3309
```

**Common cause:** A previous Pearl session crashed and left a zombie `dolt sql-server` process.

**Fix:**

```bash
# Find and kill stale dolt processes
ps aux | grep 'dolt sql-server'
kill <pid>
```

Or switch to external server mode and manage the Dolt server yourself.

### Embedded lock contention

The Dolt embedded database lock prevents concurrent access. Only one process can use the embedded database at a time.

**Symptoms:** `bd` commands hang indefinitely. The infinity loop script appears stuck.

**Diagnose:**

```bash
# Check for processes holding the lock
ps aux | grep 'dolt sql-server'
ps aux | grep 'bd '
cat .beads/dolt-server.pid
```

**Fix:** Kill the process holding the lock. When running the backend dev server, `bd` CLI commands will block until the server releases the lock. Stop the dev server before running `bd` commands, or use server mode where both can connect concurrently.

### Stale reads after writes

Queries return old data even after a successful mutation.

**Cause:** Dolt pins each mysql2 connection to its working-set snapshot at the last transaction boundary. If you use `pool.execute()` directly instead of `queryWithRetry()`, the connection may hold a stale snapshot.

**Fix:** Always use `queryWithRetry()` from `dolt/pool.ts`. It executes `ROLLBACK` before each query to refresh the connection's view. Direct pool access (`getPool().execute(...)`) is only safe for one-shot queries on fresh connections.

### DoltServerManager gives up after repeated crashes

After 10 consecutive restart failures, the manager enters `error` state and stops retrying.

**Symptoms:** Logs show repeated `[dolt] Managed server state: error`. All queries fail with "Dolt unavailable".

**Fix:** Check the Pearl backend's console output (Pino logs) for the underlying crash cause (corrupt data, permission issues, incompatible Dolt version). After fixing, restart Pearl.

## Backend Startup

### "No .beads/ directory found — running in setup mode"

Pearl cannot find a `.beads/` directory in the current working directory or its parents.

**Fix:** Either run Pearl from a directory containing `.beads/`, or visit `/setup` in the browser to initialize a new project.

### "Embedded mode is deprecated"

Pearl detected `dolt_mode: "embedded"` in `.beads/metadata.json`.

**Fix:** Open the Pearl UI — a migration modal will prompt you to switch to server mode. Do not edit `metadata.json` directly; use the in-app migration flow.

### Schema migrations fail or are skipped

Pearl's `ensureHasAttachmentsColumn()` runs schema migrations after pool creation. If the pool isn't available when the migration runs, the migration is silently skipped.

**Key detail:** Fastify's `onReady` hook fires _before_ `startup()`, so schema migrations that need the database pool must run again inside `startup()` after the pool is created. This is already handled, but if you add new migrations, follow the same pattern.

## Frontend

### "No issues found" after creating issues

If the API returns 500 errors, TanStack Query treats the response as a failed fetch and shows the empty state instead of an error.

**Diagnose:**

```bash
curl http://localhost:3456/api/issues
```

Check the response status code. A 500 often indicates a missing table (e.g., `label_definitions` destroyed after a mode change).

### Frontend freezes on fresh mount (embedded mode)

The frontend polls the API. If the backend is in embedded mode with mutations blocked, some API responses may hang or return unexpected errors.

**Fix:** Complete the migration to server mode via the in-app modal.

## Compound Agent / Infinity Loop

### Loop hangs silently

The infinity loop script uses `bd` commands between epics for dependency checks. These block on the Dolt embedded lock if a `dolt sql-server` process is running.

**Diagnose:**

```bash
ps aux | grep 'bd '       # Stuck bd commands
ps aux | grep 'dolt sql'  # Server holding the lock
```

**Fix:** Kill the stale server process. The root cause is usually a Prove It session that started the backend for verification and didn't clean up.

### Process cleanup after Prove It sessions

Prove It epics start the backend server for verification. If the session ends without stopping the server, stale processes hold the Dolt lock.

**Cleanup:**

```bash
# Find the full process tree
pgrep -af 'dolt sql-server'
pgrep -af 'tsx watch'

# Kill parent-first: tsx watch → node backend → dolt sql-server
pkill -f 'tsx watch'
pkill -f 'node src/index'
pkill -f 'dolt sql-server'
```

Kill the `tsx watch` parent first — it respawns children via DoltServerManager auto-restart.

## `bd` CLI

### "bd: command not found"

Install the beads CLI:

```bash
npx compound-agent install-beads
```

Or set `BD_PATH` to point to the binary location.

### bd commands hang

See [Embedded lock contention](#embedded-lock-contention). The `bd` CLI uses Dolt in embedded mode and will wait for any running `dolt sql-server` to release the lock.

## Development

### TypeScript errors after changing shared types

The backend imports from `@pearl/shared` via compiled `dist/` output, not source.

**Fix:**

```bash
pnpm --filter @pearl/shared run build
```

### Tests pass but `pnpm typecheck` fails

Known pre-existing: `packages/frontend/vitest.config.ts` has a TS2769 error. This doesn't affect test execution. Verify with `git stash` that failures are pre-existing before investigating.

### Biome lint errors on commit

Pre-commit hooks run Biome. Fix automatically:

```bash
pnpm lint:fix
```
