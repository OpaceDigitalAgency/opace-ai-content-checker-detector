# Synthetic cadence: measuring the paragraph rhythm the owner reads by ear

Measured 29 August 2026. **Nothing in the product was changed.** No threshold, no rule, no gate,
no model. Everything below is measurement, and the shipping decision is separate and is the
owner's.

---

## Headline

1. **The signals carry real conditional information, and the previous rhythm rules did not.**
   The best three fire on the AI documents the model misses at **3.6 times** the rate they fire
   on the human documents it correctly clears, 95% bootstrap interval **[2.40, 4.75]** — an
   interval that excludes 1. The seven shipped v4 rules score **1.2** on the same measurement and
   their interval does not. So this is a different result from `AGGREGATION-AND-RHYTHM.md` §3, not
   a repeat of it.
2. **It still does not convert into a change worth making.** The best operating point gains
   **5 AI documents and costs 5 human false positives**, held out at **+0.562pp detection for
   +0.106pp false positives**. The minimum-evidence aggregation candidate already measured and
   not yet shipped does better on both axes (+0.82pp for +0.077pp). Every wider setting is much
   worse: the single-signal version at band 0.95 takes human fiction from 11.15% to **15.38%**,
   which `OBJECTIVE.md` forbids.
3. **The discourse-marker hypothesis is refuted.** Low density of the owner's banned connectives
   was the brief's most promising lead. Measured, it separates nothing: **44.25% of AI against
   44.44% of human documents**, likelihood ratio **1.00**, and conditionally it points the wrong
   way (AUROC 0.406 — the model's failures use *more* of these markers than the human text it
   clears, not fewer).
4. **On the owner's own nine documents the paragraph rule reads them the way he does.** His
   humanised 80.8% article scores **8**, the unedited AI scores **7**, and his six genuine human
   articles score **3, 0, 0, 0, 1, 0**. The module finds both passages he quoted, verbatim, with
   the role sequences he described. That is the most encouraging result here and it is also the
   one with the smallest denominator.
5. **The paragraph-level result cannot be tested where it matters most.** **0 of 260** human
   fiction documents in the corpus have paragraph breaks at all — the source stripped them. Every
   paragraph-shape signal is undefined on the worst false-positive register in the tool.

**Verdict: do not ship as detection.** The measurement is worth keeping and the module is worth
committing, because it is the first thing in this project that fires on the model's failures more
than on its successes. It is not worth a policy change to the AI verdict.

---

## 0. Provenance

| | |
|---|---|
| Corpus | `services/local-engine/research/longform-corpus/` — 5,558 documents, **922 AI**, **4,636 human** |
| Document scores | `corpus-reconciliation-2026-08-29/raw/lf-ai.jsonl`, `lf-hu.jsonl` — the shipped **fp32 cycle-2** checkpoint under `segments-v2` at **0.984** |
| Provenance check | `run_corpus.py` asserts the reused scores reproduce **877/922 = 95.12%** detection and **56/4,636 = 1.21%** false positives before computing anything. The run aborts if they do not. |
| Not used | `longform-corpus/tier3-scores.jsonl` and everything under `current-models/` — retired **cycle-1** model, maximum 0.8582. Never read here. |
| Owner's nine | Re-scored through `corpus-reconciliation-2026-08-29/harness.py`, model SHA-256 `e313ab00de1fffd2…`, returning **2.2, 5.4, 3.3, 11.7, 20.8, 8.9, 97.2, 98.6** and — for the first time, because the file now exists — **80.8** |
| Code | `services/local-engine/research/signal-science/cadence/` |
| Runtime | feature pass over 5,558 documents in **26 s**, pure Python; no model, no network |

The ninth document, missing when `AGGREGATION-AND-RHYTHM.md` §4 was written, is present now at
`samples/9-ai-with-humanise-instructions.json` and scores 80.8% to the digit.

---

## 1. What was built, and what it approximates

`Identify-AI-Rhythm.md` proposes an LLM sentence-role classifier. That was **not built** — the
tool's promise is that it runs free in a browser. Roles are approximated from closed-class word
lists, sentence-initial shape, mood and punctuation, and the approximation is deliberately crude
so a reader can check it against a paragraph by eye.

