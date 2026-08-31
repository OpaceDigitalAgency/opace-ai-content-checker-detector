# Robustness to LLM rewriting — the 30–35% figure, re-measured on the shipped model

*31 August 2026. Every figure below names its runtime and its flag point. Nothing here changed a
threshold, touched `thresholds.json`, retrained anything or deployed anything.*

> **What this measures, stated before any number.** The rewritten text scored here is **LLM
> paraphrase**: a general-purpose model was asked to reword an existing passage. It is **not
> commercial-humaniser output**. `rewrite.py` says so explicitly, every row carries
> `commercial_humaniser: false` and `transformation_family: generic_llm_rewrite`, and no row may
> be labelled JustDone, QuillBot, Undetectable.ai or any other product. Read every figure in this
> file as robustness to *"an LLM was asked to reword this"*. A commercial humaniser is a different
> attack and is being measured separately.

## Summary

| question | answer |
|---|---|
| Is the published 30–35% current? | **No.** It was measured **unsegmented**, at a **single margin threshold** fitted to 1.19% false positives, from the **PyTorch checkpoint**. The shipped configuration is none of those three. It must not be compared with the figures below. |
| A human original that an LLM **fully rewrote** | **21.0%** flagged — 57/272, server route, `0.9855/0.9763`. Identical at **20.8%** (35/168) on the matched browser subset. |
| A human original that an LLM **copy-edited** | **1.4%** — 4/290, server route. Near the 1.0% untouched-human rate, and correct behaviour. |
| Does rewriting AI text hide it? | **No.** **95.6%** of the AI documents the tool detects are still detected after an LLM rewrite (526/550); **92.0%** after a full rewrite. Browser 96.5%. |
| Does the attack vary by rewriting model? | **Strongly.** 3.3% to 19.9% on the human side — a **six-fold spread** across five rewriters. |
| Do the runtimes disagree? | **Barely.** Under 1.1 pp on every cell, 2.4% document-level disagreement, and identical on the `heavy` band. |
| What dominates? | **Length, not rewriting.** 41.2% at under 200 words against 93.8% at 600–899 — a 50-point range, against 12 points for rewrite strength. |

**Bottom line.** The tool's real weakness here is not that a rewrite hides AI text — it does not.
It is that **a machine can rewrite a person's document into something largely machine-written and
be flagged only about one time in five**, and that this depends more on which model did the
rewriting than on anything about the document.

---

---

## 1. Provenance of the published 30–35% — measured at a retired operating point

`HANDOVER.md` §9 item 3, `README.md`, `CAPABILITIES.md`, `PER-MODEL-DETECTION.md` and five package
READMEs all carry **"an AI rewrite of a human original — 30–35%"**, cited as *"HAT-Bench v6–v8
bands"*. In the README's weakness table it is the **only row with no denominator and no runtime**;
every other row carries both.

Traced to source, it is the `c2` column of
[`../../services/local-engine/research/cycle3-edited/CYCLE3-REPORT.md`](../../services/local-engine/research/cycle3-edited/CYCLE3-REPORT.md)
§3.1, dated 28 August 2026:

| band | true AI token share | n | cycle-2 (the shipped model) |
|---|---|---:|---:|
| v6 | 0.80 | 1,022 | 29.65% |
| v7 | 0.93 | 1,020 | 30.78% |
| v8 | 1.00 | 1,022 | 34.83% |

**The corpus.** HAT-Bench's held-out group split — 9,246 documents, 2,259 essay groups, split by
essay so no edited copy of a training document appears in test. Student essays, research
abstracts, news and business reports at 100–900 words.

**"Rewritten" means:** HAT-Bench's own edit ladder. `v0` is a human document; `v1`…`v8` are
progressively LLM-rewritten versions of it, each with a measured true AI-token share. v6/v7/v8 are
80%, 93% and 100% AI by token.

**The model** is the shipped one — cycle 2 — but scored from the PyTorch checkpoint
(`cycle2-train/cycle2-checkpoint`), not the shipped ONNX export.

