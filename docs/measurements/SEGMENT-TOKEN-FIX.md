# Segment truncation — measured, fixed, and proven (`segments-v1` → `segments-v2`)

Measured 29 August 2026. Follows `ROUTE-PARITY.md` §8b, which found the defect in passing
and correctly declined to fix it there.

**Headline: under the shipped 340-word rule, 1,348 of 23,318 segments (5.78%) in 684 of
5,558 documents (12.31%) exceeded the classifier's 512-token window and had their ends
silently thrown away — 276,466 tokens corpus-wide. Under the token-bounded rule that replaces
it, 0 of 21,093, and the two implementations agree on every segment of all 5,558 documents.
Detection rises 0.65 to 1.30 points at matched false-positive budgets and the document costs
9.4% fewer forward passes. At the shipped thresholds, which were not touched, detection rises
0.86pp and human false positives rise 0.17pp — the false-positive movement is stated plainly
in §6.1 and §6.3 rather than presented as a clean win.**

**One finding runs against the brief's expectation and is worth reading before the tables:
recovering the dropped text changed no verdict at all on this corpus (§6.4). The measurable
detection gain comes from v2 producing fewer, longer, equal-sized segments. The coverage
defect was real, unbounded and worth removing; on these 5,558 documents it simply was not the
thing costing detection.**

---

## 1. What was wrong

`segments.ts` cut a document every 340 words on the stated premise that 340 words "sits
comfortably inside 512 tokens for ordinary English". WordPiece splits unfamiliar, technical
and hyphenated words into several pieces, so the premise is a proxy, and the proxy fails on
exactly the dense prose the tool is weakest on anyway.

It survived detection because both routes truncate identically, so route-parity testing saw
0/284 token mismatches. `app.py`'s comment that a true `truncated` flag means "the two routes
have drifted apart" was therefore wrong twice over: the flag was firing constantly, and never
for that reason.

## 2. The measured distribution under `segments-v1`

Every segment of all 5,558 documents of the fresh long-form corpus
(`research/longform-corpus/`, 922 AI from 13 current models, 4,636 human from Europe PMC,
GOV.UK, CRS, Global Voices, Mongabay, SEC EDGAR and PERSUADE 2.0), tokenised with the
checkpoint's own tokeniser and **without truncation**, so the figure is what the segment
would have needed rather than what it was allowed.

| | |
|---|---|
| segments | 23,318 |
| segments over the 512-token window | **1,348 (5.78%)** |
| documents with at least one | **684 of 5,558 (12.31%)** |
| worst single segment | **3,406 tokens** — 2,894 dropped |
| tokens dropped per overflowing segment | median 76, mean 205, max 2,894 |
| tokens dropped corpus-wide | **276,466 of 9,287,413 (2.98%)** |

Segment token distribution (including `[CLS]`/`[SEP]`): min 135, p25 306, **median 419**,
p75 448, p90 483, p95 523, p99 923, max 3,406. The p95 already sits over the window.

Tokens per word, whole document: min 1.04, **median 1.27**, p95 1.62, max 3.89.

### Where it concentrated

| side | register | segments over 512 | documents affected |
|---|---|---|---|
| ai | academic-lit-review | 80/597 (13.40%) | 28/107 (26.17%) |
| ai | white-paper | 83/634 (13.09%) | 26/103 (25.24%) |
| ai | academic-essay | 48/780 (6.15%) | 25/132 (18.94%) |
| ai | research-summary | 22/451 (4.88%) | 14/117 (11.97%) |
| ai | academic-discussion | 30/621 (4.83%) | 14/113 (12.39%) |
| ai | story | 17/662 (2.57%) | 9/114 (7.89%) |
| ai | company-update | 7/402 (1.74%) | 6/99 (6.06%) |
| ai | longform-journalism | 5/812 (0.62%) | 4/137 (2.92%) |
| human | story | 122/1,031 (11.83%) | 65/260 (25.00%) |
| human | white-paper | 327/3,363 (9.72%) | 173/840 (20.60%) |
| human | longform-journalism | 300/3,771 (7.96%) | 176/840 (20.95%) |
| human | company-update | 212/3,021 (7.02%) | 73/662 (11.03%) |
| human | academic-introduction | 32/1,449 (2.21%) | 28/420 (6.67%) |
| human | academic-lit-review | 23/1,193 (1.93%) | 14/225 (6.22%) |
| human | research-summary | 17/717 (2.37%) | 11/189 (5.82%) |
| human | academic-conclusion | 10/936 (1.07%) | 6/360 (1.67%) |
| human | academic-discussion | 13/1,867 (0.70%) | 12/420 (2.86%) |
| human | student-essay | 0/1,011 (0.00%) | 0/420 (0.00%) |

