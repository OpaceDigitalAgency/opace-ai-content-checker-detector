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

---

# Cycle 4 — the fiction regression, fixed

**Written 30 August 2026, appended to the record above rather than replacing it.
Recommendation: the cycle-4a model clears every bar the brief set, and the one
outstanding item before it could be deployed is a measurement, not more data.**

**Spend on new generation: $24.4153**, against a $25 cap. Six batches, itemised
in §14. Nothing was deployed and no live threshold was changed.

**Runtime for every detection figure below: fp32 ONNX under onnxruntime's CPU
provider — the server runtime.** The int8 export is measured for drift and
verdict flips against that fp32 model (§13) but its own detection curve is not
produced here, which is the same gap the shipped model has.

---

## 10. Why cycle 3 broke fiction, measured rather than guessed

Cycle 3's own §6 bar 3 named the mechanism but not the whole of it. Two facts
about the corpus were checked directly before anything was generated, and
together they explain the regression and rule out the cheap fix:

1. **The training split held no human fiction at all.** Counting
   `cycle3-shortform/dataset.jsonl` by `(split, side, register, genre)`, the
   `creative` register appears only as **339 AI rows, every one of them in the
   `test` split** (300 `creative-fiction`, 39 `story`). There is no human
   `creative` row in train, cal or test. The 260 long-form `story` documents and
   the 400 short-form fiction passages are the sets the false-positive bar is
   measured on, so they are deliberately held out.
2. So the model was trained to stop reading lexical repetition as evidence of a
   human — that is what the two-axis retrain was for — with **nothing in
   training to tell it that repetitive narrative prose is what fiction looks
   like**. Human fiction lost the protection repetition used to give it.

**The six documents cycle 3 newly flagged are all genuine narrative fiction**,
which is what makes the mechanism concrete rather than a story about it. Taking
the 29 flagged minus the 23 the shipped model flags, and reading their
`discipline` metadata:

| newly flagged by cycle 3 | genre as the archive records it |
|---|---|
| Betrayal | LGBTQ fiction, young adult, vampire |
| Synaeresis Issue Six | poems, poetry, flash fiction |
| AHP 28: Scattered Memories of a Misspent Youth | modern Tibetan literature, short story |
| Nine Eleven Two | suspense thriller fiction |
| Catamaran Crossing Preview | non-fiction sailing memoir |
| Suzie Drakes | novel, science fiction |

Worth recording for anyone reading the fiction figure: **the 260-document
`story` register is not all fiction.** By its own subject metadata, 185 of 260
are fiction or literature and 75 are something else — the pool is the Internet
Archive's Creative-Commons text collection, and it carries linguistics
monographs, scripture translations and literary criticism alongside novels. The
register label is the corpus's, and the false-positive rate quoted for it is a
rate over that mixed pool, not over novels.

---

## 11. Arm A — the free fix, tried first, and it fails

Before spending anything, the obvious no-cost move was tested: keep cycle 3's
data exactly and change only the weighting, dropping the repetition half of the
hard-negative boost so the model is pushed less hard to treat low type-token
ratio as evidence of AI. `train.py --arm rebalance`, identical in every other
respect, same seed, same starting checkpoint.

It does not work, and §10 says why it cannot: **there is no human fiction in
the training split to give weight to.** Re-weighting can change how hard the
model is pushed away from "repetition means human"; it cannot supply the
counter-example that would let it keep fiction on the human side.

At the refitted pair 0.977382 / 0.968258, matched to the shipped model's 45
false positives:

| | shipped | arm A (rebalance) |
|---|---|---|
| human fiction false positives | 23/260 = 8.85% | **30/260 = 11.54%** |
| long-form AI detected | 883/922 = 95.77% | 864/922 = 93.71% |
| — at 600–849 words | 46/52 = 88.46% | **39/52 = 75.00%** |
| — at 850–1,199 words | 175/193 = 90.67% | 165/193 = 85.49% |
| long-form human false positives | 45/4,636 | 46/4,636 |

Fiction ends up marginally worse than cycle 3's 29/260, long-form detection
falls with McNemar p = 0.00055, and the loss concentrates in exactly the band
the length table identifies as already weakest. **Arm A is a clean negative and
the $0 option is closed.** It is reported because knowing the free option fails,
and why, is worth more than not having asked.

---

## 12. Arm B — cycle 4a. Every bar clears

### 12.1 What was bought, and what was harvested free

Two things were needed, not one. Adding AI fiction alone would have taught the
model that fiction is AI and driven the false-positive rate the wrong way, so
both sides were built.

**Generated (paid).** 2,332 AI documents, 1,231 of them fiction, across 11
models and the three prompt styles already in use, the third being the owner's
own humanise instructions verbatim. Fiction covers all four short bands evenly
(298 / 283 / 294 / 273 at 100 / 300 / 400 / 600 words) plus 83 long documents,
and half of every batch carried a repetition instruction — a small named cast,
recurring motif, plain repeated vocabulary — so the AI side reaches the
type-token ratios human fiction actually occupies: 204 documents below 0.42 and
138 in 0.42–0.46, bands the previous AI short-form corpus could not reach at all.

A 20-sample pilot was read before the budget was committed. It produced
narrative prose with named characters and dialogue at the requested lengths, and
the repetition condition moved achieved TTR from 0.72–0.93 down to 0.28–0.54.

**Harvested (free, no API cost).** The AI side could not be matched against the
human corpus already in hand, because that corpus *is* the false-positive bar.
So the original fetchers were re-run into a separate directory with every
`source_ref` the measurement corpus holds excluded:

* **1,001 new human fiction passages from 303 Internet Archive items**, none of
  them among the 95 items the 260 measured documents come from;
* **11,190 new human documents** across GOV.UK, Mongabay, Global Voices, CRS,
  SEC EDGAR and Europe PMC, thinned deterministically into the corpus so no
  single source becomes a register's house style.

### 12.2 The contamination guard, and it fired

`prepare_data.py` checks every candidate row against the normalised SHA-256 of
all 11,004 documents in the five measurement sets — `lf-hu`, `lf-ai`, the
owner's nine, the widened short-form human corpus and the AI short-form corpus —
and against their 2,684 `source_ref`s. **Three rows were caught and excluded**,
harvested chunks that duplicate measured text, presumably a second upload of the
same public-domain work. The build asserts if more than 25 are caught, on the
grounds that a large number would mean the exclusion-by-source step had failed
rather than that coincidence had happened.

The corpus is 28,295 rows: cycle 3's 19,703 carried over verbatim with their
splits untouched, plus 8,592 new (2,320 AI, 6,272 human) over 3,186 groups, split
60/15/25 by SHA-256 of the group. Every register that gains an AI cell gains a
human cell in the same axis — that check is in the build and prints a warning if
it is ever violated.

### 12.3 The bars

Continued from `cycle2-train/cycle2-checkpoint`, same as cycle 3. Epoch 1
selected; fitted temperature 1.7298. **Refitted pair 0.959674 / 0.950715**,
chosen as the lowest primary preserving the shipped primary-to-secondary ratio
whose long-form human false positives are at most the shipped model's 45. The
shipped pair cannot be used for comparison, for the reason §5 gives.

| bar | shipped | cycle 4a | verdict |
|---|---|---|---|
| **1. short-form gains hold** | 100w 11/57 = 19.30% | **44/57 = 77.19%** | **clears** |
| | 300w 44/61 = 72.13% | **59/61 = 96.72%** | |
| | 400w 46/69 = 66.67% | **68/69 = 98.55%** | |
| | 600w 64/75 = 85.33% | **73/75 = 97.33%** | |
| **2. fiction must not exceed 8.85%** | 23/260 = 8.85% | **14/260 = 5.38%** | **clears — better** |
| **3. long-form must not fall below 95.77%** | 883/922 = 95.77% | **900/922 = 97.61%** | **clears — better** |
| **4. academic must not worsen from 1.90%** | 8/420 = 1.90% | **2/420 = 0.48%** | **clears — better** |
| long-form human false positives | 45/4,636 = 0.97% | 46/4,636 = 0.99% | flat by construction |
| short-form AUROC, held out | 0.9509 | **0.9964** | |
| long-form AUROC | 0.99714 | **0.99861** | |