### The three ways this is not the shipped operating point

Read from `cycle3-edited/eval-cycle2.json` and `common3.py`:

| | the 30–35% measurement | what ships |
|---|---|---|
| segmentation | **none** — one truncated 512-token pass per document (`common3.py`: `truncation=True, max_length=512`) | `segments-v3`, maximum over sections |
| flag rule | **single threshold** in margin space, `margin ≥ 3.3344`, chosen to realise 1.19% false positives on 4,636 humans | **minimum-evidence pair** 0.9855 primary / 0.9763 secondary |
| artefact | PyTorch checkpoint | `tier3-cycle2-e5small-fp32.onnx` (server) / `…-int8-perchannel.onnx` (browser) |

Max-over-segments is the single largest thing missing. `HANDOVER.md` §4.2 and §4.6 both record that
aggregation is where most of the detection comes from, and the 30–35% figure was taken before any
of it existed.

**The figure is also almost entirely an artefact of where the threshold was put.** The same model,
the same documents, the same day, at five points on one curve:

| realised human FPR | margin | v6 | v7 | v8 |
|---|---|---:|---:|---:|
| 0.47% | 3.5377 | 18.3% | 17.5% | 20.9% |
| **1.19%** | **3.3344** | **29.7%** | **30.8%** | **34.8%** ← the published figure |
| 1.96% | 3.0705 | 40.2% | 41.3% | 46.6% |
| 2.98% | 2.8446 | 46.2% | 49.9% | 55.8% |
| 4.96% | 2.4310 | 57.2% | 61.0% | 65.8% |

A three-point move in false positives triples the number. Quoting "30–35%" without its flag point
says almost nothing about the model.

### A third, looser, retired figure for the same weakness

`OBJECTIVE.md` line 205 records **"HAT-Bench v6–v8 67–70%"**, alongside paraphrase 63.6% and
style-rewrite 64.9%. That was measured at **threshold 0.9110** — which `HANDOVER.md`'s own
"superseded figures — do not quote" list already names as retired. So the project has carried
**three different numbers for one weakness, at three retired operating points, and none at the
pair that ships**: 67–70% (0.9110), 30–35% (margin 3.3344, unsegmented), and nothing at
0.9855/0.9763.

### Earlier humaniser material, located

- **The primary source is HAT-Bench**, above.
- **GRADTEX transformation families** in the cycle-2 test split, at the same retired point:
  paraphrase **25.0% (11/44)**, style-rewrite **54.1% (20/37)**, partial-completion 10.5% (4/38),
  light-edit 0% (0/49). Denominators of 37–49; too small to carry a published claim.
- **`paraphrase-resilience/` is not this.** It is the **watermark** arm — `HANDOVER.md` §4.8,
  "0 of 40 paraphrased passages detected" — and concerns the SynthID-style watermark detector, not
  the trained classifier. It does not bear on the 30–35% figure.
- **`style: humanise` rows elsewhere in the corpus are not this either.** They are AI *originals*
  written under an anti-AI style instruction, with no paired before-text.

---

## 2. Method — and the harness proved before any new number was taken

### 2.1 The two runtimes, named against every figure

| | server route | browser route |
|---|---|---|
| model file | `tier3-cycle2-e5small-fp32.onnx` | `tier3-cycle2-e5small-int8-perchannel.onnx` |
| SHA-256 | `e313ab00de1fffd2…` | `b0b985cdabdc61ce…` |
| runtime | Python `onnxruntime` 1.29.0, `CPUExecutionProvider` | **onnxruntime-web 1.29.0, WASM** — the runtime a visitor actually runs |
| tokeniser | HF `AutoTokenizer`, padded to 512 | the shipped TypeScript WordPiece |
| segmentation | `segments-v3` | `segments-v3` (shipped `segments.ts`) |
| temperature | 0.8324 | 0.8324 |
| flag rule | 0.9855 primary / 0.9763 secondary | 0.9855 primary / 0.9763 secondary |

