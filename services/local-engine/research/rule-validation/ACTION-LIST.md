# Action list

Ranked by how much the change is worth and how sure we are. Every item cites
its evidence and the measured cost of making the change. Nothing here has been
applied — the engine is untouched.

Cost is measured the same way throughout: percentage points of AI detection at
the shipped 5%-false-positive operating point (threshold >= 5 raw, 
>= 5 stripped), holding the threshold fixed.

Two cost columns, because they answer different questions. *Detection cost,
equal-FP* re-tunes the threshold after the removal so the human false-positive
rate is held at the same budget — this is the fair like-for-like number.
*Human FP change, fixed threshold* shows what the removal does to false
positives if the threshold is left alone: negative means fewer humans flagged.

A rule can point the wrong way (fire more on humans) and still show a detection
cost when removed, because it lifts both distributions and the humans happen to
sit further from the cut. `adjacent-lemma-repeat` is the clearest case. Removing
it is still the right call — it is not evidence of AI — but it is not free, and
this report will not pretend otherwise.

**The single biggest caveat**: the human corpus is 169 texts, of which 40 are
published prose and 10 are business-marketing. Actions marked *safe* cost
nothing measurable and carry no false-positive risk. Actions marked *needs a
bigger human corpus first* should not be shipped on this evidence alone.

## 1. Stop these rules adding points (harmful direction) (17 rules)

Risk: **mixed — three of these cost around 1 pp of detection despite pointing the wrong way; the other fourteen are free**. Largest single detection cost in this group: 1.39 pp (raw, equal-false-positive comparison).

| Rule | Weight | Evidence | Detection cost, equal-FP (raw / stripped) | Human FP change (raw, fixed threshold) |
| --- | ---: | --- | ---: | ---: |
| `adjacent-lemma-repeat` | 3 | AI 271/1727, human 30/169, LR 0.88, q=1.00 | 1.39 / 2.26 pp | -0.59 pp |
| `tier1-clarity` | 3 | AI 183/1727, human 24/169, LR 0.74, q=0.67 | 0.87 / 2.03 pp | 0.00 pp |
| `setup-expansion-cadence` | 3 | AI 253/1727, human 22/169, LR 1.11, q=1.00 | 0.81 / 1.74 pp | 0.00 pp |
| `staccato-fragments` | 3 | AI 50/1727, human 7/169, LR 0.66, q=1.00 | 0.29 / 0.46 pp | 0.00 pp |
| `hollow-intensifier` | 2 | AI 75/1727, human 9/169, LR 0.78, q=1.00 | 0.23 / 0.23 pp | -1.18 pp |
| `vague-attribution` | 5 | AI 19/1727, human 2/169, LR 0.77, q=1.00 | 0.23 / 0.58 pp | 0.00 pp |
| `didactic-note` | 2 | AI 10/1727, human 1/169, LR 0.69, q=1.00 | 0.17 / 0.17 pp | 0.00 pp |
| `normalization-flag` | 9 | AI 10/1727, human 2/169, LR 0.41, q=0.94 | 0.12 / 0.35 pp | -0.59 pp |
| `low-specificity` | 2 | AI 10/1727, human 3/169, LR 0.30, q=0.47 | 0.06 / 0.23 pp | 0.00 pp |
| `passive-ratio` | 3 | AI 14/1727, human 8/169, LR 0.17, q=0.003 | 0.06 / 0.12 pp | 0.00 pp |
| `smart-punct-signature` | 6 | AI 30/1727, human 5/169, LR 0.55, q=0.86 | 0.06 / 1.51 pp | -1.78 pp |
| `not-just-contrast` | 6 | AI 8/1727, human 2/169, LR 0.33, q=0.86 | 0.00 / 0.17 pp | -0.59 pp |
| `parenthetical-hedge` | 3 | AI 1/1727, human 1/169, LR 0.10, q=0.71 | 0.00 / 0.00 pp | 0.00 pp |
| `quote-inconsistency` | 2 | AI 12/1727, human 2/169, LR 0.49, q=1.00 | 0.00 / 0.17 pp | 0.00 pp |
| `real-actual-inflation` | 5 | AI 6/1727, human 1/169, LR 0.43, q=1.00 | 0.00 / 0.12 pp | 0.00 pp |
| `title-case-header` | 4 | AI 0/1727, human 1/169, LR 0.03, q=0.44 | 0.00 / 0.00 pp | -0.59 pp |
| `token-cutoff` | 2 | AI 10/1727, human 6/169, LR 0.16, q=0.012 | 0.00 / 0.17 pp | 0.00 pp |

