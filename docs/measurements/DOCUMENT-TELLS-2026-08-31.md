# Document-level AI tells: measurement report (2026-08-31)

Measurement-only study of three candidate document-level tells for a future
evidence layer. No model, threshold, UI, or website change was made. All
compute local; no paid calls.

Scripts and raw outputs:
`implementation/services/local-engine/research/document-tells-2026-08-31/`
(`tells_lib.py`, `measure_structure.py`, `measure_scaffold_v2.py`,
`measure_phrases.py`, `measure_known_phrases.py`; outputs
`structure-per-doc.jsonl`, `structure-summary.json`,
`scaffold-v2-per-doc.jsonl`, `scaffold-v2-summary.json`,
`phrase-table.json/.csv`, `known-phrases.json`).

Owner direction mid-study made tell 2 (template scaffold / section-shape
uniformity) the primary tell; section "Tell 2 v2" below carries the extended
measurement, including per-model signatures across the 21 models.

## Verdicts up front

| Tell | Separates AI from human? | Human fire-rate at flag point | Recommendation |
|---|---|---|---|
| 1. Keyphrase echo | Barely (≈1.5×) | 3.3% at echo ≥ 0.4 | **Decline** as a signal; optional as neutral descriptive copy |
| 2 (primary). Section-shape uniformity per doc | No, on its own — structured human docs are equally uniform | 6.9% strict constant-shape (vs AI 6.6%); 22.9% mode-share ≥ 0.8 on human listicles | **Decline as a standalone claim**; the "humans vary, AI keeps one shape" hypothesis is refuted at population level |
| 2 composite (shape-uniform AND sentence-uniform, ≥4 sections) | Yes, ~2.8× on structured docs | 1.7% of structured human docs (n=292); 0.12% of all human docs | **Ship-with-caveats** (small human structured denominator) |
| 2 per-model signatures | Yes — model families have measurable house shapes | n/a (descriptive) | **Ship-with-caveats** as "consistent with model X" colour, never an identification claim |
| 2 bullet-list rhythm | **Unmeasurable** — human corpora retain ~zero bullet lists | n/a | **Decline until a bullet-preserving human corpus exists** |
| 2a. Paragraphs-per-section uniformity | No — fires MORE on humans | 6.0% (vs AI 2.9%) | **Decline** |
| 2b. Title Case heading share | No | 25% (vs AI 22%) | **Decline** |
| 2c. Sentence-length-per-paragraph uniformity (spp_cv ≤ 0.3) | Yes, 2.4× | 10.2% (7.2% on hard negatives) | **Ship-with-caveats** (evidence copy only, never verdict input) |
| 2d. Formulaic closer ("Final Thoughts" etc.) | Yes, 2–2.7× | 1.3% (0.9% hard negatives) | **Ship-with-caveats** (low coverage: only 2.5% of AI docs have one) |
| 2e. Composite: uniform sentences AND closer | Yes, ~19× | 0.05% (0.1% hard negatives) | **Ship-with-caveats** (fires on <1% of AI docs) |
| 3. Mined 2-4-gram ratio table | Table is corpus-artefact-dominated | n/a (not a classifier) | **Decline the raw mined table**; ship only the curated, dual-corpus-verified subset |
| 3b. Curated "AI phrase" lexicon | 21 of 98 folk phrases survive; 13 are anti-tells | per-phrase rates published | **Ship-with-caveats**: only phrases passing the ≥2× dual-corpus gate, with measured rates beside them |

## Corpora used and structure honesty

Structure tells need headings and paragraph breaks. Not every corpus keeps them:

| Corpus | Docs | Blank-line paragraphs | Markdown headings | Used for |
|---|---|---|---|---|
| `research/generated-corpus/generated.jsonl` (usable) | 4,016 AI, 21 models | 99.1% | 2,556 docs (63.6%) | Tells 1, 2; corroboration for 3 |
| `implementation/tests/battery/human-corpus-v2.json` | 4,144 human (2,205 clearly-distinctive, 1,939 plausibly-confusable) | 99.9% | 11 docs (0.3%) | Tells 1, 2; corroboration for 3 |
| `research/cycle2-corpus/corpus.jsonl` | 5,655 AI / 9,859 human | 54% | 10% | Tell 3 only (structure too often stripped) |
| `research/longform-corpus/` | 922 AI / 4,636 human | 76% avg | AI 39%, human 0.06% | Secondary check, tells 1–2 |

