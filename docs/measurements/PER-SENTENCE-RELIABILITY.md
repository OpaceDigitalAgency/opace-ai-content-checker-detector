# What a per-sentence score from this detector will and will not support

**Measured 30 August 2026.** The question: the product decision to show a score on every sentence, as
a competitor does, was reversed and this layer was asked for. Before any number is printed beside a
sentence, what does a sentence score actually mean?

**The short answer.** A sentence score is far weaker than a document score, in a way that would be
invisible to a reader. **No per-sentence percentage is printed.** Passages are marked only when they
clear a measured evidence floor, and the marks are ranked against each other, never scored.

**The layer is built, tested and not shipped.** It can only run in the browser: the EU endpoint caps a
single request at about 12 inferences and the fixture in §10 needs 64, so there is no server-side
sentence path and building one is an owner-level cost decision. The browser floor is **not fitted** —
the two runtimes disagree on the marking decision 19.3% of the time near the floor — so the layer is
blocked on that measurement rather than borrowing the server's number. See §9.

---

## 0. Read this before quoting any figure: which runtime

**Every figure in sections 1 to 8 was measured on the fp32 server runtime**, not the browser.
Specifically: `tier3-cycle2-e5small-fp32.onnx`, SHA-256
`e313ab00de1fffd28d6157f014065b50bca8b59a8842746e54fe8b1504d2788d`, Python `onnxruntime` 1.29.0, CPU,
temperature 0.8324 — the path `corpus-reconciliation-2026-08-29/harness.py` runs, which is the EU
server's scoring path.

The browser runs a **different file on a different runtime**: the int8 per-channel model through
`onnxruntime-web`. §9 measures the difference and it is not negligible. Nothing in §1–§8 may be
quoted as a browser figure.

**Corpus** throughout: the 5,558-document long-form corpus of 28 August 2026 — 922 AI documents
across 13 models, 4,636 human documents. Its AI half is **not fully independent** of cycle-2
training: 268 of 922 appear in a training, test or calibration split (see the correction at the head
of [`DETECTION-BY-LENGTH-AND-MODEL.md`](DETECTION-BY-LENGTH-AND-MODEL.md)). That inflates detection
figures; its effect on the reliability findings below is unmeasured, and every one of them is a
statement about how *weak* the signal is, which contamination would tend to understate.

**Population**: 269,732 scorable sentences — 68,916 in the AI documents, 200,816 in the human ones.
A further 13,447 sentences were below the five-word floor and never scored.

---

## 1. The unit is far below anything this model was calibrated on

This project's central finding is that detection collapses with length: 16.9% at 100–199 words, and
the model reads at most 512 tokens per section. A sentence is roughly 20 words.

| | AI documents | human documents |
|---|---:|---:|
| median sentence length, WordPiece tokens | **25** | **30** |
| mean | 29.1 | 34.9 |
| **below the engine's own `MIN_SCORED_TOKENS` of 50** | **89.6%** | **83.8%** |

The last row is the one that should have settled the question on its own. `engine.ts` already refuses
to score anything under 50 tokens, because this project decided a fragment that short cannot carry a
printable probability. **Nine sentences in ten are below that floor.** A per-sentence percentage
would be printing exactly the number the engine was written to withhold.

---

## 2. How sentence scores are distributed

| percentile | sentences in AI documents | sentences in human documents |
|---|---:|---:|
| 1 | 0.173 | 0.032 |
| 25 | 0.330 | 0.213 |
| 50 | **0.452** | **0.294** |
| 75 | 0.646 | 0.394 |
| 95 | 0.893 | 0.607 |
| 99 | 0.968 | 0.771 |
| mean | 0.498 | 0.315 |

The two populations overlap heavily through the middle. The separation lives in the top few
percentiles, and nowhere else.

---

## 3. Separation: 0.764 against 0.9695

**AUROC of a single sentence separating AI-document sentences from human-document sentences:
0.7639** (balanced subsample, 60,000 against 60,000).

The same detector achieves **0.9695** on whole documents (`thresholds.json`,
`measured.corpus_test_auroc`). Taking the same model and handing it a sentence instead of a document
costs about **20 points of AUROC**.

What a cut at various points would select:

