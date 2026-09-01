# Phase 2 paired-transformation corpus — `cycle4-humaniser-pairs`

**30 August 2026. Training data only.** Nothing was trained, no threshold moved,
nothing deployed, nothing published. This document records what was built, what
it cost, and the three findings that came out of building it.

Corpus: `services/local-engine/research/cycle4-humaniser-pairs/`
Manifest: `manifest.json` in that directory (per-file SHA-256 and row counts).
Brief this answers: internal programme record (maintained privately, not in this repository)
§13.6, and `HANDOVER.md` §9 item 3.

---

## 1. Why

`HANDOVER.md` §9 item 3 records the tool's largest measured weakness: **AI
rewrites of a human original are detected at 30–35%**, against 95%+ for straight
AI generation and 82.3% for an AI draft that a human tidied. Until now the
project held **no paired transformation data at all**. Every AI row in every
corpus here is a generation from a prompt; not one is a transformation of an
existing text. The model has never been shown the thing it is worst at.

This corpus is that shape: one source, three controlled transformations, from
both an AI-origin and a human-origin side, with the lineage recorded so the
splits cannot leak.

## 2. What was built

| | |
|---|---|
| sources | **600** — 300 AI-origin, 300 human-origin |
| paired variants kept | **1,702** |
| quarantined | **98** |
| total corpus rows | **2,302** |
| source words | 247,155 |
| rewriting models | 5 across 5 families |
| generating models represented | 22 (21 AI + human) |
| seed | `20260830`, deterministic selection |

The source grid is exactly balanced: 2 sides × 5 registers × 3 length bands ×
20 sources. Registers are `commercial-marketing`, `journalism`, `academic`,
`technical-explainer` and `fiction`; bands are short (90–220 words), medium
(260–460) and long (520–900).

### Class labels

| source side | row | `class_label` | rows |
|---|---|---|---|
| AI | untouched | `ai_original` | 300 |
| AI | rewritten | `ai_original_neural_rewrite` | 841 |
| human | untouched | `human_original` | 300 |
| human | rewritten | `human_original_ai_edited` | 861 |

`edit_intensity` (`none` / `light` / `medium` / `heavy`) is a **separate field**.
`measure.py` fails validation if an intensity ever appears inside a class label.

**Three labels that are not used, and why.** No row is
`ai_original_human_edited` — an LLM rewriting prose is not a professional human
edit, and this corpus contains no real human-edit pairs. No row names a
commercial humaniser: JustDone, QuillBot, Undetectable.ai and the rest were not
used, `commercial_humaniser` is `false` throughout and `transformation_family`
is `generic_llm_rewrite`. And none of the existing `style: humanise` rows in
other corpora were used as sources — those are AI *originals* written under an
anti-AI style instruction, with no paired original before the instruction, and
conflating them with paired humaniser output would be a fabricated provenance
record.

## 3. Splits

Every variant of a source sits in the same split as its source. `finalise.py`
refuses to write anything if a `lineage_id` spans two splits — a light edit in
training and its heavy rewrite in test is leakage of the most direct kind, and a
model would score well by recognising the source rather than the transformation.

| split | rows | holds back |
|---|---|---|
| `train` | 1,103 | — |
| `heldout_source` | 372 | whole sources unseen in training |
| `heldout_rewriter` | 370 | every row rewritten by **Mistral**, a family absent from training |
| `heldout_register` | 457 | the whole **technical-explainer** register, both sides |

| split | `ai_original` | `ai_original_neural_rewrite` | `human_original` | `human_original_ai_edited` |
|---|---|---|---|---|
| train | 144 | 399 | 144 | 416 |
| heldout_source | 48 | 135 | 48 | 141 |
| heldout_rewriter | 48 | 140 | 48 | 134 |
| heldout_register | 60 | 167 | 60 | 170 |

Beyond the held-out Mistral family, **Anthropic, Qwen, xAI, Z.ai and Moonshot
were never used as rewriters at all**, so a second and third unseen-family
evaluation is available without generating anything further.

## 4. Finding 1 — the first intensity taxonomy was wrong, and 20 samples caught it

The verification run was run before the budget was committed, exactly to test
whether the three intensities are genuinely distinct. **On the first 20 sources
they were not.** Judged on four-word retention:

| | light | medium | heavy |
|---|---|---|---|
| four-gram retention, median | 0.8741 | **0.1775** | **0.2294** |
| lexical cosine, median | 0.9791 | **0.6883** | **0.7631** |

Heavy retained *more* of the source than medium, on both axes. The cause was the
prompts, not the taxonomy: the medium prompt said "little of the original
wording should survive", which is a stronger lexical instruction than the heavy
prompt's "different voice, different structure". Medium was doing heavy's job
lexically while heavy was doing a structural job.

The prompts were rewritten so that medium constrains structure and frees wording
moderately, and heavy explicitly forbids reusing the source's phrasing,
sentence structure, paragraph plan and order of points. On a second 20-source
pilot both boundaries separated with disjoint interquartile ranges. **This is
what the verification run was for**: 500 rows of each would have been generated
against a taxonomy that did not hold.

Both pilots are preserved as `pilot.jsonl` (the failed taxonomy) and
`pilot2.jsonl` (the corrected one).

## 5. Finding 2 — the three intensities separate, on two different axes

Full corpus, n = 1,702. Medians.

| metric | light | medium | heavy |
|---|---|---|---|
| four-gram retention | **0.8977** | 0.2338 | **0.1075** |
| word edit ratio (1.0 = identical) | 0.9635 | 0.5221 | 0.2183 |
| lexical cosine | 0.9841 | 0.7415 | 0.6036 |
| sentence-order preservation | 1.0000 | 1.0000 | 0.7729 |

Light against medium is a **wording** boundary and is clean: light p25 = 0.8307
against medium p75 = 0.4011 on four-gram retention, disjoint.

Medium against heavy is a **structure** boundary by design, and it is real but
not clean. The medians separate (1.0000 against 0.7729 on order preservation)
and the wording axis separates too — **81.5% of heavy rows fall below the median
medium four-gram retention, and 94.5% fall below the median medium word edit
ratio**. But **33.9% of heavy rewrites still reproduce the source's sentence
order exactly** despite being told not to. The medium/heavy distinction should
be treated as a graded axis with an overlap of roughly one row in five, not as
two clean classes.

One metric cannot police both boundaries. Judged on wording alone, the corrected
heavy prompt looks like an intensified medium; judged on order alone, medium and
light are identical. Both are checked, and `measure.py` reports both.

## 6. Finding 3 — AI editing a human original moves it towards the AI signature

This is the mechanism behind the 30–35% weakness, measured on the new pairs.
`HANDOVER.md` §4.5 records that the model's dominant axis is lexical reuse: AI
under-repeats itself, humans repeat. Median source → output change, by side and
intensity:

| side | intensity | n | adjacent-sentence cohesion | MATTR |
|---|---|---|---|---|
| AI | light | 258 | 0.0159 → 0.0164 (+0.0005) | 0.7847 → 0.7883 (+0.0037) |
| AI | medium | 294 | 0.0166 → 0.0141 (−0.0025) | 0.7840 → 0.8000 (+0.0160) |
| AI | heavy | 289 | 0.0169 → 0.0121 (−0.0048) | 0.7840 → 0.8073 (+0.0233) |
| human | light | 289 | 0.0487 → 0.0490 (+0.0003) | 0.7100 → 0.7114 (+0.0014) |
| human | medium | 298 | 0.0485 → 0.0353 (−0.0132) | 0.7111 → 0.7495 (+0.0384) |
| human | **heavy** | 271 | **0.0481 → 0.0250 (−0.0231)** | **0.7159 → 0.7750 (+0.0591)** |

A heavy AI rewrite **halves** a human original's adjacent-sentence cohesion and
pushes its vocabulary variety from the human level towards the AI level. The
human side moves roughly five times as far as the AI side does, because the AI
side is already there. That is the same movement `HUMANIZER-AND-DETECTOR-COMPETITOR-STUDY.md`
recorded for products that escape the detector, produced here by a plain
"rewrite this" instruction with no evasion intent anywhere in the prompt.

**Read the absolute numbers with care.** These are Jaccard overlaps between
neighbouring sentences, not the content-word-overlap definition behind the
published 2.1% / 6.3% figures, so they are not the same statistic and must not
be quoted as those. The ordering — human roughly three times AI — reproduces.

