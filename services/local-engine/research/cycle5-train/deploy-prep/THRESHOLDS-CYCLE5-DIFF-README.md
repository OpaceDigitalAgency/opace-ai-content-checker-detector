# What `thresholds.cycle5.json` changes vs the live `thresholds.json`

1 September 2026. **Prepared artefact only. Not applied to the website
checkout (`opace-website/astro-latest/public/models/local-signals-v1/thresholds.json`
is untouched). Not deployed.** This document is the diff and the reading
guide for `thresholds.cycle5.json` in this same directory.

## The live file today

`tier3-cycle2-v1`, threshold 0.9855 / secondary 0.9763, **in calibrated
probability space** (`probability = softmax(logits/temperature)[1]`,
temperature 0.8324), segments-v3, `md-strip-v1` input normalisation, two
runtimes measured (server fp32, browser int8), figures on the 5,558-document
long-form corpus plus short-form, fiction, humaniser-pairs and route-agreement
measurements.

## What changes, field by field

| field | cycle-2 (live) | cycle-5 (prepared) | why |
| --- | --- | --- | --- |
| `version` | `tier3-cycle2-v1` | `tier3-cycle5-v1` | new candidate |
| `model_file` | one int8 filename | `model_file_fp32` + `model_file_int8`, plus their sha256 | the live file only ever named the int8 browser file; the candidate config carries both hashes, so both are recorded |
| `input_normalisation` | absent (md-strip-v1 is implied by the site's fixed `MODEL_INPUT_CONTRACT`, never itself a field in this file) | **new field**, `"raw-v1"` | Phase 1 finding: cycle 5 was trained on raw markdown-intact text on both the encoder and the structural features, verified against `train.py` and the training data itself, not assumed |
| `features_contract` | absent | **new field**, `"features-v1"` | cycle 5 is a 3-input ONNX (`input_ids`, `attention_mask`, `feats[8]`); cycle 2 has no structural-feature input at all |
| `scoring` | probability-space: `threshold`/`secondary_threshold` are both probabilities, compared after softmax | **margin-space**: `threshold` (3.570935) and `secondary_gap` (0.34, additive) apply to raw logit margins, never passed through the calibrated-probability softmax for the verdict decision | this is not a value change, it is a **different comparison rule**. CYCLE5-REPORT's whole point (the cycle-4 lesson) is that the secondary must be fitted in margin space, never pinned to a probability ratio. **The runtime code that currently reads `threshold`/`secondary_threshold` as two probabilities and compares them directly (wherever that lives in the site/server verdict logic) cannot consume this file unchanged — it needs a margin-space comparison path.** This is the single most important engineering fact in this diff: it is not swap-the-numbers, it is swap-the-rule. Flagged for Phase 4/5, not built here. |
| `secondary_threshold` | `{value: 0.9763, note}` | **removed**, replaced by `secondary_gap: 0.34` (additive, margin space) | field name preserved would be actively misleading — 0.34 is not a probability |
| `temperature` | 0.8324, applied before the verdict threshold | 1.0479, applied only to the DISPLAYED probability/score bands, not the verdict | temperature still exists (for score-band copy) but no longer gates the flag decision |
| `measured.server_fp32_segmented` / `browser_int8_segmented` | full dual-runtime tables: long-form, fiction, short-form, matched-pairs-equivalent, register/genre breakdowns | same shape, populated with **fresh cycle-5 figures**, denominators intact; **matched-pairs (gate 2) and route-agreement have no int8 measurement and are recorded as such (`null`/explicit gap note), not fabricated or silently copied from fp32** | no claim without measurement — an unmeasured cell says so |
| `execution_provider_note` (WASM vs WebGPU) | present, closed with real browser measurement | **absent for cycle 5** | not measured yet; would need the same real-browser re-score tier3-cycle2-v1 got, which is Phase 4/5 work |
| `mixed_content_cost` | present (half-AI/half-human spliced documents) | **absent for cycle 5** | not re-measured in this pass |
| `route_agreement` | present (55/5,558 disagree) | **absent for cycle 5**, noted as a gap | not computed in this pass |
| `bands` (display bands, share_ai) | present, fitted on the browser runtime's score distribution | **absent for cycle 5** | display bands would need refitting against cycle-5's own score distribution; not done here, since it affects UI copy and is Phase 5 territory once the runtime rule itself is settled |

## What did NOT change in method, only in number

- Segmentation contract stays `segments-v3`.
- The "measured on both runtimes, never mixed, every figure names its own
  denominator and runtime" discipline is preserved exactly.
- The eval-view exclusion method (hash-quarantine against train/cal) is
  the same mechanism, just cycle-5's own `eval-exclusions.json`.

## The honest gaps, restated plainly

`thresholds.cycle5.json`'s `known_gaps` array is the authoritative list.
The two that matter most before this could ship:

1. **The int8 figures here are native onnxruntime, not onnxruntime-web
   through a real browser.** Cycle-2's own file only closed this gap
   (`execution_provider_note`) with a dedicated post-ship re-score; cycle-5
   needs the equivalent before its browser figures can be called measured
   on "the runtime that runs," which is the standard `thresholds.json`
   itself states (`browser_int8_segmented.note` in the live file: "measured
   through the browser runtime, because that is the one that runs").
2. **Matched-pairs (gate 2) — the strongest single finding in
   CYCLE5-REPORT (27.3%→0.2%) — has no int8 measurement at all.** Only
   `scores/c5-matched-eval-*.jsonl` exists; no `c5i8-matched-eval-*.jsonl`
   was produced during training. If the browser route ships without this,
   its headline finding is unverified on the runtime most visitors
   actually use.

## Files

- `thresholds.cycle5.json` — the prepared candidate file, this directory.
- `THRESHOLDS-CYCLE5-DIFF-README.md` — this document.
- Figures cross-checked against `docs/measurements/CYCLE5-OPERATING-POINT-2026-08-31.md`
  (Phase 2) and `CYCLE5-REPORT.md` — the fp32 eval-view numbers reproduce
  both exactly, which is the evidence this file's own figures are real
  measurements and not invented to fit the schema.
