# Two measurements: the length bias in maximum aggregation, and whether the rhythm signals add anything

Measured 29 August 2026. **Nothing in the product was changed.** No threshold, no aggregation
rule, no model, no rule gate. Everything below is measurement and proposal.

**Headline, both questions.**

1. **The length bias is real, it is entirely in the combining step, and it is small.** Isolated
   inside individual documents — same document, same author, same register — each extra section
   adds **+0.14pp** to the chance a human document is flagged. It is swamped in the observed data
   by register composition, so the corpus-wide false-positive rate is *not* monotonic in section
   count: it peaks at 2.45% for three-section documents and falls to 0.90% at five or more.
   Two of the three fixes the brief proposed make the tool **worse**, and a section-count-aware
   threshold is the worst of them, costing **8.5 points** of detection for nothing. The one
   candidate that wins is the third, the **minimum-evidence rule**: +0.82pp detection held out
   across 200 splits, or the same detection at 0.88% instead of 1.19% false positives.
2. **The rhythm signals add nothing the model is missing.** They fire on 4.34% of AI and 3.62%
   of human documents — a likelihood ratio of 1.2. On the 45 AI documents the model misses at
   0.984 they fire on **2**, against 168 of the 4,580 human documents it correctly clears. The
   best narrow escalation anyone could build from them gains **2 AI documents for 1 to 10 human
   false positives**, in every band tried. This is a clean negative and it saves the work.
3. **The owner's own eight documents keep every verdict under every candidate**, and no rhythm
   rule fires on any of them, including the two AI ones.

---

## 0. Provenance — which checkpoint, which runtime, which denominators

Everything here is the **shipped fp32 server checkpoint** under `segments-v2` at threshold
**0.984**. `HANDOVER.md` §9's warning is real and was checked: `longform-corpus/tier3-scores.jsonl`
carries `tier3_int8pc` / `flagged_0857` fields and comes from the **retired cycle-1 model**. It is
not used anywhere below.

| | |
|---|---|
| Corpus | `services/local-engine/research/longform-corpus/` — 5,558 documents, **922 AI** (13 current models), **4,636 human** (Europe PMC, GOV.UK, CRS, Global Voices, Mongabay, SEC EDGAR, PERSUADE 2.0) |
| Document scores | `services/local-engine/research/corpus-reconciliation-2026-08-29/raw/lf-ai.jsonl`, `lf-hu.jsonl` — **21,093 segments**, per-section probabilities, produced by that task's fp32 harness |
| Model file | `model-shrink/reference-server/model/tier3-cycle2-e5small-fp32.onnx`, SHA-256 `e313ab00de1fffd2…`, `onnxruntime` 1.29.0, temperature 0.8324 |
| Reproduction check | the reused scores return **877/922 = 95.12%** detection and **56/4,636 = 1.21%** false positives at 0.984, matching `SEGMENT-TOKEN-FIX.md` §6.1 exactly, and **21,093** segments matching §4 |
| Second reproduction check | the same harness re-run here on the owner's own eight documents returns 2.2%, 5.4%, 3.3%, 11.7%, 20.8%, 8.9%, **97.2%**, **98.6%** — his published readings to the digit |

**One rounding caveat, stated because it moves a number.** `lf-*.jsonl` stores per-section
probabilities at 4 decimal places and the document maximum at 6. On **1 document of 5,558** the
two disagree about the 0.984 boundary, so tables built from section scores read 57/4,636 for plain
maximum where the document score reads 56/4,636. Every candidate is compared on the same 4-dp
section scores, so the comparison is fair; the headline 56 is the 6-dp figure.

Runtimes: mixed-content corpus 700 documents / 3,440 segments in **109 s** (fp32, 8 threads);
rhythm metrics over all 5,558 documents in **~3 s** (Node); the 200-split cross-validation in
**~100 s**. The 5,558-document segment scoring itself was **not** re-run — it was reused, after the
two reproduction checks above.

---

## 1. The length bias — measured

### 1.1 The observed picture, which is not what the intuition predicts

Detection and false positives as a function of section count, at the shipped 0.984. Wilson 95%
intervals in brackets.

