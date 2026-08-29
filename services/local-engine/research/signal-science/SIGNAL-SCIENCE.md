# Signal Science

**What actually separates machine-written from human-written prose, measured on 25,723 labelled documents — and what our detector really keys on.**

Opace AI Content Integrity · 29 August 2026 · `services/local-engine/research/signal-science/`

---

## Why this document exists

We shipped a detector that works: 90.6% of machine-written long-form caught at a 1.22% human false-positive rate, measured through the browser runtime on data the model had never seen. That is a good number. It was also, until now, an unexplained one. "It works, and we cannot say why" is not a defensible position for a project whose stated promise is *evidence, not guarantees*.

So we took the detector apart, and we took the question apart underneath it. This document reports:

1. **What separates the two classes, measured.** 122 interpretable features across the whole corpus, with effect sizes, multiple-comparison correction, and single-feature detection at a fixed false-positive budget. Ranked, and split by register, provider, model tier and prompt style.
2. **A transparent classifier.** A 24-line scorecard whose every contribution can be written down, evaluated exactly as the neural model is, with the accuracy gap reported honestly and the arithmetic shown on three real documents.
3. **What the neural model keys on.** Ablation, sentence occlusion and correlation against the deployed artefact.
4. **The open-source foundation, credited and measured.** Published methods reimplemented and run on our own modern corpus, including the cases where they beat us and the case where a famous method collapses.

Every figure carries its denominator. Every claim that could not be measured is marked as unmeasured rather than softened.

**One caveat governs everything below.** This is a study of *distributions*, not of individual documents. Every signal here describes what is typical of thousands of machine-written documents against thousands of human-written ones. None of them proves anything about a single piece of writing, and none of them can. A human writer who happens to sit in the machine-like tail of every distribution exists, and this document does not license accusing them.

---

## 1. The corpus

| | documents |
|---|---:|
| Machine-written | **10,890** |
| Human-written | **14,833** |
| **Total** | **25,723** |

Assembled from six labelled sources on this project, unified onto one label vocabulary and de-duplicated on a normalised text hash. **6,679 duplicate documents were removed** — the cycle-2 training corpus re-packages our own generated run and several public sets, and any statistic computed before that de-duplication is partly counting the same text twice.

| pool | kept | what it is |
|---|---:|---|
| `generated-corpus` | 4,013 | our own current-model articles: 21 models, 10 providers, 19 registers, three prompt styles |
| `ai-longform` | 922 | 800–2,000-word machine long-form across the registers the tool targets |
| `human-longform` | 4,636 | Europe PMC, GOV.UK, CRS, Global Voices, Mongabay, SEC EDGAR, PERSUADE |
| `human-battery-v1/v2` | 4,184 | modern human web, business, marketing, academic and non-native writing |
| `current-models` | 3,133 | public current-model chat replies (the contrast register) |
| `cycle2-corpus` | 8,835 | the remainder of the cycle-2 training corpus after de-duplication |

**7,856 documents were seen during cycle-2 training** and are tagged as such; 17,867 were not. Every headline figure below uses data no model on this project has been trained on.

Minimum document length is 60 words. Below that, nothing measured here is stable.

### Two matched comparisons, and why both matter

The machine and human halves do not share a register mix — the machine side carries 2,132 social posts, the human side carries none — so any pooled statistic partly measures register rather than authorship. Two matched sets are therefore used throughout:

- **Register-and-length matched**: 5,935 machine documents paired 1:1 with 5,935 human documents on register family and log word count. The broad comparison.
- **Fresh long-form, register matched**: 670 pairs drawn only from `longform-corpus`, which no model here has seen and which covers the registers the product actually targets. The clean comparison.

Where the two disagree, both numbers are given. They disagree usefully.

---

## 2. What separates AI from human writing

**112 of 122 features differ significantly** between the classes (Mann-Whitney U, Benjamini-Hochberg corrected at q = 0.05 across the whole battery, 5,935 pairs). That sounds impressive and means almost nothing: with 5,935 documents a side, a trivially small difference clears significance. What matters is effect size and detection at a false-positive budget a real tool could operate at.

### The top ten signals

Fresh long-form, register and length matched, 670 documents a side. AUROC is oriented so 0.5 is useless. `TPR@1%` is single-feature detection when the threshold is set so that one human document in a hundred is wrongly flagged.

| # | signal | AUROC | Cliff's δ | TPR@1% FP | median AI | median human | reads as |
|---:|---|---:|---:|---:|---:|---:|---|
| 1 | **content-word overlap between neighbouring sentences** | 0.912 | −0.83 | 23.1% | 0.021 | 0.063 | AI repeats itself less |
| 2 | **vocabulary variety in a 100-word window (MATTR)** | 0.911 | +0.82 | **47.3%** | 0.776 | 0.694 | AI repeats itself less |
| 3 | type-token ratio, first 400 words | 0.876 | +0.75 | 17.0% | 0.595 | 0.503 | AI repeats itself less |
| 4 | distinct word triples / word triples | 0.839 | +0.68 | 16.4% | 0.979 | 0.938 | AI repeats itself less |
| 5 | repeated word-triple rate | 0.839 | −0.68 | 16.4% | 0.021 | 0.062 | AI repeats itself less |
| 6 | distinct word pairs / word pairs | 0.830 | +0.66 | 19.7% | 0.878 | 0.797 | AI repeats itself less |
| 7 | word-unigram entropy | 0.788 | +0.58 | 11.8% | 8.28 | 7.78 | AI repeats itself less |
| 8 | share of vocabulary used exactly once | 0.782 | +0.56 | 3.9% | 0.675 | 0.618 | AI repeats itself less |
| 9 | **any markdown formatting present** | 0.773 | +0.55 | 0.0% | present | absent | provenance, not authorship |
| 10 | **em dashes per 1,000 words** | 0.772 | +0.55 | 20.3% | **3.50** | **0** | genuinely separate |