Held-out test split, group-aware by source; 262 AI short-form documents against
3,445 human short-form passages of which 3,200 come from sources never trained
on. Long-form detection improves with McNemar p = 0.0019.

**The long-form floor holds band by band, not only in aggregate** — which
matters, because 95.77% is a long-document figure and the aggregate could hide a
sag:

| document length | shipped | cycle 4a |
|---|---|---|
| 300–599 words | 3/3 | 2/3 |
| 600–849 | 46/52 = 88.46% | **50/52 = 96.15%** |
| 850–1,199 | 175/193 = 90.67% | **185/193 = 95.85%** |
| 1,200–1,999 | 379/389 = 97.43% | **382/389 = 98.20%** |
| ≥2,000 | 280/285 = 98.25% | **281/285 = 98.60%** |

The two bands the length table names as weakest are where the gain is largest.
The 300–599 row is three documents and means nothing either way.

**The repetition cliff is gone.** Short-form AI at 300 words and above, binned
by achieved type-token ratio, all samples:

| TTR | n | shipped | cycle 4a |
|---|---|---|---|
| <0.42 | 58 | 16 = 27.6% | **57 = 98.3%** |
| 0.42–0.46 | 70 | 23 = 32.9% | **69 = 98.6%** |
| 0.46–0.50 | 62 | 26 = 41.9% | **62 = 100%** |
| 0.50–0.55 | 148 | 114 = 77.0% | **148 = 100%** |
| 0.55–0.60 | 208 | 173 = 83.2% | **207 = 99.5%** |
| ≥0.60 | 443 | 382 = 86.2% | **436 = 98.4%** |

On the held-out split alone the low bands read 5/5, 12/12 and 11/11 — small
denominators, but in the same direction.

**Fiction improves on the second, independent corpus too.** On the widened
4,368-passage human short-form set, held-out passages only, total false
positives go 17/3,445 to **7/3,445**, and the fiction source goes **11/400 to
1/400**. Cycle 3 moved that same figure from 11/400 to 17/400. The two corpora
agree, in the opposite direction to last time.

### 12.4 What got worse, stated plainly

The total false-positive count is flat by construction, so an improvement in one
register is paid for in another. Fiction and academic improve; the business and
journalism registers worsen:

| register | n | shipped | cycle 4a | |
|---|---|---|---|---|
| story (fiction) | 260 | 23 = 8.85% | **14 = 5.38%** | better |
| academic-discussion | 420 | 8 = 1.90% | 2 = 0.48% | better |
| academic-conclusion | 360 | 7 = 1.94% | 5 = 1.39% | better |
| **company-update** | 662 | 1 = 0.15% | **10 = 1.51%** | **worse** |
| longform-journalism | 840 | 3 = 0.36% | 6 = 0.71% | worse |
| white-paper | 840 | 2 = 0.24% | 6 = 0.71% | worse |
| academic-lit-review | 225 | 0 | 1 = 0.44% | worse |
| student-essay | 420 | 0 | 1 = 0.24% | worse |
| academic-introduction | 420 | 1 = 0.24% | 1 = 0.24% | flat |
| research-summary | 189 | 0 | 0 | flat |

**Company updates are the one to watch: 1 in 662 becomes 10 in 662.** It is
still a low rate in absolute terms and it is nowhere near fiction's, but it is a
tenfold rise, and §9 item 5 of the handover already records business reports as
the register with the weakest AUROC in the corpus (0.6935). If this model is
adopted, that row belongs in the published weakness table alongside the improved
fiction row. It is not one of the four bars the brief set, and it is reported
here rather than left for someone to find.

### 12.5 The owner's nine documents

None was trained on. Shipped model at 0.9855/0.9763, cycle 4a at its refitted
pair:

| document | shipped p_max | shipped | cycle 4a p_max | cycle 4a |
|---|---|---|---|---|
| 1 panda-penguin (human) | 0.0223 | clear | 0.0520 | clear |
| 2 social-objectives (human) | 0.0544 | clear | 0.0506 | clear |
| 3 esports (human) | 0.0326 | clear | 0.0661 | clear |
| 4 facebook-stale (human) | 0.1172 | clear | 0.0764 | clear |
| 5 mobile-algorithm (human) | 0.2078 | clear | 0.2200 | clear |
| 6 eu-ranking (human) | 0.0893 | clear | 0.0394 | clear |
| 7 unedited gpt-5.5 (AI) | 0.9718 | missed | 0.9619 | **FLAG** |
| 8 heavily edited by hand (AI) | 0.9856 | FLAG | 0.9601 | **FLAG** |
| 9 humanised article (AI) | 0.8082 | missed | 0.9626 | **FLAG** |

**All three AI documents flag and all six human documents stay clear.** The
shipped model catches one of the three; cycle 3 caught two and lost the
hand-edited one; cycle 4a catches all three. Nine documents are nine documents —
this is a direction, not a rate.

---

## 13. Arm C — cycle 4b, and why the better-looking corpus is the worse model

The last two batches (664 register documents and 177 long documents, the latter
reaching 6,618 words against a corpus that previously topped out at 3,061)
arrived after arm B had trained. A second model was trained on the fuller
corpus, everything else identical. Epoch 2 selected, temperature 2.0325.

It is better on three of the four bars and unusable on the first:

| | shipped | cycle 4a | cycle 4b |
|---|---|---|---|
| fiction false positives | 23/260 | **14/260** | 14/260 |
| long-form AI detected | 883/922 | 900/922 | **902/922** |
| long-form human FP | 45/4,636 | 46/4,636 | 45/4,636 |
| **100-word AI detected** | 11/57 = 19.3% | **44/57 = 77.2%** | **2/57 = 3.5%** |
| 300-word | 44/61 | **59/61** | 54/61 |
| 400-word | 46/69 | **68/69** | 61/69 |
| int8 export gate | — | **fail, 0.01204** | pass, 0.00987 |

**Short text is the defect this whole exercise exists to fix, and cycle 4b makes
it worse than the shipped model.** Adding long documents moved the weighted mass
away from the 100-word band far enough to undo the gain. It is rejected on that
row alone. The long documents remain in the corpus and are worth keeping for a
future cycle that holds the short bands with an explicit guard, the way the
long-form guard already works.

### 13.1 The int8 export, and the one thing still outstanding

The quantisation gate this project has applied since cycle 1 — mean fp32→int8
probability drift under 0.05, verdict-flip rate under 0.01 at the calibration
thresholds — **cycle 4a fails, at 0.01204 against the 0.01 limit.** Mean drift
is 0.0090 and Spearman 0.99891, both comfortable; it is the flip rate alone, and
only just.

That number is measured per passage at five calibration thresholds, so it is a
harsher test than the product applies. At the operating point cycle 4a would
actually ship on, scoring whole documents through the deployed segmentation and
the minimum-evidence rule, **10 documents in 2,100 change verdict between the
fp32 and int8 exports** — 2 of 700 human long-form and 8 of 1,400 AI. The
segment-level flip rate at the primary is 3.07%.

Both figures are reported because they say different things and the second does
not excuse the first. **The gate is the project's own standard and it is not
met**, and §4.4 of the handover is explicit that both runtimes must share one
operating point and that a route-dependent verdict is worse than a slightly
miscalibrated one.

**So the single outstanding item before deployment is the browser int8 detection
curve and an operating point fitted on both runtimes at once.** That is roughly
five hours of compute against corpora already in hand. It is a measurement, not
more data, and it is the same gap the shipped model has carried since it
launched — the difference is that for this model it must be closed first,
because the pair has to move regardless.

---

## 14. Spend

| batch | requests ok | errors | cost |
|---|---|---|---|
| pilot, 20 samples, read before committing | 12 | 6 | $0.1233 |
| fiction and registers, hand-written topics | 433 | 27 | $3.3848 |
| register breadth, first attempt | 217 | 683 | $2.0179 |
| fiction, topics matched to harvested human items | 829 | 321 | $6.9233 |
| register breadth, second attempt | 664 | 38 | $5.6016 |
| long documents, 800–3,500 words requested | 177 | 21 | $6.3644 |
| **total** | **2,332** | **1,096** | **$24.4153** |

