# Per-rule validation of the 113 en-signals writing-signal categories

Measured, not assumed. Every one of the 113 rule categories in the shipped
`packages/core` engine was run over the full provider-eval corpus in both the
raw and the markdown-stripped view, and scored on firing rate, discriminative
power, significance, redundancy, vendor skew, human-genre exposure,
leave-one-out contribution and weight justification.

- Machine-readable results: [`rule-stats.json`](rule-stats.json)
- Ranked recommendations: [`ACTION-LIST.md`](ACTION-LIST.md)
- Reproduction: [`scripts/`](scripts/) — see *How to reproduce* below

**Nothing in the engine or the website was changed. This is a measurement and a set of recommendations.**

## Executive summary, in plain English

Read this section if you read nothing else. No statistics training needed.

We have 1,727 texts known to be AI-written (39 models, 12 vendor-and-era
slices) and 169 texts known to be human-written. We asked, for each of the
113 rules: how often does it fire on each side, and does that difference mean
anything?

**What we found.**

1. **32 of the 113 rules never fired once**, on either AI or human text, in
   either view. They are carrying weight in the scoring model that they have
   never once earned. Twenty-nine of the thirty-two were then hand-probed with a
   text built to trigger them, and all twenty-nine fired — so those rules work;
   the patterns they hunt for simply are not in this corpus. The remaining three
   (`mic-drop-paragraph`, `contrast-density`, `punchline-fragment-density`) are
   threshold rules whose gates the corpus never gets near, and they look mis-set
   rather than dormant.

2. **17 rules fire more often on human writing than on AI writing.**
   That is the wrong direction for a detector: they push human text towards an
   'AI-like' verdict. Only two of them (`passive-ratio`, `token-cutoff`) do so by
   a margin large enough to be sure about; the other fifteen are pointing the
   wrong way but within the noise. Either way, none of them is earning its weight.

3. **Only 17 of the 113 rules are statistically solid** in the raw view, and
   only 7 in the stripped view, once you correct for the fact that we
   are testing 113 hypotheses at once. This is not a criticism of the rules; it
   is arithmetic. With 169 human texts, a rule that fires on 2% of humans and 6%
   of AI cannot be told apart from luck. Most of the rule set is currently
   unproven rather than disproven — and the honest thing is to say so.

4. **The detector leans heavily on markdown furniture.** The single biggest
   contributor, `markdown-furniture`, is worth 14.2 percentage points of
   detection on its own. Bold runs, heading lines and bold-label bullets between
   them account for most of the measured power. That is why detection collapses
   from 78.6% to 25.6% when the same texts are pasted without their
   markdown: the engine is largely reading layout, not prose.

5. **The weights were never fitted to our data.** They were inherited from the
   upstream `avoid-ai-writing` project and from editorial judgement. Where the
   evidence now contradicts them, the report proposes a number. Where the
   evidence cannot settle the question, it says so instead of inventing one.

**What we cannot say.** The human side is 169 texts. Only 40 are fresh published
prose and only 10 of those are business-marketing copy — the genre most at risk
of being wrongly flagged, and the genre our customers write. A single extra hit
in that bucket moves its rate by ten percentage points. Every genre-level
statement in this report is a flag to investigate, never a finding.

## Limits of this evidence (read before quoting any number)

| Limit | Detail |
| --- | --- |
| Human corpus size | 169 texts. Composition: qa-finance 71, wikipedia-article 32, qa-wiki_csai 20, business-marketing 10, blog-editorial 8, qa-medicine 6, technical 6, journalism 6, casual-forum 4, non-native 4, academic 2. |
| Published prose | Only 40 of the 169 (`fresh-human-corpus-v1`). The other 129 are HC3 question answers (97) and Wikipedia articles (32) — neither is representative of commercial web copy. |
| Business-marketing humans | 10. Any rate quoted for this genre has a resolution of 10 percentage points. |
| Statistical power | With 169 humans, the tightest false-positive rate we can bound is roughly 1.8% (rule of three) even for a rule that never fires on a human. A rule firing on 0 humans and one firing on 1 human are not distinguishable. |
| Multiple comparisons | 113 rules were tested. Raw p-values are reported, but decisions use Benjamini–Hochberg q-values; at 113 tests roughly 6 rules would clear p<0.05 by chance alone. |
| Weights | The shipped weights come from the upstream `avoid-ai-writing` project and from editorial judgement. They were not fitted to this corpus, and this report is the first time they have been checked against it. |
| Provider coverage | 39 models across 7 vendors, but only openai has a 2022-23 slice, so era effects and vendor effects are partly confounded. |
| Genre coverage of AI side | The AI side is arena-style prompts, not commissioned marketing copy. A rule's AI firing rate here is not its firing rate on the content our customers paste. |

## Method

1. `scripts/extract.mjs` runs the shipped `packages/core` dist (`inspectSignalsV2`
   and `computeEditorialSignals`) over `provider-eval/eval-set.jsonl` and
   `stripped-eval/stripped-set.jsonl`, recording the deduplicated per-category
   issue counts the scorer itself consumes, plus the shipped score.
2. `scripts/dump_config.mjs` exports the shipped weight tables and category sets.
3. `scripts/verify_reconstruction.py` proves the Python re-implementation of the
   scorer reproduces the engine's own score **exactly on all 3,792 scored
   samples** (0 mismatches). Without that, no ablation number would be trustworthy.
4. `scripts/stats.py` provides an exact Fisher test (integer hypergeometric
   arithmetic — scipy is not available in this environment), Wilson intervals,
   Haldane-corrected likelihood-ratio intervals and Benjamini–Hochberg correction.
   `scripts/test_stats.py` checks them against published worked examples.
5. `scripts/liveness.mjs` hand-probes every rule that never fired, to separate
   'dormant' from 'unreachable'. `scripts/v4_headroom.mjs` measures how close the
   corpus gets to the three whole-document rhythm thresholds.
6. `scripts/analyse.py` produces `rule-stats.json`; `scripts/report.py` renders
   this document and the action list.

### How to reproduce

```sh
cd implementation/services/local-engine/research/rule-validation
node scripts/extract.mjs ../provider-eval/eval-set.jsonl     data/fire-raw.jsonl
node scripts/extract.mjs ../stripped-eval/stripped-set.jsonl data/fire-stripped.jsonl
node scripts/dump_config.mjs
node scripts/liveness.mjs
node scripts/v4_headroom.mjs
python3 scripts/verify_reconstruction.py   # must print 0 mismatches
python3 scripts/test_stats.py
python3 scripts/analyse.py
python3 scripts/report.py
```

### Definitions

- **Firing rate** — share of samples on that side where the rule produced at least one finding.
- **Precision** — of the samples where the rule fires, the share that are AI. The base rate is
  91.09% because the corpus is deliberately AI-heavy, so precision below that is bad news.
- **Lift** — precision divided by the base rate. Anything at or under 1.00 adds nothing.
- **Likelihood ratio (LR)** — firing rate on AI divided by firing rate on humans, Haldane-corrected. This is the
  quantity a weight should be proportional to, and it does not depend on the corpus mix.
- **q** — Benjamini–Hochberg adjusted p-value across all 113 rules. `q < 0.05` is our bar for 'supported'.
- **Contribution** — percentage points of AI detection lost when the rule alone is removed, holding the
  operating threshold fixed at the 5%-false-positive point of the shipped configuration.

## Headline counts

| Category | Count | Of 113 |
| --- | ---: | ---: |
| Dead in both views (never fired) | 32 | 28% |
| Dead in the raw view only | 1 | 1% |
| Fires more on humans than AI (either view) | 17 | 15% |
| ...of which the difference is significant | 2 | 2% |
| Statistically supported, raw view (BH q<0.05) | 17 | 15% |
| Statistically supported, stripped view | 7 | 6% |
| Not distinguishable from chance, raw view | 96 | 85% |
| Near-duplicate pairs (Jaccard >= 0.6) | 3 | 3% |
| Single-vendor skew (top firing rate >= 3x lowest) | 21 | 19% |
| Human-genre exposure flag | 10 | 9% |

### Operating points of the shipped configuration (model-free rules score)

