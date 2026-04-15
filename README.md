# Pearl: A Beads Web UI

[![CI](https://github.com/htxryan/pearl/actions/workflows/ci.yml/badge.svg)](https://github.com/htxryan/pearl/actions/workflows/ci.yml)

Rich web UI for the [Beads](https://github.com/mantoni/beads) AI work management system.

## Quick Start

Run Pearl in any project directory that has a `.beads/` folder:

```bash
npx pearl-bdui
```

This starts the Pearl server and opens your browser to the UI.

### Options

```
pearl-bdui [options]

  -h, --help     Show help
  -v, --version  Show version
  --no-open      Don't open browser automatically
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3456` | Server port |
| `DOLT_HOST` | `127.0.0.1` | Dolt SQL server host (server mode) |
| `DOLT_PORT` | `3307` | Dolt SQL server port |

## Install

### Via npx (recommended)

```bash
npx pearl-bdui
```

Always runs the latest version. No install needed.

### Global install

```bash
npm install -g pearl-bdui
pearl-bdui
```

### Requirements

- Node.js >= 22
- [Dolt](https://docs.dolthub.com/introduction/installation) (for the embedded database)
- A project with a `.beads/` directory (created by the `bd` CLI)

## Development

```bash
git clone https://github.com/htxryan/pearl.git
cd pearl
pnpm install
pnpm dev
```

This starts the backend (Fastify on port 3456) and frontend (Vite on port 5173) in development mode.

### Project Structure

```
packages/
  pearl-bdui/ # Publishable package: Fastify server + bundled frontend
  frontend/   # React 19 SPA with Vite, TailwindCSS, React Flow
  shared/     # Shared TypeScript types (API contract)
```

### Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build all packages |
| `pnpm test` | Run all tests |
| `pnpm typecheck` | TypeScript type checking |
| `pnpm test:e2e` | Run Playwright end-to-end tests |
| `task publish` | Build and publish to npm |
| `task publish:dry` | Dry-run publish |

### Publishing

```bash
task publish
```

The `prepublishOnly` hook automatically runs `build:dist` which builds all packages, copies frontend assets, inlines shared types, and verifies the artifact.

## License

Apache-2.0