The two large error counts are one event, not a quality problem: **the first API
key hit a $100 per-key spending limit mid-run** and returned `403 Key limit
exceeded` for 695 consecutive calls. That limit was invisible from the account
balance, which still showed credit available. Every other error is a model
returning an empty completion — reasoning models exhausting the token budget
before producing visible text. `qwen/qwen3.8-max` failed that way on 4 of 4
attempts and was dropped from the roster; the token ceiling was raised for the
rest, which took the rate from 9% to 5%.

All harvesting was free.

---

## 15. Recommendation

**Cycle 4a clears every bar the brief set, and it is the first model in this
programme to improve fiction rather than trade against it.** Short-form
detection at 100 words goes 19.3% to 77.2% and the repetition cliff flattens to
98–100% across every band; human fiction false positives fall 8.85% to 5.38% on
one corpus and 2.75% to 0.25% on a second, independent one; long-form detection
rises 95.77% to 97.61% and holds band by band including the two bands the length
table names as weakest; academic improves; all three of the owner's AI documents
flag and all six of his human documents stay clear.

**It is not deployable today, and one thing stands in the way:** the operating
point must move — 0.959674 / 0.950715 on fp32 — and under §4.4 it must be fitted
on the browser int8 runtime at the same time, which has never been measured for
any model in this programme. The int8 export also misses the project's own
quantisation gate by 0.002. Both are answered by the same five hours of compute
on corpora already in hand, and neither needs another dollar.

**What this cycle settles, and it is the part worth keeping regardless of what
happens to the model:** cycle 3's fiction regression was a missing register in
the training corpus, not a flaw in the two-axis approach. The free fix was tried
first and fails for a reason that is now measured rather than argued — there was
no human fiction in the training split to re-weight. Supplying both sides, 1,231
AI fiction documents against 1,001 newly harvested human fiction passages that
the false-positive bar has never seen, fixes it and improves the bar it was
meant only to protect.

## 16. What is here

| path | |
|---|---|
| `services/local-engine/research/cycle4-fiction/build_topics.py` | hand-written topic seeds by register |
| `…/build_topics_matched.py` | topic seeds taken from the harvested human documents' own metadata |
| `…/generate_registers.py` | generation, budget stop, spend from OpenRouter's reported cost |
| `…/harvest_human_fiction.py` | new Internet Archive fiction, measured items excluded |
| `…/harvest_human_registers.py` | the other registers, same exclusion, into a separate raw directory |
| `…/prepare_data.py` | corpus build, the contamination guard, the AI-only-cell check |
| `…/train.py` | both arms from one file, `--arm rebalance` and `--arm cycle4` |
| `…/export_onnx.py`, `…/onnx-export-report-{rebalance,cycle4a,cycle4b}.json` | export and the quantisation gate per arm |
| `…/int8_at_operating_point.py`, `…/int8-at-operating-point-cycle4{a,b}.txt` | document-level fp32 vs int8 flips at the shipping pair |
| `…/measure.py`, `…/summarise_arm.py` | every table above, length bands included |
| `…/summary-{rebalance,cycle4a,cycle4b}.txt`, `…/measure-cycle4a.txt` | the raw output every table above is cut from |
| `…/train-report-{rebalance,cycle4a,cycle4b}.json` | per-epoch cal history and fitted temperature |
| `…/dataset-manifest.json` | 28,295 rows, cell composition, guard counts |

`dataset.jsonl`, the generated and harvested `*.jsonl`, the checkpoints and both
ONNX files are excluded by the repository's research-data rules, as cycle 2's and
cycle 3's are. `.gitignore` gains `ckpt-*/` and `raw-new/` for the same reason.

## 17. Limits

* fp32 server runtime only. The int8 browser curve is unmeasured for cycle 4a,
  and §13.1 says why that is the blocker rather than a footnote this time.
* The held-out short-form test split is 262 AI documents. The TTR bins on that
  split hold 5 to 101 documents each; the pooled figures are larger but include
  training groups.
* The `story` register is 185 fiction and 75 other by its own subject metadata
  (§10). "Fiction false positives" is a rate over that mixed pool.
* Company-update false positives rise 1/662 to 10/662 (§12.4). Not one of the
  four bars, but it is the register the handover already records as weakest by
  AUROC.
* The AI fiction comes from 11 models on one day. Half of it carries an explicit
  repetition instruction, which is a synthetic route to a low type-token ratio —
  real fiction gets there by being fiction. The corpus figures hold; whether the
  model generalises to repetitive human prose it has not seen is not settled by
  this corpus.
* Mixed human/AI documents were not measured, as in cycle 3. The corpus contains
  none and §9.1 of the handover records that no amount of cross-validation on it
  can see that axis.
* The nine documents are nine documents.

---

## 18. The operating point, fitted on both runtimes — and what it costs

Measured 30 August 2026, on corpora already in hand. No generation, no spend.
This section answers the one item §13.1 left open, and the answer is not the
one that section expected.

**Headline. A single pair does serve both runtimes: `0.961692 / 0.952714`,
fitted on the whole 5,558-document corpus with the browser route binding. But
it is not the pair §12.3 published, and moving to it costs the capability this
cycle exists to fix: 100-word detection falls from 44/57 (77.19%) to 25/57
(43.86%) on the server route. The fp32-only pair §12.3 published is not
false-positive-neutral in the browser — it takes browser false positives from
90/4,636 to 148/4,636. And cycle 4a's calibrated probability ceiling is 0.9630,
so its entire decision region now sits below 0.97, outside the range where
WASM and WebGPU were shown to agree.**

### 18.1 The harness was proved first, on both runtimes

The shipped model was re-scored from scratch before anything else was measured.

| target | reproduced | |
|---|---|---|
| long-form AI detected, fp32 | **883/922** | exact |
| long-form human false positives, fp32 | **45/4,636** | exact |
| fiction false positives, fp32 | **23/260** | exact |
| academic-discussion false positives, fp32 | **8/420** | exact |
| the owner's nine documents, fp32 | all nine p_max identical to §12.5 | exact |
| long-form AI detected, browser int8 | **889/922** | exact |
| long-form human false positives, browser int8 | **90/4,636** | exact |

The fp32 re-score is byte-identical to the previous run on all 4,636 human and
922 AI documents; model SHA-256 prefix `e313ab00de1fffd2`, the same file the
live `/v1/health` reports. The browser harness
(`cycle4-operating-point/browser_score.mts`) reproduces the recorded browser
scores **bit for bit** on a 20-document, 81-segment probe, at both WASM thread
settings, so parallel sharding changes throughput and not numbers. Cycle 4a's
own fp32 scores were re-derived too and are byte-identical on `lf-ai` and the
nine; every figure §12.3 publishes reproduces exactly at `0.959674/0.950715`,
including 900/922, 46/4,636, fiction 14/260, company-update 10/662 and the four
short-form bands 44/57, 59/61, 68/69, 73/75.

### 18.2 What the browser runtime had never been asked

Cycle 4a on the browser int8 runtime, whole corpus, segment by segment, through
the shipped `segments.ts`, the shipped WordPiece tokeniser and the shipped
`calibratedProbability` — 21,093 segments, onnxruntime-web on WASM. This is the
first time any candidate model in this programme has had a browser curve.

At **cycle 4a's published fp32-only pair `0.959674 / 0.950715`**:

| runtime | AI detected | human false positives |
|---|---|---|
| fp32 server | 900/922 = 97.61% | 46/4,636 = 0.99% |
| **browser int8** | 911/922 = 98.81% | **148/4,636 = 3.19%** |

The browser pays 148 false positives for a pair fitted to cost the server 46.
That is the exact failure mode §4.4 of the handover records, and the same one
`thresholds.json` records for the rejected `0.9845/0.9765` pair. Route
disagreement at that pair is 113/5,558 = 2.03%, against the shipped model's
55/5,558 = 0.99%.

### 18.3 The joint fit