The 60-document route-parity sample reported 12.7% of segments and 21.7% of documents. This
corpus is 93 times larger and differently composed, and gives 5.78% and 12.31%. Both are the
same phenomenon; this is the better denominator.

## 3. What was implemented

**A token-exact split at word granularity — the robust option, not the fallback.** Two facts
make it exact rather than approximate, and both were verified rather than assumed:

1. **Whole-document tokenisation decomposes exactly across `/\S+/` boundaries.** Checked
   token-for-token on all 5,558 corpus documents and on the eight golden texts: 5,558/5,558.
   So a segment's token count is the sum of its words' token counts, and cutting on word
   boundaries costs nothing in precision while keeping the character offsets that drive the
   highlighting.
2. **A WordPiece token never consumes fewer than one code unit.** That bounds the one case
   word granularity cannot handle (below).

The rule, in full:

- Words are matches of `/\S+/`, as before.
- Every word is tokenised and its count measured. Each word is one **atom**.
- A word whose own count exceeds the 510-token budget — BERT basic tokenisation splits
  punctuation out before WordPiece runs, so one 987-character `:;:;…` run in the corpus
  tokenises to 987 tokens — is sliced at 510 code units and each slice is forced into a
  segment of its own. That fired on **1 word in 6,916,005**.
- A document whose measured tokens plus `[CLS]`/`[SEP]` fit in 512 is **one segment, the
  input verbatim**.
- Otherwise the document is cut into the **fewest** segments that all fit, as near equal in
  tokens as word boundaries allow: start at `ceil(total / 510)` parts, place cut *j* at the
  first atom whose running total reaches *j/parts* of the document total (integer arithmetic
  only — `cum[at] * parts >= j * total` — so no rounding rule can drift between the two
  languages), clamp so a *parts*-way split always yields *parts* segments, then **measure
  every resulting segment** and widen by one part if any overshoots.

`MIN_TAIL_WORDS` is gone. v1 needed it because greedy left-to-right filling produced a runt
tail; an equal-token split cannot. The property the golden tests locked in — a short trailing
fragment is merged and the pair split evenly, never left long — is now a consequence of the
general rule rather than a special case. Measured over the corpus, the longest and shortest
segment of any one document differ by at most a couple of tokens.

Everything else is unchanged: segments contiguous and complete with no gaps or overlaps,
UTF-16 offsets matching JavaScript string indices, the verdict the **maximum** segment score,
and the middle-then-end-then-opening scoring order.

## 4. Proof that no segment can exceed 512 tokens

Three independent legs, because one would not be enough.

1. **By construction.** The loop does not return a partition until it has tokenised every
   candidate segment's actual text and confirmed each is at or under 512 including the two
   special tokens. It cannot return an unchecked split.
2. **By termination.** Widening cannot run away: at `parts == atomCount` the clamp pins one
   atom per segment, and every atom is at or under the budget — ordinary words by
   measurement, oversized words by the code-unit slice, which is bounded because a token
   never consumes fewer than one code unit.
3. **By measurement.** All 21,093 segments of the 5,558-document corpus, measured:
   **0 over 512**, maximum exactly 512. The widening loop never needed a second iteration.

## 5. Cross-language parity

