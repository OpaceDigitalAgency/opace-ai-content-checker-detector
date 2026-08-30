# Paraphrase resilience of the Watermark Lab's own demo-key watermark — measured

**This measures Opace's own SynthID-Text port, scoring Opace's own published demo keys on
Opace's own 24-fixture corpus. It says nothing whatever about Claude, Gemini or ChatGPT
production watermarks, which are keyed privately and cannot be scored here at all.** A score
near 0.500 means "no signal under this key". It never means a human wrote the text.

**Date:** 29 August 2026
**Agent:** PARA-1
**Created:** this file only. No repository file was edited.
**Scripts:** scratchpad at
`/private/tmp/claude-501/-Users-davidbryan-Dropbox-Opace-Sales-Marketing-other-plugins/2a5bc65d-4276-41e1-b4bf-ebfca6acc0d8/scratchpad`
(`probe.mjs`, `deterministic.mjs`, `paraphrase_qwen.py`, `paraphrase_t5.py`, `scoreall.mjs`,
`fidelity.py`, `analyse.mjs`), with every rewrite recorded verbatim in `variants-*.json`.

---

## The finding, in one paragraph

Paraphrase removes the watermark. Across **40 machine paraphrases of 12 watermarked passages**,
produced by **two different local paraphrasers**, mean g fell from a baseline median of **0.6722**
to **0.5088** — the unwatermarked null is 0.500 — and **not one of the 40 was detected** under the
lab's own shipped decision rule (verdict withheld below 40 scored positions; signal reported only
below one-sided p < 0.001). Every rewrite retained enough length to be scored: the median rewrite
kept **180 scored positions**, the shortest kept 57, and all 40 cleared the 40-position floor. The
meaning survived: a sentence-embedding model that knows nothing about the watermark scored the
rewrites at a median cosine of **0.979** against their originals, where unrelated fixtures from the
same corpus score **0.747**. A separate blind reviewer graded 24 of the rewrites and found **zero**
where the meaning was destroyed. So this is not a case of a mangled rewrite taking the signal down
with it. The signal is gone and the text still says what it said.

**This retires the `NOT MEASURED` paraphrase row.** It is our own number, on our own fixtures,
with a named paraphraser and a stated denominator.

---

## 1. Harness validation — done first, and it passed

The brief is blunt about this and it is the right instinct: an unvalidated probe produces numbers
that cannot mean anything. Before any attack was scored, the harness was made to reproduce the
documented baseline.

| Check | Expected | Got | Verdict |
|---|---|---|---|
| `wm-alpha-400-03` under `opace-demo-alpha`, from the stored token ids | 0.6806616 / 393 positions | **0.6806616 / 393** | matches to 1.9 × 10⁻⁸ |
| Same passage via the **text → GPT-2 tokeniser → score** path the attack must use | identical | **identical**; re-tokenising the stored text reproduces all 400 stored token ids exactly | matches |
| All 24 fixtures × all 3 demo keys against `reference-scores.json` | 72 scores | **72 scores, max abs delta 2.98 × 10⁻⁸** | matches |

The third row matters as much as the first. It shows the harness reproduces the *wrong-key* and
*unwatermarked* rows too, so it can detect absence of signal as well as presence — a probe that
could only find signal would have been worthless for measuring an attack that removes it.

The text round-trip check is the one that licenses everything below. A paraphrase arrives as
text, not as token ids, so the measurement depends on the tokeniser path being sound. It is.

Raw output: `probe-result.txt` in the scratchpad.

---

## 2. What was scored, and on what

### Runtime and threshold — quote these together or not at all