Fitted the way the shipped pair was fitted, and the way §12 requires: one pair,
ratio locked to the shipped `0.9763/0.9855`, lowest primary such that **neither
route exceeds its own baseline false-positive count** — 45/4,636 on fp32,
90/4,636 in the browser, both from the shipped model at the shipped pair.

The rule reduces to a quantile rather than a sweep: under the minimum-evidence
rule a document is flagged exactly when `max(p₁, p₂ / ratio) ≥ primary`. The
constraint is checked on the **rounded** six-decimal pair, because rounding the
primary down moves the secondary down with it and at these densities that is
worth a document — the unrounded fit lands one over the browser's budget.

| | primary | |
|---|---|---|
| lowest primary meeting fp32's ≤ 45 | 0.959674 | |
| lowest primary meeting browser's ≤ 90 | 0.961687 | **binding route: browser** |
| **joint pair, six decimals** | **0.961692 / 0.952714** | |

| runtime | AI detected | human false positives |
|---|---|---|
| fp32 server | 891/922 = 96.64% | 27/4,636 = 0.58% |
| browser int8 | 906/922 = 98.26% | 90/4,636 = 1.94% |

**Route disagreement 80/5,558 = 1.44%** — 65 human and 15 AI, and 79 of the 80
are browser-only flags. Better than the fp32-only pair's 113, worse than the
shipped model's 55/5,558 = 0.99%. That is a regression on route agreement and
must not be quoted as an improvement.

### 18.4 The bars, by band and by register, at the joint pair

Long-form detection holds band by band on both runtimes — no mid-range sag:

| document length | shipped fp32 | c4a fp32 | shipped web | c4a web |
|---|---|---|---|---|
| <600 | 3/3 | 2/3 | 3/3 | 2/3 |
| 600–849 | 46/52 = 88.46% | **47/52 = 90.38%** | 47/52 = 90.38% | **52/52 = 100%** |
| 850–1,199 | 175/193 = 90.67% | **180/193 = 93.26%** | 174/193 = 90.16% | **184/193 = 95.34%** |
| 1,200–1,999 | 379/389 = 97.43% | 381/389 = 97.94% | 382/389 = 98.20% | 385/389 = 98.97% |
| ≥2,000 | 280/285 = 98.25% | 281/285 = 98.60% | 283/285 = 99.30% | 283/285 = 99.30% |

Aggregate long-form detection: fp32 883/922 → 891/922 (McNemar p = 0.215, not
significant); browser 889/922 → 906/922 (p = 0.019).

**Short form is where the joint pair hurts.** Held-out test split:

| band | shipped fp32 | c4a fp32 at 0.959674 (§12.3) | **c4a fp32 at the joint pair** | c4a web at the joint pair |
|---|---|---|---|---|
| 100w | 11/57 = 19.30% | 44/57 = 77.19% | **25/57 = 43.86%** | 24/57 = 42.11% |
| 300w | 43/61 = 70.49% | 59/61 = 96.72% | **58/61 = 95.08%** | 58/61 = 95.08% |
| 400w | 44/69 = 63.77% | 68/69 = 98.55% | **65/69 = 94.20%** | 65/69 = 94.20% |
| 600w | 64/75 = 85.33% | 73/75 = 97.33% | **73/75 = 97.33%** | 73/75 = 97.33% |

Two thousandths on the primary costs the 100-word band 33 percentage points.
It is still more than twice the shipped model's 19.30%, and the 300/400/600
bands hold, but **77.19% is not a figure this model can ship at, and it must
not be quoted for the pair that would ship**. §18.6 explains why the band is
that fragile.

Human false positives by register, long-form, every register, at the joint pair:

| register | n | shipped fp32 | c4a fp32 | shipped web | c4a web |
|---|---|---|---|---|---|
| story (fiction) | 260 | 23 = 8.85% | **12 = 4.62%** | 26 = 10.00% | **18 = 6.92%** |
| academic-discussion | 420 | 8 = 1.90% | **1 = 0.24%** | 21 = 5.00% | **15 = 3.57%** |
| academic-conclusion | 360 | 7 = 1.94% | 2 = 0.56% | 9 = 2.50% | 8 = 2.22% |
| academic-introduction | 420 | 1 = 0.24% | 1 = 0.24% | 6 = 1.43% | 2 = 0.48% |
| academic-lit-review | 225 | 0 | 1 = 0.44% | 2 = 0.89% | 4 = 1.78% |
| **company-update** | 662 | 1 = 0.15% | **3 = 0.45%** | 5 = 0.76% | **18 = 2.72%** |
| longform-journalism | 840 | 3 = 0.36% | 3 = 0.36% | 8 = 0.95% | 13 = 1.55% |
| white-paper | 840 | 2 = 0.24% | 3 = 0.36% | 12 = 1.43% | 10 = 1.19% |
| student-essay | 420 | 0 | 1 = 0.24% | 0 | 1 = 0.24% |
| research-summary | 189 | 0 | 0 | 1 = 0.53% | 1 = 0.53% |

Fiction and academic discussion improve on **both** runtimes. Company updates
are the row to publish: 1/662 → 3/662 on the server, and **5/662 → 18/662 =
2.72% in the browser**, on the register the handover already records as weakest
by AUROC (0.6935). §12.4 reported 10/662; that was the fp32-only pair, and at
the pair that would actually ship the server figure is 3/662 while the browser
figure is six times worse than the server's. Both belong in the weakness table.

Short-form human false positives improve sharply on both routes: held-out
passages go 17/3,445 to 1/3,445 on fp32 and 15/3,445 to 2/3,445 in the browser,
and the Internet Archive fiction source goes 11/400 to 1/400 on fp32 and 7/400
to 1/400 in the browser.

### 18.5 The owner's nine documents, both runtimes, at the joint pair

| document | side | ship fp32 | ship web | c4a fp32 | c4a web |
|---|---|---|---|---|---|
| 1 panda-penguin | human | 0.0223 clear | 0.0634 clear | 0.0520 clear | 0.0883 clear |
| 2 social-objectives | human | 0.0544 clear | 0.1933 clear | 0.0506 clear | 0.1312 clear |
| 3 esports | human | 0.0326 clear | 0.0495 clear | 0.0661 clear | 0.0841 clear |
| 4 facebook-stale | human | 0.1172 clear | 0.1325 clear | 0.0764 clear | 0.1005 clear |
| 5 mobile-algorithm | human | 0.2078 clear | 0.2985 clear | 0.2200 clear | 0.5244 clear |
| 6 eu-ranking | human | 0.0893 clear | 0.2191 clear | 0.0394 clear | 0.0578 clear |
| 7 unedited gpt-5.5 | AI | 0.9718 clear | 0.9765 clear | 0.9619 **FLAG** | 0.9619 **FLAG** |
| 8 heavily edited by hand | AI | 0.9856 FLAG | 0.9868 FLAG | 0.9601 **FLAG** | 0.9611 **FLAG** |
| 9 humanised article | AI | 0.8082 clear | 0.9575 clear | 0.9626 **FLAG** | 0.9626 **FLAG** |

**All three AI documents flag and all six human documents stay clear, on both
runtimes, and the two routes agree on all nine.** Document 7 flags at 0.9619
against a primary of 0.961692 — a margin of 0.0002. Nine documents are nine
documents, and one of them is decided by the fourth decimal place.

### 18.6 Why all of this is fragile: the probability ceiling

One mechanism explains the moved pair, the gate failure, the short-form
sensitivity and the WebGPU exposure, and it is measurable rather than argued.

Cycle 4a's fitted temperature is 1.7298 against the shipped model's 0.8324. The
calibrated probability is `sigmoid(margin / T)`, so a larger temperature
compresses the whole score range. Over all 21,093 segments of the corpus:

| | shipped model | cycle 4a |
|---|---|---|
| highest segment probability reached, fp32 | 0.990381 | **0.962987** |
| highest segment probability reached, browser | 0.990346 | **0.963070** |
| share of segments at or above 0.97 | 20.58% fp32 / 22.38% web | **0.00% / 0.00%** |

