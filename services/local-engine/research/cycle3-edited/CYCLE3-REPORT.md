# Cycle 3 — lightly-edited AI text

*28 August 2026. All figures measured, none estimated. Denominators shown throughout.
Every operating point is set by the realised false-positive rate on the same 4,636 fresh
human long-form documents, so cycle 2 and cycle 3 are compared like for like despite
having different score scales.*

---

## 1. The headline finding: the 0% was measuring the wrong thing

The brief's premise was that cycle 2 scores 0% on "AI text a human has lightly edited".
That number is real, but the band it comes from does not contain that kind of text.

The `light-edit` band is GRADTEX's `scenario_family=polish`. Every row carries a
`human_source_text` field. Measured on **the exact 268 of 269 corpus rows cycle 2 used**
that could be matched back to source (`gradtex-direction.json`):

| cycle-2 band | GRADTEX family | median word overlap with the **human** source | rows with a leaked prompt preamble |
|---|---|---|---|
| light-edit | polish | **0.935** | 42 / 268 (15.7%) |
| partial-completion | completion | 0.653 | 0 / 276 |
| paraphrase | paraphrase | 0.406 | 0 / 278 |
| style-rewrite | rewrite_style | 0.378 | 1 / 268 |
| full-generation | MGT | 0.134 | 0 / 316 |

