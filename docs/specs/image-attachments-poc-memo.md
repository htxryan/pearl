# Image Attachments — POC Memo

**Date**: 2026-04-19
**Epic**: beads-gui-yqe6.1 (Image Attachments — Epic 1: POC & Measurement)
**Status**: Complete — go/no-go verdicts below

## Executive Summary

This POC validates both storage modes (inline-base64 and local-filesystem) for Pearl image attachments. Four gate criteria were tested; three passed and one failed. The failure (Dolt history growth) is a design input, not a blocker — the spec already defines the remediation: **make local-mode the default** or introduce deduplication.

| Gate | Criterion | Verdict |
|------|-----------|---------|
| 1 | `bd` CLI round-trips Pearl syntax byte-for-byte | **PASS** |
| 2 | Browser renders 10 × 1MB inline images without >200ms thread block | **PASS** |
| 3 | Dolt history growth ≤ 5× raw compressed image bytes (20 edits × 10 images) | **FAIL** (26.8×) |
| 4 | Ref collision probability ≤ 1e-6 at 10k attachments with 12-hex refs | **PASS** (1.78e-7) |

**Recommendation**: Proceed with implementation. Set `storageMode: local` as the default. Inline mode remains available for small images or teams that prioritize Dolt sync over history size.

## Gate 1: bd CLI Round-Trip Preservation

### Methodology
1. Created a test issue containing both inline-base64 and local-filesystem Pearl attachment syntax
2. Wrote syntax via `bd update --description="<content with pills and data blocks>"`
3. Read back via `bd show --json` and extracted the description field
4. Compared input and output byte-for-byte

### Results
- **Verdict: PASS**
- The `bd` CLI preserves HTML-comment data blocks exactly
- Whitespace, newlines, and special characters within `<!-- ... -->` blocks are not normalized
- The trailing-region placement (data blocks at end of field, separated by blank line) survives round-trip
- Both inline-type and local-type data blocks preserved identically

### Parser/Serializer Validation
- 26 unit tests pass covering: pill extraction, block extraction, parsing, serialization, and round-trip identity
- Malformed blocks degrade gracefully (skipped, not crash)
- Unknown versions (e.g., `v2`) are skipped without error
- Code: `packages/shared/src/attachment-syntax.ts` (268 lines)
- Tests: `packages/shared/src/attachment-syntax.test.ts` (26 tests)

## Gate 2: Browser Memory & Rendering Benchmark

### Methodology
1. Generated 10 valid PNG images via canvas (1024×1024 pixels, random noise via xorshift PRNG)
2. Each image ≈ 4.6 MB as base64 data URL (total payload ≈ 46 MB)
3. Inserted all 10 as `<img>` elements into the DOM
4. Measured via PerformanceObserver (`longtask` entries) and `performance.now()`
5. Ran 3 times for stability; used Playwright with Chromium

### Results
- **Verdict: PASS**

| Metric | Value |
|--------|-------|
| Total data-URL payload | 45.89 MB |
| DOM render time | ~256 ms |
| Long tasks during render (>50ms) | 2 |
| **Max single long task** | **157–168 ms** |
| Responsive probe (setTimeout delay) | 0.1–0.2 ms |
| JS heap used | 59 MB |
| JS heap total | 62 MB |
| JS heap limit | 4,096 MB |

### Key Findings
- The maximum single long task was 157–168 ms across all runs, comfortably under the 200 ms threshold
- Memory consumption is modest: ~59 MB heap for 46 MB of base64 data (1.3× overhead)
- Page remains responsive after rendering (setTimeout round-trip < 1 ms)
- **Implication for U11/U12**: Lazy loading (render pills immediately, decode bytes on demand) will improve this further. The Web Worker threshold of 256 KB for field parsing is conservative but reasonable.

### Test
- Script: `docs/proof/beads-gui-yqe6.1/browser-benchmark.spec.ts`
- Config: `docs/proof/beads-gui-yqe6.1/playwright.config.ts`
- Run: `npx playwright test --config docs/proof/beads-gui-yqe6.1/playwright.config.ts`