**Cycle 4a cannot produce a score of 0.9855.** Its ceiling is 0.9630, and the
joint primary of 0.961692 sits 0.0013 below that ceiling. Everything the model
is confident about is stacked into a band about a thousandth wide, and the flag
point is inside it. That is why:

* the pair had to move at all — the shipped pair flags nothing, 0/922;
* the 100-word band swings 33 points on a 0.002 threshold move;
* **3,808 of 21,093 browser segments sit within 0.002 of the joint primary**,
  against 708 for the shipped pair — 5.4× the exposure to any numerical
  difference between runtimes or providers.

### 18.7 The quantisation gate: why it misses, and it did not close

The gate is unchanged and was not touched: mean fp32→int8 probability drift
under 0.05, verdict-flip rate under 0.01 at each of five calibration thresholds.

The calibration split had to be reconstructed first. `dataset.jsonl` on disk is
no longer the file cycle 4a was exported on — it was rebuilt for arm C, from
27,454 rows to 28,295 and from 3,240 cal rows to 3,344.
(**§12.2's "28,295 rows" describes arm C's corpus, not cycle 4a's**;
`dataset-manifest-v1.json` records cycle 4a's 27,454.) Excluding
`ai-registers-matched.jsonl` after its first 217 lines plus all of
`ai-long.jsonl` reproduces the v1 manifest's per-split deltas exactly — train
+531, cal +104, test +206 — and restores the 3,240-row split. Re-exporting
cycle 4a from the checkpoint reproduces the shipped int8 file **byte for byte**
(`6c5d963a8ffd1e41`) and its gate figures exactly: mean drift 0.0090, worst
flip rate 0.01204.

**It is the export, not the calibration sample and not where the thresholds
fell.** The 2×3 test, all on the same 3,240 rows:

| | worst flip rate | |
|---|---|---|
| cycle 4a export, own thresholds, all rows | 0.01204 | FAIL |
| cycle 4a export, rows carried over from cycle 3 | 0.01319 | FAIL |
| cycle 4a export, rows added in cycle 4 | 0.01253 | FAIL |
| cycle 3 export, own thresholds, same rows | 0.00617 | pass |
| cycle 3 export, only the rows added in cycle 4 | 0.00895 | pass |
| cycle 4a export at **cycle 3's** thresholds | 0.01142 | FAIL |
| cycle 3 export at **cycle 4a's** thresholds | 0.00957 | pass |

The new fiction and register rows do not break it: cycle 3's export passes on
those very rows. Cycle 4a fails on the old rows too, and at cycle 3's
thresholds as well as its own.

The mechanism is the ceiling again, and it is **density, not error size**. At
the failing threshold the flipping rows are not the badly-quantised ones — their
mean |Δmargin| is 0.1614 against cycle 3's 0.1975. What changed is how many
rows are parked next to the threshold:

| at the 2% calibration threshold | cycle 3 | cycle 4a |
|---|---|---|
| rows within 0.25 of the threshold | 68 | **155** |
| verdict flips | 17 | **39** |
| mean \|Δmargin\| of flipping rows | 0.1975 | 0.1614 |
| mean \|fp32 margin\| over all rows | 3.347 | **4.532** |

2.3× the density, 2.3× the flips. The quantisation error is also *better* at
the median (0.0289 against 0.0507) and worse only in the tail (30 rows above
1.0 against none), and no flip at that threshold comes from a row more than
0.36 away from it.

**Two candidate fixes were tried and both fail. The gate did not close.**

| int8 export | mean drift | worst flip rate | |
|---|---|---|---|
| per-channel — what cycle 4a ships | 0.0090 | 0.01204 | FAIL |
| per-channel + `reduce_range=True` | 0.0159 | **0.02130** | FAIL, worse |
| per-channel, classifier head excluded | 0.0090 | 0.01204 | inconclusive |

`reduce_range` is the standard remedy for int8 saturation and it makes this
model worse, which is consistent with the diagnosis: the binding problem was
never the size of the error, and spending a bit of weight precision to buy
headroom just adds noise. The head-exclusion probe produced a **byte-identical
file**, so `quantize_dynamic` never quantised those Gemm nodes in the first
place; it is a no-op and proves nothing either way.

The honest conclusion: **the gate cannot be met by changing how this checkpoint
is exported, because the defect is in the checkpoint's calibration, not in the
quantisation.** A model whose whole decision region is a thousandth wide will
fail a flip-rate gate under any 8-bit scheme. The fix is a model whose scores
are not stacked against a ceiling — a lower fitted temperature, or a
temperature fitted under a spread constraint — which is a training change, not
an export change. **The gate's threshold was not moved and must not be.**

### 18.8 What the disagreeing documents have in common

Two different comparisons get called "the flips" and they are not the same:

* **Python int8** — fp32 ONNX against int8 ONNX, both under Python
  onnxruntime. That is what the export gate and `int8_at_operating_point.py`
  measure: 10 documents in 2,100 at the fp32-only pair, 8 AI and 2 human, with
  a 3.07% segment-level flip rate. It is a property of the file.
* **Browser int8** — fp32 under Python onnxruntime against the int8 file under
  onnxruntime-web. That is the pair of runtimes a visitor actually gets, it is
  the one §4.4 is about, and it is larger, because the web build does not apply
  the extended int8 fusions Python applies at `ORT_ENABLE_ALL`.

Measured on all 5,558 documents at the joint pair, the browser comparison gives
80 disagreements, and they have one thing in common:

* **every single one sat on the fence.** The nearer route's decision key was
  within **0.00684** of the primary for all 80, median 0.00155. For scale, 647
  of 5,558 documents sit within 0.01 of the primary on the server route — the
  disagreements are drawn entirely from that fence population and never from
  anywhere else. The routes do not disagree about a document either of them has
  an opinion about.
* **79 of 80 are browser-only flags** — the browser scores systematically
  higher in the decision region.
* they are spread across registers, worst in academic-essay (4/132 = 3.03%),
  academic-discussion (16/533 = 3.00%) and academic-lit-review (8/332 = 2.41%),
  and they rise with length, 0.24% below 600 words to 2.50% above 2,000.
* per-segment probability difference between the routes is barely elevated on
  them — median 0.0609 against 0.0333 corpus-wide.

### 18.9 WebGPU: the question this pair reopens

`WEBGPU-PARITY.md` closed WebGPU for the **shipped** pair, on the finding that
WASM and WebGPU agree to five decimals above 0.97 (median 0.000075) and diverge
most at 0.50–0.90 (median 0.0175). That finding was measured where the shipped
model's decision region is: 22.38% of its segments score at or above 0.97.

**Cycle 4a has no segments above 0.97 at all.** Its ceiling is 0.9630.

| browser segments, 21,093 total | shipped model | cycle 4a |
|---|---|---|
| in 0.97+ — providers proven to agree | 4,720 = 22.38% | **0 = 0.00%** |
| in 0.90–0.97 — **not characterised** | 1,878 = 8.90% | **6,714 = 31.83%** |
| in 0.50–0.90 — providers diverge most | 4,313 = 20.45% | 2,925 = 13.87% |
| within 0.002 of the primary | 708 | **3,808** |

The joint pair `0.961692 / 0.952714` sits **below** the range where the two
providers were shown to agree, in a band `WEBGPU-PARITY.md` explicitly does not
characterise, with 5.4× as many segments within 0.002 of the flag point. The
mechanism that made the shipped pair safe — both providers pinned against the
same saturated ceiling — does not apply here, because cycle 4a's flag point is
not at a saturated logit. **WebGPU is out of scope for this measurement and it
is reopened by this pair, not closed. It would have to be re-measured before
this model ships to browser visitors.**

### 18.10 Recommendation

**Do not ship cycle 4a.** Not because the corpus work was wrong — §15 stands on
that, and the fiction result is real on both runtimes — but because the model's
calibration leaves no room to stand:

1. A single pair does serve both routes, so §12's constraint is satisfiable and
   no per-route parameter is needed. That question is answered.
2. But the pair is `0.961692 / 0.952714`, not `0.959674 / 0.950715`, and at it
   the headline short-form gain is 43.86% at 100 words, not 77.19%. The
   published claim does not survive the browser fit.
3. The quantisation gate is missed and cannot be closed by re-exporting.
4. Route disagreement rises 0.99% → 1.44%.
5. Company updates reach 2.72% in the browser on the weakest register measured.
6. The WebGPU question reopens.

Every one of those traces to the same cause: a fitted temperature of 1.7298
that compresses the score range into a ceiling of 0.9630. **The recommendation
is to re-fit the temperature — or retrain epoch selection under a calibration
spread constraint — and re-run this section.** That is compute on data already
held, it needs no generation and no spend, and it would plausibly recover the
77% short-form figure with a gate that passes and a decision region back above
0.97 where the providers are known to agree.

Nothing was deployed and `thresholds.json` was not touched.

### 18.11 What is here

| path | |
|---|---|
| `cycle4-operating-point/browser_score.mts` | browser int8 scoring, model and temperature as arguments |
| `cycle4-operating-point/fit_joint.py` | the joint fit and every table in §18.2–18.5 |
| `cycle4-operating-point/quant_gate_diagnosis.py` | v1 cal reconstruction and the 2×3 gate test |
| `cycle4-operating-point/reexport_variants.py` | the three int8 exports against the unchanged gate |
| `cycle4-operating-point/disagreement_anatomy.py` | §18.8 |
| `cycle4-operating-point/results/*` | the raw output every table is cut from |

Scored files, shards and the probe ONNX files are excluded by the repository's
research-data rules, as every previous cycle's are.

### 18.12 Limits

* WebGPU was not measured. §18.9 states why that is now a reopened question
  rather than a closed one.
* The 100-word band is 57 held-out documents. 25/57 has a Wilson interval of
  31.8–56.7%, which overlaps neither 19.30% nor 77.19% comfortably.
* The joint fit's constraint is false-positive parity against the shipped model
  on each route. A different constraint gives a different pair; this one is the
  one `thresholds.json` records for the pair in production.
* Mixed human/AI documents were not measured here either, and §9.1 of the
  handover records that this corpus cannot see that axis.
* The nine documents are nine documents, and document 7 clears the primary by
  0.0002.
* **A tokeniser discrepancy was found while cross-checking and is recorded
  rather than smoothed over.** Scoring cycle 4a's fp32 route with the
  checkpoint's own `tokenizer.json` instead of the deployed
  `reference-server/model/tokenizer` vocabulary changes the segment count on 8
  of 1,248 short-form AI documents, and 42 rows differ between the two runs by
  at most 0.01 in a segment probability. Long-form is unaffected: `lf-ai`,
  `lf-hu` and the nine are byte-identical either way, and both Python runs
  disagree with the shipped TypeScript tokeniser on the same 8 short documents.
  None of the 8 is in the held-out test split, and all four held-out short-form
  bands are identical under both — 25/57, 58/61, 65/69, 73/75 — so no figure in
  §18 moves. It is a sub-400-word segmentation edge, it belongs to the
  segmentation contract rather than to this model, and it should be chased
  separately.

---

## 19. Correction to §12.3, and the re-fit

Appended 30 August 2026. §12.3 and §18 are left standing as written; this
section corrects them, in the convention this programme uses elsewhere.

### 19.1 The correction: what 77.19% was, and what it was not

§12.3 records **44/57 = 77.19%** at 100 words as bar 1 cleared, and §15 repeats
it as the headline of the cycle. That figure was reported onward to the owner as
a cleared acceptance bar. It should not have been.

**It was fitted on the fp32 server route alone, at a pair — `0.959674 /
0.950715` — that is not false-positive-neutral on the other route.** In the
browser that pair costs **148/4,636** human false positives against the shipped
model's 90/4,636. HANDOVER §4.4 and §12 make one shared flag point binding, so a
pair the browser cannot afford is not an operating point this tool can use, and
a detection figure measured at it does not describe anything shippable.

At a pair that does serve both routes, the same model and the same documents
give:

| 100-word held-out AI detection | |
|---|---|
| shipped model | 11/57 = 19.30% |
| §12.3's fp32-only pair `0.959674/0.950715` | 44/57 = **77.19%** |
| §18's joint pair `0.961692/0.952714` | 25/57 = **43.86%** |
| §19's margin-space fitted pair (below) | 38/57 = **66.67%** |

**The 77.19% must not be quoted.** It is the difference between "solves the
short-content problem" and "improves it", and no reader should have to reach
§18 to discover that. The honest range for this checkpoint, at a pair that
serves both runtimes, is 43.86% to 68.42% depending on one fitted parameter —
see §19.3, which is itself a finding about how unsettled the figure is.

### 19.2 Re-fitting the temperature does not do what was expected

The re-fit was tested before anything was retrained, and it can be tested
exactly and for free: the scored files hold `p = sigmoid(m / 1.7298)`, so
inverting gives the margin the network produced and any candidate temperature
is a relabelling of a forward pass already measured.

**Temperature is strictly monotone in the margin. It cannot change which
segment outranks which, so it cannot change detection or false positives at the
corresponding point.** The one thing it does move is the shipped rule's second
condition, because that condition pins the secondary to a fixed *ratio of the
primary in probability space*, and a probability ratio is not scale-free:

| | margin gap the inherited ratio buys |
|---|---|
| shipped model, T = 0.8324 | 0.4168 |
| cycle 4a, T = 1.7298 | 0.3804 |
| T = 2.0325 | 0.2875 |
| T = 2.5 | 0.2261 |

Re-fitting the joint pair at each temperature, under the identical constraint:

| T | joint pair | fp32 FP / det | browser FP / det | 100w |
|---|---|---|---|---|
| 1.2095 | 0.995657 / 0.986362 | 25 / 887 | 90 / 903 | **0/57** |
| **1.7298** (as fitted) | 0.961692 / 0.952714 | 27 / 891 | 90 / 906 | 25/57 |
| 2.0325 | 0.937977 / 0.929221 | 29 / 893 | 90 / 903 | 39/57 |
| 2.5 | 0.900431 / 0.892025 | 27 / 890 | 89 / 900 | 42/57 |

A *lower* temperature — the direction the proposal implied, to lift the scores
back above 0.97 — makes short form **worse**, and below about 1.2 the rule
degenerates: the inherited ratio demands a primary the model cannot reach, only
the second-section condition operates, and single-segment documents (which is
what a 100-word document is) can never satisfy it. **0/57.**

So "re-fit the temperature" turns out to mean "change the margin gap, indirectly
and without saying so". §19.3 does it directly.

### 19.3 The operating point fitted in margin space

Stated before fitting:

* **Constraint**, unchanged: one pair for both routes; fp32 false positives
  ≤ 45/4,636 **and** browser false positives ≤ 90/4,636.
* **Objective**: maximise long-form AI detection on the **browser** route — the
  binding route — ties broken by fp32 detection, then larger gap, then lower
  primary. This is the direct generalisation of "lowest primary", which
  maximises detection when there is only one free parameter.
* **Short-form detection is deliberately not in the objective**, because it is
  the capability under discussion and fitting to it would make the resulting
  figure a restatement of the fit rather than a measurement of it.

The rule is unchanged — highest section reaches the primary, or second-highest
reaches the secondary — but parameterised as `max(m₁, m₂ + g) ≥ a`, so the gap
`g` is fitted rather than inherited from a model with a different score scale.

**Fitted: margin `5.5413 / 5.2013`, gap `0.34` — probability `0.960964 /
0.952885` at T = 1.7298.**

| | fp32 server | browser int8 |
|---|---|---|
| long-form AI detected | 893/922 = 96.85% | 906/922 = 98.26% |
| long-form human false positives | 28/4,636 = 0.60% | 90/4,636 = 1.94% |
| route disagreement | 77/5,558 = 1.39% | (shipped model: 55/5,558 = 0.99%) |

Short-form, held-out test split — fp32 / browser: **100w 38/57 = 66.67% /
39/57 = 68.42%**; 300w 59/61 / 59/61; 400w 66/69 / 66/69; 600w 73/75 / 73/75.
Short-form human false positives 13/4,368 fp32 and 14/4,368 browser.

Long-form by band, every band at or above the shipped model on both routes:
600–849 48/52 fp32 and 52/52 browser; 850–1,199 181/193 and 184/193;
1,200–1,999 381/389 and 385/389; ≥2,000 281/285 and 283/285.

By register, fp32 / browser: story **11/260 = 4.23% / 18/260 = 6.92%**
(shipped 23/260 fp32 and 26/260 browser — better on both routes);
academic-discussion 1/420 / 14/420 (shipped 8/420 and 21/420 — better on both);
**company-update 3/662 / 18/662 = 2.72%** (shipped 1/662 and 5/662 — worse on
both, and this remains the row to publish); longform-journalism 5/840 / 14/840;
white-paper 3/840 / 10/840; research-summary 0/189 / 1/189.

**The owner's nine: all three AI documents flag and all six human documents
clear, on both runtimes, with the two routes agreeing on all nine.**

### 19.4 The frontier, and why the objective is the owner's to choose

The gap trades long-form evidence against short-form reach, monotonically: a
larger gap lets two mediocre sections convict a long document, which costs
false positives, which forces the primary up, which is exactly the bar a
single-segment 100-word document has to clear.

| gap | fp32 FP / det | browser FP / det | 100w |
|---|---|---|---|
| 0.00 | 35 / 883 | 90 / 891 | **44/57 = 77.19%** |
| 0.10 | 35 / 883 | 90 / **897** | **44/57 = 77.19%** |
| 0.20 | 27 / 891 | 90 / 899 | 42/57 = 73.68% |
| **0.34 — fitted** | 28 / 893 | 90 / **906** | 38/57 = 66.67% |
| 0.38 — inherited (§18) | 27 / 891 | 90 / 906 | 25/57 = 43.86% |
| 0.40 | 27 / 891 | 90 / 906 | 15/57 = 26.32% |

Every row satisfies both routes' false-positive budgets. **At gap 0.10 the full
77.19% survives, with browser long-form detection at 897/922 — still above the
shipped model's 889/922 — and fp32 long-form exactly level at 883/922.** The
pre-stated objective does not select it, because it maximises long-form
detection and 0.34 wins that by 9 documents. Reporting it and then choosing it
would be fitting to the bar after seeing the answer, so it is reported and not
chosen. **Which capability this tool should buy with that gap is a decision for
the owner, not a measurement**, and it is the same shape of decision §9.1 of the
handover records for the minimum-evidence rule.

### 19.5 The fitted gap is not stable enough to quote a short-form figure from

200 random halves of the human corpus, gap refitted on each under the same
constraint at half the budget:

| | |
|---|---|
| full-corpus gap | 0.34 |
| split-half median | **0.40** |
| p10 / p90 | 0.36 / 0.44 |
| within 0.2 of the full-corpus gap | 200/200 |

The gap is not being fitted to noise — every half lands in a narrow band. But
**that band spans 0.36 to 0.44, and over it 100-word detection runs from about
38/57 down to 15/57.** The sampling variability of the fitted parameter is
larger than the difference between "two thirds of short AI caught" and "a
quarter". No short-form figure quoted for this checkpoint is stable, at any
pair, and that is a property of the checkpoint rather than of the fitting
method.

### 19.6 The quantisation gate is unchanged, and provably so

**Re-fitting the temperature cannot affect the gate at all.** The five
thresholds are margin quantiles of the calibration split's human distribution,
and the flip test is `(m32 > t) ≠ (m8 > t)`. No temperature appears in either.
Recomputed from the cached margins: **worst flip rate 0.01204**, identical, as
it must be. The drift criterion passes at every temperature tried (0.0098,
0.0096, 0.0090, 0.0086 at T = 0.8324, 1.2095, 1.7298, 2.0325, against a limit
of 0.05).

So the gate is untouched by everything in §19, it still fails, and §18.7 stands:
it is the export, it cannot be closed by re-exporting, and it cannot be closed
by re-calibrating either. **Only retraining reaches it. The limits were not
moved.**

### 19.7 Correcting §18.9 on WebGPU

§18.9 said the fitted pair sits "below the measured-agreement range" because no
cycle-4a segment reaches 0.97. **That was stated in the wrong space and it
overstates one side of the question.** 0.97 is a probability label on the
shipped model's temperature; the quantity the two providers actually operate on
is the margin. Restated properly:

| | shipped model | cycle 4a |
|---|---|---|
| model's own maximum margin | 3.855 | 5.641 |
| flag-point margin | 3.512 | 5.541 |
| flag point as a share of the ceiling | 91.1% | **98.2%** |
| segments within 0.10 margin of the flag point | 572 / 21,093 | **4,005 / 21,093** |

`WEBGPU-PARITY.md`'s agreement region — above 0.97 on the shipped scale — is a
margin of 2.894. **Both flag points are far above it, and cycle 4a's is deeper
into saturation, not shallower.** If the mechanism is "both providers pinned
against a saturated logit", that argues cycle 4a should agree at least as well.
If the mechanism is "few segments near the flag point", cycle 4a is seven times
worse. The two considerations point in opposite directions and **only measuring
WebGPU on this checkpoint settles it.** That was not done here — it needs a real
browser on real GPU hardware, as the original parity work did.

The correct status is **open**: not closed by inheritance from the shipped pair,
and not shown to be worse either. §18.9's stronger claim is withdrawn.

### 19.8 Is the saturating temperature this run, or the corpus?

| | corpus | epoch | T | AI calibrated p90 |
|---|---|---|---|---|
| cycle 3 | cycle-3 | 0 | 1.2095 | 0.982 |
| arm A, rebalance | cycle-3, reweighted | 0 | 1.1979 | 0.982 |
| **cycle 4a** | + fiction and registers | 1 | **1.7298** | **0.963** |
| **cycle 4b** | + long documents | 2 | **2.0325** | **0.951** |

Re-weighting the old corpus does not move it — arm A sits on cycle 3's number.
The compression arrives with the new data and deepens as more of it is added.
**But epoch is confounded with corpus**: both cycle-3 arms selected epoch 0 and
both cycle-4 arms selected a later epoch, and more training on any corpus
pushes a classifier towards overconfidence, which is what a rising fitted
temperature corrects for. The evidence points at the corpus and cannot rule out
the epoch.

**The experiment that separates them is one training run: epoch 0 on the cycle-4
corpus.** If its temperature lands near 1.2 the cause is training length and the
fix is epoch selection; if it lands near 1.7 the cause is the corpus and every
future cycle built on this data inherits it. That matters for planning the next
cycle and not only this one, and it is compute on data already held.

### 19.9 Recommendation, and where this stops

**Still do not ship, and the re-fit did not fully recover the short-form gain
under the pre-stated objective — 66.67%, not 77.19%.** Per the instruction to
say so and stop rather than fit a third time, this is where it stops.

What changed for the better: fitting the gap instead of inheriting it puts
cycle 4a ahead of the shipped model on both routes on long-form detection
(893/922 and 906/922 against 883 and 889), inside both false-positive budgets,
better on fiction and academic on both routes, band by band with no sag, and
flagging all three of the owner's AI documents on both routes. That is a real
model and a real improvement, and §18's picture was unduly bleak because it
inherited a parameter it should have fitted.

What still blocks it, all three unchanged by anything in §19:

1. **The quantisation gate fails at 0.01204 and is provably out of reach of
   both re-exporting and re-calibrating.** Only retraining touches it.
2. **The fitted gap's sampling variability spans 38/57 to 15/57 at 100 words.**
   There is no stable short-form claim to publish from this checkpoint.
3. **WebGPU is open** (§19.7), and this pair has seven times the segment
   density at the flag point that the shipped pair has.

All three trace to the same place as §18.6 did: a decision region a fraction of
a margin unit wide with thousands of segments inside it. **The single next step
is the training run in §19.8** — epoch 0 on the cycle-4 corpus, or an explicit
calibration-spread constraint in epoch selection — because it is the only lever
that reaches the gate, the density and the stability at once. It needs no
generation and no spend.

Nothing was deployed. `thresholds.json` was not touched.

### 19.10 What is here

| path | |
|---|---|
| `cycle4-operating-point/temperature_refit.py` | §19.2, the temperature sweep |
| `cycle4-operating-point/fit_margin_space.py` | §19.3–19.5, the two-parameter fit and the split-half validation |
| `cycle4-operating-point/results/temperature-refit.txt` | |
| `cycle4-operating-point/results/margin-fit.txt`, `margin-fit.json` | |
| `cycle4-operating-point/results/gate-and-webgpu-in-margin-space.txt` | §19.6–19.7 |

---

## 20. Epoch 0 on the cycle-4 corpus: the compression is the corpus, and the gate and short form are in direct conflict

Appended 30 August 2026. §19.8 named one training run as the experiment that
separates corpus from training length. It was run. It answers that question
cleanly and it settles this cycle.

### 20.1 The experiment, and that it is a clean one

`cycle4-fiction/dataset.jsonl` had been rebuilt for arm C, so the cycle-4a
corpus was reconstructed first: excluding `ai-registers-matched.jsonl` after its
first 217 lines plus all of `ai-long.jsonl` gives **27,454 rows, exactly the
count `dataset-manifest-v1.json` records**, with the per-split deltas matching
to the row.

Retrained from the same cycle-2 checkpoint, same data, same seed, same 3-epoch
OneCycleLR schedule — `C4_FORCE_EPOCH` overrides which epoch is *selected*, never
the schedule, so "epoch 0" means what it meant in the cycle-4a run. **The run is
deterministic: the calibration AUROC history reproduces cycle 4a's at every
epoch — 0.9566, 0.9758, 0.9831, 0.9804.** Epoch is therefore the only variable.

### 20.2 The compression is the corpus. Training length is ruled out.

| | corpus | epoch | fitted T | AI calibrated p90 |
|---|---|---|---|---|
| cycle 3 | cycle-3 | 0 | 1.2095 | 0.982 |
| arm A, rebalance | cycle-3, reweighted | 0 | 1.1979 | 0.982 |
| **epoch-0 arm (this section)** | **cycle-4** | **0** | **1.7137** | **0.950** |
| cycle 4a | cycle-4 | 1 | 1.7298 | 0.963 |
| cycle 4b | cycle-4 + long docs | 2 | 2.0325 | 0.951 |

**Epoch 0 on the cycle-4 corpus fits 1.7137 — cycle 4a's 1.7298, not cycle 3's
1.2095.** The confound §19.8 recorded is resolved: the saturating temperature
arrives with the corpus at the first epoch and training length adds almost
nothing to it. Its probability ceiling is **0.9506**, *lower* than cycle 4a's
0.9630, and **0.00% of its 21,093 segments reach 0.97** on either runtime.

**This is the planning fact, and it outlives this model: every future cycle
trained on this corpus inherits the compression.** A cycle that wants its
decision region back above 0.97 has to change the data or the calibration
objective, not the epoch. It also means §19.7's WebGPU question stays open for
any model built on this corpus, not just for cycle 4a.

### 20.3 The gate closes at epoch 0

| | worst verdict-flip rate | mean drift | gate |
|---|---|---|---|
| cycle 4a, epoch 1 | 0.01204 | 0.0090 | **fail** |
| **epoch 0** | **0.00741** | 0.0088 | **pass** |

Measured by `cycle4-fiction/export_onnx.py` unchanged, on the reconstructed
3,240-row calibration split. **The limits were not touched.** §18.7 said only
retraining could reach the gate; it can, and one epoch fewer is enough.

### 20.4 And short form collapses

Fitted the same way as §19.3 — margin space, both runtimes, constraint and
objective stated in advance, gap fitted rather than inherited.

**Fitted pair: margin `5.0515 / 4.9315`, gap `0.12` — probability `0.950155 /
0.946732` at T = 1.7137.**

| | shipped | cycle 4a (epoch 1) | **epoch 0** |
|---|---|---|---|
| 100-word held-out, fp32 | 11/57 = 19.30% | 38/57 = 66.67% | **1/57 = 1.75%** |
| 100-word held-out, browser | 8/57 = 14.04% | 39/57 = 68.42% | **2/57 = 3.51%** |
| 300w / 400w / 600w, fp32 | 43/61, 44/69, 64/75 | 59/61, 66/69, 73/75 | 56/61, 64/69, 73/75 |
| long-form fp32 | 883/922 | 893/922 | 889/922 |
| long-form browser | 889/922 | 906/922 | 894/922 |
| fp32 human FP | 45/4,636 | 28/4,636 | 39/4,636 |
| browser human FP | 90/4,636 | 90/4,636 | 90/4,636 |
| fiction fp32 | 23/260 = 8.85% | 11/260 = 4.23% | 20/260 = 7.69% |
| route disagreement | 55/5,558 = 0.99% | 77/5,558 = 1.39% | **56/5,558 = 1.01%** |

**100-word detection is 1/57. That is worse than the shipped model and worse
than doing nothing.** It is not an artefact of the fitted gap: the whole
frontier was swept and the best any gap achieves is **18/57 at gap 0.00**, which
costs browser long-form detection 871/922. The short-form capability is simply
not present in the epoch-0 checkpoint.

Two other things fail with it:

* **The 600–849 word band is 45/52 = 86.54% on fp32, below the shipped model's
  46/52 = 88.46%** — so the long-form floor fails band by band even though the
  aggregate clears, which is the exact failure mode the band table exists to
  catch.
* **The fitted gap is far less stable**: split-half median 0.10 with a p10–p90
  band of 0.10 to 2.00, against epoch 1's 0.36–0.44.

The owner's nine are all correct on both runtimes (three AI flag, six human
clear), and fiction stays under its bar at 7.69%, but neither compensates.

