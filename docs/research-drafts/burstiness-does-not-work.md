# The famous heuristics, measured

**Draft for build. Body copy begins at "The finding". Everything under "Notes for the builder" is
production instruction and must not be published.**

| | |
|---|---|
| Proposed URL | `/tools/ai/content-verification-integrity/research/ai-writing-myths-measured/` |
| Working title | Burstiness, em dashes and "delve": the folk signals, measured on 25,723 documents |
| Draft status | figures re-verified against source 30 August 2026; see the provenance table at the foot |
| Primary source | `services/local-engine/research/signal-science/SIGNAL-SCIENCE.md` §1, §2, §2.1–§2.5, §5.1, §7 |

---

## The finding

Sentence-length burstiness is the most widely repeated way of spotting machine-written text, and on
5,935 register-and-length-matched document pairs it scores an AUROC of 0.521. Chance is 0.500. The
effect size is Cliff's δ of −0.043, which is negligible and points the wrong way: machine prose is
marginally *more* variable in sentence length than human prose, not less. Set a threshold on it
strict enough that only one human document in a hundred is wrongly flagged, and it catches 2.5% of
machine documents.

Most of the other folk signals do no better. What does separate the two populations is a property
almost nobody names, and it runs opposite to the popular belief: machine prose repeats itself
**less** than human prose.

## How to read every number on this page

These are statistics over a corpus of documents. They are not detector outputs, so no threshold, no
model file and no runtime applies to any figure below, and none is printed. Where a detection rate
appears it is **single-feature detection at a fixed false-positive budget**: the threshold on that
one measurement is set so that 1% of human documents are wrongly flagged, and the rate reported is
the share of machine documents that clears it. That budget is stated with every such number.

The corpus is 25,723 documents: 10,890 machine, 14,833 human. They were assembled from six labelled
pools on this project, unified onto one label vocabulary and de-duplicated on a normalised text hash, which
removed 6,679 duplicates. Minimum document length 60 words. Two matched comparisons run throughout,
because the machine and human halves do not share a register mix and any pooled statistic would
partly measure register rather than authorship:

- **matched set**: 5,935 machine documents paired 1:1 with 5,935 human documents on register family
  and log word count;
- **fresh long-form**: 670 pairs drawn only from the long-form corpus, in the registers this tool
  targets.

Where the two disagree, both are given. Source for all of the above: `SIGNAL-SCIENCE.md` §1.

One caveat governs the whole page and is not a footnote. This is distributional evidence. Every
number describes what is typical of thousands of documents on each side. None of it says anything
about a single piece of writing, and none of these measurements is a detector or should be used as
one.

## Burstiness

| | matched set (5,935 pairs) | fresh long-form (670 pairs) |
|---|---:|---:|
| AUROC | **0.521** | 0.547 |
| Cliff's δ | −0.043 | — |
| detection at a 1% human false-positive budget | **2.5%** | 0.1% |

Sentence-length coefficient of variation, which is the same quantity computed a second way, returns
the same three figures. Sentence-length standard deviation, sometimes described as perplexity's
partner, reaches AUROC 0.633 on the matched set and 1.9% detection at the same budget.

Source: `signal-science/tables/famous-heuristics.md`, rows `rhy_burstiness`, `syn_cv_sent_len`,
`syn_sd_sent_len`.

Burstiness was a reasonable read of 2022 output. Early instruction-tuned models did produce evenly
metered sentences. Against a 2026 corpus the property has gone, and the metric that was built on it
has gone with it. There is a second, stranger result about burstiness at the end of this page.

## The vocabulary tells

The "AI words" list (delve, leverage, robust, tapestry, seamless) is the second casualty. On the
matched set it reaches AUROC 0.578 and 6.6% detection at a 1% budget; on fresh long-form 0.589 and
5.5%. In the per-source sweep described below it clears 0.65 on 5 of 33 pairings. Machine text does
use these words somewhat more often. The gap is nowhere near wide enough to accuse a writer with.

Six further heuristics sit at or beside chance on the matched set, with their detection at a 1%
budget in brackets: "AI phrases" such as *in today's* and *dive into* 0.511 (1.9%); discourse
markers such as *moreover* and *furthermore* 0.517 (1.8%); the rule-of-three list 0.515 (1.1%);
closing with *in conclusion* or *ultimately* 0.514 (0.0%); hedging language 0.500 (1.4%);
intensifiers 0.534 (0.0%). Uniform information density, measured as between-sentence variance,
reaches 0.533 (1.2%), and spectral flatness of the sentence-length rhythm 0.529 (1.0%).

