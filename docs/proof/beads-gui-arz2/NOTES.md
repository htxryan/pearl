# Proof: beads-gui-arz2 — Wire notifyCommentAdded into comment mutation hook

## Nature of Change

This is a non-visual internal wiring fix: connecting an already-implemented notification
function (`notifyCommentAdded`) to the comment mutation hook (`useAddComment`). The function
was exported and unit-tested but never called from the mutation's `onSuccess` callback.

## Why Screenshots Are Not Applicable

The change wires an internal function call in a React Query mutation hook's `onSuccess`
callback. There is no new UI, no changed rendering, and no visual difference. The
notification system itself (toast/browser push) was already implemented and tested — only
the call site was missing.

## Evidence

### Test Results

**Full test suite: 503/503 tests pass across 26 test files (0 failures)**

Two new integration tests were added to `data-flow.test.ts`:

1. **`useAddComment calls notifyCommentAdded when response has data and issue is cached`** — 
   Verifies that when the API returns a Comment with an author, and the issue is in the
   query cache, `notifyCommentAdded` is called with `(issueId, issueTitle, author)`.

2. **`useAddComment skips notification when response has no data`** — 
   Verifies the guard clause: when `response.data` is undefined, the notification is not
   triggered.

### Code Change Summary

- **`packages/frontend/src/hooks/use-issues.ts`**: Added import of `notifyCommentAdded`
  and 6 lines in `onSuccess` to look up the issue title from the query cache and call
  the notification function.
- **`packages/frontend/src/integration/data-flow.test.ts`**: Added mock for
  `use-notifications` module and 2 new test cases (46 lines).

### Type Safety

TypeScript compilation passes with `--noEmit` — no type errors introduced.
