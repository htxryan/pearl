# ADR-001: Dolt Embedded Mode with Replica

## Status
Superseded by [ADR-006: Deprecate Embedded Mode](006-deprecate-embedded-mode.md)

## Context
The pearl-bdui backend needs a version-controlled database that supports Git-like branching for its issue tracking system (`bd`/beads). Local development should work without requiring external database servers -- developers should be able to clone the repo and start working immediately.

However, a key constraint arises from concurrent access: the `bd` CLI and the web UI (Fastify server) both need to read and write to the same Dolt database. Dolt does not support concurrent writers to the same database directory. Running both the CLI and the SQL server against a single database results in corruption or lock contention.

## Decision
Use Dolt in **embedded mode** as the default for local development, with a **primary/replica split** to solve the concurrent-writer limitation:

- **Primary database** (on-disk Dolt repository): The `bd` CLI writes directly here. This is the source of truth and participates in `dolt push`/`pull` for team synchronization.
- **Replica database** (file-system copy of primary): The Fastify server spawns a `dolt sql-server` subprocess via `DoltServerManager` that runs against this replica. The web UI reads from the replica.
- **Sync barrier**: After each CLI write, the system destroys the connection pool, stops the SQL server subprocess, copies the primary database to the replica directory, restarts the SQL server, and recreates the connection pool. A sync barrier suspends in-flight reads during this window to prevent stale or partial results.

For team and CI environments, a **server mode** is available:
- Connects to an external Dolt SQL server.
- No subprocess management or replica sync needed.
- Both CLI and web UI write through the same server, which serializes access internally.

## Consequences

### Positive
- **Zero-config local setup**: Developers only need Dolt installed; no external database server to provision or manage.
- **Git-like data versioning**: Issue history, branching, and merge semantics come for free from Dolt's architecture.
- **No external database dependency**: The database lives in the repository and travels with it.
- **Team flexibility**: Server mode allows shared database access when multiple developers or CI need concurrent access.

### Negative
- **Replica sync adds latency after writes**: Every CLI write triggers a stop/copy/restart cycle, introducing a brief delay before the web UI reflects changes.
- **Subprocess lifecycle complexity**: The `DoltServerManager` must handle spawning, health-checking, and gracefully stopping the `dolt sql-server` process, adding operational complexity.
- **Runtime-created tables lost on sync**: Tables created at runtime (not committed to Dolt history) in the replica are lost when the replica is overwritten from the primary during sync.
- **Single-writer limitation remains**: In embedded mode, only the CLI can write; the web server is read-only against its replica. Full read-write from the web UI requires server mode.
