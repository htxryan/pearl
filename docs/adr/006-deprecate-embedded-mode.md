# ADR-006: Deprecate Embedded Dolt Mode

## Status
Accepted

## Context
Embedded mode (ADR-001) introduced a primary/replica split with a sync barrier to allow concurrent access between the `bd` CLI and the web UI. While this achieved the zero-config local development goal, it accumulated significant operational issues:

- **Concurrent sync corruption**: Multiple writes arriving during a sync window could corrupt the barrier state (fix: 65fb683).
- **Orphaned reverse dependencies**: The replica copy step didn't clean up reverse dependencies before SQL delete (fix: eb2b4ad).
- **Write latency**: Every CLI write triggered a stop-SQL-server/copy/restart cycle, adding 1-3 seconds of latency.
- **Lifecycle complexity**: DoltServerManager, sync barrier, pool recreation, and label table re-creation formed a fragile chain where any step failing could leave the system in an unrecoverable state.

The Dolt SQL server, by contrast, handles concurrent access natively and eliminates all sync-related code paths.

## Decision
Deprecate embedded mode entirely. Pearl now requires a Dolt SQL server, offered via two paths:

1. **Pearl-managed**: Pearl spawns and supervises a `dolt sql-server` process against the migrated data directory. No user action beyond clicking a button.
2. **External**: The user runs `dolt sql-server` themselves and provides host/port.

When pearl starts with `dolt_mode: "embedded"` in metadata.json, the backend:
- Serves `/api/health` with `dolt_mode: "embedded"` so the frontend can detect the state
- Serves `/api/migration/*` endpoints for the migration flow
- Blocks all mutation API routes with a 503 `EMBEDDED_DEPRECATED` error
- Does NOT start a replica, sync barrier, or embedded SQL server

The frontend renders a blocking modal with migration options. After migration succeeds, metadata.json is atomically updated to `dolt_mode: "server"` and the app reloads.

## Consequences

### Positive
- **Eliminated sync barrier**: No more stop/copy/restart cycle, no more concurrent sync corruption.
- **Simplified codebase**: Removed ~500 lines of replica-sync, sync barrier, and embedded-mode branching.
- **Lower write latency**: Writes go directly to the SQL server with no post-write sync overhead.
- **Concurrent access**: Both CLI and web UI can read/write through the same server.

### Negative
- **Requires Dolt SQL server**: Users must either let Pearl manage it or run it themselves. Zero-config embedded startup is no longer possible.
- **Migration step**: Existing users with embedded-mode projects see a blocking modal on first load after upgrading.
- **Managed server lifecycle**: Pearl now manages a child process for the managed path, adding a different kind of lifecycle complexity (though simpler than the sync barrier).

### Supersedes
- [ADR-001: Dolt Embedded Mode with Replica](001-dolt-embedded-mode.md)
