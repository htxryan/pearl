---
title: Install & Modes
description: Installation methods and database mode options for Pearl.
sidebar:
  order: 2
---

Pearl can run as a one-off via `npx` or be installed permanently. It connects to Dolt in two modes — Pearl-managed or external — depending on your team setup.

## Installation methods

### Via npx (recommended)

```bash
npx pearl-bdui
```

Always runs the latest version. No installation needed.

### Global install

```bash
npm install -g pearl-bdui
pearl-bdui
```

Pin a specific version for reproducibility.

### Requirements

- **Node.js** >= 22
- **[Dolt](https://docs.dolthub.com/introduction/installation)** installed and on your `PATH`
- A project with a `.beads/` directory (created by `bd init`)

## Database modes

Pearl runs against a Dolt SQL server. On first start, if your project uses the legacy embedded mode, Pearl shows a migration dialog with two options.

### Pearl-managed mode

Pearl spawns and supervises a `dolt sql-server` for you. Recommended for single-user setups.

- Data is stored in `.beads/doltdb/`
- Pearl starts the server on launch and stops it on exit
- No configuration needed — it just works

### External server mode

You run `dolt sql-server` yourself and tell Pearl where to connect. Use this for team setups or when you need custom Dolt configuration.

```bash
# Start your own Dolt server
cd /path/to/project
dolt sql-server --host 127.0.0.1 --port 3307

# Point Pearl at it
DOLT_HOST=127.0.0.1 DOLT_PORT=3307 npx pearl-bdui
```

External mode is required when multiple developers need to read and write issues concurrently.

### Choosing a mode

| Scenario | Recommended mode |
|----------|-----------------|
| Solo developer, single machine | Pearl-managed |
| Team sharing a Dolt server | External |
| CI or automated environments | External |
| Trying Pearl for the first time | Pearl-managed |

## Project structure

Pearl stores all data inside your repository:

```
your-project/
├── .beads/
│   ├── doltdb/        # Dolt database files
│   └── metadata.json  # Project metadata
├── src/
│   └── ...
└── ...
```

The `.beads/` directory is Git-friendly — commit it to share issue history with your team, or add it to `.gitignore` for private tracking.

## Next steps

- [Configuration](/docs/configuration/) — environment variables and settings
- [Quickstart](/docs/quickstart/) — get running in under a minute