Full ranked battery: [`tables/feature-battery-freshlongform.md`](tables/feature-battery-freshlongform.md) and [`tables/feature-battery-all.md`](tables/feature-battery-all.md).

### Eight of those ten are one signal

Read the right-hand column. Signals 1–8 all measure the same property from different angles, and the correlation matrix confirms it ([`tables/signal-redundancy.md`](tables/signal-redundancy.md)): distinct-trigram rate and repeated-trigram rate correlate at −1.00 because they are algebraically the same quantity; MATTR correlates with hapax rate at +0.58, with distinct word pairs at +0.68, and with adjacent-sentence cohesion at −0.70.

**The finding, stated once and plainly: machine-written prose under-repeats.**

A human writer introduces a term and then keeps using it. The word appears in this sentence, again in the next, again two paragraphs later. A language model introduces a term and then reaches for a synonym, a pronoun, a rephrasing. The result is text with a wider vocabulary per unit length, less overlap between adjacent sentences, fewer repeated phrases, and higher unigram entropy — all of which are the same behaviour observed through six instruments.

The median machine document shares **2.1%** of its content words between neighbouring sentences. The median human document shares **6.3%** — three times as much.

This inverts the popular intuition. AI writing is widely described as repetitive; on published long-form prose the opposite is measurably true. What people are noticing when they call it repetitive is structural sameness — parallel paragraph shapes, similar sentence openings — not lexical repetition, and the two are not the same thing.

Only two of the top ten are genuinely independent of that cluster: markdown formatting and the em dash. On markdown, see §2.4 — it is not an authorship signal at all.

### 2.1 The em dash, quantified

The median machine long-form document contains **3.50 em dashes per 1,000 words**. The median human long-form document contains **zero** (670 documents a side). AUROC 0.772; 20.3% detection at a 1% false-positive budget.

So the folk signal is real — and much weaker than its reputation. At the operating point a responsible tool must use, it catches one machine document in five, and it is the *presence versus total absence* that carries the information rather than the density. It is also the least durable signal here: it is a house-style artefact, it varies enormously by provider, and it can be removed by find-and-replace in two seconds.

### 2.2 The famous heuristics, measured

This is the part of the document most worth arguing with. Full table: [`tables/famous-heuristics.md`](tables/famous-heuristics.md).

| heuristic | AUROC | Cliff's δ | TPR@1% FP | verdict |
|---|---:|---:|---:|---|
| **Burstiness of sentence length** — the metric GPTZero built its public explanation on | **0.521** | −0.043 | 2.5% | **worthless** |
| Sentence-length coefficient of variation | 0.521 | −0.043 | 2.5% | worthless |
| **'AI vocabulary'** — delve, leverage, robust, tapestry, seamless… | **0.578** | +0.156 | 6.6% | **weak** |
| 'AI phrases' — *in today's…*, *it's not just X, it's Y*, *dive into*… | 0.511 | +0.022 | 1.9% | worthless |
| Discourse markers — *moreover*, *furthermore*, *additionally* | 0.517 | +0.034 | 1.8% | worthless |
| The 'rule of three' list | 0.515 | +0.029 | 1.1% | worthless |
| Closing with *in conclusion* / *ultimately* | 0.514 | +0.027 | 0.0% | worthless |
| Hedging language | 0.500 | +0.001 | 1.4% | worthless |
| Intensifiers | 0.534 | −0.069 | 0.0% | worthless |
| Passive voice | 0.601 | −0.202 | 0.0% | weak, and **backwards** — AI uses *less* passive |
| Uniform information density (between-sentence variance) | 0.533 | −0.066 | 1.2% | worthless |
| Spectral flatness of the sentence-length rhythm | 0.529 | −0.057 | 1.0% | worthless |
| Curly quotes and apostrophes | 0.591 | −0.182 | 0.0% | weak, and it is a **typesetting** signal |

Burstiness deserves its own sentence. **On 5,935 matched pairs, sentence-length burstiness has an AUROC of 0.521 and a Cliff's delta of −0.043 — negligible, and pointing the wrong way.** The single most widely repeated claim about how to spot AI writing does not survive contact with a modern corpus. It was a reasonable read of 2022-era output. It is not a 2026 signal.

Cliché vocabulary is the second casualty, and it confirms what this project already found by a different route. It reaches AUROC 0.578 pooled and 0.589 on fresh long-form. In the robustness sweep it clears 0.65 on **5 of 33 source pairings** ([`tables/robustness.md`](tables/robustness.md)). It is not zero — machine text does use these words somewhat more — but it is nowhere near strong enough to accuse anyone with, and the project's earlier measurement that it fires on 40% of genuine human marketing copy explains exactly why.

The curly-quote result deserves care: humans use *more* curly quotes, because published human prose comes from typesetting systems that convert them. That is a fact about where a document was produced, not about who wrote it.

### 2.3 Does the signal survive every source?

The obvious objection to "machines under-repeat" is that our human long-form is drawn from term-repeating technical sources — biomedical papers, government reports, SEC filings — so we may have discovered that our humans happen to be scientists. So each human source was tested separately against only the machine documents sharing its registers, and vice versa: 33 pairings.

