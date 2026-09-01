# A long document is many readings: why the verdict is the strongest section and never the average

**Draft for publication. Written 30 August 2026. No measurement was run to produce it; every
figure is quoted from a measurement record named at the point of use.**

Proposed URL: `/tools/ai/content-verification-integrity/research/how-the-verdict-is-combined/`

---

## The finding

A document longer than the classifier's input window is cut into sections and each section is
scored on its own. The verdict is then decided by the strongest section, and by a second, lower
bar that two agreeing sections can clear. It is never the average.

Averaging is the intuitive rule and it is close to useless. On 700 purpose-built documents that
are half machine-written and half human-written, taking the document mean catches
**29 of 700 (4.14%)**. Taking the maximum catches **638 of 700 (91.14%)**. Both rules were tuned
to spend the same human false-positive budget on the same corpus, so this is a comparison of
combining rules and not of thresholds.

That is the single most consequential design decision in the tool. A machine-written passage
inside a human document is exactly the case people are worried about, and the averaging rule
misses it twenty-two times out of twenty-three.

---

## Provenance

| | |
|---|---|
| Detector | `tier3-cycle2-e5small-fp32.onnx`, SHA-256 `e313ab00de1fffd2…4d2788d`, temperature 0.8324 |
| Shipped operating point | flag when the strongest section reaches **0.9855**, or the second-strongest reaches **0.9763** |
| Pipeline | `segments-v3` token-bounded segmentation, maximum across sections reported as the document probability |
| Runtime | Python `onnxruntime` 1.29.0, CPU, **fp32** unless a row says browser (int8 `onnxruntime-web`) |
| Corpus | the 5,558-document long-form corpus of 28 August 2026: 922 AI across 13 models, 4,636 human. **Not fully held out** — see "What this does not prove" |
| Half-AI corpus | 700 synthetic documents, 7 registers, 50 AI and 50 human articles of matched word count spliced in both orders, 300–900 words a half |
| Sources | `docs/measurements/AGGREGATION-AND-RHYTHM.md` §1, §2, §2.4, §6; internal programme record (maintained privately) §4.2, §4.4 |

The candidate comparison in §2 of that record was measured under the earlier `segments-v2`
pipeline at a 0.984 single threshold. It is a comparison of aggregation rules at a matched false
positive budget, and it is reported here as such. The shipped-pair figures come from §6, which is
the section measured at `0.9855 / 0.9763`.

---

## Why a document is scored in pieces at all

The classifier reads 512 tokens. A 1,600-word article does not fit, so it is cut. Once a document
is several readings rather than one, something has to turn several numbers into a verdict, and
that combining step is a design decision with measurable consequences.

The obvious objection to taking the maximum is that a long document gets more chances to trip the
flag, so long human documents should be flagged more often for no reason other than their length.
That objection is correct in principle. It was measured.

## The length bias is real, small, and lives where it was expected to

Take every document with at least six sections. Ask what the flag rate would be if the verdict were
the maximum over a random subset of *j* of that document's own sections, computed exactly over all
C(k,j) subsets rather than sampled. Register, source, author and topic are held constant, because
it is the same document throughout. Only the number of chances varies.

| sections drawn | human flag rate (n = 510 documents) | AI flag rate (n = 315 documents) |
|---|---|---|
| 1 | 0.145% | 81.12% |
| 2 | 0.288% | 91.81% |
| 3 | 0.428% | 94.91% |
| 4 | 0.566% | 96.37% |
| 5 | 0.701% | 97.25% |
| 6 | 0.834% | 97.79% |

Each extra section adds **+0.14 percentage points** to a human document's chance of being wrongly
flagged. The relationship is almost perfectly linear. Going from a two-section document to a
nine-section one costs roughly one point. In academic discussion, the register with the worst
human false-positive rate, it is +0.74pp per section; in white papers over the same range it is
zero.

The right-hand column is the reason nothing was done about it. The same extra section that costs
0.14pp of human false positives takes AI detection from 81.12% to 91.81%. **A section is evidence,
not only opportunity.** A correction that removes the opportunity removes the evidence with it.