Eight roles: `C` claim, `X` contrast or qualification, `E` example, `I` instruction, `R`
recommendation, `S` consequence, `Q` question, `A` aside. Assigned in fixed precedence.

On the owner's three quoted passages the roles land exactly where he and the analysis said they
would:

| passage | roles | the analysis called it |
|---|---|---|
| "A business owner may build a website…" | **C I S** | statement → instruction → consequence |
| "Page count affects effort…" | **X X I** | qualification → counter-example → instruction |
| "A specialist platform changes…" | **C C** (second sentence balanced) | declaration → balanced taxonomy |

Fourteen document-level signals were computed. Every one is signed so that a higher value means
more synthetic; those whose natural direction is the other way round are stored negated and named
`low_*`.

### What could not be computed deterministically, and was dropped

- **"Rhetorical triplets" as semantic sequences.** Only their surface form survives, which is what
  `template_repetition_z` measures.
- **"Artificial closure" as a takeaway rather than a continuation.** What is actually measured is
  whether a paragraph ends on an instruction, recommendation or consequence. That is narrower
  than the idea and the numbers below should be read as testing the narrower thing.
- **"Statement pressure" as an absence of digression.** Approximated by `low_messiness`
  (parentheticals, dashes, first and second person, hedges, sentence-initial *And/But/So*).

---

## 2. The confound that bounds everything: paragraph markup

Several human sources in the corpus arrive as one unbroken block, because the scraper or the PDF
extraction lost the paragraph breaks. This is a property of the corpus, not of the writing.

| human register | with paragraph markup |
|---|---|
| longform-journalism | 840/840 |
| academic-discussion | 419/420 |
| student-essay | 414/420 |
| academic-introduction | 394/420 |
| academic-conclusion | 317/360 |
| academic-lit-review | 216/225 |
| research-summary | 174/189 |
| white-paper | 482/840 |
| company-update | 206/662 |
| **story (fiction)** | **0/260** |

AI documents: **921 of 922**. Human documents: **3,462 of 4,636**.

Two consequences, both stated before any table is read.

**First, a paragraph-shape signal that was allowed to treat "no paragraphs" as a value would
separate AI from human almost perfectly, and would be measuring the scraper.** Every paragraph
signal in this module returns `NaN` when the markup is absent and every table below carries its
own denominator.

**Second, the worst false-positive register in the tool cannot be tested at all.** Human fiction
runs at 11.15% and has no paragraph breaks anywhere in the corpus. Any claim that a
paragraph-shape rule leaves fiction alone is untested, not verified. That is on its own close to
disqualifying for shipping.

---

## 3. Every signal: fire rates and likelihood ratios

Gates are the **95th percentile of the human distribution** of each signal, so by construction the
human fire rate is about 5% and the likelihood ratio is readable directly. This is an in-sample
gate, chosen so that no signal can be reported with a threshold no real text reaches — the failure
mode that produced `punchline-fragment-density` firing on 0 of 5,558.

**Every signal fires on both sides. None is dead.**

### 3.1 All 5,558 documents, signals that need no paragraph markup

| signal | AI (n=922) | human (n=4,635) | LR |
|---|---|---|---|
| `tri_compression_flat` | 135 = 14.64% | 233 = 5.03% | **2.91** |
| `balanced_construction` | 124 = 13.45% | 234 = 5.05% | **2.66** |
| `low_messiness` | 107 = 11.61% | 238 = 5.13% | **2.26** |
| `declarative_uniformity` | 64 = 6.94% | 236 = 5.09% | 1.36 |
| `enumeration_density` | 53 = 5.75% | 233 = 5.03% | 1.14 |
| `assertive_utility` | 48 = 5.21% | 241 = 5.20% | 1.00 |
| `low_banned_markers` | 408 = 44.25% | 2,060 = 44.44% | **1.00** |
| `low_discourse_markers` | 66 = 7.16% | 412 = 8.89% | 0.81 |

One document of 5,558 is 38 words and every signal is undefined on it, which is why the human
denominator is 4,635 rather than 4,636.

### 3.2 Paragraph-bearing documents only, all signals

n = 4,383 (921 AI, 3,462 human).

