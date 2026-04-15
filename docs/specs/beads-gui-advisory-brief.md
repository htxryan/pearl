# Advisory Fleet Brief — Beads GUI

**Advisors consulted**: Security & Reliability, Scalability & Performance, Organizational & Delivery, Simplicity & Alternatives (all via Claude Sonnet 4.6)  
**Advisors unavailable**: Gemini CLI (not installed), Codex CLI (not installed)

## P0 Concerns

1. **CLI argument injection** (Security): The write path spawns `bd` CLI with user-controlled data. Shell metacharacters in titles/descriptions could execute arbitrary commands. **Must use `execa` array-form arguments, never string interpolation.**

2. **Server must bind to localhost only** (Security): Fastify can default to `0.0.0.0`. Without auth, any LAN machine could access the GUI. **Explicitly bind to `127.0.0.1`.**

3. **Backend is a universal blocker** (Delivery): Every frontend epic depends on the backend. It contains 6+ subsystems (REST, SQL, CLI spawn, WebSocket, Dolt process, file watcher). **Split into a "backend shell" deliverable on day 1, then feature modules that can be stubbed in parallel.**

## P1 Concerns

4. **No optimistic UI strategy** (Performance): CLI spawn (~50-150ms) will stutter during Kanban drag-and-drop. TanStack Query optimistic updates should be mandated, not optional.

5. **WebSocket + chokidar is over-engineered** (Simplicity): A 2-second `refetchInterval` on TanStack Query achieves the E4 SLA (2s detection) with zero infrastructure. Eliminates WebSocket lifecycle, chokidar FSEvents quirks, and connection-drop failure modes.

6. **API contract artifact needed** (Delivery): No OpenAPI or TypeScript interface defined. Frontend/backend parallelism requires an agreed contract before implementation.

7. **Dual component libraries** (Simplicity): shadcn/ui and Base UI overlap — both target Radix-style accessible primitives. **Pick one. shadcn/ui is sufficient** with Tailwind integration.

8. **Graph View as v1.1** (Delivery + Simplicity): Highest complexity, lowest frequency-of-use. React Flow + DAG layout + live updates is a delivery risk. Dependencies can be shown as linked IDs in Issue Detail for v1.

9. **Column projection for reads** (Performance): 50-column SELECT on list view burns the 200ms budget at 10K issues. REST API should accept a `fields` parameter or use separate list/detail endpoints.

10. **Write/read consistency window** (Security): After CLI write, undefined window before SQL read catches up. Backend should proactively push cache-invalidation after every write rather than relying solely on file watcher.

11. **Write service is cross-cutting** (Delivery): CLI spawn pattern appears in 5+ requirements. Should be a shared module with defined interface, not reimplemented per view.

12. **Race condition on concurrent edit** (Security): External Dolt change during active user edit has no conflict detection or last-write-wins policy.

## P2 Concerns

13. **CLI fallback read path** (Simplicity): Maintaining a second read code path for Dolt downtime doubles normalization logic for an edge case. Better to show an error and let the user restart Dolt.

14. **Zustand probably redundant** (Simplicity): TanStack Query handles server state. UI state (selected rows, filters) fits React's own useState/useContext at this scale.

15. **TanStack Query key taxonomy** (Performance): No invalidation strategy defined — "invalidate everything" eliminates cache benefit; too narrow shows stale data.

16. **Events/comments unbounded** (Performance): No pagination or virtual scrolling for issue activity timeline.

17. **Wisps scope undefined** (Delivery): Listed in schema with zero EARS requirements. Must be explicitly zeroed or fully specified.

18. **React Flow at scale** (Performance): Degrades at ~200+ nodes. Performance envelope needed.

19. **Dolt process supervision** (Security): No pid-file or singleton check for auto-restart.

20. **Fallback mode data shape** (Security): CLI reads produce different data shape than SQL reads — risks rendering bugs in fallback mode.

## Strengths (Consensus)

- **Hybrid data access (SQL reads / CLI writes) is the right architecture** — preserves CLI business logic, avoids reimplementing bd in the GUI layer (all 4 lenses agreed)
- **Local-only scope eliminates entire classes of problems** — no auth, no deployment, no CDN, no observability (Security + Delivery)
- **Concrete SLAs** (200ms for 10K issues, 2s external change detection) make the spec testable (Performance)
- **shadcn/ui + TanStack ecosystem** is well-matched to the problem — most components pre-built, headless table for customization (Delivery + Simplicity)
- **Dolt SQL views** (`ready_issues`, `blocked_issues`) leverage the database correctly (Simplicity)
- **EARS format** gives clear traceability and testability anchors (Simplicity)

## Alternative Approaches

**"40% surface" MVP** (Simplicity advisor): A version with polling instead of WebSocket, no Graph View, no Zustand, single component library, and no CLI fallback reads would satisfy core EARS requirements (U1-U8, E1-E2, E6-E9, S1-S2, S4-S5, W1-W3) with roughly 40% of the implementation surface.

## Confidence Summary

| Advisor | Confidence | Justification |
|---------|-----------|---------------|
| Security & Reliability | MEDIUM | CLI injection and consistency window are real gaps; fixable without architectural changes |
| Scalability & Performance | MEDIUM | 10K/200ms achievable with column projection + indexing, but spec doesn't mandate practices yet |
| Organizational & Delivery | MEDIUM-HIGH | Tech choices solid, scope bounded; backend-as-blocker is the primary delivery risk |
| Simplicity & Alternatives | HIGH | Over-engineering signals are clear, localized, and removable without changing fundamentals |
