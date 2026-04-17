# Pearl Architecture & Code Conventions

## Architecture Patterns

### Backend Architecture

#### 1. Config Loading (config.ts)

```
startup → loadConfig() → 
  - Find .beads directory (traverse up from cwd)
  - Read .beads/config.yaml (BeadsMetadata)
  - Determine dolt mode (embedded vs server)
  - Return Config object with:
    - doltMode, doltPath, doltHost, doltPort
    - Database paths, connection pooling settings
    - Port, host for Fastify server
```

#### 2. Dolt Lifecycle Management (dolt/server-manager.ts)

- **DoltServerManager**: Controls `dolt sql-server` process lifecycle
  - States: stopped → starting → running → error (with auto-restart)
  - Health checks via connection attempts
  - Debounced restart with exponential backoff
  - State change listeners for server status updates

#### 3. Database Connection Pooling (dolt/pool.ts)

- **createDoltPool()**: Creates mysql2 connection pool
- **Sync barrier**: Blocks reads during replica sync (prevents "database is locked" errors)
- **beginSync() / endSync()**: Coordinate replica sync operations
- **awaitSync()**: Readers wait for sync to complete

#### 4. API Routes (routes/)

Each route file exports Fastify handlers for specific domains:

- **issues.ts**
  - GET /api/issues (list with filter/sort)
  - GET /api/issues/:id (single issue)
  - POST /api/issues (create)
  - PUT /api/issues/:id (update)
  - DELETE /api/issues/:id (soft-delete via bd CLI)

- **dependencies.ts**
  - GET /api/dependencies (list deps for an issue)
  - POST /api/dependencies (create)
  - DELETE /api/dependencies/:id (delete)

- **labels.ts**
  - GET /api/labels (list label definitions)
  - POST /api/labels (create/upsert)
  - DELETE /api/labels/:name (delete)

- **stats.ts**
  - GET /api/stats (issue counts by status/priority/type)

- **health.ts**
  - GET /api/health (server & dolt status)

- **setup.ts**
  - GET /api/setup (config status)
  - POST /api/setup/initialize (initial setup wizard)

#### 5. Write Service (write-service/)

Mutations don't write directly to database. Instead:

1. **Route handler** receives mutation request
2. **write-service.ts** queues the request
3. **Queue** serializes writes (prevents race conditions)
4. **Writer** (issue-writer.ts, dependency-writer.ts, etc.) prepares mutation
5. **bd-runner.ts** invokes Beads CLI command (e.g., `bd update <id>`)
6. **CLI execution** handles git commit + database update
7. **Client invalidation**: Response includes InvalidationHints for cache invalidation

### Frontend Architecture

#### 1. App Structure (app.tsx)

```
<App>
  ├── <ThemeProvider>
  ├── <ToastContainer>
  ├── <Router>
  │   ├── <Layout>  (nav, theme toggle, etc.)
  │   └── <Routes>
  │       ├── /board → <BoardView>
  │       ├── /issues/:id → <IssueDetailView>
  │       ├── /dependencies → <DependencyGraphView>
  │       └── ...
```

#### 2. Data Fetching (hooks/)

Uses React Query for server state:

```typescript
// Example: useIssues hook
const { data, isLoading, error } = useQuery({
  queryKey: ['issues', filters],
  queryFn: () => api.getIssues(filters),
})
```

Benefits:
- Automatic caching & deduplication
- Background refetching
- Optimistic updates
- Automatic retry on failure

#### 3. Components (components/)

Organized by domain:
- `ui/` → Low-level UI primitives (Button, Dialog, DatePicker, etc.)
- `board/` → Kanban board components
- Other domain-specific components (labels, status badges, etc.)

#### 4. Views (views/)

Page-level components for routes:
- BoardView
- TableView (virtualized list)
- IssueDetailView
- DependencyGraphView (using @xyflow/react)
- SettingsView

#### 5. Styling Strategy

- **Tailwind CSS 4** with utility classes
- **tailwind-merge** for prop-based className overrides
- **clsx** for conditional classes
- Custom theme colors in theme/
- Dark/light mode via CSS variables

### Shared Types

**@pearl/shared/src/index.ts** defines the API contract:

- **Domain types**: Issue, Dependency, Comment, Event, Label
- **Request types**: CreateIssueRequest, UpdateIssueRequest, etc.
- **Response types**: MutationResponse<T>, ApiError, HealthResponse
- **Value arrays**: ISSUE_STATUSES, ISSUE_PRIORITIES, ISSUE_TYPES (single source of truth)
- **Enums**: IssueStatus, Priority, IssueType, DependencyType, ApiErrorCode

All backend/frontend code imports from `@pearl/shared` for type safety.

## Code Conventions

### TypeScript

- **Strict mode enabled** (tsconfig.json)
- **Interfaces for public APIs**, types for internal use
- **Explicit return types** on all functions
- **No `any` type** (use `unknown` + type guards)
- **Imports over requires** (ES modules throughout)

### Naming

- **Files**: kebab-case (e.g., `server-manager.ts`, `issue-writer.ts`)
- **Functions/Variables**: camelCase (e.g., `createServer()`, `doltPool`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `ISSUE_STATUSES`)
- **Types/Interfaces**: PascalCase (e.g., `Config`, `Issue`, `IssueStatus`)
- **API routes**: lowercase with hyphens (e.g., `/api/issues/`, `/api/labels/`)

### Error Handling

All errors go through `errors.ts`:

```typescript
export function doltUnavailableError(message: string): ApiError
export function databaseLockedError(): ApiError
export function validationError(message: string): ApiError
```

Each error has:
- **code**: Machine-readable error type (for client retry logic)
- **message**: Human-readable error message
- **retryable**: Whether the client should retry

### Testing

- **Unit tests** (Vitest): `*.test.ts` files next to source
- **Integration tests** (Vitest): `*.integration.test.ts` files
- **E2E tests** (Playwright): `/e2e/` directory, chromium + write-tests projects
- **Test utils**: `test-setup.ts` in each package

## Performance Patterns

### Frontend Optimization

- **React Query caching**: Automatic cache management
- **React Virtual**: Render only visible items in long lists
- **React Table**: Virtualized data table
- **Code splitting**: Vite automatically code-splits routes
- **Image optimization**: Lazy-load where applicable

### Backend Optimization

- **Connection pooling**: Reuse DB connections
- **Query projection**: Never SELECT *, use IssueListItem for list queries
- **Sync barrier**: Block reads during replica sync (atomic operations)
- **Debounced restarts**: Don't spam restart attempts on Dolt failures

## Git & Commit Conventions

- **Conventional commits**: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`
- **Scope optional**: `feat(frontend): add dark mode` or just `feat: add dark mode`
- **No emoji in commits** (Biome will reject them in some contexts)
- **Meaningful commit messages** (release-please generates changelog from these)

## Code Quality Gates

Before pushing:

1. **pnpm lint:fix** - Auto-fix formatting & simple lint issues
2. **pnpm typecheck** - Ensure no TypeScript errors
3. **pnpm test** - Unit tests must pass
4. **pnpm test:e2e** - E2E tests must pass (or --no-open, quick smoke tests)

These are enforced via husky pre-commit hook (lint-staged).

## Documentation Standards

- **JSDoc comments** on exported functions
- **README.md** at package level explaining purpose & setup
- **Inline comments** for non-obvious logic (e.g., sync barrier explanation)
- **CLAUDE.md** for AI agent instructions (Beads integration docs)
