---
title: Quickstart
description: Get Pearl running in under a minute.
sidebar:
  order: 1
---

Get Pearl up and running in your project in under a minute.

## Prerequisites

- **Node.js** 22 or later
- **Dolt** — [install instructions](https://docs.dolthub.com/introduction/installation)

## Run Pearl

The fastest way to try Pearl is with `npx`:

```bash
npx pearl-bdui
```

Pearl will start a local web server and open the issue tracker UI in your browser.

## What happens on first run

1. Pearl looks for a `.beads/` directory in your project root
2. If none exists, it offers to create one and initialize the database
3. A Dolt database starts automatically (Pearl-managed mode)
4. The web UI opens at `http://localhost:3120`

## Create your first issue

Once the UI loads:

1. Click **New Issue** in the toolbar
2. Fill in a title and description
3. Set priority and type
4. Click **Create**

Your issue is now tracked in a Git-friendly Dolt database right inside your repository.

## Next steps

- [Install & Modes](/docs/install/) — permanent installation and database mode options
- [Configuration](/docs/configuration/) — environment variables and settings
- [Themes](/docs/themes/) — customize Pearl's appearance