| View | FP budget | Threshold | AI detected | Human false positives |
| --- | --- | ---: | ---: | ---: |
| raw | 1% | >= 7 | 57.4% | 0.0% (0/169) |
| raw | 5% | >= 5 | 78.6% | 3.0% (5/169) |
| raw | 10% | >= 4 | 85.8% | 8.9% (15/169) |
| stripped | 1% | >= 7 | 10.9% | 0.0% (0/169) |
| stripped | 5% | >= 5 | 25.6% | 3.0% (5/169) |
| stripped | 10% | >= 4 | 38.2% | 8.3% (14/169) |

The stripped view is the realistic one: it is what a customer pastes when they
copy from a chat window into a text box. The rules score detects roughly a
quarter of AI text there at a 5% false-positive budget, against 78.6% with the
markdown intact.

## Top ten rules by measured contribution

Removing the rule from the shipped configuration and holding the threshold at
the 5%-false-positive point. Negative delta = detection lost = the rule was
doing work.

| # | Rule | Weight | Raw delta | Stripped delta | AI fires | Human fires | q (raw) |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | `markdown-furniture` | 4 | -14.24 pp | +0.00 pp | 1410/1727 | 1/169 | 5.1e-107 |
| 2 | `markdown-bold` | 3 | -8.34 pp | +0.00 pp | 1245/1727 | 0/169 | 1.7e-84 |
| 3 | `formatting` | 3 | -6.25 pp | +0.00 pp | 1114/1727 | 0/169 | 2.5e-69 |
| 4 | `bold-label-bullets` | 3 | -3.30 pp | +0.00 pp | 525/1727 | 0/169 | 3.6e-24 |
| 5 | `tier1` | 5 | -2.66 pp | -8.80 pp | 394/1727 | 11/169 | 9.1e-07 |
| 6 | `chatbot` | 8 | -2.43 pp | -5.15 pp | 146/1727 | 0/169 | 1.3e-05 |
| 7 | `em-dash-density` | 4 | -1.85 pp | -2.26 pp | 272/1727 | 16/169 | 0.18 |
| 8 | `markdown-heading` | 3 | -1.62 pp | +0.00 pp | 532/1727 | 0/169 | 1.1e-24 |
| 9 | `sentence-flatline` | 5 | -1.56 pp | -1.80 pp | 104/1727 | 4/169 | 0.29 |
| 10 | `adjacent-lemma-repeat` | 3 | -1.39 pp | -2.26 pp | 271/1727 | 30/169 | 1.00 |

Same measurement on the stripped view, which is a different ranking and the one
that matters for the paste-a-chat-reply use case:

| # | Rule | Stripped delta | Raw delta | q (stripped) |
| ---: | --- | ---: | ---: | ---: |
| 1 | `tier1` | -8.80 pp | -2.66 pp | 7.3e-06 |
| 2 | `chatbot` | -5.15 pp | -2.43 pp | 4.2e-05 |
| 3 | `adjacent-lemma-repeat` | -2.26 pp | -1.39 pp | 1.00 |
| 4 | `em-dash-density` | -2.26 pp | -1.85 pp | 0.26 |
| 5 | `tier1-clarity` | -2.03 pp | -0.87 pp | 0.97 |
| 6 | `sentence-flatline` | -1.80 pp | -1.56 pp | 0.35 |
| 7 | `setup-expansion-cadence` | -1.74 pp | -0.81 pp | 0.86 |
| 8 | `transition` | -1.62 pp | -1.10 pp | 0.010 |
| 9 | `punct-distribution` | -1.56 pp | -0.87 pp | 0.14 |
| 10 | `smart-punct-signature` | -1.51 pp | -0.06 pp | 1.00 |

Treat the stripped list with care. `adjacent-lemma-repeat`, `em-dash-density`, `tier1-clarity`, `sentence-flatline`, `setup-expansion-cadence`, `punct-distribution`, `smart-punct-signature` (7 of the ten) are elsewhere flagged as firing the wrong way or as
not distinguishable from chance. Their apparent contribution comes from nudging
scores across an integer threshold, not from evidence that they identify AI. A
rule can lift the AI score distribution and the human one by the same amount and
still show a positive contribution if the humans happen to sit further from the
cut. This is the main reason the contribution ranking must be read next to the
q-value column and never on its own.

Note the two lists barely overlap in ordering. With markdown present the engine
scores layout; with markdown removed it falls back on vocabulary (`tier1`,
`chatbot`) and rhythm. Any claim about 'the most important rule' has to name
which view it means.

## Dead rules

32 categories produced no finding on any of the 1,896 samples in either
view. Each was then given a hand-built probe text designed to trigger it.

| Rule | Weight | Probe fired? | Reading |
| --- | ---: | --- | --- |
| `ai-citation-markup` | 15 | yes | Live. The pattern is simply absent from this corpus. |
| `ai-citation-token` | 15 | yes | Live. The pattern is simply absent from this corpus. |
| `ai-utm-source` | 12 | yes | Live. The pattern is simply absent from this corpus. |
| `contrast-density` | 2 | n/a | Whole-document rhythm threshold; see the headroom table below. |
| `copula-avoidance` | 3 | yes | Live. The pattern is simply absent from this corpus. |
| `despite-challenges-arc` | 5 | yes | Live. The pattern is simply absent from this corpus. |
| `directive-colon-bullets` | 3 | yes | Live. The pattern is simply absent from this corpus. |
| `emotional-flatline` | 2 | yes | Live. The pattern is simply absent from this corpus. |
| `faux-insight` | 2 | yes | Live. The pattern is simply absent from this corpus. |
| `fiction-claudeism` | 3 | yes | Live. The pattern is simply absent from this corpus. |
| `fiction-slop-phrase` | 2 | yes | Live. The pattern is simply absent from this corpus. |
| `future-narrative` | 12 | yes | Live. The pattern is simply absent from this corpus. |
| `generic-conclusion` | 3 | yes | Live. The pattern is simply absent from this corpus. |
| `invalid-isbn` | 3 | yes | Live. The pattern is simply absent from this corpus. |
| `kobak-density` | 2 | yes | Live. The pattern is simply absent from this corpus. |
| `legacy-framing` | 3 | yes | Live. The pattern is simply absent from this corpus. |
| `liang-cluster` | 2 | yes | Live. The pattern is simply absent from this corpus. |
| `lingering-attention` | 3 | yes | Live. The pattern is simply absent from this corpus. |
| `math-alphanumeric` | 12 | yes | Live. The pattern is simply absent from this corpus. |
| `mic-drop-paragraph` | 2 | n/a | Whole-document rhythm threshold; see the headroom table below. |
| `narrative-cliche` | 3 | yes | Live. The pattern is simply absent from this corpus. |
| `notability-canned` | 2 | yes | Live. The pattern is simply absent from this corpus. |
| `novelty-inflation` | 3 | yes | Live. The pattern is simply absent from this corpus. |
| `placeholder-token` | 10 | yes | Live. The pattern is simply absent from this corpus. |
| `pua-character` | 14 | yes | Live. The pattern is simply absent from this corpus. |
| `punchline-fragment-density` | 2 | n/a | Whole-document rhythm threshold; see the headroom table below. |
| `reasoning-artifact` | 6 | yes | Live. The pattern is simply absent from this corpus. |
| `rhetorical-qa` | 2 | yes | Live. The pattern is simply absent from this corpus. |
| `rhetorical-question` | 2 | yes | Live. The pattern is simply absent from this corpus. |
| `social-cta-closer` | 8 | yes | Live. The pattern is simply absent from this corpus. |
| `tier3-phrase-cluster` | 12 | yes | Live. The pattern is simply absent from this corpus. |
| `transition-stacking` | 3 | yes | Live. The pattern is simply absent from this corpus. |

Dead in the raw view but alive once markdown is stripped: `rhetorical-procedural-ratio`.

### The three unreachable thresholds

`mic-drop-paragraph`, `contrast-density` and `punchline-fragment-density` are
whole-document rhythm measures rather than string matches, so a synthetic probe
would prove little. Instead, here is how close the corpus actually gets:

| Rule | Gate | Highest value seen on AI | Highest on humans | Verdict |
| --- | --- | ---: | ---: | --- |
| `mic-drop-paragraph` | micDropParagraphs >= 2 | 1 | 1 | unreachable by one unit |
| `contrast-density` | contrastCount >= 4 and per-1000 >= 4 | 3 (count) | 1 | the count gate binds; never reached |
| `punchline-fragment-density` | count >= 4, rate >= 0.18, paragraph-final >= 2 | 7 / 0.22 / 3 | 4 / 0.17 / 2 | each maximum is reached, never jointly |