| cut | sentences from AI documents | sentences from human documents |
|---|---:|---:|
| 0.50 | 29,324/68,916 (42.6%) | 23,005/200,816 (11.5%) |
| 0.80 | 7,821/68,916 (11.3%) | 1,399/200,816 (0.7%) |
| 0.90 | 3,126/68,916 (4.5%) | 199/200,816 (0.1%) |
| **0.95** | **1,305/68,916 (1.89%)** | **24/200,816 (0.012%)** |
| 0.98 | 231/68,916 (0.3%) | 0/200,816 (0.0%) |

**The informative sentences are rare but strongly enriched.** That shape — useless in the middle,
sharp at the top — is what the display design follows.

---

## 4. Contradiction: what a number beside a sentence would say

| | |
|---|---|
| sentences inside AI documents scoring **below 0.5** | **39,592/68,916 (57.4%)** |
| AI documents containing **no** sentence at or above the document flag point | **877/922 (95.1%)** |
| human documents containing one | **0/4,636 (0.0%)** |

**The majority of a machine-written document looks human one sentence at a time.** A reader shown a
number on every sentence of a document the tool correctly called AI would see most of them read
"human" and reasonably conclude the tool was contradicting itself.

The second row is the one that shapes the interface. The document rule cannot simply be reused at
sentence scale: on 95.1% of AI documents it would find nothing at all.

---

## 5. The question that made the highlight worth building

A number cannot be printed. Can the *ordering* still point at the right passages?

**Construction.** A sentence's score does not depend on its neighbours — each is its own forward pass
— so mixed documents can be assembled from sentences already scored, with no new inference and no
possibility that the splice moved a score. For each trial: a human document, a contiguous 25% run of
its sentences replaced by AI sentences **of the same register**, so the result measures machine
against human writing rather than topic drift. 1,996 trials.

| | value | chance |
|---|---:|---:|
| precision@k, where k is the number of sentences actually inserted | **0.575** | 0.250 |
| the single highest-ranked sentence is one of the inserted ones | **1,557/1,996 (78.0%)** | 25% |
| within-document AUROC | **0.804** | 0.5 |

So the ranking works where the scale does not. **This is what licenses a highlight and nothing more:
the tool can say "this passage is stronger evidence than that one, in this draft", and cannot say
what any passage is.**

---

## 6. Per register — including the inversion scare, which was not one

During review it was reported that the signal might be **inverted** in journalism and fiction, from
figures of 0.43 and 0.46. **Those were precision@k against a 0.25 chance baseline, not AUROC against
0.5.** They are 1.7× chance, not below it. The figures below are the AUROCs, with n and 95% bootstrap
intervals, so the question is settled by the statistic it was asked about.

**Sentence level, within register** (AI-document sentences against human-document sentences):

| register | AUROC | 95% CI | n AI / human sentences |
|---|---:|---|---|
| white paper | 0.858 | 0.853–0.862 | 8,315 / 32,480 |
| academic literature review | 0.853 | 0.848–0.859 | 6,712 / 13,682 |
| company update | 0.852 | 0.847–0.858 | 5,403 / 28,823 |
| research summary | 0.834 | 0.827–0.841 | 5,507 / 7,637 |
| academic discussion | 0.802 | 0.797–0.809 | 7,315 / 20,415 |
| **long-form journalism** | **0.675** | 0.670–0.680 | 14,144 / 46,603 |
| **fiction** | **0.666** | 0.660–0.672 | 11,577 / 14,387 |

**Not inverted anywhere.** Every interval sits far above 0.5. But journalism and fiction are much
weaker than the rest, and the average hides the thing that matters:

**Within-document ranking, per register:**

| register | mean AUROC | trials where the ranking came out **below chance** | precision@k |
|---|---:|---:|---:|
| white paper | 0.873 | **0.0%** | 0.676 |
| company update | 0.859 | 0.95% | 0.660 |
| academic literature review | 0.852 | 1.83% | 0.661 |
| research summary | 0.833 | 1.38% | 0.624 |
| academic discussion | 0.800 | 1.84% | 0.574 |
| **long-form journalism** | **0.703** | **9.21%** | 0.424 |
| **fiction** | **0.680** | **14.96%** | 0.408 |

