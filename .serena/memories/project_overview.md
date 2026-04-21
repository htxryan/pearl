# Pearl Project Overview

## What is Pearl?

**Pearl** is a rich web UI for the **Beads** AI-native issue tracking system. Beads is a Git-native, CLI-first issue tracker that lives in your codebase (stored in a `.beads/` directory as a Dolt database).

Pearl provides a modern web interface to interact with Beads issues, complementing the CLI-based workflow.

## Key Features

- **Beads Integration**: Reads/writes from `.beads/` directory (Dolt database)
- **Full CRUD**: Create, view, update, and delete issues
- **Dependencies**: Track blocking relationships between issues
- **Labels & Metadata**: Rich issue metadata with custom labels and color coding
- **Real-time Sync**: Syncs with Beads CLI commands
- **Setup Wizard**: Guided configuration for Embedded vs Server Dolt modes
- **Statistics**: Issue counts by status, priority, type

## Tech Stack

- **Language**: TypeScript (strict mode)
- **Backend**: Fastify (Node.js 22+) on port 3456
- **Frontend**: React 19 + Vite (dev port 5173)
- **Database**: Dolt (Git-native SQL database)
- **UI Framework**: React Router 7, Tailwind CSS 4, React Query 5
- **Component Libraries**: 
  - React Flow / Dagre (dependency visualization)
  - dnd-kit (drag & drop)
  - React Table (virtualized lists)
- **Dev Tools**: Playwright (E2E tests), Vitest (unit tests), Biome (lint/format)

## Architecture

### Workspace Structure

```
pearl/
├── packages/
│   ├── pearl-bdui/        # Main publishable package (npm: pearl-bdui)
│   │   ├── src/
│   │   │   ├── index.ts              # CLI entry point
│   │   │   ├── config.ts             # Configuration loading
│   │   │   ├── server.ts             # Fastify server setup
│   │   │   ├── errors.ts             # Error handling
│   │   │   ├── dolt/                 # Dolt lifecycle management
│   │   │   │   ├── server-manager.ts # sql-server process lifecycle
│   │   │   │   └── pool.ts           # MySQL connection pooling
│   │   │   ├── routes/               # API endpoints
│   │   │   │   ├── issues.ts         # /api/issues/* endpoints
│   │   │   │   ├── dependencies.ts   # /api/dependencies/* endpoints
│   │   │   │   ├── labels.ts         # /api/labels/* endpoints
│   │   │   │   ├── stats.ts          # /api/stats
│   │   │   │   ├── health.ts         # /api/health
│   │   │   │   └── setup.ts          # /api/setup (onboarding)
│   │   │   └── write-service/        # Issue mutations via Beads CLI
│   │   │       ├── write-service.ts  # Write queue & orchestration
│   │   │       ├── issue-writer.ts   # Issue mutations
│   │   │       ├── dependency-writer.ts
│   │   │       ├── comment-writer.ts
│   │   │       ├── bd-runner.ts      # Beads CLI invocation
│   │   │       └── queue.ts          # Write request queuing
│   │   ├── bin/
│   │   │   └── pearl.js              # CLI entry point (handles --help, --version, --no-open)
│   │   └── scripts/
│   │       └── build-dist.js         # Bundles frontend with backend dist
│   │
│   ├── frontend/              # React SPA (NOT published separately)
│   │   ├── src/
│   │   │   ├── app.tsx               # Root component & routing
│   │   │   ├── main.tsx              # App mount
│   │   │   ├── views/                # Page-level components
│   │   │   ├── components/           # Reusable UI components
│   │   │   ├── hooks/                # React hooks (API calls, state)
│   │   │   ├── lib/                  # Utilities
│   │   │   ├── themes/               # Dark/light theme
│   │   │   └── index.css             # Tailwind styles
│   │   ├── vite.config.ts
│   │   └── tsconfig.json
│   │
│   └── shared/               # Shared API types (published as @pearl/shared)
│       └── src/
│           └── index.ts      # TypeScript interfaces for all domain objects:
│                             # - Issue, IssueListItem
│                             # - IssueStatus, Priority, IssueType
│                             # - Dependency, Comment, Event
│                             # - API request/response types
│                             # - Label definitions
│
├── .beads/                   # Beads issue tracker (Dolt database + config)
├── e2e/                      # Playwright end-to-end tests
├── docs/                     # User documentation
├── scripts/                  # Utility scripts
└── [config files]
```

### Backend Request Flow

1. **CLI Entry** (`bin/pearl.js`) → Loads config, starts Fastify server
2. **Config Loading** → Finds `.beads/` directory, detects Dolt mode (embedded/server)
3. **Dolt Lifecycle** → Starts `dolt sql-server` process (if embedded mode)
4. **Connection Pool** → Creates MySQL connection pool to Dolt
5. **API Routes** → Fastify routes handle GET/POST/PUT requests
6. **Write Operations** → Route handlers queue writes via write-service
7. **Beads CLI** → write-service invokes `bd` CLI for mutations (maintains git history)
8. **Frontend Serving** → Static frontend files served from `/`

### Frontend Architecture

- React 19 with React Router 7
- React Query for server state management
- Tailwind CSS 4 for styling
- Views: Board view, Table view, Dependency graph view
- Theme system: Dark/light modes persisted to localStorage

## How It's Used

### Via npx (Recommended)

```bash
# Navigate to any project with .beads/ folder
cd my-project
npx pearl-bdui          # Runs latest from npm, opens browser automatically
npx pearl-bdui --no-open
```

### Global Install

```bash
npm install -g pearl-bdui
pearl-bdui
```

### Development

```bash
cd pearl
pnpm install
pnpm dev              # Runs Fastify + Vite dev servers
```

## Relationship to Beads (bd CLI)

- **Beads (bd)**: CLI-native issue tracker, git-native, perfect for AI agents
  - Issues stored in `.beads/` directory (Dolt database)
  - All mutations happen via git commits
  - No web UI needed
  - See: https://github.com/steveyegge/beads

- **Pearl**: Modern web UI wrapping Beads
  - Reads from the same `.beads/` database as `bd` CLI
  - Writes back via `bd` CLI invocations (not direct DB writes!)
  - Provides rich UI for humans
  - Complements but doesn't replace `bd` CLI

## Publishing & Distribution

- **Package**: `pearl-bdui` published to npm
- **Automation**: release-please (Google) handles automated releases
- **Trigger**: Merge PRs with conventional commits (feat:, fix:, etc.)
- **Flow**: PR → release-please opens version bump → merge → GitHub release + npm publish via OIDC
