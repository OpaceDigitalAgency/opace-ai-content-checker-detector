# Corpus reconciliation, prompt-style evasion and the threshold decision

**Written 29 August 2026.** Everything below was measured in this pass against local model
files. Nothing was benchmarked through the production Cloud Run service; no production
configuration was edited; no abuse control was weakened.

---

## 1. The answer

### 1.1 One number Opace can publish and defend

> **The trained classifier detects about 95% of AI-written long-form documents and wrongly
> flags about 1.2–1.5% of human-written long-form documents.**
>
> Corpus: 5,558 fresh long-form documents the model was never trained on — 922 AI from 13
> current models, 4,636 human from Europe PMC, GOV.UK, CRS, Global Voices, Mongabay, SEC
> EDGAR and PERSUADE 2.0.
> Threshold: the shipped 0.984. Segmentation `segments-v2`, aggregation maximum-over-segments.
> Both runtimes, measured separately:

| Runtime | AI detected | Human false positives |
|---|---|---|
| fp32 Cloud Run server model, whole corpus | **877/922 = 95.12%** | **56/4,636 = 1.21%** |
| int8 browser model, whole corpus | **877/922 = 95.12%** | **90/4,636 = 1.94%** |

Both runtime figures are new measurements made here, both on all 5,558 documents. The fp32 row
reproduces `SEGMENT-TOKEN-FIX.md` §6.6 exactly, document for document, which is what validates
the harness. **The browser row is the first full-corpus segmented browser measurement this
project has ever had**, and it replaces the 1.34% in `thresholds.json`, which was an
opening-only pre-segmentation figure.

Detection is identical on the two routes to the document. False positives are not: the browser
wrongly flags 90 human documents where the server wrongly flags 56, so **the browser route is
about 0.7 points more false-positive-prone at the shared flag point**. Publish the worse of the
two, or publish both.

**This number is honest only with its conditions.** It holds for long-form prose of roughly
600 words and up. It does not hold, and must never be quoted, for:

| Where it does not hold | Measured | Denominator |
|---|---|---|
| Human fiction wrongly flagged | **11.2% fp32 / 10.8% browser** | 29/260, 28/260 |
| Human academic discussion wrongly flagged | 1.90% fp32 / 4.1% browser sample | 8/420, 6/145 |
| AI long-form cut to 512 words | 84.4% detected, down from 94.8% | 552/654 |
| AI text at 100 words | 19% detected | denominator still unrecorded |
| AI rewrites of a human original (HAT-Bench v8, 100% AI tokens) | 34.8% detected | 1,022 |
| Short marketing, SEO and social copy | **never measured on independent data** | — |

The last row is the important gap. Every marketing/SEO/social sample this programme owns is
inside the cycle-2 training set (§3), so the tool has **no independent accuracy figure for the
register most of its users will paste into it**. Publish the long-form number, say it is
long-form, and say that short web copy is unmeasured.

### 1.2 The `segments-v3` aggregation change (added after the first pass)

**Ship `0.9855 / 0.9763`, not `0.9845 / 0.9765`.** The fp32-fitted pair was refitted on the
browser runtime over the full corpus, as `AGGREGATION-AND-RHYTHM.md` §2.5 requires. It does not
transfer: on the browser it raises human false positives from 1.94% to 2.29% where on the server
it lowers them from 1.23% to 1.14%. `0.9855 / 0.9763` delivers the identical two-section gain
(81.08% → 91.89%, both routes), holds browser false positives exactly flat, and cuts server
false positives to 0.971%. Full working in §8. Server-first deploy order is unaffected.

### 1.3 The threshold decision

**Do not lower the threshold, and do not ship any threshold change on current evidence.**

Two independent reasons, either sufficient on its own.

**Reason one: the price is absurd.** The owner's document scored 0.8082 on the server. To flag
it you must set the threshold at or below 0.8082. At 0.8082, on the 4,636-document human
corpus, the fp32 route wrongly flags **1,023 of 4,636 human documents (22.07%)** — up from 56.
Academic discussion goes to 46.19%, academic conclusions to 35.56%, fiction to 27.69%. Even a
much gentler move to 0.95, which still would not catch his document, buys 41 extra AI
documents (877 → 918 of 922) and costs **300 extra wrongly flagged human documents**
(56 → 356 of 4,636, 1.21% → 7.68%). Seven human documents wrongly flagged for every AI
document gained.

**Reason two: below about 0.97 the two routes stop agreeing, so a shared threshold stops
existing.** Measured on all 5,558 documents through both runtimes:

