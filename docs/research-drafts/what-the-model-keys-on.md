# What the model keys on

**Draft for build. Body copy begins at "The finding". Everything under "Notes for the builder" is
production instruction and must not be published.**

| | |
|---|---|
| Proposed URL | `/tools/ai/content-verification-integrity/research/what-the-model-keys-on/` |
| Working title | Repetition is the axis: what moves the score, and the keyword cliff that lands on our own customers |
| Draft status | figures re-verified against source 30 August 2026; see the provenance table at the foot |
| Primary sources | `services/local-engine/research/signal-science/SIGNAL-SCIENCE.md` §2, §4.1, §4.3; `docs/measurements/SHORT-FORM-RETRAIN.md` §10; `docs/measurements/DETECTION-BY-LENGTH-AND-MODEL.md` Table 1 |

---

## The finding

Machine prose repeats itself **less** than human prose. The median machine document shares 2.1% of
its content words with the neighbouring sentence; the median human document shares 6.3%. That single
property, read through several instruments, is what the detector keys on. Deleting every word on the
"AI vocabulary" list from a machine document costs the detector 0.8 percentage points. Making the
same document repeat itself more costs it 33.

The commercial consequence is awkward and belongs on the page rather than in a footnote. Deliberately
keyword-dense copy is the condition the detector handles worst. At the shipped operating point it
flags **188 of 432** such documents, **43.5%**, against 566 of 816 ordinary short-form documents at
69.4% and 883 of 922 long-form documents at 95.8%.

## Three lines of evidence, at three different operating points

This page reconciles measurements taken at three points in the project's history, and the honest way
to present them is to label each one rather than to average them into a single narrative.

| line | what it is | corpus | runtime | operating point |
|---|---|---|---|---|
| descriptive | 122 interpretable features over labelled documents | 670 fresh long-form pairs, drawn from a 25,723-document study corpus | none — these are feature statistics, computed without a model | **none applies** |
| causal | one-at-a-time alterations re-scored through the deployed artefact | 400 machine and 400 human long-form documents | fp32, deployed artefact | **0.984 single threshold — retired** |
| observational | detection binned by achieved type-token ratio | 432 generated samples, two models, lengths held constant | fp32 server | **0.9845 maximum-only — retired** |
| shipped | the keyword-repetition arm re-scored at the pair that runs today | 432 machine documents | Python `onnxruntime` 1.29.0, CPU, fp32, `segments-v3` | **0.9855 / 0.9763**, T = 0.8324 |

The retired points are quoted because the experiments were run there and have not been repeated. A
figure taken at 0.984 or at 0.9845 is not a description of the tool as it runs today, and each is
labelled at the point of use below. Only the last row describes current behaviour.

## The property itself

On 670 register-matched fresh long-form pairs, eight of the ten strongest interpretable signals
measure one behaviour.

| signal | AUROC | detection at a 1% human false-positive budget | median machine | median human |
|---|---:|---:|---:|---:|
| content-word overlap between neighbouring sentences | 0.912 | 23.1% | 0.021 | 0.063 |
| vocabulary variety in a 100-word window (MATTR) | **0.911** | **47.3%** | 0.776 | 0.694 |
| type-token ratio, first 400 words | 0.876 | 17.0% | 0.595 | 0.503 |
| distinct word triples / word triples | 0.839 | 16.4% | 0.979 | 0.938 |
| distinct word pairs / word pairs | 0.830 | 19.7% | 0.878 | 0.797 |
| word-unigram entropy | 0.788 | 11.8% | 8.28 | 7.78 |
| share of vocabulary used exactly once | 0.782 | 3.9% | 0.675 | 0.618 |

Source: `SIGNAL-SCIENCE.md` §2. No operating point applies: these are feature statistics over a
corpus, not detector outputs, and the detection column is single-feature detection at a fixed
false-positive budget rather than anything the product does.