| sections | AI detected | human false positives |
|---|---|---|
| 1 | — (no AI document is one section) | 0/72 = 0.00% [0.00–5.07] |
| 2 | 30/37 = 81.08% [65.79–90.52] | 7/1,503 = 0.47% [0.23–0.96] |
| 3 | 178/198 = 89.90% [84.91–93.37] | **24/979 = 2.45%** [1.65–3.62] |
| 4 | 192/200 = 96.00% [92.31–97.96] | 18/1,195 = 1.51% [0.95–2.37] |
| 5+ | 477/487 = 97.95% [96.26–98.88] | 8/887 = 0.90% [0.46–1.77] |

And by word count, which is what a user sees:

| words | AI detected | human false positives |
|---|---|---|
| <600 | 3/3 = 100.00% [43.85–100.00] | 3/826 = 0.36% [0.12–1.06] |
| 600–999 | 102/122 = 83.61% [76.03–89.13] | 8/1,305 = 0.61% [0.31–1.21] |
| 1,000–1,499 | 267/283 = 94.35% [91.01–96.49] | **37/1,685 = 2.20%** [1.60–3.01] |
| 1,500–2,499 | 415/423 = 98.11% [96.31–99.04] | 6/681 = 0.88% [0.40–1.91] |
| 2,500+ | 90/91 = 98.90% [94.03–99.81] | 2/139 = 1.44% [0.40–5.09] |

**The human false-positive rate is not monotonic in length.** It peaks in the middle and falls
again. If multiple comparisons were driving the observed rate it would rise all the way; an
independence model built from the corpus-wide per-section flag rate (q = 84/16,554 = 0.507%)
predicts 0.51%, 1.01%, 1.51%, 2.01%, 2.51%, 3.01%… against observed 0.00%, 0.47%, 2.45%, 1.51%,
0.80%, 0.81%. So something else is dominating.

### 1.2 What is dominating: register composition

The registers are not evenly distributed across lengths, and their false-positive rates differ by
a factor of more than twenty. Human fiction runs at 11.15% and is concentrated in the three- and
four-section buckets; student essays run at 0.00% and are 25% of the two-section bucket.

Within register, the pattern disappears:

| register | 1 sec | 2 sec | 3 sec | 4 sec | 5+ sec |
|---|---|---|---|---|---|
| story | — | 0/4 | 13/97 = 13.4% | 16/143 = 11.2% | 0/16 = 0.0% |
| academic-discussion | 0/6 | 0/72 | 3/127 = 2.4% | 1/105 = 1.0% | 4/110 = 3.6% |
| academic-conclusion | 0/24 | 4/252 = 1.6% | 2/55 = 3.6% | 0/19 | 0/10 |
| longform-journalism | — | 0/146 | 4/263 = 1.5% | 1/171 = 0.6% | 0/260 = 0.0% |
| white-paper | 0/21 | 0/247 | 2/134 = 1.5% | 0/220 | 2/218 = 0.9% |
| company-update | 0/7 | 2/84 = 2.4% | 0/66 | 0/430 = 0.0% | 0/75 |
| student-essay | — | 0/379 | 0/41 | — | — |
| academic-lit-review, research-summary | 0 everywhere | | | | |

### 1.3 Separating the two explanations — the discriminator the brief asked for

The brief's test: *if the mean section score is flat across lengths while the maximum rises, it is
the combining step; if the mean rises too, it is the writing.*

**The mean is flat or falling.** Pooled per-section mean probability for human documents, within
register, by section count:

| register | 1 | 2 | 3 | 4 | 5+ |
|---|---|---|---|---|---|
| academic-discussion | 0.706 (n=6) | 0.450 (n=144) | 0.509 (n=381) | 0.445 (n=420) | 0.539 (n=667) |
| academic-conclusion | 0.511 (n=24) | 0.443 (n=504) | 0.462 (n=165) | 0.369 (n=76) | 0.393 (n=63) |
| white-paper | 0.409 (n=21) | 0.354 (n=494) | 0.299 (n=402) | 0.176 (n=880) | 0.208 (n=1,380) |
| company-update | 0.305 (n=7) | 0.278 (n=168) | 0.192 (n=198) | 0.108 (n=1,720) | 0.115 (n=563) |
| longform-journalism | — | 0.217 (n=292) | 0.235 (n=789) | 0.207 (n=684) | 0.236 (n=1,722) |
| academic-lit-review | — | 0.284 (n=66) | 0.333 (n=144) | 0.294 (n=176) | 0.308 (n=664) |