Source for every figure in this section: `signal-science/tables/famous-heuristics.md`.

## Two signals that run backwards

Passive voice reaches AUROC 0.601 on the matched set with a Cliff's δ of −0.202 and 0.0% detection
at a 1% budget. The sign is the interesting part: machine prose uses *less* passive voice than human
prose, so an editor hunting passives is hunting in the wrong direction.

Curly quotes and apostrophes reach 0.591, δ −0.182, again 0.0% detection at a 1% budget, and again
humans carry more of them. Published human prose has usually passed through a typesetting system
that converts straight quotes. That is a fact about where a document was produced, not about who
wrote it.

## The em dash is real, and much weaker than its reputation

The median machine long-form document contains **3.50 em dashes per 1,000 words**. The median human
long-form document contains **zero**. On the 670 fresh long-form pairs that gives AUROC 0.772 and
**20.3% detection at a 1% false-positive budget** — the strongest of the folk signals, catching
about one machine document in five, with four in five going past.

On the wider matched set the same feature falls to 0.595 and 7.2%, because the total absence of the
em dash in the human half is a property of published long-form rather than of human writing
generally. The information is in presence against absence rather than in density, it varies heavily
by provider, and it can be removed by find-and-replace.

Sources: `SIGNAL-SCIENCE.md` §2.1 and §2 top-ten table; `tables/famous-heuristics.md`, row
`pun_emdash_per1kw`.

## Formatting detects the interface, not the author

Any markdown present reaches AUROC 0.773 on fresh long-form and 0.660 on the matched set, and
markdown headings alone reach 36.1% detection at a 1% budget across the whole corpus, the highest
single-feature figure in the study. It is also the one signal here we are confident is not about
authorship at all. An article pasted out of a chat window carries hashes, asterisks and bullets; the
same article pasted out of a CMS does not; a human-written README carries all three. What the
feature separates is the interface a document travelled through.

The experimental confirmation is in `SIGNAL-SCIENCE.md` §3: a transparent 24-feature classifier that
was forbidden from using any formatting feature beat the otherwise identical model that was allowed
them, on unseen prose, taking detection at a 1% budget from 62.5% to 72.1% (793 machine and 4,179
human documents, none seen by either model). Withholding the strongest-looking signal made the model
better.

## Perplexity, and the family built on it

The zero-shot detection family assumes machine text is what a language model finds predictable. Nine
published methods were reimplemented and run on 600 machine and 600 human fresh long-form documents,
with GPT-2 small (124M parameters, int8 with an fp16 head, 512-token cap) as the observer model.

| method | AUROC | detection at 1% budget | detection at 5% budget |
|---|---:|---:|---:|
| surprisal kurtosis (DivEye-inspired) | 0.766 | 10.3% | 30.7% |
| surprisal skew | 0.763 | 0.0% | 27.7% |
| surprisal autocorrelation | 0.757 | 4.5% | 20.7% |
| GLTR, share of tokens in the observer's top 100 | 0.735 | 0.0% | 18.0% |
| mean log rank | 0.728 | 0.0% | 19.0% |
| **log perplexity** | **0.715** | **0.0%** | 15.8% |
| Fast-DetectGPT curvature | 0.545 | 14.8% | 21.2% |

Source: `SIGNAL-SCIENCE.md` §5.1 and `tables/open-source-baselines.md`.

Log perplexity detects nothing at a budget a published tool could operate at. The distributions
overlap so heavily that the top human percentile sits above almost the whole machine distribution.

And the founding assumption is inverted. Median log-perplexity is **3.68** for machine documents
against **3.31** for human ones, with the direction holding in every register measured, on the same
600-a-side sample. Current models write with a vocabulary and phrasing that a 2019 observer finds
*less* expected than human web prose (`SIGNAL-SCIENCE.md` §5.2).