## Gate 3: Dolt History Growth Measurement

### Methodology
1. Generated 10 random base64 blobs (4 KB each, 53 KB total as base64)
2. Formatted as Pearl inline attachment syntax in a single description field (55 KB total)
3. Created a test issue with this content
4. Performed 20 edits: each changed a word in the prose while keeping all attachments identical
5. Measured `.beads/` directory size (via `du -sk`) before creation, after creation, and after each edit

### Results
- **Verdict: FAIL**

| Metric | Value |
|--------|-------|
| Raw image bytes | 40 KB |
| Base64-encoded bytes | 53 KB |
| Total description size | 55 KB |
| Dolt growth over 20 edits | 1,422 KB |
| **Growth ratio** | **26.8×** base64 bytes |
| Gate criterion | ≤ 5.0× |

### Per-Edit Analysis
- Create overhead: 168 KB (one-time Dolt internal structure)
- Average per-edit overhead: 62.7 KB
- Edit overhead ratio: 1.14× the full description size

This means Dolt stores essentially a **full copy of the description on every commit**. There is no intra-row deduplication — when a TEXT column changes by even a few bytes of prose, the entire row (including all inline base64 blobs) is stored as a new prolly-tree node.

### Extrapolation to Realistic Sizes (10 × 100 KB blobs = 1 MB raw)

| Scenario | Growth over 20 edits | Ratio | Verdict |
|----------|---------------------|-------|---------|
| Worst case (full copy per edit, linear scaling) | 35,546 KB | 35.5× | FAIL |
| Best case (edit overhead constant, only create scales) | 5,460 KB | 5.5× | FAIL |

### Root Cause
Dolt's prolly tree stores rows as values. The entire row — including all inline base64 in TEXT columns — is stored as a new tree node on each change. Dolt does deduplicate at the chunk level for large values, but the overhead still exceeds the 5× threshold at realistic image sizes.

### Remediation (per spec §7)
The spec's re-decomposition trigger for this scenario is: **make local-mode the default or introduce deduplication**. Recommendations:

1. **Set `storageMode: local` as the default** — local mode stores only a path reference (~200 bytes) in the text field, reducing Dolt growth to negligible levels
2. **Keep inline mode available** for small images (< 50 KB) or teams that prioritize Dolt sync
3. **Consider a `maxInlineBytes` setting** (e.g., 50 KB) that auto-promotes to local mode above the threshold
4. **Do not introduce a separate Dolt blob table** (already rejected in spec §8) — local filesystem solves the problem without schema changes

### Test
- Script: `docs/proof/beads-gui-yqe6.1/dolt-growth-measurement.ts`
- Run: `npx tsx docs/proof/beads-gui-yqe6.1/dolt-growth-measurement.ts`

## Gate 4: Ref Collision Probability

### Analysis
- Hash space: 12 hex characters = 48 bits = 2^48 = 281,474,976,710,656 possible values
- Number of items (n): 10,000 attachments (realistic team scale)
- Birthday problem formula: P ≈ 1 − e^(−n² / (2H))
- P ≈ 1 − e^(−10^8 / 5.63 × 10^14)
- **P ≈ 1.78 × 10⁻⁷** (approximately 1 in 5.6 million)

### Verdict: PASS
The collision probability is well below the 1 × 10⁻⁶ threshold. At 100,000 attachments (10× the requirement), P ≈ 1.78 × 10⁻⁵, still a 1-in-56,000 chance — acceptable for any realistic team scale.

The X3 requirement (disambiguator on collision) provides defense-in-depth. Even if a collision occurs, the system appends a disambiguator rather than overwriting.

## Local Filesystem Pipeline Validation

### Prototype
- Scope resolution: project (`.pearl/attachments/`) and user (`~/.pearl/attachments/<project-id>/`) modes both implemented and tested
- Atomic writes: write to temp file, `fs.renameSync` to final path — atomic on same filesystem
- Path traversal safety: `validatePath()` rejects `../`, absolute paths outside base, and sibling prefix attacks
- Ref computation: SHA-256 first 12 hex chars, consistent and deterministic
- Pearl syntax generation: produces correct `<!-- pearl-attachment:v1:... -->` blocks for local mode

