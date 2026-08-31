# Corpus reconciliation, second pass — the generated corpus on the deployed model

**Measured 31 August 2026.** This closes the re-scoring half of `PHASE-2-NEXT-STEPS.md` §5a:
the 28 August generated corpus, which had only ever been scored with the superseded cycle-1
model at threshold 0.8533, is now scored with the deployed cycle-2 model at the shipped
operating point. Research and measurement only — no model change, no threshold change, no
deployment, no publication. Nothing here touched the live Cloud Run service.

**Headline: the contradiction is resolved. On the deployed model at the shipped operating
point, the generated corpus reads 3,758/4,016 (93.6%) flagged overall and 433/457 (94.7%) on
academic prose — the register that read 5/457 (1.1%) under cycle 1. The two corpora now tell
one story on long-form prose: 883/922 (95.8%) on the held-out corpus against 2,832/2,908
(97.4%) on the generated corpus's long-form-comparable subset, same model, same rule, same
runtime. The disagreement was the model era and the threshold, not the corpora. What this does
NOT close: the generated corpus is in-distribution for cycle 2 — 2,568 of its 4,016 usable
rows sit verbatim inside the cycle-2 corpus splits, 1,807 of them in the training split — so
the prompt-style/evasion axis remains unmeasured on an independent corpus, and the corpus has
no human rows, so it contributes no false-positive figure of its own.**

---

## 1. Configuration, verified rather than trusted

Everything below was verified from the shipped code before scoring, not taken from the brief:

| | verified value | source |
|---|---|---|
| model | `tier3-cycle2-e5small-fp32.onnx`, sha256 `e313ab00de1fffd2…` | measured by the harness at load; matches the build recorded in `HUMANIZER-AND-DETECTOR-COMPETITOR-STUDY.md` and `PHASE-2-NEXT-STEPS.md` §11.3 |
| runtime | fp32 Python `onnxruntime` (the local replica of the EU server path) | `research/corpus-reconciliation-2026-08-29/harness.py` |
| segmentation | contract `segments-v3` | `reference-server/segments.py` `SEGMENTATION_CONTRACT`; its comment confirms v3 changed the verdict rule, not the cut — boundaries are byte-identical to v2 |
| aggregation | flag when the strongest section ≥ **0.9855** OR the second-strongest ≥ **0.9763**, in calibrated probability space (temperature 0.8324 on the logits) | `reference-server/app.py` `THRESHOLD_PROB` / `SECONDARY_THRESHOLD_PROB`; `thresholds.json` `operating_point` in the website checkout agrees |

**Harness gate.** Before any new figure was taken, the scorer was re-proved against the
canonical full-corpus fp32 store (`corpus-reconciliation-2026-08-29/raw/`): a 40-document
stratified sample re-scored segment by segment read **0 segment-count mismatches and worst
|Δ| = 0.000000** against the store's 4 dp values. The same harness was proved identical to
the store on 1,051 documents / 4,984 sections during the 31 August humaniser measurement
(`humaniser-detection-2026-08-31/fp32-results.md`). The store reproduces the published
shipped-pair figures: AI 884/922 at 4 dp (883/922 unrounded — the known rounding artefact
recorded in `AGGREGATION-AND-RHYTHM.md` §6), human false positives 45/4,636.

No paid API calls were made; no OpenRouter spend; no requests to the live service at all.
The full 4,050-row corpus was scored locally in 293 seconds — 10,153 sections, one forward
pass each; the scoring output `generated-fp32.jsonl` keeps segment probabilities unrounded.

Evidence directory:
`implementation/services/local-engine/research/generated-corpus/cycle2-rescore-2026-08-31/`
(`score.py`, `analyse.py`, `heldout_analysis.py`, `cycle2-membership.json`, `analysis.txt`,
`run.log`, `generated-fp32.jsonl`).

## 2. The one caveat that governs every table below

The cycle-2 training corpus was built on 28 August 2026 from published-register prose, and
its AI side is dominated by this very generation run. Matching normalised text hashes of the
4,016 usable generated-corpus rows against `cycle2-corpus/corpus.jsonl`:

| cycle-2 split | rows | flagged at shipped pair |
|---|---:|---|
| train | 1,807 | 1,717/1,807 = 95.0% |
| test | 393 | 375/393 = 95.4% |
| cal | 368 | 340/368 = 92.4% |
| **independent of every split** | **1,448** | **1,326/1,448 = 91.6%** [90.0–92.9] |

**64% of this corpus is inside the cycle-2 dataset and 45% is inside the training split
itself.** The train-versus-independent gap is 3.4 points — real but modest. Where a clean
number is wanted, use the independent column; where the corpus-wide number is quoted, this
caveat travels with it. Note also that the independent remainder is not a random sample:
cycle-2 sampled whole registers preferentially, so social posts are over-represented in the
independent subset (407 of 1,448 against 721 of 4,016).

The independent rows are still **not** an independent corpus in the §5a sense: they come from
the same 28 August generation run — same 106 topics, same prompts, same models, same date —
as the rows the model trained on. They establish generalisation across a hash split, not
across a distribution.

## 3. Generated corpus at the shipped operating point

All figures: fp32 reference runtime, segments-v3, flag pair 0.9855/0.9763, usable rows only
(4,016 of 4,050; the 34 quarantined rows were scored but excluded, matching
`GENERATED-CORPUS-EVAL.md`). The cycle-1 column is the 28 August scoring at 0.8533 on the
superseded model, quoted for contrast only — different model, different threshold, and the
0.857-threshold column of that report was lower still.

### 3.1 Overall and by register family

| register family | cycle-2 shipped pair (this run) | cycle-1 @ 0.8533 (28 Aug) |
|---|---|---|
| **all usable rows** | **3,758/4,016 = 93.6%** [92.8–94.3] | 1,601/4,016 = 39.9% |
| marketing-seo | 775/797 = 97.2% | 621/797 = 77.9% |
| article | 1,207/1,244 = 97.0% | 467/1,244 = 37.5% |
| other-shared | 766/797 = 96.1% | 425/797 = 53.3% |
| **academic** | **433/457 = 94.7%** [92.3–96.4] | **5/457 = 1.1%** |
| social-post | 577/721 = 80.0% [77.0–82.8] | 83/721 = 11.5% |

The two numbers §5a named as the contradiction — 1.1% academic, 37.5% articles — were
artefacts of scoring a superseded model at a retired threshold. On the deployed
configuration they read 94.7% and 97.0%.

### 3.2 By register (worst first among the notable)

| register | flagged | | register | flagged |
|---|---|---|---|---|
| social-facebook | 119/186 = 64.0% | | academic-essay | 181/193 = 93.8% |
| social-instagram | 105/137 = 76.6% | | news-piece | 296/313 = 94.6% |
| social-linkedin | 179/205 = 87.3% | | academic-discussion | 90/95 = 94.7% |
| social-x-thread | 174/193 = 90.2% | | academic-lit-review | 162/169 = 95.9% |
| press-release | 142/157 = 90.4% | | howto-explainer | 315/326 = 96.6% |
| category-page | 72/78 = 92.3% | | seo-service-page | 346/350 = 98.9% |

Everything else sits between 96.6% and 98.9%. The weak tail is short social copy — the
social-post family averages 208 words, and `length_band` tracks it directly: long
2,778/2,865 (97.0%), medium 403/430 (93.7%), short 577/721 (80.0%).

### 3.3 By prompt style — the axis cycle 1 collapsed on

| prompt style | all usable | independent-of-cycle-2 only | cycle-1 @ 0.8533 |
|---|---|---|---|
| plain | 1,210/1,307 = 92.6% | 417/462 = 90.3% [87.2–92.6] | 731/1,307 = 55.9% |
| house-brief | 1,269/1,338 = 94.8% | 481/518 = 92.9% [90.3–94.8] | 598/1,338 = 44.7% |
| human-voice | 1,279/1,371 = 93.3% | 428/468 = 91.5% [88.6–93.7] | 272/1,371 = 19.8% |

