# Evidence index — Opace AI Content Integrity

**Model-lane update, 1 September 2026.** Every "shipped"/"deployed" reference below to the
`0.984` or `0.9855 / 0.9763` operating point, or to the cycle-2 model, describes what was live
28 August – 1 September 2026 only. Cycle-5 (`tier3-cycle5-v1`) replaced it as the deployed model
on 1 September 2026, with a margin-space flag rule (`max(m1, m2+0.34) >= 3.571`) rather than a
probability threshold; source `services/local-engine/research/cycle5-train/CYCLE5-REPORT.md` and
the shipped `thresholds.json`. The per-length and per-model tables this section indexes have not
yet been re-cut for cycle-5, so they remain the most detailed record available and are kept, but
must not be read as describing the current shipped pair.

**Read first:** [Architecture, science, evidence and claim boundaries](AI-CONTENT-INTEGRITY-TECHNICAL-ARCHITECTURE.md) is the 31 August 2026 consolidated reference. The [complete research index](RESEARCH-INDEX.md) links all 117 meaningful first-party Markdown research sources and maps the 21 public papers back to repository evidence. The follow-up register (internal programme record, maintained privately, not in this repository) records documentation and deployment discrepancies found during consolidation.

Six of these results are plotted as charts on the
[repository front page](../README.md#what-it-measures-and-where-it-fails), with the source report
and denominator named in every caption; the SVG files are in [`assets/charts/`](assets/charts/).

Every published claim in this repository traces back to a test run, an evaluation report or a research document. This file lists each evidence artefact with a one-line summary and its path, so nothing is asserted without a named source. Paths are relative to this file (`implementation/docs/`).

## Current verbatim test totals (29 August 2026, re-run for this index)

| Suite | Command | Result |
|---|---|---|
| Core unit, imports and performance | `npm --prefix packages/core test` | **123 pass / 0 fail** |
| Adversarial fixture battery | `npm run test:battery` | **110 pass / 0 fail** (carriers, slop, uniformity, rhythm, protected, combined verdict, cross-surface) |
| Watermark lab | `npm --prefix packages/watermark-lab test` | **30 pass / 0 fail** |
| Root suite | `npm test` | exit 0; typecheck clean; contracts "13 schemas; valid/invalid fixtures and OpenAPI passed"; Python "13 schemas, all fixtures, and RFC 8785 vectors passed"; PHP "22 contract fixtures, 3 hash vectors and 45 assertions passed" |
| Release gates | `npm run test:gates` | G2 core probe **24 passed / 0 failed**; local-candidate package gate, TS client/CLI package gate and the Chromium 375x812 Worker, long-task and performance-budget probes all pass |
| Rhythm calibration gate | `node tests/battery/calibrate.mjs` | "Calibration OK: 0/44 human samples fire any 2026.08.5 rule." |

The two stale version assertions recorded against the core suite in the 28 August edition of this
index (`patterns-v3.test.mjs:268` and `patterns-v4.test.mjs:171`, expecting `en-signals:2026.08.5`
after the 2026.08.6 bump) are resolved; the suite is clean.

The four cross-surface failures recorded on 28 August are also resolved. They were real: the
engine built here had `combined_verdict` and 116 rules while the copy installed in the website's
`node_modules` had neither, because the website had not been re-vendored. The engine was re-packed
with `npm run pack:vendor`, which rewrites monorepo `file:` dependency specs to real versions
before packing, and the resulting `package-lock.json` carries zero `"link": true` entries. That
script exists because a hand-vendored tarball with a `file:` spec produced a broken lockfile and
two failed Netlify deploys on 27 August 2026; see internal programme record (maintained privately, not in this repository) §5.

**Rule-pack counts, measured from the built pack rather than from prose:**

```
$ node -e "(async()=>{const a=await import('./packages/core/dist/patterns/en-signals-v2-data.js');
const b=await import('./packages/core/dist/patterns/en-signals-v3-data.js');
const c=await import('./packages/core/dist/patterns/en-signals-v4-data.js');
console.log('ISSUE_WEIGHTS:',Object.keys(a.ISSUE_WEIGHTS).length);
console.log('V3_ISSUE_WEIGHTS:',Object.keys(b.V3_ISSUE_WEIGHTS).length);
console.log('V4_ISSUE_WEIGHTS:',Object.keys(c.V4_ISSUE_WEIGHTS).length)})()"
ISSUE_WEIGHTS: 51
V3_ISSUE_WEIGHTS: 55
V4_ISSUE_WEIGHTS: 7
```

113 weighted categories, plus the 3 en-gb-v1 rules (`style.overused_phrase`,
`style.repeated_opening`, `style.transition_density`), for 116 named rules at
`en-signals:2026.08.6`. The `WRITING_SIGNAL_RULES_RUN` constant in
`packages/core/src/inspect.ts` now emits `rules_run: 116`, matching; the mismatch recorded in the
28 August edition of this index is closed. All 113 weighted categories are **editorial
suggestions** and contribute nothing to the AI reading (see the rules-tier row below).

**116 is the number of rules run, not the number that can fire.** Measured 29 August 2026 on
10,096 documents (5,743 AI, 4,353 human), 95 of the 116 fired on at least one AI document. One
— `tier3-phrase-cluster` — cannot fire on realistic prose and is not counted as a live
capability; twenty more are dormant but probe-verified reachable. The inventory is
[`../tests/battery/rule-liveness.json`](../tests/battery/rule-liveness.json), the reasons are in
[`../tests/battery/rule-liveness-inactive.json`](../tests/battery/rule-liveness-inactive.json),
and `tests/battery/rule-liveness-battery.test.mjs` fails the build if that ever stops being true.
See [`CAPABILITIES.md`](CAPABILITIES.md) §3.4a.

Browser-level suites recorded at their release points in the build log (Playwright against the built site, not re-run here): checker UI 22/22, lab UI 24/24, provenance panel 18/18, live production verification 6/6. See internal programme record (maintained privately, not in this repository) §5–5b for the exact runs.

## Findings published in full

[`MEASURED-FINDINGS.md`](MEASURED-FINDINGS.md) takes four results out of the research reports and
publishes them with their denominators, their model, their threshold and their caveats: the
prompt-style evasion axis (55.9% to 19.8%, and one model to 0 of 86), register beating model
choice (77.9% marketing against 1.1% academic, same models and topics), sentence occlusion (2,174
deletions across 57 documents; only 35.9% of sentences push their document towards "machine"),
and the writing rules that fire more on humans than on AI, named. It also withdraws one figure
that would not reproduce on a larger corpus: `token-cutoff` is not a backwards rule.

## Detection broken down by the model that wrote the text

[`PER-MODEL-DETECTION.md`](PER-MODEL-DETECTION.md) answers "what percentage of each model's
writing does this flag?" with the detector checkpoint, threshold, runtime, corpus and n stated on
every table. Its headline is the deployed cycle-2 model at the shipped **0.984** on the
5,558-document held-out long-form corpus: **95.1% (877/922) across 13 current models**, ranging
from 100% on six of them to 72.3% (73/101) on `meta-llama/llama-4-maverick`, at 1.21% human false
positives. The 21-model and public-data surveys are published too, in a fenced section labelled
as the **retired cycle-1 detector** at thresholds that no longer ship — their scored file tops out
at a probability of 0.8582 and cannot reach the shipped flag point, so no row of it is comparable
with a deployed-model figure. It also names the models behind every AI corpus, which was not
stated publicly before.

## Detection by document length, and by model — both cut in full

[`measurements/DETECTION-BY-LENGTH-AND-MODEL.md`](measurements/DETECTION-BY-LENGTH-AND-MODEL.md)
publishes two tables at the **shipped** `0.9855 / 0.9763` operating point on the fp32 reference
path, each self-contained and each stating n in every cell. The first bins 1,738 AI and 9,004 human
documents by achieved word count from under 100 to 5,000 and above, and reports detection rate,
human false-positive rate, and the mean and median probability **for each population separately**.
The second gives all 13 models and 10 providers with detection rate and probability distribution,
plus a two-model short-form view.

Three things in it are not visible in any aggregate figure. Detection reads **16.9% (29/172)** at
100–199 achieved words against the corpus headline of 95.77%, and **88.5% (46/52)** at 600–849.
The 850–1,199 band's 2.9% human false-positive rate (30/1,050) is **entirely human fiction** —
22 of the 30, and 8/809 = 0.99% with fiction removed. And **no AI document in this project exceeds
3,061 words**, so the 3,500-and-above bands carry human documents only and no AI rate exists for
them at any length. The harness reproduced 883/922, 45/4,636, 877/922, 56/4,636, the four published
short-form bands and all 13 published per-model cells before any new cut was taken.

## Evaluation reports

| Artefact | Summary | Path |
|---|---|---|
| Provider-scale evaluation, August 2026 (**historical**) | The 28 August morning measurement, kept for the record and **superseded** as an accuracy authority: its 169-document human side was 76% encyclopaedic and question-and-answer text, so its false-positive figures do not describe published prose. Still the source for the per-provider and per-era shape of rules-tier firing: 1,896 samples (1,727 AI across twelve provider-and-era slices, 169 held-out humans including all 40 fresh verified humans), per-provider rules and model-tier results, tests of the owner's style hypotheses, and the calibration recommendations that became `en-signals:2026.08.6` | [`../services/local-engine/research/provider-eval/PROVIDER-EVAL-2026-08.md`](../services/local-engine/research/provider-eval/PROVIDER-EVAL-2026-08.md) |
| Provider-eval sample set | The 1,896 evaluation samples themselves, with provider, era, model, side, genre, word count and leakage flags. Built by `build_eval_set.py`, seed 20260828, with sha256 dropping of anything matching a corpus training split | [`../services/local-engine/research/provider-eval/eval-set.jsonl`](../services/local-engine/research/provider-eval/eval-set.jsonl) |
| Provider-eval rules scores | Per-sample rules-tier output for all 1,896 samples: score, classification, probabilities, categories hit, finding count, applied escalation, per-rule counts, v4 metrics and stylometrics. Re-aggregating this file reproduces the historical 1,152/1,727 (66.7%) at 0/169 human false positives. **That pair of figures is superseded and must not be published**: on 5,558 fresh long-form documents the same rules measure 45.1% detection at a 24.8% human false-positive rate | [`../services/local-engine/research/provider-eval/rules-scores.jsonl`](../services/local-engine/research/provider-eval/rules-scores.jsonl) |
| Provider-eval model-tier scores (**historical**) | Per-sample probabilities for the retired cycle-1 classifier at its retired 0.857 flag. The shipped operating point is 0.984 on the cycle-2 model; this row documents what was replaced | [`../services/local-engine/research/provider-eval/tier3-scores.jsonl`](../services/local-engine/research/provider-eval/tier3-scores.jsonl) |
| Provider-eval combined scores | 1,896 rows of merged per-sample scores across tiers, the input to the aggregate analysis | [`../services/local-engine/research/provider-eval/provider-scores.json`](../services/local-engine/research/provider-eval/provider-scores.json) |
| Provider-eval aggregates | Machine-readable slice aggregates, per-rule firing rates, effect sizes and the zero-false-positive candidate table behind recommendations R1–R5 | [`../services/local-engine/research/provider-eval/analysis.json`](../services/local-engine/research/provider-eval/analysis.json) |
| Provider-eval pipeline | The four scripts that build, score and aggregate the set, so any figure can be regenerated: sample construction, rules scoring against the shipped `dist`, model-tier scoring, aggregation | [`build_eval_set.py`](../services/local-engine/research/provider-eval/build_eval_set.py), [`score_rules.mjs`](../services/local-engine/research/provider-eval/score_rules.mjs), [`score_tier3.py`](../services/local-engine/research/provider-eval/score_tier3.py), [`analyze.py`](../services/local-engine/research/provider-eval/analyze.py) |
| Model-tier operating point | The full threshold candidate table with human false positives, corpus detection and evaluation detection at every step from 0.20 to 0.95, the selection rule, and the cal/test split of the fresh human corpus. This is the source for what the retired cycle-1 zero-false-positive threshold gave up; the shipped point is now 0.984 on the cycle-2 model | [`../services/local-engine/research/eval/final-operating-point.json`](../services/local-engine/research/eval/final-operating-point.json) |
| ONNX quantisation reconciliation | Per-sample agreement between torch fp32, ONNX fp32, plain int8 and per-channel int8, with the boundary-crossing counts that justify shipping the per-channel build | [`../services/local-engine/research/eval/onnx-reconciliation.json`](../services/local-engine/research/eval/onnx-reconciliation.json) |
| Tier 2 ensemble measurement | The built-but-not-shipped GPT-2 surprisal ensemble: policy, thresholds, per-sample scores, and the measured 6/23 clean-prose, 8/30 all-AI detection at 2/116 (1.73%) human false positives that led to gating it off | [`../services/local-engine/research/models/ensemble.json`](../services/local-engine/research/models/ensemble.json) |
| Real-world evaluation, August 2026 | 34 real published samples (30 labelled AI across ChatGPT, GPT-5, Claude, Gemini, Grok and DeepSeek, plus 4 verified pre-2022 human controls) scored by the rule tier; baseline versus post-escalation classification, zero human false positives throughout | [`../research/REAL-WORLD-EVAL-2026-08.md`](../research/REAL-WORLD-EVAL-2026-08.md) |
| Local-model evaluation report | Machine-readable tier 2/3 results on the held-out evaluation set and the 72 reserved corpus-test human texts, with the calibrated operating thresholds | [`../services/local-engine/research/eval/eval-report.json`](../services/local-engine/research/eval/eval-report.json) |
| Clean-prose detection plan | The staged plan for catching clean, well-prompted AI prose: rhythm rules, then the trained local model, with calibration gates at each step | [`../research/CLEAN-PROSE-DETECTION-PLAN.md`](../research/CLEAN-PROSE-DETECTION-PLAN.md) |

## The cycle-2 model, and the research behind it

Everything in this section post-dates the provider-scale evaluation above and supersedes it as an
accuracy authority. The shipped model, the demotion of the writing rules and every figure on the
live page trace to these directories. Twelve research directories were built; all twelve are listed
here, and every path resolves.

| Directory | What it establishes | Headline figures | Path |
|---|---|---|---|
| **signal-science** | Which writing signals actually separate machine from human prose, measured over 122 interpretable features on a 25,723-document corpus (10,890 machine / 14,833 human), plus a causal ablation on the deployed artefact and a transparent 24-feature scorecard fitted against it | Repetition is the dominant signal and machine prose **under**-repeats: adjacent-sentence content-word overlap AUROC 0.912, MATTR 0.911, median machine document repeating 2.1% of content words between neighbouring sentences against a human 6.3%. Sentence-length burstiness, the most-cited AI-detection heuristic, is **worthless at AUROC 0.521**. Cliché "AI vocabulary" is weak at 0.578. Causally, on 400 machine and 400 human long-form documents at the shipped 0.984 threshold against a 90.0% baseline: **making the text repeat itself more costs the model 33.0 points** (90.0% → 57.0%), while **deleting every AI-vocabulary word and phrase costs 0.8** (90.0% → 89.2%). A detector defeated by find-and-replace is not this one | [`../services/local-engine/research/signal-science/SIGNAL-SCIENCE.md`](../services/local-engine/research/signal-science/SIGNAL-SCIENCE.md), [`README.md`](../services/local-engine/research/signal-science/README.md), [`tables/`](../services/local-engine/research/signal-science/tables/), [`results/`](../services/local-engine/research/signal-science/results/) |
| **signal-science — the price of transparency** | What a fully explainable model costs against the neural one, on the same held-out data (793 machine / 4,179 human, unseen by either) | The 24-feature prose-only scorecard reaches **72.1%** detection at a 1% false-positive budget against the neural model's **89.8%**: transparency costs **17.7 percentage points**. Forbidding formatting features *raised* the scorecard from 62.5% to 72.1%, which is the same lesson the rules tier taught. 62% of the neural model's behaviour is reconstructible from named features; only 19% of its within-class confidence is. Modern machine text also has *higher* GPT-2 perplexity than human text (median log-perplexity 3.68 against 3.31), so perplexity-based detection is inverted on this corpus | [`../services/local-engine/research/signal-science/tables/transparent-vs-neural.md`](../services/local-engine/research/signal-science/tables/transparent-vs-neural.md), [`scorecard.md`](../services/local-engine/research/signal-science/tables/scorecard.md), [`famous-heuristics.md`](../services/local-engine/research/signal-science/tables/famous-heuristics.md) |
| **cycle2-train** | The training and evaluation of the shipped detector, on 6,183 held-out rows (1,220 AI, 4,963 human) neither model had seen | AUROC **0.530 → 0.9695**. Detection at a 1% false-positive budget **6.7% → 76.9%**, at 2% **9.1% → 81.2%**. Every long-form category clears the 50% floor at 2%: company updates 100%, marketing 98.0%, stories 88.8%, academic essays 79.4%, blog and articles 77.8%, white papers 57.8%. Median human business-marketing score moved from 0.852 to 0.0347 while median AI blog/article moved from 0.808 to 0.9775, closing the inversion. A topic-level leakage defect in the upstream corpus was found and fixed during training, and the quarantine index of 4,290 rows showed 0 collisions | [`../services/local-engine/research/cycle2-train/CYCLE2-REPORT.md`](../services/local-engine/research/cycle2-train/CYCLE2-REPORT.md), [`eval-results.json`](../services/local-engine/research/cycle2-train/eval-results.json), [`train-report.json`](../services/local-engine/research/cycle2-train/train-report.json), [`dataset-manifest.json`](../services/local-engine/research/cycle2-train/dataset-manifest.json) |
| **cycle3-edited** | A fourth training cycle aimed at lightly-edited AI, built, measured and **not shipped** | It improves AI-rewrites-of-human from 30% to 46–56% and rank correlation with the true AI share from 0.58 to 0.74, but int8 quantisation costs it 5.2 points of recall so it cannot run in the browser at all, stories regress 79.8% → 69.3% and journalism 89.1% → 81.0%. The negative result is published rather than buried. It also corrected an important misunderstanding: the "0% on lightly-edited AI" band was human writing that a model tidied, where a median 93.5% of the words are the author's, and not flagging it is correct behaviour | [`../services/local-engine/research/cycle3-edited/CYCLE3-REPORT.md`](../services/local-engine/research/cycle3-edited/CYCLE3-REPORT.md) |
| **stripped-eval** | Whether the shipped stack was measuring formatting rather than writing, by scoring the 1,896-sample set raw and after markdown normalisation | The rules tier collapses: AUROC 0.9302 → 0.7108, detection **66.7% → 5.5%** (the 66.7% is the superseded provider-eval aggregate, kept here only to show the size of the fall; it must not be quoted as an accuracy figure — see `CAPABILITIES.md` §7.3). The e5-small classifier survives: AUROC 0.9573 → 0.9498. The GPT-2 surprisal head falls to chance at 0.4962 and is, as shipped, worthless. The normaliser was validated first: 32 of 32 unit cases pass, 95.2% of AI words and 99.97% of human words survive it. This is the measurement that established that hand-written style rules detect formatting, not authorship | [`../services/local-engine/research/stripped-eval/STRIPPED-PROSE-EVAL.md`](../services/local-engine/research/stripped-eval/STRIPPED-PROSE-EVAL.md), [`analysis.json`](../services/local-engine/research/stripped-eval/analysis.json), [`operating-curve.json`](../services/local-engine/research/stripped-eval/operating-curve.json) |
| **provider-eval** | Per-provider and per-era behaviour of the pre-cycle-2 stack on 1,896 samples across 7 vendors and 12 slices | Kept for the shape rather than the rates. It refuted "Claude overuses em dashes" in this register (Claude arena median 0 per 1,000 words against openai 2025-26 at 4.537 and human business-marketing at 2.540, so exploiting em dashes carries a direct false-positive cost) and supported "Claude has a distinctive rhythm". It also logged the `split_surrogate` engine defect on 2 of 1,896 emoji-bearing samples, since fixed | [`../services/local-engine/research/provider-eval/PROVIDER-EVAL-2026-08.md`](../services/local-engine/research/provider-eval/PROVIDER-EVAL-2026-08.md) |
| **rule-validation** | Per-rule statistical validation of all 113 weighted writing-signal categories, in raw and markdown-stripped views, changing nothing in the engine | Of the 113: **32 (28%) are dead in both views**, 17 (15%) fire more on humans than on AI, 17 (15%) are statistically supported raw and only 7 (6%) once markdown is stripped, and **96 (85%) are not distinguishable from chance**. The largest single contributor is `markdown-furniture` at −14.24 points of detection raw and exactly 0.00 stripped. Weights were inherited from `avoid-ai-writing` and never fitted. This is the per-rule evidence behind the demotion; the 45.1%/24.8% headline itself was measured on the fresh long-form corpus and is recorded in `../../OBJECTIVE.md` (internal programme record, maintained privately, not in this repository). **§2 of `ACTION-LIST.md` is superseded**: the three "unreachable threshold" rules were measured on chat-reply register and do fire on published prose; the rule that genuinely cannot fire is `tier3-phrase-cluster`. See [`CAPABILITIES.md`](CAPABILITIES.md) §3.4a | [`../services/local-engine/research/rule-validation/RULE-VALIDATION.md`](../services/local-engine/research/rule-validation/RULE-VALIDATION.md), [`ACTION-LIST.md`](../services/local-engine/research/rule-validation/ACTION-LIST.md), [`rule-stats.json`](../services/local-engine/research/rule-validation/rule-stats.json) |
| **longform-corpus** | The fresh held-out corpus behind every figure the live page publishes, built 28 August 2026 and seen by no model during training | **5,558 documents: 4,636 human, 922 AI.** Median 1,092 human words and 1,611 AI words; 82% of humans and 100% of AI are 600 words or more. Human sources: Europe PMC, GOV.UK, CRS, Global Voices, Mongabay, SEC EDGAR, PERSUADE. Registers span academic conclusions, discussions, essays, introductions and literature reviews, company updates, long-form journalism, research summaries, stories, student essays and white papers. The report warns that the register lists deliberately do not line up across the two sides | [`../services/local-engine/research/longform-corpus/REPORT.md`](../services/local-engine/research/longform-corpus/REPORT.md), [`MANIFEST.md`](../services/local-engine/research/longform-corpus/MANIFEST.md), [`README.md`](../services/local-engine/research/longform-corpus/README.md) |
| **generated-corpus** | Opace's own current-model article corpus, generated through OpenRouter on 28 August 2026 and ours to publish | **4,016 usable articles** of 4,050 generated (34 quarantined), 21 models, 10 providers, 3,100,043 words, 19 registers in 5 families, 3 prompt styles, 106 topic prompts. Actual spend $61.70 against a $75 cap. Its governing finding: **the more capable the model, the harder it is to detect** — flash and mini tiers 51.8% against pro and flagship 35.3%, a 16.5-point gap — and the `human-voice` prompt style drove detection to exactly zero on one slice. The `tier3` rule category fired on 0 of 4,016 samples and is genuinely obsolete | [`../services/local-engine/research/generated-corpus/GENERATED-CORPUS-EVAL.md`](../services/local-engine/research/generated-corpus/GENERATED-CORPUS-EVAL.md), [`INDEX.md`](../services/local-engine/research/generated-corpus/INDEX.md), [`manifest.json`](../services/local-engine/research/generated-corpus/manifest.json), [`spend-log.jsonl`](../services/local-engine/research/generated-corpus/spend-log.jsonl) |
| **current-models** | Whether detection had degraded on models newer than the training corpus, using four independently sourced 2025–2026 sets | It had not, materially: chat-reply recall moved about 5 points (62.6% → 57.7% → 57.3%). The real gap is **register, not era**: the same models writing article prose scored 3.8% recall against 5.3% for gpt-3.5-turbo and 0.0% for davinci-002, and human-styled prose scored 0.1%. This is the measurement that redirected cycle 2 onto published-register training data | [`../services/local-engine/research/current-models/CURRENT-MODEL-EVAL.md`](../services/local-engine/research/current-models/CURRENT-MODEL-EVAL.md) |
| **cycle2-corpus** | The 15,514-document training corpus, published register on both sides, with group-aware splits and a quarantine index | **15,514 documents: 5,655 AI, 9,859 human**, licence-recorded, sourced from GRADTEX, HAT-Bench with its edit trajectories, aita, MAGA, C4, PERSUADE 2.0 and Opace's own generated run. Splits are by content hash: 7,856 train, 1,708 calibration, 5,950 test. Its motivating measurement: the same model is flagged 66% of the time writing a chat reply and 4% of the time writing an article. Known gaps are recorded honestly, including only 205 human business reports and machine-assigned, unvalidated genre labels | [`../services/local-engine/research/cycle2-corpus/CORPUS-REPORT.md`](../services/local-engine/research/cycle2-corpus/CORPUS-REPORT.md), [`MANIFEST.md`](../services/local-engine/research/cycle2-corpus/MANIFEST.md), [`README.md`](../services/local-engine/research/cycle2-corpus/README.md) |
| **model-shrink** | Whether the 34.3 MB detector could be made smaller, and what int8 quantisation actually costs. The shrink brief was **stopped on the owner's instruction before any candidate was built**, so no size-against-accuracy table exists | What was measured, on the full fresh long-form corpus (922 AI / 4,636 human): int8 at 34.28 MB reaches AUROC 0.9915 and 88.29% detection at a 1% false-positive budget; fp32 at 133.75 MB reaches 0.9916 and the same 88.29%. Int8 costs five documents in the Python runtime. The real quantisation problem is not size but the median 0.113 disagreement between onnxruntime-web and Python onnxruntime. The directory also holds the FastAPI reference server, which was deployed to Cloud Run and verified on 29 August 2026, and the hosting plan behind it. Note the open parity item: the server runs fp32 while the browser runs int8, and the two runtimes disagree by a median 0.113 | [`../services/local-engine/research/model-shrink/MODEL-SHRINK-REPORT.md`](../services/local-engine/research/model-shrink/MODEL-SHRINK-REPORT.md), [`SERVER-INFERENCE-PLAN.md`](../services/local-engine/research/model-shrink/SERVER-INFERENCE-PLAN.md), [`reference-server/`](../services/local-engine/research/model-shrink/reference-server/) |
| **workbench** | An offline single-file calibration laboratory over the 1,896-sample evaluation corpus: no server, no network, owner-facing only, and it changes nothing in the engine | It exposes all 113 weighted rule categories, of which 73 are trigger lists expanding to 333 individual triggers and 40 are computed measures. It is a testing instrument, not a product surface, and is in no release package | [`../services/local-engine/research/workbench/README.md`](../services/local-engine/research/workbench/README.md), [`workbench.html`](../services/local-engine/research/workbench/workbench.html) |

### Corpus assets used as evidence

| Artefact | Summary | Path |
|---|---|---|
| Human corpus v2 | 4,144 modern human samples with era, genre, difficulty and provenance route, of which 973 are flagged as hard negatives. **Its manifest forbids training use.** The cycle-2 training agent honoured that and held the whole set in test, which is why the cycle-2 false-positive figures are trustworthy rather than flattering | [`../tests/battery/human-corpus-v2.json`](../tests/battery/human-corpus-v2.json) |
| Human corpus v2 documentation | The 973 high-scoring human samples listed with their scores and fired categories, and the finding that 42.7% of genuine human agency copy sat above the pre-cycle-2 flag threshold | [`../tests/battery/HUMAN-CORPUS-V2.md`](../tests/battery/HUMAN-CORPUS-V2.md) |
| The binding objective and its work log | The append-only record of what was measured, when, and what each measurement falsified. It carries the 45.1%/24.8% rules-tier measurement, the revised 0.98 and browser-refitted 0.984 operating points, the deployment record and the cycle-3 rejection | `../../OBJECTIVE.md` (internal programme record, maintained privately, not in this repository) |
| Hosted-inference deployment record | The Google Cloud Run setup: project, region (europe-west1, chosen for data-protection adequacy), image, resource limits, abuse protection and the UK GDPR analysis. **Deployed and verified 29 August 2026** at `https://opace-detector-877422072168.europe-west1.run.app`, revision `opace-detector-00003-bfq`. `/v1/health` 200 reporting `tier3-cycle2`, fp32, build `e313ab00de1fffd2`, `segments-v1`. Not yet wired to the checker. URL and revision change on redeploy | `../../CLOUD-RUN-SETUP.md` (internal programme record, maintained privately, not in this repository) |
| Watermark lab and SynthID-Text | The full record of the watermark work: what SynthID-Text does, what was ported from Google DeepMind's reference implementation and at which commit, the demo keys, the 24 fixtures and 30 tests, the wrong-key collapse (0.6807 under its own key, 0.4987 and 0.4869 under the others), the robustness table including explicit NOT MEASURED rows for paraphrase, translation round-trips and targeted removal, the conflict with the character cleaner over C2PA text credentials, and the claim boundary. Owned by the detection session; written 29 August 2026 | [`WATERMARK-LAB.md`](WATERMARK-LAB.md) |
| Hosted-inference zero-retention audit | The shipped copy tells visitors their drafts are "neither stored nor logged" and invites them to check it. That claim is now backed by a measurement on the happy path. Method, 29 August 2026: a unique high-entropy marker embedded in a document body, submitted to `/v1/check` on the live service through the real gated path (correct `Origin`, browser `User-Agent`, proof-of-work token in `x-opace-token`), confirmed **scored** (`probability_ai: 0.0552`, `retained: "nothing"`) rather than refused at a gate — the step that makes the probe valid — then every log entry in the project searched for the covering window across `textPayload`, `jsonPayload`, `protoPayload` and `httpRequest.requestUrl`. **Zero occurrences**; the whole service produced only 4 log entries. Narrowed, not closed: refusal (413, 429) and error paths run different code and are unprobed. Re-run with a fresh marker after any redeploy | [`../services/local-engine/research/model-shrink/reference-server/SECURITY.md`](../services/local-engine/research/model-shrink/reference-server/SECURITY.md) §9.1, §7.11 |
| Hosted-inference cost controls and kill-switch test record | The £50 ceiling is delivered by a kill switch, not by any Cloud Run setting: `--max-instances` bounds CPU and memory but nothing caps the request count, and a month-long flood costs about £519 at two instances even with every request rejected. Built 29 August 2026 — Pub/Sub topic `detector-killswitch`, Cloud Function `detector-killswitch` (gen2, python312, europe-west1, ACTIVE), a Cloud Monitoring trigger at 10 req/s sustained 5 minutes, and billing budget `ce028788-6be2-45b7-9605-9461b534684a` as a slow backstop. **Two failed test attempts are recorded alongside the passing one**: a POST to an endpoint that wanted a GET, which failed silently for 200 observed seconds, and a 403 from a service account holding `roles/editor` rather than `run.services.setIamPolicy`. Third attempt: health 404 within 10 seconds | [`../services/local-engine/research/model-shrink/reference-server/SECURITY.md`](../services/local-engine/research/model-shrink/reference-server/SECURITY.md) §6.2–6.3, [`security/THREAT-MODEL.md`](security/THREAT-MODEL.md) |
| Hosted-inference service, contract and threat model | The endpoint's own documentation: the segmentation parity contract and its golden cases, every limit with the arithmetic behind it, the API surface (`/v1/challenge`, `/v1/token`, `/v1/check`, `/v1/status`, `/v1/health`), the refusal contract that never dead-ends a user, and the residual risks. Verified live on 29 August 2026: a 1,200-word document returned 4 segments of 340/340/340/180 with `aggregation: "max"`, matching the golden case, and the daily allowance moved 12,000 → 11,996, confirming the cap is counted in inferences rather than requests | [`../services/local-engine/research/model-shrink/reference-server/README.md`](../services/local-engine/research/model-shrink/reference-server/README.md), [`SECURITY.md`](../services/local-engine/research/model-shrink/reference-server/SECURITY.md), [`test_segments.py`](../services/local-engine/research/model-shrink/reference-server/test_segments.py) |

## Calibration corpora

| Artefact | Summary | Path |
|---|---|---|
| Verified-human corpus v1 | 40 verbatim human passages with pre-December-2022 provenance across seven genres, including non-native writers, used as the rhythm-rule and model false-positive control set | [`../tests/battery/human-corpus-v1.json`](../tests/battery/human-corpus-v1.json) |
| Human-corpus documentation | Collection dates, provenance rules, rejected sources, quarantine boundaries and the licence position for the corpus | [`../tests/battery/HUMAN-CORPUS.md`](../tests/battery/HUMAN-CORPUS.md) |
| Training-corpus manifest | Sources, counts, splits, quarantine rule (8-gram containment against the held-out evaluation set) and seed for the local-model training corpus | [`../services/local-engine/research/corpus/manifest.json`](../services/local-engine/research/corpus/manifest.json) |

## Test suites and their documentation

| Artefact | Summary | Path |
|---|---|---|
| Battery README | What each battery suite proves, and the standing rule that every new capability lands with a battery extension | [`../tests/battery/README.md`](../tests/battery/README.md) |
| Test evidence register | Methodology and evidence classes for every gate from G1 onwards, with frozen hashes | [`TEST-EVIDENCE.md`](TEST-EVIDENCE.md) |
| Browser runtime specification | The in-browser ONNX runtime contract for the local model: files, sizes, threading, consent and cache behaviour | [`../services/local-engine/research/BROWSER-RUNTIME-SPEC.md`](../services/local-engine/research/BROWSER-RUNTIME-SPEC.md) |
| Local-engine research README | Layout and reproduction instructions for the tier 2 surprisal features and tier 3 classifier training | [`../services/local-engine/research/README.md`](../services/local-engine/research/README.md) |

## Research inputs to the rule packs

| Artefact | Summary | Path |
|---|---|---|
| AI-tells mega pack | 259 raw tells consolidated to 114 merged tells with tiers, kinds and licensing map; source of the v3 artefact-forensics category | [`../research/AI-TELLS-MEGA-PACK.md`](../research/AI-TELLS-MEGA-PACK.md) |
| Owner-docs tells | Lexical, phrase, structural and stylometric tells mined from seven internal Opace writing-guideline documents | [`../research/OWNER-DOCS-TELLS.md`](../research/OWNER-DOCS-TELLS.md) |
| Owner rhythm notes | The owner's cadence observations (punchline fragments, mic-drop paragraphs, contrast density) behind the v4 rhythm rules | [`../research/OWNER-RHYTHM-NOTES.md`](../research/OWNER-RHYTHM-NOTES.md) |
| SynthID and Originality deep dive | Competitor analysis and the SynthID-Text detection specification that grounds the watermark lab | [`../research/SYNTHID-AND-ORIGINALITY-DEEP-DIVE.md`](../research/SYNTHID-AND-ORIGINALITY-DEEP-DIVE.md) |

## Build history

| Artefact | Summary | Path |
|---|---|---|
| v0.2 build log | The canonical dated record of every capability release, deployment, live verification and test total from v0.2 onwards | internal programme record (maintained privately, not in this repository) |

If a claim in the README, the [capability register](CAPABILITIES.md) or any listing copy cannot be traced to a row in this index, treat the claim as unverified and raise it before publication.
