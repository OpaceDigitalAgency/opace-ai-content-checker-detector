# The text the model never saw: a bug that hid inside a passing test

**Draft for publication. Written 30 August 2026. No measurement was run to produce it; every
figure is quoted from a measurement record named at the point of use.**

Proposed URL: `/tools/ai/content-verification-integrity/research/the-segmentation-bug/`

---

## The finding

For months the tool cut documents into sections every 340 words, on the stated premise that 340
words sits comfortably inside the classifier's 512-token window. On dense prose it does not. **1,348
of 23,318 sections (5.78%) ran over the window and had their ends silently thrown away**, across
**684 of 5,558 documents (12.31%)** and **276,466 of 9,287,413 tokens (2.98%)**. The worst single
section needed 3,406 tokens and lost 2,894 of them.

The defect survived because the test built to catch drift between the two implementations compared
what each of them produced, and both produced the same truncation. The routes agreed. They agreed
about the wrong text.

Recovering the lost text then changed no verdict at all on this corpus. That result is published
here because it is true, not because it flatters the fix.

---

## Provenance

| | |
|---|---|
| Corpus | 5,558 documents: 922 AI across 13 models, 4,636 human from Europe PMC, GOV.UK, CRS, Global Voices, Mongabay, SEC EDGAR and PERSUADE 2.0 |
| Tokeniser | the checkpoint's own WordPiece tokeniser, run **without truncation**, so the count is what a section would have needed rather than what it was allowed |
| Scoring runtime | fp32 reference pipeline, Python `onnxruntime` 1.29.0, the container's pinned version. 23,318 forward passes under the old rule, 21,093 under the new one |
| Browser check | int8 `onnxruntime-web`, WASM, on a deterministic register-stratified 596-document subset (296 AI, 300 human) |
| Measured | 29 August 2026 |
| Source | `docs/measurements/SEGMENT-TOKEN-FIX.md` |

The shipped segmentation contract is now `segments-v3`. It produces the identical 21,093 sections
as the `segments-v2` rule described in the source record, so every coverage quantity below is true
of the shipped product; only the contract string moved on.

---

## What the rule assumed

Words are not tokens. WordPiece splits unfamiliar, technical and hyphenated words into several
pieces, so a 340-word passage of biomedical or policy prose can need far more than 340 tokens. The
proxy fails on exactly the dense writing the tool is weakest on anyway.

Measured across the corpus, tokens per word run at a median of 1.27, a 95th percentile of 1.62 and
a maximum of 3.89. The section token distribution tells the same story from the other end: median
419, 75th percentile 448, 90th 483, **95th 523**. The 95th percentile already sat over the window.
That is not a tail risk. Roughly one section in twenty was being cut short.

It concentrated where you would expect. On the AI side, academic literature reviews lost 80 of 597
sections (13.40%) across 28 of 107 documents, and white papers 83 of 634 (13.09%). On the human
side, fiction lost 122 of 1,031 sections (11.83%) across 65 of 260 documents, and white papers 327
of 3,363 (9.72%). Student essays lost nothing at all: 0 of 1,011.

## Why it hid

The tool has two implementations of segmentation, one in TypeScript for the browser and one in
Python for the server, and a route-parity test exists precisely to catch them drifting apart. That
test saw **0 of 284** token mismatches.

Both routes truncated identically. A test that asks "do these two agree" cannot see a fault they
share.

There was a second signal, and it was misread. The server's `truncated` flag carried a comment
saying that a true value means the two routes have drifted apart. The flag was firing constantly,
and never for that reason. A flag that fires all the time stops being read, which is how a
loud warning becomes a silent one.

## What replaced it

A token-exact split at word granularity, with the exactness verified rather than assumed. Two facts
make it exact: whole-document tokenisation decomposes precisely across `/\S+/` boundaries, checked
token for token on all 5,558 corpus documents and on the eight golden texts (5,558 of 5,558); and a
WordPiece token never consumes fewer than one code unit, which bounds the one case word granularity
cannot handle.

