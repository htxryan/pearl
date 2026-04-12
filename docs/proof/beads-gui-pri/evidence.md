# Proof: Config + Dolt Mode Detection (beads-gui-pri)

## Changes Made

| File | Change |
|------|--------|
| `packages/backend/src/config.ts` | Added `DoltMode` type, `doltMode`, `doltHost`, `replicaPath` to Config. Added `readBeadsMetadata()` to parse `.beads/metadata.json`. `loadConfig()` now derives mode-specific values. |
| `packages/backend/src/dolt/pool.ts` | Changed hardcoded `host: "127.0.0.1"` to `host: config.doltHost` |
| `packages/backend/src/config.test.ts` | Added 8 new tests for mode detection, metadata reading, env var overrides, and fallback |

## Test Results

All 62 backend tests pass (11 config tests including 8 new ones):

```
 ✓ src/config.test.ts (11 tests) 2ms
 ✓ src/errors.test.ts (8 tests) 1ms
 ✓ src/errors.integration.test.ts (28 tests) 4ms
 ✓ src/write-service/queue.test.ts (3 tests) 95ms
 ✓ src/write-service/write-serialization.integration.test.ts (12 tests) 258ms

 Test Files  5 passed (5)
      Tests  62 passed (62)
```

Full monorepo: 302 tests across 18 files, all passing. TypeScript typecheck clean.

## Embedded Mode (actual .beads/metadata.json)

**Input** — `.beads/metadata.json`:
```json
{
  "database": "dolt",
  "backend": "dolt",
  "dolt_mode": "embedded",
  "dolt_database": "beads_gui",
  "project_id": "9b3071dc-35f6-4e10-b11b-67c92ac20347"
}
```

**Output** — `loadConfig()`:
```json
{
  "doltMode": "embedded",
  "doltHost": "127.0.0.1",
  "doltPort": 3307,
  "doltDbPath": "/Users/redhale/src/beads-gui/.beads/embeddeddolt/beads_gui",
  "replicaPath": "/Users/redhale/src/beads-gui/.beads/__replica__/beads_gui"
}
```

## Fallback (missing metadata.json)

```
readBeadsMetadata('/tmp/no-beads-here') => null
```
Config defaults to `doltMode: "embedded"`, `doltHost: "127.0.0.1"`.

## Server Mode Path

When `dolt_mode: "server"` in metadata.json:
- `doltHost` reads from `DOLT_HOST` env var, then `metadata.dolt_host`, then falls back to `"127.0.0.1"`
- `doltPort` reads from `DOLT_PORT` env var, then `metadata.dolt_port`, then `3307`
- In embedded mode, `DOLT_HOST` is intentionally ignored (always `127.0.0.1` for security)

## Acceptance Criteria Checklist

- [x] Config correctly reads dolt_mode from metadata.json
- [x] Embedded mode: replicaPath derived, doltHost=127.0.0.1
- [x] Server mode: doltHost and doltPort from config
- [x] Missing metadata defaults to embedded
- [x] All existing tests still pass (302/302)
- [x] New unit tests for mode detection (8 new tests)
