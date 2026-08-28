# Browser runtime specification — model tier (Tier 2 + Tier 3)

**Date:** 28 August 2026 · **Source of truth:** this directory's Python pipeline.
A TypeScript implementation is spec-compliant when it reproduces the golden
vectors in [`models/golden-vectors.json`](models/golden-vectors.json) within
the tolerances in §6.

---

## 1. Tier 2 — surprisal-rhythm engine

### 1.1 Surprisal series

- Model: **gpt2** (GPT-2-small, 124M) via transformers.js / ONNX. Reference
  run is fp32 PyTorch; browser will use quantised weights (see §6 tolerance).
- Tokenise the full text with the standard GPT-2 BPE tokeniser, truncate to
  **1024 tokens**. No BOS prepend, no special tokens.
- One forward pass. For each position t = 2..n (1-based; the first token has
  no context and is skipped):
  - `s_t = -log2 P(x_t | x_1..x_{t-1})` — surprisal in **bits** (log-softmax
    over the fp32 logits, divided by ln 2).
  - `rank_t` = 1-based rank of the true token in the model's predicted
    distribution at that position (1 = most probable). Computed as
    `1 + count(logprob_v > logprob_true)`.
- If fewer than **50** scored tokens → return `inconclusive`. Never guess.

### 1.2 Feature vector (22 dims, exact order)

Let `s` be the scored surprisal array (length m ≥ 50), `d1[i] = s[i+1]-s[i]`
(length m−1), `d2[i] = d1[i+1]-d1[i]` (length m−2). All moments are
**population** moments (divide by N, not N−1). `mean`, `var`, `std` are the
usual definitions; ε = 1e-12.

DivEye 9 (reimplemented from arXiv:2509.18880 — "Diversity Boosts
AI-Generated Text Detection", TMLR 02/2026; reference code is CC BY-NC and
must not be consulted or copied):

| # | name | formula |
|---|------|---------|
| 1 | `div_mean` | mean(s) |
| 2 | `div_var` | var(s) |
| 3 | `div_skew` | mean((s−μ)³)/σ³ (0 if σ=0) |
| 4 | `div_kurt` | mean((s−μ)⁴)/σ⁴ − 3 (0 if σ=0) |
| 5 | `div_d1_mean` | mean(d1) |
| 6 | `div_d1_var` | var(d1) |
| 7 | `div_d2_var` | var(d2) |
| 8 | `div_d2_entropy` | histogram d2 into **10 equal-width bins** over [min(d2), max(d2)]; p_b = count_b/Σ; −Σ p_b·log2 p_b over p_b>0. 0 if max=min. (Bin count is our documented choice; the paper does not specify it.) |
| 9 | `div_d2_autocorr` | mean((d2[:-1]−μ₂)·(d2[1:]−μ₂)) / var(d2) with μ₂ = mean(d2); 0 if var=0 |

FourierGPT-style spectral 6 (of the z-scored series `z = (s−μ)/σ`, σ→1 if 0):
compute the one-sided FFT power spectrum `spec[k] = |rfft(z)[k]|²` for
k = 1..K (DC term dropped; K = floor(m/2)); normalised frequencies
`f[k] = k/(2K)`; `p = spec/Σspec`.

| # | name | formula |
|---|------|---------|
| 10 | `sp_flatness` | exp(mean(ln(spec+ε))) / (mean(spec)+ε) |
| 11 | `sp_centroid` | Σ f·p |
| 12 | `sp_low` | Σ p where f < 0.1 |
| 13 | `sp_high` | Σ p where f > 0.4 |
| 14 | `sp_entropy` | −Σ_{p>0} p·log2 p / log2 K |
| 15 | `sp_slope` | slope of least-squares line of ln(spec+ε) against ln(f) |

UID 3 (GPT-who lineage, arXiv:2310.06202):

| # | name | formula |
|---|------|---------|
| 16 | `uid_local` | mean(d1²) |
| 17 | `uid_global` | var(s)/mean(s) (0 if mean≤0) |
| 18 | `uid_power` | mean(s^1.25) |

GLTR rank buckets 4 (arXiv:1906.04043), fractions of scored tokens:

| # | name | formula |
|---|------|---------|
| 19 | `gltr_r10` | rank < 10 |
| 20 | `gltr_r100` | 10 ≤ rank < 100 |
| 21 | `gltr_r1000` | 100 ≤ rank < 1000 |
| 22 | `gltr_r1000p` | rank ≥ 1000 |

### 1.3 Head

