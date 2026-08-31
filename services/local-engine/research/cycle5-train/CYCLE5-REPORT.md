# Cycle-5 detection model — training and evaluation report

Opace AI Content Integrity, Tier 3. 31 August 2026, `cycle5-train/`. Assessed
against `OBJECTIVE.md` and the cycle-5 brief: structural features as model
inputs, calibration spread as a training objective, the int8 gate at every
checkpoint, the matched-pairs held-out slice as the first genuinely
independent evasion measurement, and the secondary flag point fitted in
margin space. British English; denominators throughout.

**Status: CANDIDATE.** Training, evaluation and export only. Nothing here is
deployed, no threshold changed, no live surface touched. The candidate is
`models/tier3-cycle5-full-e5small-int8-perchannel.onnx` (34.3 MB) with
`tier3-cycle5-full-config.json`; the decision is the owner's.

## Verdict against the gates

Baseline throughout: the shipped cycle-2 model at its live pair 0.9855/0.9763
on the fp32 server route, segments-v3 — reproduced exactly before anything
else was measured (harness proof: 883/922 AI, 45/4,636 human, matching the
published figures to the document). Candidate operating point: the margin
pair a=3.571, gap 0.34 (rule: flag iff max(m1, m2+0.34) >= 3.571), fitted to
match the shipped model's false-positive count on the same eval view;
split-half gap stability 0.34/0.26.

| # | gate | shipped | cycle-5 candidate | verdict |
| --- | --- | --- | --- | --- |
| 1 | Long-form detection, eval view (675 AI / 4,500 human) | 95.7% (646/675) at 41 FP | **97.5% (658/675) at 42 FP**; stories 96.6% (86/89) vs 94.4%, journalism 96.0% (97/101) flat — no register regresses | **PASS** |
| 2 | Matched-pairs held-out slice — first independent evasion measurement (192 AI, 418 human partners) | topic-bucket 83.5% (147/176); human partners FP **27.3% (114/418)** | topic-bucket **86.9% (153/176)**; human partners FP **0.2% (1/418)** | **PASS** (see §4) |
| 3 | Short-form curve must not collapse (cycle-4 killer; held-out test split) | 100w 19.6% (11/56), 300w 68.3%, 400w 64.7%, 600w 83.1% | 100w **76.8% (43/56)**, 300w 96.8% (61/63), 400w 98.5% (67/68), 600w 96.1% (74/77); held-out human short-form FP ≤ 0.1% per band | **PASS** |
| 4 | Score spread (criterion 2) + calibration | sd 0.3595 | sd **0.3981**, 4.1% of scores in 0.80–0.90, AI median 0.972 vs human 0.096; fitted T **1.0479** (cycle 4 died at 1.7137) | **PASS** |
| 5 | Human fiction / academic FP | fiction 8.8% (20/227); academic 0.8% (15/1992) | fiction **3.1% (7/227)**; academic 0.8% (15/1992) | **PASS** |
| 6 | int8-vs-fp32 delta, evaluated at EVERY epoch | — | per-epoch gate: flips 0.58%/0.58%/1.08% (epoch 2 FAILED the 1% bound and was rejected — the gate did its job); final export on full sets: long-form flips 0.19%, detection 97.8%→97.6%; short-form −1.1 pt | **PASS** (epoch 1) |
| 7 | Browser-representative runtime | — | int8 34.3 MB; onnxruntime CPU proxy: 83.3 ms/segment at 1 thread (27.5 ms at 8), features 1.9 ms of that; ~0.44 s median per long-form doc single-threaded. The wasm route itself remains unmeasured, as it is for the shipped model | **PASS** (proxy) |
| 8 | Structural-feature ablation (identical architecture, zeroed features, retrained) | — | features buy **+50.0 pts at 100 words** (76.8% vs 26.8%), **+9.6 pts on the independent matched slice** (86.9% vs 77.3%), fiction FP 3.1% vs 5.7%; cost **−1.2 pts long-form** (97.5% vs 98.7%) | measured |

## Recommendation

**Adopt the full arm as the cycle-5 candidate, subject to the owner's
acceptance and the engineering cost below.** Every gate passes; the cycle-4
trade (quantisation gate vs short-form) is resolved rather than re-balanced —
this model holds 76.8% at 100 words with the int8 gate green and a fitted
temperature of 1.05, where cycle 4 could have either at 0.007 spread-margin
or 66.7% but never both. Nothing regresses against the shipped model on any
measured axis at matched false positives.

The honest costs, stated plainly:

1. **The candidate cannot drop into the existing runtime.** It is a
   three-input ONNX (input_ids, attention_mask, feats[8]); the browser and
   server routes must compute the 8 structural features per segment,
   numerically identical to `struct_features.py`. TypeScript ports already
   exist for wpp_cv, sec15, cadence and the scaffold metrics (shipped as
   tells); adjacent-overlap and pps_var/mode-share ports would be new, and a
   parity contract like segments-v3's is required.
2. **The operating pair here is a measurement convention** (matched-FP on
   the eval view), not a deployable threshold. Deployment would need the
   pair fitted on calibration data and verified — a threshold change, which
   is not authorised from this session and is not proposed here.
3. **Heavy LLM rewrites of human text now flag more** (28.5% vs 21.2% on the
   held-out pairs axis): a direct consequence of training heavy rewrites as
   machine-written, which they are. Light edits stay clear (0.7%).
   Owner-visible trade; the published 21.0% figure would need updating if
   this ships.
4. **Long-form is 1.2 pts below the ablation arm.** A no-features retrain is
   marginally better on long documents only; the features pay for that with
   the entire short-form gain and the matched-slice gain. If the owner
   valued long-form alone, the ablation arm is the better model — the full
   arm is recommended because short-form and independent-evasion are where
   the shipped model actually fails.

## 1. What this cycle changed

Two cycle-4 lessons built into the optimiser and selection, not checked
afterwards:

- **Calibration spread as a training objective.** Label smoothing 0.05;
  per-epoch NLL-fitted temperature and calibrated CAL spread recorded; an
  epoch with fitted T > 1.30, calibrated sd < 0.25 or > 25% of scores in
  0.80–0.90 cannot be selected. Fitted T by epoch: 1.174 / **1.048** / 1.172
  (epoch 1 selected). Cycle 2 (accepted) was 0.832; cycle 4 (rejected) 1.714.
- **The int8 gate at every epoch.** Per-channel int8 export and a 1,200-row
  stratified CAL scoring after each epoch; flips > 1% or TPR@2% drop > 2 pts
  fail the epoch. Epoch 2 failed exactly this way (1.08% flips) and was
  rejected in-run — the first time this class of defect was caught before
  the end of a cycle instead of after it.

And one addition — **the seven measured fingerprint components as model
inputs** (+1 missingness flag), computed by importing the measurement code
itself, never re-derived:

| # | feature | source |
| --- | --- | --- |
| 0 | wpp_cv — words-per-paragraph CV | `measure_new_human.word_metrics` |
| 1 | sec_within15 — body-section length uniformity | `measure_new_human.word_metrics` |
| 2 | pps_var — paras-per-section within-doc variance | `measure_fingerprint.fingerprint` |
| 3 | body_mode_share — section-shape mode share | `measure_scaffold_v2.doc_metrics` |
| 4 | spp_cv — sentence-length CV | `measure_scaffold_v2.doc_metrics` |
| 5 | adjacent-sentence content-word overlap | signal-science `features.py` code path |
| 6 | cadence rate (paragraph cadence ≥ 4 per 1,000 words) | signal-science `cadence.compute` |
| 7 | has_structure — missingness indicator | derived from `classify_blocks` |

Architecture: e5-small pooler output (384) ⊕ 8 z-normalised features →
dropout 0.1 → linear(392, 2). 33.36M parameters. Normalisation fitted on
TRAIN only; NaN → 0 after z-scoring. The ablation arm feeds zeros through
the identical architecture, so the parameter count is equal and the
comparison is architecture-fair.

**Risk stated before results, now measured:** `has_structure` correlates
with side in the legacy corpus and could have become a "markdown present"
shortcut. It did not: the 418 fully-structured held-out human docs flag at
0.2% (1/418) against the shipped model's 27.3%, and the held-out structured
short-form human FP is ≤ 0.1% per band.

## 2. Data

`dataset-manifest.json` carries SHA-256 and per-source counts. 31,800 rows:
train 18,682 / cal 3,859 / test 9,259 (base test preserved).

- **Base:** `cycle4-fiction/dataset.jsonl` verbatim (28,295 rows; embeds
  cycles 2–4 with their group-aware splits and battery pinning), minus 8
  battery near-duplicates the normalised-hash sweep found that cycle 2's
  exact-hash quarantine could not see.
- **Humaniser pairs** (owner-approved): 399 AI-rewrite variants (all
  intensities) + 135 heavy rewrites of human originals, side=ai;
  light/medium rewrites of human text EXCLUDED from training (their words
  are part-human; either label would be wrong). Group = lineage.
