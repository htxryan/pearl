# Project Instructions for AI Agents

This file provides instructions and context for AI coding agents working on this project.

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:ca08a54f -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

## Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd dolt push
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
<!-- END BEADS INTEGRATION -->


## Build & Test

```bash
pnpm install          # Install all dependencies
pnpm build            # Build all packages (shared must build first)
pnpm test             # Run Vitest unit/integration tests
pnpm typecheck        # TypeScript type checking across all packages
pnpm lint             # Biome linter
pnpm lint:fix         # Biome auto-fix
pnpm format           # Biome formatter
pnpm dev              # Start dev servers
pnpm test:e2e         # Playwright E2E tests
pnpm test:e2e:ui      # Playwright E2E with UI
```

Pre-commit hooks (Husky + lint-staged) run Biome checks automatically.

## Architecture Overview

pnpm monorepo with three packages:

- **`packages/shared`** -- TypeScript types (Issue, LabelDefinition, IssueStatus, Priority, IssueType). Built with `tsc`, outputs to `dist/`. Consumed by both backend and frontend.
- **`packages/pearl-bdui`** -- Node.js/Fastify backend server for the beads issue tracker web UI. Uses Dolt (Git-for-data SQL database) with a primary/replica split for concurrent access. Logging via Pino (Fastify built-in).
- **`packages/frontend`** -- React 19 SPA built with Vite and TailwindCSS v4. React Router for routing, TanStack Query for server-state management.

**Database:** Dolt runs in embedded mode for local dev and server mode for team/CI. The `bd` CLI writes directly to the primary database; the web UI reads from the replica.

## Conventions & Patterns

- **Tooling:** Biome for linting and formatting (not ESLint/Prettier). Vitest for tests. Playwright for E2E.
- **Package manager:** pnpm workspaces. Always use `pnpm`, never `npm` or `yarn`.
- **Issue tracking:** Use `bd` (beads) exclusively -- never TodoWrite, TaskCreate, or markdown TODOs.
- **Build order:** `shared` must build before other packages since they import from its `dist/`.
- **Database access:** Backend uses primary/replica split. Mutations go to primary, reads from replica.