| signal | median AUROC | worst AUROC | worst pairing | pairings above 0.65 |
|---|---:|---:|---|---:|
| vocabulary variety (MATTR) | **0.791** | 0.562 | Meta models | **29 / 33** |
| adjacent-sentence cohesion | **0.777** | 0.561 | Meta models | **31 / 33** |
| Yule's K | 0.700 | 0.530 | Global Voices | 23 / 33 |
| repeated word-triple rate | 0.698 | 0.527 | HAT-Bench abstracts | 23 / 33 |
| any markdown present | 0.667 | 0.519 | Nvidia models | 18 / 33 |
| em dashes per 1,000 words | 0.637 | 0.501 | Nvidia models | 12 / 33 |
| burstiness | 0.597 | 0.500 | OpenAI models | 11 / 33 |
| 'AI vocabulary' | 0.542 | 0.501 | internet-archive texts | **5 / 33** |

The under-repetition signal holds against C4 web text (0.78), Common Crawl news (0.82), Europe PMC (0.83), PERSUADE student essays (0.89), GOV.UK (0.90), Global Voices (0.83), Mongabay (0.87), the modern human battery (0.74) and SEC 10-K filings (0.99). It is not one corpus talking.

Its two genuine weak points are recorded rather than buried: **Meta's models show it weakly (MATTR 0.562, cohesion 0.561) and Nvidia's only moderately (0.633 and 0.694)**, and it is weakest on creative writing (0.668) and social posts (0.658).

### 2.4 Formatting detects chat windows, not machines

Markdown is the most eye-catching signal in the pooled table — headings alone reach 36.1% detection at a 1% budget across the whole corpus, the highest single-feature figure we measured. It is also the one signal here that we are confident is *not* about authorship.

A machine-written article pasted out of a chat window carries hashes, asterisks and bullets. The same article pasted out of a CMS does not. A human-written README carries all three. What the feature separates is the interface a document travelled through.

The evidence that this is not pedantry is in §3: a transparent model that was *forbidden* from using formatting features **beat** the one that was allowed them, on unseen prose, by 11 percentage points.

### 2.5 The evasion axes

Full tables: [`tables/by-evasion-axis.md`](tables/by-evasion-axis.md), [`tables/by-register.md`](tables/by-register.md).

**"Write like a human" prompting does not defeat the top signal. It strengthens it.**

| prompt style | n | vocabulary variety | adjacent-sentence cohesion | any markdown |
|---|---:|---:|---:|---:|
| plain | 1,365 | 0.904 | 0.791 | **0.861** |
| house-brief | 1,421 | 0.921 | 0.789 | 0.868 |
| **human-voice** ("write like a human") | 1,455 | **0.916** | **0.879** | **0.768** |

Instructing a model to write like a human makes it *avoid repeating itself harder* — which is precisely the behaviour that gives it away. It does suppress the formatting signal, which drops from 0.861 to 0.768. So the evasion that works against rule-based detectors is the one that makes the real signal clearer.

**Flagship models are more detectable on this signal, not less.**

| model tier | n | vocabulary variety | adjacent-sentence cohesion |
|---|---:|---:|---:|
| flash-or-mini | 1,147 | 0.859 | 0.752 |
| standard | 2,133 | 0.928 | 0.840 |
| **pro-flagship** | 961 | **0.947** | **0.859** |

This contradicts the project's earlier finding that flagship models evade better — but the two measurements are of different things. The earlier finding was about the *shipped cycle-1 classifier*, which keyed on chat formatting that flagships produce less of. On the underlying lexical behaviour, the more capable the model, the more it paraphrases rather than repeats.

**By provider** the signal ranges from 0.943 (Z.ai) and 0.914 (xAI) down to 0.560 (Meta) and 0.434 (Nvidia) in the pooled breakdown — where a value below 0.5 means that vendor's output sits on the *human* side of the signal. Against register-matched humans the same two come out at 0.562 and 0.633. Either way, a real vendor dependence that any published claim must carry.

By register, the signal is strongest on corporate communications (0.990) and marketing (0.871), weakest on creative writing (0.668) and social posts (0.658). The registers the tool is aimed at are the ones it reads best.

> **An honest limit on the era breakdown.** Different eras in this corpus were sampled from different sources with different register mixes. An era-to-era difference is partly a source difference. We do not claim to have measured drift over time, and the era rows should not be read as if we had.

---

## 3. The scorecard: a detector you can audit

*This section answers a direct objection: we had code that produced a number and could not say how the number was calculated.*

Using only the interpretable features above, we fitted a transparent classifier on **exactly the data the cycle-2 neural model was trained on** (6,887 documents) and evaluated it on **exactly the data that model was validated on** (793 machine and 4,184 human fresh long-form documents, plus 3,767 independent human documents from the evaluation battery).

The arithmetic is four lines:

```
clip each raw feature to its [1st, 99th] training percentile
z_i       = (x_i − mean_i) / sd_i
log_odds  = intercept + Σ weight_i × z_i
score     = 1 / (1 + exp(−log_odds))
```

No hidden layer, no embedding, nothing the reader cannot recompute. The constants are in [`results/scorecard-model.json`](results/scorecard-model.json); the feature definitions are in [`features.py`](features.py).

### Two variants, and a result we did not expect

We fitted the scorecard twice: once with the whole battery available, and once with **every formatting feature withheld**. The formatting-free variant is better.