## 2. Fix or remove the three unreachable thresholds (3 rules)

Risk: **safe — zero measured cost, by definition**. Largest single detection cost in this group: -0.00 pp (raw, equal-false-positive comparison).

| Rule | Weight | Evidence | Detection cost, equal-FP (raw / stripped) | Human FP change (raw, fixed threshold) |
| --- | ---: | --- | ---: | ---: |
| `contrast-density` | 2 | never fires on 1,896 samples; threshold is unreachable: the corpus maximum never reaches the gate. | 0.00 / 0.00 pp | 0.00 pp |
| `mic-drop-paragraph` | 2 | never fires on 1,896 samples; threshold is unreachable: the corpus maximum never reaches the gate. | 0.00 / 0.00 pp | 0.00 pp |
| `punchline-fragment-density` | 2 | never fires on 1,896 samples; threshold is unreachable: the corpus maximum never reaches the gate. | 0.00 / 0.00 pp | 0.00 pp |

**SUPERSEDED, 29 August 2026 — this section was wrong.** These three thresholds are not
unreachable. The 1,896-sample corpus this report was measured on is chat-reply
register; all three rules measure published-prose cadence. Re-measured on 10,096
documents (5,743 AI including the 4,016-article published-register corpus, 4,353
human), all three fire and all three point the right way: `contrast-density` 15 AI
against 0 human, `mic-drop-paragraph` 13 against 2, `punchline-fragment-density` 5
against 1. No threshold was changed. The correction, the per-rule evidence and a
measured re-threshold proposal for `punchline-fragment-density` are in
`docs/CAPABILITIES.md` §3.4a; the standing inventory is
`tests/battery/rule-liveness.json`.

The rule this section should have named is `tier3-phrase-cluster` (listed under §5
below). Its gate needs 3 distinct phrases from a ten-entry inherited crypto/web3
whitepaper list; the measured maximum across the same 10,096 documents is 1, and
four of the ten regexes match no document anywhere. It is now recorded inactive
and is not counted as a live capability.

## 3. Stop triple-counting markdown furniture (2 rules)

Risk: **cheap**. Largest single detection cost in this group: 8.34 pp (raw, equal-false-positive comparison).

| Rule | Weight | Evidence | Detection cost, equal-FP (raw / stripped) | Human FP change (raw, fixed threshold) |
| --- | ---: | --- | ---: | ---: |
| `markdown-bold` | 3 | AI 1245/1727, human 0/169, LR 245.06, q=1.7e-84 | 8.34 / 0.00 pp | 0.00 pp |
| `formatting` | 3 | AI 1114/1727, human 0/169, LR 219.29, q=2.5e-69 | 6.25 / 0.00 pp | 0.00 pp |

## 4. Reweight where the evidence contradicts the shipped number (1 rule)

Risk: **measured — the cost column is the cost of REMOVING the rule outright, an upper bound on what a reweight can cost**. Largest single detection cost in this group: 2.66 pp (raw, equal-false-positive comparison).

| Rule | Weight | Evidence | Detection cost, equal-FP (raw / stripped) | Human FP change (raw, fixed threshold) |
| --- | ---: | --- | ---: | ---: |
| `tier1` | 5 -> 1–2 | AI 394/1727, human 11/169, LR 3.37, q=9.1e-07 | 2.66 / 8.80 pp | -1.78 pp |

