# Proof: E2E Write Tests — Dual Mode (beads-gui-ytk)

## Summary

All E2E write tests pass cleanly with real UI interactions, no mocks, and no Dolt lock errors. The embedded replica sync architecture works correctly.

## Test Results

- **33 passed, 2 skipped, 0 failed** in **1.4 minutes**
- 2 skipped are legitimate conditional skips (dynamic UI state)
- Zero Dolt lock errors during execution
- 13 replica syncs completed successfully (~569ms each)

## Acceptance Criteria Verification

| Criteria | Status | Evidence |
|----------|--------|----------|
| All write tests pass with real UI interactions (no mocks) | PASS | 33/33 passed, see report-full.png |
| Tests verify mutations through visual feedback | PASS | Toast assertions, UI state changes, URL navigation verified |
| No Dolt lock errors during test execution | PASS | Zero lock errors in test output |
| Tests complete in < 2 minutes | PASS | 1.4 minutes total |
| CI integration: write tests run after read tests | PASS | ci.yml runs test:e2e:read then test:e2e:write |

## Changes Made

### Removed escape hatches
- Removed all `test.slow()` markers (4 occurrences)
- Removed all `Promise.race([...]).catch(() => {})` patterns (7 occurrences)
- Replaced with proper assertions that expect success

### Fixed configuration
- Added `DOLT_DATABASE: "sample_project"` env override in playwright.config.ts
- Root cause: pnpm --filter changes CWD to packages/backend, causing metadata discovery to find root metadata.json (database: beads_gui) instead of sample-project's

### Updated comments
- Removed outdated "write operations unavailable" note from read-only fixtures
- Updated navigateToIssue comments to reference replica sync instead of Dolt lock

## Files Modified

- `playwright.config.ts` — added DOLT_DATABASE env, clarifying comments
- `e2e/fixtures.ts` — updated doc comment
- `e2e/write-tests/fixtures.ts` — updated comments for replica sync
- `e2e/write-tests/create-issue.spec.ts` — removed escape hatches
- `e2e/write-tests/edit-issue.spec.ts` — no changes needed (already clean)
- `e2e/write-tests/close-issue.spec.ts` — removed escape hatches
- `e2e/write-tests/dependency.spec.ts` — removed escape hatches
- `e2e/write-tests/comment.spec.ts` — removed escape hatches
- `e2e/write-tests/board-dnd.spec.ts` — removed escape hatches
- `e2e/write-tests/bulk-actions.spec.ts` — removed escape hatches

## Replica Sync Evidence

All write operations triggered successful replica syncs:
```
[replica] Syncing replica after write...
[replica] Sync completed in 569ms
```

13 syncs completed during test run, all in ~569ms range.
