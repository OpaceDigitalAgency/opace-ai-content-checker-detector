# Opace AI Content Integrity research index

This is the canonical navigation hub for the project's first-party research and evidence on GitHub. It links every meaningful Markdown research source directly so none depends on GitHub's folder browser, code search or an untracked parent directory to be found.

Coverage at 1 September 2026: **117 source documents** comprising 8 current authority and evidence documents, 32 measurement reports, 10 publication-source drafts, 53 local-engine research documents and 14 dated foundation research snapshots. The 21 public research papers are mapped to those sources separately below.

This structure makes the files crawlable from the repository front page and cross-links related evidence. It does not prove that GitHub, Google or an AI search service has indexed any particular page.

## Start here

| Document | Use it for |
|---|---|
| [Technical architecture, science, evidence and claim boundaries](AI-CONTENT-INTEGRITY-TECHNICAL-ARCHITECTURE.md) | The single consolidated description of what the system does, how it works and what it can accurately claim |
| [Evidence index](EVIDENCE-INDEX.md) | Test runs, measured figures, machine-readable artefacts and reproduction paths |
| [Capability register](CAPABILITIES.md) | What is implemented, measured, held, unsupported or planned |
| [Measured findings](MEASURED-FINDINGS.md) | The main scientific findings with denominators and limitations |
| [Per-model detection](PER-MODEL-DETECTION.md) | Results by generating model, with retired and current operating points separated |
| [Test evidence](TEST-EVIDENCE.md) | Suite totals and detailed model, route and corpus test evidence |
| [Watermark Lab](WATERMARK-LAB.md) | Public SynthID-Text maths, demo-key evidence and provider-verification boundary |
| [Model and data provenance](../MODEL_AND_DATA_PROVENANCE.md) | Model checkpoint, corpus sources, licences, splits and provenance |
| [Foundation research snapshots](../research/README.md) | Historical planning, market, watermark, humaniser and hypothesis research |
| [Local-engine research foundation](../services/local-engine/research/README.md) | Model, corpus, feature, calibration and runtime workstreams |

## Public research library: page-to-source map

