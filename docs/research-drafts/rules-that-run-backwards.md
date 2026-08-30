# 116 writing rules that are editorial advice, and the six that point the wrong way

**Draft for publication. Written 30 August 2026. No measurement was run to produce it; every
figure is quoted from a measurement record named at the point of use.**

Proposed URL: `/tools/ai/content-verification-integrity/research/writing-rules-are-not-detection/`

---

## The finding

The tool ships 116 named writing rules: passive voice, hedging, quote inconsistency, adjacent lemma
repetition, and a hundred and twelve others. None of them counts towards the authorship verdict.
They were removed from it on **28 August 2026**, on the day the whole tier was measured against the
trained classifier and lost on both axes at once.

Six of them fire more often on human writing than on machine writing, at Benjamini–Hochberg
q < 0.05. Following those six as advice makes prose look *less* like the human documents in these
corpora, not more.

A seventh had been recorded as the clearest backwards rule of all. Re-measured on a corpus three
hundred times larger, it points the right way and strongly. It is withdrawn below rather than
quietly dropped, because how a project handles a figure that will not reproduce says more than the
figure did.

---

## Provenance

| | |
|---|---|
| Rule pack | `en-signals:2026.08.6` — **116 named rules** across 113 weighted categories (51 v2 + 55 v3 + 7 v4 rhythm, plus 3 en-gb-v1 rules) |
| Liveness re-measurement | `tests/battery/rule-liveness.json`, `measured_utc` **2026-08-30**, denominators **5,743 AI and 4,353 human documents** |
| AI corpora | 4,016 generated long-form articles (21 models, 10 providers) plus the 1,727 AI documents of the provider-eval set |
| Human corpora | 4,144 modern human samples (test-only by manifest), the 169 provider-eval humans, and the 40-sample genre-matched calibration corpus |
| Original measurement | `research/rule-validation/RULE-VALIDATION.md`, 1,727 AI and **169** human documents |
| Corroboration | `research/signal-science/SIGNAL-SCIENCE.md` §3, transparent 24-feature scorecard |
| Summary record | `docs/MEASURED-FINDINGS.md` §4 |

Likelihood ratios below are firing rates, not detector outputs. No operating point applies to them
and none is printed.

---

## Why the tier was demoted

Measured on the fresh long-form corpus, the whole rule tier reaches **45.1% detection at a 24.8%
human false-positive rate** — 922 AI documents and 1,200 human documents. The trained classifier on
the same data reads 90.3% at 1.34%, on 922 AI and 4,636 human documents.

A quarter of human writers wrongly accused, for less than half the machine writing caught. That is
not a detector at any setting, and on 28 August 2026 the tier stopped contributing to the reading
and became editorial suggestions only.

Both halves of that comparison need their caveats printed alongside them, and they are unusually
serious. **The 45.1% / 24.8% pair carries no stated operating point**: what rules-score threshold
produces it is not recorded anywhere in this repository, and until that is closed the pair should be
published as a direction rather than a measurement. **The 90.3% / 1.34% comparison figure is browser
measured, from before segmentation existed, at a superseded threshold, and carries no raw counts.**
The current shipped figures for the classifier are 883/922 = 95.8% detection at 45/4,636 = 1.0%
false positives on fp32 at the shipped pair, and they are not the figures this comparison was made
with.

## The six that run backwards

Re-measured on 5,743 AI and 4,353 human documents. Counts are documents on which the rule fired; the
likelihood ratio is the AI firing rate divided by the human firing rate, so a value below 1 means the
rule fires more often on human writing.

| rule | AI (of 5,743) | human (of 4,353) | likelihood ratio |
|---|---|---|---|
| `parenthetical-hedge` | 2 = 0.03% | 14 = 0.32% | **0.11** |
| `quote-inconsistency` | 29 = 0.50% | 116 = 2.66% | 0.19 |
| `passive-ratio` | 31 = 0.54% | 91 = 2.09% | 0.26 |
| `low-specificity` | 24 = 0.42% | 62 = 1.42% | 0.29 |
| `adjacent-lemma-repeat` | 473 = 8.24% | 932 = 21.41% | 0.38 |
| `tier1-clarity` | 623 = 10.85% | 991 = 22.77% | 0.48 |

`didactic-note` also points backwards, at 12 against 15 documents, and at q = 0.26 it is not
distinguishable from chance. It is listed and not claimed.

The two that matter in practice are the last two, because they fire on roughly one human document in
five. Repeating a word across adjacent sentences, and using the vocabulary `tier1-clarity` objects
to, are both things human writers do more than models do. Anyone editing to sound less like a
machine will be pushed the wrong way by both.

Ten of the seventeen rules recorded as backwards in the original measurement reversed direction on
the larger corpora. `not-just-contrast` went from 0.18% to 2.05% of AI documents, a likelihood ratio
of 11.2; `normalization-flag` reads 6.6; `hollow-intensifier` 2.7.

## The figure that is withdrawn

`token-cutoff` fires on text that names a model's training cut-off. It had been recorded as one of
the clearest backwards rules in the pack: **3.55% of humans (6 of 169) against 0.58% of AI (10 of
1,727)**, likelihood ratio 0.16, q = 0.012.

Re-measured, it points the right way and it is one of the more discriminating rules in the pack:
**232 of 5,743 AI documents (4.04%) against 22 of 4,353 human documents (0.51%)**, likelihood ratio
**8.0**.