Longer human writing is **not** more AI-like section for section. In four of six registers the mean
falls with length. **The bias is in the combining step, exactly as the owner framed it.**

### 1.4 Sizing the combining step, with the confound removed entirely

The clean experiment is *within* a document. Take every document with at least six sections and
ask what the flag rate would be if the verdict were the maximum over a random subset of *j* of its
own sections. Register, source, author and topic are then held exactly constant, and the only thing
varying is how many chances the maximum gets. Computed exactly over all C(k,j) subsets, not
sampled.

| j sections | human flag rate (n=510 documents) | AI flag rate (n=315 documents) |
|---|---|---|
| 1 | 0.145% | 81.12% |
| 2 | 0.288% (+0.143pp) | 91.81% |
| 3 | 0.428% (+0.140pp) | 94.91% |
| 4 | 0.566% (+0.138pp) | 96.37% |
| 5 | 0.701% (+0.135pp) | 97.25% |
| 6 | 0.834% (+0.133pp) | 97.79% |

**The bias is real, it is almost perfectly linear, and it costs +0.14pp of human false positives
per extra section.** Going from a two-section document to a nine-section one costs roughly one
percentage point. In the register where human false positives are already worst that is worse:
academic discussion runs +0.74pp per section (0.74% at j=1 to 4.44% at j=6, n=60). In white papers
it is exactly zero over the same range.

The other half of the same table is the argument against correcting it. Every section that costs
0.14pp of human false positives buys, at the margin, far more AI detection — 81% to 92% on the
second section alone. **The section count is evidence, not only opportunity.** A correction that
removes the opportunity removes the evidence with it, which is what §1.5 measures.

### 1.5 The owner's own example does not show what it looks like

His case was a 1,141-word AI document scoring 98.6% and flagging, against a 674-word untouched AI
document scoring 97.2% and not flagging. Measured here, section by section:

- **674-word document**: two sections, 0.9718 and 0.9271.
- **1,141-word document**: three sections, 0.8265, 0.9834, 0.9856.

The short document is not missed because it had only two chances. **Neither of its sections is near
the flag point** — a document made of sections that score like those two would never flag at any
section count. Its miss is a false negative on genuinely borderline text, and it is the *unedited*
document that was missed while the heavily edited one was caught, which is the opposite of the
usual expectation and is worth noting on its own. The length bias measured in §1.4 is real; this
particular pair is not an instance of it.

---

## 2. Candidate fixes — three of four are worse

Every candidate is tuned to the same human false-positive budget the shipped rule spends,
**≤ 56/4,636 = 1.21%**, and the detection is then read off. This is the only fair comparison; a
fixed threshold conflates the rule change with a calibration change.

| candidate | AI detected | human FP | verdict |
|---|---|---|---|
| **A** plain maximum @ 0.9841 — **shipped** | 877/922 = **95.12%** | 57/4,636 = 1.23% | baseline |
| **B** section-count-aware threshold, Šidák-shaped `T(k) = 1 − 0.0284/√k` | 799/922 = 86.66% | 57/4,636 = 1.23% | **−8.46pp — much worse** |
| **C** second-highest section @ 0.9712 | 868/922 = 94.14% | 56/4,636 = 1.21% | −0.98pp — worse |
| **D** highest sustained over two adjacent sections @ 0.9658 | 855/922 = 92.73% | 56/4,636 = 1.21% | −2.39pp — worse |
| **E** minimum evidence: max ≥ 0.9845 **OR** second-highest ≥ 0.9765 | 887/922 = **96.20%** | 56/4,636 = 1.21% | **+1.08pp — better** |
| — document mean, for reference | 811/922 = 87.96% | 56/4,636 = 1.21% | −7.16pp |

The same conclusion read the other way round, holding detection fixed at 877/922 and reading off
the cost:

| candidate | threshold | human FP at 95.12% detection |
|---|---|---|
| plain maximum | 0.9841 | 55/4,636 = 1.19% |
| mean of top two | 0.9746 | 60/4,636 = 1.29% |
| second-highest | 0.9669 | 65/4,636 = 1.40% |
| best adjacent pair | 0.9542 | 82/4,636 = 1.77% |
| document mean | 0.8476 | 206/4,636 = 4.44% |
| **minimum evidence** | 0.9865 / 0.9770 | **41/4,636 = 0.88%** |