| Threshold | Documents given opposite verdicts by the two routes |
|---|---|
| 0.984 (shipped) | 48 / 5,558 = **0.86%** |
| 0.98 | 82 = 1.48% |
| 0.97 | 171 = 3.08% |
| 0.95 | 369 = 6.64% |
| 0.90 | 589 = 10.60% |
| 0.8082 | 757 = **13.62%** |

Almost every disagreement runs one way: the browser flags, the server clears. The owner's own
document is the textbook case — server 0.8082, browser 0.9470 on the same section, a 13.9-point
gap, with section 1 at 0.4993 server against 0.8070 browser, a 30.8-point gap. Any threshold
between roughly 0.81 and 0.95 flags his document in the browser and clears it on the server.
HANDOVER §4.4's durable finding is that both routes must share one flag point. Below 0.97 that
requirement cannot be met.

**What to do instead: retraining, and specifically on short published web copy.** See §6.

---

## 2. The reported ninety-point corpus gap does not exist

The brief described the fresh generated corpus as giving academic 1.1% (5/457) and articles
37.5% (467/1,244) against the held-out corpus's 92.4% and ~96%, and asked for the gap to be
decomposed. **There is no gap to decompose. The comparison is arithmetically impossible.**
Verified directly, not taken from another document:

1. `generated-corpus/scored-tier3.json` holds 4,050 scores. The **maximum value across all of
   them is 0.8582**; the minimum is 0.1427. Not one document in that corpus could clear the
   shipped 0.984 threshold under any circumstances.
2. `GENERATED-CORPUS-EVAL.md` line 6 names the checkpoint: `models/tier3-e5small-int8-perchannel.onnx`
   — the **cycle-1** model, which `thresholds.json` records as superseded and which "detected
   2.5% of the same fresh AI long-form". The quoted rates are at 0.8533, a threshold that does
   not ship and that the same file says "does not appear anywhere in this repository".

So the two figures compare a superseded model at a non-shipping threshold against the deployed
model at the shipping threshold. **They were never in conflict.** Any document asserting a
ninety-point contradiction between the corpora should be corrected.

**A second, independent reason the generated corpus cannot serve as an accuracy measurement.**
Comparing whitespace-normalised, case-folded text hashes against `cycle2-train/dataset.jsonl`:

| Corpus | Rows | Also present in the cycle-2 dataset |
|---|---|---|
| `generated-corpus/generated.jsonl` | 4,050 | **3,840 (94.8%)** — 2,616 train, 685 test, 539 cal |
| `longform-corpus/ai-longform.jsonl` | 922 | 268 (29.1%) — **168 in the train split** |
| `longform-corpus/human-longform.jsonl` | 4,636 | 11 (0.24%) |

The generated corpus **is** the cycle-2 training material. Re-scoring it on cycle 2 measures
memorisation, not accuracy. Nothing on that corpus should be quoted as a detection rate for the
deployed model, in either direction.

**What the two corpora genuinely differ on, and it is worth knowing.** They are not the same
kind of text. The generated corpus has a median of 840 words and is dominated by SEO service
pages, product descriptions, FAQ pages and 721 social posts. The long-form corpus has a median
of 1,611 words (AI) and contains no marketing or social register at all. Since detection is
strongly length-dependent (§4) and aggregation is the maximum across segments, a 1,600-word
document gets six draws at the threshold and a 200-word social post gets one. That is a real
difference in what is being measured, and it is why the long-form headline must be labelled
long-form.

### 2.1 How much does the residual contamination flatter the held-out figure?

168 of the 922 "held-out" AI long-form documents are in the cycle-2 **train** split. Measured
on the fp32 route at 0.984:

| Subset | n | Detected |
|---|---|---|
| Never in the cycle-2 dataset | 654 | **620 = 94.80%** |
| In the cycle-2 dataset (any split) | 268 | 257 = 95.90% |
| In the cycle-2 **train** split | 168 | 163 = 97.02% |

The contamination is worth **2.2 points** on the affected rows and **0.3 points** on the corpus
headline. It is real, it should be recorded, and it does not change any conclusion. The human
side is effectively clean (11 rows in 4,636).

---

## 3. The prompt-style split, measured on independent data for the first time

This is the measurement that had never been done. The cycle-2 report's 98.2% on human-voice
prompts was measured on held-out rows of the same generation run, split group-aware by content
hash — in-distribution. The generated corpus's alarming 55.9% → 19.8% collapse, and grok-4.6's
0/86, came from the superseded cycle-1 model at 0.8533 (§2).