> **The finding the averages hide: on roughly one fiction draft in seven and one journalism draft in
> eleven, a purely relative highlight would rank the passages worse than chance** — pointing
> confidently at the wrong lines, with no number for the reader to argue with.

A mean of 0.70 built from drafts like that is not a licence to paint. **The tool cannot detect
register**, so it cannot know when it is in one of those drafts. This is what forced the design in
§8.

### Section level is sound, and is a different question

For contrast, the same cut at **section** level — the unit the verdict actually uses:

| register | AUROC | 95% CI |
|---|---:|---|
| company update | 0.998 | 0.997–1.000 |
| white paper | 0.997 | 0.995–0.998 |
| research summary | 0.995 | 0.991–0.998 |
| long-form journalism | 0.991 | 0.987–0.994 |
| academic literature review | 0.989 | 0.983–0.994 |
| academic discussion | 0.986 | 0.978–0.993 |
| fiction | 0.944 | 0.934–0.954 |

**Nothing is inverted or weak at section level.** The section deep-dive is standing on measured
ground; the sentence layer is not, and the two must not be presented as equally solid.

---

## 7. Stability under trivial rewording

See §12 for the harness. Edits are mechanical and meaning-preserving: contraction expansion, British
and American spelling, connective substitution (`However,` → `But`), serial-comma removal, quote
normalisation.

600 documents sampled (596 usable), up to 40 sentences each, on the fp32 runtime.

**Per edit, applied alone** — absolute change in the sentence's probability:

| edit | sentences affected | median | p90 | p99 | max | moved > 0.10 | moved > 0.25 |
|---|---:|---:|---:|---:|---:|---:|---:|
| quotes (curly → straight) | 2,668 | 0.010 | 0.034 | 0.081 | 0.186 | 0.6% | 0.0% |
| connectives (`However,` → `But`) | 521 | 0.012 | 0.053 | 0.097 | 0.138 | 1.0% | 0.0% |
| contractions (`don't` → `do not`) | 305 | 0.014 | 0.043 | 0.098 | 0.162 | 1.0% | 0.0% |
| spelling (British ↔ American) | 673 | 0.023 | 0.079 | 0.177 | **0.475** | 6.2% | 0.3% |
| serial comma | 3,167 | 0.024 | 0.077 | 0.140 | 0.307 | 4.9% | 0.1% |

**All five applied at once**, comparing the document's sentence ranking before and after:

| | value |
|---|---|
| the top-ranked sentence is still the top-ranked sentence | **556/596 (93.3%)** |
| overlap of the top fifth of the ranking | **0.945** |
| median of each document's largest single sentence movement | 0.066 |
| p90 | 0.134 |

**Two conclusions, and they point in opposite directions.**

**The ranking is stable.** Rewriting a draft's punctuation and spelling throughout leaves the
strongest passage unchanged 93.3% of the time and the top fifth 94.5% intact. A *relative* display
survives trivial rewording, which is a second, independent reason to prefer one.

**The individual score is not.** Removing a serial comma moves a sentence's probability by 0.024 at
the median, and changing `organise` to `organize` moved one sentence by **0.475** — from one end of
the scale to nearly the other, for a spelling. A printed percentage would visibly change when a
writer fixed a comma, and would deserve every complaint it got.

**And this compounds the fragility in §9.** A median trivial-edit movement of about 0.02 sits against
a floor whose marked count moves 27% per 0.01. **A writer correcting punctuation can move passages
across the marking floor without changing a word of substance.** The interface must therefore never
imply the marked set is exact or exhaustive, and re-running a check after light editing may
legitimately produce a different set of marks. That is a property of the instrument, not a fault in
the run — but it is a reason the layer marks *passages to look at* and never *sentences that are AI*.


---

## 8. What is displayed, and why it is not what was asked for

The brief asked for a score on every sentence and a red-to-green gradient across the draft. The
measurement does not support either. What ships instead:

1. **No number beside any sentence, ever.** `rankSentences` consumes the probability and returns a
   rank and a tier. The value is not in scope anywhere downstream, so a percentage cannot be rendered
   even by mistake.
