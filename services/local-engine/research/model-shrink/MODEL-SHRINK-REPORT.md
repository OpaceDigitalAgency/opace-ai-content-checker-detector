# Model shrink — closed early, findings for the record

**Date:** 29 August 2026 · **Status:** stopped on the owner's instruction before any
candidate was built · **Superseded by:** [`SERVER-INFERENCE-PLAN.md`](SERVER-INFERENCE-PLAN.md)

## Why this stopped

The brief was to shrink the deployed 34.3 MB cycle-2 detector so it could load by
default rather than sitting behind a consent-gated download. Part-way through the
baseline measurement the owner changed direction: the checker will call a hosted
endpoint by default instead, and the local model stays as a selectable option. The
reasoning given, which this workstream agrees with:

- Local inference was never a moat. Any competitor can ship an ONNX file too.
- The actual selling point is "better than any free tool, and free".
- Shrinking costs accuracy, and accuracy is the only thing this tool has that works
  (90.6% detection against 45.1% for the rules tier, at 1.22% human false positives).

So the size/accuracy table this document was commissioned to produce does not exist.
Nothing was distilled, quantised to int4, or vocabulary-pruned. Saying otherwise would
be inventing numbers. What follows is only what was actually measured before the stop,
plus the constraints a future attempt inherits.

## What was measured

### 1. Held-out baseline, fp32 versus deployed int8

Both variants of the cycle-2 model scored on the full fresh long-form corpus
(922 AI / 4,636 human — data neither model was trained on), one code path,
identical tokenisation, identical row order. See
[`results/01-baseline.json`](results/01-baseline.json) and
[`scripts/01_baseline.py`](scripts/01_baseline.py).

| variant | file size | AUROC | detection @1.00% FP | detection @1.22% FP | detection @2.00% FP |
|---|---|---|---|---|---|
| int8 per-channel (deployed) | 34.28 MB | 0.9915 | 88.29% (814/922) | 89.05% (821/922) | 92.73% (855/922) |
| fp32 (same weights, unquantised) | 133.75 MB | 0.9916 | 88.29% (814/922) | **89.59% (826/922)** | 92.62% (854/922) |

Thresholds are chosen per variant to realise the stated false-positive rate on the
same 4,636 held-out humans, so the detection figures are directly comparable.
1.22% is included because it is the realised human false-positive rate at the
deployed 0.98 operating point.

Two things this settles:

- **The harness is sound.** 89.05% for the deployed int8 model at its own operating
  point reproduces the 90.6% (835/922) recorded in OBJECTIVE.md to within the
  difference in how the threshold was picked. The numbers below can be trusted
  against the existing record.
- **int8 costs almost nothing in the Python runtime — five documents.** 89.59% against
  89.05% at matched false positives, a gap of 5 of 922. Anyone reaching for fp32 on
  accuracy grounds alone is chasing noise. The genuine int8 problem is elsewhere: the
  0.113 median divergence between onnxruntime-web and Python, which this harness
  cannot see because it is a Python harness. fp32 does not have that problem at all,
  which is a correctness argument rather than an accuracy one.
- Per-register detection at 1% FP is identical for both variants to four decimal
  places on every one of the eight AI registers. Full breakdown in the JSON.

### 2. Quantisation costs speed on this model — it does not buy it

Interleaved measurement, 60 warm iterations per configuration, 512-token padded
input, real 400-700 word documents, ORT 1.29 CPU execution provider on Apple
Silicon. Interleaving matters: a first non-interleaved run put fp32 at 4 threads
*slower* than at 2, which was machine load, not the model.
[`results/latency-bench-2.json`](results/latency-bench-2.json),
[`scripts/bench_latency2.py`](scripts/bench_latency2.py).

| variant | threads | p50 per request | p95 | batch-8 per doc |
|---|---|---|---|---|
| int8 per-channel (34.3 MB) | 1 | 182.9 ms | 254.6 ms | 190.3 ms |
| int8 per-channel (34.3 MB) | 2 | 131.7 ms | 235.3 ms | 111.2 ms |
| fp32 (133.8 MB) | 1 | **165.0 ms** | 242.4 ms | 166.3 ms |
| fp32 (133.8 MB) | 2 | **97.7 ms** | 188.3 ms | 93.2 ms |

fp32 is roughly 25% faster than per-channel int8 at every thread count. Dynamic
per-channel int8 pays quantise/dequantise cost around each MatMul and misses the
optimised fp32 GEMM path; at 33M parameters the model is not memory-bandwidth
bound, so there is nothing for the smaller weights to win back.

**The consequence for this project:** int8 on this model exists purely to make the
download smaller. It is not an optimisation. Anywhere the file does not have to
travel — a server, or a desktop CLI — the fp32 file is both faster and free of the
quantisation drift and the onnxruntime-web calibration divergence documented in
OBJECTIVE.md. That single finding is what redirects the server design to fp32.

## Constraints a future shrink attempt inherits

Recorded because the Chrome extension and the WordPress plugin may genuinely want
no server call, and someone will pick this up again.

1. **This architecture quantises badly, and the evidence is repeated.** Per-tensor
   dynamic int8 shifted cycle-1's mean probability by 0.22 and flipped 23 of 74
   verdicts. int8 cost cycle-3 5.2 points of recall — enough that it could not ship
   to the browser at all. Per-channel int8 is the only variant that has ever held
   calibration on an e5-small head here. int4 starts from a worse position than any
   of those, and the brief's own instruction was to verify rather than assume.
2. **Any candidate must be validated through onnxruntime-web, not Python.** The
   deployment agent measured a median 0.113 divergence between the two runtimes on
   the quantised model, because Python applies extended int8 fusions the web build
   does not. Shipping the Python threshold would have produced 3.56% real-world
   false positives while the interface claimed 1.2%. A Python-only validation of an
   int4 candidate is worthless.
3. **The embedding table is 36% of the parameters** — 30,522 × 384 = 11.7M of 33.4M.
   Vocabulary pruning is therefore the highest-yield structural saving and the one
   with the clearest accuracy question attached (behaviour on out-of-vocabulary
   text). It was not attempted here.
4. **Distillation is the route with the best prior**, and the assets for it exist:
   the fp32 teacher, the 8,944-row train split plus 1,829-row cal split in
   `cycle2-train/dataset.jsonl`, and a fresh held-out corpus the teacher never saw.
   A 4-layer, 256-hidden student over a pruned vocabulary lands near 6 MB by
   parameter count. Whether it holds the per-register floors is unknown and must
   not be assumed — cycle 3 is the standing reminder that a model can improve on the
   headline metric and still regress stories and journalism past the point of use.
5. **Do not overwrite `tier3-cycle2-*` or `tier3-e5small-*`.** Nothing in this
   workstream did.

## Files

- `scripts/bench_coldstart.py` — cold start from a fresh OS process.
- `scripts/common.py` — corpus loading, ORT scorer, AUROC, FPR-matched thresholds,
  per-register breakdown. One code path for every candidate.
- `scripts/01_baseline.py` — fp32 and int8 on the held-out corpus.
- `scripts/bench_latency.py`, `scripts/bench_latency2.py` — latency; the second
  supersedes the first, which was not interleaved and is kept only to show why.
- `reference-server/` — the deliverable that replaced this one.