These read as mis-set thresholds rather than dormant patterns. They should be
either re-derived from data or removed; leaving them shipped costs nothing in
score but overstates the size of the rule set.

One incidental find: `tier3-phrase-cluster` never fires because `TIER3_PHRASES`
is inherited crypto and web3 whitepaper vocabulary (`tokenized incentive
structures`, `decentralized compute`, `reward emissions`). It is a live rule
aimed at a corpus we do not process.

## Harmful rules — fire more on humans than on AI

| Rule | Weight | AI raw | Human raw | AI stripped | Human stripped | LR | q (raw) | Significant? |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `passive-ratio` | 3 | 14 (0.8%) | 8 (4.7%) | 16 (0.9%) | 8 (4.7%) | 0.17 | 0.003 | **yes** |
| `token-cutoff` | 2 | 10 (0.6%) | 6 (3.6%) | 21 (1.2%) | 6 (3.6%) | 0.16 | 0.012 | **yes** |
| `title-case-header` | 4 | 0 (0.0%) | 1 (0.6%) | 3 (0.2%) | 1 (0.6%) | 0.03 | 0.44 | no — within noise |
| `low-specificity` | 2 | 10 (0.6%) | 3 (1.8%) | 20 (1.2%) | 3 (1.8%) | 0.30 | 0.47 | no — within noise |
| `tier1-clarity` | 3 | 183 (10.6%) | 24 (14.2%) | 183 (10.6%) | 24 (14.2%) | 0.74 | 0.67 | no — within noise |
| `parenthetical-hedge` | 3 | 1 (0.1%) | 1 (0.6%) | 2 (0.1%) | 1 (0.6%) | 0.10 | 0.71 | no — within noise |
| `not-just-contrast` | 6 | 8 (0.5%) | 2 (1.2%) | 8 (0.5%) | 2 (1.2%) | 0.33 | 0.86 | no — within noise |
| `smart-punct-signature` | 6 | 30 (1.7%) | 5 (3.0%) | 76 (4.4%) | 5 (3.0%) | 0.55 | 0.86 | no — within noise |
| `normalization-flag` | 9 | 10 (0.6%) | 2 (1.2%) | 9 (0.5%) | 2 (1.2%) | 0.41 | 0.94 | no — within noise |
| `adjacent-lemma-repeat` | 3 | 271 (15.7%) | 30 (17.8%) | 307 (17.8%) | 30 (17.8%) | 0.88 | 1.00 | no — within noise |
| `didactic-note` | 2 | 10 (0.6%) | 1 (0.6%) | 10 (0.6%) | 1 (0.6%) | 0.69 | 1.00 | no — within noise |
| `hollow-intensifier` | 2 | 75 (4.3%) | 9 (5.3%) | 75 (4.3%) | 9 (5.3%) | 0.78 | 1.00 | no — within noise |
| `quote-inconsistency` | 2 | 12 (0.7%) | 2 (1.2%) | 12 (0.7%) | 2 (1.2%) | 0.49 | 1.00 | no — within noise |
| `real-actual-inflation` | 5 | 6 (0.3%) | 1 (0.6%) | 6 (0.3%) | 1 (0.6%) | 0.43 | 1.00 | no — within noise |
| `setup-expansion-cadence` | 3 | 253 (14.6%) | 22 (13.0%) | 159 (9.2%) | 22 (13.0%) | 1.11 | 1.00 | no — within noise |
| `staccato-fragments` | 3 | 50 (2.9%) | 7 (4.1%) | 36 (2.1%) | 7 (4.1%) | 0.66 | 1.00 | no — within noise |
| `vague-attribution` | 5 | 19 (1.1%) | 2 (1.2%) | 19 (1.1%) | 2 (1.2%) | 0.77 | 1.00 | no — within noise |

Two of these are real: `passive-ratio` fires on 4.7% of humans against 0.8% of AI
(driven by Wikipedia articles, 6 of 32), and `token-cutoff` on 3.6% of humans
against 0.6% of AI (3 of 6 medical Q&A answers). The other fifteen point the
wrong way but are not distinguishable from chance at this sample size. They
should still not be adding points to an AI score, because nothing here supports
the claim that they belong on the AI side of the ledger.

## Redundant rules

Two measures are reported. **Conditional overlap** — P(partner fires | rule
fires) — is what was commissioned, but on its own it is misleading: a rule that
fires on two thirds of everything is an 0.8+ 'partner' of nearly every other
rule without being redundant with it. **Jaccard** (shared firings over combined
firings) is symmetric and does not have that flaw, so the recommendations use it.

### Genuine near-duplicates (Jaccard >= 0.6)

| Pair | Jaccard | Reading |
| --- | ---: | --- |
| `formatting` + `markdown-bold` | 0.89 | the same bold/heading furniture counted twice |
| `formatting` + `markdown-furniture` | 0.79 | the same bold/heading furniture counted twice |
| `markdown-bold` + `markdown-furniture` | 0.88 | the same bold/heading furniture counted twice |

The markdown cluster — `formatting`, `markdown-bold`, `markdown-furniture` —
is one signal wearing three hats. `markdown-heading` and `heading-inflation`
(Jaccard 0.50) are close behind. The escalation policy already collapses the
furniture categories for the breadth gate, which is an implicit admission of
the same fact; the raw score does not, and so triple-counts it.

### All pairs with conditional overlap >= 0.8

| Rule | Partner | P(partner \| rule) | Jaccard | Lift over partner's own base rate |
| --- | --- | ---: | ---: | ---: |
| `bold-label-bullets` | `markdown-bold` | 1.00 | 0.42 | 1.52 |
| `bold-label-bullets` | `markdown-furniture` | 1.00 | 0.37 | 1.34 |
| `bullet-np-list` | `markdown-furniture` | 1.00 | 0.07 | 1.34 |
| `formatting` | `markdown-bold` | 1.00 | 0.89 | 1.52 |
| `formatting` | `markdown-furniture` | 1.00 | 0.79 | 1.34 |
| `heading-inflation` | `markdown-furniture` | 1.00 | 0.19 | 1.34 |
| `heading-inflation` | `markdown-heading` | 1.00 | 0.50 | 3.56 |
| `markdown-bold` | `markdown-furniture` | 1.00 | 0.88 | 1.34 |
| `markdown-heading` | `markdown-furniture` | 1.00 | 0.38 | 1.34 |
| `sentence-length-spectral-flatness` | `markdown-furniture` | 1.00 | 0.03 | 1.34 |
| `bold-label-bullets` | `formatting` | 0.98 | 0.46 | 1.68 |
| `uniform-list-items` | `markdown-furniture` | 0.98 | 0.19 | 1.31 |
| `sentence-length-spectral-flatness` | `markdown-bold` | 0.97 | 0.03 | 1.48 |
| `lexical-register-distance` | `markdown-furniture` | 0.97 | 0.14 | 1.30 |
| `lets-construction` | `markdown-furniture` | 0.96 | 0.02 | 1.29 |
| `markdown-heading` | `markdown-bold` | 0.94 | 0.39 | 1.43 |
| `lexical-register-distance` | `markdown-bold` | 0.94 | 0.15 | 1.43 |
| `tricolon-density` | `markdown-furniture` | 0.94 | 0.04 | 1.26 |
| `conditional-compression` | `markdown-furniture` | 0.94 | 0.05 | 1.26 |
| `lexical-register-distance` | `formatting` | 0.92 | 0.16 | 1.57 |
| `tricolon-density` | `formatting` | 0.92 | 0.05 | 1.57 |
| `tricolon-density` | `markdown-bold` | 0.92 | 0.05 | 1.41 |
| `heading-inflation` | `markdown-bold` | 0.92 | 0.19 | 1.40 |
| `sentence-length-spectral-flatness` | `formatting` | 0.92 | 0.03 | 1.56 |
| `cutoff-disclaimer` | `formatting` | 0.91 | 0.02 | 1.55 |
| `cutoff-disclaimer` | `markdown-bold` | 0.91 | 0.02 | 1.38 |
| `cutoff-disclaimer` | `markdown-furniture` | 0.91 | 0.01 | 1.22 |
| `tier1` | `markdown-furniture` | 0.91 | 0.25 | 1.22 |
| `pivotal-role` | `markdown-bold` | 0.90 | 0.01 | 1.37 |
| `pivotal-role` | `markdown-furniture` | 0.90 | 0.01 | 1.21 |
| `markdown-bold` | `formatting` | 0.89 | 0.89 | 1.52 |
| `uniform-list-items` | `markdown-bold` | 0.89 | 0.19 | 1.36 |
| `cross-para-burstiness` | `markdown-furniture` | 0.89 | 0.05 | 1.19 |
| `markdown-heading` | `formatting` | 0.88 | 0.40 | 1.50 |
| `markdown-furniture` | `markdown-bold` | 0.88 | 0.88 | 1.34 |
| `setup-expansion-cadence` | `markdown-furniture` | 0.88 | 0.17 | 1.18 |
| `heading-inflation` | `formatting` | 0.88 | 0.20 | 1.49 |
| `tier2` | `markdown-furniture` | 0.88 | 0.01 | 1.18 |
| `conditional-compression` | `markdown-bold` | 0.87 | 0.05 | 1.33 |
| `ai-placeholder` | `markdown-furniture` | 0.87 | 0.02 | 1.16 |
| `uniform-list-items` | `formatting` | 0.86 | 0.20 | 1.47 |
| `cross-para-burstiness` | `markdown-bold` | 0.86 | 0.05 | 1.31 |
| `em-dash-density` | `markdown-furniture` | 0.85 | 0.17 | 1.15 |
| `arrow-decoration` | `markdown-furniture` | 0.85 | 0.02 | 1.14 |
| `tier1` | `markdown-bold` | 0.84 | 0.26 | 1.28 |
| `uniform-sections` | `markdown-furniture` | 0.84 | 0.07 | 1.13 |
| `tier2` | `markdown-bold` | 0.83 | 0.02 | 1.27 |
| `lets-construction` | `markdown-bold` | 0.83 | 0.02 | 1.26 |
| `setup-expansion-cadence` | `markdown-bold` | 0.83 | 0.18 | 1.26 |
| `low-ttr` | `markdown-furniture` | 0.82 | 0.11 | 1.11 |
| `transition` | `markdown-furniture` | 0.82 | 0.14 | 1.10 |
| `chatbot` | `markdown-furniture` | 0.82 | 0.08 | 1.10 |
| `punct-distribution` | `markdown-furniture` | 0.81 | 0.06 | 1.09 |
| `arrow-decoration` | `markdown-bold` | 0.81 | 0.02 | 1.23 |
| `pivotal-role` | `formatting` | 0.80 | 0.01 | 1.36 |