The browser side is the real shipped runtime, not a Python stand-in on the int8 file. That
distinction matters here: `thresholds.json` `runtime_note` records a median |Δp| of **0.113**
between onnxruntime-web and Python onnxruntime *on the same int8 file*, caused by the extended
int8 fusions Python applies at `ORT_ENABLE_ALL` and the web build does not. A figure taken with
Python on the int8 file would be neither route.

Section probabilities are kept **unrounded**. The 4 dp segment store rounds 884/922 where the truth
is 883/922.

### 2.2 Harness gate — server route

Re-scored the whole 5,558-document long-form corpus before taking any new cut:

| published | expected | this run |
|---|---|---|
| AI detected | 883/922 | **883/922** ✅ |
| human false positives | 45/4,636 | **45/4,636** ✅ |
| fiction (`story`) | 23/260 | **23/260** ✅ |
| academic discussion | 8/420 | **8/420** ✅ |

### 2.3 Harness gate — browser route

Re-scoring 5,558 documents through onnxruntime-web is about five hours, so the browser gate is
taken the other way round, and is stronger for it. The canonical full-corpus browser run
(`corpus-reconciliation-2026-08-29/raw/browser-runtime-scores.json`) reproduces all four published
browser figures at the shipped pair:

| published (browser) | expected | reference run |
|---|---|---|
| AI detected | 889/922 | **889/922** ✅ |
| human false positives | 90/4,636 | **90/4,636** ✅ |
| fiction (`story`) | 26/260 | **26/260** ✅ |
| academic discussion | 21/420 | **21/420** ✅ |

and this measurement's browser scorer reproduces that reference **bit-for-bit**: 65 long-form
documents, 263 sections, **max |Δp| = 0.000e+00**, no segment-count disagreement. Same model file,
same tokeniser, same segmentation, same runtime, identical output.

### 2.4 The material

`services/local-engine/research/cycle4-humaniser-pairs/` — 600 sources (300 AI, 300 human), 1,702
kept rewrites, 2,302 rows in total, every variant carrying the `lineage_id` of its source.

**Three rewrite strengths, not two.** `README.md` and `rewrite.py` define `light` (copy-edit),
`medium` (structural paraphrase) and `heavy` (full rewrite). Measured lexical retention confirms
the ladder is real and well separated:

| side / strength | n | tf-cosine | unigram retained | 4-gram retained | 8-gram retained |
|---|---:|---:|---:|---:|---:|
| ai / light | 258 | 0.988 | 0.979 | 0.923 | 0.856 |
| ai / medium | 294 | 0.726 | 0.716 | 0.226 | 0.071 |
| ai / heavy | 289 | 0.594 | 0.547 | 0.088 | 0.018 |
| human / light | 290 | 0.981 | 0.966 | 0.869 | 0.772 |
| human / medium | 299 | 0.762 | 0.704 | 0.240 | 0.095 |
| human / heavy | 272 | 0.628 | 0.544 | 0.129 | 0.032 |

Five rewriting models: `google/gemini-3.7-flash`, `meta-llama/llama-4-maverick`,
`openai/gpt-5.6-luna`, `deepseek/deepseek-v4-pro-0813` and `mistralai/mistral-medium-3-5`
(held out as an unseen family).

**Which band is comparable to HAT-Bench v6–v8.** `heavy` retains 9–13% of 4-grams and 2–3% of
8-grams — near-total rewording, the closest analogue to the 80–100%-AI-token bands the published
figure was taken on. `light` is nearer HAT-Bench v1–v2. The two ladders are measured differently —
HAT-Bench by true AI token share, this corpus by lexical retention — so the mapping is
approximate and no arithmetic is done across it.

### 2.5 Two directions, which the published wording runs together

The corpus separates what the published figure does not:

| class | what it is | the question |
|---|---|---|
| `ai_original` → `ai_original_neural_rewrite` | AI text put through an LLM rewrite | **evasion**: does rewriting hide it? |
| `human_original` → `human_original_ai_edited` | a human original put through an LLM rewrite | the published weakness: is the machine-written result caught? |

The published 30–35% describes the **second**. The task framing "AI text rewritten to sound human"
describes the **first**. Both are measured below and are reported separately, because they behave
very differently.

### 2.6 The confound that governs everything here — length

The pairs corpus is **short**: median 372 words for AI originals, **median one section per
document**. The 5,558-document long-form corpus behind the 95.8% headline has a median AI document
of 1,612 words and six sections. Maximum-over-sections is where most of the detection comes from
(`HANDOVER.md` §4.2, §4.6), and at one section there is nothing to maximise over.

**So the absolute rates in this file must never be read against the 95.8% headline**, and the
paired, same-lineage comparison in §3.2 is the only sound reading of what rewriting itself costs.

### 2.7 Denominator honesty — the 98 quarantined rewrites

98 rewrites were quarantined when the corpus was built, and excluding them is not neutral:

| reason | side | strength | n |
|---|---|---|---:|
| `no_change` | ai | light | **41** |
| `no_change` | ai | medium | 5 |
| `no_change` | human | light | 9 |
| `length_collapse` | human | heavy | 27 |
| `length_collapse` | ai | heavy | 11 |
| `length_collapse` | ai / human | light / medium | 3 |
| `truncated` | human | light / heavy | 2 |

A `no_change` row is a rewrite that did not rewrite — the model returned its input. Of the 41 on
the AI/light arm, **27 have a source the detector already flags**. Those are failed attacks, and
dropping them removes cases the tool would have caught, so **the light-intensity cells below are a
lower bound**: added back at their sources' verdicts, AI/light detection would read 27 higher on a
denominator 41 larger. Nothing in the table is flattered by the exclusion; the light arm is
understated by it.

---

## 3. Results — server route (fp32), shipped pair, all 2,302 rows

### 3.1 Headline, with denominators

| population | flagged AI | n |
|---|---|---:|
| AI originals, untouched | 65.3% [59.8–70.5] | 196/300 |
| **AI originals after an LLM rewrite** | **74.1%** [71.0–76.9] | **623/841** |
| human originals, untouched (false positives) | 1.0% [0.3–2.9] | 3/300 |
| **human originals after an LLM rewrite** | **10.9%** [9.0–13.2] | **94/861** |

Two things to read off this before anything else.

**The AI baseline is 65.3%, not 95.8%.** These sources are short — median 372 words, median one
section. That is the §2.6 length confound, not a rewrite effect, and it is why the paired
comparison below is the only sound reading.

**Rewriting AI text made it *easier* to catch, not harder** — 74.1% against 65.3% on the very same
sources. An LLM asked to reword machine prose produces more machine-like prose, and usually
slightly more of it.

### 3.2 The paired comparison — the number that matters

Of the AI sources the tool detects, how many of their rewrites does it still detect?

| | |
|---|---|
| AI sources detected before rewriting | **196/300** |
| **their rewrites still detected** | **95.6%** [93.6–97.1] — 526/550 |
| lost to the rewrite | **24/550** |

**Rewriting an AI document with another LLM does not evade this detector.** Twenty-four documents
in 550 are lost. By strength:

| rewrite strength | survives detection | n |
|---|---|---:|
| light (copy-edit) | 98.8% [95.8–99.7] | 167/169 |
| medium (structural paraphrase) | 96.4% [92.7–98.2] | 187/194 |
| **heavy (full rewrite)** | **92.0%** [87.2–95.1] | 172/187 |

The attack gets better as it gets heavier, and it is still weak at its strongest: a full rewrite —
9% of 4-grams surviving — costs the detector 8 points.