- **Structured human corpus GREEN** bucket: 2,361 docs trained; AMBER (750)
  excluded (licence caution); 418 held-out-topic docs reserved for
  evaluation. Group = topic slug.
- **Matched generations:** 618 non-eval rows from the frozen snapshot
  (SHA-256 `bde4d058…`), grouped by topic slug jointly with their human
  partners.
- **Never trained on**, enforced by per-set normalised-hash guard with an
  abort: the 5,558 long-form corpus, battery human-corpus v1/v2, the
  held-out short-form slices, the nine.

**Snapshot-vs-final reconciliation (matched pairs).** Training froze a
756-row snapshot while generation was still running; the corpus finalised at
1,110 pairs (918 training-eligible, 192 eval-only: 176 topic-bucket + 16
google-family — the google slice ran thin after a budget stop, so the
topic-bucket rows carry the held-out duty). Row-by-row reconciliation
against the final manifest: **0 trained rows are eval-only under the final
labels** (the boundary is re-derived here from the generator's own
slug-hash rule and the build aborts on any disagreement); all 618 trained
rows appear unchanged in the final file; 300 training-eligible rows that
arrived after the freeze were neither trained on nor evaluated (same-topic
siblings of trained rows: neither clean nor used). The eval slice was
refreshed from the final file, so all 192 eval-only rows are measured.
Generation-side history for the record: `google/gemini-3.1-pro-preview` was
dropped by the generating agent for degenerate sub-100-word outputs and
replaced with `google/gemini-3.5-flash` to preserve the held-out family;
final adherence 85.5% length ±20%, 85.9% sections.

**Eval view.** Long-form docs whose text entered train/cal directly (208
base-corpus overlaps — the documented PER-MODEL-DETECTION corpus property)
or whose text is the source of a trained rewrite (`measurement_overlap`
pairs) are excluded from measurement: **675/922 AI and 4,500/4,636 humans
remain**, and every Gate-1/4/5 figure above uses those denominators. Five
contaminated passages are likewise dropped from the short-form human FP set.
Full-corpus figures are in `results-c5.json` for comparison only.

## 3. Training

Config: e5-small from base (not continued from cycle 2 — new head), 3
epochs, LR 2e-5, batch 16, max_len 512, label smoothing 0.05, seed 20260831,
(register, axis) loss-cell equalisation with the OBJECTIVE.md register
priorities and hard-negative boost 1.6, MPS, 0.55 s/step.

| epoch | cal AUROC | fitted T | cal sd | TPR@2% | long-form | short-form | int8 flips | gates |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | 0.9742 | 1.1737 | 0.4256 | 78.6% | 68.9% | 94.7% | 0.58% | pass |
| **1** | **0.9835** | **1.0479** | **0.4394** | **84.8%** | **76.7%** | **97.1%** | **0.58%** | **pass — selected** |
| 2 | 0.9846 | 1.1718 | 0.4318 | 86.8% | 78.5% | 97.9% | **1.08%** | **int8 FAIL — rejected** |

Ablation arm (features zeroed): selected epoch 2, T 1.199, cal selection
0.8923 — slightly above the full arm's 0.869 on CAL, which is exactly why
the decision is made on the held-out battery (§4/Gate 8), not on CAL.

## 4. The matched-pairs held-out slice — read this one first

This is the first evaluation in the programme where the AI side was
generated from briefs extracted from real human documents (topic, length,
structure outline, tone — never the text), by model families and topics the
detector never trained on. It answers the question every earlier cycle
could not: what happens on structure-matched AI text with no topic or
family leakage at all.

| slice | n | shipped | cycle-5 |
| --- | --- | --- | --- |
| topic-bucket AI (fully independent) | 176 | 83.5% (147) | **86.9% (153)** |
| google-family AI (family held out) | 11 | 54.5% (6) | 63.6% (7) |
| family + topic-bucket | 5 | 60.0% (3) | 60.0% (3) |
| by family: xai | 69 | 89.9% | 89.9% |
| by family: meta | 59 | 67.8% | **81.4%** |
| by family: openai | 27 | 96.3% | 96.3% |
| by family: anthropic | 21 | 90.5% | 81.0% |
| by family: google | 16 | 56.2% | 62.5% |
| **human partners (structured, held-out topics)** | **418** | **27.3% FP (114)** | **0.2% FP (1)** |

