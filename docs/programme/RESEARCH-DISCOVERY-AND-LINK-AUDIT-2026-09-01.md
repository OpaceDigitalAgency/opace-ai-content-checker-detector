# Research discovery and link audit, 1 September 2026

## Purpose

This is the separate discrepancy log for the GitHub research-navigation task. It records what was counted, what was changed, what was deliberately excluded and what still needs investigation. It does not change a scientific result or close an unresolved product claim.

Repository audited: `OpaceDigitalAgency/opace-ai-content-verification-integrity-checker`, default branch `main`.

## Scope and definitions

A **meaningful research Markdown source** in this audit is one of:

- the eight current architecture, capability, provenance and evidence documents;
- every tracked `docs/measurements/*.md` report;
- every tracked `docs/research-drafts/*.md` publication source;
- every tracked `services/local-engine/research/**/*.md` workstream document;
- the 13 first-party programme-root research briefs and their dated HumanizerBench evidence report.

An **orphan** is a meaningful source with no inbound Markdown link from another tracked Markdown file. The stronger final gate also requires every meaningful source to have a direct link from `docs/RESEARCH-INDEX.md`.

The audit excludes third-party snapshot documentation, dependency READMEs, generated build evidence, package and store copy, design history, legal records and programme status files unless they are a discovery hub or contain a broken research link.

## Before the repair

| Check | Result |
|---|---:|
| All tracked Markdown files in the repository | 199 |
| Meaningful research sources already tracked | 102 |
| Meaningful sources with no inbound Markdown link | **33** |
| Programme research sources named by the architecture document but absent from the GitHub repository | **14**: 13 `research/*.md` briefs plus the dated HumanizerBench evidence report |
| Relative Markdown links that crossed above the Git repository and therefore could not resolve on GitHub | **19 occurrences** |
| Public research papers named in architecture Appendix A | 20, while the current task board recorded a twenty-first live paper |

The 33 zero-inbound files were:

```text
docs/measurements/AI-PHRASE-RATIOS.md
docs/measurements/DOCUMENT-TELLS-2026-08-31.md
docs/measurements/ESCALATION-ARM-2026-08-31.md
docs/measurements/FOUR-WAY-VERDICT-SEPARABILITY.md
docs/measurements/INPUT-SURFACE-2026-08-31.md
docs/measurements/PUBLICATION-PREVIEW-INDEPENDENT-AUDIT-2026-08-27.md
docs/measurements/RULE-TELL-AGGREGATES-2026-08-31.md
docs/measurements/SENSITIVITY-CURVE.md
docs/research-drafts/burstiness-does-not-work.md
docs/research-drafts/does-write-like-a-human-work.md
docs/research-drafts/how-the-corpus-was-built.md
docs/research-drafts/maximum-not-mean.md
docs/research-drafts/measured-and-declined.md
docs/research-drafts/rules-that-run-backwards.md
docs/research-drafts/the-segmentation-bug.md
docs/research-drafts/two-runtimes-one-answer.md
docs/research-drafts/what-the-model-keys-on.md
docs/research-drafts/why-length-dominates.md
services/local-engine/research/browser-perf/README.md
services/local-engine/research/cycle4-humaniser-pairs/README.md
services/local-engine/research/cycle4-separability/README.md
services/local-engine/research/cycle5-train/CYCLE5-REPORT.md
services/local-engine/research/cycle5-train/README.md
services/local-engine/research/document-tells-2026-08-31/README.md
services/local-engine/research/escalation-arm-2026-08-31/README.md
services/local-engine/research/fourway-separability-2026-08-31/README.md
services/local-engine/research/fourway-separability-2026-08-31/RESULTS.md
services/local-engine/research/human-structured-corpus-2026-08-31/README.md
services/local-engine/research/human-structured-corpus-2026-08-31/matched-generation/README.md
services/local-engine/research/humaniser-detection-2026-08-31/browser-interim.md
services/local-engine/research/humaniser-detection-2026-08-31/fp32-results.md
services/local-engine/research/model-shrink/README.md
services/local-engine/research/signal-science/cadence/README.md
```

The 19 repository-boundary failures appeared in these groups:

- nine links from `docs/EVIDENCE-INDEX.md` to the parent programme's root research and build log;
- seven links from the Phase 2 brief to parent programme authority, research, evidence and handover files;
- one decision-register link to the parent programme objective;
- one threat-model link to the parent Cloud Run setup;
- one local-engine research README link to the parent clean-prose plan.

These were locally navigable only because the checkout sits inside a wider programme folder. They were broken as public GitHub links.

## Architecture-to-index cross-check

The consolidated architecture, current task board and new index now agree on:

- all 21 public research-paper URLs, including the later [The 27% problem](https://opace.agency/tools/ai/content-verification-integrity/research/the-27-percent-problem/);
- all 14 published foundation research snapshots;
- all 32 measurement reports;
- all 10 publication-source drafts;
- all 53 Markdown documents in the local-engine research workstreams;
- the eight current authority and evidence sources.

Architecture Appendix B previously named 13 foundation briefs as code text but did not link them because the files sat outside the Git repository. The public copies now carry direct links and a historical-snapshot warning. The HumanizerBench report, which the humaniser study depends on, was also added to Appendix B and the index.

## Changes made

1. Added `docs/RESEARCH-INDEX.md` as the canonical navigation hub. It covered 116 sources at the first pass and 117 after the next active cycle-5 report was committed.
2. Added `research/README.md` and published 14 dated, first-party foundation research snapshots under `research/`.
3. Added an authority warning to every published snapshot. Historical model versions, market observations and hypotheses are not presented as current product claims.
4. Removed local absolute paths from the two source briefs that contained them.
5. Published `research/ai-tells-pack-seed.json`, the machine-readable companion linked by the AI Tells brief.
6. Linked the research index from the root README, consolidated architecture, evidence index, foundation-research README and local-engine research README.
7. Repaired all 19 repository-boundary links. Where a private aggregate runner or parent-workspace handover is not public, the document now states that boundary instead of linking to a GitHub path that cannot exist.
8. Added `scripts/check-research-links.mjs` and `npm run test:research-links`. The root `npm test` now enforces direct index coverage, relative-link validity and links from the five discovery hubs.

## After the repair

The final automated gate is expected to report:

```text
Research index coverage: 117/117
Relative Markdown links: 750 checked, 0 broken
Discovery hubs: 5/5 link the index
```

The architecture and index contain the same 21 unique public research URLs. A fresh redirect-following HTTP check on 1 September 2026 returned **21/21 HTTP 200**. The exact relative-link count is tool output, not a promise about third-party citations or search-engine inclusion.

## Separate issue register

| ID | State | Issue | Next investigation |
|---|---|---|---|
| RDL-001 | Corrected in this task | 33 meaningful research sources had no inbound Markdown link | Keep `npm run test:research-links` in the regression gate |
| RDL-002 | Corrected in this task | 19 Markdown links escaped the Git repository and were broken on GitHub | Do not link public docs to parent-workspace files; publish or label the boundary |
| RDL-003 | Corrected in this task | 13 foundation briefs and the HumanizerBench evidence were described by the architecture but not present in the public repository | Maintain the public snapshots when a source is materially corrected, without silently changing historical figures |
| RDL-004 | Corrected in this task | Architecture Appendix B had filenames but no clickable GitHub paths, and omitted the HumanizerBench dependency | The architecture now links the public snapshots and the central index |
| RDL-005 | Open, owned by active research work | Three untracked files were present during the audit: `docs/ADVERSARIAL-HUMANISER-REVERSE-DETECTOR-TECHNICAL-OPTIONS-2026-08-31.md`, `docs/programme/RESEARCH-PAGES-PLAN.md` and `services/local-engine/research/justdone-eval-2026-08-31/manual-run/README-FOR-DAVID.md` | Decide in the task that owns each file whether it is publishable research, internal planning or operator-only material. Any committed research source will fail the new gate until it is indexed |
| RDL-006 | Open, platform evidence required | A crawlable public link graph does not prove GitHub code-search, Google or AI-search indexing | After publication, record the public GitHub rendering, then use dated GitHub search and Search Console evidence rather than claiming indexing from links alone |
| RDL-007 | Open, content review | The 14 newly public snapshots contain dated claims and historical operating points. Headers make that boundary explicit, but a later editorial task may need claim-by-claim supersession notes inside long documents | Compare each dated quantitative or vendor claim against the current architecture and primary sources; do not rewrite the historical record silently |
| RDL-008 | Open, maintenance | The current gate validates repository-relative links but does not make network requests to every external citation | Add a rate-limited external-link audit if the project wants recurring third-party URL health evidence; keep it separate from scientific claim verification |
| RDL-009 | Corrected in this task | The architecture and first index pass listed 20 public papers, but the current task board recorded “The 27% problem” as the twenty-first live paper | Architecture Appendix A and the research index now contain the twenty-first page and its direct evidence map |
| RDL-010 | Open, audit-tool triage | The broad `plugin-repo-seo` first-pass auditor still reports 71 errors and 21 warnings. Its output includes clear scope false positives, such as treating corpus and fixture `manifest.json` files as browser-extension manifests and looking for WordPress directory assets at the repository root | Filter the generic auditor to real package and extension surfaces before using its totals as product defects. This result is not evidence of a broken research link |
| RDL-011 | Corrected and gate-proven | After the first 116/116 pass, active cycle-5 work committed `deploy-prep/PHASE1-PARITY-NOTE-2026-09-01.md`. The new gate failed immediately because the report was not indexed | Added the report as source 117. This is direct evidence that future committed research cannot silently become an orphan while the gate remains in `npm test` |

## Exclusions and preservation

The active screenshot, legal, Phase 2 and untracked changes shown by `git status` belonged to other work and were not edited, staged or published by this task. Third-party source snapshots remain outside the first-party research index because linking every vendored README would confuse consultation with reuse and would dilute the public evidence graph.