## 5. Demote the dormant rules to corroboration-only (23 rules)

Risk: **safe — zero measured cost, by definition**. Largest single detection cost in this group: -0.00 pp (raw, equal-false-positive comparison).

| Rule | Weight | Evidence | Detection cost, equal-FP (raw / stripped) | Human FP change (raw, fixed threshold) |
| --- | ---: | --- | ---: | ---: |
| `copula-avoidance` | 3 | never fires on 1,896 samples; the rule works when triggered but matched nothing in 1,896 samples; it carries weight it never earns. | 0.00 / 0.00 pp | 0.00 pp |
| `despite-challenges-arc` | 5 | never fires on 1,896 samples; the rule works when triggered but matched nothing in 1,896 samples; it carries weight it never earns. | 0.00 / 0.00 pp | 0.00 pp |
| `directive-colon-bullets` | 3 | never fires on 1,896 samples; the rule works when triggered but matched nothing in 1,896 samples; it carries weight it never earns. | 0.00 / 0.00 pp | 0.00 pp |
| `emotional-flatline` | 2 | never fires on 1,896 samples; the rule works when triggered but matched nothing in 1,896 samples; it carries weight it never earns. | 0.00 / 0.00 pp | 0.00 pp |
| `faux-insight` | 2 | never fires on 1,896 samples; the rule works when triggered but matched nothing in 1,896 samples; it carries weight it never earns. | 0.00 / 0.00 pp | 0.00 pp |
| `fiction-claudeism` | 3 | never fires on 1,896 samples; the rule works when triggered but matched nothing in 1,896 samples; it carries weight it never earns. | 0.00 / 0.00 pp | 0.00 pp |
| `fiction-slop-phrase` | 2 | never fires on 1,896 samples; the rule works when triggered but matched nothing in 1,896 samples; it carries weight it never earns. | 0.00 / 0.00 pp | 0.00 pp |
| `future-narrative` | 12 | never fires on 1,896 samples; the rule works when triggered but matched nothing in 1,896 samples; it carries weight it never earns. | 0.00 / 0.00 pp | 0.00 pp |
| `generic-conclusion` | 3 | never fires on 1,896 samples; the rule works when triggered but matched nothing in 1,896 samples; it carries weight it never earns. | 0.00 / 0.00 pp | 0.00 pp |
| `invalid-isbn` | 3 | never fires on 1,896 samples; the rule works when triggered but matched nothing in 1,896 samples; it carries weight it never earns. | 0.00 / 0.00 pp | 0.00 pp |
| `kobak-density` | 2 | never fires on 1,896 samples; the rule works when triggered but matched nothing in 1,896 samples; it carries weight it never earns. | 0.00 / 0.00 pp | 0.00 pp |
| `legacy-framing` | 3 | never fires on 1,896 samples; the rule works when triggered but matched nothing in 1,896 samples; it carries weight it never earns. | 0.00 / 0.00 pp | 0.00 pp |
| `liang-cluster` | 2 | never fires on 1,896 samples; the rule works when triggered but matched nothing in 1,896 samples; it carries weight it never earns. | 0.00 / 0.00 pp | 0.00 pp |
| `lingering-attention` | 3 | never fires on 1,896 samples; the rule works when triggered but matched nothing in 1,896 samples; it carries weight it never earns. | 0.00 / 0.00 pp | 0.00 pp |
| `narrative-cliche` | 3 | never fires on 1,896 samples; the rule works when triggered but matched nothing in 1,896 samples; it carries weight it never earns. | 0.00 / 0.00 pp | 0.00 pp |
| `notability-canned` | 2 | never fires on 1,896 samples; the rule works when triggered but matched nothing in 1,896 samples; it carries weight it never earns. | 0.00 / 0.00 pp | 0.00 pp |
| `novelty-inflation` | 3 | never fires on 1,896 samples; the rule works when triggered but matched nothing in 1,896 samples; it carries weight it never earns. | 0.00 / 0.00 pp | 0.00 pp |
| `reasoning-artifact` | 6 | never fires on 1,896 samples; the rule works when triggered but matched nothing in 1,896 samples; it carries weight it never earns. | 0.00 / 0.00 pp | 0.00 pp |
| `rhetorical-qa` | 2 | never fires on 1,896 samples; the rule works when triggered but matched nothing in 1,896 samples; it carries weight it never earns. | 0.00 / 0.00 pp | 0.00 pp |
| `rhetorical-question` | 2 | never fires on 1,896 samples; the rule works when triggered but matched nothing in 1,896 samples; it carries weight it never earns. | 0.00 / 0.00 pp | 0.00 pp |
| `social-cta-closer` | 8 | never fires on 1,896 samples; the rule works when triggered but matched nothing in 1,896 samples; it carries weight it never earns. | 0.00 / 0.00 pp | 0.00 pp |
| `tier3-phrase-cluster` | 12 | never fires on 1,896 samples; the rule works when triggered but matched nothing in 1,896 samples; it carries weight it never earns. | 0.00 / 0.00 pp | 0.00 pp |
| `transition-stacking` | 3 | never fires on 1,896 samples; the rule works when triggered but matched nothing in 1,896 samples; it carries weight it never earns. | 0.00 / 0.00 pp | 0.00 pp |