Two of those rows need protecting from misreading. Fast-DetectGPT's own paper reports around 0.93
using far larger scoring models; 0.545 with GPT-2 small is a floor for the method under a
browser-deployable observer, not a refutation of the published result. Binoculars was not
implemented at all, because it requires two different models and only one is available offline here;
the degenerate one-model proxy in the source table says nothing about it and its published results
stand. DivEye's central claim — that the *diversity* of the surprisal sequence beats its mean —
is confirmed on this corpus, with the three diversity moments at 0.766, 0.763 and 0.757 against
0.715 for the mean.

## What actually separates the two populations

On the 670 fresh long-form pairs, eight of the top ten signals measure a single property.

| rank | signal | AUROC | detection at 1% budget | median machine | median human |
|---:|---|---:|---:|---:|---:|
| 1 | content-word overlap between neighbouring sentences | 0.912 | 23.1% | 0.021 | 0.063 |
| 2 | vocabulary variety in a 100-word window (MATTR) | **0.911** | **47.3%** | 0.776 | 0.694 |
| 3 | type-token ratio, first 400 words | 0.876 | 17.0% | 0.595 | 0.503 |
| 4 | distinct word triples / word triples | 0.839 | 16.4% | 0.979 | 0.938 |
| 6 | distinct word pairs / word pairs | 0.830 | 19.7% | 0.878 | 0.797 |
| 7 | word-unigram entropy | 0.788 | 11.8% | 8.28 | 7.78 |
| 8 | share of vocabulary used exactly once | 0.782 | 3.9% | 0.675 | 0.618 |

Source: `SIGNAL-SCIENCE.md` §2, top-ten table.

The median machine document shares **2.1%** of its content words with the neighbouring sentence. The
median human document shares **6.3%**, three times as much. A person introduces a term and keeps
using it. A model introduces a term and reaches for a synonym, a pronoun, a rephrasing. That
produces wider vocabulary per unit length, less overlap between neighbouring sentences, fewer
repeated phrases and higher entropy, which are six instruments reading one behaviour.

MATTR, the strongest of them, catches 47.3% of machine long-form at a 1% human false-positive
budget. It is the best single readable signal in the study, and it still misses more than half.

## Does it survive the source?

The obvious objection is that the human long-form here is drawn from term-repeating technical
sources, so the study may have discovered that its humans are scientists. Each human source was
therefore tested separately against only the machine documents sharing its registers, and each
provider likewise: 33 pairings.

| signal | median AUROC | worst | worst pairing | pairings above 0.65 |
|---|---:|---:|---|---:|
| vocabulary variety (MATTR) | 0.791 | 0.562 | Meta models | **29 / 33** |
| adjacent-sentence cohesion | 0.777 | 0.561 | Meta models | 31 / 33 |
| any markdown present | 0.667 | 0.519 | Nvidia models | 18 / 33 |
| em dashes per 1,000 words | 0.637 | 0.501 | Nvidia models | 12 / 33 |
| burstiness | 0.597 | 0.500 | OpenAI models | 11 / 33 |
| "AI vocabulary" | 0.542 | 0.501 | internet-archive texts | 5 / 33 |

Source: `SIGNAL-SCIENCE.md` §2.3 and `tables/robustness.md`.

The under-repetition signal holds against SEC 10-K filings (0.99), GOV.UK (0.90), PERSUADE student
essays (0.89), Mongabay (0.87), Global Voices and Europe PMC (0.83), Common Crawl news (0.82) and C4
web text (0.78).

Its two weak points are recorded rather than buried. Meta's models show it weakly (MATTR 0.562,
adjacent-sentence cohesion 0.561) and Nvidia's only moderately (0.633 and 0.694). By register it is
weakest on creative writing (0.668) and social posts (0.658), and those are also the thinnest parts
of the corpus at 251 and 2,132 machine documents against 260 and 1,119 human ones. A universal law
is not what was measured.

## The reversal at the end

Burstiness is useless as a detector and is a real predictor of something else. Correlating the
deployed model's raw margin against each interpretable feature *within* the human population only
(4,184 documents, so the result is not just restating the label), burstiness comes out at Spearman
ρ = −0.264, alongside discourse markers at +0.368 and mean word length at +0.359
(`SIGNAL-SCIENCE.md` §4.3).

Read that column as a description of which human writers are at risk of being wrongly flagged:
formal, long-worded, evenly paced prose that signposts itself. The more evenly a person paces their
sentences, the higher they score. The metric that fails to find machines does help predict which
people get accused.