**The independent set used here.** 654 AI long-form documents from `ai-longform.jsonl` whose
normalised text appears nowhere in `cycle2-train/dataset.jsonl` — not in train, not in cal, not
in test. They carry a `prompt_style` label from generation: `plain`, `house-brief`, and
`human-voice` (the "write like a human" instruction). Balanced by construction: 207 / 224 / 223.
13 models across 8 providers. Both runtimes, `segments-v2`, maximum aggregation, threshold 0.984.

| Prompt style | n | fp32 server | int8 browser |
|---|---:|---|---|
| plain | 207 | 200 = **96.6%** [93.2–98.4] | 201 = **97.1%** [93.8–98.7] |
| house-brief | 224 | 209 = **93.3%** [89.2–95.9] | 209 = **93.3%** [89.2–95.9] |
| human-voice | 223 | 211 = **94.6%** [90.8–96.9] | 211 = **94.6%** [90.8–96.9] |

Wilson 95% intervals. At 0.95 every style reaches 99.6–100%.

**The finding: instructing a current model to write like a human costs 2.0 points of detection
on long-form, not 30 to 60.** The confidence intervals for the three styles overlap heavily.
`human-voice` is not even the weakest style — `house-brief` is, by 1.3 points, and that
difference is inside the noise too. Per model, the worst human-voice cell is
`meta-llama/llama-4-maverick` at 12/17 = 70.6%; **`x-ai/grok-4.6`, the model reported at 0/86,
reads 27/28 = 96.4% on human-voice prompts here.**

**The catch, and it matters.** These are long-form documents, median 1,611 words. Truncate the
same 654 documents to their first 512 words and the style penalty reappears:

| Prompt style | Full document | First 512 words |
|---|---|---|
| plain | 200/207 = 96.6% | 187/207 = **90.3%** |
| house-brief | 209/224 = 93.3% | 187/224 = **83.5%** |
| human-voice | 211/223 = 94.6% | 178/223 = **79.8%** |

At full length the human-voice penalty is 2.0 points. At 512 words it is **10.5 points**. The
evasion axis is closed for long documents and open for short ones. That is a length interaction,
not a style collapse, and it is the honest description.

**What this does not cover.** All 654 documents are long-form registers — journalism, academic,
white paper, story, company update, research summary. There is still no independent prompt-style
measurement for marketing, SEO or social copy, because every sample of those registers this
programme owns is training data.

---

## 4. Reproducing the miss

**The owner's exact document was not available in this programme directory** — no file, corpus
row or agent note contains it, only its scores. The class of failure was reproduced instead,
and the reproduction is conclusive about the mechanism.

### 4.1 It is not "GPT-5.6 Sol writes SEO copy the model cannot see"

Every marketing-register document in the generated corpus (2,544 rows across 11 registers) was
scored on the deployed model through the fp32 path, whole and truncated to 512 words.

| Slice | n | Full | Truncated to 512 words |
|---|---:|---|---|
| All marketing/SEO registers | 2,544 | 96.9% | 95.6% |
| `gpt-5.6-sol` only | 92 | 100.0% | 98.9% |
| `gpt-5.6-sol` + `sol-pro` on SEO-page registers | 43 | **100.0%** | **100.0%** |

The 43 Sol SEO pages truncated to 512 words score between 0.987 and 0.990 — a suspiciously
tight band, and exactly what memorised training rows look like. **On its own training
distribution the deployed model finds 512-word Sol SEO copy trivially.** So the miss is not
about the model, not about the register as the corpus represents it, and not about Sol.

### 4.2 It is length, on text the model has genuinely never seen

The 654 contamination-free AI long-form documents, truncated to their first 512 words, fp32,
0.984:

| | Detected | Median document score |
|---|---|---|
| Full document (median 1,611 words, median 6 segments) | 620/654 = **94.8%** | 0.9900 |
| First 512 words (median 2 segments) | 552/654 = **84.4%** | 0.9891 |

**10.4 points lost to length alone, on independent data.** And critically:

> **98 of the 654 truncated documents (15.0%) land in the 0.75–0.984 band — unflagged, but
> visibly not human. That is the owner's document's band.**

So a 512-word AI document scoring 0.8082 and going unflagged is not an anomaly. It is roughly a
**one-in-seven ordinary outcome** at that length. Per register at 512 words: fiction 75.0%,
academic essays 72.3%, journalism 79.4% — all far below their full-length rates.

### 4.3 So: systematic, not particular

The miss is **systematic**, with two named causes and one hypothesis:

1. **Length (measured, dominant).** Max-over-segments needs segments. At ~1,600 words the model
   gets six independent draws at the threshold; at 512 words it gets two. Detection falls
   10.4 points and 15% of documents land in the owner's band.
2. **Prompt style, but only at short length (measured).** Human-voice instructions cost
   10.5 points at 512 words against 2.0 points at full length.