`src/lib/local-signals/verify/segment-parity.mts` (new) and `segments.py` were run over the
whole corpus and their output diffed field by field.

**5,558 of 5,558 documents identical** — every segment's start offset, end offset, word count
and measured token count, across 21,093 segments, plus the contract string.

Getting there found three genuine divergences that had been sitting in the shipped code and
that the eight golden texts could not reach. All three are fixed:

| divergence | effect | fix |
|---|---|---|
| Python's `\S` treats U+001C–U+001F and U+0085 as whitespace; JavaScript's does not (and JavaScript treats U+FEFF as whitespace where Python does not) | word counts disagreed on **6 documents (0.11%)** — enough for the front end's drift guard to refuse the server's answer on them | `segments.py` now spells the class out as JavaScript's, because `segments.ts` is the reference and the browser is what ships |
| JavaScript's whole-string `toLowerCase()` applies the Greek final-sigma rule (`ΟΛΟΣ` → `ολος`); the Rust tokenizer the checkpoint was trained and served with does not (`ολοσ`) | different token sequence; changed the segmentation of 1 document | `tokenizer.ts` now lower-cases character by character, matching the trained tokeniser |
| `tokenizer.ts` tested whitespace as `[\t\n\r \p{Zs}]`, which misses U+2028, U+2029 and U+0085; Rust's `char::is_whitespace` is Unicode `White_Space` | a spurious `[UNK]` in one GOV.UK document | `tokenizer.ts` now uses `\p{White_Space}` (U+FEFF deliberately excluded — it is dropped as a control character, exactly as the reference tokeniser drops it) |

All eight golden token-id sequences in `public/models/local-signals-v1/golden.json` still
match after those two tokeniser changes: **8/8**.

## 6. Effect on detection and false positives

All 5,558 documents scored segment by segment through the **fp32 reference pipeline** — the
same model file, the same `app.py` scoring function, `onnxruntime` 1.29.0, the container's
pinned version — once under each rule. 23,318 forward passes for v1, 21,093 for v2.

### 6.1 At the shipped operating points (no threshold was changed)

| | v1 (shipped) | v2 | change |
|---|---|---|---|
| **server route, 0.980** — AI detected | 885/922 = **95.99%** | 893/922 = **96.85%** | **+0.86pp** |
| **server route, 0.980** — human false positives | 89/4,636 = **1.920%** | 97/4,636 = **2.092%** | **+0.17pp** |
| at 0.984 — AI detected | 864/922 = 93.71% | 877/922 = **95.12%** | +1.41pp |
| at 0.984 — human false positives | 52/4,636 = 1.122% | 56/4,636 = **1.208%** | +0.09pp |
| AUROC | 0.9967 | **0.9971** | +0.0004 |

**Detection improves and false positives rise slightly.** Stated plainly rather than sold as
a clean win: at 0.980 the fix adds 8 detected AI documents and 8 wrongly flagged human ones.

### 6.2 At matched false-positive budgets — the fair comparison

Because the fix moves the score distribution, comparing at a fixed threshold conflates the
rule change with a threshold shift. Refitting each rule's own threshold to the same measured
false-positive rate:

| FP budget | v1 threshold | v1 AI detected | v2 threshold | v2 AI detected | change |
|---|---|---|---|---|---|
| 0.5% | 0.98690 | 833/922 = 90.35% | 0.98673 | 843/922 = **91.43%** | **+1.08pp** |
| 1.0% | 0.98448 | 862/922 = 93.49% | 0.98449 | 874/922 = **94.79%** | **+1.30pp** |
| 2.0% | 0.97988 | 885/922 = 95.99% | 0.98060 | 891/922 = **96.64%** | **+0.65pp** |
| 3.0% | 0.97624 | 893/922 = 96.85% | 0.97565 | 904/922 = **98.05%** | **+1.20pp** |

At every budget v2 detects more for the same false-positive cost. The rule is better, not
merely differently calibrated.

### 6.3 Per register, at the server's shipped 0.980