Read the lift column first. Where it sits near 1.0 the overlap is just the
partner's own high firing rate, not redundancy.

## Statistically supported rules

Only these 17 rules clear Benjamini–Hochberg q<0.05 in the raw view.

| Rule | AI | Human | Precision (95% CI) | Lift | LR (95% CI) | q | Contribution |
| --- | ---: | ---: | --- | ---: | --- | ---: | ---: |
| `markdown-furniture` | 1410 (81.6%) | 1 (0.6%) | 99.9% (100%–100%) | 1.10 | 92.5 (18.8–455.2) | 5.1e-107 | -14.24 pp |
| `markdown-bold` | 1245 (72.1%) | 0 (0.0%) | 100.0% (100%–100%) | 1.10 | 245.1 (15.4–3902.6) | 1.7e-84 | -8.34 pp |
| `formatting` | 1114 (64.5%) | 0 (0.0%) | 100.0% (100%–100%) | 1.10 | 219.3 (13.8–3492.4) | 2.5e-69 | -6.25 pp |
| `markdown-heading` | 532 (30.8%) | 0 (0.0%) | 100.0% (99%–100%) | 1.10 | 104.8 (6.6–1669.8) | 1.1e-24 | -1.62 pp |
| `bold-label-bullets` | 525 (30.4%) | 0 (0.0%) | 100.0% (99%–100%) | 1.10 | 103.4 (6.5–1647.8) | 3.6e-24 | -3.30 pp |
| `uniform-list-items` | 272 (15.7%) | 0 (0.0%) | 100.0% (99%–100%) | 1.10 | 53.6 (3.4–855.5) | 4.1e-11 | -1.22 pp |
| `heading-inflation` | 264 (15.3%) | 0 (0.0%) | 100.0% (99%–100%) | 1.10 | 52.0 (3.3–830.5) | 6.0e-11 | -0.35 pp |
| `tier1` | 394 (22.8%) | 11 (6.5%) | 97.3% (95%–98%) | 1.07 | 3.4 (1.9–5.9) | 9.1e-07 | -2.66 pp |
| `lexical-register-distance` | 198 (11.5%) | 1 (0.6%) | 99.5% (97%–100%) | 1.09 | 13.0 (2.6–64.4) | 1.4e-06 | -0.12 pp |
| `chatbot` | 146 (8.5%) | 0 (0.0%) | 100.0% (97%–100%) | 1.10 | 28.8 (1.8–461.0) | 1.3e-05 | -2.43 pp |
| `uniform-sections` | 124 (7.2%) | 0 (0.0%) | 100.0% (97%–100%) | 1.10 | 24.5 (1.5–392.1) | 1.1e-04 | -0.87 pp |
| `bullet-np-list` | 92 (5.3%) | 0 (0.0%) | 100.0% (96%–100%) | 1.10 | 18.2 (1.1–291.9) | 0.002 | -0.58 pp |
| `passive-ratio` | 14 (0.8%) | 8 (4.7%) | 63.6% (43%–80%) | 0.70 | 0.2 (0.1–0.4) | 0.003 | -0.06 pp |
| `transition` | 238 (13.8%) | 8 (4.7%) | 96.7% (94%–98%) | 1.06 | 2.8 (1.4–5.4) | 0.003 | -1.10 pp |
| `conditional-compression` | 78 (4.5%) | 0 (0.0%) | 100.0% (95%–100%) | 1.10 | 15.4 (1.0–248.0) | 0.007 | -0.17 pp |
| `token-cutoff` | 10 (0.6%) | 6 (3.6%) | 62.5% (39%–82%) | 0.69 | 0.2 (0.1–0.4) | 0.012 | +0.00 pp |
| `tricolon-density` | 65 (3.8%) | 0 (0.0%) | 100.0% (94%–100%) | 1.10 | 12.9 (0.8–207.3) | 0.022 | -0.06 pp |

The remaining 96 rules cannot be validated at this sample size. That is
not the same as saying they are wrong. It means the corpus cannot tell the
difference between them and a coin, and any weight they carry is an assertion,
not a measurement. Full numbers for all 113 are in the appendix table and in
`rule-stats.json`.

## Per-vendor and per-era firing

Rules firing on at least 3% of AI text, where the highest vendor rate is at
least three times the lowest (or some vendor never triggers it). A rule in this
table is a vendor fingerprint, not a general AI tell, and should not be sold as one.

| Rule | anthropic | deepseek | google | grok | meta | mistral | openai | Skew |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `formatting` | 30% | 95% | 85% | 65% | 77% | 91% | 43% | 3.2x |
| `markdown-heading` | 11% | 65% | 10% | 68% | 17% | 67% | 31% | 6.6x |
| `bold-label-bullets` | 7% | 60% | 59% | 34% | 19% | 47% | 15% | 9.0x |
| `em-dash-density` | 18% | 31% | 6% | 19% | 7% | 30% | 16% | 5.1x |
| `uniform-list-items` | 14% | 18% | 13% | 6% | 31% | 19% | 9% | 5.2x |
| `adjacent-lemma-repeat` | 8% | 5% | 14% | 12% | 32% | 10% | 19% | 6.9x |
| `heading-inflation` | 7% | 37% | 3% | 13% | 10% | 43% | 18% | 14.2x |
| `setup-expansion-cadence` | 6% | 26% | 17% | 12% | 16% | 21% | 13% | 4.6x |
| `transition` | 4% | 6% | 25% | 19% | 23% | 5% | 10% | 5.8x |
| `lexical-register-distance` | 4% | 21% | 9% | 7% | 17% | 21% | 8% | 5.3x |
| `low-ttr` | 2% | 6% | 9% | 9% | 25% | 9% | 9% | 12.3x |
| `chatbot` | 21% | 7% | 1% | 5% | 4% | 7% | 10% | 21.0x |
| `uniform-sections` | 16% | 7% | 5% | 3% | 3% | 9% | 6% | 4.9x |
| `sentence-flatline` | 6% | 1% | 1% | 4% | 5% | 2% | 15% | 22.7x |
| `punct-distribution` | 2% | 3% | 6% | 14% | 9% | 4% | 5% | 8.4x |
| `bullet-np-list` | 11% | 5% | 3% | 2% | 4% | 7% | 5% | 5.5x |
| `conditional-compression` | 1% | 13% | 4% | 3% | 6% | 6% | 3% | 9.5x |
| `hollow-intensifier` | 7% | 3% | 8% | 7% | 3% | 5% | 1% | 15.1x |
| `filler` | 2% | 3% | 4% | 4% | 4% | 9% | 5% | 4.7x |
| `cross-para-burstiness` | 0% | 3% | 7% | 5% | 7% | 3% | 3% | inf |
| `tricolon-density` | 1% | 3% | 5% | 4% | 8% | 5% | 2% | 7.7x |