3. **Editing (documented, not reproduced here).** A real *published* article is not raw model
   output. `CYCLE3-REPORT.md` §3.1–3.2 records the deployed model at **34.8%** on HAT-Bench v8
   — documents that are 100% AI tokens but were produced by rewriting a human original — and
   **59.7%** on the pooled 95–100%-AI band. If his article was drafted from a brief and tidied
   for house style, that is the band it sits in, and 0.8082 is an unremarkable score for it.

Per-segment evidence, as requested: on the truncated independent set the median document has
two segments; on the reproduction slice the observable pattern is the same as his — one weak
opening section and one stronger later section, with the maximum still short of the bar. His
own readings are server 0.4993 / 0.8082 and browser 0.8070 / 0.9470.

---

## 5. The human fiction figure — resolving the contradiction

Two figures are in circulation for the same corpus slice. **Both are real; neither is the
shipped operating point; the product is about to publish the wrong one.**

| Figure | Where it comes from | Runtime | Segmentation | Threshold |
|---|---|---|---|---|
| 33/260 = **12.69%** (HANDOVER §9.1) | `SEGMENT-TOKEN-FIX.md` §6.3 | fp32 Python | `segments-v2` | **0.980** |
| 16/260 = **6.15%** (`thresholds.json`) | pre-segmentation opening-only pass | int8 browser | none | 0.984 |

Measured here at the shipped operating point, `segments-v2`, maximum aggregation, threshold
0.984, all 260 human fiction documents:

| Runtime | Human fiction wrongly flagged |
|---|---|
| **fp32 server (the default route)** | **29/260 = 11.2%** [7.9–15.6] |
| **int8 browser** | **28/260 = 10.8%** [7.6–15.1] |

