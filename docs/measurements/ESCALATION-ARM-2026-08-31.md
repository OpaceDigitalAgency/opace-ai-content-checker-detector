# Shape-tell escalation arm: priced, not shipped (2026-08-31)

Measurement and pricing only. Nothing here moves a threshold, deploys anything or changes
policy; the decision is the owner's and this document is the priced table.

## Verdicts up front

1. **The 14–16× tells do change the arithmetic that killed the 2× version — but only on the
   plain-text surface.** On markdown-stripped scores (what a plain-text paste looks like) the
   best point buys **+55 AI documents for +1 human false positive** (+1.37pp detection for
   +0.03pp FP in corpus; **+1.39pp for +0.06pp held out** at the published gates), which beats
   the minimum-evidence precedent (+0.82pp for +0.077pp) on both axes. On the corpora as
   banked, with markdown intact, the arm buys AI documents at **1 : 1** with human false
   positives — the same shape of failure `SYNTHETIC-CADENCE.md` §5.1 rejected.
2. **A bigger finding fell out on the way and bounds everything: the shipped pair flags
   22.5% of the structured human corpus when raw markdown is scored, and stripping the
   markdown syntax un-flags 59 of 60 of them.** The model reads `##`/`-` syntax itself as
   AI evidence. The same inflation runs the other way on the AI side (93.6% raw → 88.4%
   stripped). Which surface the shipped checker actually feeds the model decides which of
   these tables is real, and that has to be pinned down before any escalation ships.
3. Recommendation at the bottom: **do not ship this week; the priced point is real but is
   conditional on input normalisation, and the input-surface question it exposed is worth
   more than the arm itself.**

## The question

`SYNTHETIC-CADENCE.md` §5.1 priced an escalation arm — flag when the model probability sits
in a band below the primary flag point AND cadence tells fire — and rejected it: the best
candidate bought +0.562pp detection for +0.106pp human false positives, worse on both axes
than the minimum-evidence rule (+0.82pp for +0.077pp, `AGGREGATION-AND-RHYTHM.md` §2.3)
that then shipped as the 0.9855/0.9763 pair. Its tells carried roughly 2× lifts.

`DOCUMENT-TELLS-2026-08-31.md` (final addendum) has since measured three far stronger
document-shape tells against a structure-preserved human baseline: `wpp_cv` ≤ 0.2 (words-
per-paragraph CV, ~16×), `sec15` ≥ 0.9 (share of body sections within ±15% of the median
section length, ~13.8×) and the composite scaffold (≥4 sections, mode share ≥ 0.8,
spp_cv ≤ 0.35, ~6.6×). Does double-digit lift change the §5.1 arithmetic? Same method:
bands below the primary × N-of-tells, AI-gained against human-FP-added with denominators,
split-half cross-validation with the gates refitted per training half, per-register costs.

## Provenance

- Shipped operating point verified before anything was trusted: primary 0.9855, secondary
  0.9763 on the second-highest section, maximum aggregation, segments-v3 —
  `research/model-shrink/reference-server/app.py:287-288`, asserted in its
  `test_aggregation.py:225-226`, and the website checkout
  `astro-latest/public/models/local-signals-v1/thresholds.json`.
- AI side: the 28 August generated corpus, 4,016 usable documents from 21 models, shipped
  fp32 scores reused read-only (`research/generated-corpus/cycle2-rescore-2026-08-31/
  generated-fp32.jsonl`; raw-surface baseline 3,758/4,016 = 93.6%). Cycle-2 split
  membership from `cycle2-membership.json`: 2,568 of 4,016 sit in a cycle-2 split (1,807
  train / 368 cal / 393 test); 1,448 are hash-independent.
- Human side: the structured human corpus, 3,529 licence-recorded documents
  (`research/human-structured-corpus-2026-08-31/corpus.jsonl`, read-only), scored through
  the identical shipped fp32 harness. Snapshot, resumed scoring run and bit-exact spot
  re-verification (max |Δ seg_p| = 0.00e+00 on a random sample) in
  `research/escalation-arm-2026-08-31/`.
- Shape tells: per-document metrics from `new-human-per-doc.jsonl` (both sides, same
  measurement code, `document-tells-2026-08-31/` reused read-only).