### Era

The 2022-23 slice is openai-only (150 samples), so era and vendor are partly
confounded. Rules with the largest era gradient, raw view:

| Rule | 2022-23 (n=150) | 2024-25 (n=527) | 2025-26 (n=1050) |
| --- | ---: | ---: | ---: |
| `markdown-furniture` | 0% | 85% | 92% |
| `markdown-bold` | 0% | 63% | 87% |
| `formatting` | 0% | 57% | 77% |
| `markdown-heading` | 0% | 12% | 45% |
| `bold-label-bullets` | 0% | 27% | 36% |
| `sentence-flatline` | 31% | 7% | 2% |
| `tier1` | 0% | 22% | 26% |
| `heading-inflation` | 0% | 6% | 22% |
| `uniform-list-items` | 1% | 23% | 14% |
| `em-dash-density` | 1% | 7% | 22% |
| `setup-expansion-cadence` | 1% | 11% | 19% |
| `lexical-register-distance` | 0% | 9% | 14% |
| `escaped-markup-literal` | 13% | 0% | 0% |
| `adjacent-lemma-repeat` | 22% | 21% | 12% |
| `uniform-sections` | 1% | 10% | 7% |

The markdown furniture rules fire on 30-40% of 2022-23 output and 80-90% of
2025-26 output. That is a genuine drift in how models format answers, and it is
the main reason the detector looks strong on recent models. It is also fragile:
it is a habit of the chat interface, not of the language model.

## Human-genre exposure

**Read the counts, not the percentages.** The genre buckets are:

| Genre | n |
| --- | ---: |
| qa-finance | 71 |
| wikipedia-article | 32 |
| qa-wiki_csai | 20 |
| business-marketing | 10 |
| blog-editorial | 8 |
| qa-medicine | 6 |
| technical | 6 |
| journalism | 6 |
| casual-forum | 4 |
| non-native | 4 |
| academic | 2 |

With 10 business-marketing texts, 2 hits is 20% and 3 hits is 30%. Those are
not rates; they are flags for a bigger human corpus to settle.

| Rule | Human fires | Worst genre | Business-marketing |
| --- | ---: | --- | ---: |
| `adjacent-lemma-repeat` | 30/169 | academic 2/2 | 1/10 |
| `tier1-clarity` | 24/169 | technical 2/6 | 3/10 |
| `tier1` | 11/169 | business-marketing 4/10 | 4/10 |
| `hollow-intensifier` | 9/169 | academic 1/2 | 3/10 |
| `low-ttr` | 8/169 | technical 2/6 | 2/10 |
| `staccato-fragments` | 7/169 | non-native 1/4 | 2/10 |
| `token-cutoff` | 6/169 | qa-medicine 3/6 | 0/10 |
| `smart-punct-signature` | 5/169 | business-marketing 3/10 | 3/10 |
| `cross-para-burstiness` | 3/169 | technical 2/6 | 1/10 |
| `vague-attribution` | 2/169 | journalism 2/6 | 0/10 |

`tier1` is the one to watch: it fires on 4 of the 10 business-marketing humans.
It is also the fifth-largest contributor in the raw view and the largest in the
stripped view. That is the trade-off in one line — the vocabulary rule that does
the most work is also the rule most likely to flag a marketing writer who says
'comprehensive' and 'seamless' because that is how the client's brief reads.

## Weight audit

**The shipped weights were not fitted to this data.** They were adapted from the
upstream MIT-licensed `avoid-ai-writing` detector and extended by editorial
judgement during the 2026.08 rule harvests. This is the first time they have
been compared against measured evidence.

Method: a weight should be proportional to the evidence one firing provides,
which is the log of the likelihood ratio. We use the **lower** bound of the 95%
interval on the LR, so the proposal is conservative, and scale it by a single
constant (k = 1.221) fitted by least squares against the shipped weights of
the rules that are statistically supported — so the overall score scale is
preserved and only the relative weights move.

Three caveats that limit what this table can be used for:

- **No proposal is made for a rule that never fires on a human.** With zero human
  firings the lower bound on the likelihood ratio is set by the smoothing and by
  n=169, not by the rule; the corpus cannot separate a weight of 6 from a weight of
  15. Those rules keep their shipped weight and their entry says so. This is why
  `chatbot` (146 AI firings, 0 human, LR 29) is *not* in the reweight list despite
  looking mispriced — the honest answer is that we cannot price it yet.
- The proposal measures evidence **per firing**. A rule with modest evidence that
  fires often can still contribute more detection than a strong rule that rarely
  fires. `tier1` is exactly that case: proposed weight 1 to 2, but fifth by
  contribution in the raw view and first in the stripped view.
- Use the proposals to fix contradictions, not as a drop-in table.

| Rule | Shipped | Proposed (conservative) | Proposed (central) | Delta | LR (95% CI) | Basis |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| `normalization-flag` | 9 | 0 | - | -9 | 0.41 (0.10–1.63) | fires more on humans than AI in this corpus |
| `not-just-contrast` | 6 | 0 | - | -6 | 0.33 (0.08–1.36) | fires more on humans than AI in this corpus |
| `smart-punct-signature` | 6 | 0 | - | -6 | 0.55 (0.22–1.33) | fires more on humans than AI in this corpus |
| `real-actual-inflation` | 5 | 0 | - | -5 | 0.43 (0.07–2.50) | fires more on humans than AI in this corpus |
| `vague-attribution` | 5 | 0 | - | -5 | 0.77 (0.21–2.84) | fires more on humans than AI in this corpus |
| `tier1` | 5 | 1 | 2 | -4 | 3.37 (1.92–5.94) | fitted from the measured likelihood ratio (conservative = lower 95% bound) |
| `title-case-header` | 4 | 0 | - | -4 | 0.03 (0.00–0.80) | fires more on humans than AI in this corpus |
| `adjacent-lemma-repeat` | 3 | 0 | - | -3 | 0.88 (0.62–1.23) | fires more on humans than AI in this corpus |
| `parenthetical-hedge` | 3 | 0 | - | -3 | 0.10 (0.01–0.94) | fires more on humans than AI in this corpus |
| `passive-ratio` | 3 | 0 | - | -3 | 0.17 (0.07–0.39) | fires more on humans than AI in this corpus |
| `staccato-fragments` | 3 | 0 | - | -3 | 0.66 (0.31–1.40) | fires more on humans than AI in this corpus |
| `tier1-clarity` | 3 | 0 | - | -3 | 0.74 (0.50–1.09) | fires more on humans than AI in this corpus |
| `didactic-note` | 2 | 0 | - | -2 | 0.69 (0.13–3.78) | fires more on humans than AI in this corpus |
| `hollow-intensifier` | 2 | 0 | - | -2 | 0.78 (0.41–1.51) | fires more on humans than AI in this corpus |
| `low-specificity` | 2 | 0 | - | -2 | 0.30 (0.09–0.98) | fires more on humans than AI in this corpus |
| `quote-inconsistency` | 2 | 0 | - | -2 | 0.49 (0.13–1.90) | fires more on humans than AI in this corpus |
| `token-cutoff` | 2 | 0 | - | -2 | 0.16 (0.06–0.42) | fires more on humans than AI in this corpus |
| `transition` | 2 | 1 | 2 | -1 | 2.76 (1.42–5.37) | fitted from the measured likelihood ratio (conservative = lower 95% bound) |
| `markdown-furniture` | 4 | 5 | 8 | +1 | 92.51 (18.80–455.18) | fitted from the measured likelihood ratio (conservative = lower 95% bound) |