Each word is one atom, tokenised and measured. A document whose measured tokens plus the two
special tokens fit in 512 is one section, verbatim. Otherwise it is cut into the fewest sections
that all fit, as near equal in tokens as word boundaries allow, using integer arithmetic only so no
rounding rule can drift between the two languages. Every resulting section is then re-tokenised and
measured, and the split widens by one part if any section overshoots.

One word in 6,916,005 needed the oversized-word path: a 987-character run of punctuation that BERT
basic tokenisation splits into 987 tokens before WordPiece runs.

Three legs of proof, because one would not have been enough. By construction, the loop cannot
return a partition it has not tokenised and checked. By termination, widening cannot run away,
because at one atom per section every atom is inside the budget. By measurement, all 21,093
sections of the corpus were measured: **0 over 512**, maximum exactly 512, and the widening loop
never needed a second iteration.

## What the rewrite found on the way

Running the two implementations over the whole corpus and diffing every section's start offset, end
offset, word count and measured token count found **5,558 of 5,558 documents identical** across
21,093 sections. Getting there exposed three genuine cross-language divergences that had been
sitting in shipped code and that the eight golden test texts could not reach.

| divergence | effect | fix |
|---|---|---|
| Python's `\S` treats U+001C–U+001F and U+0085 as whitespace; JavaScript's does not, and JavaScript treats U+FEFF as whitespace where Python does not | word counts disagreed on **6 documents (0.11%)**, enough for the front end's drift guard to refuse the server's answer on them | `segments.py` now spells the class out as JavaScript's, because the browser is what ships |
| JavaScript's whole-string `toLowerCase()` applies the Greek final-sigma rule; the Rust tokeniser the checkpoint was trained with does not | a different token sequence, changing the segmentation of **1 document** | `tokenizer.ts` now lower-cases character by character |
| `tokenizer.ts` tested whitespace as `[\t\n\r \p{Zs}]`, missing U+2028, U+2029 and U+0085 | a spurious `[UNK]` in one GOV.UK document | `tokenizer.ts` now uses `\p{White_Space}` |

All eight golden token-id sequences still match after those two tokeniser changes: 8 of 8.

## The result nobody predicted

The obvious hypothesis is that recovering the dropped text raises scores on the documents that were
being truncated. That is not what happened.

On the 684 documents the old rule truncated, measured at the 0.980 threshold that shipped on the
server at the time:

| | old rule | new rule |
|---|---|---|
| AI (n = 126) flagged | 123 (97.62%) | 123 (97.62%) |
| human (n = 558) flagged | 2 (0.36%) | 2 (0.36%) |

Not one verdict on that subset changed, at either threshold measured. Of the 15 AI documents newly
flagged at 0.984, **none had a truncated section under the old rule**.

Maximum aggregation is why. A truncated section still contributed its first 512 tokens, and on a
document where any section reads as machine-written the maximum was already being set by some other
section. The lost text would have had to be the only machine-looking part of the document to change
anything, and on these 5,558 documents it never was.

The detection that did improve came from somewhere else: the new rule produces fewer, longer,
equal-sized sections where the old one produced a full 340-word run followed by short rebalanced
remainders, and detection is length-sensitive. Every newly flagged document has a lower section
count under the new rule. There is a symmetric cost, recorded rather than buried: 72 documents that
the old rule split needlessly are kept whole by the new one, **all 72 human**, and at 0.980 two of
them are now flagged that were not before.

So the fix removed a real, measured, unbounded coverage defect that could have cost detection on any
document where the dropped text was the only machine-looking part. On this corpus, that defect
happened not to be costing verdicts. That is luck rather than design. Nothing in the old rule
bounded how much text it threw away, and the worst case measured was 2,894 tokens from a single
section.

It also costs 9.4% fewer forward passes on the same documents, 21,093 against 23,318, so the
inference bill went down.

---

## What this does not prove

- **The coverage figures are threshold-free; the detection figures are not.** Every before-and-after
  detection number in the source record is at 0.980 or 0.984, both superseded by the shipped
  minimum-evidence pair `0.9855 / 0.9763`. The detection deltas are quoted above only with their
  own threshold named, and they must not be reprinted under a shipped-pair heading. The coverage
  quantities carry no operating point and publish as they stand.
