# Image Attachments — Advisory Brief

**Date**: 2026-04-19
**Advisors consulted**: `claude` (Security + Simplicity), `gemini` (Scalability + Organizational)
**Spec reviewed**: `docs/specs/image-attachments.md`

## Executive Summary

Both advisors converged on several critical issues and one strategic divergence:

- **Unanimous critical**: the local-mode two-step POST+PATCH lacks atomicity → orphan files on failure.
- **Unanimous critical**: Epic 6 is overloaded; split into inputs / outputs.
- **Unanimous critical**: `bd edit` round-trip must be proven in the POC, not as a lagging fitness function.
- **Strategic divergence**: claude argues for cutting local mode entirely in v1; gemini keeps it but constrains scope. User already chose to include both modes — this is the main open question for Gate 2.

Additional independent findings below.

## Accepted — rolled into spec v1.1

These I'm treating as no-brainer fixes and have updated the spec accordingly:

| # | Change | Source |
|---|---|---|
| A1 | Server generates the `ref` during local-mode upload and confirms it before the client inserts syntax; add orphan sweep for unconfirmed uploads | claude-sec, gemini-org |
| A2 | Add server-side magic-byte MIME sniff on upload, independent of client-declared MIME | claude-sec |
| A3 | Elevate EXIF stripping to a mandatory U-class invariant for inline mode; may remain configurable for local mode | claude-sec |
| A4 | Extend `ref` to 12 hex chars (48 bits) to push birthday collisions past realistic team scale | claude-sec |
| A5 | Add X-class requirement: backend logging must scrub inline attachment data blocks from command invocations and request logs | claude-sec |
| A6 | Constrain data block placement to a single trailing region at the end of the host field (footnote style); simplifies parser and round-trip testing | claude-simpl, gemini-scale |
| A7 | Split Epic 6 → **6a Attachment Inputs** (paste/drop/picker) and **6b Attachment Outputs** (pills/gallery/lightbox/carousel) | gemini-org |
| A8 | Move `bd edit` round-trip test from "fitness function" into the POC epic's go/no-go criteria | gemini-org |
| A9 | Add non-collaboration warning to local-mode: surfaced in settings UI and documented in spec §5 | claude-sec |
| A10 | Add scan-on-read fallback for `has_attachments` to recover from external CLI edits that desync the flag | claude-sec |
| A11 | Performance: mandate lazy loading of data blocks on detail view, Web-Worker parsing for fields >256KB, virtualized gallery | gemini-scale |

## Deferred — decisions the human should make at Gate 2

| # | Question | Claude's view | Gemini's view | My recommendation |
|---|---|---|---|---|
| D1 | **Cut local mode entirely from v1?** Inline-only, measure Dolt growth in POC first, revisit local mode in v2 based on data | **Cut** — saves 2-3 epics; local mode is non-collaborative by nature | Keep but constrain | **Keep both modes** (user's stated intent). Mitigate claude's concerns via A1-A11. If POC shows Dolt growth is a non-issue at realistic scale, local mode becomes merely optional rather than necessary |
| D2 | **Drop user-scope local storage for v1?** Ship only `project` scope (`.pearl/attachments/`) and defer `~/.pearl/attachments/<project>/` | (no position) | Hard-code project-scope for v1 | **Offer the user this choice.** User initially asked for both scopes; v1 with project-only is simpler and covers the main use case |
| D3 | **Replace settings file with env vars in v1?** Two env vars (`PEARL_ATTACHMENT_MAX_BYTES`, `PEARL_ATTACHMENT_MAX_DIMENSION`) instead of `.pearl/settings.json` | Simplify | (no position) | **Keep the settings file.** User explicitly chose this path and wants the settings UI; env-var alternative would require a separate settings-UI epic anyway |
| D4 | **Accept that `bd show` will print large base64 blocks** (even with the trailing-region constraint)? Or attempt to upstream a `bd show --mask-attachments` feature to beads? | (no action) | (no action) | **Accept as limitation**, document in README. Beads isn't Pearl-controlled; proposing upstream changes is out of scope |

## Accepted as "ignore" (explicitly)

| # | What | Why |
|---|---|---|
| I1 | 8→12 char ref length (bumping further to 16 not worth it) | 48 bits covers realistic team scale; more is bikeshedding |
| I2 | `has_attachments` write-time cost | Acceptable tradeoff for read-time list-view performance |
| I3 | HTML-comment vs standard-markdown syntax choice | Advisors agreed HTML comments are the right call; data URIs in native `<img>` would eagerly decode |
| I4 | `v1` version tag on the syntax | Cheap future-proofing; keep it |

## Notable quotes

> "**Issue Payload 'Tidal Wave':** By co-locating the data block within the markdown host field, the JSON payload for a single issue detail view will balloon from ~2KB to ~10MB+ for an issue with 10 attachments." — gemini

> "Local mode adds 2–3 epics of complexity to serve a use case that is non-collaborative by nature. The core user story is fully satisfied by inline mode." — claude

> "U5 requires syntax survives `bd` CLI edits. If this fails, the syntax needs to be redesigned before any storage adapters are built." — gemini

> "EXIF stripping should be a non-negotiable invariant, not a setting." — claude

## Outstanding risk register (for fitness functions)

1. Dolt history growth with inline base64 under realistic edit churn (POC-measured)
2. Browser memory consumption at 10 × 1MB attachments on a single detail view (POC-measured)
3. `bd edit` round-trip preservation of syntax (POC go/no-go)
4. Ref collision rate at team scale with 12-char ref (analytical, not empirical)
5. Orphan file accumulation in local mode under failure injection (IV epic)
