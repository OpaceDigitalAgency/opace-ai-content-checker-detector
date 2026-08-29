# Measured findings

Four results from this project's research that are worth publishing on their own, taken out of the internal reports and given their denominators. Two of them make the tool look worse. They are here for the same reason as everything else in this repository: a claim without a measurement is not a claim, and a measurement that only gets published when it flatters the product is not a measurement either.

Each section names the corpus, the model, the threshold and the runtime the figure came from, because in this project those four things have each been the cause of a retracted claim at least once.

**Read this alongside** [`CAPABILITIES.md`](CAPABILITIES.md) (what ships, at what version) and [`EVIDENCE-INDEX.md`](EVIDENCE-INDEX.md) (every research report, with its headline result).

---

## 1. Asking a model to "write like a human" was worth 92 points

**Source:** [`../services/local-engine/research/generated-corpus/GENERATED-CORPUS-EVAL.md`](../services/local-engine/research/generated-corpus/GENERATED-CORPUS-EVAL.md) §"Question 3 — prompt style", and [`../services/local-engine/research/cycle2-train/CYCLE2-REPORT.md`](../services/local-engine/research/cycle2-train/CYCLE2-REPORT.md) for the retrained figures.

4,016 articles were generated across 21 models under three prompt styles, with the same 106 topic prompts and the same registers on every model. Only the instruction changed:

- **plain** (1,307 samples) — write the article.
- **house-brief** (1,338) — write the article to a house style guide.
- **human-voice** (1,371) — write the article, and write like a human.

Scored with the model that shipped at the time (`tier3-e5small-int8-perchannel.onnx`), detection collapsed:

![Grouped bar chart. Detection of AI articles under three prompt styles at two thresholds. At the 0.8533 comparison threshold, plain prompting is detected 55.9 percent of the time, a house-style brief 44.7 percent, and an explicit write-like-a-human instruction 19.8 percent. At the 0.857 threshold that shipped at the time the same three read 21.0 percent, 13.1 percent and 3.5 percent.](assets/charts/prompt-style-ablation.svg)

| prompt style | n | detected @ 0.8533 | detected @ 0.857 (shipped at the time) |
|---|---:|---:|---:|
| plain | 1,307 | 55.9% (731/1,307) | 21.0% (275/1,307) |
| house-brief | 1,338 | 44.7% (598/1,338) | 13.1% (175/1,338) |
| human-voice | 1,371 | **19.8% (272/1,371)** | **3.5% (48/1,371)** |

A 36.1-point fall at the comparison threshold; a 17.5-point fall at the shipped one, which is an 83% relative drop. The house-style brief sits between the two and much closer to plain, so it is **the explicit anti-AI instruction, not prompt sophistication in general**, that does the damage.

Per model it went further. `anthropic/claude-fable-5` fell from 70.5% (31/44) to 10.0% (5/50). `x-ai/grok-4.6` fell from 29.3% (24/82) to **0.0% — 0 of 86**. Only one model of the 21, `openai/gpt-5.6-sol`, stayed above 50% under an anti-AI prompt.

### What the deployed model does

**These figures are from the superseded model.** Publishing them as current would overstate the weakness, which is its own kind of dishonesty. The cycle-2 model that ships today was trained with human-voice samples deliberately upweighted as hard negatives, and on held-out samples at a 2% false-positive budget it reads:

| prompt style | n | superseded model | cycle-2 (deployed) |
|---|---:|---:|---:|
| plain | 184 | 28.3% (52/184) | 97.8% (180/184) |
| house-brief | 276 | 14.5% (40/276) | 97.1% (268/276) |
| human-voice | 274 | 5.8% (16/274) | **98.2% (269/274)** |

**The caveat that belongs with that number.** Those held-out human-voice documents come from the same generation run, split group-aware by content hash. The model was trained to handle exactly that distribution. **No prompt-style split has been measured on an independent corpus.** The fresh-data validation (5,558 documents, 90.6% overall detection at threshold 0.98) does not carry prompt-style labels. So the honest position is: the evasion axis is closed on the distribution we trained against, and untested on one we did not. Anyone relying on this tool against a determined evader should read it that way.

---

## 2. Register decides detection more than the model does