### Results
- 14 vitest tests pass
- bd CLI round-trip preserves local-mode syntax byte-for-byte
- Path resolution is deterministic and safe

### Test
- Code: `docs/proof/beads-gui-yqe6.1/local-storage.ts`
- Tests: `docs/proof/beads-gui-yqe6.1/local-storage.test.ts`

## Locked Numeric Defaults (for Epic 3: Settings)

Based on POC measurements, the following defaults are recommended:

| Setting | Default | Rationale |
|---------|---------|-----------|
| `storageMode` | `local` | Dolt growth with inline exceeds 5× threshold (Gate 3 FAIL) |
| `local.scope` | `project` | Simpler setup; user scope deferred to v2 per advisory D2 |
| `encoding.format` | `webp` | Best compression/quality ratio; universal browser support |
| `encoding.maxBytes` | `1,048,576` (1 MB) | Browser handles 10×1MB comfortably (Gate 2); inline stays reasonable |
| `encoding.maxDimension` | `2,048` px | Covers 1080p screenshots; keeps file size manageable |
| `encoding.stripExif` | `true` (mandatory) | Privacy invariant per U9 and advisory A3; not user-configurable |
| Orphan-sweep grace period | `3,600` s (1 hour) | Generous enough for retry; short enough to avoid accumulation |
| `maxInlineBytes` | `51,200` (50 KB) | New setting: auto-promote to local mode above this threshold |

### New Recommendation: `maxInlineBytes`
The POC revealed that inline mode is viable for small images but problematic for large ones. A `maxInlineBytes` threshold (default 50 KB) would automatically use local mode for larger images while keeping small icons/thumbnails inline for Dolt sync convenience. This was not in the original spec and should be considered for Epic 3.

## Assumptions Validated

| Assumption | Result |
|------------|--------|
| HEIC-from-macOS-Safari clipboard survives decode | **Not tested** — requires manual browser testing. Recommend testing in Epic 6a. If HEIC fails, add transcode layer. |
| Dolt text-field chunking shares prefixes/suffixes around large base64 blocks | **Partially refuted** — Dolt does chunk large values, but per-edit growth is still 1.14× the full field size. Deduplication is at the chunk level, not the row level. |
| `bd edit` does not normalize whitespace in HTML comments | **Confirmed** — HTML comments preserved byte-for-byte through bd CLI |

## Evidence Inventory

| Evidence | Location |
|----------|----------|
| Parser/serializer code | `packages/shared/src/attachment-syntax.ts` |
| Parser unit tests (26) | `packages/shared/src/attachment-syntax.test.ts` |
| Vitest config for shared | `packages/shared/vitest.config.ts` |
| Browser benchmark | `docs/proof/beads-gui-yqe6.1/browser-benchmark.spec.ts` |
| Dolt growth script | `docs/proof/beads-gui-yqe6.1/dolt-growth-measurement.ts` |
| Local storage prototype | `docs/proof/beads-gui-yqe6.1/local-storage.ts` |
| Local storage tests (14) | `docs/proof/beads-gui-yqe6.1/local-storage.test.ts` |
| Playwright config | `docs/proof/beads-gui-yqe6.1/playwright.config.ts` |

## Go/No-Go Verdict

**GO** — with the following conditions:

1. **Default to local mode** — the Dolt growth failure is a known, mitigated risk
2. **Add `maxInlineBytes` setting** — auto-promote to local mode above 50 KB
3. **Test HEIC clipboard in Epic 6a** — if it fails, add transcode layer
4. **File a design decision** for the `maxInlineBytes` threshold (new setting not in original spec)

The three passing gates confirm that:
- Pearl syntax is safe for round-tripping through the bd CLI
- Browsers handle inline attachments well within performance budgets
- 12-hex refs provide sufficient collision resistance for any realistic team

The local-filesystem pipeline prototype validates scope resolution, atomic writes, and path traversal safety — ready for productionization in Epic 5 (Local Storage Adapter).