- Analysis: `research/escalation-arm-2026-08-31/price_escalation.py`; outputs
  `escalation-pricing.json` (raw surface) and `escalation-pricing-stripped.json`.

## 1. The confound found first: markdown syntax is being scored as AI evidence

Scoring the structured human corpus **as banked** (headings, bullets and inline markdown
intact) through the shipped pair flags **794/3,529 = 22.50%** — against 45/4,636 = 0.97%
on the structure-stripped corpus of record. Worst registers: howto-guide 462/762 = 60.8%,
business-guide 81/180 = 45.0%. This is not AI contamination of revised pages: sources
pinned to pre-2022 git commits with named authors flag just as hard (18F content guide
12/17 = 70.6%, Microsoft style guide 15/35 = 42.9%, MDN 89/250 = 35.6%). It is also
strongly length-dependent: 1.9% under 300 words, 60.6% at 1,200+.

The controlled test (`strip_test.py`): re-score 60 randomly sampled flagged human documents
with markdown *syntax* stripped (heading markers, bullet/numbered markers, bold/italic/
code/link syntax removed; every word and paragraph break kept). **59 of 60 un-flag.** The
prose was never the problem; the `##` was.

The same inflation acts on the AI side, where the models emit markdown: stripping it moves
AI detection 3,758/4,016 = 93.6% → 3,549/4,016 = 88.4%. So both corpora were re-scored on
the stripped surface (`score_stripped.py`) and the arm is priced on **both** surfaces
below. Neither surface is wrong: a draft pasted from a ChatGPT-style copy button carries
its markdown; text pasted from a web page or Word mostly does not. The two tables bracket
the product. The shape tells themselves always read the *captured* structure (the paste-
HTML capture shipped in website batch 2 provides it at check time), so the tells are the
same on both surfaces; only the model's input changes.

## 2. Pricing on the corpora as banked (markdown surface)

Baseline at the shipped pair: AI 3,758/4,016 = 93.58%; human "FP" 794/3,529 = 22.50%
(artefact-dominated, per §1 — the band populations inherit the artefact too: 1,756 of the
3,529 humans sit unflagged in 0.80–0.9855, against 237 of the 258 AI misses).

| band | tells | AI added | human FP added | detection | human flag rate |
|---|---|---|---|---|---|
| 0.80–0.9855 | ≥1 | +34 | +35 | 94.42% (3,792/4,016) | 23.49% (829/3,529) |
| 0.90–0.9855 | ≥1 | +34 | +28 | 94.42% | 23.29% |
| 0.95–0.9855 | ≥1 | +33 | +22 | 94.40% | 23.12% |
| any band | ≥2 | +1 | +1 | 93.60% | 22.53% |
| any band | ≥3 | 0 | 0 | unchanged | unchanged |

Split-half (200 splits, gates refit per training half, 0.25pp FP budget): held-out gain
**+0.062pp** (sd 0.129) for **+0.156pp** FP added. Worse on both axes than the §5.1
candidate that was already rejected (+0.562pp for +0.106pp). On this surface the answer
to the brief's question is **no** — and the mechanism is worth recording: conditioning on
the band collapses the lifts. In-band, tells≥1 fires on 14.3% of AI misses vs 2.0% of
unflagged humans (~7×, down from ~12× at population level), and the band holds 7.4× more
humans than AI. ≥2-of-3 fires on exactly **1** in-band AI document: the heavily
scaffolded AI is precisely what the model already catches, so the misses are the
unscaffolded ones. The tells and the model score are correlated evidence, and the
escalation band is where that correlation bites.

## 3. Pricing on the stripped surface (plain-text paste)

Baseline at the shipped pair: AI 3,549/4,016 = **88.37%**; human FP **5/3,529 = 0.14%**
(all five: 18F guide/handbook pages and one GOV.UK news page).

| band | tells | AI added | human FP added | detection | human FP |
|---|---|---|---|---|---|
| 0.80–0.9855 | ≥1 | +55 | +2 | 89.74% (3,604/4,016) | 0.20% (7/3,529) |
| **0.90–0.9855** | **≥1** | **+55** | **+1** | **89.74% (3,604/4,016)** | **0.17% (6/3,529)** |
| 0.95–0.9855 | ≥1 | +49 | +1 | 89.59% (3,598/4,016) | 0.17% (6/3,529) |
| 0.80–0.9855 | ≥2 | +5 | 0 | 88.50% (3,554/4,016) | 0.14% (5/3,529) |
| any band | ≥3 | 0 | 0 | unchanged | unchanged |

