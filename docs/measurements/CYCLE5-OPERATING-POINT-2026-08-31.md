# Cycle-5 operating point — fitted, 1 September 2026

Fits the deployment operating pair for the cycle-5 candidate
(`services/local-engine/research/cycle5-train/`, `models/tier3-cycle5-full-*.onnx`),
per CYCLE5-REPORT's own method (`analyse.py`), targeting the shipped
model's false-positive budget on the same evaluation view. Owner-authorised
as part of the cycle-5 deployment decision (CYCLE5-REPORT itself withheld
this: "Deployable operating point not fitted — deliberately, since
threshold changes are not authorised" — that authorisation now exists).

**Method, exactly as CYCLE5-REPORT describes it and as `analyse.py`
implements it — nothing new invented here:**

- Verdict rule, margin space: `flag <=> max(m1, m2 + g) >= a`, where `m1`,
  `m2` are the top two of a document's per-segment margins (`seg_m`,
  logit-space, segments-v3 contract).
- **Target:** the shipped cycle-2 model's false-positive count on the
  long-form eval view (41 of 4,500 human documents, 0.9% — close to but not
  exactly 1%, since it is the shipped model's actual measured count, not a
  round target).
- **Fit:** sweep gap `g` over `0.00..2.00` step `0.02`; for each `g`, solve
  the primary `a` exactly so the candidate's human false positives on the
  eval view equal the target; keep the `(a, g)` that maximises AI
  detection, ties broken toward larger `g` / lower `a`.
- **Stability check:** the same fit repeated on two random halves of the
  eval-view human set (seed 20260831, half the target FP count each) — the
  gap should not move by more than noise.
- **Eval view:** the 5,558-document long-form corpus (4,636 human, 922 AI)
  minus documents whose text entered cycle-5 train/cal directly or as the
  source of a trained rewrite (`eval-exclusions.json`) — 4,500 human, 675
  AI remain. Every figure below is on this view unless stated otherwise.
- **Input convention:** raw text throughout, matching the training-time
  decision recorded in `services/local-engine/research/cycle5-train/deploy-prep/PHASE1-PARITY-NOTE-2026-09-01.md`
  — the scores this fit runs on (`scores/c5-*.jsonl`) were produced by
  `score_battery.py` against the same `d["text"]` field `train.py`
  tokenizes, with no markdown-stripping step anywhere in the pipeline.

## Reproduction, run fresh today (not copied from the report)

```
services/local-engine/research/cycle5-train$ .venv-research .../python3 analyse.py --new c5
```

- **Harness proof** (must reproduce before anything else counts): shipped
  pair on the full 5,558 corpus — AI 883/922, human FP 45/4,636 — both
  match the published figures exactly. `pass: true`.
- **Eval view:** human 4,500/4,636 (136 dropped), AI 675/922 (247 dropped)
  — matches CYCLE5-REPORT §2 exactly.

## The fitted pair