Two further observations from the same record support that reading. Across the whole corpus the
human false-positive rate is *not* monotonic in section count: it peaks at 24/979 = 2.45% for
three-section documents and falls to 8/887 = 0.90% at five or more. What dominates is register
composition, not length — human fiction runs at 29/260 = 11.15% and clusters in the three- and
four-section buckets, while student essays run at 0/420 and make up a quarter of the two-section
bucket. And the pooled per-section mean probability for human documents is flat or falling with
length within every register measured: white papers read 0.409, 0.354, 0.299, 0.176, 0.208 from one
section to five-plus. Longer human writing is not more machine-like section by section. The bias is
in the combining step, and it is worth 0.14pp per section against a register spread of eleven
points.

## The intuitive fix is the worst option available

Four candidate rules were tuned to the same human false-positive budget the shipped rule spent at
the time, 56/4,636 = 1.21%, and their detection read off. A fixed threshold would have conflated a
rule change with a calibration change, so each rule carries its own refitted threshold.

| candidate | AI detected | human false positives |
|---|---|---|
| A plain maximum @ 0.9841 | 877/922 = 95.12% | 57/4,636 = 1.23% |
| B section-count-aware threshold, `T(k) = 1 − 0.0284/√k` | 799/922 = 86.66% | 57/4,636 = 1.23% |
| C second-highest section @ 0.9712 | 868/922 = 94.14% | 56/4,636 = 1.21% |
| D highest sustained over two adjacent sections @ 0.9658 | 855/922 = 92.73% | 56/4,636 = 1.21% |
| E minimum evidence: max ≥ 0.9845 **or** second-highest ≥ 0.9765 | 887/922 = 96.20% | 56/4,636 = 1.21% |
| document mean @ 0.8476, for reference | 811/922 = 87.96% | 56/4,636 = 1.21% |

Correcting the threshold for section count, which is what a statistician reaches for first, costs
**8.46 points** of detection and buys nothing back. Sweeping the correction strength makes the
mechanism plain: at γ = 0.5 the five-plus-section bucket loses 15.8 points of detection to save
0.90pp of false positives on 887 documents, and at full Bonferroni the rule collapses to
**388/922 = 42.08%**. A multiple-comparisons correction assumes the extra tests are noise. Here
they are mostly signal.

Read the same table the other way, holding detection fixed at 877/922 and reading off the cost:
plain maximum spends 55/4,636 = 1.19% of human false positives, the mean of the top two spends
60/4,636, the document mean spends **206/4,636 = 4.44%**.

## Two sections agreeing is worth a lower bar

Candidate E is the rule that ships, in refitted form. It flags when one section is very confident,
or when two sections agree at a lower confidence. Because it is a two-parameter rule fitted on the
corpus it was evaluated on, it was cross-validated before it was believed: 200 random split-halves,
both rules refitted on half A at a 1.208% false-positive budget and evaluated on half B.

| | held-out detection | held-out human false positives |
|---|---|---|
| plain maximum | 95.22% (sd 0.85) | 1.22% (sd 0.33) |
| minimum evidence | 96.03% (sd 0.83) | 1.30% (sd 0.34) |
| difference | **+0.82pp**, 95% of splits in [−0.22, +1.74] | +0.077pp |

Minimum evidence wins on 178 of 200 splits, ties on 15 and loses on 7. It also spends slightly more
false positives out of sample than it was fitted to, which the in-corpus table does not show and
which is recorded here because it is the honest half of the result.

The gain lands where short documents live. At the matched budget the two-section bucket goes from
30/37 = 81.08% to 34/37 = 91.89% and the three-section bucket from 178/198 = 89.90% to
183/198 = 92.42%, while five-plus is unchanged at 477 against 478 of 487. The gap between short and
long documents narrows from 16.9 points to 6.3.

## What shipped is not what was fitted