| model | what it is | AUROC | @1% FP | @2% | @3% | @5% | @9% |
|---|---|---:|---:|---:|---:|---:|---:|
| **scorecard (prose-only)** | 24 readable features, no formatting | 0.980 | **72.1%** | 81.1% | 85.4% | 88.8% | 93.4% |
| scorecard (unrestricted) | 24 readable features, formatting allowed | 0.978 | 62.5% | 77.6% | 84.9% | 89.9% | 94.3% |
| all 122 features, additive | the additive ceiling | 0.983 | 69.1% | 81.5% | 86.5% | 91.9% | 96.3% |
| all 122 features, boosted trees | the feature ceiling | 0.982 | 75.4% | 81.2% | 86.1% | 90.4% | 94.7% |
| **neural cycle-2 (deployed)** | e5-small transformer, 33M parameters | **0.993** | **89.8%** | 93.1% | 94.5% | 96.7% | 98.4% |

793 machine / 4,179 human, none of it seen by either model.

**Forbidding formatting features raised detection at a 1% false-positive budget from 62.5% to 72.1%.** It also transformed generalisation to a *different* human population — 3,767 modern human web, business, marketing, academic and non-native documents:

| model | @1% budget | @2% | @3% | @5% | @9% |
|---|---:|---:|---:|---:|---:|
| **scorecard (prose-only)** | **0.27%** | **0.42%** | **0.66%** | **1.06%** | **2.57%** |
| scorecard (unrestricted) | 0.13% | 0.96% | 1.67% | 3.61% | 6.00% |
| all 122 features, additive | 1.04% | 1.81% | 2.12% | 3.58% | 6.00% |
| neural cycle-2 | 0.42% at the shipped 0.984 threshold | | | | |

At a 5% budget the unrestricted card wrongly flags 3.61% of these humans; the prose-only card flags 1.06%. On creative writing specifically, detection went from 28.2% to 62.1%.

This is the cleanest experimental confirmation the project has produced of a lesson it had already learned three times by other means: **hand-written formatting signals detect register and provenance, and they cost accuracy on the prose users actually paste in.**

### The price of transparency

**72.1% against 89.8% at a 1% false-positive budget.** The transparent model gives up **17.7 percentage points** of detection.

The gap is not the model class. Gradient-boosted trees over the same 122 features reach 75.4% — barely better than the additive scorecard. The features themselves are the ceiling. What the neural model has is not a cleverer combination of these properties; it is access to properties this battery does not name.

Per register, at a 1% budget:

| register | n | scorecard (prose-only) | boosted trees | neural |
|---|---:|---:|---:|---:|
| academic | 399 | 77.2% | 85.0% | 89.5% |
| corporate | 87 | 35.6% | 87.4% | 98.9% |
| creative | 103 | 62.1% | 26.2% | 79.6% |
| journalism | 115 | 79.1% | 66.1% | 87.8% |
| report | 89 | 87.6% | 89.9% | 96.6% |

Creative writing is the one register where the readable model beats the boosted trees outright (62.1% against 26.2%), which is worth noting before the next paragraph is read as a rout.

The scorecard's weakness is concentrated: on **corporate communications it manages 35.6% where the neural model reaches 98.9%**. Press releases and company updates are the register where an additive model over these features fails badly, and we cannot currently say why.

### The scorecard itself

The 24 weights, in full, are in [`tables/scorecard.md`](tables/scorecard.md). The top of the prose-only card:

| # | signal | weight (log-odds per SD) | alone (AUROC) | direction |
|---:|---|---:|---:|---|
| 1 | 'the' per 1,000 words | +0.825 | 0.525 | more ⇒ machine |
| 2 | sentence count | +0.823 | 0.592 | more ⇒ machine |
| 3 | **vocabulary variety (MATTR)** | **+0.772** | **0.911** | more ⇒ machine |
| 4 | mean word length | +0.769 | 0.631 | more ⇒ machine |
| 5 | word-pair surprisal spread | −0.703 | 0.726 | more ⇒ human |
| 6 | 95th-percentile word surprisal | −0.472 | 0.621 | more ⇒ human |
| 7 | 'a' per 1,000 words | +0.457 | 0.712 | more ⇒ machine |
| … | … | … | … | … |
| 9 | em dashes per 1,000 words | +0.392 | 0.772 | more ⇒ machine |
| 17 | **adjacent-sentence cohesion** | **−0.210** | **0.912** | more ⇒ human |

The `alone` column is deliberate, and it is the honest part. Read rows 1 and 3 together: *'the' per 1,000 words* carries the largest weight in the model while being nearly useless on its own (AUROC 0.525). That is not a discovery that the definite article betrays machines. It is a suppressor variable — it earns its weight by correcting the other features, not by carrying evidence. The reverse case is row 17: adjacent-sentence cohesion is the joint-strongest signal in this entire document on its own (AUROC 0.912) and carries a weight of only −0.210, because MATTR three rows above has already counted most of what it knows.

**A fitted weight is not a measure of importance.** Any scorecard shown to users must say so, or it will mislead them in both directions at once.

A note on stability: the sparse selection is fitted by L1 and is not perfectly reproducible run to run. Between two refits of this model the em-dash weight moved from +0.73 to +0.39 and the feature order shifted, while the evaluated performance moved by under 1.5 percentage points. The *set* of properties the model uses is stable; the exact split of credit between correlated members of that set is not, which is one more reason not to read a weight as an importance.

### Three documents, worked

Full line-by-line arithmetic is in [`tables/worked-examples.md`](tables/worked-examples.md). In summary:

| document | truth | scorecard | neural | what drove the scorecard |
|---|---|---:|---:|---|
| Qwen long-form journalism, 1,569 words | machine | **0.9997** flagged | 0.9879 flagged | sentence count +2.90, em dashes +1.33 and +1.24 |
| Europe PMC discussion section | human | **0.0002** not flagged | 0.0139 not flagged | MATTR −1.83, mean word length −1.18, *'the'* −1.09 |
| Meta long-form, borderline | machine | **0.9815** *missed* | 0.9895 flagged | *'the'* +1.74, third person +1.13, sentence count +1.06 |