| signal | AI | human | LR |
|---|---|---|---|
| `tri_compression_flat` | 158/921 = 17.16% | 174/3,462 = 5.03% | **3.41** |
| `low_messiness` | 108/921 = 11.73% | 174/3,462 = 5.03% | 2.33 |
| `balanced_construction` | 106/921 = 11.51% | 174/3,462 = 5.03% | 2.29 |
| `paragraph_cadence_max` | 266/921 = 28.88% | 483/3,451 = 14.00% | 2.06 |
| `declarative_uniformity` | 92/921 = 9.99% | 178/3,462 = 5.14% | 1.94 |
| `template_repetition_z` | 78/921 = 8.47% | 161/3,204 = 5.02% | 1.69 |
| `paragraph_cadence_rate` | 73/921 = 7.93% | 173/3,451 = 5.01% | 1.58 |
| `enumeration_density` | 72/921 = 7.82% | 174/3,462 = 5.03% | 1.56 |
| `low_banned_markers` | 407/921 = 44.19% | 1,500/3,462 = 43.33% | 1.02 |
| `assertive_utility` | 40/921 = 4.34% | 178/3,462 = 5.14% | 0.84 |
| `low_discourse_markers` | 66/921 = 7.17% | 322/3,462 = 9.30% | 0.77 |
| `instructional_closing` | 30/921 = 3.26% | 191/3,451 = 5.53% | 0.59 |
| `micro_compression` | 24/921 = 2.61% | 173/3,384 = 5.11% | 0.51 |
| `artificial_closure` | 13/921 = 1.41% | 198/3,451 = 5.74% | 0.25 |
| `low_opening_diversity` | 4/921 = 0.43% | 183/3,462 = 5.29% | **0.08** |

**Four of the analysis's own candidates point the wrong way.** Instructional closing, artificial
closure, micro-paragraph compression as a paragraph-level fraction, and opening-pattern diversity
all fire *more* on human writing than on AI. Opening diversity is the most decisive: human
documents in this corpus repeat their paragraph openings twelve times more often than AI documents
do. Published human prose reuses "The" and "In" and "This" to start paragraphs; the AI corpus
varies more.

### 3.3 The discourse-marker lead, which was the strongest a-priori bet

`low_banned_markers` counts the connectives the owner's house prompt bans, per 1,000 words. The
brief expected low density to be a fingerprint of the instruction style. It is not a separator:
**44.25% against 44.44%, LR 1.00**, and 44% of both sides sit at exactly zero, which makes the gate
degenerate.

The instruction does change the text — median density falls from **0.835** per 1,000 words on
plain prompts to **0.411** on house-brief and **0.453** on human-voice — but human published prose
sits at **0.742**, between the two. Anti-AI-instructed AI ends up *below* human on this measure and
plain AI *above* it, so the measure cannot separate either group cleanly.

As a continuous measurement rather than a gate it is not dead: the wider marker inventory,
`low_discourse_markers`, reaches AUROC **0.601** separating AI from human. But on the 45 documents
the model misses it reads **0.379** — reversed. The AI the model fails on uses *more* of these
connectives than the human text it clears, which is the opposite of the brief's hypothesis and the
reason the gated version measures nothing.

`AGGREGATION-AND-RHYTHM.md` established that within human documents the model's margin correlates
+0.368 with discourse-marker density. That correlation is real. It does not follow that low density
identifies AI, and this corpus says it does not.

---

## 4. The conditional result — the only question that matters

Among the **45** AI documents the model misses at 0.984, against the **4,580** human documents it
correctly clears. Bootstrap intervals from 2,000 resamples of both sides, because n = 45.

| signal | on the 45 misses | on the 4,580 cleared | ratio [95% CI] |
|---|---|---|---|
| `tri_compression_flat` | 11 = 24.44% [14.2–38.7] | 213 = 4.65% | **5.26 [2.73, 8.12]** |
| `template_repetition_z` | 7 = 15.56% [7.7–28.8] | 160 = 3.49% | **4.45 [1.72, 7.97]** |
| `balanced_construction` | 7 = 15.56% [7.7–28.8] | 232 = 5.07% | **3.07 [1.22, 5.28]** |
| **any of the three** | **20 = 44.44%** [30.9–58.8] | **571 = 12.47%** | **3.56 [2.40, 4.75]** |
| **two of the three** | 5 = 11.11% [4.8–23.5] | 33 = 0.72% | **15.42 [3.51, 33.93]** |
| `low_messiness` | 3 = 6.67% | 235 = 5.13% | 1.30 |
| `paragraph_cadence_max` | 10 = 22.22% | 478/3,424 = 13.96% | 1.59 |
| `declarative_uniformity` | 2 = 4.44% | 234 = 5.11% | 0.87 |
| `low_banned_markers` | 15 = 33.33% | 2,030 = 44.33% | 0.75 |
| `low_discourse_markers` | 3 = 6.67% | 408 = 8.91% | 0.75 |
| `assertive_utility` | 1 = 2.22% | 237 = 5.18% | 0.43 |
| `enumeration_density` | 0 = 0.00% | 231 = 5.04% | 0.00 |