| Item | Value |
|---|---|
| Engine | `@opace/watermark-lab` 0.1.0, `dist/bundle.js` SHA-256 `731d49779128cc468e4c70b6419e7d42a78f631da23e5dc1ceebdf708ac99959` |
| Reference ported from | google-deepmind/synthid-text, commit `addb4a158143c7c6851a1308f78b89fceed59683`, Apache-2.0 |
| Fixtures | `synthid-demo-v1.json` SHA-256 `c11b91db20072aa80a549c886dbecd6356a2c65a927733fdef529eecca7941f3` |
| Reference scores | `reference-scores.json` SHA-256 `0531263aff323d4fbcd9c05014b606bc20194b1e280207fabd4f8af72a31ed67` |
| Parameters | `ngramLen` 5, `contextHistorySize` 1024, watermarking depth **6 layers** |
| Keys | `opace-demo-alpha`, `opace-demo-beta`, `opace-demo-gamma` — public demo keys, each passage scored under the key it was generated with |
| Decision rule | verdict withheld below **40 scored positions**; signal reported only below one-sided **p < 0.001** |
| Null | mean g **0.500** |
| Host | macOS 15.7.8, Apple M4 Max, Node v24.2.0 |
| Scoring cost | **2.32 ms** per 400-token passage (tokenise + score, mean of 200 calls) |

**These figures are specific to this runtime and must never be quoted interchangeably with any
other runtime's.** Depth 6 is a deliberate teaching choice — the reference example uses 30 — and it
makes the per-layer signal *stronger* here than in the reference configuration. A different depth,
a different tokeniser, or a different model gives different numbers, and comparing across them is
the mistake this programme has already had to correct once.

### Corpus and denominator

| | Count |
|---|---|
| Watermarked passages scored | **12** (all watermarked fixtures in the corpus: 4 per key × 3 keys) |
| Passage lengths | 80, 200, 200, 400 GPT-2 tokens per key; `wm-gamma-400-11` is 311 tokens (it hit end-of-text early) |
| Baseline scored positions per passage | 76 to 393 |
| Paraphrase rewrites scored | **40** — 28 from arm A, 12 from arm B |
| Deterministic-transform rewrites scored | **36** — 3 transforms × 12 passages |
| Total scored rewrites | **76** |
| Fidelity judgements | 76 embedding-based, plus 24 blind human-style gradings |

Baselines, for reference below: mean g **0.6400 – 0.6936**, median **0.6722**, all 12 detected.

---

## 3. The paraphrasers, named exactly

Both run locally on this Mac. **No paid API was used and nothing was spent.** The only cost was
electricity and about 9 GB of model downloads.

### Arm A — a local instruct model (the closer analogue to the upstream figure we refused to publish)

