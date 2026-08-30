# Opace AI Content Integrity opportunity

Status: 29 August 2026. The browser checker is live in production with a trained model behind it. Every other surface remains unreleased. Binding target and work log: [OBJECTIVE.md](OBJECTIVE.md). Detailed state: [STATUS.md](STATUS.md).

## Recommendation

Build **Opace AI Content Integrity** as a verification-first open-source product, not a “guaranteed watermark remover”. The first public release should be one Opace web suite hosted in the existing Astro site plus a reproducible benchmark, followed by one WordPress plugin, one Astro integration and Chrome-first browser extensions.

This positioning gives Opace a credible route to GitHub stars, links, WordPress installs and agency work without making a claim that cannot currently be proved. Anthropic has announced SynthID-based text watermarking, but its production detector API is still forthcoming. No third-party project can presently certify that a text has cleared Anthropic's live watermark.

## Current implementation state

**Released.** The browser checker went live on 28 August 2026 at 21:20 under owner authorisation, site commit `bb820686`, corrected the same night by commit `ce56ac54`. It is at <https://opace.agency/tools/ai/content-verification-integrity/checker/>, inside the suite at <https://opace.agency/tools/ai/content-verification-integrity/>. The web surface is no longer a candidate. A trained classifier ships with it: `tier3-cycle2-e5small-int8-perchannel.onnx`, an int8 export of intfloat/e5-small (33.36M parameters), 34.3 MB, served from the site over HTTP 200 and executed in the visitor's own browser.

At the live operating point of 0.984, measured through onnxruntime-web — the runtime that actually ships — on a fresh 5,558-document long-form corpus the model had never seen (922 AI documents from 13 current models; 4,636 human documents from Europe PMC, GOV.UK, CRS, Global Voices, Mongabay, SEC EDGAR and PERSUADE): **90.3% of AI documents detected, 1.34% of human documents falsely flagged**. Those are the figures the live page discloses.

**Still held.** WordPress 1.0.6 is the sole current exact local ZIP: `implementation/dist/opace-ai-content-integrity-1.0.6.zip`, SHA-256 `66df5f2411cfd933522bf314092069b2d3bb745649d027b585b6e7a9aa1d003a`, not submitted to WordPress.org. It rebuilds the bundled engine from the current core and supersedes 1.0.4; the gate evidence recorded against 1.0.4 does not carry over and must be re-run. The Chrome extension, the Astro integration, the CLI/SDK packages and the synthetic benchmark mechanics all remain tested local candidates against frozen G1/G2 inputs. No public GitHub repository, npm or PyPI release, Chrome Web Store listing or Astro catalogue entry exists.

**Deployed since 29 August 2026: the Cloud Run hosted inference service.** Verified live on that date at `https://opace-detector-877422072168.europe-west1.run.app`, revision `opace-detector-00003-bfq` serving 100% of traffic, europe-west1. `GET /v1/health` returned `{"ok":true,"model":"tier3-cycle2","precision":"fp32","model_build":"e313ab00de1fffd2","threads":2,"segmentation_contract":"segments-v1"}`. The URL and revision are not permanent and change on redeploy; treat both as observations dated 29 August 2026, not as fixed identifiers. See [CLOUD-RUN-SETUP.md](CLOUD-RUN-SETUP.md).