## 6. Demote the unvalidated rules to corroboration-only (49 rules)

Risk: **needs a bigger human corpus first**. Largest single detection cost in this group: 1.85 pp (raw, equal-false-positive comparison).

| Rule | Weight | Evidence | Detection cost, equal-FP (raw / stripped) | Human FP change (raw, fixed threshold) |
| --- | ---: | --- | ---: | ---: |
| `em-dash-density` | 4 | AI 272/1727, human 16/169, LR 1.62, q=0.18 | 1.85 / 2.26 pp | -0.59 pp |
| `sentence-flatline` | 5 | AI 104/1727, human 4/169, LR 2.28, q=0.29 | 1.56 / 1.80 pp | -0.59 pp |
| `punct-distribution` | 6 | AI 98/1727, human 2/169, LR 3.88, q=0.063 | 0.87 / 1.56 pp | 0.00 pp |
| `low-ttr` | 3 | AI 178/1727, human 8/169, LR 2.07, q=0.12 | 0.81 / 0.75 pp | -0.59 pp |
| `cross-para-burstiness` | 5 | AI 69/1727, human 3/169, LR 1.95, q=0.82 | 0.35 / 0.41 pp | 0.00 pp |
| `owner-phrase` | 5 | AI 18/1727, human 0/169, LR 3.64, q=1.00 | 0.35 / 0.52 pp | 0.00 pp |
| `ai-placeholder` | 10 | AI 30/1727, human 0/169, LR 6.00, q=0.47 | 0.29 / 0.98 pp | 0.00 pp |
| `escaped-markup-literal` | 3 | AI 21/1727, human 0/169, LR 4.23, q=0.86 | 0.29 / 0.35 pp | 0.00 pp |
| `filler` | 2 | AI 73/1727, human 6/169, LR 1.11, q=1.00 | 0.29 / 0.52 pp | 0.00 pp |
| `hedge-stack` | 6 | AI 13/1727, human 1/169, LR 0.89, q=1.00 | 0.23 / 0.29 pp | 0.00 pp |
| `sycophantic` | 8 | AI 16/1727, human 0/169, LR 3.25, q=1.00 | 0.17 / 0.41 pp | 0.00 pp |
| `tier2` | 3 | AI 23/1727, human 1/169, LR 1.54, q=1.00 | 0.17 / 0.41 pp | 0.00 pp |
| `acknowledgment-loop` | 3 | AI 17/1727, human 1/169, LR 1.15, q=1.00 | 0.12 / 0.17 pp | -0.59 pp |
| `arrow-decoration` | 4 | AI 25/1727, human 1/169, LR 1.67, q=1.00 | 0.12 / 0.23 pp | 0.00 pp |
| `cutoff-disclaimer` | 10 | AI 22/1727, human 0/169, LR 4.43, q=0.86 | 0.12 / 0.93 pp | 0.00 pp |
| `lets-construction` | 2 | AI 23/1727, human 0/169, LR 4.62, q=0.86 | 0.12 / 0.06 pp | 0.00 pp |
| `uniformity` | 5 | AI 9/1727, human 0/169, LR 1.87, q=1.00 | 0.12 / 0.12 pp | 0.00 pp |
| `fiction-promptonym` | 3 | AI 2/1727, human 0/169, LR 0.49, q=1.00 | 0.06 / 0.00 pp | 0.00 pp |
| `fnword-trigram-entropy` | 5 | AI 8/1727, human 0/169, LR 1.67, q=1.00 | 0.06 / 0.12 pp | 0.00 pp |
| `sentence-length-spectral-flatness` | 2 | AI 36/1727, human 0/169, LR 7.18, q=0.36 | 0.06 / 0.00 pp | 0.00 pp |
| `valuable-insights` | 2 | AI 9/1727, human 0/169, LR 1.87, q=1.00 | 0.06 / 0.00 pp | 0.00 pp |
| `buzzword-phrase` | 2 | AI 16/1727, human 1/169, LR 1.08, q=1.00 | 0.00 / 0.06 pp | 0.00 pp |
| `by-ving-template` | 3 | AI 1/1727, human 0/169, LR 0.30, q=1.00 | 0.00 / 0.00 pp | 0.00 pp |
| `conclusion-cta` | 6 | AI 1/1727, human 0/169, LR 0.30, q=1.00 | 0.00 / 0.00 pp | 0.00 pp |
| `confidence-calibration` | 2 | AI 5/1727, human 0/169, LR 1.08, q=1.00 | 0.00 / 0.06 pp | 0.00 pp |
| `emoji-decoration` | 2 | AI 8/1727, human 0/169, LR 1.67, q=1.00 | 0.00 / 0.00 pp | 0.00 pp |
| `false-concession` | 2 | AI 2/1727, human 0/169, LR 0.49, q=1.00 | 0.00 / 0.00 pp | 0.00 pp |
| `focal-density` | 5 | AI 6/1727, human 0/169, LR 1.28, q=1.00 | 0.00 / 0.06 pp | 0.00 pp |
| `formulaic-opener` | 8 | AI 1/1727, human 0/169, LR 0.30, q=1.00 | 0.00 / 0.00 pp | 0.00 pp |
| `hashtag-stuff` | 12 | AI 6/1727, human 0/169, LR 1.28, q=1.00 | 0.00 / 0.17 pp | 0.00 pp |
| `metaphor-cluster` | 4 | AI 1/1727, human 0/169, LR 0.30, q=1.00 | 0.00 / 0.00 pp | 0.00 pp |
| `neg-parallelism` | 5 | AI 3/1727, human 0/169, LR 0.69, q=1.00 | 0.00 / 0.06 pp | 0.00 pp |
| `outcome-tail` | 4 | AI 4/1727, human 0/169, LR 0.89, q=1.00 | 0.00 / 0.00 pp | 0.00 pp |
| `owner-phrase-b` | 2 | AI 4/1727, human 0/169, LR 0.89, q=1.00 | 0.00 / 0.00 pp | 0.00 pp |
| `owner-vocab-b` | 2 | AI 3/1727, human 0/169, LR 0.69, q=1.00 | 0.00 / 0.06 pp | 0.00 pp |
| `participial-tail` | 5 | AI 6/1727, human 0/169, LR 1.28, q=1.00 | 0.00 / 0.12 pp | 0.00 pp |
| `pivotal-role` | 2 | AI 20/1727, human 0/169, LR 4.03, q=0.86 | 0.00 / 0.12 pp | 0.00 pp |
| `power-verb-compound` | 6 | AI 4/1727, human 0/169, LR 0.89, q=1.00 | 0.00 / 0.06 pp | 0.00 pp |
| `promo-travel` | 2 | AI 2/1727, human 0/169, LR 0.49, q=1.00 | 0.00 / 0.06 pp | 0.00 pp |
| `proximity-cluster` | 2 | AI 2/1727, human 0/169, LR 0.49, q=1.00 | 0.00 / 0.06 pp | 0.00 pp |
| `reasoning-leak` | 12 | AI 1/1727, human 0/169, LR 0.30, q=1.00 | 0.00 / 0.06 pp | 0.00 pp |
| `rhetorical-procedural-ratio` | 2 | AI 0/1727, human 0/169, LR 0.10, q=1.00 | 0.00 / 0.00 pp | 0.00 pp |
| `significance-inflation` | 4 | AI 2/1727, human 0/169, LR 0.49, q=1.00 | 0.00 / 0.00 pp | 0.00 pp |
| `speculative-opener` | 8 | AI 3/1727, human 0/169, LR 0.69, q=1.00 | 0.00 / 0.00 pp | 0.00 pp |
| `teach-preach-headings` | 2 | AI 3/1727, human 0/169, LR 0.69, q=1.00 | 0.00 / 0.00 pp | 0.00 pp |
| `template-phrase` | 3 | AI 3/1727, human 0/169, LR 0.69, q=1.00 | 0.00 / 0.06 pp | 0.00 pp |
| `tier3` | 2 | AI 2/1727, human 0/169, LR 0.49, q=1.00 | 0.00 / 0.00 pp | 0.00 pp |
| `tier3-phrase` | 3 | AI 1/1727, human 0/169, LR 0.30, q=1.00 | 0.00 / 0.06 pp | 0.00 pp |
| `tripled-negation` | 5 | AI 1/1727, human 0/169, LR 0.30, q=1.00 | 0.00 / 0.06 pp | 0.00 pp |

