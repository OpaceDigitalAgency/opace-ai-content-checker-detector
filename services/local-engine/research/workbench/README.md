# Calibration workbench

An offline laboratory for the Opace AI Content Integrity scoring stack. It lets
you look at every scoring component, change its weight, switch off individual
words and phrases inside a rule, explore raw measurements the rules never used,
and invent and test entirely new signals — all against the 1,896-sample
evaluation corpus, with results that update as you type.

It is a testing instrument for the owner. It is not a customer-facing page, it
is not part of any release package, and it changes nothing in the engine.

## How to open it

Double-click **`workbench.html`**, or open it in any browser.

That is the whole procedure. No server, no build step, no network, no
dependencies — the corpus, the measurements and the scoring logic are all
embedded in the file. It is about 11 MB and takes a moment to parse on first
load; everything after that is instant.

## What it gives you

### 1. The dial board

All **113 weighted rule categories** (shipped v2 51 + v3 55 + v4 rhythm 7),
grouped into artefact forensics, chatbot voice, stock phrasing, structure and
formatting, rhythm and stylometrics, punctuation habits, and wordiness. Each row
shows what the rule catches, its weight, how many AI and human samples it fires
on, and a toggle.

### 2. Sub-category granularity

73 of the 113 categories are **trigger lists** — vocabulary tables, phrase books,
artefact token families. Those expand to their **333 individual triggers**, each
with its own AI and human firing counts and its own switch. You can see that
`tier1` is 59 separate words and turn off just the one that is costing you.

The other 40 categories are **computed measures**, not lists: their per-finding
label is a description of a measurement ("3 dash separators in 144 words"), so
there is nothing to enumerate. Those rows say so and link to the raw feature in
the explorer that drives them.

### 3. Feature explorer

43 cheap measurements per sample, plus 50 function-word rates and 200
content-word rates — 293 measurable quantities in total, computed independently
of the rules stack. Pick one and you get the AI-versus-human distribution,
Cohen's *d* with a plain-English effect size, and a draggable threshold showing
what detection and false positives would be **if that single measurement were
the whole rule**. Two buttons find the best threshold at zero false positives
and the best by Youden's J.

This is where signals nobody coded turn up.

### 4. Custom signal builder

Define a rule that does not exist yet, from:

- a **word or phrase list** (case-insensitive, matches per 1,000 words),
- a **regular expression**, or
- a **threshold on any raw feature**,

optionally combined with AND / OR. It scores all 1,896 samples in a few
milliseconds and reports detection, false positives broken down by human genre,
how many of its catches the shipped rules **already** get, how many are genuinely
new, and which existing categories it overlaps with. A signal worth adding has a
large "genuinely new" number and a small false-positive count.

### 5. The two limits, made visible

A panel at the top states plainly what this tool cannot reweight:

- **The neural model is a black box.** It is a trained e5-small int8 classifier
  over embeddings, not named rules. The only control available is where the
  threshold sits.
- **Combination and escalation gates can override the weighted score.** All nine
  are listed with a description and an on/off switch, so you can measure how much
  of the detection rate actually rests on each rather than on the weights.

## Controls

| Control | What it does |
| --- | --- |
| **Text view** | `Raw` is chat-export text with markdown intact. `Stripped` has the markdown removed — what a user actually pastes. Both matter; they give very different answers. |
| **Decision mode** | `Rules only` is the shipped product. `Model only` uses the neural probability alone. `Either` is the OR, `Both` the AND. |
| **Rules flag when** | `Classification is not human_like` is what the engine ships. `ai_like` is the strict band. `Score ≥ threshold` uses the raw number instead of the classifier. |
| **Neural model threshold** | The tier-3 cut-off. Shipped operating point is 0.8533. |
| **Escalation switches** | The nine combination and escalation gates, individually. |
| **Weight box / category toggle / trigger toggle** | Per category, per group, or per individual word and phrase. |
| **Reset to shipped** | Returns every weight, toggle, trigger, switch and threshold to the shipped configuration. |
| **Download / Copy JSON** | Exports the whole configuration — weights, disabled categories, disabled triggers, escalation switches, thresholds and the last custom signal — together with the numbers it produced. |