### 2.1 Why the section-count-aware threshold fails so badly

Sweeping the correction strength `T(k) = 1 − α/k^γ`, with α refitted to the same budget each time:

| γ | α | AI detected | human FP |
|---|---|---|---|
| 0.00 (plain maximum) | 0.01600 | 877/922 = 95.12% | 55/4,636 = 1.19% |
| 0.25 | 0.02183 | 872/922 = 94.58% | 56/4,636 = 1.21% |
| 0.50 | 0.02840 | 799/922 = 86.66% | 56/4,636 = 1.21% |
| 0.75 | 0.03693 | 545/922 = 59.11% | 55/4,636 = 1.19% |
| 1.00 (full Šidák/Bonferroni) | 0.04740 | 388/922 = 42.08% | 56/4,636 = 1.21% |

**Detection is monotonically destroyed and the false-positive budget buys nothing back.** The
reason is §1.4's second column: a multiple-comparisons correction assumes the extra tests are
noise. Here the extra sections are mostly *signal* — an AI document's sixth section is not a
lottery ticket, it is more AI text. Correcting for the count throws away the evidence to remove a
0.14pp-per-section artefact. At γ=0.5 the five-plus bucket loses 15.8 points of detection
(97.95% → 82.14%) to save 0.90pp of false positives on 887 documents.

**Recommendation: do not ship a section-count-aware threshold.** It is the intuitive fix and it is
measurably the worst option available.

### 2.2 The rank-based statistics fail more quietly

Second-highest section and best-adjacent-pair both do what they promise — they resist a single
fluke section, and they shift human false positives away from short documents (second-highest
takes the two-section bucket from 0.47% to 0.27%). They pay for it in the middle: at the same
budget they detect 0.98pp and 2.39pp less AI, and they *raise* false positives on long documents
(both take the 5+ bucket from 0.90% to 1.69%) because a lower threshold on a more stable statistic
is easier for a long human document to reach twice.

### 2.3 The candidate that wins, and what it costs

**E — minimum evidence.** Flag when one section is very confident (≥ 0.9845, slightly *above* the
shipped point) **or** two sections agree at a lower one (second-highest ≥ 0.9765).

This is a two-parameter rule fitted on the same corpus it is evaluated on, so it was
cross-validated before being believed. **200 random split-halves**; both rules refitted on half A
at a 1.208% false-positive budget and evaluated on half B:

| | held-out detection | held-out human FP |
|---|---|---|
| plain maximum | 95.22% (sd 0.85) | 1.22% (sd 0.33) |
| minimum evidence | **96.03%** (sd 0.83) | 1.30% (sd 0.34) |
| difference | **+0.82pp**, 95% of splits in [−0.22, +1.74] | **+0.077pp** |

Minimum evidence wins on **178 of 200** splits, ties on 15, loses on 7. The gain survives, and so
does a small honest cost: out of sample it spends slightly more false positives than it was fitted
to, which the in-corpus table does not show.

By section count, at the matched budget:

| sections | A detection | E detection | A human FP | E human FP |
|---|---|---|---|---|
| 2 | 30/37 = 81.08% | **34/37 = 91.89%** | 7/1,503 = 0.47% | 6/1,503 = 0.40% |
| 3 | 178/198 = 89.90% | **183/198 = 92.42%** | 24/979 = 2.45% | 23/979 = 2.35% |
| 4 | 192/200 = 96.00% | 192/200 = 96.00% | 18/1,195 = 1.51% | 15/1,195 = 1.26% |
| 5+ | 477/487 = 97.95% | 478/487 = 98.15% | 8/887 = 0.90% | 9/887 = 1.01% |

**It helps most exactly where the owner's complaint lives.** The two-section bucket gains 10.8
points of detection and the three-section bucket 2.5, while five-plus is unchanged. It narrows the
short-versus-long detection gap from 16.9 points (81.08 → 97.95) to 6.3 (91.89 → 98.15). It does
not remove the section-count bias — nothing here does, because that bias is 0.14pp per section and
the register spread is 11 points — but it removes most of the asymmetry a user would actually
notice.

**The cost, per register, stated plainly:**