2. **An absolute evidence floor before any ranking.** A passage is eligible to be marked only if its
   own score clears a measured floor. This is the answer to §6: a purely relative layer always paints
   something, so on the one-in-seven fiction draft it would paint confidently and wrongly. With a
   floor, **the failure mode becomes "no highlight" rather than "wrong highlight"**, without the tool
   needing to know its register.
3. **Relative tiers among whatever clears it** — "strongest match in this draft" — never an absolute
   claim.
4. **A stated absence.** A draft where nothing qualifies gets an explicit explanation, not an empty
   panel. This matters more than it sounds: 95.1% of AI documents contain no sentence above the
   document flag point, so *a confident AI verdict above an unmarked draft below is the common case,
   not an edge case*, and left unexplained it reads as the tool retracting itself.

**What the floor costs, at 0.95 on the server runtime.** Share of documents containing at least one
qualifying sentence:

| register | AI documents | human documents |
|---|---:|---:|
| white paper | 64.1% | 0.24% |
| academic literature review | 57.9% | 0.44% |
| company update | 57.6% | 0.91% |
| research summary | 51.3% | 1.06% |
| academic discussion | 48.7% | 0.24% |
| academic essay | 40.2% | — |
| **long-form journalism** | **16.1%** | 0.36% |
| **fiction** | **9.6%** | 0.38% |
| academic conclusion | — | 1.11% |
| student essay | — | 0.00% |

The layer goes quiet by itself exactly where §6 says it is unreliable — 9.6% and 16.1% on the two
weak registers — while marking nothing in roughly 99% of human documents of any register. That is the
property that makes it shippable without register detection.

**Individual sentences at that floor: 1,305/68,916 AI against 24/200,816 human — 158× enrichment.**

---

## 9. The floor is a per-runtime quantity. One value cannot serve both routes

The figures above are fp32. The browser runs int8 through `onnxruntime-web`. `thresholds.json`
already records that the two runtimes differ enough that the **document** flag point is fitted
separately for each. The same is true one layer down, and it was measured rather than assumed.

> **Provenance correction, 30 August 2026.** The first version of this section was measured through
> a session labelled "WebGPU" by code that could not know it. `createSession` requested
> `["webgpu","wasm"]` — a preference order onnxruntime-web falls back inside — and labelled the result
> `"webgpu"` regardless, so the run may have executed on either provider. **Every figure below has
> been re-measured against the corrected `create()`, which requests one provider at a time, and each
> run is now attributed by construction.** The substance did not move; see "Did the attribution
> matter?" below.

**Method.** 850 sentences re-scored on the browser runtime, paired with their fp32 scores, stratified
across the fp32 bands: 300 from ≥0.95, 200 from 0.90–0.95, 150 from 0.80–0.90, 200 from below 0.80.
Reweighting the sample by each band's true corpus population reproduces the known fp32 total exactly
— **1,329 against 1,329** — which is the check that licenses the rest. Both browser providers were
measured on the same 850 sentences, each in a session whose provider was verified before scoring.

| | value |
|---|---|
| median absolute difference, all 850 | 0.0091 |
| median absolute difference, fp32 band 0.90–0.95 | 0.0105 |
| median absolute difference, fp32 band 0.95–1.00 | 0.0038 |
| largest single difference | 0.1994 |
| **sentences at or above 0.95 on fp32 that fall below it in the browser** | **58/300 (19.3%)** |
| sentences crossing the other way | 7 |
| agreement on the 0.95 decision | 785/850 |

**The runtimes agree closely on the value and disagree often on the decision**, because so much of
the score mass sits just above the floor. At a nominal 0.95 the browser marks about 1,140 sentences
against fp32's 1,329 — **14% fewer**.

### Did the attribution matter? No, and that is worth stating

Both browser providers were measured on the same 850 sentences, each attributed by construction:

| | fp32 (server) | WASM | WebGPU |
|---|---:|---:|---:|
| marked at a nominal 0.95 | 1,329 | 1,136 | 1,142 |
| of the 300 above 0.95 on fp32, number falling below it | — | 57 | 58 |
| median absolute difference from fp32 | — | 0.0093 | 0.0091 |
| **floor reproducing the fp32 marked count** | — | **0.945** | **0.944** |

