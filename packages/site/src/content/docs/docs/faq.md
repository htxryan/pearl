---
title: FAQ
description: Frequently asked questions about Pearl.
sidebar:
  order: 5
---

## What is Pearl?

Pearl is the web UI for the [Beads](https://github.com/gastownhall/beads) AI work management system. It stores its data in a [Dolt](https://www.dolthub.com/) database inside your repository, giving you visual triage, keyboard-driven workflows, and AI-agent collaboration — all running locally.

## What is Dolt?

Dolt is a SQL database with Git-like version control. It stores data in a format that can be committed, branched, and merged just like source code. Pearl uses Dolt to give you a full relational database that lives alongside your code.

## Do I need to install Dolt separately?

Yes. Pearl requires Dolt to be installed and available on your `PATH`. See the [Dolt installation guide](https://docs.dolthub.com/introduction/installation) for instructions.

## Can multiple people use Pearl at the same time?

Yes, using **external server mode**. Run a shared `dolt sql-server` that all team members connect to. See [Install & Modes](/docs/install/) for setup instructions.

In Pearl-managed mode, only one instance can run at a time.

## Where is my data stored?

All data lives in the `.beads/doltdb/` directory inside your project. You can:

- **Commit it** to Git to share issue history with your team
- **Add it to `.gitignore`** for private tracking
- **Back it up** by copying the `.beads/` directory

## Can I use Pearl without the `bd` CLI?

Yes. Pearl's web UI is fully functional on its own. The `bd` CLI is a separate tool for command-line issue management and AI agent workflows.

## What happens if Pearl crashes?

Your data is safe in the Dolt database. Just restart Pearl — it will reconnect to the existing database. If a Pearl-managed Dolt server was left running, see [Troubleshooting](/docs/troubleshooting/) for cleanup steps.

## Can I change the port Pearl runs on?

Yes. Set the `PORT` environment variable:

```bash
PORT=8080 npx pearl-bdui
```

See [Configuration](/docs/configuration/) for all available settings.

## Is Pearl open source?

Yes. Pearl is licensed under Apache-2.0 and available on [GitHub](https://github.com/htxryan/pearl).

## What Node.js version do I need?

Node.js 22 or later is required.