| human register | A @ 0.984 | E |
|---|---|---|
| story (fiction) | 29/260 = 11.15% | **25/260 = 9.62%** |
| academic-discussion | 8/420 = 1.90% | **11/420 = 2.62%** |
| academic-conclusion | 6/360 = 1.67% | **8/360 = 2.22%** |
| academic-introduction | 2/420 = 0.48% | 1/420 = 0.24% |
| longform-journalism | 6/840 = 0.71% | 5/840 = 0.60% |
| white-paper | 4/840 = 0.48% | 4/840 = 0.48% |
| company-update | 2/662 = 0.30% | 2/662 = 0.30% |
| academic-lit-review, research-summary, student-essay | 0 | 0 |

Fiction, the worst register, improves by 1.53pp. **Academic discussion and academic conclusions get
worse**, by 0.72pp and 0.55pp — three and two documents. `OBJECTIVE.md` names academic discussion as
the register to watch, so this is the finding that should decide whether E is worth shipping, and
it is a judgement, not an arithmetic result. On detection, E gains research summaries
(95.73% → 99.15%) and academic essays (88.64% → 90.91%) and loses nothing anywhere.

### 2.4 The property maximum aggregation exists to protect — tested explicitly

`HANDOVER.md` §4.2 is the constraint every candidate has to survive: a half-AI document must still
be caught. The corpus has no mixed documents, so **700 were built**: for each of seven registers,
50 AI articles and 50 human articles of matched word count, spliced in both orders, 300–900 words
per half. Median five sections. Scored through the same fp32 harness (3,440 segments, 109 s).
`mixed-corpus.jsonl` and its build script are reproducible from a fixed seed.

| rule | half-AI documents caught | human-first | AI-first |
|---|---|---|---|
| A plain maximum | 638/700 = 91.14% [88.81–93.03] | 89.7% | 92.6% |
| B section-count-aware | 577/700 = 82.43% [79.43–85.07] | 80.3% | 84.6% |
| C second-highest | 596/700 = 85.14% [82.32–87.59] | 85.1% | 85.1% |
| D best adjacent pair | 598/700 = 85.43% [82.62–87.85] | 85.7% | 85.1% |
| **E minimum evidence** | **644/700 = 92.00%** [89.75–93.79] | 91.1% | 92.9% |
| document mean, for reference | **29/700 = 4.14%** [2.90–5.89] | 5.1% | 3.1% |

**This is an independent replication of §4.2's central finding on a purpose-built corpus, and it is
starker than the original: mean aggregation catches 4.14% of genuinely half-AI documents where
maximum catches 91.14%.** Twenty-two times.

It is also the decisive argument against B, C and D. All three lose 6 to 9 points of exactly the
capability the aggregation rule exists to provide. E does not lose it — it gains 0.86pp.

### 2.5 What to do

**Ship nothing yet, and specifically do not ship a section-count correction.** The measured bias is
+0.14pp of human false positives per section, real but an order of magnitude smaller than the
register spread it hides inside, and every correction that targets it directly costs far more than
it saves.

If a change is wanted, **minimum evidence is the only candidate that beats plain maximum on every
axis measured** — detection, matched-detection false positives, short-document fairness and
mixed-content recall — and it survives cross-validation. Before it could ship it needs: the
academic-discussion regression accepted or refused by the owner, a refit on the browser int8
runtime (which has never had its own full-corpus curve — `SEGMENT-TOKEN-FIX.md` §9), the
`aggregation: "max"` contract that the server enforces and the browser refuses to render anything
else for, and the shipped copy that says the verdict is the highest section.

---

## 3. The rhythm signals — a clean negative

The seven v4 rules were run over all 5,558 documents through the built pack
(`packages/core/dist/patterns/en-signals-v4.js`, `computeV4Metrics`), with the gates transcribed
from `collectV4Issues` exactly as shipped, and joined to each document's model probability.

### 3.1 Unconditional firing rates

| rule | AI (n=922) | human (n=4,636) | likelihood ratio |
|---|---|---|---|
| `mic-drop-paragraph` | 31 = 3.36% | 1 = 0.02% | **156** |
| `sentence-length-spectral-flatness` | 5 = 0.54% | 25 = 0.54% | 1.0 |
| `contrast-density` | 2 = 0.22% | 0 = 0.00% | — |
| `conditional-compression` | 1 = 0.11% | 34 = 0.73% | 0.1 |
| `lexical-register-distance` | 1 = 0.11% | 124 = 2.67% | 0.04 |
| `punchline-fragment-density` | **0 = 0.00%** | **0 = 0.00%** | — |
| `rhetorical-procedural-ratio` | **0 = 0.00%** | **0 = 0.00%** | — |
| **any of the six** | 40 = 4.34% [3.20–5.85] | 168 = 3.62% [3.12–4.20] | **1.2** |

