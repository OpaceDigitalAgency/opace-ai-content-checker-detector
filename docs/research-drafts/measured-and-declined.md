# Four things we built, measured, and did not ship

**Draft for publication. Written 30 August 2026. No measurement was run to produce it; every
figure is quoted from a measurement record named at the point of use.**

Proposed URL: `/tools/ai/content-verification-integrity/research/measured-and-declined/`

---

## The finding

Several capabilities that competing tools offer were implemented here, measured properly, and
rejected on the numbers. A 194 MB surprisal model that scored backwards on the models people
actually use. The whole published family of zero-shot detectors, reimplemented and found
unoperable at a defensible false-positive budget. Per-sentence highlighting, the most requested
feature in the category. And a retrained classifier that fixed the defect it was aimed at and was
rejected anyway.

Each of these has its measurement below, including the ones where the declined capability turned
out to be better than the thing that shipped on one axis.

---

## 1. The GPT-2 surprisal tier, and why it was retired rather than deferred

The second tier of the original stack was a 124M-parameter GPT-2 observer with a 22-coefficient
logistic head over surprisal statistics. It read how *surprised* a small language model was by each
token, and turned the shape of that surprise into a probability. It was gated off and its download
was never shipped.

**Provenance.** 1,896-sample provider-eval set: 1,727 AI documents across 12 provider-and-era
slices, 169 held-out human documents. Every document scored twice, once as a raw chat export and
once after markdown normalisation. Source: `services/local-engine/research/stripped-eval/STRIPPED-PROSE-EVAL.md`
§0, §2.3. AUROC is threshold-free, so no operating point applies to these three rows.

| tier | download | AUROC, raw | AUROC, markdown stripped |
|---|---|---|---|
| writing rules (`en-signals:2026.08.6`) | 0 MB | 0.9302 | **0.7108** (superseded aggregate, 66.7% → 5.5% detection) |
| tier-3 classifier (e5-small int8) | 34 MB | 0.9573 | **0.9498** |
| tier-2 GPT-2 surprisal head | 194 MB | 0.7050 | **0.4962** |

0.4962 is chance. Worse, the per-slice pattern shows it is not merely weak but pointed the wrong
way on the models that matter: anthropic 2024-25 **0.1579**, deepseek 2025-26 **0.1612**, openai
2025-26 **0.1944**, anthropic 2025-26 **0.3218**. Its one strong slice is openai 2022-23 at
**0.9425**, and that is the whole explanation. The head was fitted on 330 AI documents, of which
120 were HC3 GPT-3.5 text and 60 were GPT-2 continuations generated locally. It is a GPT-2 and
GPT-3.5 detector. Run against 2026 models it scores backwards, and a detector that scores backwards
is worse than no detector.

One figure from that table needs reporting and then setting aside. The tier scores AUROC 0.7738 on
an aggressive list-flattening variant, better than on raw text. That variant inserts a full stop at
the end of every unterminated line, AI text has far more such lines than human text, and the tier
reads punctuation-sensitive surprisal. The score is measuring the transformation, not the writing.

### What it scored before it was retired, and why that is not a performance claim

`services/local-engine/research/models/ensemble.json` records the ensemble that gated the tier off:
flag if the surprisal probability reaches 0.76 **or** the classifier probability reaches 0.857.
Against the cycle-1 classifier alone it lifted a small evaluation from 2/23 to **6/23** on clean
prose and 2/30 to **8/30** on all-AI samples, at a cost of **2 of 116** human false positives
(1.73%), and it raised the one-off consent download from 34.5 MB to **238.8 MB**
(`docs/CAPABILITIES.md` §4.3).

Those denominators are 23 and 30 documents. The operating point is the retired 0.76 / 0.857 pair on
the retired cycle-1 classifier, and neither the runtime nor the corpus name is recorded in the
file. They belong on this page as the reason the tier was gated, and nowhere as a performance
claim. The stripped-prose AUROC of 0.4962 is what turned a deferral into a retirement.

The tier is off in source: `src/lib/local-signals/model-store.ts` sets `TIER2_ENABLED = false`, so
no GPT-2 file is fetched, hashed or cached by any visitor.

### The part that makes this honest rather than triumphant

The same report insists that the surprisal *features* separate the classes strongly even though the
head built from them is at chance. On stripped prose, `div_skew` reaches Cliff's δ = 0.770 and
`div_kurt` δ = 0.761, second and third behind the classifier itself. Refitted, the 22 features
reach cross-validated TPR **78.4% ±0.8** at a 3% training-fold budget, realised held-out false
positives 5.1%, and they produce **0 of 10** business-marketing false positives where the
classifier produces 41–66% at comparable budgets.

The features work. The weights are stale. **The refit was never done**, and the honest statement is
that the tier was retired on the evidence available rather than that surprisal is worthless. The
zero-business-marketing figure rests on ten documents with a Wilson upper bound of 26%, so it is
suggestive and nothing more.