[`models/tier2-head.json`](models/tier2-head.json) contains `features` (the
order above), `standardise.mean`/`standardise.std`, `logistic.coef`/
`logistic.intercept`, and `threshold`.

```
z_i = (feat_i − mean_i) / std_i
p   = 1 / (1 + exp(−(Σ z_i·coef_i + intercept)))
flag = p ≥ threshold
```

The threshold was calibrated **FPR-first at ≤ 2% on held-out calibration
humans** (corpus cal split, never the eval set). Verdict wording must follow
BRIEF §5: this is "machine-pattern evidence at the tier-2 operating point",
never proof of authorship. Below 50 scored tokens: `inconclusive`.

## 2. Tier 3 — fine-tuned classifier

- Base: **intfloat/e5-small** (33.4M params, MIT), fine-tuned for 2-class
  sequence classification on the fresh corpus (see `corpus/manifest.json`).
- Files: `models/tier3-e5small-int8.onnx` (int8 dynamic quantisation;
  size recorded in `models/tier3-sizes.json`), tokenizer = standard
  `bert-base-uncased`-style WordPiece shipped in `tier3/checkpoint/`.
- Input: tokenised text, truncation at 512, standard `[CLS]`/`[SEP]`.
  Output `logits[2]`; `p_ai = softmax(logits)[1]`; flag at the threshold in
  `models/tier3-config.json` (same ≤2% cal-human FPR rule).
- Label honestly in UI: "training cycle 1, corpus to 2025-07 arena data" —
  decay against newer frontier models is expected until the next cycle.

## 3. Model files and consent-download plan

| file | contents | size | git-able (≤95MB) |
|------|----------|------|-------------------|
| `tier2-head.json` | feature spec + weights + threshold | ~5KB | yes |
| gpt2 ONNX int8 (from transformers.js hub or exported) | Tier 2 LM | ~125MB fp32 / ~60MB int8 (Xenova/gpt2 q8) | int8 yes; do NOT commit fp32 |
| `tier3-e5small-int8-perchannel.onnx` | Tier 3 classifier (per-channel int8 — see §8.1; per-tensor variant must NOT ship) | **34.3MB measured** (fp32 133.8MB, not shipped) | yes |
| tokenizer files (both models) | vocab/merges | <2MB | yes |

Consent-download flow (per plan §3.2): nothing downloads until the user
clicks "enable local AI model"; show total size before download; cache in
OPFS/IndexedDB; stamp the UI with model version + training-cycle date from
`tier3-config.json`/`tier2-head.json`. Every file above is ≤95MB, so plain
git hosting works; if a future cycle exceeds that, chunk at 90MB and
concatenate client-side, or quantise further (q4) with a re-run of the
benchmark before shipping.

## 4. Verdict framing (BRIEF §5)

- Output states: `pass` / `attention` / `fail` / `inconclusive` (<50 tokens,
  non-English) / `not_run` (model not downloaded).
- Numbers shown must be the measured ones from `eval/eval-report.json` and
  the corpus test split, with corpus version; never the published paper
  numbers.

## 5. Known limits (state in UI docs verbatim-equivalent)

- English only; <150 words unreliable; heavy human editing and humaniser
  attacks reduce recall; models newer than the training cycle decay.
- Tier 2 FPR on formal encyclopaedic human prose is the weak point (see
  eval report: wikitext-style humans carry most false positives).

## 6. Golden vectors and tolerances

[`models/golden-vectors.json`](models/golden-vectors.json): 5 texts with
scored-token counts, first-10 surprisal values (bits), all 22 features and
the head probability, computed with fp32 gpt2.

Compliance:
- same tokeniser and fp32 ONNX gpt2: features within **1e-4** relative,
  probability within **1e-3**;
- quantised (q8) gpt2: surprisal shifts slightly — require the same
  flag/no-flag decisions on all 5 texts and probability within **0.05**,
  and run the full corpus-test comparison once per release (report the
  delta in the release notes).

## 7. Measured performance (cycle 1, 2026-08-28) — the numbers as they are

Thresholds frozen before eval; quarantined 34-sample eval set scored once.
Full per-sample table: [`eval/eval-report.json`](eval/eval-report.json).