Split-half, held out (200 splits):

| setting | detection gained | human FP added |
|---|---|---|
| gates refit per half, 0.25pp budget | **+2.96pp** (sd 0.30), 95% [2.39, 3.49] | +0.232pp (sd 0.14) |
| gates refit per half, 0.10pp budget | +2.35pp (sd 0.49) | +0.108pp (sd 0.08) |
| published gates fixed (wpp 0.2 / sec15 0.9 / scaffold), 0.25pp budget | **+1.39pp** (sd 0.19) | **+0.058pp** (sd 0.04) |

The refit rows drift to looser gates (wpp_cv ≤ 0.3, sec15 ≥ 0.8) and buy more; the fixed-
gate row is the conservative, directly comparable one — and it clears the precedent bar
(+0.82pp for +0.077pp) on **both** axes. The chosen operating point is stable: band 0.80
or 0.90, ≥1 tell, on 200/200 splits at fixed gates.

Who the +55 are: 29 llama-4-maverick (the known extreme templater/evader), 7
mistral-medium-3-5, 5 grok-4.6, and 14 across six other models; 24 plain / 13 human-voice /
12 house-brief prompts (at band 0.95). Tell composition: 37 of 55 fire **wpp_cv only**,
8 scaffold only, 5 sec15 only, 5 two-tell. The single human FP added is an 18F handbook
page (H1, named author, pre-2022 commit).

### Hash-independent AI subset (memorisation check)

1,448 of the 4,016 AI documents were never in any cycle-2 split. On the stripped surface:
baseline 1,249/1,448 = 86.26%; band 0.90 / ≥1 adds **+15 = +1.04pp** (87.29%); split-half
on this subset alone holds **+2.82pp** (sd 0.47) for +0.229pp at the 0.25pp budget. The
gain is not a memorisation echo — proportionally it is close to the full-corpus figure
(the in-corpus +55 is 3.9% of misses; +15 is 2.5pp less because independent misses skew
to social posts with no structure for the tells to read).

### Mixed surface (the realistic bracket)

AI pastes often keep their markdown; human pastes mostly do not. Pricing AI on raw scores
against humans on stripped scores: band 0.90 / ≥1 tell = **+34 AI for +1 human FP**
(band 0.80: +34/+2; ≥2 tells: +1/0). Anywhere in the bracket, the arm pays.

## 4. Per-register, per-bucket, per-confidence human cost (stripped surface, band 0.95 / ≥1)

| slice | n | shipped FP | escalation added |
|---|---|---|---|
| business-guide | 180 | 4 | **+1** |
| business-news | 300 | 1 | 0 |
| business-blog, developer-docs, faq, faq-qa, howto-guide, journalism, seo-marketing-blog | 3,049 | 0 | 0 |
| FAQ/listicle hard negatives (faq registers or ≥5 headings) | 2,505 | 5 | +1 (the same 18F doc) |
| GREEN bucket | 2,779 | 5 | +1 |
| AMBER bucket | 750 | 0 | 0 |
| H1 / H2 / H3 confidence | 1,564 / 1,278 / 687 | 4 / 1 / 0 | +1 / 0 / 0 |

The FAQ/listicle hard negatives — the register family the tells were most feared on — add
one document in 2,505. On the raw surface the per-register table is published in
`escalation-pricing.json` but is artefact-dominated (§1) and priced there at up to 35 FPs;
it is not repeated here so it cannot be quoted as a stripped-surface cost.

## 5. Honest limits

1. **The surface question is open and is the biggest number in this file.** The raw and
   stripped tables disagree by 5.2pp of AI detection and 22.4pp of human flag rate. What
   the shipped checker actually feeds the model (per route, per paste type) has to be
   established — and if markdown-carrying pastes reach the model unstripped, the latent
   22.5%-class FP exposure for humans pasting structured drafts exists *today*,
   independent of any escalation.
