# Prove It: GitHub Actions CI Pipeline (beads-gui-a61)

Verification date: 2026-04-12
Verifier: Claude (automated)
Epic: beads-gui-a61 (depends on beads-gui-9ht)

---

## Workflow File

### [PASS] .github/workflows/ci.yml exists and is valid YAML

- File exists at `.github/workflows/ci.yml`
- Validated with `npx yaml-lint`: `YAML Lint successful`
- Contains 4 jobs: `install`, `typecheck`, `test`, `build`

### [PASS] Triggers on push to main and feat/* branches

```yaml
on:
  push:
    branches: [main, "feat/**"]
```

Evidence: Run 24309961682 triggered on `push` to `feat/initial-poc` (matches `feat/**`).

### [PASS] Triggers on pull_request to main

```yaml
  pull_request:
    branches: [main]
```

Configured correctly. PR trigger verified by YAML inspection.

---

## Typecheck Job

### [PASS] Job runs pnpm typecheck successfully

- Local: `pnpm -r typecheck` passes across all 3 workspace projects (shared, backend, frontend)
- CI Run 24309961682: Typecheck job completed in 17s with conclusion `success`

### [PASS] Catches real type errors

Test procedure:
1. Changed `Issue.id` from `string` to `number` in `packages/shared/src/index.ts`
2. Rebuilt shared types with `pnpm build`
3. Ran `pnpm -r typecheck` -- **11 type errors** caught across frontend:
   - `src/integration/data-flow.test.ts` (8 errors)
   - `src/integration/golden-path.test.tsx` (1 error)
   - `src/views/board-view.tsx` (1 error)
   - `src/views/detail-view.test.tsx` (1 error)
4. Reverted change, rebuilt, verified typecheck passes again

---

## Test Job

### [PASS] Shared types build before backend tests

The `install` job runs `pnpm --filter @beads-gui/shared run build` before saving the workspace cache. The `test` job (`needs: install`) restores this cache (including `packages/shared/dist`) before running `pnpm test`. This ensures shared types are available.

### [PASS] All 289+ unit/integration tests pass

Local test results:
- **Backend**: 5 test files, **54 tests** passed (0 failures)
- **Frontend**: 13 test files, **240 tests** passed (0 failures)
- **Total: 294 tests** (exceeds 289+ requirement)

CI Run 24309961682: Test job completed in 23s with conclusion `success`.

### [PASS] Test failures correctly fail the workflow

The workflow uses `run: pnpm test` which returns non-zero on failure. Vitest exits with code 1 on test failure, which would fail the step and thus the job.

---

## Build Job

### [PASS] pnpm build completes without errors

Local: `pnpm -r build` completes successfully:
- `packages/shared`: TypeScript compilation succeeds
- `packages/backend`: TypeScript compilation succeeds
- `packages/frontend`: `tsc -b && vite build` -- 621 modules transformed, built in 995ms

CI Run 24309961682: Build job completed in 23s with conclusion `success`.

### [PASS] Build outputs are generated

Verified locally:
- `packages/shared/dist/`: `index.js`, `index.d.ts`, `index.js.map`, `index.d.ts.map`
- `packages/backend/dist/`: `config.js`, `config.d.ts`, etc.
- `packages/frontend/dist/`: `index.html`, `assets/index-BADZMZsW.js` (946 KB), `assets/index-BMgHGGB_.css` (129 KB)

---

## Performance

### [PASS] pnpm cache is configured and working

Two-layer caching strategy:

**Layer 1: pnpm store cache** (via `actions/setup-node@v4` with `cache: pnpm`)
- Run 2 logs: `Cache hit for: node-cache-Linux-x64-pnpm-e18a4d040...`
- `Cache restored successfully`
- `Cache Size: ~60 MB`
- Post-run: `Cache hit occurred on the primary key..., not saving cache.`

**Layer 2: workspace cache** (via `actions/cache/save@v4` and `actions/cache/restore@v4`)
- Key: `workspace-${{ github.sha }}` -- ensures each commit gets fresh workspace
- Paths: `node_modules`, `packages/*/node_modules`, `packages/shared/dist`
- All downstream jobs (`typecheck`, `test`, `build`) restore with `fail-on-cache-miss: true`

### [PASS] Total workflow completes in under 5 minutes

| Run | SHA | Duration | Conclusion |
|-----|-----|----------|------------|
| 24309837169 | 0be2560 | **47s** | success |
| 24309961682 | 7bf1f0d | **42s** | success |

Job breakdown (Run 2):
- Install dependencies: 12s
- Typecheck: 17s (parallel)
- Test: 23s (parallel)
- Build: 23s (parallel)

Both runs complete in under 1 minute -- well within the 5-minute target.

---

## Integration

### [PASS] Push a commit and verify the workflow runs on GitHub

- Run 1: Triggered by push of `0be2560` to `feat/initial-poc` at 15:17:57Z
- Run 2: Triggered by push of `7bf1f0d` to `feat/initial-poc` at 15:24:40Z
- Both runs visible at: https://github.com/htxryan/beads-gui/actions

### [PASS] Verify the workflow status appears on the commit/PR

Check runs on commit `0be2560`:
```
{"conclusion":"success","name":"Test","status":"completed"}
{"conclusion":"success","name":"Build","status":"completed"}
{"conclusion":"success","name":"Typecheck","status":"completed"}
{"conclusion":"success","name":"Install dependencies","status":"completed"}
```

All 4 check runs appear on the commit with green status.

---

## Additional observations

- Concurrency control configured: `cancel-in-progress: true` with group `${{ github.workflow }}-${{ github.ref }}`
- Uses `--frozen-lockfile` for reproducible installs
- Node.js 20 deprecation warnings from GitHub Actions (non-blocking, informational)
- `.nvmrc` file used for consistent Node.js version across local and CI

## Verdict: ALL CHECKS PASS