The third case is the argument for showing both scores. It sits at 0.9815 against the scorecard's own 0.9816 operating point — missed by one ten-thousandth — while the neural model flags it. It is also a **Meta** document, and Meta is the provider §2.3 identified as the one where the headline signal is weakest. The transparent model fails exactly where the measurement predicted it would.

**And an uncomfortable detail in the first row.** The largest single contribution to that document's machine score is *sentence count*, at +2.90 of a total +8.12 log-odds. Sentence count is very largely document length. The readable model is partly counting how long the text is — a property that separates the classes in this corpus for reasons of how the corpus was built, not because length indicates authorship. It survived feature selection because it predicts well here. It is the weakest link in the scorecard, it is visible precisely because the model is transparent, and it is the first thing a future revision should remove and re-measure. A neural model with the same flaw would have hidden it.

### How much of the black box is explainable?

Fitting the interpretable features to predict the neural model's raw output, 5-fold cross-validated within the fresh held-out set:

| what predicts the neural score | R² | Pearson r |
|---|---:|---:|
| all 122 features, linear | **0.620** | 0.787 |
| all 122 features, gradient-boosted | **0.684** | 0.828 |
| the 24 prose-only scorecard features, linear | 0.487 | 0.699 |
| **within machine documents only** | **0.190** | 0.436 |
| **within human documents only** | 0.432 | 0.658 |

**About two-thirds of the deployed model's behaviour is reconstructible from properties we can name.** That is the publishable number, and it is higher than we expected.

The last two rows are the qualification, and they matter more than the headline. Most of that 0.62 is the model agreeing with the features about *which class a document belongs to* — the easy part. Ask instead why one machine document scores 0.999 and another 0.91, and the interpretable features explain only **19%** of it. The model's confidence within a class is largely driven by something this battery does not capture.

> A methodological note, because it changes the answer. Fitting this regression on the *training* split and testing it on fresh data gives R² = 0.364, and an earlier version of this analysis reported a negative R². Both are correct answers to a different and harsher question — whether an explanation calibrated on data the model memorised survives a distribution shift — and neither is the explainability figure. The model's margins are saturated on its own training data and on a different scale off it. The cross-validated within-fresh figure is the one that answers "how much of this is explainable in principle".

---

## 4. What the deployed model actually keys on

Three independent lines of evidence, because none of them proves anything alone. Full results: [`tables/model-probe.md`](tables/model-probe.md).

### 4.1 Ablation — the only causal line

400 machine and 400 human long-form documents, each altered one way at a time and re-scored through the deployed artefact at its shipped 0.984 threshold.

| change applied | machine flagged | change | human false positives |
|---|---:|---:|---:|
| *(unaltered)* | 90.0% | — | 2.25% |
| lowercase everything | 90.0% | **0.0 pp** | 2.25% |
| truncate to 400 words | 89.8% | −0.2 pp | 1.75% |
| **delete every 'AI vocabulary' word and phrase** | **89.2%** | **−0.8 pp** | 1.50% |
| drop the first paragraph | 89.0% | −1.0 pp | 1.75% |
| shuffle the paragraphs | 87.0% | −3.0 pp | 1.75% |
| strip all markdown | 85.2% | −4.8 pp | 2.00% |
| shuffle the sentences | 85.0% | −5.0 pp | 1.50% |
| normalise all punctuation | 85.0% | −5.0 pp | 2.25% |
| decrease repetition further | 83.2% | −6.8 pp | 1.00% |
| strip markdown **and** normalise punctuation | 73.2% | −16.8 pp | 2.50% |
| **make the text repeat itself more** | **57.0%** | **−33.0 pp** | 0.25% |
| truncate to 200 words | 59.8% | −30.2 pp | 0.75% |
| flatten the rhythm (split every sentence at its commas) | 46.8% | −43.2 pp | 0.00% |
| **truncate to 100 words** | **8.5%** | **−81.5 pp** | 0.00% |

Four things follow.

**The model is not running a keyword list.** Deleting every word and phrase on the "AI vocabulary" list — delve, leverage, tapestry, *in today's*, *it's not just X* — costs it **0.8 percentage points**. Any detector that could be defeated by find-and-replace is not this one.

**The model reads repetition, causally.** Replacing a quarter of content words with the document's own most frequent content words — changing nothing about length, sentence structure or function words, only making the text repeat itself more — drops detection from 90.0% to **57.0%**. This is the one manipulation that directly targets the §2 finding, and it moves the score more than anything except destroying the text. The two lines of evidence agree.

**Formatting matters, but is not the mechanism.** Stripping markdown costs 4.8 points; normalising punctuation costs 5.0; together 16.8. Real, secondary, and consistent with a model that has learned formatting as one correlate among many rather than as its rule.

**The model is close to order-blind.** Shuffling every sentence costs 5.0 points; shuffling paragraphs costs 3.0. It is reading local texture, not argument structure. That is a genuine limitation, and it is why a document assembled from mixed human and machine paragraphs remains the hardest case for it.

The 100-word collapse (8.5%) sharpens a limit the product already discloses. Note the mirror: human false positives also fall to 0.00%. The model does not become reckless on short text, it becomes silent.

> **What ablation can and cannot prove.** A large score shift proves the model is *sensitive* to the property manipulated. It does not prove that property is the model's reason. `flatten_rhythm` is the clearest case: it moves the score furthest (−43.2 pp), and it also produces text unlike anything in any training distribution, so the shift may be a distribution-shift artefact rather than evidence about rhythm. We report it and decline to draw the obvious conclusion from it.