A person introduces a term and keeps using it. A model introduces a term and reaches for a synonym,
a pronoun, a rephrasing. That produces wider vocabulary per unit length and less overlap between
neighbouring sentences, which is the same behaviour observed six ways. It also inverts the popular
belief. Machine writing is widely called repetitive; on published long-form prose the opposite is
measurably true, and what people are noticing when they call it repetitive is structural sameness,
parallel paragraph shapes and similar sentence openings, which is not lexical repetition.

## The causal test

400 machine and 400 human long-form documents were each altered one way at a time and re-scored
through the deployed artefact. **Measured at the retired 0.984 single threshold**, so the absolute
rates below describe a configuration that no longer runs; the deltas are the point.

| change applied | machine flagged | change | human false positives |
|---|---:|---:|---:|
| *(unaltered)* | 90.0% | — | 2.25% |
| lowercase everything | 90.0% | 0.0 pp | 2.25% |
| delete every "AI vocabulary" word and phrase | **89.2%** | **−0.8 pp** | 1.50% |
| drop the first paragraph | 89.0% | −1.0 pp | 1.75% |
| shuffle the paragraphs | 87.0% | −3.0 pp | 1.75% |
| strip all markdown | 85.2% | −4.8 pp | 2.00% |
| shuffle the sentences | 85.0% | −5.0 pp | 1.50% |
| normalise all punctuation | 85.0% | −5.0 pp | 2.25% |
| strip markdown **and** normalise punctuation | 73.2% | −16.8 pp | 2.50% |
| truncate to 200 words | 59.8% | −30.2 pp | 0.75% |
| **make the text repeat itself more** | **57.0%** | **−33.0 pp** | 0.25% |
| flatten the rhythm (split every sentence at its commas) | 46.8% | −43.2 pp | 0.00% |
| **truncate to 100 words** | **8.5%** | **−81.5 pp** | 0.00% |

Source: `SIGNAL-SCIENCE.md` §4.1.

The keyword list is not what the model is reading. Removing every one of those words and phrases
costs 0.8 points, which means a detector that could be beaten by find-and-replace is a different
detector from this one.

Replacing a quarter of content words with the document's own most frequent content words changes
nothing about length, sentence structure or function words. It only makes the text repeat itself
more, and it drops detection by 33 points. That is the manipulation aimed directly at the
descriptive finding above, and the two lines agree.

The human column matters as much as the machine one. Under the repetition manipulation human false
positives fall from 2.25% to 0.25%, and under truncation to 0.00%. The model goes quiet rather than
reckless.

## The cliff

Repetition was then tested deliberately rather than observed. 432 generated samples, two models
balanced, lengths held identical to an existing pilot so that repetition was the only variable, with
one instruction style in two strengths telling the model to repeat an exact keyword phrase and keep
a narrow vocabulary. That is ordinary search-optimisation practice rather than an evasion technique.
**Measured at the retired 0.9845 maximum-only threshold.**

Pooling every condition and binning by *achieved* type-token ratio, at 400 and 600 words only so
that length is held to the long bands:

| type-token ratio | n | detected | rate |
|---|---:|---:|---:|
| 0.65–1.00 | 89 | 77 | 86.5% |
| 0.60–0.65 | 148 | 129 | 87.2% |
| 0.55–0.60 | 168 | 148 | 88.1% |
| 0.50–0.55 | 112 | 89 | 79.5% |
| 0.46–0.50 | 33 | 19 | 57.6% |
| 0.42–0.46 | 44 | 7 | **15.9%** |
| 0.00–0.42 | 49 | 10 | **20.4%** |

Source: `SHORT-FORM-RETRAIN.md` §10.3.

Detection is flat at 86–88% all the way down to 0.55, then falls away. The knee is **bracketed
between 0.55 and 0.46 and not located**: the 0.46–0.50 bin holds 33 documents, which is barely above
the floor this project applies, and one bin cannot pin a threshold. Below 0.46 the model is
effectively blind.

## The correction the source made to itself