Two of the seven fire on nothing. Two point the wrong way — `lexical-register-distance` fires on
human writing 24 times more often than AI, which is the genre confound its own documentation warns
about, arriving as predicted. Only `mic-drop-paragraph` is both live and correctly directed.

### 3.2 The conditional question — the whole point of the exercise

Among the AI documents the model **misses** at 0.984 (n=45), how often do the rhythm signals fire,
against how often they fire on the human documents it **correctly clears** (n=4,580)?

| rule | on the 45 misses | on the 4,580 cleared humans | ratio |
|---|---|---|---|
| `mic-drop-paragraph` | 1 = 2.22% | 1 = 0.02% | 102 |
| `lexical-register-distance` | 1 = 2.22% | 124 = 2.71% | 0.8 |
| `sentence-length-spectral-flatness` | 0 | 25 = 0.55% | 0.0 |
| `conditional-compression` | 0 | 34 = 0.74% | 0.0 |
| `punchline-fragment-density` | 0 | 0 | — |
| `contrast-density` | 0 | 0 | — |
| `rhetorical-procedural-ratio` | 0 | 0 | — |
| **any of the six** | **2/45 = 4.44%** | **168/4,580 = 3.67%** | **1.2** |

**A signal that fires on both equally adds nothing, and that is what these do.** The tier fires on
the model's failures at essentially the rate it fires on its successes.

`mic-drop-paragraph`, the one rule with real direction, is **redundant rather than useless**: it
fires on 31 AI documents, and the model already detects **30 of them**. It adds exactly one
document the model missed. Its single human fire is on a document scoring 0.9398, already cleared
and not close.

### 3.3 The strongest form of the question — the signals as continuous measurements

The gates could be badly placed while the underlying measurement is informative, so each metric was
tested as a continuous score: AUROC separating the 45 misses from the 4,580 correctly-cleared human
documents. Rows where a metric is undefined (compression gain is only computed between 250 and 900
words) carry their own denominator.

| signal | AUROC, misses vs cleared | AUROC, all AI vs all human |
|---|---|---|
| abstract-claim share | **0.686** (n=45) | 0.733 (922/4,636) |
| compression gain | 0.722 (**n=15** — too few to use) | 0.586 (78/1,874) |
| punchline count | 0.569 (n=45) | **0.727** (922/4,636) |
| punchline rate | 0.561 (n=45) | 0.712 |
| contrast count | 0.536 (n=45) | 0.599 |
| register long-word delta | 0.533 (n=45) | 0.597 |
| spectral flatness | 0.530 (n=45) | 0.544 |
| contrast per 1,000 words | 0.531 (n=45) | 0.590 |
| mic-drop paragraphs | 0.527 (n=45) | 0.560 |
| punchline paragraph-final | 0.524 (n=45) | 0.567 |
| concrete sentences | 0.509 (n=45) | 0.468 |
| register function-word L1 | 0.479 (n=45) | 0.422 |

The model's own AUROC on the same corpus is **0.997**.

Bootstrap, 2,000 resamples: abstract-claim share **0.686, 95% CI [0.588, 0.780]**; punchline count
**0.569, 95% CI [0.499, 0.640]** — the second interval touches chance.

So there is a *trace* of conditional information in abstract-claim share, above chance with a
confidence interval that clears 0.5. It is not nothing. It is also not usable: §3.4 shows what it
converts into at an operating point.

### 3.4 The narrow escalation, evaluated as specified

Flag when the model probability sits in a defined uncertain band **and** at least N rhythm rules
fire. Cost measured against the shipped rule on the same 5,558 documents.

