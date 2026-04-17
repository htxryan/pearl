# Pearl Tech Stack & Key Commands

## Technology Stack

### Frontend
- **React 19** - Latest React with newest features
- **React Router 7** - App routing and navigation
- **React Query 5** (@tanstack/react-query) - Server state management
- **React Table 8** (@tanstack/react-table) - Virtualized data tables
- **React Virtual 3** - Viewport-based virtualization for long lists
- **Vite 6** - Lightning-fast bundler and dev server
- **Tailwind CSS 4** - Utility-first CSS framework
- **@xyflow/react (XYFlow)** - Interactive node-based UI for dependency graphs
- **Dagre** - Graph layout engine for dependencies
- **dnd-kit** - Modern drag & drop library (sortable, core)
- **date-fns** - Lightweight date utility library
- **react-markdown** - Render markdown in the UI
- **cmdk** - Command palette component

### Backend
- **Fastify 5** - Modern, fast Node.js web framework
- **MySQL2/promise** - MySQL client for Dolt database
- **execa** - Execute CLI commands (calls `bd` CLI)
- **open** - Auto-open browser on startup
- **picocolors** - Minimal terminal color library
- **pino-pretty** - Pretty JSON logging

### Database
- **Dolt** - Git-native SQL database
  - Installed separately from system
  - Embedded mode: Pearl starts `dolt sql-server` process
  - Server mode: Connects to external Dolt server
- **Config**: `.beads/config.yaml`

### Development & Quality
- **TypeScript 5.7** - Strict typing throughout
- **Biome 2.4** - Linting, formatting, all-in-one
- **Vitest 3** - Unit testing (Vite-native)
- **Playwright 1.59** - E2E testing (chromium, write-tests projects)
- **husky** - Git hooks for pre-commit checks
- **lint-staged** - Run linters on staged files

## Key Npm/pnpm Commands

### Root Workspace Commands

```bash
# Development
pnpm dev                 # Start Fastify (3456) + Vite frontend (5173)
pnpm build               # Build all packages
pnpm typecheck          # TypeScript checks for all packages

# Quality
pnpm test               # Run all unit tests (Vitest)
pnpm lint               # Check code with Biome (read-only)
pnpm lint:fix           # Auto-fix linting issues
pnpm format             # Format code with Biome

# E2E Testing
pnpm test:e2e           # Run all Playwright tests
pnpm test:e2e:read      # Read-only tests (no writes to database)
pnpm test:e2e:write     # Write tests (full CRUD)
pnpm test:e2e:ui        # Interactive Playwright UI

# Publishing (via Task runner)
task publish            # Build + publish to npm (requires npm auth)
task publish:dry        # Dry-run publish (no upload)
```

### Pearl-bdui Specific

```bash
pnpm --filter pearl-bdui dev       # Start just the backend with tsx watch
pnpm --filter pearl-bdui build     # Compile TypeScript
pnpm --filter pearl-bdui build:dist # Build dist + bundle frontend
pnpm --filter pearl-bdui test      # Run backend unit tests
pnpm --filter pearl-bdui start     # Run built backend
```

### Frontend Specific

```bash
pnpm --filter @pearl/frontend dev          # Vite dev server (port 5173)
pnpm --filter @pearl/frontend build        # TypeScript + Vite build
pnpm --filter @pearl/frontend preview      # Preview built app
pnpm --filter @pearl/frontend typecheck    # Type checking
```

## Entry Points

### CLI (User-Facing)

```bash
npx pearl-bdui                    # Runs from npm
npx pearl-bdui --help             # Shows help
npx pearl-bdui --version          # Shows version
npx pearl-bdui --no-open          # Don't auto-open browser
```

### Node.js Programmatic

```bash
npm install pearl-bdui
# package.json exports:
# - main: ./dist/index.js (server API)
# - bin.pearl-bdui: bin/pearl.js (CLI script)
```

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `3456` | Backend server port |
| `DOLT_HOST` | `127.0.0.1` | Dolt SQL host (server mode only) |
| `DOLT_PORT` | `3307` | Dolt SQL port |
| `DEBUG` | unset | Enable debug logging (Fastify uses pino) |

## File Structure Quick Reference

```
packages/
  pearl-bdui/
    src/
      index.ts → CLI entry point
      server.ts → Fastify app factory
      config.ts → Config loading logic
      errors.ts → API error definitions
      dolt/ → Dolt process/pool management
      routes/ → API endpoints (HTTP handlers)
      write-service/ → Issue mutations via Beads CLI
    bin/pearl.js → Shell script for npx/npm bin
    dist/ → Compiled JS output
    frontend-dist/ → Built React app
  frontend/
    src/
      app.tsx → Root component & Router
      views/ → Page components
      components/ → UI components
      hooks/ → React hooks (API integration)
      lib/ → Utilities
  shared/
    src/
      index.ts → TypeScript type definitions only
```

## Git & Release Workflow

- **Branching**: Feature branches off `main`
- **Commits**: Use conventional commits (feat:, fix:, docs:, test:, refactor:, etc.)
- **Release**: release-please PR → merge → auto-publish to npm via OIDC
- **No manual versioning needed**

## Quality Standards

All code must pass before commit:
- TypeScript strict mode
- Biome lint checks
- Biome format checks
- All tests passing

Run pre-commit to verify:
```bash
pnpm lint:fix && pnpm typecheck && pnpm test && pnpm test:e2e
```