**This is the result that separates this work from the previous attempt.** The v4 rules fired on
2 of 45 misses against 168 of 4,580 cleared humans, a ratio of 1.2. Three of these fire on 20 of
45 against 571 of 4,580, a ratio of 3.56 whose interval excludes 1. The rhythm the owner hears is
measurable, and it is present in the documents the model gets wrong.

The requirement that several signals agree — which gained literally nothing last time because no
document in any band fired two rules — now produces **5 of 45 against 33 of 4,580, a ratio of
15.4**. The interval is wide and its lower bound is 3.51.

### 4.1 As continuous measurements

AUROC separating the 45 misses from the 4,580 correctly-cleared human documents:

| signal | conditional AUROC | AI vs human AUROC |
|---|---|---|
| `balanced_construction` | **0.578** | 0.652 |
| `tri_compression_flat` | 0.567 | 0.604 |
| `low_messiness` | 0.558 | 0.569 |
| `declarative_uniformity` | 0.555 | 0.567 |
| `paragraph_cadence_rate` | 0.540 | 0.572 |
| `template_repetition_z` | 0.524 | 0.525 |
| `paragraph_cadence_max` | 0.507 | 0.599 |
| `micro_compression` | 0.488 | 0.504 |
| `low_opening_diversity` | 0.448 | 0.481 |
| `instructional_closing` | 0.431 | 0.540 |
| `low_banned_markers` | 0.406 | 0.542 |
| `low_discourse_markers` | 0.379 | 0.601 |
| `enumeration_density` | 0.344 | 0.482 |

The model's own AUROC on this corpus is **0.997**.

Read the two columns against each other. Four signals that separate AI from human perfectly
respectably — `low_discourse_markers` at 0.601, `paragraph_cadence_max` at 0.599, and
`instructional_closing` at 0.540 — are at or below chance conditionally. They measure something
the model has already learned, and on the documents it gets wrong they point the other way.
`low_discourse_markers` is the sharpest case: 0.601 unconditionally, **0.379** on the misses.

### 4.2 Is it cadence, or is it length?

`tri_compression_flat` is a per-1,000-word rate and `balanced_construction` a per-1,000-word count,
so neither should depend on document length. They do.

AUROC (AI vs human) within word-count strata:

| signal | <800 (n=1,762) | 800–1,199 (n=1,415) | 1,200–1,599 (n=1,323) | 1,600+ (n=1,058) |
|---|---|---|---|---|
| `tri_compression_flat` | 0.460 | 0.464 | 0.588 | **0.703** |
| `balanced_construction` | 0.533 | 0.570 | 0.650 | **0.684** |
| `template_repetition_z` | 0.490 | 0.492 | 0.501 | 0.542 |

**Both of the strongest signals are at or below chance on documents under 1,200 words and only
separate on long ones.** The corpus's AI documents are systematically longer than its human ones,
so part of what these signals measure is length composition rather than rhythm. That matters
directly: the owner's own AI article is **512 words**, in the band where these two signals do not
work.

`template_repetition_z` is flat across lengths, which is what its within-document permutation null
was built to achieve. It is the cleanest of the three and also the weakest.

---

## 5. The combined score

Twelve to fourteen signals into a logistic regression, standardised, L2 = 1e-3, evaluated on
50 held-out split-halves.

| population | held-out AUROC, AI vs human | held-out AUROC, misses vs cleared |
|---|---|---|
| all 5,558, paragraph-free signals | 0.731 (sd 0.009) | 0.527 (sd 0.053) |
| paragraph-bearing 4,383, all signals | **0.813** (sd 0.008) | **0.645** (sd 0.047) |