Because human web text almost never carries markdown `#` marks, heading
detection is a symmetric plain-text heuristic (own-line, ≤12 words, ≤90 chars,
no sentence-final punctuation) applied identically to both sides after
stripping markdown. It finds ≥3 headings in 2,360/4,016 AI docs but only
331/4,144 human docs, so every heading-conditional human denominator is small
and is stated inline. Human docs whose headings were destroyed upstream simply
cannot be measured for heading tells; that subset limitation is inherent, not
hidden.

## Tell 1 — Keyphrase echo

Method: dominant keyphrase = the 2-4-gram from the title/first heading (light
plural stemming, ≥2 content words) that recurs most in the body (≥2 body
occurrences required). Echo score = share of section openings (first paragraph
of each section; all paragraph blocks when a doc has <3 sections) whose first
15 tokens contain the keyphrase. Eligibility: ≥4 paragraph blocks.

Denominators: 3,941 AI (generated) / 4,054 human (human-v2) eligible;
longform 921 AI / 3,323 human.

The distributions are nearly identical:

| | mean | p50 | p75 | p90 | p95 |
|---|---|---|---|---|---|
| AI (n=3,941) | 0.086 | 0 | 0.143 | 0.273 | 0.400 |
| Human (n=4,054) | 0.087 | 0 | 0.143 | 0.250 | 0.333 |

Threshold sweep (share of openings echoing the keyphrase):

| Flag point | AI detection | Human FP | Hard-negative FP |
|---|---|---|---|
| ≥ 0.30 | 8.3% | 6.8% | — |
| ≥ 0.40 | 5.1% | 3.3% | 2.2% (n=1,931) |
| ≥ 0.50 | 2.9% | 2.0% | — |
| ≥ 2 raw echo hits | 18.9% | **25.3%** (humans echo MORE) | — |

