# Advisory Fleet Brief — UI Theming System

**Advisors consulted**: Security & Reliability (Claude Sonnet), Simplicity & Alternatives (Claude Sonnet), Scalability & Performance (Gemini), Organizational & Delivery (Gemini)
**Advisors unavailable**: None (Codex unavailable; lenses reassigned per fallback table)

## P0 Concerns

- **Flash of Unthemed Content (FOTC)** [Scalability]: Theme application happens inside React lifecycle. On slow devices, users see the CSS fallback theme for several frames before JS applies the correct theme. **Suggestion**: Inline a blocking `<script>` in `index.html` that reads localStorage and applies CSS variables/`.dark` class before first paint. *(Note: the existing codebase already has a similar inline script pattern in use-theme.ts line 41-43, but it only handles the `.dark` class, not all CSS variables.)*

- **Theme definition maintenance overhead** [Organizational]: 15 files × 20 tokens. Adding a new token requires updating all 15 files — error-prone. **Suggestion**: Add a build-time or dev-mode validator that checks every registered theme satisfies the full `ColorToken` type. *(Related to: Claude/Simplicity concern about file-per-theme being premature.)*

## P1 Concerns

- **Token mapping may be limiting** [Scalability]: 20 tokens suffice now, but growing UI complexity (graph view, new component states) may need more granularity (hover, active, focus states). **Suggestion**: Keep `ColorToken` internal to the `themes/` package so it can expand without breaking external contracts.

- **`dark:` audit needed** [Organizational]: 39 `dark:` usages across 11 files may include non-color logic (opacity, shadows). High Contrast themes could trigger unintended styles. **Suggestion**: Audit all `dark:` usages to confirm they align with the binary `colorScheme` model.

- **File-per-theme is premature** [Simplicity]: 15 theme files with identical shape add navigation overhead. **Suggestion**: Start with `light-themes.ts` / `dark-themes.ts` (or even a single file) and split only when genuinely unwieldy.

- **Extensible section layout is YAGNI** [Simplicity]: U5 specifies a section-based Settings layout for a page with exactly one section. **Suggestion**: Build a flat settings page; extract the section abstraction only when a second category actually arrives. *(Note: user explicitly requested extensible layout — this is a validated decision, not speculative.)*

## P2 Concerns

- **Quick-toggle friction** [Organizational]: Removing the header toggle moves theme switching from 1 click to a route change. Users who toggle for lighting conditions lose convenience. **Suggestion**: Consider keeping a quick-access theme switcher in the Command Palette (Cmd+K) or header, even if full config lives in Settings.

- **Stale theme ID handling** [Security]: W1 handles localStorage unavailability but not an ID that no longer maps to a registered theme (e.g., theme renamed in future version). **Suggestion**: Explicit fallback — if stored ID isn't in registry, treat as absent.

- **Partial theme application on error** [Security]: `setProperty` loop could fail mid-way, leaving mixed tokens. **Suggestion**: Collect all property changes before applying, or rollback on failure.

- **Token completeness runtime guard** [Security]: TypeScript checks compile-time, but `as` casts could bypass. **Suggestion**: Dev-mode assertion that validates all themes have every `ColorToken` key.

- **CSS injection surface** [Security]: Currently safe (static data), but undocumented. **Suggestion**: Add architectural note: color values MUST come from static registry, never from user input.

- **Bundle bloat at scale** [Scalability]: 15 themes are fine, but if it grows to 50+, main bundle increases. **Suggestion**: Consider dynamic imports for future extensibility (not needed now).

- **"Registry" naming over-engineering** [Simplicity]: The theme registry is functionally a plain map/array. Naming it "registry" may encourage unnecessary infrastructure.

- **Intra-package interface contracts** [Simplicity]: Four formal contracts for relationships within the same React package is over-specified. Keep as documentation, don't drive structural indirection.

## Strengths (Consensus)

- **Core mechanism is sound** (all advisors): Extending existing CSS custom property + `.dark` class pattern is the minimal, performant approach. No new paradigm needed.
- **CSS variables are performant** (Scalability): O(1) theme switching without React re-render cascade.
- **Clean token contract** (Simplicity + Organizational): Components only reference tokens, never theme IDs — clean separation.
- **W1 graceful degradation** (Security): localStorage failure handled as first-class requirement.
- **Route-based settings** (Simplicity): Avoids overlay/modal complexity, leverages existing routing.

## Alternative Approaches

- **Single/dual file vs. file-per-theme** [Simplicity]: Start consolidated, split later. Reduces cognitive overhead for bulk changes.
- **Inline boot script** [Scalability]: Prevent FOTC with a pre-React `<script>` that applies theme from localStorage.
- **Command palette quick-toggle** [Organizational]: Add a "Switch Theme" command to Cmd+K palette as a fast-access complement to Settings page.

## Confidence Summary

| Advisor | Confidence | Justification |
|---------|-----------|---------------|
| Security & Reliability | HIGH | Purely client-side, no network calls, no user-generated content in theme pipeline. Concerns are recoverable edge cases. |
| Scalability & Performance | HIGH | CSS custom properties are the most performant theming mechanism. FOTC is well-known with standard mitigations. |
| Organizational & Delivery | MEDIUM | Architecture sound, but 15-file maintenance and UX shift from toggle to route need attention. |
| Simplicity & Alternatives | HIGH | Core design is right. YAGNI flags are about organization/naming, not structural over-complexity. |