The two browser providers agree with each other far more closely than either agrees with fp32:
median absolute difference **0.0023**, and they disagree on the 0.95 decision on **16 of 850**
sentences. So the 19.3% crossing rate is a **model-file difference (fp32 against int8), not an
execution-provider difference**, and the original finding stands whichever provider actually ran.

That is a good outcome and not a reason to relax: the label was still unknowable, and the next figure
keyed on it might not have been robust. The fix was to make the label true, not to discover that this
particular number tolerated it.

**The WASM floor was also confirmed on the bundle a WebGPU-less browser actually downloads.** The
engine loads a WASM-only build (`ort-wasm-simd-threaded.wasm`) when `navigator.gpu` is absent, which
is a different binary from the JSEP build's WASM provider. Measured on the same 850 sentences it is
**identical** — floor 0.945, 1,136 marked, 57 crossing — so the two WASM paths need not be
distinguished.

### Is 0.944 stable, or an artefact of where the mass sits?

It is **fragile**, and this is the most important caveat in the file. Percentage change in the number
of marked passages per 0.01 of floor:

| floor | change in marked passages per 0.01 |
|---|---:|
| 0.944 | **25.3%** |
| 0.95 | **27.3%** |
| 0.97 | 64.3% |
| 0.98 | 128.7% |

A hundredth of a point moves the marked count by a quarter near the operating floor, and more than
doubles or halves it at 0.98. **That fragility is the same fact as the 19.3% crossing rate**: the
score distribution piles up immediately above the floor, so any small shift — a runtime, a
recalibration, a retrain — moves a large number of passages across it. Consequences:

- the floor must be **re-fitted on every runtime**, and **re-measured on every recalibration**;
- it must never be transplanted between routes;
- the layer's coverage is inherently approximate, and the interface must never imply that the set of
  marked passages is exhaustive or exact.

### Route status

| route | runtime | floor | status |
|---|---|---|---|
| EU server | fp32 `onnxruntime`, CPU | **0.95** | **fitted** — whole corpus, 269,732 sentences |
| in-browser | int8 `onnxruntime-web`, **WebGPU** | 0.944 | **provisional** — quantile-matched on 850 paired sentences |
| in-browser | int8 `onnxruntime-web`, **WASM** | 0.945 | **provisional** — same, and confirmed identical on the WASM-only bundle |

Both browser floors are now *measured*; neither is *fitted*. The distinction is the whole of §9's
remaining work and is not a formality: a quantile match on 850 stratified sentences reproduces the
marked COUNT, and says nothing reliable about the human false-mark RATE, which is the number that
decides whether the layer is safe. See the two outstanding items below.

**Two things are missing before the browser route can paint this layer**, and neither may be
estimated:

1. ~~**A WASM floor.**~~ **Done, 30 August 2026: 0.945.** The blocker was that the development
   server never pre-bundled `onnxruntime-web`, so its optimised dep URL 404'd — not WASM-specific,
   and it hid the whole provider. Fixed at source by naming both subpaths in `optimizeDeps.include`
   in `astro.config.mjs`, rather than worked around. The floor is measured on both the JSEP build's
   WASM provider and the WASM-only bundle, identically. It remains PROVISIONAL for the same reason
   the WebGPU one does: item 2.
2. **A browser human false-mark rate, measured rather than estimated.** The stratified sample
   reproduces 9 of the 24 human sentences known to clear the fp32 floor, because only 24 exist in
   200,816 and a stratified sample cannot resolve a rate that rare. **9 is not an estimate of 24 and
   must not be reported as one.** A dedicated run over the human half is required: roughly 200,000
   sentences at the **41.8 ms per sentence** now measured for WASM in §10 — about **2 hours 20
   minutes** of browser time on data already held, no spend. (The earlier estimate of four and a half
   hours used the unattributed timing; WASM is the sensible provider for a bulk run and is the faster
   of the two at this workload.)

**The published browser accuracy figures are unaffected — confirmed, not assumed.** 889/922 and
90/4,636 were measured under headless Node on the WASM provider, and `thresholds.json`'s
`execution_provider_note` records that all 5,558 documents were separately re-scored through WebGPU
in a real browser (889→885 AI, 90→92 human, neither movement distinguishable from nothing, McNemar
exact p = 0.125 and p = 0.774). Both were attributed by their own harness and neither passed through
`createSession`, so the mislabelling did not reach them.

