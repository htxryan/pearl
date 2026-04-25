# Advisory Brief — shadcn/BaseUI Adoption Spec

*2026-04-25 · Architect Phase 2 · External advisory fleet output*

**Advisors consulted**: Security & Reliability + Simplicity & Alternatives (claude-opus-4-7), Scalability & Performance + Organizational & Delivery (gemini)
**Advisors unavailable**: none — codex CLI not installed; its lenses (Org & Simplicity in the 4-CLI assignment) were absorbed into the available advisors per the fallback table

Both reports agree on one P0 concern (big-bang reviewability + rollback) and converge on a small set of structural simplifications. The brief below is deduped; full reports at `/tmp/advisory/{claude,gemini}-report.md`.

## P0 concerns (consensus)

### P0-1 — Big-bang reviewability + rollback gap (both advisors)

- **Detail**: §1 commits to a "big-bang full sweep" while §4 notes zero E2E tests and §13 acceptance #11 says "automated where possible, manual where not." Many scenarios (focus trap, focus return, toast lifecycle, calendar popover, mobile sheet) are precisely what Vitest+jsdom validates poorly. There is no documented rollback procedure in §12.
- **Risk**: A regression slips through the manual sweep, ships, and the only rollback is a full revert that's impossible if other feature work landed in between. Or: a single Foundation-epic typo breaks the entire UI with no isolation.
- **Suggestions** (pick at least one):
  1. Add a minimal **Playwright smoke set** (covering SC-3, SC-4, SC-6, SC-13, SC-15) as a Foundation-epic deliverable BEFORE primitive cutover. Closes the safety-net gap.
  2. Define an explicit **rollback procedure** in §12 (revert hash, dependency pin, deploy SLA).
  3. Restructure as a **persistent `ui-migration` branch** with epic-level reviews, only merging to `main` after IV passes all 15 scenarios. (Gemini.)

## P1 concerns

### P1-1 — Theme bridge dual-write is a workaround, not a contract (Claude Simplicity)

- **Detail**: §8.3 enshrines writing two CSS variables per token (`--background` AND `--color-background`) because Pearl's existing themes write to the alias. This is a Tailwind-shadcn impedance mismatch, not a design. The cleaner path: **rename `--color-X` → `--X` codebase-wide** in the same sweep (Biome can do this mechanically), then write only the raw token. Removes N4, removes the §8.3 contract, removes the unit test, removes the future-contributor footgun.
- **Risk**: Every future PR adding a token has to remember the dual-write rule. The pattern decays. The footgun N4 wouldn't exist if the bridge didn't exist.
- **Suggestion**: Reframe Foundation epic. Add a step: "rename all `--color-X` references in `themes/definitions/*.ts`, `index.css`, and `hooks/use-theme.ts` to bare `--X`." Bridge becomes 5 lines, no dual-write contract.

### P1-2 — `lucide-react` migration is orthogonal — defer it (Claude Simplicity, related to Gemini tree-shake concern)

- **Detail**: U5 mandates lucide-react migration, but it doesn't depend on BaseUI, shadcn, or the theme bridge. §4 assumption "lucide covers all icon shapes" is unverified and resolved during work. Gemini also flags lucide tree-shaking risk if barrel imports are used.
- **Risk**: An icon-coverage gap on a Pearl-specific shape (priority/status/type icons) blocks Foundation on a problem unrelated to shadcn. Bundle bloat if barrel imports.
- **Suggestion**: Cut U5 from this spec. File as separate follow-up. shadcn-generated components import from lucide internally regardless; we don't need codebase-wide migration to use shadcn. **OR** keep U5 but mandate per-icon imports + add a CI grep gate.

### P1-3 — Sidebar is a composite, not a primitive — defer it (Claude Simplicity)

- **Detail**: §3 distinguishes primitives from composites; U6 only requires replacing primitives. Pearl already has a working sidebar. shadcn `Sidebar` is the most opinionated piece in the library (layout, collapse semantics, mobile sheet, cookie persistence). §12 already lists "sidebar replacement loses cookie state" as a risk.
- **Risk**: Sidebar bugs/layout deltas dominate the visual sweep and user-reported issues in week 1, even though they're orthogonal to primitive value.
- **Suggestion**: Keep existing sidebar shell; adopt shadcn primitives *inside* it (DropdownMenu, Tooltip). Defer full Sidebar adoption to a separate epic. Removes one of the seven epics.

### P1-4 — Semantic-token remap is ideological, not simplifying (Claude Simplicity)

