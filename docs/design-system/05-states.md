# 05 — States

Every data-dependent view has five possible states. Happy-path-only UIs are the single most common AI-laziness failure. This doc is the checklist and the template.

| State | Meaning | Default pattern |
|---|---|---|
| **Loading** | Data is in flight, no cached copy | Skeleton shimmer (never blank, never spinner-only) |
| **Empty** | Data arrived, collection is empty | `EmptyState` component |
| **Partial** | Some data arrived, more loading or filtered out | Render what we have + an inline hint |
| **Error** | Request failed | Inline error with retry action |
| **Offline / degraded** | Network or backend unreachable | Banner at app level + cached data where possible |

## Loading

### Rule

Never show a blank screen while fetching. Skeletons are the default.

### Skeleton pattern

Use `.skeleton-shimmer` (defined in `index.css`):

```tsx
<div className="h-4 w-32 rounded bg-muted skeleton-shimmer" />
```

Build skeletons that **match the shape** of the real content — same dimensions, same layout, same line count for text. A skeleton that doesn't match causes layout shift when real data arrives (bad CLS).

### When a spinner is OK

- Inside a button that's submitting (`<Button disabled><Spinner /> Saving…</Button>`)
- For actions under 300ms where a skeleton would flash
- As a fallback inside a Suspense boundary when the data shape is unknown

### Initial-load vs. subsequent-fetch

- **First load (no cache):** show skeletons.
- **Refetch with cached data:** show stale data + a subtle indicator (small spinner top-right, or `opacity-80`). Don't wipe the screen.

TanStack Query's `isPending` vs `isFetching` distinction maps directly to this.

## Empty

### Rule

Every list, table, board, or graph has an `EmptyState` when its data is empty.

### Template

```tsx
<EmptyState
  icon="📋"
  title="No issues yet"
  description="Create your first issue to start tracking work."
  action={{ label: "Create issue", onClick: openCreateModal }}
/>
```

### Copy checklist

- **Title** — states what the view is for, not that it's empty. ✅ "No issues yet" not "Empty"
- **Description** — one sentence, no apology, points toward the action
- **CTA** — optional but preferred. If there's no user action available (e.g., filtered view), omit it.

### Filtered-empty vs. genuinely-empty

These are different states — distinguish them:

- **Genuinely empty** (no data exists): "No issues yet" + create CTA
- **Filtered empty** (data exists but filters hide it): "No issues match these filters" + "Clear filters" CTA

## Partial

A list that's loading more, a paginated view mid-fetch, a search with live-updating results — all "partial" states. The rule: render what we have, make it obvious more is coming.

- Pagination: show a `Loading more…` row at the bottom or an intersection-observer trigger
- Streaming: show partial results with a pulse on the newest row
- Filtered: if a filter is applied and data is loading, keep the previous results dimmed (`opacity-60`) until new results replace them

Never replace visible content with a skeleton — it reads as a regression.

## Error

### Rule

Every fetch can fail; every view must have an error path.

### Inline error pattern

For a failed fetch within a view:

```tsx
<div className="rounded-[var(--radius)] border border-danger/30 bg-danger/10 p-4">
  <p className="text-sm font-medium text-danger-foreground">Couldn't load issues</p>
  <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
  <Button variant="outline" size="sm" className="mt-3" onClick={retry}>Retry</Button>
</div>
```

### Full-page errors

`components/error-boundary.tsx` catches React render errors. App-level boundaries render a full-page error UI with a "Reload" action.

### Error copy

- Name the failure in human terms: "Couldn't load issues" not "Request failed with status 500"
- Include the underlying message in a muted secondary line for debugging, but don't lead with it
- Always offer a next step — retry, reload, or a link to file a bug

### Validation errors

Inline, immediate, under the field. Fire on `blur` (not `change`) so users aren't told they're wrong while still typing. Never rely on submit-time-only validation.

### Errors to design *out*

Per Ousterhout: the best error is one that can't happen.

- Disable submit until the form is valid (no "please fix errors" toast)
- Default inputs to valid values (date pickers default to today; selects default to the first reasonable option)
- Constrain types at the API boundary so the UI never receives invalid shapes

## Offline / degraded

Pearl is local-first; the backend is usually on `localhost`. But the backend can be:

- Not running (fresh install, crashed process)
- In embedded mode vs. server mode (different capabilities)
- In a migration state (temporary unavailability)

### App-level pattern

`components/health-banner.tsx` shows a persistent banner when backend health fails. Rules:

- Banner text names the problem and the fix
- Banner is dismissible only if the degraded mode still allows meaningful work; otherwise sticky
- Cached data in TanStack Query remains visible; mutations are disabled (buttons show reason in `title=`)

### Offline toasts

When a mutation fails due to network, the toast retry-retries automatically up to 3 times before surfacing to the user. Manual retry via toast action button.

## State interactions matrix

Every view should satisfy this checklist:

- [ ] Has a skeleton loading state
- [ ] Has an empty state (filtered + genuine variants if both apply)
- [ ] Has an inline error state with retry
- [ ] Degrades gracefully when offline (shows cached data, disables mutations clearly)
- [ ] Does not wipe content on refetch (stale-while-revalidate)
- [ ] Validates forms inline, not just on submit
- [ ] Disabled buttons explain why (via `title=` or helper text)

If any box is unchecked, the view is not done. This is not optional.