### Which route it will actually run on — corrected

An earlier draft of this file recommended shipping on the server route alone, because that is the one
route with a fitted floor. **That recommendation was wrong and is superseded.** It was made without
checking whether the server route can carry per-sentence scoring at all. It cannot.

**There is no server-side sentence-scoring path, and the endpoint's shape forbids one.** `/v1/check`
scores a document by sections. Its per-request ceiling is set by `MAX_WORDS = 4000`, which
`reference-server/app.py` documents as capping *a single request at 12 inferences*. The 1,339-word
fixture in §10 is **64 scorable sentences** — more than five times that ceiling for a document
one-third of the maximum length. Per-sentence scoring is not a heavier version of an existing request;
it is a request shape the API does not have.

Behind that sits the cost envelope the ceiling exists to protect: a global daily cap denominated in
**inferences rather than requests**, precisely because a request stopped being a fixed unit of cost
(`app.py`, design rule 3), with a £50 envelope and a kill switch that has genuinely fired. Per-sentence
scoring is roughly **65× the inference volume** of the document check. Building a server path for it
is an owner-level product and cost decision, not one for this workstream.

**So the layer belongs on the in-browser route**, where the work runs on the visitor's own machine,
costs nothing, and has no per-request ceiling — measured at 5.1 s for a 1,339-word document, §10.

That is precisely the route whose floor is **not fitted**. Hence the position below.

**Net position: the layer is complete, tested, and blocked on one measurement — a fitted browser
floor.** It is not a choice between two routes. The server route cannot run it, and the browser route
that can is not yet calibrated to. The shipped data file marks the browser floors `PROVISIONAL` and
`NOT FITTED`, and `floorForRuntime` returns `undefined` rather than falling back, so a route cannot
silently borrow another route's number. A missing floor disables the layer; it does not degrade to the
server value.

### The gate must key on the provider that executed, not the one requested

A per-runtime floor is only as good as the runtime it is matched against, and the obvious way to
match is wrong. `onnxruntime-web` takes an **ordered preference list**, not a selection: given
`["webgpu","wasm"]` it uses WebGPU where available and WASM where not, silently. The engine requested
exactly that list and then labelled every resulting session `"webgpu"`, so a session that had run on
WASM reported WebGPU and nothing downstream could tell. A combined label such as `"webgpu+wasm"` has
the same defect — it names what was *asked for*.

Harmless while the label was only printed. Not harmless once a measured floor is keyed on it: the
visitor would get underlines calibrated for a runtime that did not run, with nothing on screen saying
so, and the difference is 19.3% of marked passages.

Fixed by asking for **one provider at a time**. With no fallback in the list there is nothing for the
runtime to substitute: if WebGPU cannot initialise, creation fails and WASM is requested explicitly.
The reported provider is then true by construction rather than by assumption — the previous shape
could not have been made correct by relabelling it. `engine.ts` also exposes `tier3Provider`
separately from the combined display label, because Tier 3 is the model that scores sentences.

`sentenceRuntimeKey` then matches on **exact equality** and returns nothing for any value it cannot
resolve — an empty string, a combined label, an unrecognised or future provider. An undeterminable
provider **disables the layer**, exactly like a missing floor. A silent wrong-runtime paint is worse
than no paint, and there is no third option worth having. Both properties are pinned by tests,
including a source-level assertion that no `executionProviders` list ever names more than one
provider; all three fail if the defects are reintroduced, which was verified rather than assumed.

### The same draft can legitimately mark differently on different machines

A consequence of per-runtime floors that will look like a bug to anyone who has not read this file,
so it is written down here as well as in the interface copy.

The floors differ by runtime (0.95 fp32, 0.944 WebGPU, 0.945 WASM) and the marked count moves 25–27%
per 0.01 of floor. **The same visitor, pasting the same draft, can get a different set of marks on a
different machine** — or on the same machine in a different browser — because a machine with working
WebGPU and one without run different providers. Measured, the two browser providers disagree on the
marking decision for 16 sentences in 850.