### 4.2 Sentence occlusion

Every sentence deleted in turn from 57 documents: **2,174 deletions**, each re-scored.

- Only **35.9%** of sentences push their document towards "machine". Most sentences are neutral or push the other way.
- The top fifth of sentences carry **51.8%** of the absolute attribution. Evidence is concentrated, but not in one or two giveaway lines.
- Correlation between a sentence's position and its attribution: **+0.027**. The model is not simply reading the opening.
- The strongest correlation between any single property of a deleted sentence and its attribution is **ρ = 0.125** (first-person-plural rate, negative). Nothing about an individual sentence predicts its contribution well.

That last figure is a limit on this method rather than a finding about the model. Sentence-level attribution in a 512-token transformer is unstable — deleting a sentence changes the context of every other sentence — and it should not be presented to users as "these are the AI sentences". We can say what kinds of documents score high. We cannot reliably say which sentence did it.

### 4.3 What the score co-varies with

Spearman correlation between the deployed model's raw margin and each interpretable feature, computed **within each class separately** so the result is not just restating that both track the label.

| within machine documents (n = 793) | ρ | | within human documents (n = 4,184) | ρ |
|---|---:|---|---|---:|
| any markdown present | +0.534 | | **discourse markers** | **+0.368** |
| **vocabulary variety (MATTR)** | **+0.514** | | short words | −0.362 |
| Yule's K | −0.494 | | **mean word length** | **+0.359** |
| markdown headings | +0.488 | | long words | +0.300 |
| adjacent-word surprisal change | −0.475 | | **burstiness** | **−0.264** |

The right-hand column is the operationally useful one. It describes **which human writers are at risk of a false positive**: formal, long-worded, evenly-paced prose that uses explicit discourse markers. Academic and corporate writers, in other words — which matches the measured fact that academic carries the highest human false-positive rate of any genre. Burstiness, useless as a detector, is a real predictor of *false positives*: the more evenly paced a human's sentences, the higher they score.

---

## 5. The open-source foundation

This project began by studying published work, and several of the ideas below are load-bearing. Where a method could be implemented cheaply and honestly, it was implemented and measured on our own corpus rather than cited from its paper.

### 5.1 What we ran, and what we could not

600 machine and 600 human fresh long-form documents. Observer model: **GPT-2 small (124M), int8 with an fp16 LM head, 512-token cap** — the artefact already in this repository. One forward pass per document yields every statistic below. Full table: [`tables/open-source-baselines.md`](tables/open-source-baselines.md).

| method | AUROC | TPR@1% FP | TPR@5% FP | direction |
|---|---:|---:|---:|---|
| DivEye-inspired: surprisal kurtosis | **0.766** | 10.3% | 30.7% | AI lower |
| DivEye-inspired: surprisal skew | 0.763 | 0.0% | 27.7% | AI lower |
| DivEye-inspired: surprisal autocorrelation | 0.757 | 4.5% | 20.7% | AI lower |
| mean predictive entropy | 0.746 | 0.0% | 17.5% | AI higher |
| **GLTR** — share of tokens in the observer's top 100 | 0.735 | 0.0% | 18.0% | AI lower |
| mean log rank (DetectGPT baseline) | 0.728 | 0.0% | 19.0% | AI higher |
| GLTR — share in top 10 | 0.724 | 0.0% | 20.3% | AI lower |
| **log perplexity** (the classic baseline) | 0.715 | 0.0% | 15.8% | **AI higher** |
| DivEye-inspired: surprisal spread | 0.587 | 0.0% | 3.0% | AI higher |
| **Fast-DetectGPT** curvature | **0.545** | 14.8% | 21.2% | AI higher |
| *self*-Binoculars (degenerate) | 0.502 | 0.0% | 6.8% | — |

**Every one of these methods is close to useless at a 1% false-positive budget on modern long-form.** Most detect literally nothing: their machine and human distributions overlap so heavily that the top human percentile sits above almost the entire machine distribution. They separate the classes on average (AUROC 0.72–0.77) and cannot be operated at a threshold a responsible tool could ship.

Two results need stating carefully:

- **Fast-DetectGPT scores AUROC 0.545 here against ~0.93 in its paper.** This is a floor for the method, not a refutation of it. The paper uses far larger scoring models and the January 2026 update uses a Llama-3-8B pair; GPT-2 small is the weakest possible observer. What the measurement does establish is that **the browser-deployable version of Fast-DetectGPT is not viable**, which is a decision-relevant fact for this project.
- **Binoculars was not implemented.** It requires two *different* models — an observer and a performer — and only one language model is available offline here. With the same model in both roles the ratio degenerates to log-perplexity over entropy, which is what `self_binoculars` measures (AUROC 0.502, useless). **That number must never be quoted as Binoculars' score.** Binoculars' published 79% at a 5% false-positive rate on RAID stands unchallenged by anything in this document.

**SynthID could not be tested at all**, and saying so is the finding. It is a generation-time watermark: none of our corpus was generated with it enabled, and there is no detector key. A post-hoc text detector cannot evaluate it. Any tool claiming to detect or remove SynthID without a key is claiming something the method does not support.

### 5.2 Two corrections to received wisdom

**Modern machine text has *higher* GPT-2 perplexity than human text.** Median log-perplexity 3.68 for machine documents against 3.31 for human ones, and the direction holds in every register measured (academic 0.677, corporate 0.778, creative 0.509, journalism 0.811, report 0.744). The founding assumption of the whole zero-shot family — that machine text is what a language model finds predictable — is inverted for 2026 models against a 2019 observer. Current models write with a vocabulary and phrasing that GPT-2 finds *less* expected than human web prose. This is the same under-repetition finding arriving through a third instrument.