| register | AI detected v1 | v2 | change |
|---|---|---|---|
| company updates | 99/99 = 100.00% | 99/99 = 100.00% | +0.00pp |
| research summaries | 116/117 = 99.15% | 117/117 = **100.00%** | +0.85pp |
| white papers | 102/103 = 99.03% | 102/103 = 99.03% | +0.00pp |
| long-form journalism | 134/137 = 97.81% | 134/137 = 97.81% | +0.00pp |
| stories | 108/114 = 94.74% | 110/114 = **96.49%** | +1.75pp |
| academic discussion | 108/113 = 95.58% | 108/113 = 95.58% | +0.00pp |
| academic literature reviews | 100/107 = 93.46% | 101/107 = **94.39%** | +0.93pp |
| academic essays | 118/132 = 89.39% | 122/132 = **92.42%** | **+3.03pp** |

| register | human FP v1 | v2 | change |
|---|---|---|---|
| student essays | 0/420 = 0.00% | 0/420 = 0.00% | +0.00pp |
| academic literature reviews | 2/225 = 0.89% | 0/225 = **0.00%** | −0.89pp |
| company updates | 5/662 = 0.76% | 3/662 = **0.45%** | −0.30pp |
| academic conclusions | 11/360 = 3.06% | 10/360 = **2.78%** | −0.28pp |
| academic introductions | 8/420 = 1.90% | 8/420 = 1.90% | +0.00pp |
| white papers | 8/840 = 0.95% | 11/840 = 1.31% | +0.36pp |
| long-form journalism | 12/840 = 1.43% | 13/840 = 1.55% | +0.12pp |
| research summaries | 1/189 = 0.53% | 3/189 = 1.59% | +1.06pp |
| academic discussion | 12/420 = 2.86% | 16/420 = 3.81% | **+0.95pp** |
| stories | 30/260 = 11.54% | 33/260 = 12.69% | **+1.15pp** |

**Every long-form category clears OBJECTIVE criterion 1's 50% floor by more than 40 points,
under both rules.** Criterion 1 is not at risk either way.

**Criterion 4 moves the wrong way at a fixed threshold, and the right way at a fixed
detection level.** Two registers carry the increase: stories (11.54% → 12.69%) and academic
discussion (2.86% → 3.81%). Stories were already the worst register for human false positives
and `OBJECTIVE.md` already records why — the flagged samples come from the
internet-archive-cc-texts pool the corpus author flagged as the least trustworthy source. That
caveat is unchanged, not resolved, by this work. Academic discussion is the register
`OBJECTIVE.md` names as the one to watch, so a 0.95pp rise there deserves attention in the
recalibration that follows; at 0.984 the same register moves 1.19% → 1.90%, and at a matched
1% FP budget only 1.19% → 1.43%.

### 6.4 Where the improvement actually came from — not where I expected

The obvious hypothesis is that recovering the dropped text raises scores on the documents that
were being truncated. **That is not what happened.**

| the 684 documents v1 truncated | v1 | v2 |
|---|---|---|
| AI (n=126) flagged at 0.980 | 123 (97.62%) | 123 (97.62%) |
| human (n=558) flagged at 0.980 | 2 (0.36%) | 2 (0.36%) |

Not one verdict on that subset changed, at either threshold. Of the 15 AI documents newly
flagged at 0.984, **0 had a truncated v1 segment**. Max-aggregation is why: a truncated segment
still contributed its first 512 tokens, and on a document where any segment reads as AI the
maximum was already set by some other segment.

The measurable gain comes from the segments being better shaped rather than more complete.
Every newly flagged document has a lower segment count under v2 (for example 8→7, 5→4, 3→2):
v2 produces fewer, longer, equal-token segments where v1 produced a full 340-word run followed
by short rebalanced halves, and detection is length-sensitive (67% at 200 words, 50% at 150).

There is a symmetric cost, recorded rather than buried: 72 documents that v1 split needlessly
are kept whole by v2 — **all 72 are human** — and at 0.980 two of them are now flagged that
were not before, because a whole document gets one longer, more confident read instead of two
weak ones. At 0.984 none of the 72 is flagged either way.

