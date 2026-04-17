# ADR-004: pnpm Workspaces for Monorepo Package Management

## Status
Accepted

## Context
The pearl project consists of multiple packages -- shared types, a backend server, and a frontend SPA -- that need to share code and be developed together. A monorepo structure was needed to co-locate these packages while maintaining clear dependency boundaries. The package manager needed to support workspace protocols for inter-package linking and enforce strict dependency resolution to prevent accidental reliance on undeclared dependencies.

## Decision
Use **pnpm workspaces** for monorepo package management.

- **pnpm** was chosen over npm and yarn for its strict dependency resolution, which prevents phantom dependencies (packages that are usable but not declared in `package.json`). This strictness catches dependency errors during development rather than in production.
- pnpm's **content-addressable store** shares package files across projects on disk, reducing storage usage and install times compared to npm's flat `node_modules`.
- The **workspace protocol** (`workspace:*`) enables seamless inter-package linking without manual `npm link` or path-based references.

## Consequences

### Positive
- **Strict dependency resolution prevents accidental imports**: pnpm's non-flat `node_modules` structure ensures packages can only import explicitly declared dependencies, catching missing dependency declarations early.
- **Fast installs and efficient disk usage**: The content-addressable store hard-links packages from a global store, making installs faster and reducing disk consumption across projects.
- **Native workspace support**: The workspace protocol provides first-class monorepo support without additional tooling like Lerna or Nx for basic package linking and script execution.

### Negative
- **Some tools assume npm or yarn**: Certain third-party tools, CI templates, and deployment platforms default to npm or yarn and may require additional configuration to work correctly with pnpm.
- **pnpm-specific lock file format**: The `pnpm-lock.yaml` format differs from `package-lock.json` and `yarn.lock`, which can cause friction when consulting documentation or migrating between package managers.