**a = 3.570935 (quote as 3.571), gap g = 0.34.** Split-half stability:
0.34 / 0.26 (both runs independently reproduced today, matching
CYCLE5-REPORT's published 0.34/0.26).

Rule: **flag iff max(m1, m2 + 0.34) >= 3.571**.

## Measured figures at the fitted pair (eval view unless noted)

| figure | denominator | shipped (live pair) | cycle-5 @ fitted pair |
| --- | --- | --- | --- |
| Long-form AI detection | 675 AI, eval view | 646/675 = 95.7% | **658/675 = 97.5%** |
| Long-form human FP | 4,500 human, eval view | 41/4,500 = 0.9% | **42/4,500 = 0.9%** |
| Matched-pairs topic-bucket AI (independent evasion) | 176 | 147/176 = 83.5% | **153/176 = 86.9%** |
| Matched-pairs human-partner FP (structured, held-out topics) | 418 | 114/418 = 27.3% | **1/418 = 0.2%** |
| Short-form AI, 100w, held-out test split | 56 | 11/56 = 19.6% | **43/56 = 76.8%** |
| Short-form AI, 300w | 63 | 43/63 = 68.3% | **61/63 = 96.8%** |
| Short-form AI, 400w | 68 | 44/68 = 64.7% | **67/68 = 98.5%** |
| Short-form AI, 600w | 77 | 64/77 = 83.1% | **74/77 = 96.1%** |
| Short-form human FP, 100w (held-out sources) | 869 | 0/869 = 0.0% | 1/869 = 0.1% |
| Short-form human FP, 300w | 864 | 5/864 = 0.6% | **0/864 = 0.0%** |
| Short-form human FP, 400w | 866 | 5/866 = 0.6% | 1/866 = 0.1% |
| Short-form human FP, 600w | 845 | 7/845 = 0.8% | 1/845 = 0.1% |
| Fiction human FP | 227 | 20/227 = 8.8% | **7/227 = 3.1%** |
| Academic human FP | 1,992 | 15/1,992 = 0.8% | 15/1,992 = 0.8% (flat) |
| Score spread, sd (eval view) | 675 AI + 4,500 human doc-max probs | 0.3595 | **0.3981** |
| AI median / human median probability | — | — | 0.9716 / 0.0962 |
| Score fraction in 0.80-0.90 | — | — | 4.1% |

**Register breakdown, long-form AI detection (eval view), shipped vs
fitted pair:** longform-journalism 97/101 (96.0%, flat); academic-essay
88/99->93/99 (88.9%->93.9%); story 84/89->86/89 (94.4%->96.6%); white-paper
82/82 (100%, flat); research-summary 79/80->80/80 (98.8%->100%);
academic-discussion 76/80->78/80 (95.0%->97.5%); academic-lit-review
75/79->77/79 (94.9%->97.5%); company-update 65/65 (100%, flat). No
register regresses.

**Matched-pairs by model family (176+11+5=192 total AI):** xai 62/69
(89.9%, flat); meta 40/59->48/59 (67.8%->81.4%); openai 26/27 (96.3%,
flat); anthropic 19/21->17/21 (90.5%->81.0%); google 9/16->10/16
(56.2%->62.5%, n=16, wide interval, quote qualified per the report's own
caution). Google and family+topic-bucket cells (16 and 5 docs) carry wide
Wilson intervals and should not be quoted unqualified, per CYCLE5-REPORT §4.

**Humaniser pairs, held-out axes (measured, not part of the fitting
target — recorded for the same disclosure CYCLE5-REPORT §5 makes):**
AI+heavy neural rewrite 120/150->130/150 (80.0%->86.7%); rewrites held-out
register axis 125/167->142/167 (74.9%->85.0%); **human original + heavy AI
edit 29/137->39/137 (21.2%->28.5%)** — the disclosed trade: heavy LLM
rewrites of human text flag more under cycle 5, a direct consequence of
training heavy rewrites as machine-written. Light edits stay flat
(0.7%->0.7%).

**The nine (owner samples), at the fitted pair:** all three AI samples
flag (`7-pure-ai-no-instructions` maxp 0.975, `8-heavily-edited-by-hand`
maxp 0.963, `9-ai-with-humanise-instructions` maxp 0.976 — the shipped
model caught only #8); all six human samples clear, max probability 0.080.

## What this fit is, and is not

- This is the SAME fitting method and the SAME eval view CYCLE5-REPORT
  used for its "candidate operating point" (§ Verdict against the gates) —
  re-run independently today rather than copied, and it reproduces
  identically (a=3.570935, g=0.34, split-half 0.34/0.26). The report
  called this a "measurement convention... not a deployable threshold"
  only because threshold changes were not yet authorised in that session,
  not because the method itself was provisional.
- This is **not** a fit against a separate, never-before-touched
  calibration split — it is fit and measured on the same 5,558-document
  eval view. That is the same discipline the shipped model's own 0.984
  pair was fitted and measured under, so it is consistent with existing
  practice, but it is worth stating plainly: the eval view is "held out
  from cycle-5 training" (verified via `eval-exclusions.json` and the
  train/cal hash-quarantine), not "held out from this fit."
- The results file this run wrote is
  `services/local-engine/research/cycle5-train/results-c5.json`
  (regenerated today, same content as CYCLE5-REPORT's).

## Not yet done

- thresholds.json has NOT been touched — this document only records the
  fitted pair and its figures. Phase 3 prepares (does not apply) a
  candidate `thresholds.json`.
- Per-runtime re-measurement (int8-browser vs fp32-server, at this exact
  fitted pair rather than the report's own per-epoch int8-flip gate) is
  Phase 3's job, not this document's.
