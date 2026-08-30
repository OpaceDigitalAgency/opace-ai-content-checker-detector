# Two-axis retrain — length and lexical repetition

**Written 30 August 2026. Recommendation: do not ship this model.** It fixes what
it was built to fix and pays for it somewhere the project has already named as a
hard bar. Both halves are below with their denominators.

**Spend on new generation: $0.00.** Nothing was generated. Why, and what the
corpus provably still lacks, is in §2.

**Runtime for every figure in this file: fp32 ONNX under onnxruntime's CPU
provider — the server runtime.** No browser figure is produced or implied. The
int8 per-channel model was exported and gated but its own detection curve was
not measured; that remains the known gap it already was.

**Nothing was deployed and no live threshold was changed.**

---

## 1. Headline

| | old (cycle 2, shipped) | new (cycle 3) at matched false positives |
|---|---|---|
| short-form AI, held-out, AUROC | 0.9509 (262 AI / 3,445 human) | **0.9897** |
| 100-word AI detected | 11/57 = 19.3% | **33/57 = 57.9%** |
| 300-word | 44/61 = 72.1% | **57/61 = 93.4%** |
| 400-word | 46/69 = 66.7% | **64/69 = 92.8%** |
| 600-word | 64/75 = 85.3% | **72/75 = 96.0%** |
| TTR 0.42–0.55 AI detected (all samples, 300w+) | 163/280 = 58.2% | **256/280 = 91.4%** |
| long-form AI, AUROC | 0.99741 (922 / 4,636) | 0.99681 |
| **long-form AI detected** | **883/922 = 95.77%** | **863/922 = 93.60%** |
| long-form human false positives | 45/4,636 = 0.97% | 46/4,636 = 0.99% |
| — of which fiction | 23/260 = 8.85% | **29/260 = 11.15%** |
| — non-fiction | 22/4,376 = 0.50% | 17/4,376 = 0.39% |

The two defects the retrain targeted both moved, by a lot, and the improvement
survives a group-aware held-out split. Long-form detection fell by 20 documents
(McNemar p = 0.00018) and human fiction gained 6 false positives. Fiction was
named in the brief as a register that must not get worse. It got worse.

---

## 2. What was generated: nothing, and what that leaves missing

`OPENROUTER_API_KEY` is not in this session's environment. It lives in the
owner's shell profile, and reading his API key out of it is not something a
session should do; nor is an authorisation relayed through another agent the
owner's own consent to spend his money. The previous session stopped at exactly
this line and it is the right line. **Actual spend: $0.00, against the $5
allowance and the $4 self-cap.**

That is not a problem for the retrain, because the corpus already held 1,248
scored AI short-form documents and 4,368 human short-form passages, all
generated and paid for in the previous session's $5.04. Everything below was
built from those.

It does leave three gaps, all measured rather than assumed:

1. **Every one of the 1,248 AI short-form documents is on a web-design or SEO
   topic**, because the topic list was derived from the Opace blog's own post
   titles. The human short-form side spans nine sources including medicine,
   government, journalism and fiction. Training the AI side on one subject area
   is the register confound of §4.1 in a new costume, and §3 below says how it
   was contained rather than solved.
2. **There is no AI short-form fiction at all**, against 400 human fiction
   passages. Fiction is where this model regresses. That is not a coincidence
   and §6 explains the mechanism.
3. **The lowest two repetition bins are thin once held out**: at 300 words and
   above, the test split holds 5 documents below TTR 0.42 and 12 in 0.42–0.46.
   The all-sample figures in those bins are larger but include training groups.

The generation that would close these is roughly 600–800 short-form AI
documents at 100/300/400/600 words on topics taken from the human corpus's own
registers — fiction first, then journalism, government guidance and academic
prose — half at natural repetition and half instructed into TTR 0.42–0.55. At
the $0.004 per sample the previous session measured, that is about **$3**.

---

## 3. Corpus

`services/local-engine/research/cycle3-shortform/dataset.jsonl`, built by
`prepare_data.py`. The 17,295 cycle-2 rows are carried over verbatim with their
splits untouched; 2,408 short-form rows are added.

**Group key is the post slug, for both sides.** Every one of the 221 AI topics
was derived from a blog post title, and all 221 slugs match a human post slug
exactly, so one key covers both "same source URL" and "same topic". Split
60/15/25 by SHA-256 of the slug: 1,606 train, 294 cal, 508 test.