## Caveats you must not skip

**Every rate is shown with its denominator, and you should read the denominator
first.**

The human side of the corpus is 169 texts. Only 40 are published prose; the other
129 are Q&A answers and Wikipedia articles. Only **10** are business-marketing
copy, the register the product will most often be pointed at. A false-positive
rate computed on 10 samples moves in steps of 10 percentage points — one
document. Genre-level rates here are directional, not measurements.

**32 of the 113 categories never fire on a single sample in either view**,
including most of the artefact-forensics lane (`ai-citation-token`,
`pua-character`, `math-alphanumeric`, `ai-utm-source`). Those rows are tagged.
The corpus cannot say whether those rules help or hurt, and changing their weight
will not move any number on the page. That is a gap in the corpus, not evidence
that the rules are useless.

The AI side is 1,727 samples across 12 provider-era slices and 40 models — a far
firmer footing than the human side. Detection rates are better supported than
false-positive rates throughout.

Nothing here measures accuracy on text that has been deliberately humanised,
paraphrased or otherwise adversarially edited.

**Two word counts exist.** The engine has its own tokeniser and so does the
measurement layer. Every "per 1,000 words" rate in the feature explorer and the
signal builder uses the measurement layer's count, consistently. The engine's
count is used only for the engine's own score.

## Files

| File | Purpose |
| --- | --- |
| `workbench.html` | The tool. Self-contained; open it directly. Generated — edit the template, not this. |
| `workbench.template.html` | Page source, with placeholders for the scorer and the data. |
| `scorer.mjs` | Pure-arithmetic port of the shipped scoring pipeline, plus the nine escalation switches. Used by the precompute *and* inlined into the page, so there is one implementation rather than two. |
| `features.mjs` | The 43 raw measurements and the function-word list. |
| `categories.mjs` | Group assignments and plain-English descriptions for the 113 categories. |
| `precompute.mjs` | The slow step. Runs the shipped engine over both views and writes `data.json`. |
| `build.mjs` | Inlines `scorer.mjs` and `data.json` into `workbench.html`. |
| `verify.mjs` | Independent checks. Recomputes features and custom signals **from the original evaluation JSONL**, not from `data.json`, so a precompute bug cannot hide behind itself. |
| `data.json` | Precomputed hits, triggers, features, neural probabilities and corpus text (10.9 MB). |

## Rebuilding

```sh
node precompute.mjs   # ~20 s; re-runs the engine over 3,792 sample-views
node build.mjs        # instant
node verify.mjs       # ~60 s; independent checks
```

`precompute.mjs` reads the shipped `packages/core` dist and the evaluation sets
under `research/provider-eval/` and `research/stripped-eval/`. It writes only
`data.json`.

It also self-checks: for every sample it re-derives the score and classification
from the recorded trigger hits alone and compares against the engine's own
output. The current run reports **0 mismatches across all 3,792 sample-views**,
which is what licenses the browser to do the same arithmetic.

## Reproduced baselines

| Configuration | Detection | False positives |
| --- | --- | --- |
| Raw text, rules only | 1,152 / 1,727 = 66.7% | 0 / 169 |
| Stripped text, rules only | 95 / 1,727 = 5.5% | 0 / 169 |
| Stripped text, neural model at 0.8533 | 983 / 1,727 = 56.9% | 3 / 169 |
| Raw text, neural model at 0.8533 | 927 / 1,727 = 53.7% | 3 / 169 |

## Things the tool immediately shows

Worth knowing before you start turning dials:

- **Over half the raw detection rate rests on one escalation gate, not on the
  weights.** Switching off `Formatting floor` alone takes raw detection from
  66.7% to 32.7%.
- **A single measurement beats the whole rules stack on raw text.** Bold runs per
  1,000 words at the best zero-false-positive threshold gives 1,247 / 1,727 =
  72.2% at 0 / 169 — against the full stack's 66.7%. It is detecting chat-export
  formatting, which is also why it collapses on stripped text.
- **`Furniture gate` is dead code in the shipped engine.** It reads the collapsed
  breadth category set, which excludes the furniture categories, so it can never
  fire. Switching it off changes nothing. Reproduced faithfully rather than
  silently fixed.