## What this page does not establish

The human half of this corpus is not a random sample of human writing. It is what was obtainable
under a clear licence: open-access science, government publications, filings, licensed news, web
text, student essays. Modern trade non-fiction, professional journalism behind a paywall and
personal writing of every kind are under-represented (`SIGNAL-SCIENCE.md` §7 item 2).

Register labels are machine-assigned and unvalidated for a substantial part of the corpus, and the
register families were normalised by this project from vocabularies that differ between the upstream
pools. Both are judgements, and the matched comparisons inherit their error.

The syntactic features are heuristics. Passive voice and proper nouns are approximated with regular
expressions and are named `_approx` throughout; no part-of-speech tagger was used. The surprisal
features in the main battery use a corpus unigram and bigram background model rather than a neural
one, and the GPT-2 measurements in the perplexity section are on a 600-a-side subsample rather than
the full corpus.

The fresh long-form set inherits a wording problem worth stating directly. It is drawn from the
project's 5,558-document long-form corpus, and 268 of that corpus's 922 machine documents (29.1%)
are also present in the cycle-2 training dataset, 168 of them in the train split; the human half is
effectively clean at 11 of 4,636
(`services/local-engine/research/corpus-reconciliation-2026-08-29/analysis.txt` §2). For the feature
statistics on this page that overlap is immaterial, because computing a type-token ratio or an em
dash count involves no model and no training. It is not immaterial for the one figure here that
compares a transparent classifier against the neural one, and the phrase "documents no model has
seen" should not be repeated about this corpus without that qualification.

Nothing here is a shelf-stable law. The vocabulary tells that worked in 2024 are worthless now, and
the under-repetition signal will be trained against once it is published. The methodology and the
feature definitions are published so the measurement can be repeated rather than believed.

## Provenance

| figure | file | section |
|---|---|---|
| corpus 25,723 = 10,890 + 14,833; 6,679 duplicates removed; 5,935 matched pairs; 670 fresh pairs | `services/local-engine/research/signal-science/SIGNAL-SCIENCE.md` | §1 |
| burstiness 0.521 / δ −0.043 / 2.5%; fresh 0.547 / 0.1%; all folk-heuristic rows | `signal-science/tables/famous-heuristics.md` | whole table |
| em dash 3.50 vs 0 per 1,000 words, 0.772, 20.3% | `SIGNAL-SCIENCE.md` | §2.1 |
| top-ten signals, 2.1% vs 6.3% adjacent-sentence overlap, MATTR 0.911 / 47.3% | `SIGNAL-SCIENCE.md` | §2 |
| markdown 36.1% at 1%; prose-only scorecard 72.1% vs 62.5% on 793 / 4,179 | `SIGNAL-SCIENCE.md` | §2.4, §3 |
| 33-pairing robustness table and per-source AUROC | `SIGNAL-SCIENCE.md` §2.3, `signal-science/tables/robustness.md` | — |
| zero-shot baselines, 600 + 600, GPT-2 small int8 observer | `SIGNAL-SCIENCE.md` §5.1, `signal-science/tables/open-source-baselines.md` | — |
| log-perplexity 3.68 vs 3.31 | `SIGNAL-SCIENCE.md` | §5.2 |
| burstiness ρ −0.264 within 4,184 human documents | `SIGNAL-SCIENCE.md` | §4.3 |
| limitations, human-corpus composition, machine-assigned labels | `SIGNAL-SCIENCE.md` | §7 |
| 268/922 and 168 train-split overlap; human 11/4,636 | `services/local-engine/research/corpus-reconciliation-2026-08-29/analysis.txt` | §2 |

---

# Notes for the builder — not body copy

## Charts

All three are new. None of the eight SVGs in `docs/assets/charts/` covers this page, and only
`segmentation-token-coverage.svg` and `watermark-key-collapse.svg` are current for any purpose.