Two findings matter beyond this cycle. First, evasion-priority families
(gemini at 62.5%, meta at 81.4%) confirm that brief-matched generation by
unseen families is the real weakness axis — these figures are far below the
97.5% long-form headline and should be quoted alongside it. Second, **the
shipped model false-positives 27.3% of structured modern human writing**
(GOV.UK-class business and technical pages with headings and lists intact)
— on exactly the register the owner's users paste. That number has never
been measurable before this corpus existed, it is the strongest argument in
this report for replacing the shipped model, and it belongs in the published
weakness table whatever the owner decides about cycle 5. The google and
family+topic cells are thin (16 and 5 docs) and carry wide intervals; do not
quote them without their denominators.

## 5. Humaniser pairs, held-out axes (1,199 rows the training file never saw)

At the candidate's refitted pair vs shipped at its live pair:

| slice | n | shipped | cycle-5 |
| --- | --- | --- | --- |
| AI originals (unrewritten) | 156 | 67.3% | 71.8% |
| AI + neural rewrite, heavy | 150 | 80.0% | **86.7%** |
| AI + neural rewrite, medium | 154 | 76.0% | 79.2% |
| AI + neural rewrite, light | 138 | 68.8% | 70.3% |
| rewrites, held-out REGISTER axis | 167 | 74.9% | **85.0%** |
| rewrites, held-out REWRITER axis | 140 | 79.3% | 80.7% |
| rewrites, held-out SOURCE axis | 135 | 71.1% | 69.6% |
| human original, untouched | 156 | 0.6% FP | 0.0% FP |
| human + light AI edit | 153 | 0.7% FP | 0.7% FP |
| human + medium AI edit | 155 | 11.6% | 14.8% |
| human + heavy AI edit | 137 | 21.2% | **28.5%** |

The last row is the disclosed trade of §Recommendation point 3. Nothing
here measures commercial humanisers (Undetectable.ai escaped the shipped
build 96.4%); that threat is untested against this candidate and stays on
the phase-2 board.

## 6. The nine (owner samples)

All three AI samples flagged (the shipped model catches one of three,
missing both the un-instructed pure generation and the "humanise" variant);
all six human samples clear, max probability 0.080.

## 7. What is still missing, and what would close it

- **The browser runtime cannot run this model yet** — the feature-extraction
  port and a parity contract are unbuilt. Until then every figure here is
  the fp32 server-route analogue plus an onnxruntime-CPU proxy for int8.
- **Commercial humanisers untested against the candidate** (terms and
  subscriptions — owner decision pending on the £20–50/month option).
- **The google matched slice is 16 documents.** A cheap top-up run within
  the matched-generation design would make the family-held-out cell
  quotable.
- **`report` register remains the weakest long-form cell** (56.8% at the 2%
  CAL budget on the selected epoch) — data-starved since cycle 2, unchanged
  here.
- **The 100-word cell, though 4× better, is 76.8% of 56 docs.** Wilson
  interval 64.2–85.9%; do not quote it unqualified.
- **Deployable operating point not fitted** — deliberately, since threshold
  changes are not authorised. The margin-space fit code (`analyse.py`)
  generalises directly when the owner wants one.

## 8. Reproducing this

```sh
PY=<venv: torch 2.4, transformers 4.43, onnx, onnxruntime 1.29, scikit-learn>
python3 prepare_data.py                 # dataset + manifest + eval exclusions (aborts on any quarantine hit)
python3 struct_features.py dataset.jsonl features.jsonl
C5_ARM=full     $PY train.py            # ckpt-full + per-epoch int8 gate
C5_ARM=ablation $PY train.py
$PY refresh_matched_eval.py             # eval slice from the FINAL matched corpus
$PY export_final.py full                # ../models/tier3-cycle5-full-*
$PY score_battery.py --model shipped --tag old         # harness proof must hit 883/45 exactly
$PY score_battery.py --model ckpt:ckpt-full --tag c5
$PY score_battery.py --model ckpt:ckpt-ablation --tag c5abl --zero-feats
$PY score_battery.py --model int8:../models/tier3-cycle5-full-e5small-int8-perchannel.onnx,ckpt-full --tag c5i8 --sets lf-hu,lf-ai,ai-shortform,human-shortform-widened,nine
$PY analyse.py --new c5                 # results-c5.json + analysis-c5.txt
$PY analyse.py --new c5abl
$PY int8_delta.py
$PY bench_runtime.py ../models/tier3-cycle5-full-e5small-int8-perchannel.onnx ckpt-full
```

Measurement sets are banked in `c3sets/` (rescued from a session scratchpad
before it could be lost; the long-form pair reproduces the published
883/922 and 45/4,636 exactly, which is the proof the copies are faithful).
