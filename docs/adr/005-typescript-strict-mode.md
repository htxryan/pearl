# ADR-005: TypeScript Strict Mode Across All Packages

## Status
Accepted

## Context
The pearl codebase is developed collaboratively with agentic AI assistants, which makes explicit type contracts and compile-time safety especially valuable. Loose TypeScript configurations allow implicit `any` types, unchecked null access, and other patterns that shift error detection from compile time to runtime. For a codebase where AI agents read and modify code, maximum type information makes intent explicit and reduces the risk of agents introducing subtle type-related bugs.

## Decision
Enable **TypeScript strict mode** (`"strict": true` in `tsconfig.json`) across all packages in the monorepo.

- This enables all strict type-checking flags: `strictNullChecks`, `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, `noImplicitAny`, `noImplicitThis`, `alwaysStrict`, and `useUnknownInCatchVariables`.
- All new code must satisfy strict checks. Existing code was migrated to pass strict checks before enabling the flag.
- Shared type packages benefit the most, as strict contracts propagate type safety across package boundaries.

## Consequences

### Positive
- **Stronger type guarantees**: Strict mode catches more bugs at compile time, including null/undefined access, implicit `any` usage, and incorrect function signatures.
- **Better IDE support**: Stricter types enable more accurate autocompletion, refactoring, and inline error detection in editors.
- **Fewer runtime errors**: Many classes of runtime errors (null dereference, type mismatches) are eliminated by the compiler.
- **Improved agentic AI collaboration**: Explicit type contracts help AI agents understand code intent, produce correctly-typed code, and catch errors during generation rather than at runtime.

### Negative
- **More verbose code**: Strict mode requires explicit type annotations in places where TypeScript would otherwise infer `any`, and nullable types must be explicitly handled, increasing code verbosity.
- **Some library types need workarounds**: Not all third-party libraries ship strict-compatible type definitions. Some require type assertions, declaration merging, or wrapper types to satisfy the strict checker.
