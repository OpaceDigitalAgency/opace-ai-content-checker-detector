# Four-way verdict separability — data rescued 31 August 2026

**Scoring complete, analysis not run.** The session that produced this ended
before `analyse.py` was run over the results. Everything needed is here.

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
| `analyse.py` | written, **never run** |

Shipped configuration throughout: `tier3-cycle2-e5small-fp32.onnx`
(sha `e313ab00de1fffd2`), `segments-v3`, T=0.8324, pair 0.9855/0.9763, fp32 CPU.

**These files were written to a session scratchpad and copied here before that
session closed.** They would otherwise have been lost.

## What remains

Run `analyse.py`, then answer three things:

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