---

## 2. The published zero-shot family, reimplemented and measured

Perplexity, GLTR, DetectGPT's log-rank baseline, Fast-DetectGPT, DivEye's surprisal-diversity
moments: the standard published methods for detecting machine text without a trained classifier.
All were implemented and run on this project's own corpus rather than cited from their papers.

**Provenance.** 600 machine and 600 human fresh long-form documents. Observer model GPT-2 small
(124M), int8 with an fp16 language-model head, 512-token cap. One forward pass per document yields
every statistic. Source: `services/local-engine/research/signal-science/SIGNAL-SCIENCE.md` §5.1.
AUROC is threshold-free; the detection column is at a 1% false-positive budget.

| method | AUROC | detection at a 1% false-positive budget |
|---|---|---|
| DivEye-inspired: surprisal kurtosis | 0.766 | 10.3% |
| DivEye-inspired: surprisal skew | 0.763 | 0.0% |
| DivEye-inspired: surprisal autocorrelation | 0.757 | 4.5% |
| mean predictive entropy | 0.746 | 0.0% |
| GLTR, share of tokens in the observer's top 100 | 0.735 | 0.0% |
| mean log rank (DetectGPT baseline) | 0.728 | 0.0% |
| log perplexity, the classic baseline | 0.715 | 0.0% |
| Fast-DetectGPT curvature | 0.545 | 14.8% |
| degenerate self-Binoculars | 0.502 | 0.0% |

The gap between the two columns is the argument. These methods separate the two populations on
average and cannot be operated at a threshold a responsible tool could ship. Their machine and
human distributions overlap so heavily that the top human percentile sits above almost the entire
machine distribution.

Two of the rows carry corrections that are more interesting than the ranking.

**The founding assumption of the whole family is inverted for 2026 models.** Machine text has
*higher* GPT-2 perplexity than human text here: median log-perplexity **3.68** for machine
documents against **3.31** for human ones, holding in every register measured. The family was built
on the idea that machine text is what a language model finds predictable. Against a 2019 observer,
2026 models write with vocabulary and phrasing that GPT-2 finds less expected than human web prose.

**DivEye's central claim survives.** Its argument is that the diversity of the surprisal sequence
separates the classes better than its mean. Measured here, the diversity moments (kurtosis 0.766,
skew 0.763, autocorrelation 0.757) beat mean log perplexity (0.715) and beat every GLTR bucket.
That is a 2026 confirmation of a claim its authors could not have tested on 2026 models, on data
they have never seen.

---

## 3. Per-sentence highlighting

Highlighting the machine-written sentences is the single most requested feature in this category
and several products offer it. This tool does not, and the reason is a measurement.

**Provenance.** Every sentence deleted in turn from 57 documents and the document re-scored:
**2,174 deletions**, each one a measurement of what that sentence contributed. Sources:
`docs/MEASURED-FINDINGS.md` §3 and `SIGNAL-SCIENCE.md` §4.2, raw values in
`signal-science/results/model-probe.json`.

| | |
|---|---|
| sentences that push their document towards "machine" | **35.9%** |
| share of total absolute attribution carried by the top fifth of sentences | 51.8% |
| correlation between a sentence's position and its attribution | +0.027 |
| strongest correlation between any single property of a sentence and its attribution | ρ = 0.125 |

Barely a third of sentences push their document towards a machine reading. Evidence is somewhat
concentrated, with the top fifth carrying about half of it, but not in one or two giveaway lines.
Position tells you nothing, so the model is not simply reading the opening. And nothing about a
sentence in isolation predicts its contribution: the best single predictor manages ρ = 0.125.

Sentence-level attribution inside a 512-token transformer is unstable by construction, because
deleting a sentence changes the context of every sentence around it. A per-sentence highlight would
present that instability as evidence, against a named person's writing. The tool can say what kinds
of document score high. It cannot reliably say which sentence did it.

---

## 4. Two retrains rejected

**Cycle 3** was aimed at short text and lexical repetition, and it fixed both. At matched false
positives against the shipped model: 100-word detection **11/57 → 33/57**, 300-word 44/61 → 57/61,
and detection on samples of 300 words or more in the 0.42–0.55 type-token-ratio band
**163/280 → 256/280**.

It was rejected on two rows. Long-form detection fell **883/922 → 863/922**, McNemar p = 0.00018.
Human fiction false positives rose **23/260 → 29/260**, and fiction had been named in the brief as
a register that must not get worse. Source: `docs/measurements/TWO-AXIS-RETRAIN.md` §1.

**Cycle 4b** was trained on a fuller corpus, including 177 long documents reaching 6,618 words
against a corpus that previously topped out at 3,061. It is better than the shipped model on
long-form detection (902/922 against 883/922) and matches the best fiction result available. It was
rejected on one row: **100-word detection 2/57 = 3.5%**, worse than the shipped model's
11/57 = 19.3%. Adding long documents moved the weighted mass away from the short band far enough to
undo the gain that the whole exercise existed to produce. Source: `TWO-AXIS-RETRAIN.md` §13.