### 20.5 What this settles: the honest ceiling of this cycle

The two defects have **different causes, and the fixes are opposed**:

| | cause | epoch 0 | epoch 1 |
|---|---|---|---|
| saturating temperature, probability ceiling | **the corpus** | 1.7137 / 0.9506 | 1.7298 / 0.9630 |
| quantisation gate | **training length** | **passes** 0.00741 | fails 0.01204 |
| 100-word detection | **training length** | **1/57** | **38/57** |

The second epoch is what teaches this model short text, and it is the same
second epoch that sharpens the decision region enough to fail the gate. **On
this corpus, the quantisation gate and the short-form capability cannot both be
had by choosing an epoch.** That is the honest ceiling of cycle 4, it is
measured rather than argued, and no further threshold fitting will move it —
§19.6 already proved the gate is out of reach of both re-exporting and
re-calibrating.

### 20.6 Recommendation

**Reject epoch 0, and cycle 4 does not ship in any of its four arms.**

* arm A (rebalance) — the free fix, fails (§11).
* **cycle 4a, epoch 1** — the best model this programme has produced on long
  form and fiction, and the only one with real short-form detection, but it
  misses the project's own quantisation gate and has no stable short-form
  figure to publish (§19.5).
* cycle 4b — 100-word detection worse than the shipped model (§13).
* **epoch 0** — closes the gate and destroys short form.

What the next cycle needs is not another epoch or another threshold. It needs
the calibration spread treated as a **training objective** rather than a
diagnostic read off afterwards — the compression is in the corpus, so it has to
be trained against, and the gate and the short bands both follow from it. That
is a change to `train.py`'s selection criterion and possibly to the loss, not a
change to any threshold, and it is compute on data already held.

Until then the shipped cycle-2 model stays, at `0.9855 / 0.9763`, with its
measured weaknesses published as they are.

Nothing was deployed. `thresholds.json` was not touched.

### 20.7 Limits

* Browser scoring of the 4,368-passage widened human short-form set was not run
  for epoch 0; it was deprioritised once the 100-word result made the arm
  unshippable. The fp32 figure is 9/4,368. Every other set was scored on both
  runtimes over the full corpus.
* WebGPU was not measured, and §19.7's status is unchanged: **open**. §20.2
  widens it — no model on this corpus reaches the band the parity work
  characterised.
* One training run separates corpus from epoch. It does not separate the corpus
  *composition* from its *size*, and it says nothing about a corpus built the
  same way but calibrated under a spread constraint.
* The nine documents are nine documents.