This is correct behaviour, not drift: each set of marks is drawn at a bar measured for the runtime
that drew it, which is the entire point of keying on the executed provider. But it is
counter-intuitive, and an interface that does not say so invites a reasonable person to conclude one
of the two runs was wrong. **The legend must name the runtime its marks were calibrated for**, on
every run, from the first release — not only when something looks unusual.

**And the absence must be stated to the reader, not silent.** A visitor who switches to the
in-browser model and simply loses the underlines will read that as the tool breaking. The interface
must say that the marks are calibrated for the EU route, are not yet calibrated for the in-browser
model, and that no marks does not mean nothing was found.

---

## 10. Cost, on both routes

> **Superseded, 30 August 2026.** The first browser figures here (79.6 ms/sentence, 2.05× the
> document check) were taken through the mislabelled session described in §9 and **cannot be
> attributed to a provider**. They sat between the two true values and matched neither. Replaced
> below by one clean measurement per provider, one provider per page load, each attributed by
> construction.

**Browser route**, Chrome on the fixture (`tests/fixtures/perf-document.json`, an owner-generated AI
document of exactly **1,339 words**, 70 sentences of which 64 scorable, 5 sections), 16 cores, not
cross-origin isolated, `numThreads = 1`. Median of warm runs, one provider per page load:

| | **WASM** | **WebGPU** |
|---|---:|---:|
| model ready, cold | ~200 ms | ~1,500 ms |
| document check (the verdict) | 2,660 ms | 2,584 ms |
| **sentence pass** | **2,675 ms** | **4,579 ms** |
| per sentence | **41.8 ms** | **71.5 ms** |
| **multiple of the document check** | **1.01×** | **1.77×** |

**WASM is roughly 1.7× faster than WebGPU at this workload, and that is not a mistake.** A sentence
is ~25 tokens; the per-dispatch overhead of a GPU submission dominates a tensor that small, while the
document check's 512-token sections are large enough for WebGPU to break even. The layer's unit of
work is precisely the size at which the GPU stops paying for itself.

**The practical figure is therefore better than first reported.** On WASM the sentence pass costs
about the same as the document check — roughly **doubling** the wait, about 2.7 s to about 5.3 s, not
tripling it. On WebGPU it is about 1.8×.

It does not lock the tab: the pass yields between forward passes, and the yield uses a timer
alongside `requestAnimationFrame` because rAF never fires in a hidden tab and a run started in a
background tab must still finish.

**A measurement note that cost a figure.** One warm run recorded 37,913 ms against ~2,680 ms for its
neighbours: the tab had been backgrounded and throttled. That is the same hidden-tab hazard the rAF
fallback exists for, arriving as a timing artefact instead of a hang. Timings here are medians with
any run above 3× the median discarded, and the discard count is reported — a mean over that run would
have published 225 ms/sentence.

**The mechanism matters for anyone tempted to optimise this.** A sentence is ~25 tokens against a
section's 512, yet 64 sentence passes cost **twice** what 5 section passes cost. Per-call overhead
dominates, not sequence length. Batching would help and the browser engine does not batch — it runs
one sequence at a time, `[1, inputIds.length]`.

**Server route**, Python `onnxruntime`, fp32, CPU, 8 threads, with length-bucketed dynamic padding:
**83 sentences/second**, against roughly 30 section-passes/second. The whole 269,732-sentence corpus
scored in 39 minutes. Dynamic padding is what makes this affordable — padding every sentence to 512
tokens is **5.5× slower** (11 against 60 sentences/second on an unbucketed batch) and, verified
before the run, numerically identical to 6e-08.

**Verdict on cost.** Affordable on the server route. On the browser route it is affordable *in
principle* — 5 s of yielded work, tab responsive — but it triples the wait, and it is moot until §9's
floors exist.

---

## 10b. Three findings that were not about this layer

Each of these was found by looking one file, or one explanation, past the fix in front of it. They
are recorded here because they are findings in their own right, not footnotes to the feature that
exposed them.

### A visitor-facing inaccuracy, live and shipped

The result panel tells a visitor which runtime scored their text:

> `Scored in this browser via ${…provider…}.` — `local-signals-ui.ts`

