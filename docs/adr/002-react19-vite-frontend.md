# ADR-002: React 19 + Vite Frontend SPA

## Status
Accepted

## Context
The pearl project needed a modern, fast-building frontend framework for its single-page application. The frontend must support concurrent UI patterns, provide a strong developer experience, and be positioned for future adoption of server components. Build tooling needed to be fast and simple to configure, especially for local development iteration speed.

## Decision
Use **React 19** with **Vite** as the frontend build tool and dev server.

- **React 19** was chosen for its concurrent features (transitions, suspense improvements), server components readiness, and ecosystem maturity. The large React ecosystem ensures availability of libraries, community support, and hiring familiarity.
- **Vite** was chosen over Create React App and webpack for its fast hot module replacement (HMR), native ESM support during development, and simple configuration. Vite's Rollup-based production builds produce optimized output with minimal config.

## Consequences

### Positive
- **Fast development cycle**: Vite's native ESM dev server and HMR provide near-instant feedback during development.
- **Large ecosystem**: React's mature ecosystem offers a wide selection of component libraries, state management tools, and community resources.
- **Future-ready**: React 19's concurrent features and server components architecture position the frontend for incremental adoption of advanced patterns.
- **Simple build config**: Vite requires minimal configuration compared to webpack, reducing maintenance burden.

### Negative
- **React 19 is newer with potential breaking changes**: As a recent major version, some third-party libraries may not yet fully support React 19, and early adopters may encounter edge cases in new APIs.
- **Less community support for cutting-edge features**: Concurrent features and server components are still being adopted by the ecosystem, so documentation and community examples may be limited for advanced use cases.