| rewriting model | survives | n |
|---|---|---:|
| `google/gemini-3.7-flash` | 99.1% [95.2–99.8] | 113/114 |
| `openai/gpt-5.6-luna` | 97.4% [92.7–99.1] | 114/117 |
| `mistralai/mistral-medium-3-5` (unseen family) | 95.0% [88.9–97.9] | 96/101 |
| `deepseek/deepseek-v4-pro-0813` | 94.7% [88.1–97.7] | 89/94 |
| `meta-llama/llama-4-maverick` | 91.9% [85.8–95.6] | 114/124 |

Spread of 7 points across five rewriters, with the unseen family mid-pack. No rewriter defeats it.

### 3.3 The other direction — a human original put through an LLM rewrite

This is what the published 30–35% describes.

| rewrite strength | flagged AI | n | 4-grams retained |
|---|---|---:|---:|
| light (copy-edit) | 1.4% [0.5–3.5] | 4/290 | 0.869 |
| medium (structural paraphrase) | 11.0% [8.0–15.1] | 33/299 | 0.240 |
| **heavy (full rewrite)** | **21.0%** [16.5–26.2] | **57/272** | 0.129 |

**The ladder behaves correctly**, and that is the main finding here. A copy-edit of someone's own
prose is left alone — 1.4%, near the 1.0% untouched-human rate — which is the behaviour the project
chose deliberately and should keep choosing. A full rewrite, where almost nothing of the author's
wording survives, is flagged 21.0% of the time.

**On the light arm, remember §2.7**: 41 AI-side light rewrites were quarantined as `no_change`, 27
of them with sources the tool already flags. The light cells are lower bounds.

### 3.4 By rewriting model — the widest spread in the whole measurement

| rewriting model | human original → rewrite, flagged | n |
|---|---|---:|
| `google/gemini-3.7-flash` | **19.9%** [14.9–26.0] | 39/196 |
| `mistralai/mistral-medium-3-5` (unseen family) | 17.9% [12.3–25.3] | 24/134 |
| `deepseek/deepseek-v4-pro-0813` | 7.5% [4.4–12.4] | 13/173 |
| `openai/gpt-5.6-luna` | 6.9% [4.0–11.7] | 12/174 |
| `meta-llama/llama-4-maverick` | **3.3%** [1.5–6.9] | 6/184 |

**A six-fold spread — 3.3% to 19.9% — depending only on which model did the rewriting.** This is
the finding the brief asked for: the attacks are not equivalent. Whether a rewritten human document
gets flagged depends more on the rewriting model than on anything about the document. Any single
published number for this case is an average over a range this wide and should say so.

### 3.5 By register

| register | AI → rewrite | n | human → rewrite | n |
|---|---|---:|---|---:|
| commercial-marketing | 82.8% | 144/174 | 10.4% | 18/173 |
| technical-explainer | 74.9% | 125/167 | 4.7% | 8/170 |
| academic | 72.6% | 119/164 | **18.2%** | 32/176 |
| journalism | 72.2% | 122/169 | 4.1% | 7/170 |
| fiction | 67.7% | 113/167 | **16.9%** | 29/172 |

The two registers already published as the tool's weakest — **academic and fiction** — are also the
two where a rewritten human original is most often flagged, at 18.2% and 16.9%. Item 1 of the
weakness list reappearing on a new axis, not a new weakness.

### 3.6 By length — which dominates everything above

| words | AI originals | AI → rewrite | human → rewrite | median sections |
|---|---|---|---|---:|
| <200 | 28.3% (26/92) | 41.2% (105/255) | 3.1% (9/288) | 1 |
| 200–399 | 76.2% (64/84) | 85.2% (241/283) | 14.3% (42/293) | 1 |
| 400–599 | 74.2% (23/31) | 88.0% (110/125) | 23.5% (28/119) | 2 |
| 600–899 | 89.2% (83/93) | 93.8% (167/178) | 9.3% (15/161) | 2 |

Detection on rewritten AI text runs from **41.2% at under 200 words to 93.8% at 600–899**. Length
moves it more than 50 points; rewrite strength moves it 12. **Length, not rewriting, is the
dominant variable in this table**, which is consistent with §4.6 of `HANDOVER.md` and with the
re-binned length work of 30 August.

