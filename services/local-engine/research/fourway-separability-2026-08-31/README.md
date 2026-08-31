# Four-way verdict separability — ANSWERED, 31 August 2026

**The four-way verdict cannot be supported. Do not ship it.**

The contrast it depends on — telling AI-then-rewritten from pure AI — measures
**AUROC 0.448 [0.431–0.466]**, at or below chance, and gets *worse* as the
rewrite gets heavier: 0.487 light, 0.438 medium, **0.424 heavy**. An oracle
three-class boundary fitted on the same data it is scored on reaches 62.4%
balanced accuracy, but recovers only **20 of 300 pure-AI documents** — the class
collapses into the rewritten one.

`human` vs `human+AIedit` does separate (0.751, rising to 0.866 at heavy edit),
but that is only detecting that a machine touched the text. It is not the
distinction *"Likely AI but human edited"* claims to make.

**This closes a request the owner has raised repeatedly.** Publish it as the
fifth measured decline rather than leaving the question open.

A finding worth keeping: **rewriting moves a document's score UP**, consistently
and by a large margin — a heavy rewrite of human text shifts +3.039 on the logit
scale and moves upward in 96.7% of pairs, against a flag point at 3.512. Rewriting
leaves its own trace. Nothing hunts that trace directly, and this corpus has 1,702
examples of it.

Full numbers in `RESULTS.md` and `analysis-run-2026-08-31.txt` (complete run,
31 August 2026); contamination check in `contamination.txt`. `analysis.txt` is
the earlier *partial* first pass — it crashed in the pooled held-out section and
its arm-B probe figures (1.000 everywhere) are a known feature leak; use it only
for provenance.

## The question

Can **pure human**, **pure AI** and **AI-then-rewritten** be separated at all?
If they cannot, the four-way verdict the owner has asked for repeatedly
(*"Likely human but AI edited"*, *"Likely AI but human edited"*) cannot honestly
ship, and closing that question with evidence is itself the deliverable.

## What is here

| file | |
|---|---|
| `prove_harness.py` / `prove.log` | harness proof — **PASSED**, 883/922 and 45/4,636 exact against the shipped model |
| `score_pairs.py` / `pairs.log` | the scoring run |
| `baseline-scores.json` | 5,558-document baseline |
| `pair-scores.jsonl` | **2,302 scored rows** from `cycle4-humaniser-pairs` |
| `analyse.py` | the analysis — **run to completion 31 August 2026**, no code change needed |
| `RESULTS.md` | the dated results write-up: per-pair AUROCs, verdict on each half, provenance |
| `analysis-run-2026-08-31.txt` / `analysis-results-2026-08-31.json` | complete run output, console and JSON |
| `analysis.txt` | superseded partial first pass (crashed; arm-B figures leaked) — provenance only |

Shipped configuration throughout: `tier3-cycle2-e5small-fp32.onnx`
(sha `e313ab00de1fffd2`), `segments-v3`, T=0.8324, pair 0.9855/0.9763, fp32 CPU.

**These files were written to a session scratchpad and copied here before that
session closed.** They would otherwise have been lost.

## What remains

**Nothing — `analyse.py` was run to completion on 31 August 2026** (see
`RESULTS.md`). The three questions below were the brief, and all three are
answered there:

1. **Pairwise AUROC** for each contrast, with n and bootstrap intervals.
2. **Is the paired shift consistent?** Lineage IDs mean you can ask whether a
   specific document's score moves in a consistent direction and magnitude when
   rewritten. A consistent shift is signal; a scattered one is not, however
   different the class means look.
3. **Group-aware splits by source slug.** 2,302 rows come from 600 sources; a
   naive split puts a source's variants on both sides and produces a beautiful,
   meaningless result.

## Two constraints on whatever you conclude

**This corpus is LLM paraphrase, not commercial-humaniser output.** Every row
carries `commercial_humaniser: false`. Anything measured here describes *"an LLM
was asked to reword this"* and must be labelled that way. Commercial tools
escaped this same build 96.4% and 96.0% of the time — an order of magnitude
worse — so a four-way verdict trained on this data would not survive contact
with the tools people actually use.

**A negative result is a good outcome.** This programme has published four
measured declines. A fifth, closing a question the owner has raised repeatedly,
is worth more than a feature that asserts a distinction the data cannot support.

Context: `docs/programme/SESSION-HANDOVER-2026-08-31.md` §3c.