## 7. Keep as-is (8 rules)

Risk: **-**. Largest single detection cost in this group: 14.24 pp (raw, equal-false-positive comparison).

| Rule | Weight | Evidence | Detection cost, equal-FP (raw / stripped) | Human FP change (raw, fixed threshold) |
| --- | ---: | --- | ---: | ---: |
| `markdown-furniture` | 4 | AI 1410/1727, human 1/169, LR 92.51, q=5.1e-107 | 14.24 / 0.00 pp | 0.00 pp |
| `bold-label-bullets` | 3 | AI 525/1727, human 0/169, LR 103.40, q=3.6e-24 | 3.30 / 0.00 pp | 0.00 pp |
| `chatbot` | 8 | AI 146/1727, human 0/169, LR 28.83, q=1.3e-05 | 2.43 / 5.15 pp | 0.00 pp |
| `markdown-heading` | 3 | AI 532/1727, human 0/169, LR 104.77, q=1.1e-24 | 1.62 / 0.00 pp | 0.00 pp |
| `uniform-list-items` | 4 | AI 272/1727, human 0/169, LR 53.62, q=4.1e-11 | 1.22 / 0.00 pp | 0.00 pp |
| `transition` | 2 | AI 238/1727, human 8/169, LR 2.76, q=0.003 | 1.10 / 1.62 pp | 0.00 pp |
| `uniform-sections` | 5 | AI 124/1727, human 0/169, LR 24.50, q=1.1e-04 | 0.87 / 1.39 pp | 0.00 pp |
| `bullet-np-list` | 10 | AI 92/1727, human 0/169, LR 18.20, q=0.002 | 0.58 / 0.00 pp | 0.00 pp |

