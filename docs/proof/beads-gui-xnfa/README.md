# Pearl Marketing Site Polish Loop — Proof

**Meta-epic:** `beads-gui-xnfa` · **Spec:** `docs/specs/marketing-site.md` · **Captured:** 2026-04-30

The polish loop ran 2 cycles against the marketing site, shipping 8 polish epics with 0 failures. This bundle captures end-to-end visual + audit proof from a local build of `packages/site/dist/` served on `http://localhost:4324`.

## Loop summary

| Cycle | Epics | Duration | Result |
|---|---|---|---|
| 1 | 3fx3 (positioning), p2ql (content accuracy), 0npq (a11y/SEO), z1ml (interaction quality) | 29 min | 4/4 closed |
| 2 | zjfk (a11y hardening), 5d5w (landing craft), odq3 (docs cohesion), 8en5 (interaction micro-detail) | 16 min | 4/4 closed |

Commits in scope: `9f6cced … e63a201` (8 polish commits + 2 auto-commit recovery commits).

## Lighthouse (mobile, simulated throttling, headless Chromium)

| Page | Perf | A11y | BP | SEO |
|------|-----:|-----:|---:|----:|
| `/` | **100** | **100** | **100** | **100** |
| `/docs/` | **100** | **95** | **100** | **100** |
| `/docs/quickstart/` | **100** | **96** | **100** | **100** |

Spec U6 thresholds (Perf ≥85, A11y ≥95, BP ≥95, SEO ≥95) — **all met**.

Residual a11y signal: `color-contrast` flagged on Starlight's `.description` card subtitle on docs landing/guides (5 nodes). A11y still ≥95 spec floor; resolving requires Starlight token tweak, not blocking.

Full HTML reports: `lh-landing.report.html`, `lh-docs.report.html`, `lh-quickstart.report.html`.

## Headers golden

`packages/site/public/_headers` and `packages/site/dist/_headers` both byte-match `docs/specs/headers-golden.txt`. Spec U11 satisfied.

## Screenshots

Captured at 1440×900 (desktop) and 360×640 @2x (Moto G4-like mobile) via Playwright against the local preview.

| File | Surface |
|---|---|
| `landing-above-fold.png` | Desktop hero — positioning, install snippet, Star CTA |
| `landing-full.png` | Desktop full landing — hero, "Why Pearl?" 6 feature cards (with AI-agent collaboration callout), CTA section |
| `landing-light.png` | Light-mode hero |
| `landing-mobile.png` | Mobile full landing |
| `docs-landing.png` | `/docs/` splash — Pearl wordmark, positioning intro, 3 nav cards |
| `docs-quickstart.png` | Quickstart guide — sidebar IA, prose, on-this-page TOC |
| `docs-faq.png` | FAQ — first answer reinforces "web UI for the Beads database" positioning |
| `docs-mobile.png` | Mobile docs |

## Verification against spec §16

### §16.1 Positioning (highest priority)

- ✅ Above the fold: "**THE WEB UI FOR BEADS**" pill + "Pearl is the visual interface for the Beads issue tracker. Table views, board views, keyboard-driven workflows — all running locally from one command."
- ✅ "Star on GitHub" CTA visible top-right of header (links to `htxryan/pearl`).
- ✅ Install snippet `npx pearl-bdui` with copy button + Node 22+ note above the fold.
- ✅ FAQ leads with "What is Pearl?" → "Pearl is the web UI for the Beads database." (positioning-correct phrasing — replaced cycle-2 architect's flagged "AI work management system" copy).
- ✅ `/docs/` intro: "Pearl is the web UI for Beads — from quick setup to advanced configuration."
- ✅ Landing tab title: "Pearl — The Web UI for Beads".

### §16.2 Audit Focus

| Focus | Evidence |
|---|---|
| Landing-page craft | `landing-full.png` — section rhythm varies (alt section bg), 6 feature cards with AI-agent card highlighted, CTA section with steps strip |
| Starlight docs polish | `docs-quickstart.png`, `docs-faq.png` — sidebar IA: Getting Started → Reference → Help (6 guides), tokens.css drives palette, on-this-page rail, prev/next nav |
| Accessibility | A11y 100 on `/`, 95–96 on `/docs/*` (above spec floor). Skip link, semantic landmarks, focus rings, ≥44px touch targets per cycle-2 epic zjfk |
| Lighthouse | All 100s on landing; perf 100 on docs |
| Visual rhythm | Marketing→docs seam coherent — both surfaces share Pearl indigo wordmark, Inter type, JetBrains Mono code; docs splash uses landing-style hero |

## Residual items (non-blocking)

1. **Starlight `.description` color-contrast** (docs landing card subtitles, 5 nodes) — A11y stays at spec floor (95) but worth a token tweak follow-up.
2. **Polish-report-cycle-{1,2}.md** in `docs/specs/` are stub artifacts from the dry-run; the real audit lives in `.compound-agent/agent_logs/polish-cycle-*/polish-architect.log`.
3. **Reviewer fleet weakness**: `claude-sonnet`/`claude-opus` returned idle prompts and `gemini` crashed on stdin in both cycles. The polish-architect recovered by performing the audit itself — worth investigating before next polish loop.

## Reproducing

```bash
pnpm --filter @pearl/site build
pnpm --filter @pearl/site preview --port 4324 &
# Wait for ready, then:
npx -y lighthouse http://localhost:4324/ \
  --form-factor=mobile --throttling-method=simulate \
  --only-categories=performance,accessibility,best-practices,seo
```