It reads the same label as the gate. `createSession` requested `["webgpu","wasm"]` — a preference
order onnxruntime-web falls back inside — and applied the name `"webgpu"` regardless. **So every
visitor whose browser fell back to WASM was told they had run on WebGPU.**

This predates the evidence layer entirely and has nothing to do with it. It was shipped, it was
user-facing, and it was wrong for exactly the visitors least likely to have WebGPU — older machines
and locked-down browsers. It is repaired by the same one-provider-at-a-time change, at source, with
no edit to that file. It was found only because the gate needed the provider to be true and somebody
asked what *else* read that string.

### The floor surviving its own bad provenance was luck, not vindication

The 19.3% crossing rate was measured through the mislabelled session and could not be attributed. It
turned out to be robust — the gap is a model-file difference, so the number holds whichever provider
ran. **That is luck, not vindication.** The label was unknowable at the time it was published, and
the next figure keyed on it might not have tolerated the same ambiguity. The correct response to a
number that survived an unreliable label is to fix the label, not to conclude the label was
acceptable.

### A throttled tab is a new variant of an old trap

This project has twice lost hours to `requestAnimationFrame` never firing in a hidden tab, and the
engine carries a timer fallback because of it. The same hazard appeared here wearing different
clothes: a backgrounded tab is *throttled*, so one warm timing run recorded **37,913 ms against
~2,680 ms** for its neighbours. Nothing hung and nothing errored — the run completed and returned a
number.

A mean over that run would have published **225 ms/sentence** instead of 41.8, and it would have
looked plausible. The rule that follows: **timings are medians, any run above 3× the median is
discarded, and the discard count is reported.** A hang announces itself; a throttle just makes the
instrument read high.

---

## 11. What was rejected, and why

- **A percentage beside each sentence.** §1–§4. It would print the number `engine.ts` already
  withholds, on a unit where 57.4% of a correct AI document reads human.
- **Reusing the document flag point at sentence scale.** §4: it finds nothing on 95.1% of AI
  documents.
- **A purely relative gradient with no floor.** §6: below chance on 14.96% of fiction drafts and
  9.21% of journalism drafts, in a tool that cannot detect register.
- **A red-to-green wash across the whole draft.** §3: the informative sentences are 1.89% of an AI
  document. Painting everything makes the uninformative 98% look like findings.
- **One floor for both routes.** §9: 19.3% crossing rate.
- **Any figure from a stratified sample standing as a rate.** §9.

---

## 11b. Known limitation of the splitter, found while rendering

A heading or list item carries no terminal punctuation, so the splitter runs it into the sentence
that follows: `### Methodologies Across the Benchmarks` and the paragraph beneath it become one
"sentence". On markdown-ish input this produces marked spans much longer than a sentence, which is
visible in `docs/assets/screenshots/sentence-evidence-marked.png`.

**It has not been fixed, deliberately.** Every figure in this file was measured through the splitter
as it stands, and changing the boundaries after measuring would mean the shipped splitter is not the
one the measurement describes — the drift this project has been bitten by before. The fix (treat a
line break as a boundary when the line has no terminal punctuation) is straightforward, but it
requires re-running §1–§9 afterwards, because it changes what a sentence is.

Impact on the figures here is small: the corpus is continuous prose and the AI half's markdown is
confined to a minority of documents. Impact on a *user* pasting markdown is not small, and the layer
should not ship for that input until the splitter is fixed and re-measured.

---

## 12. Reproduction

```
research/sentence-reliability/sentences.py        the splitter (reference implementation)
research/sentence-reliability/score_sentences.py  score every scorable sentence   (~39 min, 8 threads)
research/sentence-reliability/analyse.py          distribution, separation, contradiction
research/sentence-reliability/localise.py         the splice experiment
research/sentence-reliability/by_register.py      per-register AUROC, sentence and section, with CIs
research/sentence-reliability/stability.py        rewording stability
research/sentence-reliability/build_evidence.py   emits the shipped per-runtime floors
research/browser-perf/                            the browser-route harness and why it is not a page
```

The TypeScript splitter is asserted line-for-line against the Python reference by
`tests/unit/sentences.spec.ts` in the website repository, over 34 golden cases and 210 sentences. A
highlight is drawn from those offsets; if the two ports disagree by one character the highlight
paints the wrong words, silently.