## 7. Protected spans: rewriting damages content, and it is quantifiable

The project protects names, numbers, quotations, URLs and citations as
`protected spans`. Every rewrite prompt, at all three intensities, instructed
the model to keep them exactly. Share of variants where at least one span of
that kind was lost or added:

| intensity | n | any | numbers | names | quotations | URLs | citations |
|---|---|---|---|---|---|---|---|
| light | 548 | **42.5%** | 16.1% | 24.6% | 14.4% | 0.9% | 2.6% |
| medium | 593 | 68.8% | 29.8% | 60.0% | 20.1% | 1.7% | 3.4% |
| heavy | 561 | **85.7%** | **48.7%** | 79.5% | 29.9% | 2.0% | 4.6% |

**Nearly half of heavy rewrites alter a number, and 42.5% of a plain copy-edit
touches a protected span at all** — under an explicit instruction not to. A
"rewrite" that changes a citation or a statistic has damaged the content
whatever its similarity score says. This is the editorial-integrity axis the
Phase 2 brief §11 wants reported separately from authorship, and it now has
numbers.

Caveat: the name detector is a capitalised-run regex with a stop list, not NER.
Read `names` as an indicator. Numbers, URLs and citations are exact matches and
are reliable.

## 8. Quarantine — 98 rows kept, not deleted

Failed and damaged outputs are preserved in `quarantine.jsonl`. Dropping them
silently would bias the corpus towards successful transformations and would hide
what each rewriting model does when it fails.

| reason | rows |
|---|---|
| `no_change` — output identical to the source at word level | 55 |
| `length_collapse` — output under 45% or over 220% of source length | 41 |
| `truncated` — `finish_reason=length` | 2 |

By rewriting model, as a share of the three attempts per assigned source:

| rewriting model | quarantined | rate | breakdown |
|---|---|---|---|
| `deepseek/deepseek-v4-pro-0813` | 52/369 | **14.1%** | no_change 47, length_collapse 4, truncated 1 |
| `meta-llama/llama-4-maverick` | 22/393 | 5.6% | length_collapse 21, no_change 1 |
| `mistralai/mistral-medium-3-5` | 14/288 | 4.9% | length_collapse 14 |
| `openai/gpt-5.6-luna` | 6/369 | 1.6% | length_collapse 1, no_change 5 |
| `google/gemini-3.7-flash` | 4/381 | 1.0% | length_collapse 1, no_change 2, truncated 1 |

Two model signatures worth carrying forward: **DeepSeek returns the source
unchanged** rather than perform a light copy-edit, 47 times; **Llama truncates or
inflates** rather than hold length, 21 times. Neither is a corpus defect.

### Quarantine that was the harness's fault, not the model's

`quarantine-superseded-maxtokens.jsonl` holds **230 rows removed from the
quarantine and retried**, because the harness caused the failure:

1. `max_tokens` was initially 4,000 and then scaled to source length. DeepSeek
   and Gemini spent the entire completion budget on reasoning tokens and
   returned an empty message. That is the cap ending the response, not the
   model failing the task.
2. Reasoning was then disabled outright, which **Gemini rejects with HTTP 400**
   ("Reasoning is mandatory for this model") — 136 rows lost to a harness bug.

Final configuration: reasoning disabled for every model except Google, which
gets `effort: low` with the trace excluded; `max_tokens` bounded to
`min(8000, max(2500, source_words × 8))`. These rows are preserved rather than
deleted because the distinction between "the model could not do this" and "my
harness stopped it" is exactly the sort of thing that quietly becomes a false
finding later.

## 9. Cost

| | |
|---|---|
| **Total billed** | **$6.8571** over 2,014 API calls |
| of which on rows kept in the corpus | $5.2189 |
| of which two verification pilots | $0.3612 |
| of which retried harness failures | the balance |

**The authorised figure was $25. It was not available.** The OpenRouter key was
checked before spending and held **$15.85 of remaining credit**, not $25, and
that pool is shared with the concurrent `cycle4-fiction` run. A self-imposed cap
of $7.00 was set and the run finished at $6.86 under it, leaving roughly $9 of
the shared pool for the concurrent task. The cap is enforced in `rewrite.py`
before every request, and the run stops rather than overshoots.