### 3.7 Held-out splits — no sign of the result depending on seen data

| split | AI → rewrite | n | human → rewrite | n |
|---|---|---:|---|---:|
| train | 72.9% | 291/399 | 11.1% | 46/416 |
| `heldout_source` (unseen sources) | 71.1% | 96/135 | 11.3% | 16/141 |
| `heldout_rewriter` (Mistral, unseen family) | 79.3% | 111/140 | 17.9% | 24/134 |
| `heldout_register` (technical-explainer) | 74.9% | 125/167 | 4.7% | 8/170 |

Nothing here was trained on — no model was trained in this work at all — so these are splits of
convenience. They matter only as a check that the result does not depend on the rewriter family or
the sources, and it does not: the unseen rewriter family scores *higher*, not lower.

---

## 4. Results — browser route (int8, onnxruntime-web WASM)

**Status, stated plainly.** The browser harness is proved bit-exact (§2.3). The full 2,302-row
browser sweep did **not** finish inside this session: the machine was shared with two other
scoring jobs for its whole duration, swap ran to exhaustion (30.4 GB of 31.7 GB), and browser
throughput fell from 91 documents a minute to under 3. The run is resumable and is still going;
§6 says how to finish it.

**What is reported here is therefore a matched-pairs comparison, not a final browser rate.** Every
row below was scored on *both* routes, so the two columns are directly comparable even though the
subset is not yet a random sample of the corpus — it is `train` plus part of `heldout_source`, and
the absolute levels carry that bias equally in both columns.

Rows scored on both routes: **1,347 of 2,302** (`train` 1,103, `heldout_source` 244).

| population | browser (int8, ORT Web) | server (fp32) | Δ | n |
|---|---|---|---:|---:|
| AI originals, untouched | 64.4% [57.0–71.1] | 63.2% [55.8–70.0] | **+1.1 pp** | 174 |
| AI originals after an LLM rewrite | 73.0% [68.8–76.7] | 72.7% [68.6–76.5] | **+0.2 pp** | 488 |
| human originals, untouched | 1.1% [0.3–4.1] | 1.1% [0.3–4.1] | **0.0 pp** | 174 |
| human originals after an LLM rewrite | 11.7% [9.2–14.8] | 11.2% [8.7–14.2] | **+0.6 pp** | 511 |

| human original → rewrite, by strength | browser | server | n |
|---|---|---|---:|
| light | 2.4% [0.9–6.0] (4/167) | 1.8% [0.6–5.1] (3/167) | 167 |
| medium | 11.9% [7.9–17.6] (21/176) | 10.8% [7.0–16.2] (19/176) | 176 |
| **heavy** | **20.8%** [15.4–27.6] (35/168) | **20.8%** [15.4–27.6] (35/168) | 168 |

Paired survival, browser route: **96.5%** [93.8–98.0] — 299/310 — against 95.6% on the server.

Document-level verdict disagreement between the routes: **32/1,347 = 2.4%**; browser-only flags 19,
server-only 13.

**The conclusion this supports.** On this material the browser route is very slightly *more*
likely to flag than the server — consistent with the published corpus-wide pattern, where the
browser reads 889/922 and 90/4,636 against the server's 883/922 and 45/4,636 — and the gap is
under about a point on every cell. On the `heavy` band, the one that matters for the published
weakness, **the two routes give the identical figure, 20.8%**. Nothing in this measurement is a
runtime artefact, and the fp32 conclusions in §3 are not overturned in the browser.

**What is still owed:** the remaining 955 rows, which will replace the matched-subset table above
with a full browser figure carrying the same denominators as §3.

---

## 5. What this means for the published weakness table

### 5.1 The old figure was measured at a retired operating point — do not compare the two numbers

