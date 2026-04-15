# Proof: beads-gui-upz - Epic hierarchy bug fix

## Bug
Epic hierarchy conflated dependency edges with parent-child relationships.
`list-view.tsx:62` treated ANY dependency where `dep.issue_id` is an epic as a
child relationship, even pure-prerequisite dependencies.

## Fix
1. Added `"contains"` to `DependencyType` union in `packages/shared/src/index.ts`
2. Added `"contains"` to backend validation enum in `packages/backend/src/routes/dependencies.ts`
3. Changed `epicProgress` computation in `list-view.tsx` to only count `dep.type === "contains"` dependencies as parent-child

## Evidence

### Type checks
All packages pass `pnpm typecheck` with zero errors.

### Unit tests
240/240 tests pass across 13 test files.

### E2E tests
21/22 E2E tests pass. The single failure (`search filter narrows results`) is
pre-existing and unrelated (seed data doesn't contain "dashboard" text).

### Code change
```diff
-    for (const dep of allDeps) {
-      if (epicIds.has(dep.issue_id) && dep.depends_on_id !== dep.issue_id) {
+    for (const dep of allDeps) {
+      if (dep.type === "contains" && epicIds.has(dep.issue_id) && dep.depends_on_id !== dep.issue_id) {
```

Only `"contains"` type dependencies now represent parent-child hierarchy.
Other types (`blocks`, `depends_on`, `relates_to`, `discovered_from`) are
correctly treated as prerequisite/informational links.