| band | N rules | AI documents added | human false positives added | AI total | human FP total |
|---|---|---|---|---|---|
| 0.80–0.984 | 1 | **+2** | **+10** | 879/922 = 95.34% | 66/4,636 = 1.42% |
| 0.90–0.984 | 1 | +2 | +6 | 879/922 = 95.34% | 62/4,636 = 1.34% |
| 0.95–0.984 | 1 | +2 | +2 | 879/922 = 95.34% | 58/4,636 = 1.25% |
| 0.97–0.984 | 1 | +2 | +1 | 879/922 = 95.34% | 57/4,636 = 1.23% |
| any band | **2** | **0** | **0** | unchanged | unchanged |

**Requiring several rhythm rules to agree — the guard the brief proposed — gains nothing at all,
because no document anywhere in the uncertain band fires two of them.** In the widest band, 985
human and 45 AI documents are eligible, and 10 humans against 2 AI fire even one rule.

The best case is the narrowest band, where two AI documents are gained for one human false
positive. That is a positive predictive value of 67% on a change affecting three documents in
5,558, and it is arrived at by choosing the band after seeing the answer. It is not a result.

Per-register cost of the 0.90–0.984 / ≥1-rule escalation, since the brief asked specifically:

| human register | shipped | escalated |
|---|---|---|
| story (fiction) | 29/260 = 11.15% | **29/260 = 11.15% — unchanged** |
| academic-discussion | 8/420 = 1.90% | **8/420 = 1.90% — unchanged** |
| academic-conclusion | 6/360 = 1.67% | 7/360 = 1.94% |
| academic-introduction | 2/420 = 0.48% | 3/420 = 0.71% |
| research-summary | 0/189 = 0.00% | 1/189 = 0.53% |
| company-update | 2/662 = 0.30% | 3/662 = 0.45% |
| longform-journalism | 5/840 = 0.60% | 6/840 = 0.71% |
| white-paper | 4/840 = 0.48% | 5/840 = 0.60% |

The two registers the brief worried about most are the two the escalation does not touch. It
spends its false positives on academic conclusions and introductions instead, for two AI documents
in long-form journalism and one academic literature review.

### 3.5 `punchline-fragment-density` — the gate is set where nothing lives

`docs/CAPABILITIES.md` §3.4a records this rule firing on 5 of 5,743 AI documents, with an unapplied
proposal to loosen it to count ≥ 6, rate ≥ 0.10, paragraph-final ≥ 3. On this corpus:

| gate | AI (922) | human (4,636) | on the 45 misses | on the 4,580 cleared |
|---|---|---|---|---|
| count ≥ 4, rate ≥ 0.18, final ≥ 2 — **shipped** | 0 = 0.00% | 0 = 0.00% | 0 | 0 |
| count ≥ 6, rate ≥ 0.10, final ≥ 3 — **the published proposal** | **0 = 0.00%** | **0 = 0.00%** | 0 | 0 |
| count ≥ 4, rate ≥ 0.06, final ≥ 2 | 14 = 1.52% | 1 = 0.02% | 0 | 1 |
| count ≥ 4, rate ≥ 0.04, final ≥ 2 | 24 = 2.60% | 3 = 0.06% | 0 | 3 |
| count ≥ 3, rate ≥ 0.03, final ≥ 1 | 79 = 8.57% | 12 = 0.26% | 2 | 12 |

**The rate gate is unreachable on published long-form prose, and so is the proposed replacement.**
The AI corpus maximum punchline rate is 0.136 and its 99th percentile is 0.084; the shipped gate
asks for 0.18 and the proposal for 0.10. The proposal was measured on the generated corpus, where
it reached 36 documents; on this one it reaches zero. That is worth recording before anyone applies
it.

The underlying measurement is not dead — punchline count has the **best unconditional AUROC of any
rhythm signal at 0.727**, and a rate gate of 0.06 gives 14 AI against 1 human, a likelihood ratio
of 70. But at every setting, **it fires on none of the 45 documents the model misses**. It is a
well-directed rule that duplicates work the model already does. If it is loosened, it should be
loosened as an editorial suggestion, which is what the tier is for, not as detection evidence.

### 3.6 The answer

**The rhythm signals have no conditional value on this corpus.** They fire on the model's failures
at 1.2 times the rate they fire on its successes; the one rule with real direction is redundant on
30 of the 31 documents it catches; the trace of continuous information in abstract-claim share
(AUROC 0.686 [0.588, 0.780] on n=45) does not convert into an operating point that gains more than
it costs at any band tried; and requiring rules to agree gains literally nothing because they never
agree.