**So the honest summary of this fix is: it removes a real, measured coverage defect that could
have cost detection on any document where the dropped text was the only AI-looking part, and
it independently improves detection by 0.65 to 1.30 points at matched false positives through
better segment shape. On this corpus, the coverage defect happened not to be costing verdicts.
That is luck, not design — nothing in the old rule bounded how much text it threw away, and
the worst case measured was 2,894 tokens from a single segment.**

### 6.5 Browser runtime (int8, onnxruntime-web) — subset check

21,093 segments through onnxruntime-web is about five hours, so the browser side was measured
on a **deterministic, register-stratified 596-document subset** (296 AI, 300 human, evenly
spaced by id within each side and register), scored twice through the shipped browser runtime
— the int8 file, WASM execution provider, the shipped tokeniser and `calibratedProbability` —
once under each rule. 5,388 forward passes.

| browser route, 0.984 | v1 | v2 | change |
|---|---|---|---|
| AI detected | 276/296 = 93.24% | 279/296 = **94.26%** | +1.01pp |
| human false positives | 7/300 = 2.33% | 8/300 = 2.67% | +0.33pp |
| segments scored | 2,827 | 2,561 | **−9.4%** |
| matched 1% FP budget — AI detected | 256/296 = 86.49% | 261/296 = **88.18%** | +1.69pp |
| matched 2% FP budget — AI detected | 274/296 = 92.57% | 273/296 = 92.23% | −0.34pp |
| matched 3% FP budget — AI detected | 282/296 = 95.27% | 282/296 = 95.27% | +0.00pp |

Same direction as the fp32 result: detection up about a point, false positives up a fraction
of a point, at the shipped threshold. AI academic essays 81.08% → 86.49% and stories 83.78% →
89.19% are the two largest register moves, matching fp32. Long-form journalism went 100% →
97.30% (one document of 37) and human academic discussion 0/30 → 2/30, which are the largest
moves the other way.

**This subset is register-BALANCED, not corpus-proportional**, so its 2.33% human
false-positive rate is not comparable to the corpus-wide 1.34% the site publishes — stories,
the worst register, are 10% of it against 5.6% of the corpus. Read the deltas, not the levels.
At these denominators (296 and 300) a one-document move is 0.34pp, so the matched-budget rows
above carry real uncertainty; the fp32 measurement on 5,558 documents is the load-bearing one.

Note also that v2 costs **9.4% fewer forward passes** on the same documents, on both routes —
21,093 against 23,318 corpus-wide. The server route's inference bill goes down, not up.

### 6.6 The new operating points, for the recalibration that follows

Measured under v2 on the fp32 route over all 5,558 documents. `v1` columns are the same
documents under the shipped rule, for reference.