An earlier write-up of this work claimed that routine keyword repetition pushes machine text onto
the human side. That claim is recorded as overstated, and the correction is worth more than the
original claim.

At *routine* doses it does not happen. The moderate instruction strength, which produced genuinely
realistic keyword-optimised copy, came in at **146/209 = 69.9%** against a baseline of **582/816 =
71.3%**, confidence intervals overlapping ([63.3, 75.7] against [68.1, 74.3]), with only one of four
length bands reaching p < 0.05. The heavy condition reached 31/194 = 16.0%, and getting there took
an instruction to repeat a phrase 17 to 25 times in 400 to 600 words, which degraded the output
badly enough that 19% of generations came back empty or too short to keep, against 13% in the
moderate condition. It is an adversarial condition, not a sample of ordinary copy.

The narrower statement that survives: detection is unaffected by keyword repetition until type-token
ratio falls below roughly 0.55, and collapses below roughly 0.46. Source: `SHORT-FORM-RETRAIN.md`
§10.2 and §10.4.

Two things stop that being reassuring. Type-token ratio falls with length on its own, and the
baseline 600-word median is already **0.568**, just above the knee, so longer commercial copy drifts
towards the cliff without anyone trying. And at the ratio a real keyword-briefed article occupies,
the effect is measurable: pooled at 400 and 600 words in the 0.48–0.55 band, **103/136 = 75.7%**
against a matched-length baseline of **363/415 = 87.5%**, z = −3.29, **p = 0.001**
(`SHORT-FORM-RETRAIN.md` §10.4).

## At the operating point that ships

The whole keyword-repetition arm was re-scored at the shipped pair. Detector
`tier3-cycle2-e5small-fp32.onnx`, SHA-256 `e313ab00de1fffd2…4d2788d`; flagged when the strongest
section reaches 0.9855 or the second-strongest reaches 0.9763, at T = 0.8324; `segments-v3`; Python
`onnxruntime` 1.29.0, CPU, fp32; measured 30 August 2026.

| words | machine flagged | detection rate [95% CI] |
|---|---:|---|
| under 100 | 2/16 | n below 30, no rate quoted |
| 100–199 | 8/57 | 14.0% [7.3–25.3] |
| 200–299 | 3/9 | n below 30, no rate quoted |
| 300–399 | 61/136 | 44.9% [36.7–53.2] |
| 400–599 | 58/124 | 46.8% [38.2–55.5] |
| 600–849 | 56/90 | 62.2% [51.9–71.5] |
| **all lengths** | **188/432** | **43.5% [38.9–48.2]** |

Source: `DETECTION-BY-LENGTH-AND-MODEL.md`, the keyword-repetition arm, fenced separately from
ordinary short text in that file for the same reason it is fenced here.

Set that against the same detector at the same operating point on other corpora: ordinary short-form
566/816 = 69.4%, long-form 883/922 = 95.8%. The length gradient survives the condition, rising from
14.0% at 100–199 words to 62.2% at 600–849, and every band sits well below its ordinary-text
counterpart. Model makes no material difference: `gpt-5.6-sol` 88/199 = 44.2% [37.5–51.2],
`gpt-5.6-luna` 100/233 = 42.9% [36.7–49.3].

**There is no matched human keyword-repetition corpus.** The human side of this axis has never been
generated, so the table above reports machine detection under the condition and says nothing at all
about false positives under it. That is a gap, not an omission.

## Which human writers are at risk

The same probe run from the other direction gives the answer for the human population. Correlating
the deployed model's raw margin against each interpretable feature *within* human documents only, so
the result is not simply restating the label (4,184 documents):

| feature | Spearman ρ |
|---|---:|
| discourse markers | +0.368 |
| short words | −0.362 |
| mean word length | +0.359 |
| long words | +0.300 |
| burstiness of sentence length | −0.264 |

Source: `SIGNAL-SCIENCE.md` §4.3.

