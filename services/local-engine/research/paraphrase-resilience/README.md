# Paraphrase resilience — the run behind "0 of 40"

**Measured 29 August 2026. Committed here 30 August 2026**, after the original artefacts were found
in `.agent/docs/ai-content-integrity/evidence/paraphrase-2026-08-29/` — a directory that sits
*outside* the repository, one level above `implementation/`. That is why the figure was cited in two
source-of-truth documents while being unreproducible from a checkout. The files are now inside the
repository, which is the whole point of this directory.

Findings and narrative: `docs/WATERMARK-LAB.md`. Summary row: `docs/programme/HANDOVER.md` §4.8.

## The result

**0 of 40 paraphrased passages detected.** 40 rewrites of the 12 watermarked fixtures, by two named
local paraphrasers. Mean g fell from a baseline median of 0.6722 to 0.5088 against a null of 0.500.
The smallest p across all forty was 1.15 × 10⁻³ — above the 1 × 10⁻³ threshold, so nothing detected.

## The controls, without which the number means nothing

| Control | Expectation | Measured |
|---|---|---|
| Unparaphrased watermarked baseline | must still score | **12 of 12 detected**, mean g median 0.6722 |
| Length-preserving deterministic rewrite (92-entry synonym table + sentence reversal) | must still score | **36 of 36 detected**, mean g median 0.6155 |
| Unwatermarked text under all three demo keys | must **not** score | **0 of 24 detected**, mean g median 0.5000 (range 0.4756–0.5264) |
| Degraded-but-watermarked fixtures | must still score — proves the rule can fire | **4 of 4 detected** |

> **Corrected 30 August 2026.** This row previously gave the unwatermarked median as **0.4989**, which was wrong.
> Recomputed from `packages/watermark-lab/fixtures/reference-scores.json`, the 24 unwatermarked scores have a
> median of **0.5000** (both middle values are exactly 0.500000) and a mean of 0.5007. The range and the
> denominator were correct and are unchanged, and the 0 of 24 result is unaffected.


The last row exists because a detection rule that only ever returns "no" is not a measurement. The
rule fires on watermarked text that has been truncated and substituted, and stays silent on
unwatermarked text. It can distinguish both directions before it is pointed at the paraphrase arm.

The two standard objections are closed by the first three rows. It is not shortening: median 180
scored positions retained, minimum 57, and the 90–110% token gate leaves detection at zero. It is
not meaning destruction: e5 cosine median 0.9788, minimum 0.9487, against a measured
unrelated-fixture floor of 0.747 (`fidelity-floor.json`).

## Detection configuration — the exact rule applied

Applied in `analyse.mjs`; it is an operating point the consumer applies, not a property of the
library. `score()` returns statistics and applies no threshold.

```
detected  ⇔  scoredPositions >= 40  AND  oneSidedP < 1e-3
```

Scored by `@opace/watermark-lab` (`packages/watermark-lab`), GPT-2 BPE tokenisation, the three
public demo keys in `DEMO_KEYS`, watermarking depth 6. Source passages are the 12 `kind:
"watermarked"` fixtures in `packages/watermark-lab/fixtures/synthid-demo-v1.json` — already
committed, which is what anchors this run to the repository.

## The paraphrasers

Both ran locally on `mps`; no hosted API was involved, so there is no key to rotate and no spend to
report. Full decoding settings, revisions and library versions in `manifest-qwen.json` and
`manifest-t5.json`.

| Arm | Model | n | Decoding |
|---|---|---|---|
| A | `Qwen/Qwen3-4B-Instruct-2507` rev `cdbee75f` | 28 | sampled, T 0.7, top_p 0.8, top_k 20, seeds 20260829–31 |
| B | `humarin/chatgpt_paraphraser_on_T5_base` | 12 | 5-beam, deterministic, per sentence |

Arm A is **sampled**, so it is reproducible only from the stored rewrites in `variants-qwen.json`,
not by re-running the model. That is precisely why the variants are committed rather than
regenerated. Arm A's prompt is recorded verbatim in `manifest-qwen.json`; the instruction was to
rewrite in different words, keep meaning and detail, and stay within about ten per cent of the
original length.

Arm A completed 28 of a planned 36 rewrites. The operator stopped the run once every passage had at
least one rewrite, because the host was under extreme memory pressure from unrelated work. That is
recorded in `manifest-qwen.json` rather than smoothed over; the denominator is 40, not 48.

## Reproducing it

Requires only Node — no model downloads, no network, no credentials.

```sh
npm --prefix packages/watermark-lab run build
cd services/local-engine/research/paraphrase-resilience
node probe.mjs                                                   # harness validation
node corpus.mjs                                                  # rebuild corpus from committed fixtures
node scoreall.mjs variants-deterministic.json variants-t5.json variants-qwen.json
node analyse.mjs                                                 # writes analysis.json, summary.json
```

**Verified 30 August 2026.** Re-running the above regenerates `corpus.json` and `summary.json`
byte-identically to the files committed here, and `scores.json` and `analysis.json` identically in
every field except `ms`, which is wall-clock timing and varies by machine. `probe.mjs` reproduces
`probe-result.txt` exactly.

Regenerating `fidelity.json` additionally needs `intfloat/e5-small` via `fidelity.py`; the stored
output is committed so the scoring path above does not depend on it.

## Files

| File | What it is |
|---|---|
| `variants-qwen.json` | The 28 Qwen rewrites, as scored |
| `variants-t5.json` | The 12 T5 rewrites, as scored |
| `variants-deterministic.json` | The length-preserving control arm |
| `manifest-qwen.json`, `manifest-t5.json` | Model id, revision, dtype, decoding, prompt, seeds |
| `scores.json` | Per-variant raw scores, including the baselines |
| `analysis.json` | Per-variant scores joined to baseline, fidelity and the detection verdict |
| `summary.json` | The per-arm aggregation behind the published row |
| `fidelity.json`, `fidelity-floor.json` | Semantic fidelity, and the unrelated-fixture floor it is judged against |
| `judge-pairs-*.json` | Blind grading pairs, presented without scores or context |
| `probe-result.txt`, `probe.mjs` | Harness validation, run before any attack figure was trusted |
| `corpus.mjs`, `deterministic.mjs`, `scoreall.mjs`, `analyse.mjs` | The scoring and control harness |
| `paraphrase_qwen.py`, `paraphrase_t5.py`, `fidelity.py` | The generation and fidelity halves |

## Scope — stated so the figure cannot travel further than it should

Public demo keys, depth 6 rather than the reference 30, longest passage 400 tokens, GPT-2
tokenisation, detection only. It says nothing about any production watermark from Google, Anthropic
or OpenAI. It does not contradict the ~800-token recovery claim in Kirchenbauer et al., because
nothing here reaches that length. The blind grader is a model, not a person, and 14 of 24 rewrites
were graded "partial". The fixture seeds were selected so demonstration scores sit within documented
tolerance bands, as disclosed in the fixture manifest.

**Do not cite any figure from here without its denominator, its paraphraser and its runtime.**

## A note on where this nearly died

The scripts originally carried absolute paths into one machine's Dropbox. Those are now resolved
relative to this file, which is the only edit made to the harness; the raw outputs are the 29 August
originals, untouched.