**11% is the number to publish.** The 6.15% in `thresholds.json` is superseded — it predates
segmentation, and segmentation nearly doubles it (the same 260 documents score 15/260 = 5.8% on
a first-segment-only pass here, reproducing the old figure's magnitude). `thresholds.json`'s
whole `measured` block carries v1-derived, pre-segmentation browser figures and should not
generate user-facing copy until it is refreshed with the numbers in this document.

The rate is also extremely sensitive to the threshold in a way no other register is: 0.980 gives
12.69%, 0.984 gives 11.15%, 0.9845 gives 9.62%, 0.990 gives 0.38%. Fiction sits in a dense cliff
just under the bar. Any threshold discussion has to look at this register separately.

---

## 6. The threshold trade-off, in a form you can decide from

### 6.1 The curve, fp32 server route, full 5,558-document corpus

| Threshold | AI detected | Human false positives | Fiction FP | Academic discussion FP |
|---|---|---|---|---|
| **0.984 (shipped)** | **877/922 = 95.1%** | **56/4,636 = 1.21%** | 29/260 = 11.2% | 8/420 = 1.9% |
| 0.980 | 893/922 = 96.9% | 97/4,636 = 2.09% | 33/260 = 12.7% | 16/420 = 3.8% |
| 0.970 | 910/922 = 98.7% | 195/4,636 = 4.21% | 36/260 = 13.8% | 42/420 = 10.0% |
| 0.950 | 918/922 = 99.6% | 356/4,636 = 7.68% | 46/260 = 17.7% | 70/420 = 16.7% |
| 0.900 | 919/922 = 99.7% | 660/4,636 = 14.24% | 57/260 = 21.9% | 118/420 = 28.1% |
| **0.8082 (what it takes to catch the owner's document)** | 922/922 = 100% | **1,023/4,636 = 22.07%** | 72/260 = 27.7% | **194/420 = 46.2%** |

Full per-register tables at eight thresholds are in `raw/analysis.txt` (§9).

### 6.2 The same curve, int8 browser route, all 5,558 documents

First time measured on the whole corpus. AI figures are given both for all 922 and for the 654
documents with no cycle-2 contamination.

| Threshold | AI detected (922) | AI detected (654 independent) | Human FP | Fiction FP | Academic discussion FP |
|---|---|---|---|---|---|
| **0.984 (shipped)** | **877/922 = 95.12%** | 621/654 = 94.95% | **90/4,636 = 1.94%** | 28/260 = 10.77% | 16/420 = 3.81% |
| 0.980 | 899/922 = 97.51% | 639/654 = 97.71% | 169/4,636 = 3.65% | 32/260 = 12.31% | 32/420 = 7.62% |
| 0.970 | 915/922 = 99.24% | 651/654 = 99.54% | 359/4,636 = 7.74% | 39/260 = 15.00% | 72/420 = 17.14% |
| 0.950 | 920/922 = 99.78% | 653/654 = 99.85% | 723/4,636 = 15.60% | 51/260 = 19.62% | 141/420 = 33.57% |
| 0.900 | 922/922 = 100% | 654/654 = 100% | 1,244/4,636 = 26.83% | 71/260 = 27.31% | 232/420 = 55.24% |
| 0.8082 | 922/922 = 100% | 654/654 = 100% | 1,780/4,636 = 38.40% | — | — |

**The browser route is the more aggressive of the two at every threshold, and the gap widens
fast as the threshold falls.** At 0.984 the routes cost 1.94% and 1.21%; at 0.95, 15.60% and
7.68%. Measured |Δp| across all 5,558 documents: 0.97–1.00 median **0.0002**; 0.90–0.97 median
0.0710; **0.50–0.90 median 0.2609, max 0.7562**. This reproduces `ROUTE-PARITY.md` §4 on a
corpus ninety times larger and makes the same point more sharply: **the shipped 0.984 sits in
the only region where the two routes agree.**

**A correction worth recording.** An earlier pass of this document estimated the browser's
corpus false-positive rate at 1.54% from a 1,770-document register-stratified sample reweighted
to corpus proportions. The measured value is **1.94%**. The sample was unbiased in construction
and still came in 0.4 points low, because at per-register rates of 0.5–2% the within-register
sampling error dominates: white papers read 1.0% in the sample against 1.67% on the full 840.
Sampling is adequate for the shape of a curve and inadequate for a rate this small. That lesson
is what §8 turns on.

### 6.3 If a threshold must move at all

At a matched false-positive budget the two routes need different numbers, which is exactly what
HANDOVER §4.4 forbids. Measured on the full corpus:

| Shared threshold | Server detection / FP | Browser detection / FP | Route disagreement |
|---|---|---|---|
| 0.984 (shipped) | 95.12% / 1.21% | 95.12% / 1.94% | 0.86% |
| 0.982 | 96.31% / 1.77% | 96.53% / 2.67% | 0.86% |
| 0.980 | 96.85% / 2.09% | 97.51% / 3.65% | 1.48% |

If the owner wants more detection from a single threshold, 0.980–0.982 on both routes is the
honest lever: 1.2 points of detection for 0.6–0.7 points of false positives, route disagreement unchanged
at 0.86%. It does not catch his article and nothing above 0.81 does. The
better answer is the aggregation change in §8, which buys the same detection without the
false-positive cost.

### 6.4 What retraining would fix, and what it would not

**Would fix:**

- **Short published web copy.** This is the actual defect. Cycle 2 was trained on long-form
  published register; the miss is a length effect (§4.2) and the one register never independently
  tested is short marketing/SEO. Training on 400–800-word published web copy — with a *held-out*
  generation run, not the one already inside the training set — targets the failure directly.
- **The short-length prompt-style penalty** (10.5 points at 512 words), for the same reason.
- **Fiction false positives.** The corpus has 300 AI fiction samples and no matched human fiction
  set. 11.2% is what an untrained-against register looks like. A matched human fiction set is a
  corpus problem, not a threshold problem, and no threshold fixes it.

**Would not fix:**

- **The runtime divergence.** Retraining does not make int8 and fp32 agree in the mid-range;
  quantisation does that. If the product ever wants to say anything about mid-range scores it
  needs the two routes reconciled, not a better model.
- **Very short text.** 100 words is 19% detected. That is an information limit, not a training
  limit.
- **Lightly-edited AI.** Cycle 3 already measured this: it raised the 95–100%-AI band from 59.7%
  to 71.5% but *lowered* detection on majority-human documents, which is the right direction and
  still leaves the band well under the long-form figure.

**Recommendation.** Hold 0.984. Fund a fresh short-form generation run — 400–800-word published
web copy across current models and all three prompt styles, generated *after* the training
freeze and kept entirely out of it — and measure before retraining. That single corpus closes
the register gap in §1.1, gives the tool its first honest short-copy number, and is the
precondition for any retrain that would actually catch the owner's article.

---

## 7. Measuring the browser curve: it is not five hours, and it is already done

HANDOVER's five-hour estimate is for the full 21,093-segment corpus, run serially, through a
real browser. Neither constraint is necessary.

**What was actually run here.** All 5,558 documents / **21,093 segments** through
`onnxruntime-web` 1.29.0 with the WASM execution provider, the shipped
`tier3-cycle2-e5small-int8-perchannel.onnx`, the shipped TypeScript WordPiece tokeniser, the
shipped `calibratedProbability` and the shipped `segmentText` — driven from headless Node with
2 to 8 parallel workers, using the project's existing `route-parity.mts` harness. Wall clock:
**about 55 minutes for the first 2,424 documents and a further 38 minutes for the remaining
3,134**, on a machine heavily loaded by other work throughout (load average peaked over 400).
Call it **90 minutes contended, well under an hour idle** — not five hours. The full browser
curve now exists and is in §6.2.

**Cheaper still, for any repeat.** Only 2,406 of 5,558 documents (9,437 segments, 45% of the
corpus) score between 0.50 and 0.99 on the fp32 route, and only those can change verdict at any
candidate threshold above 0.50. Scoring that subset plus a control answers the whole threshold
question at 45% of the cost. That is the right scope for the WebGPU cross-check in §8.4.

**On sampling, now that both exist.** The 1,770-document register-stratified sample estimated
the browser's corpus false-positive rate at 1.54%; the true value is 1.94%. Sampling was good
enough for the shape of the curve and not good enough for the level, and nowhere near good
enough for the two-threshold fit (§8.1). Where the quantity of interest is a handful of
documents, sample nothing — run the corpus.

**The one thing not established: headless Node against a real browser.** The argument that they
are identical is strong — same npm package and version, same WASM binary, same execution
provider, same model bytes, same TypeScript tokeniser and scoring function; the int8-web versus
int8-**Python** divergence HANDOVER §9 retracts a figure for comes from native ORT's extended
int8 fusions at `ORT_ENABLE_ALL`, which the WASM build does not apply and which Node does not
introduce. `ROUTE-PARITY.md` §1 already treats this harness as the browser runtime. But it is an
argument, not a measurement.

**One empirical attempt from this session failed.** The live checker was loaded in an automated
browser tab, the cookie banner declined, a 330-word corpus excerpt pasted, and the in-browser
model requested. The page reported *"The in-browser model could not be prepared here"* and the
check did not run — very likely the automation environment rather than a product fault, since
HANDOVER §6 records `requestAnimationFrame` in non-foreground tabs producing a false "the site
is broken" alarm before. The Node figure for that excerpt is **0.9845**, and the text is in
`raw/bcheck-sel.json` so a human can paste it into the real checker and compare in a minute.

**A second session did complete a live check, on WebGPU, and it agreed to displayed precision on
one document at the flag point.** That is corroboration, not parity: WASM and WebGPU are
different kernels. It matters more now than it did an hour ago, because §8 fits a *second*
threshold at 0.976 — below the region where the runtimes are known to agree. The scoped WebGPU
cross-check is described in §8.4 and is smaller than the run just completed.

---

## 8. The `segments-v3` two-threshold aggregation — browser refit

**Question put to this session:** the pair `0.9845` primary / `0.9765` secondary was fitted on
fp32 section scores. Is the 2,424-document browser sample enough to fit the secondary parameter
against, or does it need the full run?

**Answer: it needed the full run, the full run is done, and the fp32-fitted pair does not
transfer.** All 5,558 documents are now scored on both runtimes, segment by segment.

### 8.1 Why the sample could never have settled it

The secondary parameter only decides documents where the highest section falls short of 0.9845
*and* the second-highest clears 0.9765. That set is tiny:

| | AI decided by the second parameter alone | Human decided by the second parameter alone |
|---|---|---|
| fp32 | 13 / 922 | **6 / 4,636** |
| int8 browser | 16 / 922 | **29 / 4,636** |

Six human documents. A 1,770-document human sample is 38.2% of the corpus and would have been
expected to contain **2.3 of them**. No parameter can be fitted against an expected count of
two. The sample's own 3.4-point interval on the headline rate was never the binding constraint;
the binding constraint is that the quantity being fitted is a single-digit document count.

The stratification was on register, not on document score, so the second-highest distribution
was not skewed by construction — but that was never the risk. The risk was the denominator, and
the sample also came in 0.4 points low on the plain corpus false-positive rate (§6.2), which
would on its own have mis-sited any fitted parameter.

### 8.2 The fp32-fitted pair, applied to the browser

| Rule | fp32 detection / FP | browser detection / FP |
|---|---|---|
| shipped v2, single 0.984 | 95.12% / **1.230%** | 95.12% / **1.941%** |
| proposed v3, 0.9845 / 0.9765 | 96.20% / **1.143%** | 96.42% / **2.286%** |

**The change lowers false positives on the server and raises them on the browser.** Server
57 → 53 documents; browser 90 → 106. The directions are opposite. On the browser the pair costs
**+0.35 points of false positives** — a 17% relative rise — for its 1.3 points of detection.

The reason is the one the coordinator anticipated. The secondary parameter reaches lower down
the scale, and the runtimes diverge lower down the scale. Measured on second-highest section
scores across the full corpus:

| second-highest section, browser value | n | median \|Δ\| vs fp32 | max |
|---|---|---|---|
| 0.97 – 1.00 | 1,009 | **0.0002** | 0.1877 |
| 0.90 – 0.97 | 449 | 0.0749 | 0.6593 |
| 0.50 – 0.90 | 1,258 | **0.2689** | 0.7329 |

0.9765 sits just below the boundary of the region where the routes agree to four decimal places.
That is why a pair fitted on one runtime lands differently on the other, and it is why refitting
was the right call rather than a formality.

Route disagreement on the verdict rises from **48/5,558 = 0.86%** under the shipped rule to
**63/5,558 = 1.13%** under the proposed pair, 59 of the 63 being browser-flags-server-clears.

### 8.3 The browser refit, and a pair that works on both routes

Refitting on the browser alone at the server's post-change false-positive budget (53 documents)
gives `0.9861 / 0.9806`, which detects **877/922 = 95.12%** — identical to the single-threshold
rule. **On the browser, at the server's budget, the two-threshold rule buys nothing.** Per-route
pairs are therefore both forbidden by the shared-flag-point rule and pointless.

A grid search over shared pairs, constrained to hold *both* routes at or under their current
0.984 false positives, finds one that dominates:

| Pair | fp32 det / FP | browser det / FP | fiction FP (srv/br) | acad-disc FP (srv/br) | two-section AI | route disagreement |
|---|---|---|---|---|---|---|
| shipped 0.984 | 95.12% / 1.230% | 95.12% / 1.941% | 11.15% / 10.77% | 1.90% / 3.81% | 81.08% / 83.78% | 0.86% |
| proposed 0.9845 / 0.9765 | 96.20% / 1.143% | 96.42% / **2.286%** | 9.62% / 10.77% | 2.14% / **5.48%** | 91.89% / 91.89% | 1.13% |
| **0.9855 / 0.9763** | 95.88% / **0.971%** | 96.42% / **1.941%** | **8.85% / 10.00%** | 1.90% / 5.00% | **91.89% / 91.89%** | 0.97% |

`0.9855 / 0.9763` delivers **the entire two-section gain the owner is buying** — 81.08% → 91.89%
on two-section AI documents, on both routes — while:

- holding browser false positives **exactly flat** at 1.941% instead of raising them to 2.286%;
- cutting server false positives to **0.971%**, better than both the shipped rule and the
  proposed pair;
- improving fiction on both routes (11.15% → 8.85% server, 10.77% → 10.00% browser) where the
  proposed pair leaves the browser unchanged;
- costing 0.32 points of server detection against the proposed pair (887 → 884 of 922), and
  nothing at all on the browser (889 either way);
- keeping route disagreement lower, 0.97% against 1.13%.

**Recommendation: ship `0.9855 / 0.9763`, not `0.9845 / 0.9765`.** If the deploy cannot absorb a
parameter change now, `0.9845 / 0.9765` is shippable but `thresholds.json` and any user-facing
copy must not describe it as false-positive-neutral: it is neutral-to-better on the server and
**0.35 points worse on the browser**, and academic discussion on the browser goes 3.81% → 5.48%.

### 8.4 Two caveats on these numbers

**Segment scores at four decimal places.** The two-threshold rule needs second-highest section
scores, and both harnesses record them at 4 dp — which is also what the server publishes in
`segments[].probability_ai`. Evaluated this way the shipped rule reads 57/4,636 rather than the
56 obtained from the 6-dp document maximum: **one document of sensitivity**. Every v3 figure
above carries roughly that ±1 document of quantisation noise. It does not move any conclusion,
and the fitted pairs should be re-checked against unrounded scores before they are written into
`thresholds.json`.

**WASM against WebGPU.** Every browser figure here comes from `onnxruntime-web` on the **WASM**
execution provider under headless Node. The live browser check reported by the other session ran
on **WebGPU**. They agreed to displayed precision on one document sitting at the flag point,
which is corroboration, not parity. What that assumption is worth, plainly: WASM and WebGPU are
different kernels with different accumulation order, and the divergence that matters here lives
between 0.90 and 0.98 — exactly where the secondary parameter sits, and exactly where int8
Python and int8 WASM were already shown to disagree by a median of 0.113. **A secondary
threshold fitted from WASM numbers is not proven for a WebGPU visitor.** The cheap closure is to
re-score the 2,406 documents that fall between 0.50 and 0.99 through WebGPU and compare
second-highest section scores; anything above 0.97 can be skipped because both runtimes already
agree there to 0.0002. That is a smaller job than the run just completed. Until it is done,
state in `thresholds.json` that the v3 parameters were fitted on the WASM execution provider.

---

## 9. Method and provenance

**Harness.** `harness.py` loads
`services/local-engine/research/model-shrink/reference-server/model/tier3-cycle2-e5small-fp32.onnx`
(SHA-256 prefix `e313ab00de1fffd2`, byte-identical to the `model_build` the live `/v1/health`
reports), imports `reference-server/segments.py` unmodified for `segments-v2`, and reproduces
`app.py`'s `_score` exactly: `p = sigmoid((logit₁ − logit₀) / 0.8324)`, maximum across segments.
Python 3.12 from `research/current-models/.venv`, onnxruntime 1.29.0, transformers 5.16.1,
numpy 2.5.2.

**Harness validation.** On the full 5,558-document corpus the harness returns 877/922 (95.12%)
and 56/4,636 (1.208%) at 0.984, and 893/922 and 97/4,636 at 0.980 — matching
`SEGMENT-TOKEN-FIX.md` §6.6 to the document. Nothing in this report rests on an unvalidated
scorer.

**Browser harness.** `opace-website/astro-latest/src/lib/local-signals/verify/route-parity.mts`,
unmodified, run through `npx tsx`. No product code, threshold or copy was touched. `astro build`
was not run.

**Contamination test.** Whitespace-collapsed, case-folded SHA-256 of the full text, matched
against every row of `cycle2-train/dataset.jsonl` (17,295 rows: 8,944 train, 6,522 test, 1,829
cal). Exact-duplicate detection only; near-duplicate and paraphrase overlap was not tested and
would only make the contamination figures larger.

**Volumes.** 5,558 documents / 21,093 segments on fp32; the same 5,558 / 21,093 on the int8
browser runtime; 2,544 generated-corpus documents scored twice (whole and truncated); 654
independent documents truncated to 512 words. Roughly 54,000 forward passes, all local.

**Live service.** Not used for measurement. One page load of the public checker, cookie banner
declined, no server-route check submitted, no request to `/v1/check`.

### 9.1 Raw output

Everything below is kept at
`implementation/services/local-engine/research/corpus-reconciliation-2026-08-29/` (5.2 MB,
outside the git repository's tracked material like the rest of `research/`):

| File | Contents |
|---|---|
| `lf-ai.jsonl`, `lf-hu.jsonl` | fp32 per-document and per-segment scores, all 5,558 |
| `raw/browser-runtime-scores.json` | browser-runtime per-segment scores, all 5,558 documents |
| `miss-scores.json` | 2,544 marketing-register documents, whole and truncated to 512 words |
| `trunc-scores.json` | 654 independent documents truncated to 512 words |
| `analysis.txt`, `browser-analysis.txt` | the full per-register, per-threshold, per-model tables |
| `harness.py`, `run_scores.py`, `analyse.py`, `br_analyse.py`, `miss.py`, `trunc.py`, `v3fit.py` | the scripts, re-runnable |
| `v3-analysis.txt`, `v3-recommended.txt`, `browser-fullcurve.txt` | the segments-v3 fit and the full browser curve |
| `raw/bcheck-sel.json`, `raw/bcheck-out.json` | the 330-word excerpt for the one-minute human browser check, and its Node score (0.9845) |

### 9.2 Claims this work retires

| Retire | Replace with |
|---|---|
| "The two corpora disagree by ninety points" | They were never compared on the same model or threshold (§2) |
| "Prompting a model to write like a human costs 12–60 points" | 2.0 points on independent long-form; 10.5 points at 512 words (§3) |
| "grok-4.6 falls to 0/86 on human-voice prompts" | 27/28 = 96.4% on independent data at the shipped threshold (§3) |
| "Human fiction: 6.15% (16/260)" — `thresholds.json` | 11.2% fp32 / 10.8% browser at the shipped operating point (§5) |
| "The browser route's segmented curve has never been measured" | Measured, all 5,558 documents (§6.2) |
| "The browser curve costs five hours" | 93 minutes on a contended machine, under an hour idle (§7) |
| "The browser route wrongly flags 1.34% of human long-form" — `thresholds.json` | **1.94% (90/4,636)**, measured, segmented, at 0.984 (§6.2) |
| "segments-v3 at 0.9845/0.9765 costs no false positives" | True on fp32; **+0.35 points on the browser**. Prefer 0.9855/0.9763 (§8) |
| "90.3% / 1.34%" as current behaviour | Opening-only, pre-segmentation. Use 95.1% / 1.21% (§1.1) |