The owner heard something real. The v4 rules were written to measure it and they do measure
something — `mic-drop-paragraph` at a likelihood ratio of 156, punchline count at AUROC 0.727. What
they do not do is fire on the documents the model gets wrong. The model has already learned the
cadence.

**The honest limit on this negative.** It rests on 45 miss documents. A ratio measured against 45
cases cannot rule out a modest effect, and the corpus is the one register the model is strongest
on. If this is to be revisited, the thing to gather is not more rules but **more misses** —
specifically AI text written under anti-AI instructions, which is the register the owner's own
80.8% article belongs to and which this corpus contains almost none of.

---

## 4. The owner's own documents

Scored through the same fp32 `segments-v2` harness, model SHA-256 `e313ab00de1fffd2…`.

| document | what it is | words | sections | p_max | A max | B Šidák | C 2nd | D adjacent | E min-evidence | rhythm rules |
|---|---|---|---|---|---|---|---|---|---|---|
| `1-panda-penguin` | human, Opace team | 485 | 2 | 0.0223 | clear | clear | clear | clear | clear | none fire |
| `2-social-objectives` | human, Opace team | 420 | 1 | 0.0544 | clear | clear | clear | clear | clear | none fire |
| `3-esports` | human, Opace team | 460 | 2 | 0.0326 | clear | clear | clear | clear | clear | none fire |
| `4-facebook-stale` | human, Opace team | 611 | 2 | 0.1172 | clear | clear | clear | clear | clear | none fire |
| `5-mobile-algorithm` | human, Opace team | 469 | 2 | 0.2078 | clear | clear | clear | clear | clear | none fire |
| `6-eu-ranking` | human, Opace team | 343 | 1 | 0.0893 | clear | clear | clear | clear | clear | none fire |
| `7-pure-ai-no-instructions` | AI, unedited Playground | 674 | 2 | 0.9718 | clear | clear | clear | clear | clear | none fire |
| `8-heavily-edited-by-hand` | AI, rewritten by hand | 1,141 | 3 | 0.9856 | **FLAG** | **FLAG** | **FLAG** | **FLAG** | **FLAG** | none fire |

**Every candidate leaves all eight verdicts unchanged**, including the one that wins on the corpus.
The narrow rhythm escalation changes nothing either — no rhythm rule fires on any of the eight, and
document 7 at 0.9718 sits inside every uncertain band tried and fires nothing.

Two things this small set does establish. It does not falsify candidate E, which is what it was
for. And it makes the §3 negative concrete: the six human articles were identified correctly by the
model with no help, and on the two AI articles the rules that were written to catch the owner's
"three sentences in twenty-nine words" cadence fire zero times.

**The ninth document named in the brief — the AI article written with anti-AI instructions that
scored 80.8% and was missed — is not saved anywhere.** It is not in the samples directory, which
holds eight files, and a search of the programme tree found only its 80.8% figure quoted in
`REDESIGN.md` §1 and the UI/UX report, never the text. It could not be measured, and it is the one
document of the set that would most usefully test both questions. It is worth recovering.

---

## 5. What was not measured

- **The browser int8 runtime.** Everything here is fp32. Candidate E's thresholds were fitted on
  fp32 section scores and would need refitting on the browser runtime, whose own full-corpus
  segmented curve has still never been measured (about five hours through onnxruntime-web).
- **The 5,558-document segment scoring was reused, not re-run.** It reproduces the two published
  figures it should and the harness reproduces the owner's eight readings exactly, but no
  independent re-scoring of the corpus was performed.
- **Register labels are machine-assigned**, as `longform-corpus/MANIFEST.md` records. Every
  per-register split here inherits that.
- **The mixed corpus is synthetic** — spliced halves, not documents a person actually wrote half
  of. It tests the mechanism maximum aggregation protects; it is not a sample of real mixed
  authorship, and its absolute rates should not be quoted as a detection figure for edited text.
- **Sections within a document are correlated**, so the independence model in §1.1 is an upper
  bound and is used only to show the observed curve does not follow it. The within-document
  measurement in §1.4 does not depend on that assumption.
- **Candidate E was not tested for the drift guard.** Its second parameter would have to be part
  of the segmentation contract both routes agree on, or the front end would refuse the server's
  answer. That is design work this measurement did not do.