**The human short-form training side is the Opace blog only.** The widened
4,368-passage set is cut from the same 4,636 documents the false-positive bar is
measured on, so training on it would have contaminated that bar. It is held
entirely out and used as a test set. That also means the AI and human short-form
training sides share their subject matter, which is the containment for gap 1
above: the model cannot separate them on topic because the topics are the same.

**The owner's six team samples are excluded by slug on both sides** and appear
nowhere in train, cal or test.

Composition, AI side (documents by target length × achieved type-token ratio):

| words | <0.42 | 0.42–0.46 | 0.46–0.50 | 0.50–0.55 | 0.55–0.60 | ≥0.60 | total |
|---|---|---|---|---|---|---|---|
| 100 | 0 | 0 | 0 | 8 | 13 | 238 | 259 |
| 300 | 7 | 21 | 17 | 18 | 26 | 240 | 329 |
| 400 | 15 | 26 | 20 | 30 | 70 | 172 | 333 |
| 600 | 36 | 23 | 25 | 100 | 112 | 31 | 327 |
| **all** | 58 | 70 | 62 | 156 | 221 | 681 | **1,248** |

Human side:

| words | <0.42 | 0.42–0.46 | 0.46–0.50 | 0.50–0.55 | 0.55–0.60 | ≥0.60 | total |
|---|---|---|---|---|---|---|---|
| 100 | 0 | 0 | 2 | 11 | 26 | 281 | 320 |
| 300 | 2 | 11 | 23 | 93 | 132 | 59 | 320 |
| 400 | 12 | 19 | 52 | 140 | 73 | 4 | 300 |
| 600 | 34 | 48 | 85 | 49 | 4 | 0 | 220 |
| **all** | 48 | 78 | 162 | 293 | 235 | 344 | **1,160** |

The 100-word row is empty below TTR 0.50 on both sides. Short text cannot repeat
itself enough to get there; that band is a property of the length, not a
sampling failure.

---

## 4. Training and export

`train.py` continues from `cycle2-train/cycle2-checkpoint` — not from
`intfloat/e5-small` — at lr 1e-5 for 3 epochs, batch 16, seed 20260830, on MPS.
Three things differ from the cycle-2 script and each is deliberate:

* loss cells are keyed on (register, axis), so the 2,408 short-form rows get
  their own equalised AI/human cell instead of being diluted inside a 5,419-row
  marketing register. Short-form ends up carrying 17.7% of the weighted mass;
* epoch selection uses the mean of long-form and short-form cal TPR at a 2% FPR
  budget, with a guard that rejects any epoch whose long-form TPR falls more
  than one point below the starting checkpoint's;
* the starting checkpoint is scored on cal first and recorded as epoch −1.

| epoch | cal AUROC | long-form TPR@2%FPR | short-form TPR@2%FPR | TTR<0.55 TPR@2%FPR |
|---|---|---|---|---|
| −1 (cycle 2) | 0.9649 | 0.7786 | 0.8800 | 0.6977 |
| **0 (selected)** | **0.9729** | **0.7847** | **0.9800** | **0.9535** |
| 1 | 0.9734 | 0.7835 | 0.9800 | 0.9535 |
| 2 | 0.9733 | 0.7835 | 0.9800 | 0.9535 |

One epoch does the work; the next two do not add anything. Fitted temperature
**1.2095**, against cycle 2's 0.8324 — see §7, because that number is why the
shipped flag point cannot simply be carried over.

Export matches the cycle-2 process exactly: `torch.onnx.export` at opset 14,
then `quantize_dynamic` with `QuantType.QInt8, per_channel=True`.

| | size | drift vs fp32 (mean / p95 / max) | Spearman | worst verdict-flip rate | gate |
|---|---|---|---|---|---|
| `tier3-cycle3-e5small-fp32.onnx` | 133.7 MB | — | — | — | — |
| `tier3-cycle3-e5small-int8-perchannel.onnx` | 34.2 MB | 0.0076 / 0.0360 / 0.1508 | 0.99949 | 0.00518 | pass |

2,123 cal rows. Cycle 2 read 0.0067 / 0.0289 / 0.0934 and 0.00711, so the two
quantisations behave alike. **The fp32 file is 133.7 MB and must not be pushed
to GitHub**; like cycle 2's it belongs in a release asset. Neither the shipped
model nor the cycle-2 files are opened for writing — `export_onnx.py` asserts it.

### 4.1 The probe was proved before it was trusted

Three checks, all before any comparison was drawn:

* the cycle-2 torch checkpoint against the fp32 ONNX the server actually serves:
  max |Δmargin| 2.7e-05 over 20 documents, max |Δp| 5.5e-06. The checkpoint is
  the shipped model;
* the same check for the new export: max |Δmargin| 5.1e-05;
* the old model re-scored end to end reproduces the recorded figures without
  being told them — **883/922 long-form detection, 45/4,636 false positives,
  fiction 23/260, academic discussion 8/420**, and the owner's nine at 2.23%,
  5.44%, 3.26%, 11.72%, 20.78%, 8.93%, 97.18%, 98.56% flagged, 80.82%.

A probe that could not reproduce those had no business producing an after.

---

## 5. Where the flag point sits, and why "the same threshold" is not a comparison

Cycle 2's calibration temperature is 0.8324 and cycle 3's is 1.2095. The
shipped 0.9855 is margin 3.52 on the old model and margin 5.11 on the new one.
Applying it unchanged does not hold the operating point constant; it moves it
sharply stricter, and it reads as a collapse that is entirely an artefact:

| | old at 0.9855/0.9763 | new at 0.9855/0.9763 |
|---|---|---|
| long-form AI detected | 883/922 = 95.8% | 781/922 = 84.7% |
| long-form human FP | 45/4,636 | 18/4,636 |
| 300-word AI detected (held out) | 44/61 = 72.1% | 0/61 = 0.0% |

Nothing in that column means anything about the model. **Every "new" figure
elsewhere in this file is quoted at a refitted pair, 0.976638 / 0.967521**,
which preserves the shipped primary-to-secondary ratio and is the lowest primary
whose long-form human false-positive count is at most the old model's 45. It
lands on 46. That is the only point at which a detection difference is a
detection difference.

**So yes, the flag point must move if this model is ever adopted** — and it must
move for both routes together, per §4.4 of the handover, which means the browser
curve has to be measured before any pair is fixed. It has not been.

The trade, on the new model, fp32, 4,636 human and 922 AI long-form documents
and the 262 held-out short-form AI documents:

| primary | secondary | long-form human FP | long-form AI det | short-form AI det (held out) |
|---|---|---|---|---|
| 0.9700 | 0.9609 | 104/4,636 | 890/922 | 242/262 |
| 0.9716 | 0.9626 | 89/4,636 | 883/922 | — |
| 0.9763 | 0.9672 | 50/4,636 | 865/922 | 227/262 |
| **0.9766** | **0.9675** | **46/4,636** | **863/922** | **226/262** |
| 0.9800 | 0.9708 | 30/4,636 | 844/922 | 189/262 |
| 0.9855 | 0.9763 | 18/4,636 | 781/922 | 83/262 |

There is no point on this curve that matches the old model on both long-form
detection and false positives. Holding detection at 883/922 costs 89 false
positives against 45, and takes fiction to 34/260 = 13.08%.

---

## 6. The bars, one at a time

All at the refitted pair unless stated. fp32 server runtime, segments-v3,
maximum aggregation, minimum-evidence flag rule.

### Bar 1 — detection by length band. Improved.

Held-out test split, group-aware by post slug — the honest figure:

| words | old | new | change |
|---|---|---|---|
| 100 | 11/57 = 19.3% [11.1, 31.3] | **33/57 = 57.9%** [45.0, 69.8] | +38.6pp |
| 300 | 44/61 = 72.1% [59.8, 81.8] | **57/61 = 93.4%** [84.3, 97.4] | +21.3pp |
| 400 | 46/69 = 66.7% [54.9, 76.6] | **64/69 = 92.8%** [84.1, 96.9] | +26.1pp |
| 600 | 64/75 = 85.3% [75.6, 91.6] | **72/75 = 96.0%** [88.9, 98.6] | +10.7pp |
| long-form | 883/922 = 95.8% | 863/922 = 93.6% | −2.2pp |

95% Wilson intervals. The 100-to-600 gap closes from 66 points to 38. **It does
not close the defect** — 100-word text is still the worst case by a wide margin,
and the honest read is that it moves from unusable to poor.

These old figures are a point or two under the 22.6 / 85.0 / 81.2 / 93.7 in
`SHORT-FORM-RETRAIN.md` because that file scored at primary 0.9845 with no
secondary arm, and this one uses the shipped 0.9855/0.9763 pair on the same
documents. Same model, same runtime, different rule.

### Bar 2 — detection by type-token ratio. Improved, and the cliff is gone.

300 words and above, binned by achieved TTR:

| TTR | n | old | new |
|---|---|---|---|
| <0.42 | 58 | 16 = 27.6% | **45 = 77.6%** |
| 0.42–0.46 | 70 | 23 = 32.9% | **52 = 74.3%** |
| 0.46–0.50 | 62 | 26 = 41.9% | **58 = 93.5%** |
| 0.50–0.55 | 148 | 114 = 77.0% | **146 = 98.6%** |
| 0.55–0.60 | 208 | 173 = 83.2% | **203 = 97.6%** |
| ≥0.60 | 443 | 382 = 86.2% | **429 = 96.8%** |

These pool training and test groups. On the test split alone the direction holds
at every bin but the denominators are small: <0.42 1/5 → 4/5; 0.42–0.46 6/12 →
10/12; 0.46–0.50 5/11 → 11/11; 0.50–0.55 28/34 → 33/34; 0.55–0.60 33/42 →
40/42; ≥0.60 81/101 → 95/101.

The old model's profile falls from 86% to 28% across the range. The new one is
flat at 93–99% down to 0.46 and 74–78% below it. **In the target band the brief
named — 0.42–0.55 at 300 words and above — detection goes from 163/280 = 58.2%
to 256/280 = 91.4%.**

### Bar 3 — false positives by register. Mixed, and fiction gets worse.

Long-form human corpus, 4,636 documents. Totals: 45 → 46, McNemar p = 1.0. The
total is flat by construction (that is what the refit matched) but the
composition changes:

| register | n | old | new | |
|---|---|---|---|---|
| story (fiction) | 260 | 23 = 8.85% | **29 = 11.15%** | **worse** |
| white-paper | 840 | 2 = 0.24% | 4 = 0.48% | worse |
| company-update | 662 | 1 = 0.15% | 2 = 0.30% | worse |
| academic-discussion | 420 | 8 = 1.90% | 4 = 0.95% | better |
| academic-conclusion | 360 | 7 = 1.94% | 3 = 0.83% | better |
| academic-introduction | 420 | 1 = 0.24% | 1 = 0.24% | flat |
| academic-lit-review | 225 | 0 | 0 | flat |
| longform-journalism | 840 | 3 = 0.36% | 3 = 0.36% | flat |
| student-essay | 420 | 0 | 0 | flat |
| research-summary | 189 | 0 | 0 | flat |

Excluding fiction the model is better: 22/4,376 = 0.50% → 17/4,376 = 0.39%.
Fiction alone absorbs the whole difference and then some.

It repeats on independent short-form data. On the 4,368-passage widened human
short-form corpus, the fiction source goes 11/400 → 17/400 while the other eight
sources go 11/3,968 → 12/3,968.

**Academic did not get worse; fiction did, on two independent corpora, in the
runtime measured.** The brief's 11.2% and 3.81% are the browser int8 figures
under the older rule; the fp32 shipped-rule equivalents are 8.85% and 1.90%,
which is what moved to 11.15% and 0.95%.

The mechanism is not mysterious and it is the axis that was trained: the model
was pushed to stop treating lexical repetition as evidence of human authorship.
Human fiction is lexically repetitive — character names, dialogue, deliberate
motif — so it loses the protection that repetition used to give it. The corpus
holds 400 human fiction passages and **no AI fiction short-form at all** to
teach the distinction, which is §2 gap 2 restated as a consequence.

### Bar 4 — long-form regression. It regresses.

| | old | new |
|---|---|---|
| long-form AI detected | 883/922 = 95.77% [94.3, 96.9] | 863/922 = 93.60% [91.8, 95.0] |

24 documents lost, 4 gained, McNemar **p = 0.00018**. Long-form AUROC is
essentially unchanged, 0.99741 → 0.99681, so this is a change in the tail
ordering at the operating point rather than gross forgetting — but the operating
point is what ships, and at it the model catches 20 fewer AI articles.

### Bar 5 — the owner's nine documents. Two gained, one lost.

None of the nine was trained on. Old at 0.9855/0.9763, new at 0.976638/0.967521:

| document | old p_max | old | new p_max | new |
|---|---|---|---|---|
| 1 panda-penguin (human) | 0.0223 | clear | 0.0360 | clear |
| 2 social-objectives (human) | 0.0544 | clear | 0.0207 | clear |
| 3 esports (human) | 0.0326 | clear | 0.0243 | clear |
| 4 facebook-stale (human) | 0.1172 | clear | 0.0383 | clear |
| 5 mobile-algorithm (human) | 0.2078 | clear | 0.0948 | clear |
| 6 eu-ranking (human) | 0.0893 | clear | 0.0217 | clear |
| 7 unedited gpt-5.5 (AI) | 0.9718 | missed | 0.9739 | **FLAG** |
| 8 heavily edited by hand (AI) | 0.9856 | FLAG | 0.9628 | **missed** |
| 9 humanised article (AI) | 0.8082 | missed | 0.9799 | **FLAG** |