That column describes formal, long-worded, evenly paced prose that signposts itself: academic and
corporate writing. It matches the measured fact that academic discussion carries the second-highest
human false-positive rate of any content type at the shipped pair, 8/420 = 1.9%, behind fiction at
23/260 = 8.8% (`DETECTION-BY-LENGTH-AND-MODEL.md` Table 3).

## What this does not prove

Ablation shows sensitivity, not mechanism. A large score shift proves the model responds to the
property that was manipulated; it does not prove that property is the model's reason. Flattening the
rhythm is the clearest case: it moves the score furthest at −43.2 points, and it also produces text
unlike anything in any training distribution, so the shift may be a distribution-shift artefact
rather than evidence about rhythm. The source declines to draw the obvious conclusion from it and so
does this page.

The repetition arm used two models, both from one provider, and was not tested across providers. The
descriptive finding underneath it is weakest on Meta's models (MATTR 0.562, adjacent-sentence
cohesion 0.561) and only moderate on Nvidia's (0.633 and 0.694), and weakest by register on creative
writing (0.668) and social posts (0.658).

Every figure on this page is fp32 through Python `onnxruntime`. The browser runs int8 through
`onnxruntime-web`, and the repetition findings have not been confirmed there.

The keyword-repetition corpus is a generated adversarial condition. Its absolute rates describe
documents written to an instruction to repeat a phrase, not a sample of published commercial copy,
and the two should not be conflated even though the second drifts towards the first as it gets
longer.

## What follows commercially

The tool degrades on precisely the kind of copy its commercial users produce on purpose, once that
copy is long enough and keyword-focused enough to push type-token ratio below about 0.55. That
weakness is published here with its denominator rather than buried, under the same rule that governs
every other weakness in this project. It will also be shared by competitors, because it follows from
the signal the whole field relies on rather than from anything specific to this implementation.

## Provenance

| figure | file | section |
|---|---|---|
| 2.1% vs 6.3% adjacent-sentence overlap; MATTR 0.911 / 47.3%; the seven-signal table | `services/local-engine/research/signal-science/SIGNAL-SCIENCE.md` | §2 |
| ablation table, 400 + 400, at 0.984 | `SIGNAL-SCIENCE.md` | §4.1 |
| within-human correlations, n = 4,184 | `SIGNAL-SCIENCE.md` | §4.3 |
| Meta 0.562 / 0.561, Nvidia 0.633 / 0.694, creative 0.668, social 0.658 | `SIGNAL-SCIENCE.md` | §2.3, §2.5 |
| TTR bins at 0.9845; 69.9% vs 71.3%; 103/136 vs 363/415, p = 0.001; 0.568 median; 19% unusable; two-model limit | `docs/measurements/SHORT-FORM-RETRAIN.md` | §10.2, §10.3, §10.4, §10.5, §10.8 |
| 188/432 = 43.5% and every band, at 0.9855 / 0.9763; 566/816; 883/922; per-model 88/199 and 100/233 | `docs/measurements/DETECTION-BY-LENGTH-AND-MODEL.md` | Table 1 keyword-repetition arm, Table 2 short-form |
| academic discussion 8/420, fiction 23/260, at the shipped pair | `docs/measurements/DETECTION-BY-LENGTH-AND-MODEL.md` | Table 3 |

---

# Notes for the builder — not body copy

## Charts

All new. None of the eight SVGs in `docs/assets/charts/` covers this page; only
`segmentation-token-coverage.svg` (needing a `segments-v2` → `segments-v3` relabel) and
`watermark-key-collapse.svg` are current for any purpose.

**Chart 1 — the ablation tornado. The most legible image available anywhere in this project.**
Horizontal bars, one per manipulation, X axis: change in detection rate in percentage points, from
−85 to +5, with a rule at 0. Y axis sorted by magnitude. Values from `SIGNAL-SCIENCE.md` §4.1:
lowercase 0.0; truncate to 400 words −0.2; delete all "AI vocabulary" −0.8; drop first paragraph
−1.0; shuffle paragraphs −3.0; strip markdown −4.8; shuffle sentences −5.0; normalise punctuation
−5.0; decrease repetition further −6.8; strip markdown and normalise punctuation −16.8; truncate to
200 words −30.2; make the text repeat itself more −33.0; flatten the rhythm −43.2; truncate to 100
words −81.5.

