# Evidence index — Opace AI Content Integrity

**Current at 1 September 2026.** Every row declares its state, observation date, runtime and
operating point. `Current` means usable for a current claim within the stated boundary;
`historical` means reproducible history, not production performance; `open` means evidence still
has to be generated.

## Current model and deployment evidence

| State | Date | Runtime / operating point | What it supports | Source |
|---|---|---|---|---|
| current | 31 Aug–1 Sep | Cycle 5 fp32/int8; `segments-v3`; `raw-v1`; `features-v1`; margin 3.570935, gap 0.34 | model selection gates, dataset/splits, matched evaluation, short-form and int8 deltas | [`CYCLE5-REPORT.md`](../services/local-engine/research/cycle5-train/CYCLE5-REPORT.md) |
| current | 1 Sep | Cycle 5 fp32; fitted margin operating point | fit method, eval-view denominators, full result table and disclosed fit/evaluation reuse | [`CYCLE5-OPERATING-POINT-2026-08-31.md`](measurements/CYCLE5-OPERATING-POINT-2026-08-31.md) |
| current | 1 Sep | server fp32 902/922 and 46/4,636; browser int8 900/922 and 73/4,636 | current full-corpus headline and runtime separation | [`README.md`](../README.md#the-evidence-up-front) |
| current | 1 Sep | full corpus plus Cycle-2 overlap inventory | 654 independent / 268 overlapping AI and 11 overlapping human documents; claim limitation | [`PER-MODEL-DETECTION.md`](PER-MODEL-DETECTION.md), [`MODEL_AND_DATA_PROVENANCE.md`](../MODEL_AND_DATA_PROVENANCE.md) |
| current | 1 Sep | `opace-detector-00010-4dt`, build `45e00978b10d1df6` | live model tuple, revision-specific kill-switch and ten-path logging proof | operator evidence maintained in the private programme record; public service contract: [`reference-server/README.md`](../services/local-engine/research/model-shrink/reference-server/README.md) |
| current | 1 Sep | source/model suites | current source baseline and the boundary between source and exact-package evidence | [`TEST-EVIDENCE.md`](TEST-EVIDENCE.md) |
| tested local candidate, not deployed | 1 Sep | canonical website result/PDF flow | score-band formatting, rendered evidence, responsive/keyboard and genuine PDF output | [`TEST-EVIDENCE.md`](TEST-EVIDENCE.md#current-website-resultpdf-candidate); full record in the website checkout at `.agent/docs/opace/content-integrity-result-evidence-readiness-2026-09-01.md` |

The revision-specific safety report is intentionally an operator record, not public programme
history. The public repository contains the server contract and tests; it does not currently carry
the full Cloud account drill transcript. A redeploy makes the operator proof historical until the
same drills pass on the new revision.

## Current capability evidence

| State | Date | Runtime / operating point | What it supports | Source |
|---|---|---|---|---|
| current | 1 Sep | deterministic TypeScript engine and declared WordPress PHP subset | capability counts, surface parity boundary, three independent axes | [`CAPABILITIES.md`](CAPABILITIES.md), [`AI-CONTENT-INTEGRITY-TECHNICAL-ARCHITECTURE.md`](AI-CONTENT-INTEGRITY-TECHNICAL-ARCHITECTURE.md) |
| current | 1 Sep | `combined:2026.08.8` | only a trained model may set the AI reading | [`combine.ts`](../packages/core/src/verdict/combine.ts) |
| current | 31 Aug | Cycle-5 feature/scoring pipeline | current model/dataset hashes and known upstream provenance gaps | [`MODEL_AND_DATA_PROVENANCE.md`](../MODEL_AND_DATA_PROVENANCE.md) |
| current | 29 Aug | C2PA 2.4 wrapper and browser file reader | file provenance boundary and text-credential non-destruction rule | [`C2PA-TEXT-CREDENTIAL-CONFLICT-2026-08-29.md`](measurements/C2PA-TEXT-CREDENTIAL-CONFLICT-2026-08-29.md), [`WATERMARK-LAB.md`](WATERMARK-LAB.md) |
| current | 29 Aug | three Opace public demo keys | watermark lab own-key/wrong-key behaviour and claim boundary | [`WATERMARK-LAB.md`](WATERMARK-LAB.md) |
| current | 29 Aug | 40 paraphrases / 36 controls | watermark paraphrase failure and length-control result | [`PARAPHRASE-RESILIENCE-MEASUREMENT-2026-08-29.md`](measurements/PARAPHRASE-RESILIENCE-MEASUREMENT-2026-08-29.md) |
| current | 29–31 Aug | 5,558 long-form documents and representative human corpora | writing rules are editorial-only; three-axis independence | [`MEASURED-FINDINGS.md`](MEASURED-FINDINGS.md), [`RULE-VALIDATION.md`](../services/local-engine/research/rule-validation/RULE-VALIDATION.md) |

## Cycle-5 data and robustness evidence

| State | Date | Runtime / operating point | What it supports | Source |
|---|---|---|---|---|
| current | 31 Aug | training/data manifest | 31,800 rows; 18,682/3,859/9,259 splits; hashes and source counts | [`dataset-manifest.json`](../services/local-engine/research/cycle5-train/dataset-manifest.json) |
| current | 31 Aug | fp32 Cycle-5 fitted rule | independent matched-topic result and structured-human partner false positives | [`CYCLE5-REPORT.md`](../services/local-engine/research/cycle5-train/CYCLE5-REPORT.md#4-the-matched-pairs-held-out-slice--read-this-one-first) |
| current | 31 Aug | structural-feature model vs zero-feature ablation | feature contribution to short form, independent slice and fiction | [`CYCLE5-REPORT.md`](../services/local-engine/research/cycle5-train/CYCLE5-REPORT.md#verdict-against-the-gates) |
| current | 31 Aug | Cycle-2 historical pair, fp32 | LLM rewrite ladder and protected-content damage; informs Cycle-5 training but is not a current Cycle-5 rate | [`LLM-REWRITE-ROBUSTNESS.md`](measurements/LLM-REWRITE-ROBUSTNESS.md) |
| current finding, Cycle-5 remeasurement open | 31 Aug | named commercial tools against Cycle 2 | prior humaniser weakness and Terms/denominator boundary | [`HUMANIZER-AND-DETECTOR-COMPETITOR-STUDY.md`](../research/HUMANIZER-AND-DETECTOR-COMPETITOR-STUDY.md) |
| current | 31 Aug | measured document structure | cadence, word-count regularity and scaffold tells; editorial/explanation use only | [`DOCUMENT-TELLS-2026-08-31.md`](measurements/DOCUMENT-TELLS-2026-08-31.md), [`SYNTHETIC-CADENCE.md`](measurements/SYNTHETIC-CADENCE.md) |
| current | 31 Aug | Cycle-2 pair and Cycle-5 training input | markdown/input-surface confound and the reason input contract is model-specific | [`INPUT-SURFACE-2026-08-31.md`](measurements/INPUT-SURFACE-2026-08-31.md) |

## Release and test evidence

| State | Date | Runtime / operating point | What it supports | Source |
|---|---|---|---|---|
| current | 1 Sep | release-state observation | public GitHub/web/server versus unpublished stores/registries | [`RELEASE-STATE.md`](RELEASE-STATE.md) |
| current source baseline | 1 Sep | root/core/G1/G2/battery | current test totals; does not prove rebuilt archives | [`TEST-EVIDENCE.md`](TEST-EVIDENCE.md) |
| tested local candidate, not published | 1 Sep | exact WordPress 1.0.8 ZIP | hash, 10/10 reproducibility, Plugin Check, min/current/Multisite exact bytes, runtime/accessibility/C2PA/receipt gates | [`RELEASE-STATE.md`](RELEASE-STATE.md#wordpress) |
| tested local candidate, not published | 1 Sep | exact Chrome 1.0.0 ZIP | hash-pinned package, browser/Worker/accessibility/privacy gates | [`RELEASE-STATE.md`](RELEASE-STATE.md#chrome) |
| tested local candidate, not published | 1 Sep | five npm 0.1.0 tarballs plus Astro 0.1.0 | exact archives, deterministic packaging, clean consumers and Astro gate | [`RELEASE-STATE.md`](RELEASE-STATE.md#npm-and-astro) |
| tested local candidate, not published | 1 Sep | PyPI 0.1.0 wheel/sdist | exact hashes, repeat build, Twine, clean environment and lifecycle/privacy gates | [`RELEASE-STATE.md`](RELEASE-STATE.md#pypi) |

## Historical evidence — retain, do not quote as current

| State | Date | Runtime / operating point | What it supports | Source |
|---|---|---|---|---|
| historical | 28 Aug–1 Sep | Cycle 2 fp32/int8 probability pair | previous live model and rollback history | [`cycle2-train/CYCLE2-REPORT.md`](../services/local-engine/research/cycle2-train/CYCLE2-REPORT.md) |
| historical | 28 Aug | retired Tier-3 thresholds 0.8533/0.8397/0.6256 | register/era failure study, explicitly not current production | [`CURRENT-MODEL-EVAL.md`](../services/local-engine/research/current-models/CURRENT-MODEL-EVAL.md) |
| historical, rejected | 29–31 Aug | Cycle 3/4 candidate models | quantified reasons those candidates did not ship | [`TWO-AXIS-RETRAIN.md`](measurements/TWO-AXIS-RETRAIN.md), [`SHORT-FORM-RETRAIN.md`](measurements/SHORT-FORM-RETRAIN.md) |
| historical exact bytes | 26–30 Aug | named candidate hashes only | earlier package qualification; cannot transfer to rebuilt bytes | [`RELEASE-STATE.md`](RELEASE-STATE.md#clearly-retired-history) |

## Calibration and corpus assets

| State | Date | Runtime / operating point | What it supports | Source |
|---|---|---|---|---|
| current test-only | pre-Dec 2022 corpus, pinned | 4,144-human false-positive and hard-negative battery; prohibited from product distribution/training | [`HUMAN-CORPUS-V2.md`](../tests/battery/HUMAN-CORPUS-V2.md), [`human-corpus-v2.json`](../tests/battery/human-corpus-v2.json) |
| current | 28 Aug | source corpus | Cycle-2 source counts and per-source licence record | [`cycle2-corpus/MANIFEST.md`](../services/local-engine/research/cycle2-corpus/MANIFEST.md) |
| current | 31 Aug | structured-human corpus | GREEN/AMBER decisions, file hashes and matched-generation source | [`human-structured-corpus/README.md`](../services/local-engine/research/human-structured-corpus-2026-08-31/README.md) |
| current | 28 Aug | generated corpus | 4,016 usable owner-generated documents; no human comparison set | [`generated-corpus/INDEX.md`](../services/local-engine/research/generated-corpus/INDEX.md) |

## Research discovery

The complete first-party research inventory is [RESEARCH-INDEX.md](RESEARCH-INDEX.md). The current
link guard covers 119/119 tracked research sources, checks 556 repository-relative links and
requires all five discovery hubs to link back to that index.

If a claim in the README, this capability register or listing copy cannot be traced to a current
row with the same runtime, operating point and denominator, treat it as unverified.
