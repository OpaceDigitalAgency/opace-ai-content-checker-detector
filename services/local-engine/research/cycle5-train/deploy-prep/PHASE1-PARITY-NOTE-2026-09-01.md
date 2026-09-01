# Phase 1 parity note — cycle-5 structural features, TS ports

1 September 2026. Verification only, entirely local: no site checkout edited,
no production surface touched. Scope: the two cycle-5 features the
CYCLE5-REPORT (§7) flagged as unported — adjacent-sentence content-word
overlap (feature #5) and cadence rate (feature #6) — which turned out to have
already shipped as TS ports in the website workstream today (commits
`79eed745`, `9e12db0e`, `opace-website/astro-latest`). This note verifies
those ports rather than re-porting them, per the coordinator's correction.

## What was checked and how

- **Stopword list (adjacent-cohesion).** Extracted the 142-word Python
  `STOPWORDS` set (`signal-science/features.py:32`) and the TS
  `COHESION_STOPWORDS` set (`document-tells.ts:394`) programmatically and
  diffed them as sorted lists: **byte-identical, 142/142.**
- **Sentence-split regex and word regex.** `SENT_SPLIT`/`WORD_RE` in
  `features.py` and `COHESION_SENT_SPLIT`/`COHESION_WORD_RE` in
  `document-tells.ts`: **identical pattern source strings**, confirmed by
  direct comparison.
- **Jaccard/overlap arithmetic.** Both sides compute
  `|intersection| / |union|` per adjacent sentence pair (Python via
  `len(a & b) / len(a | b)`, TS via `shared / (a.size + b.size - shared)`,
  which is the same quantity by inclusion–exclusion) and average over pairs
  where both sides have at least one content word. **Identical.**
- **Cadence.** `cadence.ts` carries its own probe (`tests/unit/cadence.spec.ts`,
  13 assertions: role sequences on the owner's quoted passages, score floors,
  the humanised-article separation test, four deliberate-breakage mutation
  tests). Ran it: **13/13 passed** (`playwright test --project=unit
  tests/unit/cadence.spec.ts`, 588 ms). This is the port's own claimed
  correctness proof and it holds.

## Divergence found — adjacent-sentence cohesion, sentence segmentation

`features.py::_sentences` (line 145) splits the document by `\n` **first**,
strips each line, and only then applies `SENT_SPLIT` **within each line** —
so a line break, on its own, with no terminal punctuation before it, is
always a hard sentence boundary in the Python original.

`document-tells.ts::adjacentCohesion` (line 436) applies
`COHESION_SENT_SPLIT` directly to the **whole raw draft in one pass** — a
bare `\n` with no preceding `[.!?]` is not a boundary there, because the
regex requires a lookbehind on terminal punctuation.

These agree whenever paragraphs are separated by blank lines (double
`\n`, ordinary prose) and diverge whenever a single hard line-wrap sits
mid-sentence with no terminal punctuation before it — e.g. text pasted from
a source that hard-wraps at a column width, which is common in email/PDF
paste. `md-strip-v1` (`model-input.ts`) does not collapse such newlines; it
only strips markdown syntax, so this input reaches both the model and the
structural-feature code unchanged.

**Fixture proof** (`deploy-prep/fixtures/`, golden values generated from the
real `features.py`, checked against a verbatim extraction of the TS function
body in `verify-adjacent-cohesion.js`):

| fixture | Python sentences | TS sentences | divergence |
| --- | --- | --- | --- |
| `cohesion-01-paragraph-breaks.txt` (blank-line paragraphs) | 6 | 6, same text | **none** — matches |
| `cohesion-02-hard-linewrap.txt` (mid-sentence `\n`, no blank line) | 3 (line-wrap treated as a sentence boundary) | 2 (line-wrap ignored, correctly rejoins the sentence) | **diverges** |

Both fixtures happened to score `dis_adjacent_sent_cohesion = 0.0` regardless
(the test sentences share no content words), so the divergence is in
**sentence segmentation and pair count**, not visible in this particular
score, but it will move the feature value on real documents where segmentation
changes which words end up adjacent.

## Why this blocks the features-v1 contract as currently shippable

Feature #5 in `CYCLE5-REPORT.md` §1 is defined as "computed by importing the
measurement code itself, never re-derived." The TS port matches that
standard for ordinary paragraph-broken prose, but not for hard-line-wrapped
input, which the current input pipeline does not normalise away. Wiring this
function into the features-v1 contract now would mean the browser/server
routes compute a feature that is provably not always identical to what
`train.py` fed the model, on input `md-strip-v1` explicitly leaves untouched.

**This is not a fabricated concern — it is measured against the real
Python code and a verbatim copy of the shipped TS function**, per the
hard rule that no gate may be waved through.

## Resolution — 1 September 2026, owner-authorised

Decision taken: patch the TS port to match Python verbatim (option 1 below),
on the rationale that the model and the `COHESION_FLAG` bound were both
fitted on Python-computed features, so deployment-time extraction must
reproduce the training-time computation including this quirk.

**Change made** in `opace-website/astro-latest/src/lib/content-integrity/document-tells.ts`:
added `cohesionSentences()`, a verbatim port of `features.py::_sentences`
(split on bare `\n` first, strip each line, skip empty, then apply
`COHESION_SENT_SPLIT` within each line). `adjacentCohesion()` now calls
`cohesionSentences(draft)` instead of `draft.split(COHESION_SENT_SPLIT)`
directly. This is the one function both the features-v1 contract path and
the shipped under-repetition editorial tell will call — confirmed by
`grep`: `adjacentCohesion` has exactly one call site inside
`document-tells.ts` besides its own definition (the tell renderer at line
~676), so there is no second path to miss.

**Re-verification after the patch:**
- `fixtures/cohesion-01-paragraph-breaks.txt`: TS now produces the same 6
  sentences as Python (unchanged from before — this fixture already
  matched).
- `fixtures/cohesion-02-hard-linewrap.txt`: TS now produces the same 3
  sentences as Python, **matching where it previously diverged (2 vs 3)**.
- `fixtures/cohesion-03-numeric.txt` (new, added to exercise the non-zero
  numeric path): Python `dis_adjacent_sent_cohesion = 0.12222222222222223`,
  4 sentences; TS reproduces the identical value to full float precision
  and the identical 4 sentences.
- Site test suites re-run in full, both green: `tests/unit/document-tells.spec.ts`
  + `tests/unit/cadence.spec.ts` — **50/50 passed**; `tests/component/sentence-evidence-screens.spec.ts`
  + `tests/component/sentence-marks.spec.ts` — **14/14 passed**. No
  regression from the patch.

Site-side commit (local only, not pushed — batched with the Phase-5 site
deploy per the owner's instruction): `document-tells.ts` plus the three
fixture files, in the `opace-website/astro-latest` checkout.

Two options were on the table before the decision; recorded for the audit
trail:

## Remaining 6 features — built, and a second divergence found and fixed

Continuing per owner authorisation (build-and-verify pre-approved; stop only
for genuine unresolved divergence):

- **Feature 6, `paragraph_cadence_rate`** did not exist in `cadence.ts` at
  all — only `paragraph_cadence_max` (the editorial tell) did. Built
  `hasParagraphMarkup` + `paragraphCadenceRate` from the already-verified
  primitives (`splitCadenceParagraphs`, `splitCadenceSentences`,
  `analyseCadenceSentence`, `cadenceFrom`/`CADENCE_GATE`), mirroring
  `cadence.py::has_paragraph_markup` and the rate block in `compute()`
  exactly (NaN gates: markup required, n_words>=50, n_sents>=4). Verified on
  4 fixtures including a real AI article's full paragraph_cadence_rate
  matching Python to full float precision: `6.0606060606060606`.
- **Features 0/1, `wpp_cv`/`sec_within15`** did not exist either. Built
  `wordMetrics` from `measure_new_human.py::word_metrics`, reusing the
  already-verified `classifyBlocks` and `populationCv`. Matches Python
  exactly on two fixtures (`wpsCv`, `secWithin15`, `wppCv` all identical or
  within float noise — see below).
- **Feature 2, `pps_var`** (population variance of blocks-per-section, >= 4
  sections) built from the same section grouping, ported from
  `measure_fingerprint.py::fingerprint`. Matches Python exactly (0, `None`,
  0.25 across three fixtures).
- **Feature 7, `has_structure`** built directly from `classifyBlocks`,
  matching `struct_features.py`'s missingness rule exactly on all fixtures.

**Second divergence found (same bug class as the line-wrap fix), found and
fixed:** `sectionScaffold` — the editorial "composite scaffold" tell — gates
on `nonEmpty.length >= 4` because that is the TELL's OWN firing rule
(`fires: nonEmpty.length >= 4 && modeShare >= 0.8 && sppCv <= 0.35`). But the
raw model features `body_mode_share` (`measure_scaffold_v2.py::doc_metrics`,
gate `>= 3` sections) and `spp_cv` (gated independently on `>= 5` scored
paragraphs, with **no relation to section count**) use looser gates in
Python. Reusing `sectionScaffold` unmodified for the contract would have
silently returned `undefined` — not the value Python computes — for every
document with exactly 3 non-empty sections. Fixture-proved:
`scaffold-03-three-sections.txt` (3 sections, one paragraph each) scores
Python `body_mode_share = 1.0`; the old tell path gives `undefined`; the new
`scaffoldFeaturesRaw` gives `1`. Added `scaffoldFeaturesRaw` as the
model-feature-correct path, kept `sectionScaffold` unchanged for the
editorial tell (different gate is correct for that surface).

**Floating-point noise, measured and immaterial:** `wpp_cv` on
`scaffold-02-varied` differs between TS (`0.07547169811320754`) and Python
(`0.07547169811320756`) in the last 1-2 ULPs — summation-order noise, not a
logic difference (confirmed by an exact match on every other fixture and
every other feature). At a normalisation `sd` of 0.21, a 2e-14 absolute
difference moves the z-score by roughly 1e-13, far below any threshold
resolution. Not fixed, and shouldn't be — it is not a defect.

**All 10 fixtures' full 8-feature vectors**, generated directly from
`struct_features.py::extract` (the exact function `train.py` calls),
recorded in `fixtures/full-vector-golden.json` — the strongest available
check, since it is the real end-to-end training-time function, not a
per-component reimplementation of it.

## OPEN QUESTION — blocks the contract module, needs a decision

`struct_features.py`, `features.jsonl`, `train.py`, `prepare_data.py` and
`CYCLE5-REPORT.md` (all 284 lines, read in full) contain **zero mentions of
`md-strip-v1` or markdown stripping of any kind.** `prepare_data.py` reads
`r["text"]` verbatim from the upstream corpora with no stripping step
before `struct_features.py extract()` or the e5-small tokenizer sees it.

The shipped cycle-2 model, by contrast, has `md-strip-v1` in front of
**both** routes' tokenizer input specifically because raw markdown syntax
reaching the tokenizer was itself measured as AI evidence
(`model-input.ts`, INPUT-SURFACE-2026-08-31.md).

This means: if cycle-5's training corpus text retained markdown syntax
(headings, bullets) where the source document had it — plausible, since the
whole point of features 0-4 and 7 is to read structure from exactly that
syntax via `classify_blocks` — then cycle-5's text encoder and structural
features were **both trained on raw, un-stripped text**. Feeding md-strip-v1
output into either the tokenizer or `classifyBlocks`-based features at
inference time would not just move numbers slightly, it would remove the
very headings/bullets the structural features exist to detect, corrupting
features 0, 1, 2, 3, 4 and 7 on exactly the structured-document register
that is this cycle's headline finding (the 27.3% -> 0.2% GOV.UK-class FP
result, §4 of CYCLE5-REPORT.md).

**This has not been verified either way** — it needs someone to check
whether the corpora `prepare_data.py` draws from (`cycle4-fiction/dataset.jsonl`
and its embedded cycle 2/3 sources, the structured-human corpus, the
matched-generation pairs) carry markdown syntax in their `text` field, or
whether it was stripped upstream before those files were written. Until
that's answered, I do not know whether the features-v1 contract should run
`classifyBlocks` on the raw draft or on `md-strip-v1`'s output, and wiring
it either way without checking would be exactly the kind of unverified
assumption the hard rules prohibit. **Stopping here rather than guessing.**

## Files in this artefact set

- `fixtures/cohesion-01-paragraph-breaks.txt`, `-02-hard-linewrap.txt`, `-03-numeric.txt` — cohesion input fixtures; `cohesion-golden.json` — their Python golden values.
- `fixtures/cadence-01-multi-paragraph.txt` .. `-04-real-ai-article.txt` — cadence-rate input fixtures (the fourth is the real AI article from `signal-science/cadence/samples/9-ai-with-humanise-instructions.json`, the study's own probe fixture).
- `fixtures/scaffold-01-headed.txt`, `-02-varied.txt`, `-03-three-sections.txt` — shape-feature input fixtures (the third specifically exercises the 3-vs-4-section gate bug).
- `fixtures/full-vector-golden.json` — all 10 fixtures' complete 8-feature vectors, generated directly from `struct_features.py::extract()` (the real training-time function), for every feature at once.
- `verify-adjacent-cohesion.js`, `verify-adjacent-cohesion-v2.js` — verbatim copies of the TS `adjacentCohesion` logic before/after the line-wrap fix, used for the diff.
- `PHASE1-PARITY-NOTE-2026-09-01.md` — this note.
- Site-side (local commits, not pushed): `document-tells.ts` (`cohesionSentences`, `adjacentCohesionRaw`, `wordMetrics`, `hasStructure`, `scaffoldFeaturesRaw`), `cadence.ts` (`hasParagraphMarkup`, `paragraphCadenceRate`) in `opace-website/astro-latest`.

## Status: all 8 features have a verified TS path; contract module blocked

Every one of the 8 model features now has a TS implementation checked
against its real Python source on at least one fixture, most on 2-4,
including one complete cross-check of all 8 at once via
`struct_features.py::extract()`. Two genuine divergences were found and
fixed (line-wrap sentence segmentation; the 3-vs-4-section gate). One
open question — raw vs `md-strip-v1` input to the structural features —
is unresolved and blocks writing the `features-v1` contract module itself.
Nothing has been wired into a server or browser route.