| metric | Tier 2 (rhythm head) | Tier 3 (e5-small cycle 1) | rule engine |
|---|---|---|---|
| corpus TEST AUROC | 0.880 | 0.981 | — |
| corpus TEST TPR / FPR | 70.4% / 6.9% | 90.7% / 2.8% | — |
| eval clean-prose AI (23) | **7/23 (30.4%)** | **9/23 (39.1%)** | 0/23 |
| eval all AI (30) | 10/30 | 16/30 | 1/30 mixed |
| eval humans flagged (4) | 0/4 | **1/4** (human-so-bobince-2009) | 0/4 |
| reserved corpus-test humans (72) | 5/72 (6.9%) | 2/72 (2.8%) | — |

Honest readings:
- Both tiers beat the rule engine's 0/23 clean-prose ceiling, but neither is
  near the 70% clean-prose target yet. The out-of-domain drop (corpus test
  90.7% → eval 53%) is the expected freshness/domain gap, now measured.
- Tier 3 misses all 7 wiki-flagged AI samples: the classifier learned
  "wikipedia register = human" from the wikitext human side. Next cycle needs
  wiki-genre AI mirrors.
- Tier 3 flags one real human (a 2009 Stack Overflow answer) — a live FP at
  the chosen threshold; the hard-negative loop of plan §3.3 exists for this.
- Tier 2's calibrated ≤2% cal FPR became 6.9% on test humans — small-sample
  calibration drift; more calibration humans before shipping.

## 8. Addendum (2026-08-28, second pass) — int8 reconciliation and the shipping operating point

### 8.1 Quantisation reconciliation (eval/onnx-reconciliation.json)

Scored: all 34 quarantined eval samples + all 40 fresh humans
(`implementation/tests/battery/human-corpus-v1.json`), identical
preprocessing throughout (tokenizer from `tier3/checkpoint` = e5-small
vocab, truncation 512, no padding, no prefix, softmax over 2 logits):

| variant vs torch fp32 | max abs Δp | mean abs Δp | verdict flips @0.405 (of 74) | size |
|---|---|---|---|---|
| ONNX fp32 | 0.0000 | 0.0000 | 0 | 133.8MB |
| int8 per-tensor (previous ship) | **0.6832** | 0.2196 | **23** | 34.1MB |
| **int8 per-channel (SHIPS)** | 0.1201 | 0.0095 | 1 | 34.3MB |

Verdict: the earlier ≤0.038 parity claim was wrong — it was measured on two
short texts only. Per-tensor dynamic int8 genuinely destroys this model's
calibration; the orchestrator's lower sweep numbers were real quantisation
damage, not preprocessing drift. **`tier3-e5small-int8-perchannel.onnx` is
the shipping file**; `export_onnx.py` now quantises per-channel by default.
The remaining per-channel flip is opace-openai-003 (0.686 → 0.570, still
well above the shipping threshold band's meaning below).

Also surfaced: the two "int8 false positives" the orchestrator reported
(hc-biz-001 0.778, hc-biz-003 0.415) are fp32 behaviour — fp32 scores them
**0.855 and 0.856**. The cycle-1 classifier scores 6 of 10 verified-human
business-marketing texts (Apple/professional press-release copy) at
0.63–0.86, inside the same band as AI text.

### 8.2 Final shipping operating point (eval/final-operating-point.json)

Selection: FPR-first over 92 non-quarantined humans (72 corpus-test + 20
fresh cal, genre-stratified split recorded in the JSON), zero
business-marketing FPs required, ≤2% selection FPR; the 4 eval human
controls are quarantined and were excluded from selection (reported only).
Chosen: **threshold 0.857** on the per-channel int8 scores.

Shipping numbers (public disclosure line, verbatim):
- clean-prose AI TPR: **2/23 (8.7%)**
- all-AI TPR: **2/30 (6.7%)**
- combined human FPR (116 humans: 72 corpus-test + 40 fresh + 4 eval): **0/116 (0.0%)**

Read that honestly: at a business-safe operating point, cycle 1 detects
almost nothing. AI probabilities saturate at ~0.855–0.857 and six
marketing-copy humans sit at 0.63–0.86, so the zero-biz-FP constraint sits
above nearly all AI scores. The candidate table in the JSON shows the
trade-offs (e.g. 0.85 → 8/23 clean, 14/30 AI, but 2 biz FPs and 3.4%
combined FPR). **Recommendation: do not ship Tier 3 cycle 1 as a
standalone flagger for marketing audiences.** Ship it as an evidence row
with its probability and this table, and run cycle 2 with hard-negative
mining on professional marketing copy (the Pangram FP-killer loop, plan
§3.3) plus wiki-genre AI mirrors before any verdict-grade threshold.

`models/tier3-golden.json` contains the 5 golden texts scored by the
shipping per-channel int8 model (parity target for the browser runtime).
