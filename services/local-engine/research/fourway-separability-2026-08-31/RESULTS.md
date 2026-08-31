# Results — analysis run 31 August 2026

`analyse.py` was run to completion on 31 August 2026 against the preserved
`pair-scores.jsonl` (2,302 rows, 600 lineages). No code change was needed.
Full console output: `analysis-run-2026-08-31.txt`; machine-readable:
`analysis-results-2026-08-31.json`.

**Verdict: the four-way verdict is not supportable. Fifth measured decline.**

## Provenance of the earlier numbers

The figures quoted in `SESSION-HANDOVER-2026-08-31.md` §5 (0.448, 0.866,
+3.039/96.7%, 21.3%) came from a **partial first pass** whose console output is
preserved here as `analysis.txt`. That pass crashed with an IndexError in the
pooled held-out section and its "arm B" probe carried a feature leak (corpus
fields present only on rewritten rows, giving a giveaway AUROC of 1.000). Both
defects were fixed in the copy of `analyse.py` preserved in this directory
before it was ever committed; the fixed copy is what ran today.

**Every figure the handover quotes is confirmed unchanged by the complete run.**
The only numbers that changed are the arm-B probe results, which fall from a
leaked 1.000 to an honest ~0.60 (below).

The run is deterministic (seeded RNG, seed 20260831). numpy emitted
RuntimeWarnings from `matmul` during the probe fit; the fitted weights and all
predictions were checked and are finite (|W|max 0.54) — the warnings are
spurious noise from the macOS Accelerate BLAS backend and do not affect any
figure.

## 1. Pairwise AUROC on the shipped document score

Cluster bootstrap over 600 lineages, 95% CI. Shipped configuration throughout
(`tier3-cycle2-e5small-fp32.onnx`, segments-v3, T=0.8324, pair 0.9855/0.9763).

| contrast | n | AUROC | 95% CI |
|---|---|---|---|
| human vs human+AIedit | 300/861 | 0.751 | 0.731–0.771 |
| human vs AI+rewrite | 300/841 | 0.978 | 0.969–0.986 |
| human vs AI | 300/300 | 0.962 | 0.946–0.976 |
| human+AIedit vs AI+rewrite | 861/841 | 0.897 | 0.875–0.918 |
| human+AIedit vs AI | 861/300 | 0.858 | 0.831–0.885 |
| **AI+rewrite vs AI** | 841/300 | **0.448** | 0.431–0.466 |

By intensity, the contrast each half of the four-way verdict needs:

| contrast | light | medium | heavy |
|---|---|---|---|
| AI+rewrite vs pure AI | 0.487 (258/300) | 0.438 (294/300) | **0.424** (289/300) |
| human vs human+AIedit | 0.615 (300/290) | 0.778 (300/299) | **0.866** (300/272) |

## 2. Verdict on each half

**"Likely AI but human edited" — not supportable.** The distinction it needs,
AI-then-rewritten vs pure AI, sits at or below chance (0.448, worsening to
0.424 as the rewrite gets heavier — rewritten AI scores *more* AI-like, not
less). An oracle three-class boundary fitted on the very data it is scored on
reaches 62.4% balanced accuracy but recovers only 20/300 pure-AI documents —
the class collapses into AI+rewrite. A group-aware probe on shipped outputs
plus honest document-only surface features manages 57.5–57.8% balanced
accuracy (AUROC ~0.60) on pooled held-out data (n=598). Nothing here supports
telling a user "AI, then edited" apart from "AI".

**"Likely human but AI edited" — real signal, not shippable as a verdict.**
Human vs human+AIedit separates at 0.751 overall, 0.866 on heavy edits, and
the paired shift is large and consistent (heavy: median Δmargin +3.039
[+2.692, +3.321], upward in 96.7% of 272 pairs, against a flag point at
3.512). But this is the detector noticing that a machine produced the words —
at the programme's 1% false-label budget the shipped pair flags 21.0% (57/272)
of heavily rewritten human documents and 1.4% (4/290) of lightly copy-edited
ones, so it misses ~97–99% of the light edits real users make, and the strong
version of the measurement compares against the original text, which
inference does not have. The pooled held-out probe reaches only 69–71%
balanced accuracy (n=601).

## 3. Constraints on the conclusion

- Every row is LLM paraphrase (`commercial_humaniser: false`,
  `transformation_family: generic_llm_rewrite`, asserted in code). Nothing
  here describes purpose-built humanisers, which escaped this build 96.4% and
  96.0% of the time.
- The oracle boundary and its permutation null (three-class null median 35.8%,
  oracle 62.4%) show there is *some* structure, but it is the human/machine
  axis, not the four-way one.
- Cycle-2 training contamination of the sources is small (9.0% of AI sources,
  0.3% of human — `contamination.txt`) and cannot rescue a below-chance
  contrast.