**Source:** same corpus and same report, §"Question 4 — detection by register". Same 21 models, same 106 topic prompts, same three prompt styles across every register.

![Horizontal bar chart. Share of AI articles detected in each register family on the 4,016-article corpus. Marketing and SEO copy 77.9 percent, press releases newsletters case studies and FAQs 53.3 percent, articles 37.5 percent, social posts 11.5 percent, academic 1.1 percent. The spread from top to bottom is 76.8 percentage points.](assets/charts/detection-by-register-family.svg)

| register family | n | detected @ 0.8533 |
|---|---:|---:|
| marketing-seo | 797 | **77.9% (621/797)** |
| other-shared (press release, newsletter, case study, FAQ) | 797 | 53.3% (425/797) |
| article (company blog, news, how-to, thought leadership) | 1,244 | 37.5% (467/1,244) |
| social-post | 721 | 11.5% (83/721) |
| academic (essay, literature review, discussion) | 457 | **1.1% (5/457)** |

**76.8 points of spread, with the model held constant.** No model in the corpus spans anything like that range: the widest per-model gap between plain and human-voice prompting is 60.5 points, and the flagship-versus-cheap-model gap is 16.5. What the text *is* mattered more than who wrote it.

At the individual-register level the extremes are starker still. Category pages: 88.5% (69/78). Academic essays: **0 of 193**, and only 7 of 193 even at the much looser 0.6256 threshold. Continuous argued prose with citations, no headings and no bullets removes nearly every structural signal that model was relying on.

This is the measured form of the project's central discovery. The classifier had been trained on chat replies while users paste published prose; the same model scored one text 66% as a chat reply and 4% as an article. Retraining on published-register data took AUROC from 0.530 to 0.970 and academic detection from 0.0% to 79.4% at a 2% false-positive budget, and to 84–94% on the fresh long-form corpus at the shipped threshold.

**Read the marketing figure carefully.** 77.9% looks like the good news, and partly it is not: human business-marketing copy scored a mean of 0.613 on that model against 0.226 for general human text. Some of what the strong register was catching is *promotional writing*, not *machine writing*. That confound is why the rules tier was later demoted, and why the cycle-2 retrain was measured against a purpose-built human business-marketing corpus rather than against general prose.

---

## 3. There is no such thing as "the AI sentences"

**Source:** [`../services/local-engine/research/signal-science/SIGNAL-SCIENCE.md`](../services/local-engine/research/signal-science/SIGNAL-SCIENCE.md) §4.2, raw values in [`model-probe.json`](../services/local-engine/research/signal-science/results/model-probe.json).

Every sentence was deleted in turn from 57 documents and the document re-scored — **2,174 deletions**, each one a measurement of what that sentence contributed.

| | |
|---|---:|
| Sentences that push their document towards "machine" | **35.9%** |
| Share of total absolute attribution carried by the top fifth of sentences | 51.8% |
| Correlation between a sentence's position in the document and its attribution | +0.027 |
| Strongest correlation between any single property of a sentence and its attribution | ρ = 0.125 |

Read those four rows together. **Barely a third of sentences push their document towards a machine reading**; most are neutral or push the other way. Evidence is somewhat concentrated — the top fifth carries about half of it — but not in one or two giveaway lines. Position tells you nothing: the model is not simply reading the opening. And nothing about a sentence in isolation predicts its contribution: the best single predictor manages ρ = 0.125, which is close to no relationship at all.

**Why this is published rather than shipped as a feature.** Highlighting "the AI sentences" is the single most-requested feature of every detector in this category, and several products offer it. This measurement is the reason ours does not. Sentence-level attribution inside a 512-token transformer is unstable by construction — deleting a sentence changes the context of every sentence around it — so a per-sentence highlight would be presenting instability as evidence, against a named person's writing. The tool can say what kinds of documents score high. It cannot reliably say which sentence did it, and it does not pretend to.

The 57-document, 2,174-deletion denominator is small, and it bounds what this can prove: it is enough to rule out a clean per-sentence signal, not enough to characterise the distribution of attribution precisely.

---

## 4. Which writing rules run backwards, named

**Sources:** [`../services/local-engine/research/rule-validation/RULE-VALIDATION.md`](../services/local-engine/research/rule-validation/RULE-VALIDATION.md) (the original 1,896-sample measurement) and [`../tests/battery/rule-liveness.json`](../tests/battery/rule-liveness.json) (the 10,096-document re-measurement, 29 August 2026).