Cycle 3's and cycle 4b's figures are at each model's own refitted operating point. **The shipped
pair cannot be carried across a retrain**, because the fitted temperature changes with the model:
cycle 2 runs at 0.8324, cycle 3 at 1.2095, cycle 4b at 2.0325. Comparing two models at one number
would be comparing a rule change with a calibration change.

---

## What this does not prove

- **Fast-DetectGPT's 0.545 is a floor for the method, not a refutation of it.** The paper uses far
  larger scoring models and its January 2026 update uses a Llama-3-8B pair; GPT-2 small is the
  weakest possible observer. The publishable claim is narrow: the browser-deployable version is not
  viable.
- **Binoculars was not implemented.** It requires two different models, an observer and a
  performer, and only one language model is available offline here. With the same model in both
  roles the ratio degenerates, which is what `self_binoculars` measures at AUROC 0.502. That number
  must never be quoted as Binoculars' score. Its published 79% at a 5% false-positive rate stands
  unchallenged by anything here.
- **The surprisal strand rests on 169 human documents**, a corpus this project's own records
  identify as having caused three retracted claims. It is 76% encyclopaedic and question-and-answer
  text, which contributes almost no false positives at any threshold and dilutes every rate
  measured against it. The direction of the tier-2 result is not in doubt; its precision is.
- **The sentence-occlusion strand rests on 57 documents.** Enough to rule out a clean per-sentence
  signal, not enough to characterise the distribution of attribution.
- **The retrain figures are not comparable to the shipped operating point.** See above.
- **SynthID could not be tested at all**, and saying so is the finding. It is a generation-time
  watermark: none of this corpus was generated with it enabled and there is no detector key. A
  post-hoc text detector cannot evaluate it.

---

## Charts this page needs

All new. None of the eight existing SVGs covers this material.

**1. The zero-shot family, AUROC against operable detection.** Grouped horizontal bars, one pair per
method, with a chance line at AUROC 0.500. Series one is AUROC; series two is detection at a 1%
false-positive budget on the same axis rescaled 0–1. The visible gap between the two series is the
argument.

- kurtosis 0.766 / 10.3%, skew 0.763 / 0.0%, autocorrelation 0.757 / 4.5%, mean predictive entropy
  0.746 / 0.0%, GLTR top-100 0.735 / 0.0%, mean log rank 0.728 / 0.0%, log perplexity 0.715 / 0.0%,
  Fast-DetectGPT 0.545 / 14.8%, self-Binoculars 0.502 / 0.0%.
- Caption: 600 machine and 600 human fresh long-form documents, GPT-2 small (124M) int8 observer,
  512-token cap. Threshold-free for AUROC; the detection series is at a 1% false-positive budget.
- Source: `SIGNAL-SCIENCE.md` §5.1.

**2. Raw against markdown-stripped AUROC, three tiers.** Slope chart, two points per tier.

- rules 0.9302 → 0.7108; tier-3 classifier 0.9573 → 0.9498; tier-2 surprisal head 0.7050 → 0.4962,
  with a chance line at 0.500.
- Caption: 1,896-sample provider-eval set, 1,727 AI across 12 provider-and-era slices, 169 human.
- Source: `STRIPPED-PROSE-EVAL.md` §0.

**3. Optional: the tier-2 inversion, per slice.** Horizontal bars of tier-2 stripped AUROC by
provider-and-era slice with the chance line marked, ordered ascending, n = 150 per slice except
openai 2024-25 (n = 77).

- anthropic 2024-25 0.1579, deepseek 2025-26 0.1612, openai 2025-26 0.1944, anthropic 2025-26
  0.3218, mistral 0.3225, google 2025-26 0.4954, grok 0.5413, google 2024-25 0.6568, openai
  2024-25 0.6794, meta 2025-26 0.6954, meta 2024-25 0.8756, openai 2022-23 0.9425.
- Source: `STRIPPED-PROSE-EVAL.md` §2.3.

---

## Rewrite liabilities (not body copy)

- **cycle-4a must not appear on this page as a rejection.** It is measured, it clears every bar the
  brief set, and it is pending on one gate: the int8 quantisation verdict-flip rate reads 0.01204
  against the project's own 0.01 limit. If it ships, this page gains cycle 4b as its second
  rejection and must not be edited to imply cycle 4a was ever one.
- If the **tier-2 refit** is ever performed, §1's closing paragraph becomes wrong rather than
  incomplete, and the "declined" framing for that strand needs rewriting rather than updating.
- The `en-signals` rule-pack AUROC figures are tied to pack version `2026.08.6`. A pack bump
  invalidates them.