The `light-edit` band is a **human document that an LLM has polished** — 93.5% of the
words are the human author's. It is the opposite direction from "generate, then tidy".
Scoring 0% on it is not a blind spot; flagging it at a 1.2% false-positive budget would
mean flagging any human writer who ran their own prose through a language model, which is
the single worst failure mode for a teacher-facing tool. One in six of those rows also
begins with a leaked instruction preamble ("The original text for the task is the
following.") — the band is contaminated as well as mislabelled.

**The real gap, found by looking for it properly, is different**: documents that are
*mostly or entirely AI but built on a human original*. On HAT-Bench's held-out split
(9,246 documents, group-split by essay, nine measured AI-token ratios), cycle 2 detects
only 29.7% / 30.8% / 34.8% of v6 / v7 / v8 — documents that are 80%, 93% and 100% AI by
token. That is the case worth closing, and cycle 3 closes about half of it.

**And "generate, then tidy" was never broken.** Put the 922 fresh AI long-form documents
through a programmatic human-tidy editor (contractions, cut transitions, split sentences,
typos, hedges, spelling swaps, dropped sentences) at six intensities, and cycle 2 still
detects **82.3%** at 1.19% false positives against 89.6% unedited. Light human editing of
an AI draft barely moves the shipped model. The 0% headline was an artefact of the band's
direction, not evidence of blindness.

---

## 2. What was built

| asset | what it is |
|---|---|
| `hat_full.py` | The **whole** locally-cached HAT-Bench — 57,885 rows, 2,259 essay groups — instead of the ~1,500-row sample cycle 2 drew. Group-aware splits that inherit cycle 2's assignment wherever an essay already appears, so cycle 2's held-out test stays held out. Test-band denominators go from 15–27 rows to ~1,020. |
| `editor.py` | A programmatic imitation of a human tidying a draft: contraction changes, British/American spelling swaps, transition-word deletion, sentence splitting and joining, reordering, deletion, hedge and aside insertion, synonym substitution, typo injection, em-dash removal. No API calls. |
| `build_data3.py` | 31,491 training rows: cycle-2's own data, the full HAT ladder, and a synthetic ladder over AI drafts and human documents. |
| `train3.py` | Same architecture, tokenizer and 2-logit head as cycle 2 — a drop-in export — but trained against a **soft** target: the document's AI word share, saturating at 0.85. Initialised from the cycle-2 checkpoint. |
| `eval3.py`, `ensemble.py`, `window_scoring.py`, `calibrate3.py`, `quant_check3.py` | Evaluation, ensembling, window aggregation, calibration and the quantisation gate. |

**The control that makes the synthetic data honest.** The identical editor is applied to
human documents and labelled human. If any operation left a fingerprint — the typos, the
hedges — it appears on both sides of the label and carries no information. Any gain has to
come from authorship signal. That control is 1,735 training rows and 1,200 held-out ones,
and its false-positive rate is measured below.

**No API spend.** `OPENROUTER_API_KEY` is not present in this environment, so no generation
was attempted. Everything here is derived from data already on disk.

---

## 3. Results — per edit band, before and after

All at **1.19% realised false positives on 4,636 fresh human long-form documents**.
"c2" is the deployed cycle-2 model; "c3" is `tier3-cycle3-e5small-fp32.onnx`.

### 3.1 Real LLM edits — HAT-Bench held-out (human original, progressively AI-rewritten)

| band | true AI token share | n | c2 | c3 | change |
|---|---|---:|---:|---:|---|
| v0 (pure human) | 0.00 | 1,032 | 0.68% FP | **0.00% FP** | better |
| v1 | 0.17 | 1,032 | 0.68% FP | **0.00% FP** | better |
| v2 | 0.27 | 1,032 | 1.55% | 0.78% | — |
| v3 | 0.42 | 1,032 | 3.39% | 3.00% | — |
| v4 | 0.46 | 1,033 | 2.23% | 2.13% | — |
| v5 | 0.65 | 1,021 | 16.9% | **27.2%** | +10.3 |
| v6 | 0.80 | 1,022 | 29.7% | **46.2%** | +16.5 |
| v7 | 0.93 | 1,020 | 30.8% | **49.6%** | +18.8 |
| v8 | 1.00 | 1,022 | 34.8% | **56.0%** | +21.2 |

v1–v4 are documents that are majority *human*. Their numbers are false-positive rates as
much as recall, and cycle 3 lowering them is the correct direction, not a loss.

### 3.2 By true AI share, pooled across every held-out set (24,145 documents)

| true AI share | n | c2 | c3 |
|---|---:|---:|---:|
| 0% (human) | 6,868 | 1.06% FP | **0.93% FP** |
| 1–20% AI | 818 | 0.12% | 0.00% |
| 20–40% AI | 1,977 | 6.22% | 1.72% |
| 40–60% AI | 1,988 | 10.3% | 6.14% |
| 60–80% AI | 1,822 | 34.1% | **40.4%** |
| 80–95% AI | 2,121 | 51.0% | **60.7%** |
| 95–100% AI | 2,254 | 59.7% | **71.5%** |

### 3.3 AI draft, human tidies — the brief's actual target case

922 fresh AI long-form documents put through the editor at six intensities.

| editor intensity (share of tokens touched) | n | c2 | c3 |
|---|---:|---:|---:|
| 4% | 154 | 89.0% | 89.0% |
| 8% | 154 | 90.3% | 86.4% |
| 12% | 154 | 77.9% | 77.9% |
| 18% | 154 | 83.8% | 81.8% |
| 25% | 153 | 78.4% | 79.1% |
| 35% | 153 | 74.5% | **81.1%** |
| **all edited** | 922 | 82.3% | **82.5%** |
| **human-edited control** (same editor on humans) | 1,200 | 0.92% FP | **0.75% FP** |

The control line is the important one: putting genuine human writing through the same
editor does not make the model flag it.

### 3.4 GRADTEX bands (cycle-2 test split, small denominators)

| band | n | c2 | c3 |
|---|---:|---:|---:|
| full-generation | 1,228 | 83.6% | **88.3%** |
| style-rewrite | 37 | 54.1% | 59.5% |
| paraphrase | 44 | 25.0% | **59.1%** |
| partial-completion | 38 | 10.5% | **34.2%** |
| light-edit (93.5% human words) | 49 | 0.0% | 2.0% |
| human | 4,901 | 0.22% FP | 0.24% FP |

### 3.5 No regression on fully-generated long-form

| | c2 | c3 |
|---|---:|---:|
| fresh long-form AI, 922 docs, 1.19% FP | 89.6% | **90.1%** |
| fresh long-form AUROC, 5,558 docs | 0.9916 | 0.9923 |
| company updates (99) | 100% | 100% |
| white papers (103) | 95.1% | 96.1% |
| research summaries (117) | 97.4% | 95.7% |
| academic lit reviews (107) | 96.3% | 97.2% |
| academic discussion (113) | 94.7% | 94.7% |
| academic essays (132) | 89.4% | 90.9% |
| long-form journalism (137) | 89.1% | 81.0% |
| **stories (114)** | 79.8% | **69.3%** |

Every long-form category still clears the 50% floor. **Stories regress by 10.5 points**
and journalism by 8.1 — the honest cost of this change, on the two registers whose human
counterparts are hardest. Stories remain 19 points above the floor.

### 3.6 Full operating curve, cycle 3

| FP budget | realised FP | threshold margin | fresh AI recall | edited AI recall |
|---|---:|---:|---:|---:|
| 0.5% | 0.47% | 4.221 | 85.1% | 77.8% |
| 1.22% | 1.19% | 4.061 | 90.1% | 82.5% |
| 2% | 1.96% | 3.897 | 92.3% | 87.1% |
| 3% | 2.98% | 3.724 | 94.4% | 90.4% |
| 5% | 4.96% | 3.491 | 96.1% | 93.0% |

Per-register human false positives at the 1.19% point: academic conclusions 3.33% (360),
stories 3.85% (260), academic discussion 2.86% (420), academic introductions 1.67% (420),
journalism 0.83% (840), company updates 0.60% (662), white papers 0.24% (840), lit reviews
0.44% (225), student essays 0.00% (420), research summaries 0.00% (189).

### 3.7 Score spread

Trained against a soft target, the raw sigmoid puts human documents near 0.5, which fails
criterion 2 outright. Two monotone recalibrations fitted on CAL fix it without touching the
ranking (`calibrate3.py`, `calibration3.json`):

| | c2 | c3 raw | c3 Platt-calibrated |
|---|---|---|---|
| human p10/p50/p90 | 0.032 / 0.188 / 0.834 | 0.187 / 0.559 / 0.827 | 0.006 / **0.157** / 0.730 |
| AI p10/p50/p90 | 0.965 / 0.978 / 0.979 | 0.898 / 0.921 / 0.924 | 0.904 / **0.943** / 0.948 |
| sd | 0.366 | 0.252 | **0.352** |
| share in the 0.80–0.90 band | 4.8% | 12.9% | **5.5%** |

**Never ship the raw sigmoid of this model.** Platt-calibrated, spread is preserved.

---

## 4. What worked, what did not

**Worked.** Using the whole HAT-Bench ladder rather than a 1,500-row sample, and training
against the AI *share* instead of a 0/1 class, is the change that moved the numbers: HAT
v6–v8 rose 16.5 to 21.2 points, the 95–100%-AI band rose 11.8 points, and fully-generated
long-form did not regress. Saturating the target at 0.85 mattered a great deal — the pure
proportion target (`eval-cycle3.json`, kept for comparison) pushed lightly-edited AI *down*:
edited recall fell from 82.3% to 59.4% and paragraph-mixed from 61.2% to 29.3%, because a
document that is 85% AI was being taught to score 0.85, which sits below any credible flag
threshold. Clamping everything at or above 85% AI to a full 1.0 recovered all of it and kept
the ordinal signal below the knee. Rank correlation with true AI share rose from 0.582 to
0.744 on 9,246 held-out documents.

**Window scoring worked, and is free.** Scoring 120-word windows at 50% overlap and taking
the **mean** beats whole-document scoring at the same false-positive rate: v5 27.2→35.2%,
v6 46.2→53.9%, v7 49.6→57.6%, v8 56.0→63.9%, with fresh AI recall unchanged at 90.1% and
v0 false positives 0.97%. Max and 90th-percentile aggregation were both *worse* than the
document score. This is a runtime change requiring no retraining and is the cheapest
remaining win (`window-cycle3b.json`).

**Did not work.** The paragraph-mixing case regressed badly: documents built by pasting real
human paragraphs into an AI draft fall from 61.2% (c2) to 33.4% (c3), and at a 60% human
share to 8.3%. Cycle 3 has learned to report the share honestly, and an honestly-reported
40%-AI document does not clear a 1.2%-FP threshold. That is defensible as a proportion
estimate and a genuine loss as a binary flag; it is the clearest argument for the ensemble.

**The ensemble helps but costs a second model.** Mapping both models' margins to their own
human false-positive percentile and taking the max gives, at 1.19% FP: fresh AI 92.5%,
v6 40.0%, v7 43.9%, v8 50.2%, edited 85.4%, mixed 60.2%, v0 false positives 0.00% — better
than either model alone on everything except v6–v8, where cycle 3 alone is 5–6 points
better. In a browser runtime that means shipping 68 MB rather than 34 MB. Worth it only if
paragraph-mixed documents matter more than AI rewrites.

**The absolute share estimate is not yet good enough to display.** Isotonic-calibrated, the
mean absolute error against HAT-Bench's true AI token ratio is 0.170 over 9,246 documents,
and pure-human documents come back with a median estimate of 0.228. The ordering is sound —
band medians rise monotonically 0.23, 0.29, 0.34, 0.40, 0.37, 0.66, 0.80, 0.82, 0.84 — but
the floor is wrong. It can honestly power a three-band verdict ("mostly human / mixed /
mostly AI"); it cannot yet be shown as a percentage.

**int8 quantisation fails the gate.** Per-channel dynamic int8 costs **5.2 points** of AI
recall at matched false positives (88.6% → 83.4% on 2,422 fresh long-form documents), with
2.97% of verdicts flipping. Cycle 2's bimodal outputs tolerated int8; a model whose scores
occupy the middle does not. `tier3-cycle3-e5small-int8-perchannel.onnx` is exported but
**marked not cleared for shipping** in `tier3-cycle3-config.json`. Ship fp32 (133.8 MB), or
requalify int8 with static calibration first.

---

## 5. Honest limits

- The "AI draft, human tidies" evaluation uses a **programmatic** editor, not human editors.
  It performs surface operations; a real editor restructures arguments. The held-out
  documents are genuinely unseen, but the *edit style* is the same one used in training, so
  section 3.3 measures generalisation to new documents, not to new editing behaviour. The
  real-data evidence for that direction is section 3.4's GRADTEX bands, whose denominators
  are 37–49 rows and too small to carry weight.
- HAT-Bench is student essays, research abstracts, news and business reports at 100–900
  words. Blog posts, marketing copy and stories have no equivalent graded ladder here.
- Nothing was regenerated and no API was called; `OPENROUTER_API_KEY` is absent.
- Cycle 3 has **not** been validated in the browser runtime, and the deployed model is
  unchanged. `tier3-cycle2-*` and `tier3-e5small-*` were never opened for writing.

## 6. What would close the rest — costed

The one thing missing that money can buy is **real** human-tidied AI text. 300 fresh AI
long-form documents, each re-edited by a strong model instructed to tidy as a working
editor would (restructure, cut, add a personal aside) at three intensities: ~900 calls,
~1,300 input and ~1,600 output tokens each. On a mid-tier model at roughly $0.30/M in and
$1.20/M out that is **about $2.10**, and on a cheap model under $0.60. It would give a real
held-out set for the direction section 3.3 can only approximate, and — held out of training
— would settle whether the synthetic editor generalises. That is the single highest-value
purchase available and it does not fit in the $0.70 remaining.

## 7. Reproducing

```
cd services/local-engine/research/cycle3-edited
python3 -m venv --system-site-packages .venv && .venv/bin/pip install transformers==4.44.2 scikit-learn pyarrow onnx onnxruntime
.venv/bin/python build_data3.py                      # ~25 min -> dataset3.jsonl (31,491 rows)
.venv/bin/python make_evalsets.py                    # ~20 min -> evalsets.jsonl (24,145 docs)
SATURATE=0.85 CKPT_NAME=cycle3b-checkpoint REPORT_NAME=train3b-report.json .venv/bin/python train3.py   # ~55 min, MPS
.venv/bin/python eval3.py "$PWD/cycle3b-checkpoint" eval-cycle3b.json
.venv/bin/python calibrate3.py && .venv/bin/python quant_check3.py
.venv/bin/python ensemble.py eval-cycle2-margins.json eval-cycle3b-margins.json
.venv/bin/python window_scoring.py "$PWD/cycle3b-checkpoint" window-cycle3b.json
CKPT_NAME=cycle3b-checkpoint .venv/bin/python export_onnx3.py
```

Artefacts: `eval-cycle2.json` (baseline), `eval-cycle3.json` (pure-proportion variant),
`eval-cycle3b.json` (shipped variant), `ensemble-c2-c3b.json`, `window-cycle3b.json`,
`calibration3.json`, `quant-check3.json`, `gradtex-direction.json`,
`../models/tier3-cycle3-*`.
