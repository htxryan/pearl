# Pearl Development Workflow

## Setting Up Development Environment

```bash
# Install dependencies (pnpm required)
cd /Users/redhale/src/pearl
pnpm install

# Verify Node.js >= 22
node --version

# Verify Dolt installed
dolt version
```

## Running the Project

### Full Development (Backend + Frontend)

```bash
pnpm dev
```

Starts:
- **Fastify backend**: http://localhost:3456 (API server)
- **Vite frontend**: http://localhost:5173 (dev server with HMR)
- Both watch for changes and hot-reload

In development mode:
- Backend uses tsx watch (immediate reload on .ts changes)
- Frontend uses Vite HMR (hot module replacement)
- Both serve from same localhost for CORS-free development

### Backend Only (Production-like)

```bash
pnpm --filter pearl-bdui dev
```

Starts only Fastify on port 3456 (no frontend hot reload).

### Built Mode (Production Preview)

```bash
pnpm build
pnpm --filter pearl-bdui start
```

Runs compiled backend with bundled frontend.

## Development Workflow

### 1. Create Branch & Claim Issue

```bash
# If using Beads issue tracker
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work

# Or use git
git checkout -b feature/your-feature-name
```

### 2. Make Changes

Edit files in `packages/` as needed. The dev server auto-reloads.

For **backend** changes:
- Edit files in `packages/pearl-bdui/src/`
- TypeScript compiles on save (tsx watch)
- API changes: update types in `@pearl/shared` first

For **frontend** changes:
- Edit files in `packages/frontend/src/`
- Vite hot-reloads on save
- Type safety from `@pearl/shared` types

For **type changes**:
- Edit `packages/shared/src/index.ts`
- Other packages auto-rebuild

### 3. Verify Changes

```bash
# Type checking
pnpm typecheck

# Linting (read-only)
pnpm lint

# Auto-fix linting/formatting issues
pnpm lint:fix
pnpm format

# Run unit tests
pnpm test

# Run E2E tests
pnpm test:e2e        # All tests
pnpm test:e2e:read   # Read-only tests only (faster)
pnpm test:e2e:ui     # Interactive Playwright UI
```

### 4. Commit Changes

```bash
# Stage files (pre-commit hook runs biome check --write)
git add .

# Commit with conventional commit message
git commit -m "feat: add new feature" 
# or
git commit -m "fix: correct issue with X"
# or
git commit -m "docs: update README"
```

Conventional commit types:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `test:` - Add/update tests
- `refactor:` - Code refactoring (no behavior change)
- `chore:` - Build, deps, CI config (not shown in changelog)
- `perf:` - Performance improvement

### 5. Before Pushing

```bash
# Final verification before push
pnpm typecheck && pnpm test && pnpm lint:fix

# Create PR / push
git push origin feature/your-feature-name
```

## Testing Strategy

### Unit Tests (Vitest)

```bash
pnpm test                    # Run all unit tests
pnpm --filter pearl-bdui test   # Backend tests only
pnpm --filter @pearl/frontend test # Frontend tests only
```

Write tests in `*.test.ts` next to source files.

### Integration Tests (Vitest)

```bash
pnpm test                    # Includes *.integration.test.ts
```

Write integration tests in `*.integration.test.ts`.

### E2E Tests (Playwright)

```bash
pnpm test:e2e               # Run all E2E tests (both projects)
pnpm test:e2e:read          # Read-only tests only (faster CI)
pnpm test:e2e:write         # Write tests (full CRUD)
pnpm test:e2e:ui            # Interactive debug UI
```

E2E tests in `/e2e/` directory:
- **chromium project**: Read-only tests
- **write-tests project**: Full CRUD tests

## Building for Release

```bash
# Build all packages
pnpm build

# Create dist artifacts for publishing
pnpm --filter pearl-bdui build:dist

# Locally publish (for testing)
npm run publish:dry

# The prepublishOnly hook runs build:dist automatically on npm publish
```

## Publishing Workflow

**Automatic via release-please**:

1. Merge PR to `main` with conventional commits
2. release-please bot opens a release PR with:
   - Version bump (semantic versioning)
   - Generated changelog
3. Merge the release PR
4. GitHub Actions:
   - Creates GitHub release
   - Publishes to npm via OIDC (no credentials needed)

**Manual publish** (for local testing):

```bash
task publish:dry   # Dry run
task publish       # Actually publish to npm
```

Requires npm authenticated (run `npm login` first).

## Troubleshooting

### "Cannot find .beads directory"

Pearl looks for `.beads/` in the current directory, then parent directories up to root.

```bash
# Make sure you're in a project with .beads/
ls -la .beads/
```

### Dolt server won't start

Check if port 3307 is in use:

```bash
lsof -i :3307
# Kill if needed
kill -9 <PID>
```

Or use different port:

```bash
DOLT_PORT=3308 pnpm dev
```

### Tests failing

Clear node_modules and reinstall:

```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm test
```

### Type errors after editing @pearl/shared

The shared package is imported as a workspace dependency. Rebuild it:

```bash
pnpm --filter @pearl/shared build
pnpm dev  # Restart dev servers
```

## Key Files Reference

- **API Contract**: `packages/shared/src/index.ts`
- **Backend Server**: `packages/pearl-bdui/src/server.ts`
- **CLI Entry**: `packages/pearl-bdui/bin/pearl.js`
- **Frontend Router**: `packages/frontend/src/app.tsx`
- **Dolt Management**: `packages/pearl-bdui/src/dolt/server-manager.ts`
- **Write Service**: `packages/pearl-bdui/src/write-service/write-service.ts`
- **Configuration**: `packages/pearl-bdui/src/config.ts`
- **Shared Types**: `packages/shared/src/index.ts`

## Performance Tips

1. **Use React Query hooks** for data fetching (automatic caching)
2. **Use React Virtual** for lists > 100 items
3. **Avoid SELECT *** - use IssueListItem projection for list queries
4. **Check connection pool health** if database seems slow
5. **Profile bundle size** with Vite: `pnpm --filter @pearl/frontend build --analyze`

## Resources

- **Project README**: `/Users/redhale/src/pearl/README.md`
- **Beads Documentation**: https://github.com/steveyegge/beads
- **Fastify Docs**: https://www.fastify.io/
- **React Query Docs**: https://tanstack.com/query/latest
- **Tailwind CSS Docs**: https://tailwindcss.com/
- **Vite Docs**: https://vitejs.dev/
- **Playwright Docs**: https://playwright.dev/
