---
title: Configuration
description: Environment variables and settings reference for Pearl.
sidebar:
  order: 3
---

Pearl reads configuration from environment variables and `.beads/metadata.json`. All settings have sensible defaults — most users won't need to change anything.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3456` | Pearl server port |
| `DOLT_HOST` | `127.0.0.1` | Dolt SQL server host |
| `DOLT_PORT` | `3307` | Dolt SQL server port |
| `DOLT_USER` | `root` | Dolt SQL user |
| `DOLT_PASSWORD` | _(empty)_ | Dolt SQL password |
| `BD_PATH` | `bd` | Path to the `bd` CLI binary |
| `DOLT_PATH` | `dolt` | Path to the `dolt` binary |
| `LOG_LEVEL` | `info` | Pino log level (`debug`, `info`, `warn`, `error`) |
| `NODE_ENV` | _(unset)_ | Set to `production` to disable pretty-print logging |

### Examples

Run Pearl on a custom port:

```bash
PORT=8080 npx pearl-bdui
```

Connect to a remote Dolt server:

```bash
DOLT_HOST=192.168.1.100 DOLT_PORT=3307 npx pearl-bdui
```

Enable debug logging:

```bash
LOG_LEVEL=debug npx pearl-bdui
```

## Project metadata

Pearl stores project-level settings in `.beads/metadata.json`. This file is created automatically on first run and tracks:

- Database mode (Pearl-managed or external)
- Migration state
- Project identity

You typically don't need to edit this file directly — Pearl manages it through the UI.

## Database path discovery

Pearl finds your project's database by searching for a `.beads/` directory:

1. Start from the current working directory
2. Walk up the directory tree until a `.beads/` directory is found
3. Use that directory as the project root

This means you can run `pearl-bdui` from any subdirectory of your project.

## Server architecture

Pearl runs a Fastify server that serves both the API and the bundled frontend:

- **API routes** — RESTful endpoints for issues, comments, labels, dependencies, and more
- **Static frontend** — The React SPA is bundled and served from the same server
- **Database** — Connects to a Dolt SQL server using a connection pool with primary/replica split

In development mode, the frontend runs on a separate Vite dev server (port 5173) that proxies API requests to the backend.

## Next steps

- [Install & Modes](/docs/install/) — database mode options
- [Troubleshooting](/docs/troubleshooting/) — common issues and solutions