- **Detail**: §8.2 maps `success → chart-2`, `info → chart-1`, `warning → chart-4`. shadcn's chart slots are tuned for data-viz contrast, not banner severity. §8.2 already flags this as an open question with a fallback to `bg-muted` + colored border. The spec is admitting the mapping likely won't work. Meanwhile we throw away the *semantic name* (`success`, `info`, `warning`) which was the actually-useful abstraction.
- **Risk**: Six months later, designer can't reason about what `chart-2` "means" in three contexts (charts, banners, badges).
- **Suggestion**: Keep `--success` / `--warning` / `--info` / `--danger` as semantic tokens **defined in terms of** shadcn primitives: `--success: var(--chart-2)` in light, override in themes. Preserves semantic surface, preserves theme-switch correctness, doesn't fight shadcn defaults. Makes §8.2 trivial; **removes invariant N5 entirely**.

### P1-5 — IV epic scope: MEDIUM → FULL (Gemini)

- **Detail**: 15 themes × 2 modes × ~12 primitives = ~360 manual checks. That's not MEDIUM — that's FULL.
- **Risk**: Theme/primitive regressions slip through under-scoped verification.
- **Suggestion**: Either elevate IV to FULL scope, OR add Playwright visual regression (overlaps with P0-1's smoke-set suggestion — solves both).

### P1-6 — Combobox virtualization gap (Gemini)

- **Detail**: Multi-select label picker can hit 100s of labels. BaseUI Combobox doesn't include virtualization.
- **Risk**: DOM explosion in popover, jank on Issue Detail.
- **Suggestion**: Integrate `react-window` or `virtuoso` inside `ComboboxContent` for lists > 50 items. Add to Form-primitives epic acceptance.

### P1-7 — Calendar bundle bloat without code-splitting (Gemini)

- **Detail**: Calendar pulls in `react-day-picker` + `date-fns`; spec lacks lazy-load strategy.
- **Risk**: Main-bundle bloat for routes that don't use date-picking (Kanban board).
- **Suggestion**: `React.lazy` for Calendar; `<Suspense>` boundaries in consumers (3 files only).

### P1-8 — Foundation epic is critical-path bottleneck (Gemini)

- **Detail**: §8.1 token contract used by all subsequent epics. Any error halts everything downstream.
- **Risk**: All work blocked on Foundation regressions.
- **Suggestion**: Treat Foundation as an explicit "Stage 1 gate"; do not parallelize Overlay/Form work until token contract is verified end-to-end (one consumer + one shadcn primitive rendering correctly across all 15 themes).

### P1-9 — `render` prop is XSS surface (Claude Security)

- **Detail**: BaseUI's `render` accepts arbitrary JSX elements. If user-supplied data ever flows into a `render={...}` value, it's a vector.
- **Risk**: Stored XSS via issue title or attachment filename if a future contributor pattern-matches a custom render into the wrong place.
- **Suggestion**: Add invariant: `dangerouslySetInnerHTML` count must stay at current value (or zero); document the boundary in §8.

### P1-10 — Supply chain hygiene not addressed (Claude Security)

- **Detail**: 4 new deps (`@base-ui/react`, `lucide-react`, `sonner`, `tw-animate-css`). §4 doesn't mention pinning, audit, or install-script controls. `@base-ui/react` is young (1.4.x).
- **Risk**: Supply chain compromise; postinstall script abuse; future maintainer turnover.
- **Suggestion**: Add to §4 hard constraints: exact-version pin (no `^`) for the 4 new deps until post-IV; `pnpm audit --prod` clean before merge; document maintainer cadence.

## P2 concerns

- **P2-1** Negative invariants are grep gates, not lint rules — false negatives on quoted/template-literal patterns. Promote N2/N3 to Biome custom rules; treat N5 as one-shot cleanup check, not permanent CI fixture. (Claude Security + Simplicity)
- **P2-2** Bundle-size budget is "measure in IV" with no pre-commitment. Add hard ceiling (e.g., +75 KB gz) to §13 acceptance; gate IV on it. (Claude Security)
- **P2-3** Sonner queue semantics not contractually pinned (depth, dedup, dismiss-on-route-change). Add behavioral row to §8. (Claude Security)
- **P2-4** Theme bridge dual-write has no runtime guard. If P1-1 not adopted, add dev-only `getComputedStyle` assertion that both vars are set post-write. (Claude Security)
- **P2-5** Dual-write theme bridge has perf cost (~40 setProperty calls per switch). Bench in Foundation; if jank, batch via `style.cssText`. (Gemini — moot if P1-1 adopted.)
- **P2-6** `isolation: isolate` on root creates new stacking context — verify Sidebar + Sonner overlays still respect intended z-order. (Gemini)
- **P2-7** 7-epic decomposition over-granular for the actual scope; could be 3 epics if Sidebar + lucide + dual-write deferred. (Claude Simplicity — depends on P1-2/P1-3/P1-1.)
- **P2-8** `compound:build-great-things` per-epic is design-by-template; spec explicitly says no visual redesign (§2 non-goal). Invoke once at IV instead of per-epic. (Claude Simplicity)

## Strengths (consensus)

- **Negative invariants well-formed** — both advisors call out N1–N5 as unusually rigorous; most specs omit "build must fail loudly if…"
- **Theme-switch sequence diagram** makes the bridge invariant legible (Claude)
- **Reversibility profile (§4)** correctly identifies moderate-irreversibility decisions (Claude)
- **§8.4 deletion contract** lists every file to be removed by name (Claude)
- **Risk table (§12)** is concrete with mitigations (Claude)
- **Domain decoupling** (keeping `bead-id` etc. out of scope) prevents scope creep into business logic (Gemini)
- **Native transition hooks** (BaseUI `data-starting-style`) outperforms JS animation libs (Gemini)
- **Sonner replaces custom toast queue** with built-in throttling for error storms (Gemini)
- **EARS + scenarios + contracts** = professional roadmap for solo-dev execution (Gemini)

## Alternative approaches surfaced

| Alternative | Source | Implication |
|---|---|---|
| **Rename `--color-X` → `--X` codebase-wide instead of dual-write bridge** | Claude P1-1 | Eliminates §8.3 contract, N4 invariant, unit test, future-contributor footgun |
| **Defer lucide migration to separate epic** | Claude P1-2 | Cuts U5, simplifies Foundation, removes icon-coverage risk |
| **Defer Sidebar adoption; use primitives inside existing shell** | Claude P1-3 | Removes one epic; addresses §12 cookie-state risk |
| **Keep semantic tokens; alias to shadcn slots** (`--success: var(--chart-2)`) | Claude P1-4 | Removes §8.2 remap table, removes N5 invariant, preserves vocabulary |
| **3-epic decomposition** (Foundation+Atomic / Overlay+Form / Cleanup+IV) | Claude P2-7 | Possible if P1-2 + P1-3 + P1-1 adopted; less ceremony |
| **Persistent `ui-migration` branch with epic-level reviews** | Gemini P0-1 | Solves big-bang reviewability without abandoning the all-in-one cutover |
| **Playwright visual regression for 15-theme matrix** | Gemini P1-5 / P0-1 | Solves IV scope problem AND big-bang safety net in one move |

## Confidence summary

| Advisor | Confidence | Justification |
|---|---|---|
| Security & Reliability | MEDIUM | Spec surfaces footguns well, but big-bang + zero E2E + manual visual sweep = real reliability gap; dual-write bridge is structurally fragile |
| Simplicity & Alternatives | MEDIUM | Could simplify 30–40% (defer lucide, defer Sidebar, kill dual-write, kill semantic-remap, collapse to 3 epics) — but user explicitly chose big-bang at Gate 1 and that's a legitimate preference |
| Scalability & Performance | MEDIUM | BaseUI is performance-forward, but big-bang + missing virtualization + lacking lazy-load create real bundle/runtime regression risk |
| Organizational & Delivery | HIGH | Despite big-bang risk, EARS + scenarios + contracts = professional-grade roadmap for solo-dev execution |

## Highest-leverage revisions (if revising the spec)

The advisors converge on five revisions that, taken together, eliminate the P0 concern and most P1s while keeping the user's stated scope intent ("full sweep, big-bang"):

1. **Replace dual-write bridge with codebase-wide `--color-X` → `--X` rename** in Foundation epic. Removes §8.3 contract + N4 + unit test. (Claude P1-1)
2. **Keep semantic tokens; alias to shadcn slots in CSS.** Removes §8.2 remap table + N5 invariant. Files only need to keep using `bg-success` etc. (Claude P1-4)
3. **Add Playwright smoke set as Foundation deliverable** covering SC-3/4/6/13/15 + theme-matrix visual regression. Closes both P0-1 and P1-5. (Both)
4. **Defer lucide-react migration** to a separate follow-up epic. Cut U5. shadcn-internal lucide use is unaffected. (Claude P1-2)
5. **Defer Sidebar adoption** to a separate follow-up epic. Use shadcn primitives inside existing sidebar shell. (Claude P1-3)

These five revisions take the spec from 7 epics + manual visual sweep to **3 epics + automated visual regression**, with no loss of the user's stated outcomes.