The 36-point plain-to-human-voice cliff under cycle 1 is gone **on this corpus**: the three
styles sit within 2.2 points of each other, and human-voice is not the worst of the three.
The style split survives restriction to the independent rows. But cycle 2 was trained with
human-voice rows from this same run upweighted as hard negatives, so this is the expected
result on the training distribution and proves nothing about an unseen one — see §6.

### 3.4 By model (per-model, cycle-2 shipped pair; cycle-1 @ 0.8533 for contrast)

| model | this run | cycle-1 @ 0.8533 |
|---|---|---|
| openai/gpt-5.6-sol-pro | 75/75 = 100.0% | 56.0% |
| anthropic/claude-opus-5 | 249/250 = 99.6% | 24.8% |
| anthropic/claude-fable-5 | 140/141 = 99.3% | 39.7% |
| anthropic/claude-sonnet-5 | 248/250 = 99.2% | 35.6% |
| z-ai/glm-5.3 | 227/229 = 99.1% | 34.5% |
| google/gemini-3.7-flash | 247/250 = 98.8% | 59.6% |
| anthropic/claude-opus-4.8 | 74/75 = 98.7% | 32.0% |
| google/gemini-3.6-flash | 74/75 = 98.7% | 61.3% |
| google/gemini-3.1-pro-preview | 147/150 = 98.0% | 31.3% |
| openai/gpt-5.6-sol | 146/150 = 97.3% | 56.7% |
| moonshotai/kimi-k3 | 241/249 = 96.8% | 34.1% |
| deepseek/deepseek-v4-pro-0813 | 240/248 = 96.8% | 31.0% |
| qwen/qwen3.8-max | 240/250 = 96.0% | 29.6% |
| openai/gpt-5.6-luna-pro | 72/75 = 96.0% | 56.0% |
| openai/gpt-5.6-luna | 239/250 = 95.6% | 50.8% |
| google/gemini-3.5-flash | 142/150 = 94.7% | 46.0% |
| openai/gpt-5.6-terra | 235/250 = 94.0% | 50.0% |
| openai/gpt-5.4 | 139/150 = 92.7% | 42.7% |
| mistralai/mistral-medium-3-5 | 230/249 = 92.4% | 44.6% |
| **x-ai/grok-4.6** | **189/250 = 75.6%** [69.9–80.5] | 13.6% |
| **meta-llama/llama-4-maverick** | **164/250 = 65.6%** [59.5–71.2] | 45.6% |

Two models carry almost the whole miss budget. `x-ai/grok-4.6`, which read **0/86** on
human-voice prompts under cycle 1, now reads **69/86 = 80.2%** [70.6–87.3] on the same rows —
and its human-voice cell is no longer its worst (plain 62/82 = 75.6%, house-brief 58/82 =
70.7%). `meta-llama/llama-4-maverick` is the one model that got harder relative to the rest;
its misses are spread across styles, not driven by one. The cycle-1 pattern of capable models
being hardest is inverted: pro-flagship 998/1,015 (98.3%) against flash-or-mini 866/975
(88.8%), though the tier split is confounded with which models sit in each tier.

## 4. Reconciliation against the held-out long-form corpus

