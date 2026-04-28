# Setup Guide

This guide covers both end-user setup (running Pearl) and contributor setup (developing Pearl).

## End-User Quick Start

### Prerequisites

- **Node.js >= 22**
- **[Dolt](https://docs.dolthub.com/introduction/installation)** installed and on your PATH
- A project with a `.beads/` directory (created by `bd init`)

### Running Pearl

```bash
npx pearl-bdui
```

Pearl auto-discovers the nearest `.beads/` directory (searching up the directory tree), starts a Dolt SQL server if needed, and opens the UI in your browser at `http://127.0.0.1:3456`.

### First-Time Setup

If your project uses the legacy embedded Dolt mode, Pearl shows a migration dialog on first launch with two options:

1. **Pearl-managed server**: Pearl spawns and supervises a `dolt sql-server` for you. Recommended for single-user setups. Data is stored in `.beads/dolt-data/`.

2. **External server**: You run `dolt sql-server` yourself and tell Pearl where to connect. Use this for team setups or when you need custom Dolt configuration.

```bash
# Start your own Dolt server
cd /path/to/project
dolt sql-server --host 127.0.0.1 --port 3307

# Then point Pearl at it
DOLT_HOST=127.0.0.1 DOLT_PORT=3307 npx pearl-bdui
```

### Configuration

Pearl reads configuration from environment variables and `.beads/metadata.json`:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3456` | Pearl server port |
| `DOLT_HOST` | `127.0.0.1` | Dolt SQL server host |
| `DOLT_PORT` | `3307` | Dolt SQL server port |
| `DOLT_USER` | `root` | Dolt SQL user |
| `DOLT_PASSWORD` | _(empty)_ | Dolt SQL password |
| `BD_PATH` | `bd` | Path to the `bd` CLI binary |
| `DOLT_PATH` | `dolt` | Path to the `dolt` binary |

---

## Contributor Setup

### Prerequisites

- **Node.js >= 22**
- **pnpm** (install via `corepack enable` or `npm install -g pnpm`)
- **[Dolt](https://docs.dolthub.com/introduction/installation)**
- **[Playwright browsers](https://playwright.dev/docs/intro)** (for E2E tests): `pnpm exec playwright install`

### Getting Started

```bash
git clone https://github.com/htxryan/pearl.git
cd pearl
pnpm install
```

### Development Server

```bash
pnpm dev
```

This starts:
- **Backend** (Fastify) on `http://127.0.0.1:3456`
- **Frontend** (Vite) on `http://127.0.0.1:5173` (proxies API requests to the backend)

You need a `.beads/` directory in the project root or a parent directory. If you don't have one, initialize a sample project:

```bash
bd init
```

### Build

```bash
pnpm build          # Build all packages (shared → backend → frontend)
```

Build order matters: `shared` must compile first because `pearl-bdui` and `frontend` import from its `dist/`.

### Testing

```bash
pnpm test           # Unit/integration tests (Vitest)
pnpm typecheck      # TypeScript type checking
pnpm lint           # Biome linter
pnpm lint:fix       # Auto-fix lintable issues
pnpm format         # Biome formatter
pnpm test:e2e       # Playwright end-to-end tests
pnpm test:e2e:ui    # Playwright with interactive UI
pnpm lint:deps      # Dependency cruiser (architecture validation)
```

Pre-commit hooks (Husky + lint-staged) run Biome checks automatically on staged files.

### Project Layout

```
pearl/
├── packages/
│   ├── shared/           # TypeScript types (API contract)
│   │   └── src/
│   │       ├── index.ts          # Domain types, enums, request/response types
│   │       └── attachment-syntax.ts  # Attachment ref parser
│   ├── pearl-bdui/       # Backend server (publishable npm package)
│   │   └── src/
│   │       ├── index.ts          # CLI entry point
│   │       ├── server.ts         # Fastify app setup
│   │       ├── config.ts         # Configuration loading
│   │       ├── routes/           # API route handlers
│   │       ├── write-service/    # Serialized mutation pipeline
│   │       ├── dolt/             # Connection pool, server manager
│   │       └── errors.ts         # Custom error types
│   └── frontend/         # React 19 SPA
│       └── src/
│           ├── app.tsx           # Root component + routing
│           ├── views/            # Page-level components
│           ├── components/       # Shared UI components
│           └── hooks/            # Custom React hooks
├── e2e/                  # Playwright E2E test specs
├── docs/                 # Documentation
│   ├── adr/              # Architecture Decision Records
│   ├── specs/            # Feature specifications
│   └── research/         # Investigation documents
├── biome.json            # Biome linter/formatter config
├── playwright.config.ts  # E2E test config
└── pnpm-workspace.yaml   # Workspace package definitions
```

### Tooling

| Tool | Purpose | Config |
|------|---------|--------|
| [Biome](https://biomejs.dev/) | Linting and formatting (replaces ESLint + Prettier) | `biome.json` |
| [Vitest](https://vitest.dev/) | Unit and integration testing | `vitest.config.ts` per package |
| [Playwright](https://playwright.dev/) | End-to-end testing | `playwright.config.ts` |
| [Husky](https://typicode.github.io/husky/) | Git hooks | `.husky/` |
| [lint-staged](https://github.com/lint-staged/lint-staged) | Run checks on staged files | `package.json` |
| [dependency-cruiser](https://github.com/sverweij/dependency-cruiser) | Architecture validation | `.dependency-cruiser.cjs` |
| [Taskfile](https://taskfile.dev/) | Task runner for publishing | `Taskfile.yml` |
| [release-please](https://github.com/googleapis/release-please) | Automated releases | `release-please-manifest.json` |

### Publishing

Releases are automated:

1. Use [conventional commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, etc.)
2. `release-please` opens a release PR with version bump and changelog
3. Merging the release PR triggers GitHub Actions to publish to npm via OIDC

Manual publishing (for testing):

```bash
task publish       # Build + publish to npm
task publish:dry   # Dry run
```

### Common Tasks

**Add a new API endpoint:**
1. Define request/response types in `packages/shared/src/index.ts`
2. Create or extend a route handler in `packages/pearl-bdui/src/routes/`
3. If it's a mutation, add a method to `WriteService`
4. Add frontend API call via TanStack Query

**Add a new frontend view:**
1. Create the view component in `packages/frontend/src/views/`
2. Add the route in `packages/frontend/src/app.tsx`
3. Add navigation link in `packages/frontend/src/components/app-shell.tsx`

**Modify the database schema:**
Schema changes happen via the `bd` CLI or migration functions in `packages/pearl-bdui/src/routes/issues.ts` (see `ensureHasAttachmentsColumn` pattern).
