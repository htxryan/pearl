# ADR-003: Biome Unified Linter and Formatter

## Status
Accepted

## Context
The project previously relied on separate ESLint and Prettier configurations for linting and formatting. Maintaining both tools introduced friction: conflicting rules between the linter and formatter, multiple config files to keep in sync, and slow execution during CI and pre-commit hooks. Import sorting required yet another plugin, adding further config surface area.

## Decision
Replace ESLint and Prettier with **Biome** as a unified linter, formatter, and import sorter.

- Biome provides linting, formatting, and import sorting in a single tool, configured through one `biome.json` file.
- Biome is written in Rust, delivering significantly faster execution than the JavaScript-based ESLint and Prettier combination.
- A single `biome check` command replaces separate lint and format steps in CI and pre-commit hooks.

## Consequences

### Positive
- **Single configuration file**: One `biome.json` replaces `.eslintrc`, `.prettierrc`, and import sorting plugin configs, reducing config sprawl and eliminating inter-tool conflicts.
- **Faster execution**: Rust-based implementation runs linting and formatting significantly faster than ESLint + Prettier, improving CI times and developer feedback loops.
- **Fewer devDependencies**: Removing ESLint, Prettier, and their plugin ecosystems reduces `node_modules` size and dependency maintenance burden.
- **Consistent behavior**: A single tool enforcing both style and correctness rules eliminates the class of bugs where the formatter and linter disagree.

### Negative
- **Smaller plugin ecosystem than ESLint**: ESLint's extensive plugin ecosystem (e.g., eslint-plugin-react, eslint-plugin-testing-library) is not fully replicated in Biome. Some specialized rules may not yet be available.
- **Some ESLint rules not yet available**: Biome is actively developing rule parity with ESLint, but certain rules the team relied on may require workarounds or waiting for upstream implementation.