Colour the two truncation bars and the flatten-rhythm bar differently from the rest, and caption
them: truncation destroys the text, and flattening the rhythm produces text unlike any training
distribution, so those three are not comparable with the content manipulations beside them. The
caption must carry: 400 machine and 400 human long-form documents, unaltered baseline 90.0% flagged,
**measured at the retired 0.984 single threshold, not at the shipped pair.**

Consider a paired sparkline of the human false-positive column beside it (2.25% baseline, 0.25%
under added repetition, 0.00% under truncation to 100 words), which is what stops the chart reading
as a list of ways to beat the tool.

**Chart 2 — the type-token-ratio cliff.**
Step chart, not a smooth line. X axis: achieved type-token ratio bin, left to right from 0.00–0.42
up to 0.65–1.00 so that the collapse reads left. Y axis: detection rate, 0–100%. Print n on every
step: 49, 44, 33, 112, 168, 148, 89. Values 20.4%, 15.9%, 57.6%, 79.5%, 88.1%, 87.2%, 86.5%. Wilson
intervals on every bin.

Bracket the knee as a shaded band spanning 0.46 to 0.55 labelled "the knee is bracketed here, not
located — the 0.46–0.50 bin holds 33 documents". Mark the baseline 600-word median at 0.568 with a
labelled tick. Caption: 400 and 600 words only, two OpenAI models, **measured at the retired 0.9845
maximum-only threshold**.

**Chart 3 — the shipped-pair comparison, three corpora side by side.**
Simple bar chart, three bars with denominators printed on them: keyword-repetition arm 188/432 =
43.5%; ordinary short-form 566/816 = 69.4%; long-form 883/922 = 95.8%. Wilson intervals. Caption
must carry the full shipped operating point, the detector SHA, fp32 Python `onnxruntime` 1.29.0, and
30 August 2026, and must say that the three corpora differ in length distribution as well as in
condition, so the bars are not a clean single-variable comparison.

## Do not print

- Any figure at 0.984, 0.9845, 0.980, 0.8533 or 0.857 under a heading that reads as current. Both
  retired points on this page are labelled inline and in the conditions table; keep those labels in
  the built page and in every chart caption.
- A false-positive rate for the keyword-repetition condition. None exists; there is no matched human
  corpus.
- A located knee. It is bracketed between 0.55 and 0.46.
- Any browser figure.

## Rewrite liability — cycle 4a

**High, and it inverts the page's commercial framing.** A retrain, cycle 4a, is measured and **not
shipped**, and nothing about it may appear here as current behaviour. It runs at a refitted pair of
0.959674 / 0.950715 with a temperature of 1.7298, and it removes the repetition cliff: on short-form
machine text of 300 words and above, binned by achieved type-token ratio, the below-0.42 bin goes
from 16/58 detected by the shipped model to 57/58 by cycle 4a, and the 0.42–0.46 bin from 23/70 to
69/70 (`docs/measurements/TWO-AXIS-RETRAIN.md` §12.3). One gate blocks it, the int8 quantisation gate, which
fails at a verdict-flip rate of 0.01204 against this project's own 0.01 limit.

If it ships, the cliff becomes a historical finding about the retired shipped model rather than a
current weakness, the "what follows commercially" section has to be rewritten rather than trimmed,
and a new weakness has to be published in its place: company updates go from 1/662 to 10/662, a
tenfold rise (§12.4). Every operating point on this page also changes, because the fitted
temperature is model-specific and cannot be carried across a retrain.

Build the operating point, the detector SHA and the measurement date as one shared component per
page rather than retyping them into prose.