| threshold | v2 AI detected | v2 human FP | v1 AI | v1 FP |
|---|---|---|---|---|
| 0.9800 (server, as shipped) | 893/922 = 96.9% | 97/4,636 = 2.09% | 96.0% | 1.92% |
| 0.9820 | 888/922 = 96.3% | 82/4,636 = 1.77% | 95.2% | 1.57% |
| 0.9833 | 881/922 = 95.6% | 63/4,636 = 1.36% | 94.4% | 1.29% |
| **0.9840** (browser, as shipped; `ROUTE-PARITY.md`'s recommendation for both) | **877/922 = 95.1%** | **56/4,636 = 1.21%** | 93.7% | 1.12% |
| 0.9845 | 874/922 = 94.8% | 45/4,636 = 0.97% | 93.5% | 0.99% |
| 0.9850 | 869/922 = 94.3% | 40/4,636 = 0.86% | 93.1% | 0.93% |
| 0.9860 | 854/922 = 92.6% | 30/4,636 = 0.65% | 91.6% | 0.75% |
| 0.9876 | 822/922 = 89.2% | 22/4,636 = 0.47% | 87.7% | 0.43% |

The 1% false-positive point on the fp32 route moves from 0.98448 (v1) to 0.98449 (v2) — for
practical purposes it does not move at all, while detection at that point rises from 93.49% to
94.79%. `ROUTE-PARITY.md`'s recommendation of a single 0.984 on both routes therefore survives
this change unharmed: at 0.984 the fp32 route now reads 95.1% detection at 1.21% false
positives, against 93.8% at 1.12% before.

**No threshold was changed here.** The browser remains 0.984 and the server 0.980, exactly as
shipped, so the calibration decision is still open and is now taken on top of a rule that
cannot silently drop text. The one input that recalibration still needs and this task did not
produce is the **browser runtime's own segmented operating curve on the full corpus** — about
five hours through onnxruntime-web. Until it exists, `thresholds.json`'s `measured` block and
the disclosure copy carry browser figures derived under `segments-v1`.


## 7. What changed, file by file

**Website (`opace-website/astro-latest/`)**

| file | change |
|---|---|
| `src/lib/local-signals/segments.ts` | the rule. SERVER PARITY CONTRACT rewritten as v2, `SEGMENTATION_CONTRACT` bumped to `segments-v2`, golden table replaced with token-driven cases, `SEGMENT_WORDS`/`MIN_TAIL_WORDS` replaced by `MODEL_MAX_TOKENS`/`SPECIAL_TOKENS`/`SEGMENT_TOKEN_BUDGET`/`TYPICAL_SEGMENT_WORDS`. `segmentText` now takes a `TokenCounter` and returns a measured `tokens` per segment |
| `src/lib/local-signals/tokenizer.ts` | new `countTokens()` (no specials, no truncation, same code path as `encode`); per-character lower-casing; `\p{White_Space}` |
| `src/lib/local-signals/engine.ts` | passes the tokeniser into `segmentText` |
| `src/lib/local-signals/model-store.ts` | new `loadVocab()` — vocabulary only, manifest-verified, cached in the same store as the consented model |
| `src/lib/local-signals/server-route.ts` | the drift guard builds a tokeniser from `loadVocab()` before re-segmenting; a failure to load it is reported as a contract mismatch rather than silently skipped |
| `src/lib/local-signals/verify/segment-parity.mts` | **new** — cross-language boundary dump |
| `src/lib/local-signals/verify/segment-ab.mts` | **new** — browser-runtime v1/v2 A/B |
| `src/lib/local-signals/verify/route-parity.mts`, `verify/segment-scoring.mts` | updated for the new signature |
| `src/components/.../local-signals-ui.ts`, `src/data/content-integrity.ts`, `src/pages/.../checker.astro` | copy: "sections of about 340 words" and "nothing under 120 words is scored on its own" are no longer true |

**Reference server (`.../model-shrink/reference-server/`)**

| file | change |
|---|---|
| `segments.py` | the port, rule for rule. Word regex spelled out to match JavaScript's `\S` |
| `test_segments.py` | rewritten against the real tokeniser; new cases for the window bound, the oversized word and the no-short-tail property |
| `app.py` | `count_tokens` helper; `segment_text`/`segment_count` take it; `MAX_SEGMENTS_PER_REQUEST` derived from `MAX_CHARS`; the `truncated` comment corrected |
| `README.md`, `SECURITY.md`, `deploy.sh` | contract string, the segmentation section, the cost bound, and §7.10 |

Nothing was committed or pushed. No threshold was touched: the browser stays at 0.984 and the
server at 0.980, exactly as shipped.

## 8. Deploy order — this matters

The front end's drift guard refuses to present any server figure whose
`segmentation_contract` differs from its own. Both sides now say `segments-v2`, so **either
side deployed alone breaks the server route for every visitor**: the browser would refuse
`segments-v1` responses, or a `segments-v2` server would be refused by a `segments-v1` page.

The failure is safe — the tool reports the mismatch and offers the in-browser route — but it
is a visible outage of the default route, so:

1. **Deploy the server first** (`./deploy.sh`, which runs `test_segments.py` as its build
   gate). The old browser build will then refuse the new server and fall back to the browser
   route. Keep this window short.
2. **Deploy the site immediately after.** The moment it is live both sides agree again.
3. Verify: one check through the page returns 200 with `segmentation_contract:
   "segments-v2"`, a `segments[]` array, and no contract-mismatch banner.

Rolling back means rolling back both, in the reverse order.

The alternative — teaching the guard to accept either contract for one release — would mean
accepting a server that segments differently from the page, which is the exact thing the
guard exists to prevent. A short co-ordinated window is the cheaper cost.

One extra note for the browser deploy: the server route now fetches `vocab.txt` (231 KB, about
111 KB gzipped) the first time a visitor runs a check, because bounding a segment by measured
tokens means the guard needs the tokeniser. It is cached in the same store the consented model
uses, so a visitor who later downloads the model does not fetch it twice. The route still
never downloads the 34 MB model.

## 9. What was not measured, and why

- **The browser route's full-corpus figures.** 21,093 segments through onnxruntime-web is
  about five hours. The full corpus was measured on the fp32 reference instead, and the
  browser was measured on a stratified subset (§6). `thresholds.json`'s `measured` block and
  the disclosure copy still carry **browser figures derived under `segments-v1`**; they must
  be re-derived on the browser runtime before the site deploy, and that work belongs with the
  threshold recalibration that follows this task.
- **The live container.** It was returning 404 at the end of the route-parity run and no
  attempt was made to bring it back; that is an infrastructure change this task has no
  authority to make. Everything server-side here is local fp32 at the container's pinned
  versions, which the route-parity anchor found numerically identical on every segment it
  could compare.
- **`onnxruntime` 1.29.0 matches the container; `transformers` is 5.16.1 here against the
  container's 4.43.3.** The tokeniser was checked against all eight golden token-id sequences
  before anything else was measured: 8/8. No model weights differ.
- **Register labels are machine-assigned** in this corpus, as `MANIFEST.md` records. The
  per-register split inherits that.
- **3 of the 5,558 documents' provenance caveats** recorded in `ROUTE-PARITY.md` §1 apply
  equally here: PERSUADE 2.0 also appears in the cycle-2 training corpus. For a before/after
  comparison of two segmentation rules over the same documents it does not matter — the same
  weights read the same text both times — but it would matter for an absolute accuracy claim.

## 10. Incidental findings, recorded not acted on

- The FAQ in `src/data/content-integrity.ts` still says the model "misses lightly-edited AI
  text almost entirely". `OBJECTIVE.md` records that claim as measured wrong and corrected in
  the live disclosure copy (commit `ce56ac54`); this second copy of it was missed. Out of
  scope here, but it is a published claim that the project's own evidence contradicts.
- `app.py`'s `truncated` flag is now what its comment always claimed. It was not, under v1.

## 11. Reproducing this

```sh
# token distribution under v1, and the v2 distribution and invariants
python3 measure_v1.py ; python3 measure_v2.py

# every segment of the corpus scored through fp32, once per rule (~13 min each)
python3 score_corpus.py v1 ; python3 score_corpus.py v2 ; python3 analyse.py

# cross-language boundary parity, 5,558 documents
cd opace-website/astro-latest
npx tsx src/lib/local-signals/verify/segment-parity.mts \
  <ai-longform.jsonl> <human-longform.jsonl> ts_segments.json
python3 py_segments.py <ai-longform.jsonl> <human-longform.jsonl> py_segments.json
# then diff the two JSON files

# browser-runtime A/B on the stratified subset
npx tsx src/lib/local-signals/verify/segment-ab.mts subset.json browser_ab.jsonl

# the unit tests, which deploy.sh blocks the build on
cd reference-server && PYTHON=./.venv/bin/python python3 test_segments.py
```

`segment-parity.mts` and `segment-ab.mts` are committed beside the other verify harnesses.
The Python measurement scripts live in this session's scratchpad; nothing in the product
reads them.
