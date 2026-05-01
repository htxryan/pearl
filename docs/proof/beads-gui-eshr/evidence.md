# beads-gui-eshr — Pearl-managed migration freeze fix

**PR:** https://github.com/htxryan/pearl/pull/42
**Released:** `pearl-bdui@0.12.1` on npm
**Issue:** Clicking *Start Pearl-managed server* in the migration modal hung the page.
**Root cause:** A port-collision race between the bootstrap `dolt sql-server` (used to verify the migrated database) and the `DoltServerManager`-spawned server. SIGTERM was sent to the bootstrap but never awaited, so the manager's child silently exited with `EADDRINUSE` while the still-shutting-down bootstrap kept answering health checks. Once the bootstrap exited, the pool pointed at a dead server and the page hung in the *Migrating…* state.
**Fix:** `await` the bootstrap process exit (with SIGKILL fallback after 5s grace) before letting `onMigrationComplete` start the managed server, mirroring the pattern in `DoltServerManager.stop()`.

## Reproduction (post-fix)

Tested against the published `pearl-bdui@0.12.1` package via `npx`, against a fresh test directory at `/tmp/pearl-prove-it/` seeded with **5 issues** in embedded mode.

```bash
cd /tmp/pearl-prove-it && PORT=3461 npx -y pearl-bdui@0.12.1 --no-open
```

Then walked through the migration UI in a real Chromium browser (headed) via Playwright to capture each step.

## Screenshots

### 1. Initial state — embedded mode, modal showing
![Migration modal before click](01-migration-modal-before.png)

The "Database unavailable" banner is visible. The *Migration Required* modal blocks the UI with the *Start Pearl-managed server* CTA.

### 2. Click registers — *Migrating…* state
![Migrating state](02-migrating-state.png)

The button transitions to *→ Migrating…* (faded background, disabled). **This is the state where, before the fix, the page would freeze indefinitely.** The migration request goes out, the bootstrap dolt + manager dolt race, the manager's child silently dies, the pool eventually points at a dead server, and the success response never lets the frontend reload.

### 3. After migration — page reloaded automatically
![After migration](03-after-migration.png)

- *Database unavailable* banner is gone.
- Migration modal is gone (verified programmatically: `modal gone: true`).
- All 5 seeded issues are listed: Prove-it issues 1–5 with correct IDs (`9n0`, `ccz`, `dtx`, `ekv`, `w26`), priorities (P2), and types (Task).
- Sidebar count shows **List 1** with the right list count badge.

### 4. Issues list (zoomed)
![Issues list zoom](04-issues-list-zoom.png)

Closer view of the issue table with all 5 seeded issues correctly migrated.

### 5. Issue detail view works
![Issue detail](05-issue-detail.png)

Opened *Prove-it issue 1* — detail panel populates with all fields (Status, Priority, Created, Type, Owner, Description "Seeded data 1 for fix verification"). This proves the read path through the new server-mode connection pool is fully functional, not just the initial list query.

## System-level evidence

Captured in [`process-tree.txt`](process-tree.txt):

```
## Grandchildren — should be exactly one dolt sql-server
  PID  PPID COMMAND
58791 36661 dolt sql-server --host 127.0.0.1 --port 3307 --no-auto-commit

## All dolt sql-server processes on candidate ports (3307/3308/3309)
redhale  58791   0.0  0.2 443822528 102528   ??  SN   10:04PM   0:00.10
                 dolt sql-server --host 127.0.0.1 --port 3307 --no-auto-commit
```

- **One** dolt process on the candidate ports (no leaked bootstrap zombie).
- It is correctly parented to the npx-spawned `pearl-bdui` node — `PPID 36661` is the `pearl-bdui` binary, which itself is a child of `npm exec` (PID 35992). Before the fix, the surviving dolt was the leaked bootstrap, parented to nothing the manager could see.

## API verification

[`health-after-migration.json`](health-after-migration.json):
```json
{"status":"healthy","dolt_server":"running","uptime_seconds":0,"version":"0.1.0","project_prefix":"pearl-prove-it","dolt_mode":"server"}
```

[`issues-after-migration.json`](issues-after-migration.json) — all 5 seeded issues returned by the live server:

```
5 issues recovered:
  - pearl-prove-it-9n0: Prove-it issue 1
  - pearl-prove-it-ccz: Prove-it issue 2
  - pearl-prove-it-w26: Prove-it issue 3
  - pearl-prove-it-ekv: Prove-it issue 4
  - pearl-prove-it-dtx: Prove-it issue 5
```

## CI / publish trail

| Step | Status |
|---|---|
| PR #42 CI (Build, Lint, Typecheck, Test, E2E, Snapshots, Cloudflare) | ✓ all green |
| PR #42 squash-merged to main | ✓ |
| Release-please PR #43 (`pearl-bdui 0.12.1`) | ✓ merged |
| `npm publish` (release-please workflow) | ✓ |
| Smoke test — published package | ✓ passed |
| Local `npx pearl-bdui@0.12.1` end-to-end migration | ✓ this report |