2. Register/source coupling: the human corpus is 44% government-adjacent and each register
   comes mostly from one source family. Direction was checked per register (§4: zero
   escalation cost in 8 of 9 registers), but a register this corpus lacks — casual blogs,
   commercial listicles — is priced only by the hard-negative stand-ins.
3. **Fiction is untestable for shape tells here** (no fiction in either corpus with
   structure), and 37 of the 55 gained documents fire on `wpp_cv` alone — the one tell
   that does not require headings and so *could* fire on fiction. SYNTHETIC-CADENCE's
   fiction protection argument (cannot fire the paragraph signal) does not extend to
   wpp_cv. Any shipped arm should either require structure (≥3 sections) or be priced on
   the 260-story corpus first.
4. The AI corpus structure survives markdown; a draft pasted as plain text may or may not.
   The tells run at check time on the paste-HTML capture (shipped, website batch 2), which
   preserves real structure for rich pastes; a plain-text paste with structure flattened
   loses the sec15/scaffold tells but keeps wpp_cv (paragraph breaks survive).
5. The stripped-surface human FP denominators are small at the decision point (1 added in
   3,529): the 95% interval on +0.03pp is roughly [0.00, 0.16pp]. The split-half rows are
   the honest spread.
6. AI side is own-prompt generation from 21 models; out-of-distribution AI may differ.
   2,568/4,016 overlap cycle-2 splits; the hash-independent row is the clean one.

## 6. Verdict framing

Priced against the precedent, on held-out numbers at the published gates:

| candidate | detection gained | human FP added | outcome |
|---|---|---|---|
| §5.1 cadence escalation (2× tells) | +0.562pp | +0.106pp | rejected 2026-08-31 |
| minimum-evidence pair (shipped) | +0.82pp | +0.077pp | shipped as 0.9855/0.9763 |
| **this arm, raw-markdown surface** | +0.062pp | +0.156pp | fails, same shape as §5.1 |
| **this arm, stripped surface, fixed gates** | **+1.39pp** | **+0.058pp** | **clears the bar on both axes** |

**Recommendation: decline to ship now; re-open behind one precondition.** The stripped-
surface point (band 0.90–0.9855, ≥1 of the three published tells) is the first escalation
candidate measured by this programme that beats the minimum-evidence precedent on both
axes, it survives split-half and hash-independence, and its measured cost is one named
18F handbook page. But it is only real on a normalised input surface the product has not
yet been shown to have; the fiction exposure of wpp_cv-alone (37 of 55 gains) is unpriced;
and tells today are contractually evidence, never verdict ("Tells illustrate, never
decide" — TASK-BOARD standing rule), so shipping it is a policy change that belongs to
the owner. What the owner trades either way:

- **Ship (after pinning the surface + fiction pricing):** ~+1.4pp held-out detection
  (~55 documents per 4,016, two-thirds of them the llama-4-maverick evader family) for
  ~+0.06pp human FPs concentrated in structured guide writing; plus the first policy
  breach of "model-only verdict", with the maintenance surface that brings.
- **Decline:** keep the clean model-only verdict contract and zero new FP exposure; leave
  the maverick-shaped miss on the table for cycle-5 training to close instead (structural
  features in training reach the same documents without a second verdict path — and the
  matched-generation corpus being banked next door is exactly the data for it).

Either way, the §1 surface finding should be triaged this week regardless of the
escalation decision: it is a live FP exposure if markdown pastes reach the model raw, and
a live 5pp detection giveaway if they are stripped. That measurement, not this arm, is
the actionable item.

## Reproduction

`research/escalation-arm-2026-08-31/`: `score_human_fp32.py` (shipped-harness scoring,
resumable), `strip_test.py` (the 60-doc markdown diagnostic), `score_stripped.py` (both
corpora, stripped surface), `price_escalation.py` (grids, split-half, per-register;
`verify` mode re-scores a sample bit-exact). Outputs `escalation-pricing.json`,
`escalation-pricing-stripped.json`; score files under `inputs/` (regenerable, not
committed). Cross-references: `DOCUMENT-TELLS-2026-08-31.md` (tell definitions and lifts),
`SYNTHETIC-CADENCE.md` §5.1 (method and precedent), `AGGREGATION-AND-RHYTHM.md` §2.3
(the bar to beat).