Cost by rewriting model, on kept rows:

| model | rows | USD |
|---|---|---|
| `google/gemini-3.7-flash` | 377 | 2.0656 |
| `mistralai/mistral-medium-3-5` (held out) | 274 | 1.2315 |
| `deepseek/deepseek-v4-pro-0813` | 317 | 1.1727 |
| `openai/gpt-5.6-luna` | 363 | 0.3172 |
| `meta-llama/llama-4-maverick` | 371 | 0.1999 |

## 10. What this corpus does not contain, stated plainly

- **No commercial-humaniser ground truth.** JustDone, QuillBot and the other
  thirteen products in the brief's §13.2 roster were not used. The brief's §13.3
  JustDone pilot needs owner authorisation and a subscription and is untouched.
- **No professional human edits**, so `ai_original_human_edited` remains empty
  and the `mixed_segment_provenance` and rules-only transformation families are
  not built here. Rules-only transformation and mixed-passage construction need
  no paid calls and should not consume expiring credit.
- **No detector scores.** Scoring these rows needs the segmented harness on a
  named runtime at a named threshold. A truncated whole-text pass would produce
  a figure with no stated runtime, which §14 of `HANDOVER.md` forbids. This is
  the obvious next measurement and is deliberately not done here.
- **No semantic similarity.** Similarity is lexical and named as such
  (`lexical_cosine_tfidf`, `four_gram_retention`, `word_levenshtein_ratio`). No
  embedding model was available offline — the research venv has `transformers`
  without `torch`, and the only ONNX encoder in the tree exports logits rather
  than pooled hidden states — and spending corpus budget on a hosted embedding
  API was not worth it. Nothing in the corpus is called semantic similarity.
- **Every source overlaps a published measurement corpus.** Recorded per row in
  `measurement_overlap` and `measurement_overlap_note`. The AI and human
  long-form sources are members of the 5,558-document held-out corpus; the Opace
  blog passages are members of the 4,368-passage short-form false-positive
  corpus. **Any model trained on this data must exclude those documents from its
  evaluation set**, and this is the corpus's single most important caveat.
- **The human commercial-marketing cell leans to SEC EDGAR, not the blog.** Only
  43 rows come from the Opace blog, the corpus's one conversational, first-person
  commercial voice and the register the tool is weakest on. The balanced draw
  spreads across `origin_model`, which does not distinguish two human sources
  from each other. Spreading on `origin_provider` instead is the first cheap fix
  for a follow-up run.

## 11. Reproduction

```
cd services/local-engine/research/cycle4-humaniser-pairs
python3 build_sources.py                       # deterministic, seed 20260830
python3 rewrite.py --pilot 20 --out pilot2.jsonl --budget 0.60
python3 measure.py --pairs pilot2.jsonl --write # verify the taxonomy separates
python3 rewrite.py --all --budget 7.00          # resumable; skips recorded rows
python3 measure.py --pairs pairs.jsonl --write
python3 finalise.py
```

`OPENROUTER_API_KEY` comes from the owner's shell profile and is never echoed,
logged or committed. `.jsonl` files are gitignored by project policy
(`.gitignore:41`); the scripts, `manifest.json` and the corpus README are
committed.

---

## 12. Appended 31 August 2026 — the corpus has been scored, and its scope limit is now measured

Sections 1–11 stand as written on 30 August. Nothing there is corrected; two things there are
completed.

### 12.1 §10's "no detector scores" caveat is discharged

§10 recorded that scoring these rows needed the segmented harness on a named runtime at a named
threshold, and deliberately did not do it. It has been done, on the shipped path — server route,
`tier3-cycle2-e5small-fp32.onnx`, `segments-v3`, temperature 0.8324, flag pair `0.9855 / 0.9763`,
Python `onnxruntime` 1.29.0 — with the harness re-proved against the published 883/922, 45/4,636,
23/260 story and 8/420 academic-discussion figures **before** any new cut was taken.

Records: [`LLM-REWRITE-ROBUSTNESS.md`](LLM-REWRITE-ROBUSTNESS.md) for the method, provenance and
confounds; `../../services/local-engine/research/humaniser-detection-2026-08-31/fp32-results.md`
for the full tables.