**DivEye's central claim survives.** Its argument is that the *diversity* of the surprisal sequence separates the classes better than its mean. Measured here, the diversity moments (kurtosis 0.766, skew 0.763, autocorrelation 0.757) beat mean log-perplexity (0.715) and beat every GLTR bucket. **This is a case where the open-source method's core idea is confirmed on data it has never seen** — and it is a 2026 confirmation of a claim its authors could not have tested on 2026 models.

### 5.3 Credit, per project

Recorded from this repository's own evidence log and traceability matrix. Where a fact is not recorded there, it is marked so rather than inferred.

| project | reference | licence | what it contributed | does its signal survive here? | our position |
|---|---|---|---|---|---|
| **avoid-ai-writing** (Conor Bronsdon) | `github.com/conorbronsdon/avoid-ai-writing`, snapshot `40328bd2…` | MIT | 46 of 51 weighted rule categories in the v0.2 rules tier; confusable tables; scoring logic, adapted to TypeScript. One upstream bug fixed in the port | **Largely no.** Its lexical core measures at AUROC 0.578, clearing 0.65 on 5 of 33 source pairings. Its burstiness component measures 0.521 | Adapted with attribution. Its vocabulary rules are **superseded**; its type-token-ratio intuition is **vindicated**: the length-robust form of that measure (MATTR, 0.797 pooled and 0.911 on fresh long-form) is the strongest single interpretable signal we found |
| **watermarks-remover** (Guillaume Meyer) | `github.com/guillaumemeyer/watermarks-remover`, snapshot `4a0fbc31…` | MIT | Carrier and confusable table *data*; the explicit-carrier inspection model; the market opening | Not applicable — deterministic character forensics, not statistical detection. Those checks remain exact and near-zero false positive | Table data adapted. Its placeholder Claude detector **excluded**: we will not present a placeholder as a detector |
| **GLTR** (arXiv:1906.04043) | no repository or licence recorded in this project | **not recorded** | The rank-bucket idea and the per-token explanation overlay | **Partly.** AUROC 0.724–0.735, but 0.0% detection at a 1% budget | Reimplemented from the paper. Useful as an *explanation* surface, not as a verdict. **Its licence position is an open gap in our records and should be closed** |
| **Fast-DetectGPT** (Bao et al., ICLR 2024) | snapshot `971b0520…` | MIT | Sampling-free conditional-probability curvature; a single-pass detector design | **Not at browser scale.** 0.545 with a GPT-2 observer | Snapshotted, measured, **not shipped**. The measurement is why |
| **Binoculars** (Hans, Schwarzschild & Goldstein) | `github.com/ahans30/Binoculars`, snapshot `c8ae2f90…` | BSD-3-Clause | The observer/performer cross-perplexity design | **Untested.** Requires two models; not runnable offline here | **Not implemented.** Its published results stand; our degenerate proxy says nothing about it |
| **DivEye** (arXiv:2509.18880, TMLR 2026) | no repository recorded here | **CC BY-NC** — code must not be consulted | The claim that surprisal *diversity* beats surprisal *mean* | **Yes — confirmed.** Diversity moments reach 0.766 against 0.715 for the mean | Reimplemented from the paper only, per licence. Its central claim is **independently confirmed on 2026 models** |
| **SynthID-Text** (Dathathri et al., *Nature* 2024) | `github.com/google-deepmind/synthid-text`, snapshot `addb4a15…` | Apache-2.0 | Detection mathematics, ported into the watermark lab for known-key experiments | **Not testable.** Generation-time watermark, no key, not present in our corpus | Ported for controlled experiments. **Never** presented as provider verification |
| **Pangram method** (arXiv:2402.14873) | proprietary service; method published | method public, service proprietary | Hard-negative mining with synthetic mirrors — the training recipe behind cycle-2 | **Yes.** Cycle-2's 0.993 AUROC on fresh data is that recipe working | Method adopted from the literature. Service **excluded**: no key, no call, no claim |

The single largest debt is to the **Pangram method**. The retraining recipe — take a large human pool, find what your classifier wrongly flags, generate machine-written mirrors of those same documents, retrain, repeat — is what moved this project from AUROC 0.53 to 0.97 on published prose. It was published, it was ours to implement, and it worked.

The second largest is to **avoid-ai-writing**, which deserves a more nuanced credit than "its rules did not work". Its rules did not work. But its stylometric intuition — low type-token ratio, function-word distributions, cross-paragraph variation — pointed at the family the strongest signal in this document belongs to. It got the direction right and the threshold wrong.

---

## 6. What we recommend shipping

**Show both. The neural score is the verdict; the scorecard is the explanation.**

The evidence for that split:

1. **The neural model is meaningfully better and should decide.** 89.8% against 72.1% at a 1% false-positive budget, on identical unseen data. Nearly eighteen points is not a rounding error, and it is concentrated in exactly the registers agencies check most (corporate: 98.9% against 35.6%). Substituting the transparent model for the verdict would be trading real accuracy for a property users can get another way.
2. **The scorecard is honest enough to publish as the explanation.** It reconstructs 62% of the neural model's behaviour across classes, it agrees with it on the overwhelming majority of documents, and where it disagrees, the disagreement is visible and auditable. A user who is told *"this scored high because its vocabulary variety is 1.8 SD above the human norm and its sentences share unusually few words with their neighbours"* has been given something they can check against their own draft. A bare percentage cannot be argued with, which is not a virtue.
3. **Ship the prose-only variant.** It is better on unseen prose (72.1% against 62.5%), far better on an independent human population (1.06% against 3.61% false positives at a 5% budget), and it cannot embarrass us by explaining a verdict in terms of markdown.
4. **Present weights honestly or not at all.** The `alone` column exists because a fitted weight is not an importance. Showing users that "'the' per 1,000 words" carries the largest weight, without saying it is a suppressor variable that carries almost no evidence alone, would be a new way of misleading them.
5. **Never present sentence-level attribution.** We measured it. The strongest correlation between any property of a sentence and its contribution is ρ = 0.125. Highlighting "the AI sentences" would be inventing precision we do not have.