The published documentation has always given the *count* of writing rules that fire more often on human writing than on AI writing. It has never named them. Here they are, and the re-measurement changed the answer.

The original figure was measured on 1,727 AI and **169** human documents — the same human corpus, 76% encyclopaedic and question-and-answer text, that had already caused three separate claims in this project to be retracted. Re-measured on **5,743 AI and 4,353 human documents**, ten of the seventeen rules reverse direction. Six remain backwards at Benjamini–Hochberg q < 0.05:

| rule | AI (of 5,743) | human (of 4,353) | likelihood ratio | q |
|---|---:|---:|---:|---:|
| `parenthetical-hedge` | 0.03% (2) | 0.32% (14) | 0.11 | 6.3e-4 |
| `quote-inconsistency` | 0.50% (29) | 2.66% (116) | 0.19 | 1.7e-19 |
| `passive-ratio` | 0.54% (31) | 2.09% (91) | 0.26 | 3.9e-12 |
| `low-specificity` | 0.42% (24) | 1.42% (62) | 0.29 | 1.2e-7 |
| `adjacent-lemma-repeat` | 8.24% (473) | 21.41% (932) | 0.38 | 2.4e-78 |
| `tier1-clarity` | 10.85% (623) | 22.77% (991) | 0.48 | 1.7e-57 |

`didactic-note` also points backwards (0.21% against 0.34%) but at q = 0.26 is not distinguishable from chance.

**A figure that would not reproduce, and is therefore withdrawn.** `token-cutoff` was recorded as one of the clearest backwards rules: 3.55% of humans (6/169) against 0.58% of AI (10/1,727), likelihood ratio 0.16, q = 0.012. On the larger corpora it points the *right* way and strongly — **4.04% of AI (232/5,743) against 0.51% of humans (22/4,353), likelihood ratio 8.0** — and it is one of the more discriminating rules in the pack. The original figure rested on six human documents. It should not be quoted, and it is not published here as a finding.

`not-just-contrast` (0.18% → 2.05%, LR 11.2), `normalization-flag` (LR 6.6), `hollow-intensifier` (LR 2.7), `setup-expansion-cadence` (LR 2.0), `real-actual-inflation` (LR 2.0), `staccato-fragments` (LR 1.6), `title-case-header`, `smart-punct-signature` and `vague-attribution` also all reversed or lost their backwards reading.

### What a backwards rule means for you

Every one of these rules is presented in the product as an **editorial suggestion** — "this phrasing is generic", "these sentences are unusually uniform" — and none of them contributes to the AI reading. That decision was taken on 28 August 2026 after the whole tier measured 45.1% detection at a 24.8% human false-positive rate.

For the six above, take the suggestion as writing advice only, and know that following it makes your prose look *less* like the human documents in our corpora, not more. `adjacent-lemma-repeat` and `tier1-clarity` are the two that matter, because they fire on roughly one human document in five. Repeating a word across adjacent sentences and using the vocabulary `tier1-clarity` objects to are both things human writers do more than models do. If you are editing to sound less like a machine, these two rules will point you the wrong way.

### The caveat that applies to all of it

The AI and human sides are different corpora, not two halves of one. The AI side is dominated by 4,016 generated long-form articles; the human side by 4,144 modern human samples weighted towards business and marketing copy. Register differs between the sides, and *register confounding authorship* is this project's central finding — so these likelihood ratios describe how a rule behaves across our corpora, not a clean causal statement about authorship. They are strong enough to say a rule points the wrong way. They are not strong enough to fix a weight.

---

## Reproducing these

| finding | command / file |
|---|---|
| 1, 2 | `services/local-engine/research/generated-corpus/analyze.py` against `generated.jsonl` (corpus not in this repository — see [`programme/HANDOVER.md`](programme/HANDOVER.md) §2) |
| 3 | `python probe_model.py` in `services/local-engine/research/signal-science/`, needs the venv at `services/local-engine/research/current-models/.venv/bin/python3` |
| 4 | `node tests/battery/rule-liveness.mjs`, then read `tests/battery/rule-liveness.json` |