Adding the paragraph-shape signals is worth 8 points of AUROC on the plain task and 12 on the
conditional one, so paragraph structure does carry information that sentence-level features miss.
The conditional 0.645 is the best number in this document. It is also measured on a subset that
excludes every fiction document in the corpus.

### 5.1 Narrow escalation, priced honestly

Flag when the model probability sits in a band below 0.984 **and** the cadence rule fires. Cost
against the shipped 877/922 and 56/4,636.

| rule | band | AI added | human FP added | detection | human FP |
|---|---|---|---|---|---|
| ≥1 of three | 0.80–0.984 | +20 | **+117** | 97.29% | 3.73% |
| ≥1 of three | 0.95–0.984 | +18 | +34 | 97.07% | 1.94% |
| ≥1 of three | 0.97–0.984 | +11 | +13 | 96.31% | 1.49% |
| **≥2 of three** | **0.80–0.984** | **+5** | **+5** | **95.66%** | **1.32%** |
| ≥2 of three | 0.95–0.984 | +4 | +2 | 95.55% | 1.25% |
| ≥3 of three | any | 0 | 0 | unchanged | unchanged |
| combined score, q=0.99 | 0.95–0.984 | +3 | +1 | 95.44% | 1.23% |

The single-signal settings buy detection at 1 AI document per 2 to 6 human false positives. They
are not candidates.

**The ≥2-of-three rule is the only one worth writing down.** Cross-validated over 200 split-halves
with the gates refitted on each training half:

| | held out |
|---|---|
| detection gained | **+0.562pp** (sd 0.256), 95% of splits [0.00, +1.07] |
| human false positives added | **+0.106pp** (sd 0.049), 95% of splits [0.00, +0.21] |

The gain survives out of sample. Set against the minimum-evidence aggregation candidate already
measured in `AGGREGATION-AND-RHYTHM.md` §2.3 — **+0.82pp detection for +0.077pp false positives**
— it is worse on both axes, and that candidate needs no new tier, no new contract and no policy
change.

### 5.2 Per register, for the ≥2-of-three rule at band 0.80

| human register | shipped | escalated |
|---|---|---|
| story (fiction) | 29/260 = 11.15% | **29/260 = 11.15% — unchanged** |
| academic-discussion | 8/420 = 1.90% | **8/420 = 1.90% — unchanged** |
| academic-conclusion | 6/360 = 1.67% | 6/360 = 1.67% |
| academic-introduction | 2/420 = 0.48% | 2/420 = 0.48% |
| longform-journalism | 5/840 = 0.60% | 5/840 = 0.60% |
| company-update | 2/662 = 0.30% | 2/662 = 0.30% |
| **white-paper** | 4/840 = 0.48% | **9/840 = 1.07%** |
| academic-lit-review, research-summary, student-essay | 0 | 0 |

**All five false positives are white papers**, four of them CRS congressional research reports.
The two registers `OBJECTIVE.md` names — fiction and academic discussion — are untouched. Fiction
is untouched partly because it is protected and partly because it *cannot* fire the paragraph
signal at all, which is not the same thing.

The five AI documents gained are three academic essays and two long-form journalism pieces, from
xAI, Meta and Anthropic models, three under plain prompts and two under house-brief. Detection by
prompt style moves 283→286 of 294 plain, 291→293 of 310 house-brief, and 303/318 human-voice
unchanged.

The comparison rule the brief asked to be priced — ≥1 signal at band 0.95 — takes fiction from
**11.15% to 15.38%** and academic discussion from 1.90% to 3.10%. That settles it.

---

## 6. Does weighting introductions and the final 20% help?

Measured rather than assumed. AUROC for each signal computed on the whole document, on the first
two paragraphs, and on the paragraphs covering the last 20% of the words.

| signal | whole | intro | tail | cond. whole | cond. intro | cond. tail |
|---|---|---|---|---|---|---|
| `micro_compression` | 0.504 | 0.474 | **0.562** | 0.488 | 0.463 | **0.562** |
| `low_messiness` | 0.566 | 0.550 | 0.576 | 0.557 | **0.583** | **0.585** |
| `instructional_closing` | 0.540 | 0.486 | 0.561 | 0.431 | 0.465 | 0.497 |
| `enumeration_density` | 0.515 | **0.542** | 0.554 | 0.373 | 0.460 | 0.445 |
| `assertive_utility` | 0.583 | 0.505 | 0.543 | 0.479 | 0.499 | 0.507 |