The rules tier stays where the project already put it: editorial suggestions, never evidence of authorship. Nothing here rehabilitates it. This document adds the measurement that was missing — its lexical core is AUROC 0.578, and its most famous component is 0.521.

---

## 7. Limitations

Stated plainly, because the document is worth less without them.

1. **This is distributional evidence.** Nothing here identifies an individual document's author, and the strongest single interpretable signal still misses more than half of machine-written long-form at a 1% false-positive budget.
2. **The human corpus is not a random sample of human writing.** It is what was obtainable under a clear licence: open-access science, government publications, filings, licensed news, C4 web text, student essays. Under-represented: modern trade non-fiction, professional journalism behind paywalls, and personal writing of every kind.
3. **Genre labels are machine-assigned and unvalidated** for a substantial part of the corpus. Register-matched comparisons inherit that error.
4. **The register families were normalised by us**, from vocabularies that differ between upstream pools. That mapping is a judgement, recorded in [`build_corpus.py`](build_corpus.py) and open to disagreement.
5. **Two providers do not show the headline signal.** Meta (0.562) and Nvidia (0.434) are documented exceptions and we cannot currently explain them.
6. **Creative and social writing are the weak registers** — 0.668 and 0.658 on the top signal — and the corpus is thinnest there (251 and 2,132 machine documents, 260 and 1,119 human).
7. **Corporate communications defeat the transparent model** (35.6% against the neural model's 98.9%) and we do not know why. That is an unexplained result, not an acceptable one.
8. **The syntactic features are heuristics.** Passive voice and proper nouns are approximated by regular expressions, and are named `_approx` throughout. No part-of-speech tagger was used.
9. **The surprisal features use a corpus unigram/bigram background model**, not a neural language model. The GPT-2-based measurements in §5 are on a 600-a-side subsample, not the full corpus.
10. **Attribution has hard limits.** Ablation shows sensitivity, not reason. Occlusion is unstable. Correlation is not mechanism. §4 is triangulation, and it is presented as triangulation.
11. **Era comparisons are confounded with source.** We did not measure drift over time and do not claim to have.
12. **Everything here is a snapshot of August 2026.** Signals decay: the vocabulary tells that worked in 2024 are worthless now, and the under-repetition signal will be trained against once it is published. This document has a shelf life, and the methodology is published so that the measurement can be repeated rather than believed.

---

## 8. Reproducing this

Everything is in this directory. No network access, no API calls, no spend.

```
python build_corpus.py       # unify + de-duplicate every labelled corpus
python compute_features.py   # 123 interpretable features per document
python score_neural.py       # deployed cycle-2 model over the same documents
python analyse_features.py   # effect sizes, BH-FDR, single-feature detection
python scorecard.py          # the transparent classifier and the neural gap
python probe_model.py        # ablation, occlusion, score-feature correlation
python baselines.py          # published methods on our corpus
python robustness.py         # per-source and per-provider survival
python worked_examples.py    # line-by-line arithmetic on three documents
python make_tables.py        # render results/*.json into tables/*.md
```

Interpreter: `../cycle3-edited/.venv/bin/python`. Every computed number is in `results/*.json`; every table in the document is generated from those files by `make_tables.py`, so no figure here is hand-typed.

**The corpus itself cannot be redistributed.** It includes rows held under a research-evaluation quotation licence with no redistribution rights, and rows under source-specific licences recorded per document. The statistics are publishable; the text is not. The feature battery, the scorecard constants, the analysis code and the methodology are all publishable, and are the parts that make this reproducible on someone else's corpus.

---

### Evidence index

| document | what it holds |
|---|---|
| [`tables/feature-battery-freshlongform.md`](tables/feature-battery-freshlongform.md) | all 122 features ranked, fresh long-form |
| [`tables/feature-battery-all.md`](tables/feature-battery-all.md) | all 122 features ranked, full matched corpus |
| [`tables/famous-heuristics.md`](tables/famous-heuristics.md) | burstiness, clichés, em dashes and the rest, with verdicts |
| [`tables/by-register.md`](tables/by-register.md) | top signals per register family |
| [`tables/by-evasion-axis.md`](tables/by-evasion-axis.md) | per provider, prompt style, model tier, era |
| [`tables/robustness.md`](tables/robustness.md) | every signal against every human source and every provider |
| [`tables/signal-redundancy.md`](tables/signal-redundancy.md) | correlation matrix of the top 30 signals |
| [`tables/scorecard.md`](tables/scorecard.md) | the full transparent model, both variants |
| [`tables/worked-examples.md`](tables/worked-examples.md) | three documents, scored line by line |
| [`tables/transparent-vs-neural.md`](tables/transparent-vs-neural.md) | the comparison, the false positives, the explainability |
| [`tables/model-probe.md`](tables/model-probe.md) | ablation, occlusion, score correlation |
| [`tables/open-source-baselines.md`](tables/open-source-baselines.md) | published methods on our corpus |
