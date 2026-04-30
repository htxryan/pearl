---
title: Troubleshooting
description: Common issues and solutions for Pearl.
sidebar:
  order: 6
---

## Dolt server

### "Dolt unavailable" or connection refused

The backend cannot reach the Dolt SQL server.

**Symptoms:** API returns 503, logs show `ECONNREFUSED`.

**Fixes:**

1. **Pearl-managed server failed to start** — check the console output for errors. Common cause: the Dolt binary is not on `$PATH`. Install Dolt or set `DOLT_PATH`.
2. **External server is down** — verify your server is running with `dolt sql-server --host 127.0.0.1 --port 3307`.
3. **Wrong host/port** — verify `DOLT_HOST` and `DOLT_PORT` match your running server.

### Port conflicts (3307–3309)

Pearl-managed mode tries ports 3307, 3308, and 3309. If all are taken, startup fails.

**Diagnose:**

```bash
lsof -i :3307-3309
```

**Common cause:** a previous Pearl session crashed and left a stale `dolt sql-server` process.

**Fix:**

```bash
ps aux | grep 'dolt sql-server'
kill <pid>
```

### Stale reads after writes

Queries return old data after a successful mutation.

**Cause:** Dolt pins each connection to its working-set snapshot. Pooled connections may hold stale snapshots.

**Fix:** This is handled automatically by Pearl's `queryWithRetry()` function, which executes `ROLLBACK` before each query to refresh the view. If you're developing against Pearl's API directly, avoid using the connection pool's `execute()` method.

## Backend startup

### "No .beads/ directory found"

Pearl cannot find a `.beads/` directory in the current working directory or its parents.

**Fix:** Run Pearl from a directory containing `.beads/`, or run `bd init` to create a new project.

### "Embedded mode is deprecated"

Pearl detected `dolt_mode: "embedded"` in `.beads/metadata.json`.

**Fix:** Open the Pearl UI — a migration modal will prompt you to switch to server mode. Do not edit `metadata.json` directly.

## Frontend

### "No issues found" after creating issues

If the API returns 500 errors, the UI may show an empty state instead of an error message.

**Diagnose:**

```bash
curl http://localhost:3456/api/issues
```

A 500 response often indicates a database table issue after a mode change.

## For Contributors

These issues only apply if you are developing Pearl itself, not using it as an end user.

### TypeScript errors after changing shared types

The backend imports `@pearl/shared` from compiled `dist/` output, not source.

**Fix:**

```bash
pnpm --filter @pearl/shared run build
```

### Biome lint errors on commit

Pre-commit hooks run Biome automatically. Fix issues with:

```bash
pnpm lint:fix
```

### Tests pass but `pnpm typecheck` fails

Some pre-existing TypeScript errors exist in test configuration files. Verify with `git stash` that failures are pre-existing before investigating.