**The conclusion weighting is real but small, and the introduction weighting is not there.**
Restricting micro-compression to the final 20% is worth +0.06 AUROC unconditionally and +0.07
conditionally, the largest single effect in the table. Introductions help only `low_messiness`,
by +0.03. Two signals get worse in the introduction than on the whole document.

So the owner's observation that he sees it most in conclusions is supported, weakly, and his
observation about introductions is not supported by this corpus. Neither effect is large enough
to justify the 1.3× / 1.6× multipliers the analysis proposed; a flat measurement restricted to the
final fifth would capture what there is.

---

## 7. The owner's nine documents

Every value from the same module, and the model probabilities re-derived through the fp32 harness.

| document | what it is | p_max | `paragraph_cadence_max` | `tri_compression` | `balanced` | `enumeration` | signals fired |
|---|---|---|---|---|---|---|---|
| 1 panda-penguin | human, Opace | 0.022 | 3 | 8.93 | 0.00 | 2.23 | 0 |
| 2 social-objectives | human, Opace | 0.054 | 0 | 0.00 | 0.00 | 0.00 | 0 |
| 3 esports | human, Opace | 0.033 | 0 | 0.00 | 0.00 | 0.00 | 0 |
| 4 facebook-stale | human, Opace | 0.117 | 0 | 3.32 | 0.00 | 0.00 | 0 |
| 5 mobile-algorithm | human, Opace | 0.208 | 1 | 0.00 | 0.00 | 0.00 | 0 |
| 6 eu-ranking | human, Opace | 0.089 | 0 | 0.00 | 0.00 | 3.05 | 0 |
| 7 pure-ai-no-instructions | AI, unedited | 0.972 | **7** | 20.96 | 0.00 | 1.50 | 0 |
| 8 heavily-edited-by-hand | AI, rewritten | 0.986 | 3 | 5.48 | 0.91 | 0.91 | 0 |
| **9 humanise-instructions** | **AI, the target case** | **0.808** | **8** | 4.04 | **2.02** | **16.16** | **1** |

**The paragraph rule reads his nine documents the way he does.** At its gate of 4 it fires on the
two AI documents the model missed — 7 and 8 — and on none of the six human articles, whose highest
score is 3. Document 8, the hand-edited piece the model already flags, scores 3 alongside the human
writing, which is consistent with his description of it as substantially rewritten.

**The corpus-calibrated document rule does not.** Document 9 fires one of the three signals
(`balanced_construction` at 2.02 against a gate of 1.103) and the ≥2-of-three rule needs two, so
**the target case remains missed**. Its `tri_compression_flat` of 4.04 is far below the 33.1 gate,
because at 512 words the document is in the length band where that signal does not work (§4.2).

Its enumeration density of **16.16 per 1,000 words** is more than five times the highest of the
other eight. That is the "covers hosting, themes, plugins, licences and support" habit, and it is
the single most distinctive number in the set — but `enumeration_density` has a conditional ratio
of **0.00** on the corpus, so it cannot be promoted on the strength of one document.

### 7.1 The passages that fire, quoted

Both of the passages he quoted from this article are found by the module, at their exact
boundaries, with the role sequences the analysis predicted.

**Compressed triple, micro-paragraph, 41 words, roles C I S:**

> **C** A business owner may build a website to explain an offer, collect enquiries, manage
> appointments or sell online.
> **I** Write the priority customer tasks into the brief before asking for web design prices.
> **S** Otherwise, each web designer may price a different solution.

**Compressed triple, micro-paragraph, 41 words, roles X X I:**

> **X** Page count affects effort but is not a complete measure.
> **X** More complex sites do not always have more pages: five researched sections can take more
> work than 20 template-led pages using approved copy.
> **I** Separate reusable layouts from per-page content, entry and review.

Both score **8** on the paragraph rule. The third passage he quoted, the conclusion one, is from a
different article and scores **4**; it fires `balanced` and `enumeration` and misses the
compression test because it is two sentences rather than three.

His closest human paragraph, from `1-panda-penguin`, scores **3**:

> It appears this is being heavily penalised. So remove any content that is not original (for
> example, copy about products and services that you have used from a supplier's websites etc).
> Make sure product descriptions are unique.

Claim, consequence, instruction — his own writing, in the shape the module looks for. The
parenthetical aside is the only thing keeping it under the gate. That is worth him seeing,
because it is the shape of the false positive this family of rules would produce.

---

## 8. The probe test

`test_cadence.py`, 12 tests, runs under system `python3` with no dependencies.

- The three quoted passages must produce the role sequences `CIS`, `XXI`, `CC`.
- The two three-sentence passages must score ≥ 6; the two-sentence conclusion ≥ 4.
- No paragraph of the six human articles may reach the gate of 4. The highest is 3.
- The humanised AI article must separate from all six by more than 3 points. It does, 8 against 3.

**Four of the twelve tests break the module and assert the probe then fails.** This project shipped
a kill switch that passed three tests while being dead, so a test that cannot fail is not counted
here.

| mutation | effect |
|---|---|
| `IMPERATIVE_VERBS = set()` | probe fails — passage 2 drops from 8 to 4, below its floor of 6 |
| imperatives and consequence openers both dead | probe fails — all three passages collapse to 4 |
| `UTILITY_VERBS = set()` | probe fails — the conclusion passage drops from 4 to 1 |
| `_is_balanced` returns False | probe fails — the conclusion passage drops from 4 to 2 |
| `paragraph_cadence` returns a constant 9 | probe fails — every human paragraph now reaches the gate |
| `paragraph_cadence` returns a constant 0 | probe fails — no quoted passage reaches its floor |

Verified by running each mutation and observing the failure, not by assuming it.

---

## 9. What was not measured

- **The browser int8 runtime.** Everything here is the fp32 server checkpoint.
- **Fiction, for every paragraph-shape signal.** 0 of 260 human fiction documents have paragraph
  markup. This is the largest single gap and it sits on the tool's worst register.
- **Real anti-AI-instructed text at volume.** `house-brief` and `human-voice` are the corpus's
  analogues and they are milder than the owner's own instructions. His article is the only true
  example available and n = 1.
- **Register labels are machine-assigned**, as `longform-corpus/MANIFEST.md` records. Every
  per-register split inherits that.
- **The gates are in-sample** except where the split-half cross-validation is quoted. The
  per-signal likelihood ratios in §3 and the conditional ratios in §4 are not cross-validated;
  the ≥2-of-three operating point in §5.1 is.
- **The role approximation has never been checked against a human annotator.** It agrees with the
  analysis on three passages, which is not an evaluation.
- **Headings are dropped** by `split_paragraphs` — a line of 12 words or fewer with no terminal
  punctuation. Without this, a heading merges into the first sentence below it and changes its
  role. Both sides are treated identically, but this does silently discard text.

---

## 10. What to do

**Do not wire this into the product.** Specifically:

- **Not as detection.** The best operating point is beaten by a candidate already measured and
  already waiting on the owner's decision, and it would require an escalation from the
  writing-rules tier into the AI verdict. That tier is **editorial-only by design**, and
  `assertAxisIndependence` exists to enforce the separation. Changing it is a policy decision, not
  a measurement one, and it needs the owner's explicit agreement.
- **Possibly as editorial feedback**, which is what the tier is for. `paragraph_cadence` at a gate
  of 4 tells a writer "this paragraph is a claim, an instruction and a consequence in 41 words" —
  which is a true and useful observation about their draft whoever wrote it, and carries no
  authorship claim. It fires on 14.00% of human paragraph-bearing documents, so the copy would
  have to say *this reads as over-structured*, never *this reads as AI*.

**What would change the answer.** Not more rules. The negative in
`AGGREGATION-AND-RHYTHM.md` §3.6 asked for more misses; this measurement asks for something
narrower. Three of the strongest signals only work above 1,200 words and the target document is
512. The thing to gather is **short anti-AI-instructed articles with known provenance** — the
owner's own published output is the obvious source — because that is simultaneously the register
the model is weakest on, the length band these signals fail in, and the only place his ear has
been demonstrated to beat the tool.

**What was learned that is worth keeping.** His ear is measurable. Compressed sentence triples,
balanced two-part constructions and repeated paragraph shapes fire on the model's failures at
three and a half times the rate they fire on its successes, which no previously measured signal in
this project does. The reason that does not become a shipping decision is arithmetic, not doubt
about the phenomenon.