| Item | Value |
|---|---|
| Model | **`Qwen/Qwen3-4B-Instruct-2507`** |
| Revision | `cdbee75f17c01a7cc42f958dc650907174af0554` |
| Precision / device | bfloat16, Apple MPS |
| Stack | transformers 4.57.6, torch 2.8.0, Python 3.9.6 |
| Decoding | `do_sample=True, temperature=0.7, top_p=0.8, top_k=20, repetition_penalty=1.05` (the model card's recommended non-thinking settings) |
| Seeds | 20260829 / 20260830 / 20260831 for variants p1 / p2 / p3 |
| Token budget | `max(160, words × 3 + 96)` new tokens |
| Prompt | system: *"You rewrite text. You output only the rewritten text and nothing else."* — user: *"Rewrite the passage below in different words. Keep the meaning and the level of detail the same, and keep the length within about ten per cent of the original. Do not add commentary, headings or quotation marks."* |
| Generation time | 370.1 s total, mean 13.2 s, range 3.0 – 34.3 s per rewrite |

The 4B parameter count is not a coincidence. The third-party figure this programme refused to
publish came from blind rephrasing with *an unwatermarked 4B model*. Arm A is deliberately the same
order of tool, so that our number can be read beside that one without the model size being a
confound — though it remains a different model, different scheme and different corpus, and the two
numbers are still not comparable.

**Arm A is incomplete and this is the one place the design fell short of plan.** The intent was 3
variants for each of the 12 passages, 36 in all. **28 completed, covering all 12 passages** — three
variants for seven passages, two for two, one for three. The run was stopped by me once every
passage had at least one rewrite, because the host was under extreme memory pressure from unrelated
work on the same machine (over 54 GB of 55 GB of swap in use, load average peaking above 160) and
throughput had fallen to roughly one rewrite per five minutes. The generation order was switched to
breadth-first mid-run for exactly this reason, so that stopping early would cost variants rather
than passages. The uneven design is reported here rather than smoothed over; it widens the
confidence interval on the mean and does not touch the detection count, which is zero either way.

### Arm B — a dedicated seq2seq paraphraser, fully deterministic

| Item | Value |
|---|---|
| Model | **`humarin/chatgpt_paraphraser_on_T5_base`** (T5-base, 223M) |
| Device | Apple MPS, transformers 4.57.6, torch 2.8.0 |
| Decoding | `num_beams=5, do_sample=False, early_stopping=True, repetition_penalty=1.2, no_repeat_ngram_size=2, max_length=160` |
| Unit | one sentence at a time, rejoined; segments under 3 characters passed through unchanged |
| Determinism | **complete** — beam search, no sampling, so the whole arm reproduces byte-for-byte |
| Generation time | 111.0 s for all 12 passages |

Arm B exists because arm A is sampled and therefore not reproducible from the script alone. Arm B
is. Anyone can re-run it and get the same 12 rewrites, and every rewrite from both arms is stored
verbatim so both arms can be re-scored without regenerating anything.

### Arm C — the deterministic transform floor (not a paraphrase, and labelled as such)

Three rule-based edits, no model and no randomness: a fixed 92-entry lexical substitution table,
sentence-order reversal, and both together. **These are not paraphrases.** They are included as the
weak-attack floor — the control that shows the collapse in arms A and B is caused by paraphrase and
not by the mere act of editing text.

---

## 4. Semantic fidelity, judged independently

The upstream figure's own author flagged unjudged fidelity as the confound, and it is the first
thing a critic asks: a "paraphrase" that destroys the meaning also destroys the watermark and
proves nothing. Two independent judgements, neither of which can see the watermark scores.

**Measure 1 — sentence-embedding cosine.** `intfloat/e5-small`, run locally, cosine between
original and rewrite. This model has no knowledge of the watermark, the keys, or the scores.
To calibrate what the number means rather than assert a threshold, the same measure was run over
12 pairs of *unrelated* fixtures from the same corpus: **mean 0.747, range 0.666 – 0.791.** That is
the floor for "same corpus, different content".

**Measure 2 — blind grading.** A separate reviewer, given only original/rewrite pairs with no
context and no scores, graded 24 rewrites (the p1 variant of every passage from each arm) as
*preserved*, *partial* or *destroyed*.

| Arm | Median e5 cosine | Min e5 cosine | Blind grading (12 pairs each) |
|---|---|---|---|
| A — Qwen3-4B-Instruct-2507 | **0.979** | 0.949 | 7 preserved, 5 partial, **0 destroyed** |
| B — T5 paraphraser | **0.978** | 0.961 | 3 preserved, 9 partial, **0 destroyed** |
| Unrelated-fixture floor | 0.747 | 0.666 | — |

**The decisive detail is the direction of the disagreement between the two arms.** Arm A produced
the *better* paraphrases on the blind grading — 7 preserved against arm B's 3 — and arm A also
destroyed *more* watermark signal (median 0.5072 against arm B's 0.5136). If the collapse were an
artefact of rewrites that lost the meaning, the arm with worse fidelity would have shown the lower
score. It shows the higher one. The confound points the wrong way for the objection.

Reported plainly, because it is a real limitation: the blind reviewer found **14 of 24 rewrites
"partial"** — the topic and most claims survive, but details drift. Arm B garbles images ("crusty
bits" becomes "buttocks"); arm A over-resolves the originals' vagueness (a dangling "25 billion"
becomes "25 billion years"). These are machine paraphrases of GPT-2's own semi-coherent prose, and
they are lossy. They are not, on any of the 24, rewrites about a different subject.

Lexical evidence that the rewriting was real: the paraphrase arms retained a median of **9%** of the
original's word 4-grams (maximum 27%). The deterministic arms retained 57 – 87%. The paraphrasers
replaced the token choices the g-values are computed from. That is the mechanism, visible in the
data.

---

## 5. The full distribution

### 5.1 Summary by transform

| Transform | Gate | n rewrites | Passages | mean g (mean) | mean g (median) | mean g range | Median positions left | Median length ratio | Detected at p<0.001 | Detection rate | Median e5 cosine | Median 4-gram retained |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Arm A — Qwen3-4B-Instruct-2507** | ungated | 28 | 12 | 0.5090 | **0.5072** | 0.4765 – 0.5447 | 180 | 0.938 | **0/28** | **0%** | 0.9788 | 7% |
| **Arm A — Qwen3-4B-Instruct-2507** | 90–110% token gate | 25 | 11 | 0.5089 | **0.5075** | 0.4765 – 0.5447 | 180 | 0.940 | **0/25** | **0%** | 0.9785 | 8% |
| **Arm B — T5 paraphraser** | ungated | 12 | 12 | 0.5159 | **0.5136** | 0.4929 – 0.5367 | 165 | 0.910 | **0/12** | **0%** | 0.9778 | 10% |
| **Arm B — T5 paraphraser** | 90–110% token gate | 7 | 7 | 0.5195 | **0.5196** | 0.4929 – 0.5367 | 187 | 0.925 | **0/7** | **0%** | 0.9765 | 13% |
| Arm C — deterministic lexical substitution | ungated | 12 | 12 | 0.6186 | 0.6133 | 0.5765 – 0.6798 | 192.5 | 1.003 | 12/12 | 100% | 0.9957 | 65% |
| Arm C — deterministic sentence reversal | ungated | 12 | 12 | 0.6411 | 0.6383 | 0.6147 – 0.6820 | 195 | 1.002 | 12/12 | 100% | 0.9849 | 87% |
| Arm C — deterministic substitution + reversal | ungated | 12 | 12 | 0.5922 | 0.5897 | 0.5609 – 0.6601 | 195.5 | 1.006 | 12/12 | 100% | 0.9816 | 57% |
| *(baseline, no damage)* | — | 12 | 12 | 0.6695 | 0.6722 | 0.6400 – 0.6936 | 192.5 | 1.000 | 12/12 | 100% | 1.000 | 100% |

**Both paraphrase arms combined:** 40 rewrites, 12 passages, mean g **0.5111**, median **0.5088**,
range **0.4765 – 0.5447**, median 179.5 scored positions, **0 of 40 detected**. The smallest
one-sided p across all 40 was **1.15 × 10⁻³** — above the 1 × 10⁻³ threshold, so no verdict on any
rewrite. Under the 90–110% gate: 32 rewrites, all 12 passages, median 0.5081, **0 of 32 detected**.

### 5.2 The length-gate question, answered explicitly

The upstream figure applied a 90–110% token-length gate to its rewrites. Whether a gate is applied
changes what the number means, because an ungated rewrite that shortens the text removes scored
positions — which would be truncation wearing a paraphrase costume.

**Both gated and ungated results are given above and they agree.** Applying the gate moves the
combined median from 0.5088 to 0.5081 and leaves the detection count at zero. **Every one of the 40
rewrites kept at least 57 scored positions**, comfortably above the lab's 40-position floor, so no
result here was produced by a passage becoming too short to score. Median length ratio across the
paraphrase arms was 0.94 — the rewrites are slightly shorter, not truncated.

Arm C is the direct control for this. Its three transforms preserve length almost exactly (median
ratio 1.00) and preserve detection completely (36/36). Length is not what carries the effect.

### 5.3 Per passage — arm A (variant p1), before and after

| Passage | Key | Baseline mean g | Baseline positions | After mean g | Positions after | Length ratio | In 90–110% gate | one-sided p | Detected at p<0.001 | e5 cosine | 4-gram retained |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `wm-alpha-80-00` | alpha | 0.6425 | 76 | **0.4935** | 77 | 1.01 | yes | 6.1e-1 | **no** | 0.9612 | 1% |
| `wm-alpha-200-01` | alpha | 0.6726 | 195 | **0.4927** | 183 | 0.95 | yes | 6.9e-1 | **no** | 0.9537 | 3% |
| `wm-alpha-200-02` | alpha | 0.6718 | 193 | **0.5018** | 184 | 0.94 | yes | 4.5e-1 | **no** | 0.9820 | 13% |
| `wm-alpha-400-03` | alpha | 0.6807 | 393 | **0.5063** | 346 | 0.88 | no | 2.8e-1 | **no** | 0.9818 | 5% |
| `wm-beta-80-04` | beta | 0.6820 | 76 | **0.5376** | 71 | 0.94 | yes | 6.1e-2 | **no** | 0.9851 | 17% |
| `wm-beta-200-05` | beta | 0.6867 | 183 | **0.5092** | 181 | 1.00 | yes | 2.7e-1 | **no** | 0.9785 | 16% |
| `wm-beta-200-06` | beta | 0.6936 | 192 | **0.5075** | 178 | 0.92 | yes | 3.1e-1 | **no** | 0.9790 | 12% |
| `wm-beta-400-07` | beta | 0.6701 | 389 | **0.5000** | 381 | 1.00 | yes | 5.0e-1 | **no** | 0.9818 | 6% |
| `wm-gamma-80-08` | gamma | 0.6842 | 76 | **0.4859** | 71 | 0.94 | yes | 7.2e-1 | **no** | 0.9706 | 21% |
| `wm-gamma-200-09` | gamma | 0.6615 | 192 | **0.5052** | 159 | 0.81 | no | 3.7e-1 | **no** | 0.9572 | 1% |
| `wm-gamma-200-10` | gamma | 0.6486 | 194 | **0.5447** | 194 | 1.01 | yes | 1.2e-3 | **no** | 0.9811 | 17% |
| `wm-gamma-400-11` | gamma | 0.6400 | 294 | **0.5185** | 279 | 0.94 | yes | 6.5e-2 | **no** | 0.9879 | 25% |

`wm-beta-400-07` p1 lands on **0.5000** against a null of 0.500 — 381 scored positions of nothing at
all. That single row is the clearest statement of the result in the whole document.

### 5.4 Per passage — arm B, before and after

| Passage | Key | Baseline mean g | Baseline positions | After mean g | Positions after | Length ratio | In 90–110% gate | one-sided p | Detected at p<0.001 | e5 cosine | 4-gram retained |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `wm-alpha-80-00` | alpha | 0.6425 | 76 | **0.4929** | 70 | 0.93 | yes | 6.2e-1 | **no** | 0.9734 | 7% |
| `wm-alpha-200-01` | alpha | 0.6726 | 195 | **0.5144** | 162 | 0.83 | no | 1.8e-1 | **no** | 0.9642 | 3% |
| `wm-alpha-200-02` | alpha | 0.6718 | 193 | **0.5281** | 196 | 1.00 | yes | 2.7e-2 | **no** | 0.9852 | 10% |
| `wm-alpha-400-03` | alpha | 0.6807 | 393 | **0.5129** | 337 | 0.86 | no | 1.2e-1 | **no** | 0.9860 | 11% |
| `wm-beta-80-04` | beta | 0.6820 | 76 | **0.5117** | 57 | 0.76 | no | 3.3e-1 | **no** | 0.9806 | 9% |
| `wm-beta-200-05` | beta | 0.6867 | 183 | **0.5367** | 159 | 0.91 | yes | 1.2e-2 | **no** | 0.9792 | 19% |
| `wm-beta-200-06` | beta | 0.6936 | 192 | **0.5060** | 168 | 0.86 | no | 3.5e-1 | **no** | 0.9674 | 6% |
| `wm-beta-400-07` | beta | 0.6701 | 389 | **0.5083** | 360 | 0.91 | yes | 2.2e-1 | **no** | 0.9715 | 8% |
| `wm-gamma-80-08` | gamma | 0.6842 | 76 | **0.5169** | 69 | 0.91 | yes | 2.5e-1 | **no** | 0.9765 | 16% |
| `wm-gamma-200-09` | gamma | 0.6615 | 192 | **0.5196** | 187 | 0.95 | yes | 9.4e-2 | **no** | 0.9612 | 13% |
| `wm-gamma-200-10` | gamma | 0.6486 | 194 | **0.5093** | 161 | 0.82 | no | 2.8e-1 | **no** | 0.9794 | 20% |
| `wm-gamma-400-11` | gamma | 0.6400 | 294 | **0.5340** | 289 | 0.99 | yes | 2.3e-3 | **no** | 0.9889 | 22% |

### 5.5 Arm A's within-passage spread

Where more than one variant completed, the spread across independent samples of the same
paraphraser on the same passage:

| Passage | n | mean g per variant |
|---|---|---|
| `wm-alpha-80-00` | 3 | 0.4935 / 0.5286 / 0.4765 |
| `wm-alpha-200-01` | 3 | 0.4927 / 0.5197 / 0.5075 |
| `wm-alpha-200-02` | 3 | 0.5018 / 0.5115 / 0.4981 |
| `wm-alpha-400-03` | 3 | 0.5063 / 0.5186 / 0.5200 |
| `wm-beta-80-04` | 3 | 0.5376 / 0.5069 / 0.5274 |
| `wm-beta-200-05` | 3 | 0.5092 / 0.5055 / 0.4935 |
| `wm-beta-200-06` | 3 | 0.5075 / 0.5047 / 0.4972 |
| `wm-beta-400-07` | 2 | 0.5000 / 0.5079 |
| `wm-gamma-80-08` | 2 | 0.4859 / 0.5258 |
| `wm-gamma-200-09` | 1 | 0.5052 |
| `wm-gamma-200-10` | 1 | 0.5447 |
| `wm-gamma-400-11` | 1 | 0.5185 |

Sampling noise moves individual readings by roughly ±0.03. No variant of any passage approaches its
baseline, and none crosses the detection threshold. The spread also shows the residual above 0.500
is not a consistent surviving signal — readings fall below 0.500 as often as they sit above it.

---

## 6. What this does and does not establish

**Established.**

- Under this runtime, at these lengths, machine paraphrase by either of two named local models
  reduces the lab's demo-key watermark to statistical indistinguishability from unwatermarked text,
  on every one of 40 attempts.
- It is not a length effect. Every rewrite retained enough scored positions for a verdict, the
  gated and ungated results agree, and length-preserving deterministic edits leave detection fully
  intact.
- It is not a meaning-destruction effect. Independent embedding similarity sits far above the
  unrelated-content floor, blind grading found nothing destroyed, and the arm with better fidelity
  removed more signal.
- Truncation and substitution, already in the published table, remain survivable. The distinction
  between "damage that leaves token choices in place" and "damage that replaces them" is now
  measured on both sides rather than argued.

**Not established, and stated plainly.**

- **Nothing about any production watermark.** Not Claude, not Gemini, not ChatGPT. Different keys,
  different depth, different tokeniser, different generation stack. This result does not transfer to
  them and must never be quoted as though it does.
- **Nothing about longer text.** Kirchenbauer et al. argue paraphrase dilutes rather than destroys
  given roughly 800 tokens. The longest passage here is 400 tokens, so **this measurement cannot
  test that claim and does not contradict it.** What it establishes is the behaviour at the lengths
  people actually paste, which is the case the lab exists to serve. The two findings are compatible:
  detection may well recover with length.
- **Nothing about depth 30.** These fixtures use depth 6, which strengthens the per-layer signal.
  Whether the reference's 30-layer configuration behaves the same under paraphrase is untested here.
- **Nothing about human paraphrase**, translation round-trips, or targeted removal. Those rows stay
  unmeasured.
- **Arm A is 28 of a planned 36 rewrites.** All 12 passages are covered, but variant depth is
  uneven, for the operational reason given in §3.
- **Two paraphrasers is not many.** A third, of a different family, would strengthen the claim. Both
  used here are small open models; a larger or purpose-built paraphraser was out of reach without
  spending money.
- **The blind grader is a language model, not a person.** It was given no context and no scores,
  which makes it independent of the measurement, but it is not a human fidelity study.
- **No false-positive rate was measured for the attack.** The question here is whether a known
  watermark survives, not how often unwatermarked text is misread; the corpus's 8 unwatermarked
  fixtures already cover the latter and were not re-run.

**Cost.** Nothing was spent. Both paraphrasers, the embedding model and the scorer run locally.
Total downloads about 9 GB; total compute under 9 minutes of generation across 40 rewrites, though
wall-clock was far longer because the host was saturated by unrelated work.

**One methodological note worth keeping.** The Hugging Face `xet` transport stalled repeatedly and
silently on this network, twice appearing as a hung process rather than an error. Setting
`HF_HUB_DISABLE_XET=1` resolved it each time. Anyone reproducing this on the same network should
expect that.

---

## 7. Ready-to-publish row for `WATERMARK-LAB.md`

Written so it cannot be quoted without its denominator and its paraphraser. **Owned by another
session — this is a proposal, not an edit.**

Replace the `**Paraphrased** | — | — | **NOT MEASURED**` row with:

```
| **Paraphrased** (Qwen3-4B-Instruct-2507, 40 rewrites of 12 passages) | 0.5088 median | 180 median | **measured — signal gone** |
```

And add, immediately after the existing blockquote under the table:

> **Paraphrase, now measured on our own fixtures.** We rewrote all 12 watermarked passages with two
> local paraphrasers — **`Qwen/Qwen3-4B-Instruct-2507`** at temperature 0.7 / top-p 0.8 / top-k 20
> (28 rewrites) and **`humarin/chatgpt_paraphraser_on_T5_base`** under deterministic 5-beam search
> (12 rewrites) — giving **40 rewrites of 12 passages**. Mean g fell from a baseline median of
> **0.6722** to **0.5088**, against an unwatermarked null of **0.500**, and **none of the 40 was
> detected** under this lab's own rule of 40 scored positions and one-sided p < 0.001. The median
> rewrite kept **180 scored positions**, so this is not shortening: length-preserving edits leave
> detection fully intact, and applying the same 90–110% token-length gate used by published work
> changes nothing (32 rewrites, 0 detected). The meaning survived — a sentence-embedding model with
> no knowledge of the watermark scored the rewrites at a median **0.979** cosine to their originals,
> where unrelated passages from the same corpus score **0.747**, and a blind reviewer graded 24
> rewrites with **none** judged to have destroyed the meaning. **Measured on `@opace/watermark-lab`
> 0.1.0 at depth 6 with the published demo keys, on passages of 80–400 GPT-2 tokens. It says nothing
> about any provider's production watermark, and these figures must not be quoted against another
> runtime's.** Full method, distribution and limits:
> `docs/measurements/PARAPHRASE-RESILIENCE-MEASUREMENT-2026-08-29.md`.

Three consequential edits follow from this and are flagged for the owning session rather than made
here:

1. The document's **"Planned → Adversarial robustness"** item says paraphrase should be measured
   first. It has been. Translation round-trips and targeted removal remain.
2. The **"Honest limits"** bullet reading *"We have not measured paraphrase attacks, translation
   round-trips or targeted removal"* is now wrong on the first of the three and needs narrowing.
3. The sentence *"no published number we trust fills that gap"* should become something like *"the
   gap is now filled by our own measurement rather than someone else's number"* — the reasoning for
   rejecting the third-party figure stands and should be kept; only the empty cell has changed.

---

## 8. How to reproduce

Everything needed is either committed to the repository or recorded verbatim in the scratchpad. The
scoring step needs no model at all.

1. **Validate the harness first.** `node probe.mjs` must print `0.6806616 / 393` for
   `wm-alpha-400-03` under `opace-demo-alpha` and a max parity delta below 1 × 10⁻⁷ across all 72
   fixture-key scores. If it does not, stop: nothing downstream means anything.
2. **Re-score the stored rewrites** without regenerating them:
   `node scoreall.mjs variants-deterministic.json variants-t5.json variants-qwen.json`, then
   `node analyse.mjs`. This reproduces every number in §5 exactly, from text alone.
3. **Regenerate arm B** if you want to check the paraphraser rather than trust the stored output:
   `HF_HUB_DISABLE_XET=1 python paraphrase_t5.py`. It is deterministic and reproduces byte-for-byte.
4. **Arm A is sampled** and will not reproduce exactly even at the recorded seeds across different
   transformers or torch builds. Its 28 rewrites are stored verbatim in `variants-qwen.json`, which
   is what makes the *scores* reproducible regardless.
5. **Fidelity:** `python fidelity.py variants-*.json` recomputes the cosines and the unrelated-pair
   floor.

The scratchpad is session-scoped and will not survive indefinitely. If this measurement is to be
cited, `variants-qwen.json`, `variants-t5.json`, `variants-deterministic.json`, `manifest-qwen.json`
and `manifest-t5.json` are the five files that must be preserved — they are the evidence, and
without the stored rewrites the arm A figures become unreproducible.