Same model file, same rule, same runtime, same date. The held-out figures are recomputed from
the canonical fp32 store, per register, at the shipped pair (AI total reads 884/922 at the
store's 4 dp; the unrounded truth is 883/922, and both are shown so neither can be misquoted).

| | held-out long-form corpus | generated corpus |
|---|---|---|
| AI detected, all rows | 883/922 = 95.8% [94.3–96.9] (884/922 at 4 dp) | 3,758/4,016 = 93.6% [92.8–94.3] |
| AI detected, long-form-comparable (≥600 words, non-social) | — (the corpus is all long-form) | 2,832/2,908 = 97.4%; independent-only 898/918 = 97.8% [96.7–98.6] |
| human false positives | 45/4,636 = 0.97% [0.7–1.3] | **no human rows — not measurable here** |
| academic registers | discussion 108/113 = 95.6%, lit-review 101/107 = 94.4%, essay 119/132 = 90.2% | discussion 90/95 = 94.7%, lit-review 162/169 = 95.9%, essay 181/193 = 93.8% |
| training contamination | 268/922 AI rows in a cycle-2 split (168 train) | 2,568/4,016 rows in a cycle-2 split (1,807 train) |

**Verdict: the corpora agree.** On comparable material — long-form prose, same model, same
operating point — the generated corpus reads 97.4% (97.8% independent-only) against the
held-out corpus's 95.8%, and the per-register academic figures sit within a few points of
each other. The whole-corpus generated figure is lower (93.6%) only because it includes 721
social posts averaging 208 words, a register the held-out corpus does not contain and the
programme's own length-sensitivity work predicts will read low. There is no remaining
contradiction for §5a's first bullet: the 1.1%-versus-95% split was cycle 1 at 0.8533
against cycle 2 at the shipped pair, and re-scoring removes it entirely.

The residual 2-point gap between 97.4/97.8% (generated long-form) and 95.8% (held-out) runs
in the direction training proximity predicts — the generated corpus is nearer the training
distribution — and is consistent with the held-out corpus's own measured seen-versus-unseen
gap of about 1.1 points (`thresholds.json` `independence_note`, measured at 0.984).

## 5. What was measured on one runtime, not both

§5a asked for both shipping runtimes. This pass produced the **fp32 reference runtime only**
(the server route's exact numerical path, proved identical to the canonical store). The
browser int8/WASM runtime was not run over the generated corpus: 8,800-odd sections through
`onnxruntime-web` is hours, and the humaniser measurement's matched-pairs browser comparison
(`LLM-REWRITE-ROBUSTNESS.md` §4) already characterises the routes' relationship — verdict
disagreement 2.3% on 1,576 double-scored rows, browser very slightly more flag-prone. A
browser-runtime pass over this corpus remains open, and no figure here may be quoted as a
browser figure.

## 6. What this does NOT close — read before quoting anything above

1. **The evasion axis is still open.** The flat prompt-style split in §3.3 is measured on the
   distribution cycle 2 was trained against. Every row — including the 1,448 hash-independent
   ones — comes from the 28 August generation run whose sibling rows are the training set.
   **No prompt-style split has been measured on a corpus the model was not trained against**,
   and that remains exactly as open as §5a records it. A "write like a human" instruction
   issued to a new model, on new topics, at a later date, is unmeasured.
2. **No false-positive figure comes from this corpus.** It has no human rows. The 0.97%
   (45/4,636) travels with the held-out corpus, whose human side is long-form; the registers
   where this corpus shows 97%+ detection (marketing, SEO, social) have **no independent
   human false-positive measurement at all** — `thresholds.json` already publishes that gap
   as `registers_unmeasured`, and nothing here narrows it. 93.6% detection is worthless as a
   headline without a same-register FP rate, which does not exist.
3. **The owner threshold decision is untouched.** The shipped pair remains provisional in
   exactly the sense §5a states; no threshold moved and none is recommended here.
4. **The GPT-5.6 Sol single-document miss** (0.8082 on a real 512-word SEO article) reported
   by a parallel session was not reproduced or investigated here. `openai/gpt-5.6-sol` reads
   146/150 (97.3%) on this corpus; the miss report concerns a specific real published page,
   not this distribution.
5. **Register labels and the usable/quarantine partition** are inherited from the 28 August
   run as recorded in `GENERATED-CORPUS-EVAL.md`; nothing was re-audited.

## 7. Reproducing this

```sh
cd implementation/services/local-engine/research/generated-corpus/cycle2-rescore-2026-08-31
# gate against the canonical store, then score all 4,050 rows (resumable, ~5 min)
../../../../../.venv-research/bin/python score.py gate
../../../../../.venv-research/bin/python score.py run
python3 analyse.py          # all tables in §3 and the membership split
python3 heldout_analysis.py # §4's held-out per-register figures at the shipped pair
```

`cycle2-membership.json` maps every generated-corpus row id to its cycle-2 split (or null),
by SHA-256 of whitespace-normalised, lower-cased text against `cycle2-corpus/corpus.jsonl`.
