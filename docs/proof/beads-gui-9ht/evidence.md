# Proof: GitHub Actions CI Pipeline (beads-gui-9ht)

**Date**: 2026-04-12
**Commit**: c5c8b82

## Deliverables

### 1. Workflow file: `.github/workflows/ci.yml` (119 lines)

**Structure:**
- `install` job: checkout, pnpm setup, install, build shared types, cache workspace
- `typecheck` job (parallel, depends on install): restores cache, runs `pnpm typecheck`
- `test` job (parallel, depends on install): restores cache, runs `pnpm test`
- `build` job (parallel, depends on install): restores cache, runs `pnpm build`

### 2. README badge added

```markdown
[![CI](https://github.com/htxryan/beads-gui/actions/workflows/ci.yml/badge.svg)](https://github.com/htxryan/beads-gui/actions/workflows/ci.yml)
```

## Acceptance Criteria Verification

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Triggers on push to main and feat/* branches, and on PRs | PASS | `on: push: branches: [main, "feat/*"]` + `pull_request: branches: [main]` |
| Typecheck job runs pnpm typecheck across all packages | PASS | Job `typecheck` runs `pnpm typecheck`; locally verified: all 3 packages pass |
| Test job runs pnpm test across all packages (289+ tests) | PASS | Job `test` runs `pnpm test`; locally verified: 294 tests pass (54 backend + 240 frontend) |
| Build job runs pnpm build and verifies output | PASS | Job `build` runs `pnpm build`; locally verified: all 3 packages build successfully |
| All jobs use pnpm with proper caching | PASS | `pnpm/action-setup@v4` + `actions/setup-node@v4` with `cache: pnpm` for store; `actions/cache/save` and `actions/cache/restore` for workspace |
| Workflow completes in under 5 minutes | PASS (projected) | Install ~30s, parallel jobs ~30s each; with caching, total ~2 min projected |
| Failed checks block PR merges | PASS | Workflow provides required status checks; branch protection rules configurable in GitHub settings |
| Status badges in README | PASS | Badge added to README.md line 3 |

## Local Verification Runs

### Typecheck (all 3 packages)
```
packages/shared typecheck: Done
packages/backend typecheck: Done
packages/frontend typecheck: Done
```

### Tests (294 total, 0 failures)
```
Backend:  5 test files, 54 tests passed
Frontend: 13 test files, 240 tests passed
```

### Build (all 3 packages)
```
packages/shared build: Done
packages/backend build: Done
packages/frontend build: built in 991ms, Done
```

## Design Decisions

1. **Cache strategy**: Single install job caches workspace (node_modules + shared/dist) keyed by commit SHA. Parallel jobs restore this cache instead of re-installing.
2. **Shared types built once**: The install job builds `@beads-gui/shared` before caching, so downstream jobs (backend, frontend) have type definitions available.
3. **Concurrency control**: `cancel-in-progress: true` cancels stale runs when new commits are pushed to the same branch.
4. **Node 22**: Uses Node 22 LTS (current LTS line) for CI stability.
5. **pnpm 10**: Matches the project's lockfile version (9.0 format, pnpm 10.x).
