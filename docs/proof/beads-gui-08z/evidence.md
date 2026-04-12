# Proof: Config + Mode Detection Verification (beads-gui-08z)

**Date**: 2026-04-12
**Epic**: Prove It: Config + mode detection verification
**Depends on**: beads-gui-pri (Config + Dolt mode detection)

---

## Checklist Results

### 1. pnpm test passes (302 tests)

**PASS** - 302 tests across 18 test files, 0 failures.

- Frontend: 240 tests, 13 files passed
- Backend: 62 tests, 5 files passed (including 11 config-specific tests)

```
Backend:
 ✓ src/errors.test.ts (8 tests)
 ✓ src/config.test.ts (11 tests)
 ✓ src/errors.integration.test.ts (28 tests)
 ✓ src/write-service/queue.test.ts (3 tests)
 ✓ src/write-service/write-serialization.integration.test.ts (12 tests)
 Test Files  5 passed (5)
      Tests  62 passed (62)

Frontend:
 Test Files  13 passed (13)
      Tests  240 passed (240)
```

### 2. pnpm typecheck clean

**PASS** - All 3 workspace projects typecheck with zero errors.

```
packages/shared typecheck: Done
packages/backend typecheck: Done
packages/frontend typecheck: Done
```

### 3. Config reads embedded mode from metadata.json

**PASS** - `readBeadsMetadata()` reads `.beads/metadata.json` and `loadConfig()` maps `dolt_mode: "embedded"` correctly.

Runtime output:
```
metadata.dolt_mode: embedded
config.doltMode: embedded
```

Source evidence (`config.ts:46-47`):
```typescript
const metadata = readBeadsMetadata(cwd);
const doltMode: DoltMode =
  metadata?.dolt_mode === "server" ? "server" : "embedded";
```

Actual `.beads/metadata.json`:
```json
{
  "database": "dolt",
  "backend": "dolt",
  "dolt_mode": "embedded",
  "dolt_database": "beads_gui",
  "project_id": "9b3071dc-35f6-4e10-b11b-67c92ac20347"
}
```

Test coverage: `config.test.ts` line 34-38 — "detects embedded mode from metadata.json"

### 4. Config reads server mode when metadata has dolt_mode: server

**PASS** - The ternary expression `metadata?.dolt_mode === "server" ? "server" : "embedded"` correctly returns `"server"` when `dolt_mode` is `"server"`.

Runtime verification:
```
When dolt_mode='server': server
```

Source evidence (`config.ts:47`): Strict equality check `=== "server"`.

In server mode, `doltHost` is read from `DOLT_HOST` env or `metadata.dolt_host` (`config.ts:50-62`).

### 5. Config defaults to embedded when metadata has no dolt_mode field

**PASS** - The ternary defaults to `"embedded"` for any non-`"server"` value including `undefined` and `null`.

Runtime verification:
```
When dolt_mode=undefined: embedded
When dolt_mode=null: embedded
```

Source: The expression `metadata?.dolt_mode === "server"` evaluates to `false` for `undefined`, `null`, `"embedded"`, or any other value, falling through to the `"embedded"` default.

`readBeadsMetadata()` returns `null` when no metadata file exists (`config.ts:119`), and `null?.dolt_mode === "server"` is `false`.

### 6. pool.ts uses config.doltHost instead of hardcoded 127.0.0.1

**PASS** - `pool.ts` line 18 uses `config.doltHost`. Zero occurrences of `127.0.0.1` or `localhost` in pool.ts.

```
$ grep '127\.0\.0\.1\|localhost' pool.ts
(no matches)

$ grep 'config.doltHost' pool.ts
18:    host: config.doltHost,
```

The `createDoltPool()` function accepts a `Config` object and uses `config.doltHost` for the mysql2 pool `host` parameter.

### 7. replicaPath is correctly derived for embedded mode

**PASS** - `replicaPath` is derived as a sibling `__replica__/<dbname>` directory relative to the database path.

Runtime output:
```
config.doltDbPath:   /Users/redhale/src/beads-gui/.beads/embeddeddolt/beads_gui
config.replicaPath:  /Users/redhale/src/beads-gui/.beads/__replica__/beads_gui
```

Source evidence (`config.ts:70-74`):
```typescript
if (doltMode === "embedded") {
  const dbName = basename(doltDbPath) || "beads_gui";
  replicaPath = resolve(dirname(doltDbPath), "..", "__replica__", dbName);
}
```

Path derivation: `dirname(doltDbPath)` = `.beads/embeddeddolt`, go up `..` = `.beads/`, append `__replica__/beads_gui`.

In server mode, `replicaPath` remains empty string (not needed).

Test coverage: `config.test.ts` line 45-49 — "derives replicaPath as sibling __replica__/<dbname>"

---

## Summary

All 7 checklist items verified. The config system correctly:
- Reads and parses `.beads/metadata.json` with directory walk-up
- Detects embedded vs server mode from `dolt_mode` field
- Defaults safely to embedded when field is missing
- Passes `doltHost` through to pool creation (no hardcoded IPs)
- Derives replica paths correctly for embedded mode
- Has comprehensive test coverage (11 config tests + integration tests)