- **The corpus is not fully held out.** Of the 922 AI documents, 268 (29.1%) appear in the cycle-2
  dataset and 168 of those in the training split; the human side is effectively clean at 11 of
  4,636. For a before-and-after comparison of two segmentation rules over the same documents this
  does not matter, because the same weights read the same text both times. It would matter for an
  absolute accuracy claim, and none is made here.
- **The browser check is a subset and it is register-balanced, not corpus-proportional.** Its 2.33%
  human false-positive rate is not comparable to any corpus-wide figure: fiction, the worst
  register, is 10% of it against 5.6% of the corpus. Read the deltas, not the levels. At
  denominators of 296 and 300, one document is 0.34 percentage points.
- **Earlier figures for the same phenomenon are superseded.** A 60-document route-parity sample
  reported 12.7% of sections and 21.7% of documents. The corpus here is 93 times larger and
  differently composed. Those figures should not appear beside these.
- **The Python halves of the measurement code are not reproducible from the repository.** They live in a
  session scratchpad. The TypeScript verification scripts are committed.
- **Register labels are machine-assigned**, so every per-register split inherits that.

---

## Charts this page needs

**1. Token coverage before and after — the chart already exists and is current.**
`docs/assets/charts/segmentation-token-coverage.svg`. All six plotted values carry denominators and
match the source exactly. Coverage is threshold-independent, so no operating point applies and the
chart correctly plots none.

- Plotted: sections over the 512-token window 5.78% (1,348 of 23,318) → 0% (0 of 21,093); documents
  with their ends silently dropped 12.31% (684 of 5,558) → 0% (0 of 5,558); tokens never seen
  2.98% (276,466 of 9,287,413) → 0%.
- **One edit is required before publication.** The chart title, its series label, its `<desc>` and
  the caption at `implementation/README.md:158` all say `segments-v2`, while the shipped contract is
  `segments-v3`. The v3 rule produces the identical 21,093 sections, so the quantities remain true
  of the shipped product and only the label is a generation behind. Relabel the four occurrences of
  `segments-v2`; leave the two `segments-v1` references alone, since they name the rule that was
  replaced.

**2. New: the section token distribution against the window.** A single horizontal box or percentile
strip with the 512-token window drawn as a vertical rule, so the reader sees the 95th percentile
sitting on the wrong side of it.

- min 135, p25 306, median 419, p75 448, p90 483, **p95 523**, p99 923, max 3,406.
- Caption: 23,318 sections of 5,558 documents under the 340-word rule, tokenised without truncation.
- Source: `SEGMENT-TOKEN-FIX.md` §2.

**3. Optional: where it concentrated.** Horizontal bars of sections over the window by side and
register, denominators on the bars, AI and human as separate series and never pooled.

- AI: academic-lit-review 80/597, white-paper 83/634, academic-essay 48/780, research-summary
  22/451, academic-discussion 30/621, story 17/662, company-update 7/402, longform-journalism 5/812.
- Human: story 122/1,031, white-paper 327/3,363, longform-journalism 300/3,771, company-update
  212/3,021, academic-introduction 32/1,449, research-summary 17/717, academic-lit-review 23/1,193,
  academic-conclusion 10/936, academic-discussion 13/1,867, student-essay 0/1,011.
- Source: `SEGMENT-TOKEN-FIX.md` §2.

---

## Rewrite liabilities (not body copy)

- The detection deltas in this story are at 0.980 and 0.984. If they are ever re-derived at the
  shipped pair, the "result nobody predicted" section should be re-cut on the new numbers rather
  than have the old ones relabelled.
- **cycle-4a** is measured and not shipped. It does not touch the coverage figures, which are
  model-independent, but it changes every detection figure on the site, including the two quoted
  here with their own thresholds.
- `docs/TEST-EVIDENCE.md` line 154 still records `/v1/health` reporting `segments-v1`, contradicting
  both `RELEASE-STATE.md` (v2) and `HANDOVER.md` (v3). That file is stale on this point and should
  be corrected before it is cited alongside this page.
