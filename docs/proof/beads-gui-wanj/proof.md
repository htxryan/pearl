# Proof: Pearl-managed Dolt migration works end-to-end

**Bead:** `beads-gui-wanj`
**Branch:** `fix/misc-fixes`
**Date:** 2026-04-18

## The bug

`migrateToPearlManaged` in `packages/pearl-bdui/src/routes/migration.ts` copied the embedded DB **contents** directly into `.beads/doltdb/` instead of into `.beads/doltdb/<dbName>/`. When `dolt sql-server` was started with `cwd=doltdb/`, it exposed the database under the name `"doltdb"` instead of the original name (e.g. `"migrtest"`). Every post-migration query returned `database not found: migrtest` and the app froze on a 503 loop.

Root cause observed in real backend log:
```
[migration] Migration complete, running in server mode
ERROR: database not found: migrtest
  err: { code: 'ER_BAD_DB_ERROR', errno: 1049 }
```

## The fix

```diff
-await cp(config.doltDbPath, managedDataDir, { recursive: true });
+const dbName = basename(config.doltDbPath) || config.doltDatabase;
+await cp(config.doltDbPath, resolve(managedDataDir, dbName), { recursive: true });
```

Plus two brittle selector fixes in `e2e/migration-modal.spec.ts` (strict-mode collision on "Pearl-managed" text, `.font-mono.first()` matched wrong code block after 9ed97a3 added a `dolt push` warning).

## Reproduction

```bash
rm -rf /tmp/pearl-migration-test && mkdir -p /tmp/pearl-migration-test
cd /tmp/pearl-migration-test && BD_NON_INTERACTIVE=1 bd init --prefix=migrtest
bd create --title="Sample: Login page bug" --type=bug --priority=1
bd create --title="Sample: Dark mode toggle" --type=feature --priority=2
bd create --title="Sample: Refactor auth" --type=task --priority=3
# metadata.json shows dolt_mode: "embedded"

cd /tmp/pearl-migration-test && PORT=3456 node /path/to/pearl/packages/pearl-bdui/dist/index.js &
cd /path/to/pearl/packages/frontend && pnpm dev &
node /path/to/pearl/scripts/pearl-migration-proof.mjs
```

## Evidence

### Screenshots (real browser, real backend, real embedded → server migration)

| # | Screenshot | What it proves |
|---|------------|----------------|
| 01 | [`01-modal-on-fresh-embedded.png`](01-modal-on-fresh-embedded.png) | Fresh embedded DB → "Migration Required" modal appears in 81 ms, "Database unavailable" banner visible behind (503s), list rows blurred (REQ-U1, AC-4) |
| 02 | [`02-modal-external-tab.png`](02-modal-external-tab.png) | "I'll run dolt myself" tab renders host/port inputs, `dolt sql-server` command block, and warning about `dolt push` (REQ-E3 UI) |
| 03 | [`03-modal-pearl-managed-tab.png`](03-modal-pearl-managed-tab.png) | Pearl-managed tab with "Start Pearl-managed server" CTA (REQ-E2 UI) |
| 04 | [`04-migration-in-progress.png`](04-migration-in-progress.png) | "Migrating…" state captured mid-flight (REQ-S2) |
| 05 | [`05-post-migration-issues-loaded.png`](05-post-migration-issues-loaded.png) | Post-reload: no modal, no "Database unavailable" banner, all 3 sample issues visible with correct priority/type/status (AC-7, REQ-E4) |

### Custom real-DB E2E script — `scripts/pearl-migration-proof.mjs`

9/9 checks pass ([`e2e-script-output.txt`](e2e-script-output.txt), [`results.json`](results.json)):

| Check | Acceptance criterion | Result |
|-------|---------------------|--------|
| `precheck-embedded` | Backend reports embedded pre-test | dolt_mode=embedded ✓ |
| `AC-4` | Modal visible < 2 s | 81 ms ✓ |
| `ui-external-tab` | External tab form renders | ✓ |
| `AC-5` | Pearl-managed click → modal dismissed | 2664 ms, reloads=1 ✓ |
| `REQ-E4` | Hard reload fires on success | `framenavigated` fired 1× ✓ |
| `AC-1` | Backend reports server/healthy after | dolt_mode=server, status=healthy ✓ |
| `AC-7-api` | All 3 sample issues return from `/api/issues` | 3/3 ✓ |
| `AC-7-ui` | All 3 titles render in list | 3/3 ✓ |
| `AC-3` | `metadata.json` reflects server mode | mode=server, host=127.0.0.1, port=3307, pearl_managed=true ✓ |

### Existing mocked Playwright suite — `e2e/migration-modal.spec.ts`

10/10 pass after brittle-selector fixes ([`playwright-migration-modal-output.txt`](playwright-migration-modal-output.txt)):

- modal renders when backend reports embedded mode (AC-4)
- Escape does not close the modal (AC-10)
- backdrop click does not close the modal (AC-10)
- no close button present (AC-10)
- Create Issue button disabled while modal is open (AC-9)
- modal shows both managed and external tabs
- external tab shows host/port inputs and test connection button
- external migration button disabled until connection test passes
- test connection to unreachable host shows error (AC-8 UI)
- managed migration shows copyable command block

### Backend unit tests

93/93 pass (`pnpm --filter pearl-bdui test -- --run`).

### Typecheck

Clean (`pnpm typecheck`).

## Files changed

- `packages/pearl-bdui/src/routes/migration.ts` — bug fix
- `e2e/migration-modal.spec.ts` — brittle selector fixes
- `scripts/pearl-migration-proof.mjs` — proof-capture harness (new)
- `scripts/pearl-migration-e2e.mjs` — real-DB E2E checks (new)