**Chart 1 — the ranked heuristics (this is the page's argument in one image).**
Horizontal bar chart. X axis: AUROC, 0.45 to 0.95, with a labelled vertical rule at 0.500 marked
"chance". Y axis: heuristic name, sorted ascending by AUROC. Bars are the matched-set value (5,935
pairs); print the fresh long-form value as a second, lighter bar or a dot per row. Annotate each bar
with detection at a 1% false-positive budget.

| heuristic | AUROC (matched) | AUROC (fresh) | TPR @1% (matched) |
|---|---:|---:|---:|
| Hedging language | 0.500 | 0.516 | 1.4% |
| "AI phrases" | 0.511 | 0.533 | 1.9% |
| Closing with "in conclusion" | 0.514 | 0.508 | 0.0% |
| Rule of three | 0.515 | 0.579 | 1.1% |
| Discourse markers | 0.517 | 0.570 | 1.8% |
| **Burstiness of sentence length** | **0.521** | 0.547 | 2.5% |
| Sentence-length CV | 0.521 | 0.547 | 2.5% |
| Spectral flatness of rhythm | 0.529 | 0.571 | 1.0% |
| UID, between-sentence variance | 0.533 | 0.510 | 1.2% |
| Intensifiers | 0.534 | 0.541 | 0.0% |
| Compression ratio | 0.561 | 0.734 | 2.3% |
| "AI vocabulary" | 0.578 | 0.589 | 6.6% |
| Curly quotes | 0.591 | 0.669 | 0.0% |
| Em dashes per 1,000 words | 0.595 | 0.772 | 7.2% |
| Passive voice | 0.601 | 0.716 | 0.0% |
| UID, adjacent-word surprisal change | 0.619 | 0.683 | 1.6% |
| Sentence-length SD | 0.633 | 0.602 | 1.9% |
| Any markdown present | 0.660 | 0.773 | 0.0% |
| *(reference)* MATTR | — | 0.911 | 47.3% fresh |

Source: `signal-science/tables/famous-heuristics.md`; MATTR row from `SIGNAL-SCIENCE.md` §2.
Caption must carry: 5,935 register-and-length-matched pairs (fresh column 670 pairs); feature
statistics, no detector, no operating point.

**Chart 2 — adjacent-sentence content-word overlap, machine against human.**
Paired distribution (violin or ridgeline, one per class), X axis: share of content words shared with
the neighbouring sentence, 0 to about 0.20. Mark the two medians: machine **0.021**, human
**0.063**. Denominator 670 documents a side, fresh long-form. Underlying per-document values are in
`signal-science/results/` (rendered summary in `tables/feature-battery-freshlongform.md`); if only
the summary statistics are available, draw it as a dumbbell of the two medians with the AUROC (0.912)
and detection at a 1% budget (23.1%) annotated, rather than inventing a distribution shape.

**Chart 3 — the 33-pairing robustness strip (optional, pre-empts "your humans are just scientists").**
Dot strip, one row per signal, one dot per source pairing, X axis AUROC 0.45–1.00 with a rule at
0.500. Rows and summary values from `SIGNAL-SCIENCE.md` §2.3: MATTR median 0.791 / worst 0.562 /
29 of 33 above 0.65; adjacent-sentence cohesion 0.777 / 0.561 / 31; Yule's K 0.700 / 0.530 / 23;
repeated word-triple rate 0.698 / 0.527 / 23; any markdown 0.667 / 0.519 / 18; em dashes 0.637 /
0.501 / 12; burstiness 0.597 / 0.500 / 11; "AI vocabulary" 0.542 / 0.501 / 5. Per-pairing dots come
from `signal-science/tables/robustness.md`.

## Do not print

- Any operating point on this page. Every figure is a feature statistic, and printing 0.9855 / 0.9763
  beside one would imply a detector measurement.
- The era breakdown in `SIGNAL-SCIENCE.md` §2.5. Different eras were sampled from different sources,
  so an era difference is partly a source difference; the source says so and declines the claim.
- The degenerate self-Binoculars figure (0.502) as Binoculars' score.
- "Hash-quarantined against every training split" or "documents no model has ever seen" about the
  long-form corpus. Both appear in `docs/measurements/DETECTION-BY-LENGTH-AND-MODEL.md` and
  `docs/PER-MODEL-DETECTION.md` and are not accurate as they stand.

## Rewrite liability

Low. Nothing on this page depends on the shipped operating point, so a retrain does not invalidate
it. Two dependencies to watch: the scorecard-versus-neural comparison in the formatting section
(72.1% / 62.5% / 89.8%) is measured against the cycle-2 deployed artefact and would need re-cutting
against any successor, and the within-human correlation table in "the reversal at the end" is
likewise model-specific.