Candidate E's parameters, `0.9845 / 0.9765`, were fitted on fp32 section scores because those were
the only full-corpus segmented scores that existed. The browser runtime was then measured over the
same 5,558 documents and the rule did not hold there. It would have taken browser human false
positives from 90/4,636 to **106/4,636** and browser academic discussion from 16/420 = 3.81% to
23/420 = 5.48%. E had been accepted as detection gained at matched false positives. That is true on
fp32 and false in the browser, so it is not the trade a browser visitor would have received.

Refitted against both runtimes at once, under the constraint that neither route may finish with
more false positives than the rule it replaces, the shipped pair is **`0.9855 / 0.9763`**:

| | AI detected | human false positives | two-section AI | fiction | academic discussion |
|---|---|---|---|---|---|
| prior 0.984, fp32 | 877/922 = 95.12% | 56/4,636 = 1.208% | 30/37 = 81.08% | 29/260 = 11.15% | 8/420 = 1.90% |
| prior 0.984, browser | 877/922 = 95.12% | 90/4,636 = 1.941% | 31/37 = 83.78% | 28/260 = 10.77% | 16/420 = 3.81% |
| **shipped, fp32** | **883/922 = 95.77%** | **45/4,636 = 0.971%** | **34/37 = 91.89%** | 23/260 = 8.85% | 8/420 = 1.90% |
| **shipped, browser** | **889/922 = 96.42%** | **90/4,636 = 1.941%** | **34/37 = 91.89%** | 26/260 = 10.00% | 21/420 = 5.00% |

Server rows are fp32 Python `onnxruntime`; browser rows are int8 `onnxruntime-web`. The two are
different artefacts and their false-positive rates differ materially. Both are printed rather than
the flattering one.

One arithmetic note, because it moves a digit. The stored per-section probabilities carry four
decimal places and the secondary bar is decided by 19 AI and 9 human documents on fp32, which sit
close enough to the bar that rounding matters. At four decimals the shipped rule reads 884
detections; from a full-precision re-score of all 21,093 segments it reads 883. The unrounded run
reproduces the canonical 56/4,636 for the prior rule exactly, which is what licenses the 883.

## The cost, published because it was accepted knowingly

Raising the primary bar from 0.9841 to 0.9855 opens a gap, and half-AI documents fall into it.

The 700-document half-AI corpus had to be rebuilt, because the original build script was not saved.
On the rebuild, which has a median of three sections rather than five, plain maximum catches
**612/700 = 87.43%** and the shipped pair catches **604/700 = 86.29%**. Nine documents lost against
one gained, **McNemar p = 0.027**.

The regression is structural rather than statistical. Every lost document has its strongest section
between 0.9840 and 0.9855, precisely the gap the higher primary opened, and its second-highest
section is the human half, at a median of 0.4365. The secondary arm cannot rescue those documents,
because a second-section rule cannot save a half-AI document by definition of what makes it
half-AI.

A purely additive rule — primary held at 0.984, secondary added — cannot regress this by
construction, and was tested. It fails differently: to stay inside the browser's false-positive
budget the secondary has to rise to 0.9825, at which point the two-section gain disappears
completely, back to 30/37 = 81.08%. There is no pair that holds two-section detection, browser
false positives and mixed-content detection at once. Every candidate gives up one of them.

The trade was taken with the numbers in front of it. The alternative wrongly flags 16 more people
in 4,636 and takes browser academic discussion to 5.48%, and academics are among the least able to
argue back against a false accusation. Nine missed half-AI documents in 700, on a capability that
stays near 86% either way, was judged the smaller harm.

---

## What this does not prove

- **The half-AI corpus is synthetic.** These are spliced halves, not documents a person actually
  half-wrote. The corpus tests the mechanism that maximum aggregation exists to protect. Its
  absolute rates must not be quoted as a detection figure for edited text.
- **Two builds, two numbers.** The original 700-document build reads 638/700 for plain maximum;
  the rebuild reads 612/700 on the same specification. Both are true of their own corpus and
  neither is a correction of the other. Any comparison must stay inside one build.