## 8. Keep as-is, low contribution (4 rules)

Risk: **-**. Largest single detection cost in this group: 0.35 pp (raw, equal-false-positive comparison).

| Rule | Weight | Evidence | Detection cost, equal-FP (raw / stripped) | Human FP change (raw, fixed threshold) |
| --- | ---: | --- | ---: | ---: |
| `heading-inflation` | 3 | AI 264/1727, human 0/169, LR 52.04, q=6.0e-11 | 0.35 / 0.00 pp | 0.00 pp |
| `conditional-compression` | 2 | AI 78/1727, human 0/169, LR 15.45, q=0.007 | 0.17 / 0.12 pp | 0.00 pp |
| `lexical-register-distance` | 2 | AI 198/1727, human 1/169, LR 13.02, q=1.4e-06 | 0.12 / 0.93 pp | 0.00 pp |
| `tricolon-density` | 2 | AI 65/1727, human 0/169, LR 12.89, q=0.022 | 0.06 / 0.41 pp | 0.00 pp |

## 9. Keep as forensic insurance (6 rules)

Risk: **-**. Largest single detection cost in this group: -0.00 pp (raw, equal-false-positive comparison).

| Rule | Weight | Evidence | Detection cost, equal-FP (raw / stripped) | Human FP change (raw, fixed threshold) |
| --- | ---: | --- | ---: | ---: |
| `ai-citation-markup` | 15 | never fires on 1,896 samples; artefact-forensics rule; never fired here, but it is a near-zero-FP provenance marker, not a style rule. Untested, not disproved. | 0.00 / 0.00 pp | 0.00 pp |
| `ai-citation-token` | 15 | never fires on 1,896 samples; artefact-forensics rule; never fired here, but it is a near-zero-FP provenance marker, not a style rule. Untested, not disproved. | 0.00 / 0.00 pp | 0.00 pp |
| `ai-utm-source` | 12 | never fires on 1,896 samples; artefact-forensics rule; never fired here, but it is a near-zero-FP provenance marker, not a style rule. Untested, not disproved. | 0.00 / 0.00 pp | 0.00 pp |
| `math-alphanumeric` | 12 | never fires on 1,896 samples; artefact-forensics rule; never fired here, but it is a near-zero-FP provenance marker, not a style rule. Untested, not disproved. | 0.00 / 0.00 pp | 0.00 pp |
| `placeholder-token` | 10 | never fires on 1,896 samples; artefact-forensics rule; never fired here, but it is a near-zero-FP provenance marker, not a style rule. Untested, not disproved. | 0.00 / 0.00 pp | 0.00 pp |
| `pua-character` | 14 | never fires on 1,896 samples; artefact-forensics rule; never fired here, but it is a near-zero-FP provenance marker, not a style rule. Untested, not disproved. | 0.00 / 0.00 pp | 0.00 pp |

## Combined effect

The individual costs above do not simply add: removing several rules at once
interacts through the stylometric cap and the length normalisation. Anyone
applying more than one action should re-run `scripts/analyse.py` with the
modified weight table rather than summing this column.

## What this evidence cannot decide

- Whether any of the 49 unsupported rules is genuinely useful. They need a
  human corpus in the low thousands, weighted towards commercial web copy.
- Whether the forensic artefact rules (`pua-character`, `ai-citation-markup`,
  `ai-utm-source`, `ai-citation-token`, `math-alphanumeric`, `placeholder-token`)
  are worth their weight. They never fired here; they are cheap insurance with
  near-zero false-positive risk, and removing them would save nothing.
- The correct absolute weight for any rule that never fires on a human. The
  corpus bounds the false-positive rate at about 1.8% at best and cannot
  resolve the top of the weight scale.
- Whether the markdown-furniture dependency is acceptable. That is a product
  decision, not a statistical one. The measurement is clear: strip the markdown
  and detection falls from 78.6% to 25.6% at the same false-positive budget.