The readable library is [Opace AI Content Integrity research](https://opace.agency/tools/ai/content-verification-integrity/research/). Each of its 21 papers links here to the repository evidence that supports it.

| Public paper | Main repository sources |
|---|---|
| [Burstiness, em dashes and folk signals](https://opace.agency/tools/ai/content-verification-integrity/research/ai-writing-myths-measured/) | [Publication source](research-drafts/burstiness-does-not-work.md), [matched heuristic table](../services/local-engine/research/signal-science/tables/famous-heuristics.md), [Signal Science](../services/local-engine/research/signal-science/SIGNAL-SCIENCE.md) |
| [Claude and SynthID text watermark](https://opace.agency/tools/ai/content-verification-integrity/research/claude-synthid-text-watermark/) | [Watermark Lab](WATERMARK-LAB.md), [paraphrase resilience](../services/local-engine/research/paraphrase-resilience/README.md), [SynthID deep dive](../research/SYNTHID-AND-ORIGINALITY-DEEP-DIVE.md) |
| [Detection and document length](https://opace.agency/tools/ai/content-verification-integrity/research/detection-and-document-length/) | [Length, model and content-type tables](measurements/DETECTION-BY-LENGTH-AND-MODEL.md), [publication source](research-drafts/why-length-dominates.md) |
| [Detection rates in full](https://opace.agency/tools/ai/content-verification-integrity/research/detection-rates/) | [Length, model and content-type tables](measurements/DETECTION-BY-LENGTH-AND-MODEL.md), [per-model detection](PER-MODEL-DETECTION.md) |
| [The 27% problem](https://opace.agency/tools/ai/content-verification-integrity/research/the-27-percent-problem/) | [Cycle-5 report](../services/local-engine/research/cycle5-train/CYCLE5-REPORT.md), [structured-human corpus](../services/local-engine/research/human-structured-corpus-2026-08-31/README.md), [input-surface measurement](measurements/INPUT-SURFACE-2026-08-31.md) |
| [Eighteen phrases](https://opace.agency/tools/ai/content-verification-integrity/research/eighteen-phrases/) | [Phrase-frequency ratios](measurements/AI-PHRASE-RATIOS.md) |
| [How the verdict is combined](https://opace.agency/tools/ai/content-verification-integrity/research/how-the-verdict-is-combined/) | [Aggregation and rhythm](measurements/AGGREGATION-AND-RHYTHM.md), [publication source](research-drafts/maximum-not-mean.md) |
| [How the corpus was built](https://opace.agency/tools/ai/content-verification-integrity/research/how-we-built-the-corpus/) | [Cycle-2 corpus report](../services/local-engine/research/cycle2-corpus/CORPUS-REPORT.md), [manifest](../services/local-engine/research/cycle2-corpus/MANIFEST.md), [reconciliation](measurements/CORPUS-RECONCILIATION-2026-08-31.md), [publication source](research-drafts/how-the-corpus-was-built.md) |
| [Measured and declined](https://opace.agency/tools/ai/content-verification-integrity/research/measured-and-declined/) | [Publication source](research-drafts/measured-and-declined.md), [rule validation](../services/local-engine/research/rule-validation/RULE-VALIDATION.md), [stripped-prose evaluation](../services/local-engine/research/stripped-eval/STRIPPED-PROSE-EVAL.md) |
| [Methodology](https://opace.agency/tools/ai/content-verification-integrity/research/methodology/) | [Technical architecture](AI-CONTENT-INTEGRITY-TECHNICAL-ARCHITECTURE.md), [evidence index](EVIDENCE-INDEX.md), [model and data provenance](../MODEL_AND_DATA_PROVENANCE.md) |
| [Server and browser parity](https://opace.agency/tools/ai/content-verification-integrity/research/server-and-browser-parity/) | [Route parity](measurements/ROUTE-PARITY.md), [WebGPU parity](measurements/WEBGPU-PARITY.md), [publication source](research-drafts/two-runtimes-one-answer.md) |
| [The humaniser weakness](https://opace.agency/tools/ai/content-verification-integrity/research/the-humaniser-weakness/) | [Competitor study](../research/HUMANIZER-AND-DETECTOR-COMPETITOR-STUDY.md), [HumanizerBench evidence](../research/HUMANIZERBENCH-AUGUST-2026.md), [paired corpus](measurements/PHASE-2-PAIRED-CORPUS.md), [fp32 results](../services/local-engine/research/humaniser-detection-2026-08-31/fp32-results.md) |
| [The price of strictness](https://opace.agency/tools/ai/content-verification-integrity/research/the-price-of-strictness/) | [Sensitivity curve](measurements/SENSITIVITY-CURVE.md) |
| [The rhythm you can hear](https://opace.agency/tools/ai/content-verification-integrity/research/the-rhythm-you-can-hear/) | [Synthetic cadence measurement](measurements/SYNTHETIC-CADENCE.md), [cadence module](../services/local-engine/research/signal-science/cadence/README.md), [owner rhythm hypotheses](../research/OWNER-RHYTHM-NOTES.md) |
| [The segmentation bug](https://opace.agency/tools/ai/content-verification-integrity/research/the-segmentation-bug/) | [Token fix measurement](measurements/SEGMENT-TOKEN-FIX.md), [publication source](research-drafts/the-segmentation-bug.md) |
| [The tells we tested](https://opace.agency/tools/ai/content-verification-integrity/research/the-tells-we-tested/) | [Document-level tells](measurements/DOCUMENT-TELLS-2026-08-31.md), [measurement workstream](../services/local-engine/research/document-tells-2026-08-31/README.md), [rule aggregates](measurements/RULE-TELL-AGGREGATES-2026-08-31.md) |
| [The verdict we refuse to give](https://opace.agency/tools/ai/content-verification-integrity/research/the-verdict-we-refuse-to-give/) | [Four-way verdict measurement](measurements/FOUR-WAY-VERDICT-SEPARABILITY.md), [workstream results](../services/local-engine/research/fourway-separability-2026-08-31/RESULTS.md) |
| [What the model keys on](https://opace.agency/tools/ai/content-verification-integrity/research/what-the-model-keys-on/) | [Publication source](research-drafts/what-the-model-keys-on.md), [model ablation](../services/local-engine/research/signal-science/tables/model-probe.md) |
| [Why no sentence gets a number](https://opace.agency/tools/ai/content-verification-integrity/research/why-no-sentence-gets-a-number/) | [Per-sentence reliability](measurements/PER-SENTENCE-RELIABILITY.md) |
| [Write like a human](https://opace.agency/tools/ai/content-verification-integrity/research/write-like-a-human/) | [Publication source](research-drafts/does-write-like-a-human-work.md), [measured findings](MEASURED-FINDINGS.md) |
| [Writing rules are not detection](https://opace.agency/tools/ai/content-verification-integrity/research/writing-rules-are-not-detection/) | [Publication source](research-drafts/rules-that-run-backwards.md), [rule validation](../services/local-engine/research/rule-validation/RULE-VALIDATION.md) |

## Dated foundation research snapshots

These 14 documents are public for traceability and discovery. Their headers state their historical boundary. Current measured reports override them where the two conflict.

- [AI Scribe integration analysis](../research/AI-SCRIBE-INTEGRATION.md)
- [AI Tells Mega Pack](../research/AI-TELLS-MEGA-PACK.md)
- [Clean-Prose Detection Plan](../research/CLEAN-PROSE-DETECTION-PLAN.md)
- [Fact-check and technical confidence](../research/FACT-CHECK-AND-CONFIDENCE.md)
- [Google Preferred Sources lessons](../research/GOOGLE-PREFERRED-SOURCES-LESSONS.md)
- [Humaniser and AI-detector competitor study](../research/HUMANIZER-AND-DETECTOR-COMPETITOR-STUDY.md)
- [Humaniser research handover](../research/HUMANIZER.md)
- [HumanizerBench August 2026 evidence and Opace challenge run](../research/HUMANIZERBENCH-AUGUST-2026.md)
- [Open-source landscape](../research/OPEN-SOURCE-LANDSCAPE.md)
- [Owner-docs tells catalogue](../research/OWNER-DOCS-TELLS.md)
- [Owner rhythm notes](../research/OWNER-RHYTHM-NOTES.md)
- [Real-world evaluation, August 2026](../research/REAL-WORLD-EVAL-2026-08.md)
- [SynthID-Text and Originality.ai deep dive](../research/SYNTHID-AND-ORIGINALITY-DEEP-DIVE.md)
- [WordPress and Astro market gap](../research/WORDPRESS-ASTRO-MARKET.md)

## Measurement reports

These 32 reports record measured results, verification runs or bounded audits. A dated report remains part of the evidence trail even when a later report supersedes its operating point.

- [Aggregation and rhythm](measurements/AGGREGATION-AND-RHYTHM.md)
- [AI phrase ratios](measurements/AI-PHRASE-RATIOS.md)
- [C2PA text-credential conflict](measurements/C2PA-TEXT-CREDENTIAL-CONFLICT-2026-08-29.md)
- [Checker final regression](measurements/CHECKER-FINAL-REGRESSION-2026-08-27.md)
- [Corpus reconciliation, 29 August](measurements/CORPUS-RECONCILIATION-2026-08-29.md)
- [Corpus reconciliation, 31 August](measurements/CORPUS-RECONCILIATION-2026-08-31.md)
- [Detection by length, model and content type](measurements/DETECTION-BY-LENGTH-AND-MODEL.md)
- [Document-level tells](measurements/DOCUMENT-TELLS-2026-08-31.md)
- [Shape-tell escalation arm](measurements/ESCALATION-ARM-2026-08-31.md)
- [Four-way verdict separability](measurements/FOUR-WAY-VERDICT-SEPARABILITY.md)
- [Implementation-to-research traceability](measurements/IMPLEMENTATION-RESEARCH-TRACEABILITY-MATRIX-2026-08-27.md)
- [Input surfaces reaching the model](measurements/INPUT-SURFACE-2026-08-31.md)
- [JustDone evaluation and terms boundary](measurements/JUSTDONE-HUMANISER-EVALUATION-2026-08-31.md)
- [LLM rewrite robustness](measurements/LLM-REWRITE-ROBUSTNESS.md)
- [Watermark paraphrase resilience](measurements/PARAPHRASE-RESILIENCE-MEASUREMENT-2026-08-29.md)
- [Per-sentence reliability](measurements/PER-SENTENCE-RELIABILITY.md)
- [Phase 2 paired corpus](measurements/PHASE-2-PAIRED-CORPUS.md)
- [Public package README refreeze](measurements/PUBLIC-PACKAGE-README-REFREEZE-2026-08-27.md)
- [Publication preview audit](measurements/PUBLICATION-PREVIEW-INDEPENDENT-AUDIT-2026-08-27.md)
- [QA-90 final regression](measurements/QA-90-FINAL-REGRESSION.md)
- [Route parity](measurements/ROUTE-PARITY.md)
- [Rule-tell aggregates](measurements/RULE-TELL-AGGREGATES-2026-08-31.md)
- [Segmentation token fix](measurements/SEGMENT-TOKEN-FIX.md)
- [Sensitivity curve](measurements/SENSITIVITY-CURVE.md)
- [Short-form retrain](measurements/SHORT-FORM-RETRAIN.md)
- [Submission readiness](measurements/SUBMISSION-READINESS-2026-08-26.md)
- [Synthetic cadence](measurements/SYNTHETIC-CADENCE.md)
- [Tool-page design reconciliation](measurements/TOOL-PAGE-DESIGN-RECONCILIATION-2026-08-27.md)
- [Two-axis retrain](measurements/TWO-AXIS-RETRAIN.md)
- [Watermark robustness and provider status](measurements/WATERMARK-ROBUSTNESS-AND-PROVIDER-STATUS-2026-08-29.md)
- [Independent website submission review](measurements/WEB-SUBMISSION-INDEPENDENT.md)
- [WebGPU parity](measurements/WEBGPU-PARITY.md)

## Publication-source drafts

These 10 files are source copy and build notes for public papers. Some contain instructions that are deliberately not part of the public page body.

- [The famous heuristics, measured](research-drafts/burstiness-does-not-work.md)
- [Does “write like a human” work?](research-drafts/does-write-like-a-human-work.md)
- [How the corpus was built](research-drafts/how-the-corpus-was-built.md)
- [Why the verdict uses the maximum](research-drafts/maximum-not-mean.md)
- [Measured and declined](research-drafts/measured-and-declined.md)
- [Writing rules that run backwards](research-drafts/rules-that-run-backwards.md)
- [The segmentation bug](research-drafts/the-segmentation-bug.md)
- [Two runtimes, one answer](research-drafts/two-runtimes-one-answer.md)
- [What the model keys on](research-drafts/what-the-model-keys-on.md)
- [Why length dominates](research-drafts/why-length-dominates.md)

## Local-engine model, corpus and signal research

### Foundation and runtime

- [Local-engine research foundation](../services/local-engine/research/README.md)
- [Browser runtime specification](../services/local-engine/research/BROWSER-RUNTIME-SPEC.md)
- [Browser-route performance harness](../services/local-engine/research/browser-perf/README.md)

### Corpora and model cycles

- [Current-model evaluation](../services/local-engine/research/current-models/CURRENT-MODEL-EVAL.md)
- [Cycle-2 corpus report](../services/local-engine/research/cycle2-corpus/CORPUS-REPORT.md)
- [Cycle-2 corpus manifest](../services/local-engine/research/cycle2-corpus/MANIFEST.md)
- [Cycle-2 corpus README](../services/local-engine/research/cycle2-corpus/README.md)
- [Cycle-2 training report](../services/local-engine/research/cycle2-train/CYCLE2-REPORT.md)
- [Cycle-3 edited-text report](../services/local-engine/research/cycle3-edited/CYCLE3-REPORT.md)
- [Cycle-4 humaniser-pairs corpus](../services/local-engine/research/cycle4-humaniser-pairs/README.md)
- [Cycle-4 four-way separability](../services/local-engine/research/cycle4-separability/README.md)
- [Cycle-5 training report](../services/local-engine/research/cycle5-train/CYCLE5-REPORT.md)
- [Cycle-5 training README](../services/local-engine/research/cycle5-train/README.md)
- [Cycle-5 Phase 1 feature-parity note](../services/local-engine/research/cycle5-train/deploy-prep/PHASE1-PARITY-NOTE-2026-09-01.md)
- [Generated-corpus evaluation](../services/local-engine/research/generated-corpus/GENERATED-CORPUS-EVAL.md)
- [Generated-corpus file index](../services/local-engine/research/generated-corpus/INDEX.md)
- [Long-form corpus manifest](../services/local-engine/research/longform-corpus/MANIFEST.md)
- [Long-form corpus README](../services/local-engine/research/longform-corpus/README.md)
- [Long-form corpus report](../services/local-engine/research/longform-corpus/REPORT.md)
- [Structured human corpus](../services/local-engine/research/human-structured-corpus-2026-08-31/README.md)
- [Matched generation](../services/local-engine/research/human-structured-corpus-2026-08-31/matched-generation/README.md)

### Humanisation, rewriting and provenance labels

- [Document-tells workstream](../services/local-engine/research/document-tells-2026-08-31/README.md)
- [Shape-tell escalation workstream](../services/local-engine/research/escalation-arm-2026-08-31/README.md)
- [Four-way separability README](../services/local-engine/research/fourway-separability-2026-08-31/README.md)
- [Four-way separability results](../services/local-engine/research/fourway-separability-2026-08-31/RESULTS.md)
- [Humaniser browser interim results](../services/local-engine/research/humaniser-detection-2026-08-31/browser-interim.md)
- [Humaniser fp32 results](../services/local-engine/research/humaniser-detection-2026-08-31/fp32-results.md)
- [Paraphrase resilience](../services/local-engine/research/paraphrase-resilience/README.md)

### Evaluation and signal science

- [Provider-scale evaluation](../services/local-engine/research/provider-eval/PROVIDER-EVAL-2026-08.md)
- [Rule-validation action list](../services/local-engine/research/rule-validation/ACTION-LIST.md)
- [Per-rule validation](../services/local-engine/research/rule-validation/RULE-VALIDATION.md)
- [Signal Science README](../services/local-engine/research/signal-science/README.md)
- [Signal Science report](../services/local-engine/research/signal-science/SIGNAL-SCIENCE.md)
- [Synthetic cadence module](../services/local-engine/research/signal-science/cadence/README.md)
- [Signals by evasion axis](../services/local-engine/research/signal-science/tables/by-evasion-axis.md)
- [Signals by register](../services/local-engine/research/signal-science/tables/by-register.md)
- [Famous heuristics](../services/local-engine/research/signal-science/tables/famous-heuristics.md)
- [Full feature battery](../services/local-engine/research/signal-science/tables/feature-battery-all.md)
- [Fresh long-form feature battery](../services/local-engine/research/signal-science/tables/feature-battery-freshlongform.md)
- [Model ablation probe](../services/local-engine/research/signal-science/tables/model-probe.md)
- [Published open-source baselines](../services/local-engine/research/signal-science/tables/open-source-baselines.md)
- [Signal robustness](../services/local-engine/research/signal-science/tables/robustness.md)
- [Transparent scorecard](../services/local-engine/research/signal-science/tables/scorecard.md)
- [Signal redundancy](../services/local-engine/research/signal-science/tables/signal-redundancy.md)
- [Transparent versus neural](../services/local-engine/research/signal-science/tables/transparent-vs-neural.md)
- [Worked scorecard examples](../services/local-engine/research/signal-science/tables/worked-examples.md)
- [Stripped-prose evaluation](../services/local-engine/research/stripped-eval/STRIPPED-PROSE-EVAL.md)
- [Calibration workbench](../services/local-engine/research/workbench/README.md)

### Model delivery and hosted route

- [Model-shrink report](../services/local-engine/research/model-shrink/MODEL-SHRINK-REPORT.md)
- [Model-shrink README](../services/local-engine/research/model-shrink/README.md)
- [Server inference plan](../services/local-engine/research/model-shrink/SERVER-INFERENCE-PLAN.md)
- [Hosted reference server](../services/local-engine/research/model-shrink/reference-server/README.md)
- [Hosted server security and cost model](../services/local-engine/research/model-shrink/reference-server/SECURITY.md)

## Link and coverage audit

The dated [research discovery and link audit](programme/RESEARCH-DISCOVERY-AND-LINK-AUDIT-2026-09-01.md) records the before-and-after graph, cross-check against the technical architecture, exclusions and unresolved discrepancies. It is kept separate so a navigation repair does not silently rewrite the evidence record.