- **Cross-validation is blind to the mixed-content axis.** The 5,558-document corpus contains no
  mixed documents. The shipped pair wins 194 of 200 split-halves on fp32 and 200 of 200 in the
  browser, and both results are blind to the regression above. That is a limitation of the
  validation method, and it applies to every future operating point fitted the same way. A
  mixed-content check belongs inside the fit rather than after it.
- **The corpus is not fully held out.** Of the 922 AI documents, 268 (29.1%) appear in the cycle-2
  dataset and 168 of those in the training split; the human side is effectively clean at 11 of
  4,636. The independent subset reads 620/654 = 94.80% against 257/268 = 95.90% for the seen
  subset, measured at the superseded 0.984 single-threshold rule and **not** at the shipped pair.
  No seen-against-unseen split has been measured at `0.9855 / 0.9763`.
- **The fit did not include WebGPU.** The pair was fitted from `onnxruntime-web`'s WASM provider
  under headless Node. WebGPU was measured afterwards and holds; that measurement is a separate
  paper.
- **Register labels are machine-assigned.** Every per-register figure here inherits that.

---

## Charts this page needs

All new. Nothing in `docs/assets/charts/` covers this argument; `rules-vs-model.svg` is a different
one.

**1. Maximum against mean on half-AI documents.** Two horizontal bars, one plotted value each,
denominators on the bars.

- plain maximum 638/700 = 91.14% [88.81–93.03]
- document mean 29/700 = 4.14% [2.90–5.89]
- Caption must carry: 700 synthetic half-AI documents, 7 registers, fp32, both rules tuned to the
  same 1.21% human false-positive budget, `segments-v2`, 0.984-era candidate comparison.
- Source: `AGGREGATION-AND-RHYTHM.md` §2.4.

**2. The within-document j-curve.** Line chart, x = number of sections drawn (1 to 6), twin y axes.

- Human flag rate (left axis, 0 to 1%): 0.145, 0.288, 0.428, 0.566, 0.701, 0.834 — n = 510
  documents.
- AI detection (right axis, 75 to 100%): 81.12, 91.81, 94.91, 96.37, 97.25, 97.79 — n = 315
  documents.
- Source: `AGGREGATION-AND-RHYTHM.md` §1.4.

**3. Candidate rules at a matched false-positive budget.** Horizontal bar of AI detection with the
budget stated once in the subtitle (≤ 1.21% human false positives, 4,636 human documents).

- plain maximum 877/922, Šidák-shaped 799/922, second-highest 868/922, adjacent pair 855/922,
  minimum evidence 887/922, document mean 811/922, full Bonferroni 388/922.
- Source: `AGGREGATION-AND-RHYTHM.md` §2, §2.1.

**4. Optional: the two-bar rule, drawn.** A schematic of one document's section scores with the
primary bar at 0.9855 and the secondary at 0.9763 marked, showing a document that clears only on
the secondary. No data attached; it is an explanatory diagram and should be labelled as one.

---

## Rewrite liabilities (not body copy)

- **cycle-4a.** A retrain is measured and not shipped. It runs at a refitted pair `0.959674 /
  0.950715` and a temperature of 1.7298. When it ships, every operating point on this page changes,
  because the pair is model-specific and cannot be carried across a retrain. Keep the operating
  point and the model SHA in one shared component rather than retyped into prose.
- **The seen-against-unseen split at the shipped pair has never been measured.** If it is measured,
  the "what this does not prove" wording needs replacing rather than editing.
- **The mixed-content cost has not been re-measured on WebGPU.** The 604/700 figure is fp32 and
  stays fp32 until it is.
- Unverified against a measurement file: `HANDOVER.md` §4.2 quotes averaging as catching 11/700 of
  half-AI documents on the rebuild, and separately quotes 57.8% against 93.3% for mean against
  maximum. Neither figure appears in `AGGREGATION-AND-RHYTHM.md` or any other measurement record
  found in this sweep. They are not used above.