The original rested on six human documents. Six documents can produce a likelihood ratio with a
respectable-looking q value and no stability at all. That figure should not be quoted, it is not
published here as a finding, and the same 169-document human corpus is on record in this project as
having caused three separate claims to be retracted.

## The same conclusion from an independent direction

A transparent 24-feature scorecard was fitted twice on exactly the data the deployed model was
trained on, and evaluated on exactly the data it was validated on: 793 machine and 4,179 human fresh
long-form documents. Once with every feature available, and once with **every formatting feature
withheld**.

The formatting-free version is better. Detection at a 1% false-positive budget rose from **62.5% to
72.1%**. On a different human population of 3,767 modern web, business, marketing, academic and
non-native documents, false positives at a 5% budget fell from **3.61% to 1.06%**. On creative
writing specifically, detection went from 28.2% to 62.1%.

Hand-written formatting and phrasing signals detect register and provenance. Forbidding them made a
detector better on both axes at once, which is the same result the rule tier produced, arrived at
from the opposite direction.

---

## What this does not prove

- **The AI and human sides are different corpora, not two halves of one.** The AI side is dominated
  by 4,016 generated long-form articles; the human side by 4,144 modern samples weighted towards
  business and marketing copy. Register differs between them, and register confounding authorship is
  this project's central finding. These likelihood ratios describe how a rule behaves across these
  corpora. They are strong enough to say a rule points the wrong way. **They are not strong enough
  to fix a weight.**
- **The 45.1% / 24.8% pair has no recorded operating point.** Close that before publishing the pair
  in a headline position.
- **The 90.3% / 1.34% comparison is superseded.** Browser measured, pre-segmentation, at a threshold
  that no longer runs, with no raw counts.
- **A rule that does not fire is not the same as a rule that is wrong.** Of the 116, 95 fired on at
  least one of 5,743 AI documents. One (`tier3-phrase-cluster`) is recorded as inactive because it
  cannot fire on realistic English prose, and twenty more are dormant on every corpus measured. Some
  of those twenty are deliberate forensic markers kept as insurance, such as leaked citation tokens
  and unfilled placeholders, and their absence from a prose corpus is the expected result rather
  than a failure.
- **One proposed loosening was measured and rejected.** `punchline-fragment-density`'s proposed gate
  reaches zero documents on the long-form corpus: the AI corpus maximum punchline rate is 0.136 and
  its 99th percentile 0.084, against a shipped gate of 0.18 and a proposed gate of 0.10. It is
  recorded as rejected so that it cannot be mistaken for a pending improvement.
- **These are English rules on English prose.** Nothing here is measured in any other language.

---

## Charts this page needs

**1. Rules against model — the chart exists and is partly stale.**
`docs/assets/charts/rules-vs-model.svg` plots rules 45.1% / 24.8% against model 90.3% / 1.34% with
denominators on the chart. Its model figures are pre-segmentation browser numbers at a superseded
operating point; the subtitle says so and **that subtitle must stay legible at every size the chart
is served at**. If the chart is rebuilt rather than reused, replace the model series with the
shipped fp32 figures, 883/922 = 95.8% detection at 45/4,636 = 1.0% false positives, and keep the
rules series with its own denominators and its missing-operating-point caveat.

**2. New: the six backwards rules, as a diverging bar.** Likelihood ratio on a log x axis with the
neutral line at 1.0, bars extending left for backwards rules, counts and denominators printed in
each row label.

- `parenthetical-hedge` 0.11 (2/5,743 AI, 14/4,353 human); `quote-inconsistency` 0.19 (29, 116);
  `passive-ratio` 0.26 (31, 91); `low-specificity` 0.29 (24, 62); `adjacent-lemma-repeat` 0.38 (473,
  932); `tier1-clarity` 0.48 (623, 991).
- Below the neutral line, `token-cutoff` shown twice: the withdrawn original at 0.16 (10/1,727 AI,
  6/169 human) drawn struck through and greyed, and the re-measurement at 8.0 (232/5,743,
  22/4,353) drawn in full. This pairing is the most informative single element on the page.
- Source: `tests/battery/rule-liveness.json`, verified row by row against the raw file.

**3. Optional: the formatting-free scorecard.** Paired bars at each false-positive budget, two
series, denominators in the caption.

- Detection: unrestricted 62.5% at 1%, 77.6% at 2%, 84.9% at 3%, 89.9% at 5%; prose-only 72.1%,
  81.1%, 85.4%, 88.8%. n = 793 machine, 4,179 human.
- False positives on the independent 3,767-document human population: unrestricted 0.13%, 0.96%,
  1.67%, 3.61%; prose-only 0.27%, 0.42%, 0.66%, 1.06%.
- Source: `SIGNAL-SCIENCE.md` §3.

---

## Rewrite liabilities (not body copy)

- Every figure here is tied to rule pack `en-signals:2026.08.6`. A pack bump invalidates the whole
  page, including the rule count in the title.
- The rules-tier operating point is an open gap. If it is recorded, the caveat attached to
  45.1% / 24.8% comes off and the pair can carry a heading.
- **cycle-4a** is measured and not shipped. It does not change the rule firing rates, which are
  model-independent, but it changes the classifier side of every comparison on this page.
- `docs/MEASURED-FINDINGS.md` §4 dates the re-measurement 29 August 2026 while
  `tests/battery/rule-liveness.json` records `measured_utc` 2026-08-30. The file's own date is used
  above. Reconcile the two before publication.