| population | flagged | n |
|---|---|---:|
| AI originals, untouched | 65.3% [59.8–70.5] (196/300) | 300 |
| AI originals after an LLM rewrite | 74.1% [71.0–76.9] (623/841) | 841 |
| human originals, untouched | 1.0% [0.3–2.9] (3/300) | 300 |
| human originals after an LLM rewrite | 10.9% [9.0–13.2] (94/861) | 861 |

The paired reading, which is the only sound one, because it holds the source fixed:

| | survives the rewrite |
|---|---|
| AI sources this build catches (196/300), rewrites still caught | **95.6%** [93.6–97.1] (526/550) |
| light | 98.8% (167/169) |
| medium | 96.4% (187/194) |
| heavy | 92.0% (172/187) |

Human originals after a rewrite, by intensity: light 1.4% (4/290), medium 11.0% (33/299), heavy
**21.0%** (57/272).

**Three caveats travel with every one of those numbers.** The corpus is short — median 372 words
for AI originals, median one section per document — so maximum-over-sections has nothing to
maximise over and none of this may be read against the 95.8% long-form headline. The 98
quarantined rows are not a neutral exclusion: 41 are `no_change` on the AI/light arm and 27 of
those have a source this build already flags, so the light cells are a lower bound. And the browser
route's own sweep is incomplete — 1,576 of 2,302 rows scored on both routes, 726 still owed — so
there is no published browser rate for this corpus. As a matched-pairs comparison over the rows
that do have both, the routes agree closely: no cell differs by more than about a point, the heavy
band reads the identical 22.5% on both, and document-level verdict disagreement is 37/1,576 = 2.3%
(`LLM-REWRITE-ROBUSTNESS.md` §4).

### 12.2 The scope limit, stated as the plan must carry it

§2 recorded that no row names a commercial humaniser. §12.1 measures what that costs the corpus as
an adversary, and it is more than the label caveat implied.

> **This corpus is LLM paraphrase. It is the right data for "someone asked a chatbot to reword
> this", and it says nothing about purpose-built humanisers.** Against this build, a heavy LLM
> rewrite leaves 92.0% of already-caught AI documents caught. Undetectable.ai and StealthGPT
> escaped on 96.4% and 96.0% of what the same build caught
> (`research/HUMANIZER-AND-DETECTOR-COMPETITOR-STUDY.md` §8). Those figures come from different
> corpora at different lengths and must not be subtracted from one another, but both are
> conditional on sources this build first caught, and the difference is an order of magnitude.

**Any plan built on this corpus must state that limit in the plan, not in a footnote.** Training on
it addresses the `human_original_ai_edited` direction, the edit-direction and mixed classes, and
the editorial-integrity axis in §7. It does not address commercial-humaniser escape, because the
transformation it contains is not the one that escapes.

One thing that does not weaken it: the held-out **Mistral** rewriting family reads 79.3% (111/140)
against training families' 72.9% (291/399) on the AI side. Whatever the corpus teaches generalises
across rewriting families. The gap is in *kind* of transformation, not in coverage of it.

### 12.3 A correction proposed against §6, and rejected

`JUSTDONE-HUMANISER-EVALUATION-2026-08-31.md` carries a section headed "Correction to a figure in
the brief" stating that the project's published **2.1% machine / 6.3% human** adjacent-sentence
figures are wrong and should read **1.66% / 4.85%**, and that anything reasoning from 2.1/6.3
should be rechecked.

**Rejected. The two are not the same measurement, and §6 above already says so.** 1.66% and 4.85%
are the AI-side and human-side medians of *this* corpus's Jaccard adjacent-sentence overlap — they
reproduce §6's table exactly (AI 0.0166, human 0.0485). 2.1% and 6.3% are *content-word* overlap on
the provider-eval corpus in `SIGNAL-SCIENCE.md`. Different statistic, different corpus. §6's own
warning is the governing sentence: the two "are not the same statistic and must not be quoted as
those", and "the ordering — human roughly three times AI — reproduces".

Recorded here rather than only in the JustDone document because that document is where a future
reader will meet the claim first.