**Yes — the 80.8% now flags**, and so does the unedited generation the old model
also missed. All six human documents stay clear and every one of them scores
lower than before. The cost is document 8, the hand-edited piece: 0.9856 →
0.9628, and 0.9628 is not close to the line. The tool goes from catching 1 of
these 3 AI documents to catching 2 of 3, on a sample of three.

### Bar 6 — should the flag point move? Yes, necessarily. See §5.

---

## 7. Recommendation: do not ship

The retrain does what it was built to do. Short-form AUROC on held-out data goes
0.9509 → 0.9897; the repetition cliff flattens; the article the owner cared
about now flags. Two axes the project measured as defects are demonstrably
learnable from data it already owns.

It is still not shippable, for three reasons in descending order:

1. **Human fiction gets worse, on two independent corpora.** 23/260 → 29/260
   long-form and 11/400 → 17/400 short-form. The brief named fiction as a
   register that must not get worse, and §9 item 1 of the handover already ranks
   fiction as the tool's most harmful weakness. Making the most harmful weakness
   worse to fix a different one is not a trade this project has ever taken.
2. **Long-form detection falls 883/922 → 863/922, p = 0.00018.** Long-form is
   the register users paste, and the brief set 95.77% as a floor.
3. **The operating point would have to be refitted on both runtimes at once**,
   and the browser curve for this model does not exist. §4.4 of the handover is
   explicit that a route-dependent verdict is worse than a slightly miscalibrated
   one, and the shipped pair was fitted on both runtimes for that reason. Fitting
   a new pair on fp32 alone would repeat the mistake that document records.

None of that is an argument against the approach. It is an argument that the
corpus is one register short. The specific missing piece is named in §2 and
costs about $3: short-form AI text outside web marketing, fiction first. A
retrain with human and AI fiction matched at short lengths is the obvious next
attempt, and it can reuse everything here.

**If the choice is between this model and the shipped one, keep the shipped
one.** A model that catches the owner's article but flags one novelist in nine
is a worse tool than one that misses his article.

---

## 8. What is here

| path | |
|---|---|
| `services/local-engine/research/cycle3-shortform/prepare_data.py` | corpus builder, group rule, held-out slugs |
| `…/dataset.jsonl`, `…/dataset-manifest.json` | 19,703 rows, 2,408 of them short-form |
| `…/train.py`, `…/train-report.json` | the fine-tune and its per-epoch cal history |
| `…/cycle3-checkpoint/` | fp32 torch checkpoint |
| `…/export_onnx.py`, `…/onnx-export-report.json` | export and the quantisation gate |
| `…/score_set.py` | document scoring through the deployed server path |
| `…/measure.py` | every table in §6 |
| `services/local-engine/research/models/tier3-cycle3-e5small-*.onnx` | fp32 133.7 MB, int8 34.2 MB |

`dataset.jsonl` (70 MB), `cycle3-checkpoint/` (128 MB), both ONNX files and
`train.log` are excluded by the repository's existing research-data rules, as
cycle 2's equivalents are. The scored jsonl files — five document sets by two
models — are session scratch; `score_set.py` regenerates them in about 25
minutes per model on this machine.

## 9. Limits

* fp32 server runtime only. The int8 browser curve for this model is unmeasured,
  which is the same gap the shipped model has.
* The held-out short-form test split is 264 AI documents. Bin-level figures in
  §6 bar 2 rest on 5 to 42 documents each; the pooled figures are larger but
  include training groups.
* All 1,248 AI short-form documents come from two models, `gpt-5.6-sol` and
  `gpt-5.6-luna`, on web-design and SEO topics. Neither the model coverage nor
  the topic coverage is broad.
* The nine documents are nine documents. Two gained and one lost is a direction,
  not a rate.
* Mixed human/AI documents were not measured. §9.1 of the handover records that
  the corpus contains none, so this retrain is as blind on that axis as the
  operating-point fit was.
* 813 of the 4,368 human short-form passages (18.6%) carry year-only dating for
  2022 and a fraction could post-date ChatGPT. That caveat is inherited, not new.