For the remaining 93 rules no evidence-based weight can be proposed. They split
three ways:

- 32 are dead here, so their weight is untestable on this corpus.
- 48 fire on AI but never on a human, so the corpus cannot bound their weight from above:
  `ai-placeholder`, `bold-label-bullets`, `bullet-np-list`, `by-ving-template`, `chatbot`, `conclusion-cta`, `conditional-compression`, `confidence-calibration`, `cutoff-disclaimer`, `emoji-decoration`, `escaped-markup-literal`, `false-concession`, `fiction-promptonym`, `fnword-trigram-entropy`, `focal-density`, `formatting`, `formulaic-opener`, `hashtag-stuff`, `heading-inflation`, `lets-construction`, `markdown-bold`, `markdown-heading`, `metaphor-cluster`, `neg-parallelism`, `outcome-tail`, `owner-phrase`, `owner-phrase-b`, `owner-vocab-b`, `participial-tail`, `pivotal-role`, `power-verb-compound`, `promo-travel`, `proximity-cluster`, `reasoning-leak`, `sentence-length-spectral-flatness`, `significance-inflation`, `speculative-opener`, `sycophantic`, `teach-preach-headings`, `template-phrase`, `tier3`, `tier3-phrase`, `tricolon-density`, `tripled-negation`, `uniform-list-items`, `uniform-sections`, `uniformity`, `valuable-insights`.
- the rest are not distinguishable from chance at n=169.

Their shipped weights stand on judgement alone, and this report does not dress
that up as data.

## Appendix: all 113 rules