The viral reference is [guillaumemeyer/watermarks-remover](https://github.com/guillaumemeyer/watermarks-remover). Its fast growth shows the demand, but its Claude detector is a placeholder. Opace can capture the same interest by publishing a reproducible “Claude Watermark Readiness Lab” that exposes what is actually tested and adds the missing WordPress/Astro path.

## Launch sequence

1. ~~**Days 1–10: free Opace AI Content Integrity web suite.**~~ **Shipped 28 August 2026.** One `/tools/` card and parent page, with Checker and Claude Lab subpages using the existing Opace tool-page layout exactly. The checker ships with the trained model and with the 113 writing rules demoted to editorial suggestions.
2. **Days 11–30 (open): one WordPress plugin plus next AI Hub integration.** Checker, Claude Readiness, Rewrite Lab, Index, receipts and settings in one ZIP; the next Hub release lists/installs it and compatible AI-Scribe exposes it.
3. **Days 31–60 (open): AI Scribe Editorial Rewrite Lab.** Candidate rewrites with entity, number, claim, link and citation locks; before/after diff; selective acceptance; detector results labelled by provider, version and date.
4. **Days 45–90 (open): Opace AI Content Integrity Index.** A monthly, reproducible benchmark covering watermark readiness, meaning retention, readability, citations and commercial-detector false positives.
5. **Developer/install surfaces (open):** one Astro integration containing the same modules, local CLI/SDK packages on GitHub/npm/PyPI and a Chrome extension before separately tested Edge, Firefox and Safari ports. All are built and locally gated; none is published.
6. **Immediate agency offer:** content-risk and quality audits for existing sites, with human editorial work, evidence enrichment, provenance and disclosure guidance.

## Important distinction

- A statistical vendor watermark, invisible Unicode, C2PA file provenance and a commercial “AI detector” score are different signals.
- Clearing Copyleaks or Originality does not prove a Claude watermark was removed.
- Cleaning metadata does not alter a statistical text watermark.
- Rewriting with another watermarked model may add a new watermark.
- Google does not ban AI-assisted content; scaled low-value or obfuscated content is the SEO risk.

## Deliverables

- [Specification index and binding future-release hold](specs/README.md)
- [Shared build brief](specs/00-SHARED-BUILD-BRIEF.md)
- [Master product portfolio and execution order](strategy/MASTER-PRODUCT-PORTFOLIO-AND-EXECUTION-ORDER.md)
- [Implementation workstreams and dependency matrix](specs/08-IMPLEMENTATION-WORKSTREAMS-AND-DEPENDENCY-MATRIX.md)
- [Visibility, backlink and launch plan](strategy/VISIBILITY-BACKLINK-AND-LAUNCH-PLAN.md)
- [Google Preferred Sources lessons](research/GOOGLE-PREFERRED-SOURCES-LESSONS.md)
- [Specification validation and reconciliation log](evidence/SPECIFICATION-VALIDATION-LOG.md)
- [Fact-check and technical confidence](research/FACT-CHECK-AND-CONFIDENCE.md)
- [Open-source landscape and test evidence](research/OPEN-SOURCE-LANDSCAPE.md)
- [WordPress and Astro market gap](research/WORDPRESS-ASTRO-MARKET.md)
- [AI Scribe integration analysis](research/AI-SCRIBE-INTEGRATION.md)
- [Humaniser and detector competitor study](research/HUMANIZER-AND-DETECTOR-COMPETITOR-STUDY.md)
- [Product plan and launch roadmap](strategy/PRODUCT-OPTIONS-AND-ROADMAP.md)
- [Opace benchmark specification](strategy/OPACE-BENCHMARK-SPECIFICATION.md)
- [Free-first component and attribution plan](strategy/FREE-FIRST-COMPONENT-PLAN.md)
- [Snapshot and validation log](evidence/SNAPSHOT-AND-TEST-LOG.md)
- [August HumanizerBench evidence extract](evidence/HUMANIZERBENCH-AUGUST-2026.md)
- [Owner brief and implementation-to-research traceability matrix](.agent/docs/ai-content-integrity/IMPLEMENTATION-RESEARCH-TRACEABILITY-MATRIX-2026-08-27.md)
- [Binding objective, acceptance criteria and work log](OBJECTIVE.md)
- [Cycle-2 training report — the model that shipped](implementation/services/local-engine/research/cycle2-train/CYCLE2-REPORT.md)
- [Signal science: what actually separates machine from human prose](implementation/services/local-engine/research/signal-science/SIGNAL-SCIENCE.md)
- [Hosted inference setup and deployment record](CLOUD-RUN-SETUP.md)

## Folder map

- `implementation/` — the local product monorepo and its Git metadata, packages, WordPress plugin, services, tests and build evidence.
- `specs/`, `strategy/`, `research/` and `evidence/` — the binding programme source material and decision record.
- `source-material/Anthropic-watermark.md` — the original supplied brief.
- `source-snapshots/` and `market-snapshots/` — read-only research inputs retained for provenance and licence review.
- `.agent/docs/ai-content-integrity/` — orchestration briefs and gate evidence.

## Scope boundary

This is the single canonical local folder for the programme. Development candidates exist under `implementation/` and in the separate active Opace web checkout.

One surface has been deployed: the browser checker and its suite pages on opace.agency, live since 28 August 2026 under owner authorisation. Nothing from this programme has been added to AI-Scribe or AI Hub, and nothing has been published to a public repository, registry or store. The AI-Scribe/Hub integrations remain next/future-release work and cannot touch the held Hub/Scribe release lanes.

The source snapshots are for licence review, reproducibility and prototype evaluation; they are not assembled product dependencies.
