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

## Recommendation (decision needed before Phase 1 closes)

Two options, neither executed here (both would touch shipped site code,
outside this phase's local/reversible remit):

1. Patch `adjacentCohesion` (or add a features-v1-specific variant) to
   pre-split on `\n` exactly as `features.py::_sentences` does, then
   re-verify against these two fixtures plus a wider generated set.
2. Confirm/measure how often hard mid-sentence line-wraps actually occur in
   real submitted text (server logs are zero-body per the safety drills, so
   this would need a synthetic/corpus-based estimate, not live logs) and
   decide the residual risk is acceptable to ship as-is, documented as a
   known limitation.

## Files in this artefact set

- `fixtures/cohesion-01-paragraph-breaks.txt`, `fixtures/cohesion-02-hard-linewrap.txt` — input fixtures.
- `fixtures/cohesion-golden.json` — Python-generated golden values (`dis_adjacent_sent_cohesion`, sentence lists) via `features.extract()`/`features._sentences()`.
- `verify-adjacent-cohesion.js` — verbatim copy of the shipped TS `adjacentCohesion` logic (stopwords, regexes, arithmetic byte-checked against `document-tells.ts` lines 393–453), used to reproduce the TS-side sentence lists for the diff above.
- `PHASE1-PARITY-NOTE-2026-09-01.md` — this note.

## Not yet done

- The features-v1 contract module (ordering/normalisation reading
  `train.py` + `features.jsonl`) — deliberately not written yet: defining a
  contract around a feature with an open, measured divergence would be
  exactly the "improvise past a failing gate" the task rules prohibit.
- Golden fixtures for the other 6 features (wpp_cv, sec_within15, pps_var,
  body_mode_share, spp_cv, has_structure) — untouched this phase; scope was
  the two features the report flagged as unported.
- Wiring anything into a server or browser route.
