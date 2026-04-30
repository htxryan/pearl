---
title: Quickstart
description: Get Pearl running in under a minute.
sidebar:
  order: 1
---

Pearl is the web UI for the Beads issue tracker. Get it running in under a minute.

## Prerequisites

- **Node.js** 22 or later
- **Dolt** — [install instructions](https://docs.dolthub.com/introduction/installation)

## Run Pearl

The fastest way to try Pearl is with `npx`:

```bash
npx pearl-bdui
```

Pearl auto-discovers the nearest `.beads/` directory, starts a Dolt SQL server if needed, and opens the web UI in your browser.

### CLI options

```
pearl-bdui [options]

  -h, --help     Show help
  -v, --version  Show version
  --no-open      Don't open browser automatically
```

## What happens on first run

1. Pearl looks for a `.beads/` directory by searching up the directory tree from the current working directory
2. If none exists, it offers to create one and initialize the database
3. A Dolt SQL server starts automatically (Pearl-managed mode)
4. The web UI opens at `http://localhost:3456`

If your project uses the legacy embedded Dolt mode, Pearl shows a one-time migration dialog. See [Install & Modes](/docs/install/) for details.

## Create your first issue

Once the UI loads:

1. Click **New Issue** in the toolbar
2. Fill in a title and description
3. Set priority (P0–P4) and type (bug, feature, task, etc.)
4. Click **Create**

Your issue is now tracked in a Git-friendly Dolt database right inside your repository.

## Initializing a new project

If you don't have a `.beads/` directory yet, use the `bd` CLI to create one:

```bash
bd init
```

Then start Pearl:

```bash
npx pearl-bdui
```

## Next steps

- [Install & Modes](/docs/install/) — permanent installation and database mode options
- [Configuration](/docs/configuration/) — environment variables and settings
- [Themes](/docs/themes/) — customize Pearl's appearance