| Rule | W | Corrob? | AI raw | Hu raw | AI strip | Hu strip | Prec | Lift | LR | q raw | Contrib raw | Contrib strip | Action |
| --- | ---: | :-: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `markdown-furniture` | 4 | y | 1410 | 1 | 0 | 0 | 99.9% | 1.10 | 92.5 | 5.1e-107 | -14.24 | +0.00 | KEEP |
| `markdown-bold` | 3 | y | 1245 | 0 | 0 | 0 | 100.0% | 1.10 | 245.1 | 1.7e-84 | -8.34 | +0.00 | DEMOTE (redundant) |
| `formatting` | 3 |  | 1114 | 0 | 0 | 0 | 100.0% | 1.10 | 219.3 | 2.5e-69 | -6.25 | +0.00 | DEMOTE (redundant) |
| `bold-label-bullets` | 3 | y | 525 | 0 | 0 | 0 | 100.0% | 1.10 | 103.4 | 3.6e-24 | -3.30 | +0.00 | KEEP |
| `tier1` | 5 |  | 394 | 11 | 394 | 11 | 97.3% | 1.07 | 3.4 | 9.1e-07 | -2.66 | -8.80 | REWEIGHT |
| `chatbot` | 8 |  | 146 | 0 | 146 | 0 | 100.0% | 1.10 | 28.8 | 1.3e-05 | -2.43 | -5.15 | KEEP |
| `em-dash-density` | 4 |  | 272 | 16 | 278 | 16 | 94.4% | 1.04 | 1.6 | 0.18 | -1.85 | -2.26 | DEMOTE (unsupported) |
| `markdown-heading` | 3 | y | 532 | 0 | 0 | 0 | 100.0% | 1.10 | 104.8 | 1.1e-24 | -1.62 | +0.00 | KEEP |
| `sentence-flatline` | 5 |  | 104 | 4 | 110 | 4 | 96.3% | 1.06 | 2.3 | 0.29 | -1.56 | -1.80 | DEMOTE (unsupported) |
| `adjacent-lemma-repeat` | 3 | y | 271 | 30 | 307 | 30 | 90.0% | 0.99 | 0.9 | 1.00 | -1.39 | -2.26 | REMOVE OR DEMOTE (harmful) |
| `uniform-list-items` | 4 |  | 272 | 0 | 0 | 0 | 100.0% | 1.10 | 53.6 | 4.1e-11 | -1.22 | +0.00 | KEEP |
| `transition` | 2 |  | 238 | 8 | 238 | 8 | 96.7% | 1.06 | 2.8 | 0.003 | -1.10 | -1.62 | KEEP |
| `punct-distribution` | 6 |  | 98 | 2 | 97 | 2 | 98.0% | 1.08 | 3.9 | 0.063 | -0.87 | -1.56 | DEMOTE (unsupported) |
| `tier1-clarity` | 3 |  | 183 | 24 | 183 | 24 | 88.4% | 0.97 | 0.7 | 0.67 | -0.87 | -2.03 | REMOVE OR DEMOTE (harmful) |
| `uniform-sections` | 5 |  | 124 | 0 | 103 | 0 | 100.0% | 1.10 | 24.5 | 1.1e-04 | -0.87 | -1.39 | KEEP |
| `low-ttr` | 3 |  | 178 | 8 | 177 | 8 | 95.7% | 1.05 | 2.1 | 0.12 | -0.81 | -0.75 | DEMOTE (unsupported) |
| `setup-expansion-cadence` | 3 | y | 253 | 22 | 159 | 22 | 92.0% | 1.01 | 1.1 | 1.00 | -0.81 | -1.74 | REMOVE OR DEMOTE (harmful) |
| `bullet-np-list` | 10 |  | 92 | 0 | 0 | 0 | 100.0% | 1.10 | 18.2 | 0.002 | -0.58 | +0.00 | KEEP |
| `cross-para-burstiness` | 5 |  | 69 | 3 | 77 | 3 | 95.8% | 1.05 | 2.0 | 0.82 | -0.35 | -0.41 | DEMOTE (unsupported) |
| `heading-inflation` | 3 | y | 264 | 0 | 0 | 0 | 100.0% | 1.10 | 52.0 | 6.0e-11 | -0.35 | +0.00 | KEEP (low contribution) |
| `owner-phrase` | 5 |  | 18 | 0 | 18 | 0 | 100.0% | 1.10 | 3.6 | 1.00 | -0.35 | -0.52 | DEMOTE (unsupported) |
| `ai-placeholder` | 10 |  | 30 | 0 | 31 | 0 | 100.0% | 1.10 | 6.0 | 0.47 | -0.29 | -0.98 | DEMOTE (unsupported) |
| `escaped-markup-literal` | 3 | y | 21 | 0 | 21 | 0 | 100.0% | 1.10 | 4.2 | 0.86 | -0.29 | -0.35 | DEMOTE (unsupported) |
| `filler` | 2 |  | 73 | 6 | 73 | 6 | 92.4% | 1.01 | 1.1 | 1.00 | -0.29 | -0.52 | DEMOTE (unsupported) |
| `staccato-fragments` | 3 | y | 50 | 7 | 36 | 7 | 87.7% | 0.96 | 0.7 | 1.00 | -0.29 | -0.46 | REMOVE OR DEMOTE (harmful) |
| `hedge-stack` | 6 |  | 13 | 1 | 15 | 1 | 92.9% | 1.02 | 0.9 | 1.00 | -0.23 | -0.29 | DEMOTE (unsupported) |
| `hollow-intensifier` | 2 |  | 75 | 9 | 75 | 9 | 89.3% | 0.98 | 0.8 | 1.00 | -0.23 | -0.23 | REMOVE OR DEMOTE (harmful) |
| `vague-attribution` | 5 |  | 19 | 2 | 19 | 2 | 90.5% | 0.99 | 0.8 | 1.00 | -0.23 | -0.58 | REMOVE OR DEMOTE (harmful) |
| `conditional-compression` | 2 | y | 78 | 0 | 47 | 0 | 100.0% | 1.10 | 15.4 | 0.007 | -0.17 | -0.12 | KEEP (low contribution) |
| `didactic-note` | 2 | y | 10 | 1 | 10 | 1 | 90.9% | 1.00 | 0.7 | 1.00 | -0.17 | -0.17 | REMOVE OR DEMOTE (harmful) |
| `sycophantic` | 8 |  | 16 | 0 | 16 | 0 | 100.0% | 1.10 | 3.2 | 1.00 | -0.17 | -0.41 | DEMOTE (unsupported) |
| `tier2` | 3 |  | 23 | 1 | 23 | 1 | 95.8% | 1.05 | 1.5 | 1.00 | -0.17 | -0.41 | DEMOTE (unsupported) |
| `acknowledgment-loop` | 3 |  | 17 | 1 | 17 | 1 | 94.4% | 1.04 | 1.1 | 1.00 | -0.12 | -0.17 | DEMOTE (unsupported) |
| `arrow-decoration` | 4 |  | 25 | 1 | 25 | 1 | 96.2% | 1.06 | 1.7 | 1.00 | -0.12 | -0.23 | DEMOTE (unsupported) |
| `cutoff-disclaimer` | 10 |  | 22 | 0 | 22 | 0 | 100.0% | 1.10 | 4.4 | 0.86 | -0.12 | -0.93 | DEMOTE (unsupported) |
| `lets-construction` | 2 |  | 23 | 0 | 23 | 0 | 100.0% | 1.10 | 4.6 | 0.86 | -0.12 | -0.06 | DEMOTE (unsupported) |
| `lexical-register-distance` | 2 | y | 198 | 1 | 185 | 1 | 99.5% | 1.09 | 13.0 | 1.4e-06 | -0.12 | -0.93 | KEEP (low contribution) |
| `normalization-flag` | 9 |  | 10 | 2 | 9 | 2 | 83.3% | 0.91 | 0.4 | 0.94 | -0.12 | -0.35 | REMOVE OR DEMOTE (harmful) |
| `uniformity` | 5 |  | 9 | 0 | 10 | 0 | 100.0% | 1.10 | 1.9 | 1.00 | -0.12 | -0.12 | DEMOTE (unsupported) |
| `fiction-promptonym` | 3 | y | 2 | 0 | 2 | 0 | 100.0% | 1.10 | 0.5 | 1.00 | -0.06 | +0.00 | DEMOTE (unsupported) |
| `fnword-trigram-entropy` | 5 |  | 8 | 0 | 8 | 0 | 100.0% | 1.10 | 1.7 | 1.00 | -0.06 | -0.12 | DEMOTE (unsupported) |
| `low-specificity` | 2 | y | 10 | 3 | 20 | 3 | 76.9% | 0.84 | 0.3 | 0.47 | -0.06 | -0.23 | REMOVE OR DEMOTE (harmful) |
| `passive-ratio` | 3 | y | 14 | 8 | 16 | 8 | 63.6% | 0.70 | 0.2 | 0.003 | -0.06 | -0.12 | REMOVE OR DEMOTE (harmful) |
| `sentence-length-spectral-flatness` | 2 | y | 36 | 0 | 11 | 0 | 100.0% | 1.10 | 7.2 | 0.36 | -0.06 | +0.00 | DEMOTE (unsupported) |
| `smart-punct-signature` | 6 |  | 30 | 5 | 76 | 5 | 85.7% | 0.94 | 0.5 | 0.86 | -0.06 | -1.51 | REMOVE OR DEMOTE (harmful) |
| `tricolon-density` | 2 | y | 65 | 0 | 75 | 0 | 100.0% | 1.10 | 12.9 | 0.022 | -0.06 | -0.41 | KEEP (low contribution) |
| `valuable-insights` | 2 | y | 9 | 0 | 9 | 0 | 100.0% | 1.10 | 1.9 | 1.00 | -0.06 | +0.00 | DEMOTE (unsupported) |
| `ai-citation-markup` | 15 |  | 0 | 0 | 0 | 0 | - | - | 0.1 | 1.00 | +0.00 | +0.00 | KEEP (forensic insurance) |
| `ai-citation-token` | 15 |  | 0 | 0 | 0 | 0 | - | - | 0.1 | 1.00 | +0.00 | +0.00 | KEEP (forensic insurance) |
| `ai-utm-source` | 12 |  | 0 | 0 | 0 | 0 | - | - | 0.1 | 1.00 | +0.00 | +0.00 | KEEP (forensic insurance) |
| `buzzword-phrase` | 2 | y | 16 | 1 | 16 | 1 | 94.1% | 1.03 | 1.1 | 1.00 | +0.00 | -0.06 | DEMOTE (unsupported) |
| `by-ving-template` | 3 | y | 1 | 0 | 1 | 0 | 100.0% | 1.10 | 0.3 | 1.00 | +0.00 | +0.00 | DEMOTE (unsupported) |
| `conclusion-cta` | 6 |  | 1 | 0 | 1 | 0 | 100.0% | 1.10 | 0.3 | 1.00 | +0.00 | +0.00 | DEMOTE (unsupported) |
| `confidence-calibration` | 2 |  | 5 | 0 | 5 | 0 | 100.0% | 1.10 | 1.1 | 1.00 | +0.00 | -0.06 | DEMOTE (unsupported) |
| `contrast-density` | 2 | y | 0 | 0 | 0 | 0 | - | - | 0.1 | 1.00 | +0.00 | +0.00 | FIX OR REMOVE |
| `copula-avoidance` | 3 | y | 0 | 0 | 0 | 0 | - | - | 0.1 | 1.00 | +0.00 | +0.00 | DEMOTE (dormant) |
| `despite-challenges-arc` | 5 |  | 0 | 0 | 0 | 0 | - | - | 0.1 | 1.00 | +0.00 | +0.00 | DEMOTE (dormant) |
| `directive-colon-bullets` | 3 | y | 0 | 0 | 0 | 0 | - | - | 0.1 | 1.00 | +0.00 | +0.00 | DEMOTE (dormant) |
| `emoji-decoration` | 2 | y | 8 | 0 | 0 | 0 | 100.0% | 1.10 | 1.7 | 1.00 | +0.00 | +0.00 | DEMOTE (unsupported) |
| `emotional-flatline` | 2 |  | 0 | 0 | 0 | 0 | - | - | 0.1 | 1.00 | +0.00 | +0.00 | DEMOTE (dormant) |
| `false-concession` | 2 |  | 2 | 0 | 2 | 0 | 100.0% | 1.10 | 0.5 | 1.00 | +0.00 | +0.00 | DEMOTE (unsupported) |
| `faux-insight` | 2 | y | 0 | 0 | 0 | 0 | - | - | 0.1 | 1.00 | +0.00 | +0.00 | DEMOTE (dormant) |
| `fiction-claudeism` | 3 | y | 0 | 0 | 0 | 0 | - | - | 0.1 | 1.00 | +0.00 | +0.00 | DEMOTE (dormant) |
| `fiction-slop-phrase` | 2 | y | 0 | 0 | 0 | 0 | - | - | 0.1 | 1.00 | +0.00 | +0.00 | DEMOTE (dormant) |
| `focal-density` | 5 |  | 6 | 0 | 6 | 0 | 100.0% | 1.10 | 1.3 | 1.00 | +0.00 | -0.06 | DEMOTE (unsupported) |
| `formulaic-opener` | 8 |  | 1 | 0 | 1 | 0 | 100.0% | 1.10 | 0.3 | 1.00 | +0.00 | +0.00 | DEMOTE (unsupported) |
| `future-narrative` | 12 |  | 0 | 0 | 0 | 0 | - | - | 0.1 | 1.00 | +0.00 | +0.00 | DEMOTE (dormant) |
| `generic-conclusion` | 3 |  | 0 | 0 | 0 | 0 | - | - | 0.1 | 1.00 | +0.00 | +0.00 | DEMOTE (dormant) |
| `hashtag-stuff` | 12 |  | 6 | 0 | 6 | 0 | 100.0% | 1.10 | 1.3 | 1.00 | +0.00 | -0.17 | DEMOTE (unsupported) |
| `invalid-isbn` | 3 | y | 0 | 0 | 0 | 0 | - | - | 0.1 | 1.00 | +0.00 | +0.00 | DEMOTE (dormant) |
| `kobak-density` | 2 | y | 0 | 0 | 0 | 0 | - | - | 0.1 | 1.00 | +0.00 | +0.00 | DEMOTE (dormant) |
| `legacy-framing` | 3 | y | 0 | 0 | 0 | 0 | - | - | 0.1 | 1.00 | +0.00 | +0.00 | DEMOTE (dormant) |
| `liang-cluster` | 2 | y | 0 | 0 | 0 | 0 | - | - | 0.1 | 1.00 | +0.00 | +0.00 | DEMOTE (dormant) |
| `lingering-attention` | 3 |  | 0 | 0 | 0 | 0 | - | - | 0.1 | 1.00 | +0.00 | +0.00 | DEMOTE (dormant) |
| `math-alphanumeric` | 12 |  | 0 | 0 | 0 | 0 | - | - | 0.1 | 1.00 | +0.00 | +0.00 | KEEP (forensic insurance) |
| `metaphor-cluster` | 4 |  | 1 | 0 | 1 | 0 | 100.0% | 1.10 | 0.3 | 1.00 | +0.00 | +0.00 | DEMOTE (unsupported) |
| `mic-drop-paragraph` | 2 | y | 0 | 0 | 0 | 0 | - | - | 0.1 | 1.00 | +0.00 | +0.00 | FIX OR REMOVE |
| `narrative-cliche` | 3 | y | 0 | 0 | 0 | 0 | - | - | 0.1 | 1.00 | +0.00 | +0.00 | DEMOTE (dormant) |
| `neg-parallelism` | 5 |  | 3 | 0 | 3 | 0 | 100.0% | 1.10 | 0.7 | 1.00 | +0.00 | -0.06 | DEMOTE (unsupported) |
| `not-just-contrast` | 6 |  | 8 | 2 | 8 | 2 | 80.0% | 0.88 | 0.3 | 0.86 | +0.00 | -0.17 | REMOVE OR DEMOTE (harmful) |
| `notability-canned` | 2 | y | 0 | 0 | 0 | 0 | - | - | 0.1 | 1.00 | +0.00 | +0.00 | DEMOTE (dormant) |
| `novelty-inflation` | 3 |  | 0 | 0 | 0 | 0 | - | - | 0.1 | 1.00 | +0.00 | +0.00 | DEMOTE (dormant) |
| `outcome-tail` | 4 |  | 4 | 0 | 4 | 0 | 100.0% | 1.10 | 0.9 | 1.00 | +0.00 | +0.00 | DEMOTE (unsupported) |
| `owner-phrase-b` | 2 | y | 4 | 0 | 4 | 0 | 100.0% | 1.10 | 0.9 | 1.00 | +0.00 | +0.00 | DEMOTE (unsupported) |
| `owner-vocab-b` | 2 | y | 3 | 0 | 3 | 0 | 100.0% | 1.10 | 0.7 | 1.00 | +0.00 | -0.06 | DEMOTE (unsupported) |
| `parenthetical-hedge` | 3 |  | 1 | 1 | 2 | 1 | 50.0% | 0.55 | 0.1 | 0.71 | +0.00 | +0.00 | REMOVE OR DEMOTE (harmful) |
| `participial-tail` | 5 |  | 6 | 0 | 6 | 0 | 100.0% | 1.10 | 1.3 | 1.00 | +0.00 | -0.12 | DEMOTE (unsupported) |
| `pivotal-role` | 2 | y | 20 | 0 | 20 | 0 | 100.0% | 1.10 | 4.0 | 0.86 | +0.00 | -0.12 | DEMOTE (unsupported) |
| `placeholder-token` | 10 |  | 0 | 0 | 0 | 0 | - | - | 0.1 | 1.00 | +0.00 | +0.00 | KEEP (forensic insurance) |
| `power-verb-compound` | 6 |  | 4 | 0 | 4 | 0 | 100.0% | 1.10 | 0.9 | 1.00 | +0.00 | -0.06 | DEMOTE (unsupported) |
| `promo-travel` | 2 | y | 2 | 0 | 2 | 0 | 100.0% | 1.10 | 0.5 | 1.00 | +0.00 | -0.06 | DEMOTE (unsupported) |
| `proximity-cluster` | 2 | y | 2 | 0 | 2 | 0 | 100.0% | 1.10 | 0.5 | 1.00 | +0.00 | -0.06 | DEMOTE (unsupported) |
| `pua-character` | 14 |  | 0 | 0 | 0 | 0 | - | - | 0.1 | 1.00 | +0.00 | +0.00 | KEEP (forensic insurance) |
| `punchline-fragment-density` | 2 | y | 0 | 0 | 0 | 0 | - | - | 0.1 | 1.00 | +0.00 | +0.00 | FIX OR REMOVE |
| `quote-inconsistency` | 2 | y | 12 | 2 | 12 | 2 | 85.7% | 0.94 | 0.5 | 1.00 | +0.00 | -0.17 | REMOVE OR DEMOTE (harmful) |
| `real-actual-inflation` | 5 |  | 6 | 1 | 6 | 1 | 85.7% | 0.94 | 0.4 | 1.00 | +0.00 | -0.12 | REMOVE OR DEMOTE (harmful) |
| `reasoning-artifact` | 6 |  | 0 | 0 | 0 | 0 | - | - | 0.1 | 1.00 | +0.00 | +0.00 | DEMOTE (dormant) |
| `reasoning-leak` | 12 |  | 1 | 0 | 1 | 0 | 100.0% | 1.10 | 0.3 | 1.00 | +0.00 | -0.06 | DEMOTE (unsupported) |
| `rhetorical-procedural-ratio` | 2 | y | 0 | 0 | 1 | 0 | - | - | 0.1 | 1.00 | +0.00 | +0.00 | DEMOTE (unsupported) |
| `rhetorical-qa` | 2 | y | 0 | 0 | 0 | 0 | - | - | 0.1 | 1.00 | +0.00 | +0.00 | DEMOTE (dormant) |
| `rhetorical-question` | 2 |  | 0 | 0 | 0 | 0 | - | - | 0.1 | 1.00 | +0.00 | +0.00 | DEMOTE (dormant) |
| `significance-inflation` | 4 |  | 2 | 0 | 2 | 0 | 100.0% | 1.10 | 0.5 | 1.00 | +0.00 | +0.00 | DEMOTE (unsupported) |
| `social-cta-closer` | 8 |  | 0 | 0 | 0 | 0 | - | - | 0.1 | 1.00 | +0.00 | +0.00 | DEMOTE (dormant) |
| `speculative-opener` | 8 |  | 3 | 0 | 3 | 0 | 100.0% | 1.10 | 0.7 | 1.00 | +0.00 | +0.00 | DEMOTE (unsupported) |
| `teach-preach-headings` | 2 | y | 3 | 0 | 0 | 0 | 100.0% | 1.10 | 0.7 | 1.00 | +0.00 | +0.00 | DEMOTE (unsupported) |
| `template-phrase` | 3 |  | 3 | 0 | 3 | 0 | 100.0% | 1.10 | 0.7 | 1.00 | +0.00 | -0.06 | DEMOTE (unsupported) |
| `tier3` | 2 |  | 2 | 0 | 2 | 0 | 100.0% | 1.10 | 0.5 | 1.00 | +0.00 | +0.00 | DEMOTE (unsupported) |
| `tier3-phrase` | 3 |  | 1 | 0 | 1 | 0 | 100.0% | 1.10 | 0.3 | 1.00 | +0.00 | -0.06 | DEMOTE (unsupported) |
| `tier3-phrase-cluster` | 12 |  | 0 | 0 | 0 | 0 | - | - | 0.1 | 1.00 | +0.00 | +0.00 | DEMOTE (dormant) |
| `title-case-header` | 4 |  | 0 | 1 | 3 | 1 | 0.0% | 0.00 | 0.0 | 0.44 | +0.00 | +0.00 | REMOVE OR DEMOTE (harmful) |
| `token-cutoff` | 2 | y | 10 | 6 | 21 | 6 | 62.5% | 0.69 | 0.2 | 0.012 | +0.00 | -0.17 | REMOVE OR DEMOTE (harmful) |
| `transition-stacking` | 3 | y | 0 | 0 | 0 | 0 | - | - | 0.1 | 1.00 | +0.00 | +0.00 | DEMOTE (dormant) |
| `tripled-negation` | 5 |  | 1 | 0 | 2 | 0 | 100.0% | 1.10 | 0.3 | 1.00 | +0.00 | -0.06 | DEMOTE (unsupported) |

Full per-rule detail — per-provider, per-era, per-slice and per-genre counts,
confidence intervals, all three false-positive operating points and both
ablation variants — is in [`rule-stats.json`](rule-stats.json).