Longform check: human echo is slightly HIGHER than AI (mean 0.105 vs 0.089).
Within heading-structured docs only (the owner's exact scenario) it does a
little better — echo ≥ 0.4: AI 6.3% (148/2,359) vs human 2.7% (9/331); ≥4
echoed openings: AI 2.2% vs human 0/331 — but the human denominator is 331
and the high-echo human examples are exactly what you'd predict: brand-name
SEO copy ("hellodeal com" echoed in 9 of 14 openings, "sleep number",
"schomberg sump pump").

**Finding: keyphrase echo is a register tell, not an authorship tell.** Human
SEO writers open sections with the money phrase just as often as models do —
that is what SEO copy is. The owner's eye is not wrong about the GPT article
in front of him; the population statistic just cannot support "this indicates
AI" at better than ~1.5–2× lift.

**Recommendation: decline** as a scored signal. If the evidence layer wants
it, it can be shown as *neutral description* ("the phrase X opens 5 of 7
sections") with no AI-likelihood claim attached, because no honest claim is
available.

## Tell 2 — Template scaffold

All components measured symmetrically on generated vs human-v2 (denominators
inline). Sweep details in `structure-summary.json`.

- **Paragraphs-per-section uniformity** (docs with ≥3 non-empty sections; AI
  n=2,243, human n=269): humans are MORE uniform. All-sections-equal: AI 2.9%
  vs human 6.0%. CV distribution mean AI 0.37 vs human 0.56 but every flag
  point fires more on the human side or refuses to separate. **Decline.**
  (The owner's "every section is heading + 2 short paragraphs" pattern exists,
  but short human listicle/service pages do it too.)
- **Title Case heading share** (≥3 body headings; AI n=2,257, human n=220):
  all-Title-Case rate AI 22.2% vs human 25.0%. No separation, and the human
  denominator is tiny. **Decline.**
- **Sentences-per-paragraph uniformity** (`spp_cv`, ≥5 paragraphs; AI n=3,852,
  human n=3,915): real separation. Mean CV 0.41 (AI) vs 0.49 (human).

  | Flag point | AI detection | Human FP | Hard-negative FP |
  |---|---|---|---|
  | spp_cv ≤ 0.2 | 7.1% | 3.1% | — |
  | spp_cv ≤ 0.3 | 24.1% | 10.2% | 7.2% |
  | spp_cv ≤ 0.4 | 53.7% | 28.4% | — |

  A 10.2% human fire-rate is well below the 24.8% that demoted the 113 rules,
  but still too high for verdict input. As evidence copy — "paragraph lengths
  are unusually uniform (seen in ~24% of AI docs, ~10% of human docs)" — it is
  honest. **Ship-with-caveats.**
- **Formulaic closer** (heading or final-paragraph opener matching Final
  Thoughts / Conclusion / In summary / Wrapping up / Key takeaways / The
  bottom line etc.; all docs): AI 2.5% (100/4,016) vs human 1.3% (53/4,144);
  hard negatives 0.9%. Longform: AI 9.4% vs human 3.5%. A 2–2.7× lift, but
  coverage is the problem: 97.5% of AI docs in this corpus do NOT close with
  one (modern models were often prompted in human-voice styles). Honest copy:
  "a 'Final Thoughts'-style closer is 2–3× more common in AI writing, but
  appears in only ~1 in 40 AI documents." **Ship-with-caveats.**
- **Composite** (spp_cv ≤ 0.3 AND closer): AI 0.95% (38/4,016) vs human 0.05%
  (2/4,144), hard negatives 0.1%. ~19× lift, very high precision, tiny
  coverage. Worth surfacing as a strong note when both co-occur.
  **Ship-with-caveats.**

## Tell 2 v2 — Section-shape uniformity (primary tell, extended)

Method (`measure_scaffold_v2.py`): every block classified heading /
bullet-list / paragraph with the same symmetric heuristics on both sides;
sections are runs of blocks under each heading. Each section gets a **shape
signature** `(paragraph blocks, bullet blocks)`. Body sections = everything
between the first and last section when the doc has ≥5 sections (so an
intro-1/body-2-2-2/outro-1 doc like the owner's GPT-5 example counts as
perfectly uniform), else all sections. Reported: `body_mode_share` (share of
body sections carrying the modal signature), `constant_body_shape` (all body
sections identical, ≥3 of them), blocks-per-section CV, sentences-per-
paragraph CV, bullet-section share/rhythm, closer, and
`title_restated_in_close` (a ≥2-content-word title n-gram reappears in the
final paragraph).

### Structure preservation (measured first, as directed)

- generated.jsonl: full markdown; 2,332/4,016 docs parse to ≥3 sections.
- human-corpus-v2: paragraphs survive, headings survive only as plain short
  lines; **292/4,144 docs (7.0%)** parse to ≥3 sections.
- longform-human: 1,047/4,636 structured (plain-line headings, e.g. paper
  section titles).
- cycle2 human: 320/9,859 structured — effectively flattened upstream.
- **Bullet lists: the human corpora have essentially none** (mean bullet-
  section share 0.000 in human-v2, 0.002 in longform-human, vs 0.181 in AI
  docs). C4-style extraction drops or flattens `<ul>` markup. Any
  "AI uses bullet rhythms" claim measured against these corpora would be a
  pipeline artefact, so bullet rhythm is **declared unmeasurable** here.
  This is a headline structure finding: a fair human baseline for bullets
  needs a corpus scraped with list markup intact.

All heading-conditional human rates below therefore stand on small structured
subsets, stated per cell.

### Does the core hypothesis hold?

The claim to test was: *human articles vary their section shapes; AI keeps
one shape.* On these corpora, at population level, **it is refuted**:

| Metric (structured docs only) | AI generated (n=2,332) | human-v2 (n=292) | human-v2 listicle-like, ≥5 headings (n=140) | longform-human (n=1,047) | cycle2-human (n=320) |
|---|---|---|---|---|---|
| body_mode_share mean | 0.50 | 0.55 | — | — | — |
| mode_share ≥ 0.8 | 8.5% | **13.0%** | **22.9%** | 6.3% | 13.8% |
| constant_body_shape (strict) | 6.6% | 6.9% | 12.9% | 3.3% | 6.9% |
| blocks-per-section CV mean | 0.42 | 0.58 | 0.57 | 0.62 | — |

Humans with detectable structure are just as likely to keep one section
shape — and the sought-after hard negatives behave exactly as predicted:
listicle/FAQ-style human docs (≥5 headings) are the MOST shape-uniform group
in the study (22.9% at mode share ≥ 0.8, 12.9% strictly constant; by genre,
human academic docs hit 17.5% and business-marketing 13.7%). Average shape
variance is higher for humans (CV 0.58 vs 0.42), so AI is *somewhat* more
regular in tendency, but no honest flag point exists on shape alone.

What does separate is the **composite**: ≥4 sections AND body mode share
≥ 0.8 AND sentences-per-paragraph CV ≤ 0.35 (shape uniformity plus sentence-
length uniformity):

| | of structured docs | of ALL docs |
|---|---|---|
| AI generated | 4.8% (111/2,332) | 2.8% (111/4,016) |
| human-v2 | 1.7% (5/292) | 0.12% (5/4,144) |
| human-v2 plausibly-confusable | 2.9% (4/139) | 0.21% (4/1,939) |
| human listicle-like | 3.6% (5/140) | 3.4% (5/147) |
| longform-human | 0.4% (4/1,047) | 0.09% (4/4,636) |

A ~2.8× lift on structured docs, and the all-docs FP looks spectacular only
because most human web text loses its headings upstream — that part is
corpus artefact, not signal. On the listicle hard negatives the lift shrinks
to ~1.3×. **Ship-with-caveats**: usable as evidence copy ("uniform section
scaffold: N of M sections share one shape and paragraph lengths barely
vary — seen in ~5% of AI docs and ~2% of structured human docs"), never as a
verdict input, and it must never fire simply because a document has headings.

`title_restated_in_close` (closing para restates the title phrase): AI 23.9%
vs human-v2 15.9% — only 1.5×, and longform-human is HIGHER than AI (45.1%,
academic style). **Decline.**

### Word-budget context (point 4)

`generated.jsonl` stores explicit word budgets (`target_words`, e.g.
600–1,000) and three prompt styles. Uniformity varies little by length band
(constant shape: long 6.4%, medium 7.9%) so word budgets alone don't explain
the scaffold. Prompt style matters more: house-brief prompts give the most
uniform output (composite flag 6.1% vs 3.4% for human-voice prompts), and
formulaic closers are almost entirely a *plain-prompt* behaviour (plain 5.1%,
house-brief 2.2%, human-voice 0.07%). So the tells measured here are partly
prompt-dependent: undirected "write an article about X" usage — the typical
lazy-content case the tool cares about — shows MORE scaffold than these
averages, and coached prompts show less.

### Per-model structural signatures (21 models, secondary finding)

Full table: `scaffold-v2-summary.json` (`ai_by_model`,
`ai_modal_signatures_by_model`). n = 75–250 docs per model. The owner's
observation is confirmed: model families have measurable house shapes.
Highlights (structured docs per model, so 51–175 docs per cell):

| Model | mode share (mean) | constant shape | bullets/section | closer | restates title in close |
|---|---|---|---|---|---|
| meta-llama/llama-4-maverick | **0.68** | **20.0%** | 0.25 | **8.4%** | **62.8%** |
| mistralai/mistral-medium-3-5 | 0.62 | 16.4% | 0.24 | 5.2% | 32.9% |
| x-ai/grok-4.6 | 0.59 | 16.9% | 0.12 | 0% | 32.0% |
| google/gemini-3.1-pro-preview | 0.63 | 12.1% | 0.15 | 0.7% | 30.7% |
| google/gemini-3.7-flash | 0.45 | 1.8% | **0.36** | 2.0% | 15.2% |
| openai/gpt-5.6-terra | 0.44 | 3.2% | 0.20 | 1.2% | 28.8% |
| anthropic/claude-opus-5 | 0.44 | 2.9% | 0.12 | 0.4% | **8.8%** |
| openai/gpt-5.4 | 0.49 | 1.4% | 0.25 | 2.0% | 38.0% |

Distinct fingerprints: llama-4-maverick is the arch-templater (1-paragraph
sections, restates the title in the close in 63% of docs, most closers);
gemini-3.7-flash is the bullet-happy one (bullets in 36% of sections, but
low shape constancy); grok-4.6 and mistral-medium favour rigid 2-3-paragraph
scaffolds; claude-opus-5 and gpt-5.6-terra are the least templated in this
corpus. Note the honest wrinkle: the owner's Terra anecdote (heading + 1
para + bullets + closing para, repeated) is NOT Terra's average behaviour
across mixed registers/prompts here — per-model shape depends heavily on the
prompt, so signatures support only soft copy ("this scaffold is consistent
with model X's habits"), never model identification. Modal body signatures
per model are in the raw output (e.g. terra `(1 para, 0 bullets)`,
qwen3.8-max `(4,0)`, sonnet-5 `(3,0)`).

## Tell 3 — AI-phrase frequency table

### 3a. Data-driven mining (declined in raw form)

Method: presence-based document frequency of all 2-4-grams (min 25 AI docs;
hashed pre-filter, then exact counts) over cycle2 (5,655 AI / 9,859 human).
Register control: the six registers (marketing, academic, article, social,
reference, report) exist on BOTH sides, so each side's rate is a macro-average
of per-register Laplace-smoothed rates with equal weight — a phrase that is
merely register vocabulary gains nothing. Each phrase also carries a
register-skew flag (>70% of AI hits in one register, or ratio ≥2 in fewer
than 3 registers) and an out-of-corpus "generalises" flag (≥2× on generated
vs human-v2). Full table: `phrase-table.json` / `.csv` (top 200 of 12,355
candidates).

Register balancing worked; **topic/source balancing is the wall it hit.** The
top of the table is dominated by corpus-construction artefacts, not
authorship style:

- source-pairing artefacts: "aita for" (48.5×), "am i the asshole",
  "wikipedia article", "early life and" — cycle2's AI side includes
  Reddit/Wikipedia continuation generations with no matched human twin;
- instruction leakage: "a revised version of", "the original text for the
  task is" — prompt text echoed into outputs;
- shared-prompt topic vocabulary: "a fortnight", "the boiler", "making tax
  digital", "west midlands" — both AI corpora were generated from the owner's
  British business prompts, so the cross-corpus check cannot kill these.

112 of the top 200 are flagged register-skewed; the "clean and generalising"
remainder is still mostly British-topic vocabulary. One genuine stylistic
candidate did surface: the "X matters" construction ("matters more than"
24×, "this matters", "distinction matters", "matters because"), a
recognisable modern-LLM emphasis pattern worth a future targeted measurement.

**Recommendation: decline the raw mined table.** Any mined phrase must pass
human curation plus an independent AI/human pairing built from *different*
prompts and sources before it becomes evidence copy.

### 3b. Curated lexicon, dual-corpus verified (this is the shippable piece)

98 curated Copyleaks-folk-lore phrases measured on both independent pairings
(cycle2 register-balanced ratio; generated-2026 vs human-v2 plain ratio).
Full numbers: `known-phrases.json`.

Survivors — elevated ≥2× on BOTH pairings (21 of 98). Rates are docs per
1,000 containing the phrase (generated-2026 AI / human-v2):

| Phrase | AI /1k | Human /1k | cycle2 ratio | 2026 ratio |
|---|---|---|---|---|
| robust | 60.3 | 16.2 | 3.7× | 3.7× |
| whether you're | 43.8 | 8.7 | 3.1× | 5.0× |
| seamless | 22.4 | 5.8 | 3.6× | 3.8× |
| seamlessly | 11.2 | 5.1 | 2.2× | 2.2× |
| streamline | 10.2 | 4.3 | 4.4× | 2.3× |
| underscores | 5.5 | 2.4 | 3.5× | 2.2× |
| in an era | 4.5 | 1.2 | 3.3× | 3.5× |
| game-changer | 4.2 | 1.7 | 3.4× | 2.4× |
| a testament to | 3.2 | 1.2 | 13.9× | 2.5× |
| is not just about | 3.5 | 1.2 | 2.5× | 2.7× |
| elevate your | 3.0 | 0.7 | 2.8× | 3.7× |
| here's the thing | 2.2 | 0.2 | 5.8× | 6.5× |
| key takeaways | 2.0 | 0.7 | 2.2× | 2.5× |
| paving the way | 1.7 | 0.2 | 5.8× | 5.2× |
| plays a crucial role | 1.2 | 0.5 | 2.6× | 2.3× |
| tapestry | 0.75 | 0.0 | 13.4× | 7.2× |
| final thoughts | 0.75 | 0.2 | 2.3× | 2.4× |
| in today's digital | 0.75 | 0.0 | 2.5× | 7.2× |
| a beacon of | 0.25 | 0.0 | 6.2× | 3.1× |
| (plus "game changer" space variant, "streamlining") | | | | |

Casualties — the folk list has aged out on 2026 models. 13 phrases are
*anti-tells* (<0.8× on both pairings, i.e. more common in HUMAN writing):
"when it comes to" (0.2×), "a variety of" (0.1×), "a plethora of" (0.0×),
"in this article" (0.0×), "keep in mind that" (0.0×), "myriad" (0.1×),
"at the end of the day", "remember that", "there are several", others.
Further classics collapse on modern models despite surviving in cycle2
(which contains older-model text): "delve into" 0.2× on 2026 output,
"in the realm of" 0.1×, "it's important to note" 0.1×, "moreover" 0.6×,
"additionally" 0.4×.

**Recommendation: ship-with-caveats.** Show "this phrase appears in N per
1,000 AI documents vs M per 1,000 human documents (K×)" ONLY for phrases
passing the dual-corpus ≥2× gate, always with both rates visible, and
re-measure per model generation — a static folk list would flag human writing
and miss 2026 output. Phrases with <10 occurrences on a side (tapestry,
a beacon of) need a "rare phrase, small sample" tag: their ratios lean on
Laplace smoothing.

## Honest limits (all tells)

1. **In-distribution AI.** The AI side is the programme's own generated
   corpora (owner's prompts, 21 models via OpenRouter, British-English
   briefs). Rates on other people's prompts/models will differ; British topic
   vocabulary contaminates any naive mining.
2. **Era mismatch on the human side.** human-v2 is overwhelmingly pre-2022
   web text; some "anti-tells" (e.g. "in this article") partly reflect 2019
   SEO fashion, not timeless human style.
3. **Structure stripping.** cycle2 and the human longform corpus lose most
   heading structure; heading-based tells were only measurable on generated +
   human-v2 (and there, human heading detection is heuristic, n=331 for
   heading-conditional stats).
4. **No significance testing beyond scale.** Denominators are 4k–10k docs, so
   the headline rates are stable to roughly ±1 point, but per-register and
   rare-phrase cells are small; treat sub-1-per-1,000 rates as indicative.
5. **Nothing here is a verdict input.** Everything above is evidence-copy
   material at best; the strongest single flag (composite scaffold) covers
   under 1% of AI documents.

## Reproduction

```
cd implementation/services/local-engine/research/document-tells-2026-08-31
python3 measure_structure.py       # tells 1-2 (v1), ~25s
python3 measure_scaffold_v2.py     # tell 2 v2: shapes + per-model, ~8s
python3 measure_phrases.py         # tell 3 mining, ~22s (numpy)
python3 measure_known_phrases.py   # tell 3 curated lexicon, ~6s
```

---

## Addendum (2026-08-31, later): structural fingerprint — preliminary table

Owner-specified side-by-side fingerprint, ≥500-word docs only; section-level
rows additionally need ≥4 sections. AI side = generated corpus (21 models).
Human side here is still the OLD structure-stripped human-v2 — **thin human
baseline, indicative only** (it retains no lists and no markdown headings; a
structure-preserved human corpus is being banked and the final table below
will replace this comparison).

| Metric | HUMAN (human-v2, thin baseline — indicative only) | AI (generated, 21 models) |
|---|---|---|
| docs ≥ 500 words (denominator) | 2,157 | 3,150 |
| docs ≥ 500w AND ≥ 4 sections | 171 | 2,128 |
| sections per article (mean) | 5.85 | 7.65 |
| sections per article (median) | 5 | 7 |
| heading depth: H2 only | unmeasurable (headings stripped) | 71.8% |
| heading depth: H2+H3 | unmeasurable | 17.0% |
| heading depth: deeper | unmeasurable | 1.7% |
| paragraphs per section (mean) | 3.06 | 2.94 |
| paras/section within-doc variance | **6.19** | **1.56** |
| words per paragraph (mean) | 63.9 | 55.5 |
| sequential para delta (mean words) | **38.3** | **22.3** |
| consecutive paras within ±20% | **26.6%** | **36.6%** |
| lists per section | 0.0 (stripped) | 0.196 |
| share of sections with a list | 0.0% (stripped) | 19.2% |
| items per list (mean) | unmeasurable | 4.67 |
| items per list (p50 / p90) | unmeasurable | 4 / 7 |
| sentence-length CV (spp_cv) | 0.519 | 0.360 |

Early read on the owner's sequence hypothesis (one paragraph followed by the
next): direction confirmed on the thin baseline — humans jump an average of
38 words between consecutive paragraphs vs 22 for AI, and AI has ~10 points
more same-length consecutive pairs — but the human denominator for the
section rows is 171 docs and list rows are unmeasurable. Final verdicts wait
for the structure-preserved corpus (next section).

---

## Addendum (2026-08-31, final): the shape tells re-measured against a structure-preserved human corpus

A new human baseline was banked:
`research/human-structured-corpus-2026-08-31/corpus.jsonl` — 3,529
licence-recorded human docs with headings, paragraphs AND bullet lists
preserved (2,513 parse to ≥3 sections vs 292 in human-v2; 74% carry bullet
lists vs ~0%). Sources: GOV.UK guides/answers/news + Service Manual (OGL),
Google Search Central blog 2006-2014 via Common Crawl captures (CC BY 4.0,
the SEO/marketing hard-negative register, n=499), GDS blog (OGL), github/docs
+ 18F repos + Microsoft style guide at pre-2022 git commits (CC BY 4.0 / CC0),
Wikinews (CC BY 2.5), Global Voices (CC BY 3.0) — GREEN bucket 2,779; Stack
Exchange Q&A + MDN (CC BY-SA) — AMBER bucket 750, banked separately.
Human-confidence labels: H1 1,564 (named author + pre-2022 git commit or
editorial publication), H2 1,278, H3 687 (pre-2022 first-published but
possibly revised; never treated as proven). Rejected: wikiHow (robots/ToS),
Mongabay (licence unverifiable on-page), GitLab handbook (no licence
statement in repo at pinned commit), Wayback business blogs (RED).
Manifest with SHA-256 per file: `manifest.json`; measurement outputs
`new-human-summary.json`, `fingerprint-final.json` in the corpus directory.

### Verdict changes vs the main report

| Tell | Old verdict (vs human-v2) | New verdict (vs structured human corpus) |
|---|---|---|
| Section-shape uniformity (mode share ≥ 0.8, ≥3 sections) | REFUTED — human 13.0% > AI 8.5% | **FLIPS TO A REAL TELL**: human 2.9% (73/2,513) vs AI 8.5% — ~2.9×. The old refutation was a survivorship artefact: structure-stripping kept only rigid short human docs |
| Strict constant body shape | No separation (6.9% vs 6.6%) | **Separates ~4.9×**: human 1.35% vs AI 6.6% |
| Composite scaffold (≥4 sections, mode ≥ 0.8, spp_cv ≤ 0.35) | 2.8× (1.3× on hard negatives) | **~6.6×, and it survives hard negatives**: AI 4.8% (111/2,332) vs human 0.72% (18/2,513); FAQ/listicle-like hard negatives 0.78% (17/2,175) |
| Bullet-list rhythm | Unmeasurable | **Measurable and it is an ANTI-tell**: humans put lists in 34% of sections vs AI 18%; bullet-share ≥ 0.6 fires on 15.7% of human docs vs 4.9% of AI. "AI is bullet-happy" is refuted at population level for 2026 models |
| Sentence-length CV (spp_cv ≤ 0.3) | 2.4× (24.1% / 10.2%) | **3.6×**: AI 31.0% vs human 8.6% (hard negs 8.3%) |
| Formulaic closer | 2–2.7×, low coverage | Weakens to ~1.8× (AI 2.4% vs human 1.3%); still low coverage. Keep as colour only |
| Keyphrase echo | Decline (≈1.5×) | **Decline confirmed, now an anti-tell**: echo ≥ 0.4 fires on 9.4% of structured human docs vs 5.1% of AI — SEO/how-to registers echo MORE than models |

### NEW: word-count regularity (owner extension)

CV of words-per-section (wps_cv), words-per-paragraph (wpp_cv), and share of
body sections within ±15% of the doc's median section length (sec15).
Denominators: AI 2,332 structured / new human 2,513 structured (hard
negatives = FAQ registers + ≥5-heading docs, n=2,175).

| Flag point | AI | New human | Hard negatives | Lift |
|---|---|---|---|---|
| wps_cv ≤ 0.2 | 9.4% | 2.1% | 1.3% | 4.5× |
| wps_cv ≤ 0.3 | 27.5% | 6.2% | 5.1% | 4.4× |
| wpp_cv ≤ 0.2 | 13.2% | 0.8% | 0.6% | **16×** |
| wpp_cv ≤ 0.3 | 32.3% | 6.8% | 6.2% | 4.7× |
| sec15 ≥ 0.75 | 19.6% | 3.1% | 2.8% | 6.4× |
| sec15 ≥ 0.9 | 10.5% | 0.76% | 0.75% | **13.8×** |

Distribution means: wps_cv AI 0.43 vs human 0.65; sec15 AI 0.48 vs human
0.26. **These are the strongest document-shape tells measured so far** —
double-digit lifts at usable coverage, stable on hard negatives, and stable
across GREEN/AMBER buckets and H1/H2/H3 confidence labels (human wps_cv
0.60-0.72 in every split). Recommended flag points: wpp_cv ≤ 0.2 and
sec15 ≥ 0.9 (each fires on ~1 in 8-10 AI docs at <1% human FP);
ship-with-caveats as evidence copy with both rates shown.

Word-budget wrinkle: the hypothesis "budgeted drafts allocate words more
evenly" is NOT what the prompt-style split shows — house-brief (explicit
word budget) wps_cv 0.465 vs plain 0.43 vs human-voice 0.386. Evenness is a
model habit, not a budget artefact.

### Structural fingerprint — FINAL side-by-side (≥500-word docs)

| Metric | HUMAN (new corpus) | AI (generated, 21 models) |
|---|---|---|
| docs ≥ 500 words (denominator) | 2,016 | 3,150 |
| docs ≥ 500w AND ≥ 4 sections | 1,555 | 2,128 |
| sections per article (mean / median) | 18.4 / 12 | 7.6 / 7 |
| heading depth: H2 only | 34.3% | **71.8%** |
| heading depth: H2+H3 | 36.1% | 17.0% |
| heading depth: deeper | 24.9% | 1.7% |
| paragraphs per section (mean) | 2.65 | 2.94 |
| paras/section within-doc variance | **6.32** | **1.56** |
| words per paragraph (mean) | 38.5 | 55.5 |
| sequential para delta (mean words) | 23.5 | 22.3 |
| consecutive paras within ±20% | 25.3% | 36.6% |
| lists per section | 0.39 | 0.20 |
| share of sections with a list | 35.0% | 19.2% |
| items per list (mean, p50/p90) | 3.83, 3/6 | 4.67, 4/7 |
| sentence-length CV (spp_cv) | 0.479 | 0.360 |

Reading, against the owner's sequence hypothesis: in ABSOLUTE words the
consecutive-paragraph delta does not separate (23.5 vs 22.3 — human
paragraphs are shorter, so raw deltas shrink); the RELATIVE version does:
36.6% of AI consecutive paragraph pairs are within ±20% of each other vs
25.3% for humans, and within-doc paras-per-section variance separates 4×
(6.3 vs 1.6). Two further fingerprint components worth shipping as colour:
**flat heading hierarchy** (H2-only docs: AI 72% vs human 34%, ~2.1×) and
**longer uniform paragraphs** (AI 55.5 words/para vs human 38.5).
Sections-per-article separates in this table but is partly a corpus-length
artefact (GOV.UK multi-part guides) — do not ship it.

Per-model (fingerprint-final.json, `ai_by_model`): llama-4-maverick is the
extreme templater (52% same-length consecutive pairs, paras/section variance
0.41 — fifteen times more regular than the human mean; 0% H2-only because it
under-uses markdown headings), followed by mistral-medium-3-5 (48.7%) and the
gpt-5.6 family (42-46%, 73-80% H2-only). The gemini-flash family is the least
sequence-regular (21-25%), close to human. "Most consistent with model X"
colour remains soft copy only.

### Honest limits of the new baseline

1. Register/source coupling: each register comes mostly from one source
   family; register effects and source effects are not separable. All
   headline claims were checked per-register (`new_human_by_register`) and
   hold direction in every register with n>100.
2. The corpus is professional/edited web writing; casual blogs and
   commercial listicles with clear licences remain unobtainable — FAQ and
   ≥5-heading subsets stand in as hard negatives and behave consistently.
3. AI side unchanged (own prompts, 21 models); out-of-distribution AI may
   differ.
4. Git-sourced markdown drops templating variables mid-sentence occasionally;
   structure metrics are unaffected, word counts negligibly.
5. Search Central docs are 2006-2014 era (Common Crawl coverage); modern
   SEO-agency copy may be more scaffold-like than this baseline — the
   seo-marketing-blog register is the one where human mode-share uniformity
   is highest (12.4%), and it should stay the calibration register of record.

### List lead-in frame repetition (owner extension, measured last)

Method (`measure_leadins.py`, output `leadin-frames.json`): for every bullet
block, the preceding paragraph's final sentence counts as a lead-in when it
is ≤30 words and ends with ':'; lead-ins are normalised to their verb frame
("may include", "including", "are", …). Denominators: docs ≥500 words with
≥1 list — AI 1,278 / new human 1,642.

| Metric | AI | New human | FAQ hard negs (n=173) |
|---|---|---|---|
| share of lists with a colon lead-in | 30.3% | 32.5% | 32.3% |
| frame diversity (distinct/total, ≥2 lead-ins) | 0.656 | 0.417 | 0.486 |
| same frame reused 3+ times | 3.0% | **26.1%** | 8.7% |
| "may include:"-family ≥2 per doc | 0.08% | 0.30% | 0% |

**Verdict: anti-tell at population level.** Humans reuse one lead-in frame
far MORE than models do — professional house styles (GOV.UK's "You can:",
"You'll need:", github/docs procedure intros) repeat a single frame down the
whole page, while 2026 models vary their lead-in phrasing. The owner's Terra
example ("may include:" × 4 sections) is real but rare: the modal-include
family fires ≥2× in under 1 per 1,000 AI docs (gpt-5.6-sol is the only model
above zero, 1.6%). Decline as a scored signal; per-doc it remains legitimate
neutral evidence copy ("4 of 5 lists are introduced with the same 'may
include:' frame") when it actually occurs.

The owner's "diverges but not much" axis falls out of the existing
mode-share metric rather than needing a new one: among ≥4-section docs the
wobble band (mode share 0.5-0.8, one dominant layout with small deviations)
holds 45.6% of AI docs vs 31.6% of human docs, while genuine variety
(mode share <0.5) holds 65.1% of human docs vs 45.3% of AI. Perfect
constancy (=1.0) is AI 7.0% vs human 1.5% — consistent with the strict-flag
row above; no separate metric shipped.