Per §1, "30–35%" comes from an unsegmented, single-margin-threshold, PyTorch-checkpoint
measurement. The shipped configuration is segmented, uses a two-arm minimum-evidence rule, and runs
an ONNX export. **The new figures below are not "better" or "worse" than 30–35%; they are the first
figures for this weakness at the operating point that ships.** No arithmetic should be done between
them, and no changelog entry should claim an improvement.

### 5.2 What the table should say instead

The current row is:

| where it fails | measured | denominator |
|---|---|---|
| an AI rewrite of a human original | **30–35%** | HAT-Bench v6–v8 bands |

It is the only row in that table with **no denominator and no runtime**. Recommended replacement —
**flagged for a human decision, not applied; the live site has not been touched**:

| where it fails | measured | denominator |
|---|---|---|
| a human original that an LLM fully rewrote | **21.0%** flagged | 57 of 272 full rewrites, server route, `0.9855/0.9763`; 20.8% (35/168) on the matched browser subset |
| a human original that an LLM copy-edited | **1.4%** flagged — deliberately | 4 of 290, server route |

with three sentences of context that the current copy does not carry:

1. **It is a ladder, not a number.** 1.4% for a copy-edit, 11.0% for a structural paraphrase, 21.0%
   for a full rewrite. The low end is the tool behaving correctly — someone who ran their own prose
   through a model is not flagged — and publishing only the worst cell misrepresents that as
   failure.
2. **It depends more on the rewriting model than on the document**: 3.3% to 19.9% across five
   rewriters, a six-fold spread (§3.4).
3. **Rewriting does not defeat detection of AI text.** 95.6% of the AI documents the tool catches
   are still caught after an LLM rewrite, 92.0% after a full rewrite (§3.2). The current copy
   invites the opposite reading.

### 5.3 Two claims in the current copy that should be corrected

- **`README.md` §3 says "this tool catches it about one time in three."** That sentence describes
  a retired operating point. At the shipped pair the full-rewrite figure is about one in five, and
  the copy-edit figure is about one in seventy — and the two are different cases.
- **The weakness is filed under one heading that covers two opposite directions.** "AI rewrites of
  a human original" and "AI text rewritten to sound human" are not the same attack and do not
  behave the same way: one reads 21.0%, the other 95.6% survival. `README.md` line 31,
  `CAPABILITIES.md` 370 and 749, `PER-MODEL-DETECTION.md` 155, `extensions/chrome/README.md` 67 and
  `packages/{core,cli,astro,browser}/README.md` all carry the merged wording.

### 5.4 What must not be claimed

- Nothing here describes a **commercial humaniser**. This is LLM paraphrase. A separate agent is
  measuring a real product; that figure is the one that answers "does JustDone beat it", and this
  one does not.
- Nothing here describes the **rejected cycle-4a retrain**, which is not current and is not
  referenced by any figure in this file.
- No threshold was changed and `thresholds.json` was not touched.

---

## 6. Reproduction

```
research/humaniser-detection-2026-08-31/score_fp32.py probe    # 5,558-doc gate, resumable
research/humaniser-detection-2026-08-31/score_fp32.py pairs    # 2,302 pairs rows, server route
research/humaniser-detection-2026-08-31/analyse_fp32.py        # gate + every server-route cut
research/humaniser-detection-2026-08-31/quarantine_bias.py     # the §2.7 exclusion bound
```

Browser route, run from `opace-website/astro-latest` (the shipped runtime lives there):

```
npx tsx src/lib/local-signals/verify/humaniser-pairs-browser.mts <in.jsonl> <out.jsonl>
```

**To finish the browser sweep**, re-shard whatever is not yet in `shard*-out.jsonl` / `r*-out.jsonl`
and run the shards; the harness skips ids already present, so it resumes safely. Run it **alone** —
running it beside the fp32 scorer cost roughly 30x throughput on this machine.

`analyse_fp32.py` exits non-zero and prints nothing if the fp32 scorer stops matching the canonical
store, so a broken harness cannot emit a figure.
