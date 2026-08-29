# Detection on published prose — the stripped-text re-baseline

**Workstream REAL · 28 August 2026**
**Scope:** every number below is measured on the 1,896-sample provider-eval set (1,727 AI × 12 provider/era slices, 169 held-out humans), scored twice: once as raw chat export, once after markdown normalisation. Nothing was tuned on the quarantined `eval-samples.json`, which this workstream never read.
**Governing rule:** BRIEF §5. Measured numbers only. Where the honest answer is "this does not work yet", it says so.

---

## 0. What changed, in one table

The shipped stack's headline detection rate was measuring formatting, not writing. Strip the markdown furniture — which is what happens when anyone pastes prose out of a CMS, a document or a rendered web page — and the picture inverts: the rules collapse, the classifier is untouched, and the surprisal engine turns out to have been reading the furniture too.

| Tier | Size | AUROC raw | AUROC stripped | Verdict |
|---|---|---|---|---|
| Rules (`en-signals:2026.08.6`) | 0 MB | 0.9302 | **0.7108** | Collapses. 66.7% → 5.5% detection |
| Tier 3 classifier (e5-small int8) | 34 MB | 0.9573 | **0.9498** | **Survives.** −0.0075 AUROC |
| Tier 2 surprisal head (GPT-2 + head v2) | 194 MB | 0.7050 | **0.4962** | **Chance.** As shipped, worthless |

The classifier is the only tier that reads writing rather than layout. That single result decides the two questions on the table: the 34 MB classifier is essential, and the 194 MB rhythm model as currently calibrated is not — with one important caveat in §5 that changes the recommendation.

---

## 1. The normaliser, and why it is defensible

`strip_markdown.py` models render-then-copy: the words a reader sees survive, the syntax that produced them does not. Eleven documented rules (headings, emphasis, list markers, code fences, tables, rules, links, blockquotes, raw HTML, escapes, whitespace), applied to a fixed point because removing emphasis can re-expose a block marker that the emphasis was hiding (`**1. Step one**` renders as a list item, not as the literal string).

It does **not** rewrite sentences, substitute punctuation, remove em dashes or join list items into prose. Removing formatting and nothing else is the whole point; anything more would make it an intervention rather than a measurement.

`test_strip.py` gates it: **32/32 unit cases pass**, including negative cases that must not be mistaken for markdown (`3 * 4 * 5`, `user_id_field`, `In 1999. it changed`).

What it actually did to the corpus:

| | words before | words after | removed | carried furniture | residual furniture |
|---|---|---|---|---|---|
| AI (1,727) | 588,570 | 560,567 | **4.76%** | 1,462 / 1,727 | 47 (all genuine maths asterisks) |
| Human (169) | 61,773 | 61,757 | **0.03%** | 7 / 169 | 3 |

**95.2% of the AI words survive, the human side is untouched to within 0.03%, and total punctuation delta across all 169 humans is 4 characters.** The text is the same text. Only the layout is gone. That is what makes the collapse in §2 a real finding rather than an artefact of an aggressive cleaner.

---

## 2. Task 1 — the honest re-baseline

### 2.1 Reproduction

The orchestrator's finding reproduces almost exactly (small differences are the fixed-point pass removing slightly more furniture):

| | orchestrator | this run |
|---|---|---|
| Rules, raw | 66.7% | **66.7%** |
| Rules, stripped | 5.3% | **5.5%** |
| anthropic / openai / deepseek / google / grok / meta / mistral | 1.3 / 4.8 / 4.0 / 5.0 / 7.3 / 8.3 / 8.0 | 1.7 / 5.3 / 5.3 / 4.3 / 6.7 / 8.3 / 9.3 |

Tier 3 raw scores reconcile with the existing `provider-eval/tier3-scores.jsonl` to a max difference of 5.0 × 10⁻⁷, confirming an identical code path.

### 2.2 Where the raw rules score came from

| Escalation | raw | stripped |
|---|---|---|
| `formatting_floor` | 588 | **0** |
| `finding_breadth` | 540 | **64** |
| `artefact_floor` / `artefact_score` | 14 | 25 |
| none | 585 | 1,638 |

Two things follow. First, the detection gain shipped since the provider evaluation (`2026.08.5` → `2026.08.6`, which implemented the R1 formatting floor) is entirely furniture-dependent: 588 of 1,727 detections vanish completely. Second — and this corrects a claim in `PROVIDER-EVAL-2026-08.md` §4.1 — the finding-breadth escalation was recommended as "register-robust (no furniture dependence)". It is not. It loses 88% of its firings (540 → 64) because the findings it counts are themselves largely furniture findings.

### 2.3 The three tiers, per provider × era

Rules detection is the shipped `mixed_signals`-or-above rate. Tier 3 and Tier 2 are AUROC against all 169 humans, which is threshold-free and therefore the fair comparison.

| Slice | n | Rules raw | Rules stripped | T3 AUROC raw | T3 AUROC stripped | T2 AUROC stripped |
|---|---|---|---|---|---|---|
| anthropic 2024-25 | 150 | 16.0% | 2.7% | 0.9387 | 0.9518 | 0.1579 |
| anthropic 2025-26 | 150 | 53.3% | 0.7% | 0.9411 | 0.9375 | 0.3218 |
| deepseek 2025-26 | 150 | 95.3% | 5.3% | 0.9783 | 0.9693 | 0.1612 |
| google 2024-25 | 150 | 82.7% | 2.7% | 0.9568 | 0.9505 | 0.6568 |
| google 2025-26 | 150 | 88.7% | 6.0% | 0.9611 | 0.9503 | 0.4954 |
| grok 2025-26 | 150 | 68.0% | 6.7% | 0.9609 | 0.9479 | 0.5413 |
| meta 2024-25 | 150 | 71.3% | 6.7% | 0.9576 | 0.9374 | 0.8756 |
| meta 2025-26 | 150 | 87.3% | 10.0% | 0.9696 | 0.9526 | 0.6954 |
| mistral 2025-26 | 150 | 92.7% | 9.3% | 0.9806 | 0.9797 | 0.3225 |
| openai 2022-23 | 150 | 0.0% | 0.0% | 0.9051 | 0.9032 | 0.9425 |
| openai 2024-25 | 77 | 80.5% | 14.3% | 0.9608 | 0.9509 | 0.6794 |
| openai 2025-26 | 150 | 71.3% | 6.0% | 0.9789 | 0.9671 | 0.1944 |
| **human FP (rules)** | 169 | **0** | **0** | — | — | — |

**Tier 3 survives stripping on every slice.** Mean AI probability moves 0.7716 → 0.7654; mean human probability moves 0.2258 → 0.2264. The classifier is reading prose, not layout — and it was never trained on stripped text, so this is genuine generalisation rather than a training artefact.

A stronger test: an aggressive `flatten_lists` variant that additionally joins every list into flowing paragraphs (removing the residual list *shape*, not just the markers) still gives Tier 3 **AUROC 0.9384**. The signal is in the sentences.

**Tier 2, as shipped, is at chance.** Its per-slice AUROCs are not merely weak, they are inverted for exactly the models that matter: anthropic 0.158, deepseek 0.161, openai-2025 0.194 — while its one strong slice is openai 2022-23 at 0.9425. That pattern has a direct cause. The Tier 2 head was fitted on 330 AI documents (`corpus/manifest.json`), of which 120 were HC3 GPT-3.5 and **60 were GPT-2 continuations generated locally**. It is a GPT-2/GPT-3.5 detector, and on modern models it scores backwards. This is the ETS decay effect from `CLEAN-PROSE-DETECTION-PLAN` §1.1 reproduced inside our own stack.

One number here must be reported and then set aside: Tier 2 scores AUROC 0.7738 on the `flatten_lists` variant, better than on raw text. That is not evidence of a surviving signal. `flatten_lists` inserts a full stop at the end of every unterminated line (documented behaviour), AI text has far more such lines than human text, and Tier 2 reads punctuation-sensitive surprisal — so the score is measuring my own transformation. It is listed for completeness and carries no weight in the Tier 2 verdict.

### 2.4 The Tier 3 saturation pathology — cause corrected

`PROVIDER-EVAL` §4.3 attributed the knife-edge at 0.857 to int8 quantisation and recommended shipping fp32. **Measured, that is wrong.** Scoring the stripped set with the fp32 `tier3-e5small.onnx`:

| | AUROC | AI median p | human max p |
|---|---|---|---|
| int8 per-channel (shipped) | 0.9498 | 0.8547 | 0.8564 |
| fp32 | 0.9492 | 0.8547 | 0.8563 |

The saturation is in the trained model, not the quantiser. The fine-tune drove its softmax to a ceiling near 0.858, so **the AI median sits *below* the highest-scoring human**. Shipping fp32 will not fix it. Only temperature scaling on the logits or a cycle-2 retrain will. It does not harm ranking (AUROC is unaffected), but it means thresholds must be specified to four decimal places and are fragile to any runtime kernel difference.

---

## 3. Task 2 — what actually separates published AI prose

### 3.1 Metric ranking on stripped text

Full v4 metric set plus stylometry plus the 22 Tier 2 surprisal features, AI vs 169 humans, ranked by |Cliff's δ|. Top signals only:

| Metric | Cliff's δ | Cohen's d | AUROC | Direction | Note |
|---|---|---|---|---|---|
| `tier3.p` | 0.900 | 2.61 | 0.9498 | higher = AI | the classifier |
| `t2feat.div_skew` | 0.770 | 1.38 | 0.8851 | higher = AI | DivEye surprisal skew |
| `t2feat.div_kurt` | 0.761 | 1.22 | 0.8807 | higher = AI | DivEye surprisal kurtosis |
| `stylo.paraMean` | −0.751 | −2.83 | 0.8753 | lower = AI | **register confound, see below** |
| `t2feat.uid_global` | 0.674 | 1.14 | 0.8368 | higher = AI | |
| `t2feat.div_d2_entropy` | −0.653 | −1.20 | 0.8264 | lower = AI | second-order rhythm |
| `stylo.paraCv` | 0.649 | 1.17 | 0.8246 | higher = AI | register confound |
| `stylo.sentMean` | −0.638 | −0.95 | 0.8191 | lower = AI | |
| `t2feat.div_var` | 0.537 | 0.83 | 0.7687 | higher = AI | |
| `v4.compressionGain` | −0.496 | −0.90 | 0.7481 | lower = AI | |
| `rules.score` | 0.422 | 0.65 | 0.7108 | higher = AI | the whole rules tier |

The single most important line in that table is the fourth. The block-structure metrics (`paraMean`, `paraCv`, `paraCount`, `linesPerPara`) have large effect sizes because **the human corpus is long-form encyclopaedic and QA prose while the AI corpus is chat answers**. AI paragraphs average 51 words against 225 for humans even after list-flattening. That is a property of how the two corpora were sourced, not a property of AI writing, and it must not be allowed into a shipped model. §3.2 quantifies the damage it does.

The genuine, register-independent finding: **the Tier 2 surprisal *features* separate strongly** (`div_skew` δ = 0.770, `div_kurt` δ = 0.761) even though the Tier 2 *head* built from them is at chance. The features work; the weights are stale.

### 3.2 The zero-FP ceiling, cross-validated

Nested 5-fold CV, stratified by provider × era, combiner fitted on training folds only, threshold chosen on training-fold humans only, 20 repeats.

| Feature set | dim | CV AUROC | CV TPR @ train-zero-FP | held-out FPR | in-sample TPR | optimism |
|---|---|---|---|---|---|---|
| A tier3 only | 1 | 0.9498 | 34.7% ±1.4 | 0.75% | 31.3% | −3.4 |
| B tier3 + tier2 surprisal | 23 | 0.9747 | 60.3% ±2.3 | 0.95% | 52.6% | −7.7 |
| C all signals | 42 | 0.9907 | 88.4% ±0.7 | 1.42% | 86.5% | −1.9 |
| D rules + stylometry only | 19 | 0.9599 | 46.4% ±1.4 | 1.77% | 45.6% | −0.8 |
| E all minus block structure | 38 | 0.9857 | 86.0% ±0.5 | 2.12% | 86.0% | +0.1 |

Set C's 88.4% is not a detection ceiling and must not be quoted as one. Its held-out false positives on business-marketing humans run at **10.5%**, and set E — with block structure removed — is worse at **14.5%**. The apparent headline is bought almost entirely from the audience the programme weights hardest.

### 3.3 The finding that governs everything else

Under the old zero-FP rule, the entire operating point of the shipped Tier 3 was set by **one document**: the highest-scoring human in the corpus is a business-marketing sample at p = 0.85644, and the AI median is 0.8547. Half of all AI text scores below the hardest human.

Sweeping the threshold reveals how concentrated the errors are:

| Threshold | TPR | FP (of 169) | FPR | business-marketing FP | biz share of all FP |
|---|---|---|---|---|---|
| 0.8564 | 31.3% | 0 | 0.0% | 0/10 | — |
| 0.8553 | 45.5% | 1 | 0.6% | 1/10 | 100% |
| 0.8532 | 57.3% | 3 | 1.8% | 2/10 | 67% |
| 0.8474 | 67.3% | 4 | 2.4% | 3/10 | 75% |
| 0.8397 | 73.1% | 5 | 3.0% | 4/10 | 80% |
| 0.8259 | 77.5% | 7 | 4.1% | 4/10 | 57% |
| 0.7939 | 81.2% | 8 | 4.7% | 5/10 | 62% |
| 0.6256 | 86.4% | 15 | 8.9% | 6/10 | 40% |

Business-marketing is 5.9% of the human corpus and 40–100% of the false positives at every operating point.

---

## 4. The 9% budget — and why the corpus it is measured on decides the answer

The owner has lifted the zero-FP rule: up to ~9% false positives is acceptable **provided the rate is measured on a varied, realistic human corpus rather than a narrow one**. That proviso is the whole story, because our 169-human corpus is not varied: 129 of them (76%) are wikitext-103 article leads and HC3 QA answers, and **they contribute essentially zero false positives at any threshold**. Only the 40 fresh battery humans — business-marketing, blog-editorial, technical, journalism, casual, non-native, academic — behave like real published prose.

Split the same thresholds by which humans bear the cost:

| Threshold | TPR (stripped) | FPR on all 169 | **FPR on the 40 varied humans** | FPR on the 129 wiki/QA |
|---|---|---|---|---|
| 0.8564 | 32.4% | 0.6% | 2.5% [0–13] | 0.0% |
| **0.8532** | **57.2%** | **1.8%** | **7.5% [3–20]** | **0.0%** |
| 0.8474 | 67.3% | 3.0% | 12.5% [5–26] | 0.0% |
| 0.8397 | 73.1% | 3.6% | 15.0% [7–29] | 0.0% |
| 0.8259 | 77.5% | 4.7% | 20.0% [10–35] | 0.0% |
| 0.7939 | 81.2% | 5.3% | 22.5% [12–38] | 0.0% |
| 0.7314 | 84.1% | 7.1% | 25.0% [14–40] | 1.6% |
| 0.6256 | 86.4% | 8.9% | **30.0% [18–45]** | 2.3% |

Brackets are Wilson 95% intervals.

**A "9% false-positive rate" on this corpus is a 30% false-positive rate on realistic human prose.** The 8.9% figure is diluted fourfold by 129 documents of encyclopaedic and QA text that no user will ever paste into the tool. Quoting 8.9% for an 86.4% detection rate would be exactly the kind of marketing number the programme exists to refuse.

### 4.1 Full operating curve, all tiers, stripped prose

In-sample threshold on all 169 humans; held-out columns pick the threshold on a random half and measure TPR and realised FPR on the other half, 400 splits.

| Scorer | Budget | Thr | FP | FPR | TPR | held-out TPR | held-out FPR |
|---|---|---|---|---|---|---|---|
| rules, stripped | 3% | 4.0 | 5 | 3.0% | 25.6% | 21.4 ±0.5 | 2.5 ±0.2 |
| rules, stripped | 9% | 3.0 | 14 | 8.3% | 38.2% | 33.4 ±0.6 | 6.8 ±0.4 |
| rules, raw | 9% | 3.0 | 15 | 8.9% | 85.8% | 82.6 ±0.4 | 6.9 ±0.4 |
| tier2, stripped | 3% | 0.7114 | 5 | 3.0% | 29.8% | 29.4 ±0.1 | 3.5 ±0.3 |
| tier2, stripped | 9% | 0.6283 | 15 | 8.9% | 33.8% | 33.7 ±0.1 | 9.4 ±0.4 |
| **tier3, stripped** | 1% | 0.8553 | 1 | 0.6% | 45.5% | 42.4 ±1.1 | 1.2 ±0.1 |
| **tier3, stripped** | 2% | 0.8532 | 3 | 1.8% | 57.3% | 58.3 ±1.0 | 2.2 ±0.2 |
| **tier3, stripped** | 3% | 0.8397 | 5 | 3.0% | 73.1% | 68.6 ±0.9 | 3.5 ±0.3 |
| **tier3, stripped** | 5% | 0.7939 | 8 | 4.7% | 81.2% | 80.5 ±0.5 | 5.9 ±0.4 |
| **tier3, stripped** | 7% | 0.7314 | 11 | 6.5% | 84.1% | 82.8 ±0.4 | 6.7 ±0.4 |
| **tier3, stripped** | 9% | 0.6256 | 15 | 8.9% | 86.4% | 86.5 ±0.2 | 9.7 ±0.5 |
| tier3, raw | 5% | 0.7586 | 8 | 4.7% | 83.9% | 82.2 ±0.5 | 5.9 ±0.3 |

Tier 3 loses only ~2.7 points of TPR to stripping at a 5% budget (83.9% → 81.2%), against the rules tier's 85.8% → 38.2%. The classifier is the product.

### 4.2 Recommended operating point

**Ship Tier 3 at threshold 0.8533** (a threshold-only change from the current 0.857; no model change, no new download).

| | Measured |
|---|---|
| Detection on stripped published AI prose | **56.9%** (983 / 1,727) |
| Detection on raw chat-export text | 53.7% |
| False positives, all 169 humans | 3 (1.8%) [0.6–5.1] |
| **False positives, 40 varied realistic humans** | **3 (7.5%)** [3–20] |
| False positives, business-marketing | 2 / 10 |
| False positives, non-native writers | **0 / 4** |
| Per-slice detection | mistral 75.3, deepseek 74.7, google-25 67.3, openai-25 67.3, meta-25 65.3, openai-24 64.9, google-24 61.3, meta-24 57.3, grok 56.7, anthropic-25 47.3, anthropic-24 42.7, **openai 2022-23 6.7** |

This is the highest-detection point that stays inside a 9% false-positive budget **when the budget is measured on the varied human corpus rather than the diluted one**. It spreads its three errors across two genres and does not touch the non-native writers, which is the fairness constraint.

The obvious next rung, 0.8474, buys +10.3 points of detection (67.3%) for 4/40 = 10.0% varied-human FPR — just outside budget, and it concentrates three of its four errors on business-marketing. I do not recommend it without the cycle-2 negatives in §5.

The honest ceiling for a *shippable today* configuration is therefore **56.9% detection at ~7.5% realistic false positives, with wide error bars (Wilson 3–20% on 40 humans)**. Not the 86% the diluted corpus suggests.

---

## 5. Task 3 — recovery plan, costed

### (a) Tier 3 cycle-2 retraining — the binding fix

The defect is precisely located and is not a general weakness: the model ranks AI against encyclopaedic and QA humans almost perfectly (0/129 false positives at every threshold down to 0.79) and fails specifically on polished business-marketing, blog-editorial and technical prose. That is a hard-negative problem, which is the one problem the published Pangram recipe is known to solve.

Corpus, in priority order (extending the `PROVIDER-EVAL` §4.4 manifest with what this evaluation now shows to be binding):

| Slice | Quantity | Sourcing | Licence |
|---|---|---|---|
| **Human business-marketing** — agency copy, product pages, press releases, service pages | **1,200** (840/180/180) | Fresh crawl of pre-2022 archived commercial sites (Common Crawl / Wayback), UK and US | Verify per-source; prefer CC or fair-dealing excerpt lengths |
| **Human blog-editorial and technical** | 600 | Pre-2022 personal and company blogs, documentation prose | as above |
| **Human non-native English** | 300 | Pre-2022 ESL corpora and international press | check redistribution |
| **Stripped published-prose AI**, all providers/eras, generated as *articles* not chat answers | 3,000 (250 per provider × era) | Fresh generation with publication-style prompts, varied temperature; **then run `strip_markdown.py` over 100% of it** | our own output |
| Format-stripped variants of existing arena AI | derived, 100% | already local | CC BY 4.0 |
| openai 2022-23 (HC3 unused pool ~7,300) | 400 | local | CC BY-SA 4.0 |

Two changes from the previous manifest matter. First, the human business-marketing target rises from 300 to 1,200: at 10 documents we cannot even measure the failure, let alone train it out — every business-marketing rate in this report has a Wilson interval 30 points wide. Second, the AI side must be *published-prose-shaped*, not chat answers. Every AI document in the current corpus is a chat reply; that is what produced the register confound in §3.1, and it will keep producing it until the AI side is generated as articles.

Add two iterations of hard-negative mining (scan a large human pool, harvest false positives, mirror them, retrain) and temperature scaling on the logits to fix the §2.4 saturation.

**Expected gain, with reasoning, not hope.** The model already achieves AUROC 0.95 on stripped prose; the loss is entirely in threshold placement caused by ~6 business-marketing documents scoring in the AI band. The ETS analogue (0.94–0.98 AUC when the generator is represented in training) and Pangram's documented FPR collapse from hard-negative mining (to 0.25%, and 0% on TOEFL ESL) both bear on the FP side, which is our defect. A realistic post-cycle-2 expectation on stripped published prose is **72–85% detection at 4–7% false positives measured on a varied human corpus**, with the interval reflecting that no published result covers our exact register mix. That is a genuine improvement on today's 57% at 7.5%, and it is below the 86% that the diluted corpus currently flatters us with. I would not promise more than that before the run.

**Cost:** $200–1,000 generation + $20–80 rented GPU per cycle; 4–6 engineer-weeks for the corpus work (the human business-marketing crawl and licence review is the bulk of it), then largely automated monthly refresh at ~$300–1,200.

### (b) Does Tier 2 earn its 194 MB on stripped prose?

**As shipped: no. Retrained: probably yes, and for an unexpected reason.**

Cross-validated combiner, threshold chosen on training-fold humans at the target budget:

| Feature set | Download | Budget | CV TPR | realised FPR | **business-marketing FPR** |
|---|---|---|---|---|---|
| A tier3 only | 34 MB | 3% | 71.5% ±1.2 | 3.6% | **41.0%** |
| A tier3 only | 34 MB | 9% | 86.4% ±0.6 | 9.4% | **66.0%** |
| B tier3 + tier2 | 228 MB | 3% | **85.6% ±0.7** | 3.6% | **16.0%** |
| B tier3 + tier2 | 228 MB | 9% | 94.5% ±0.4 | 10.4% | 56.0% |
| E rules/stylo only | 0 MB | 3% | 61.3% ±0.9 | 4.0% | 11.0% |
| F tier2 features only | 194 MB | 3% | 78.4% ±0.8 | 5.1% | **0.0%** |
| F tier2 features only | 194 MB | 9% | 84.9% ±0.5 | 11.4% | **0.0%** |

The shipped Tier 2 head is at chance (AUROC 0.4962) but its 22 features, refitted, reach CV TPR 78.4% at a 3% budget — and, uniquely among everything measured, **they produce zero business-marketing false positives** (0/10; note the Wilson upper bound is 26%, so this is suggestive, not proven). Surprisal statistics do not mistake polished marketing copy for AI, whereas the e5 classifier does so 41–66% of the time.

That makes Tier 2 the natural corrective for Tier 3's one serious defect, and combining them (set B) roughly halves the business-marketing FPR at equal budget while adding 14 points of detection.

The recommendation is therefore conditional, and the condition is cheap: **refit the Tier 2 head before deciding.** The features are already extracted, the head is a 22-coefficient logistic regression stored as JSON, and refitting on a modern-model corpus is hours of work, not weeks — no new download, no runtime change. If the refit reproduces the set-B numbers on held-out data, the 194 MB earns its place as an optional desktop/high-bandwidth tier and Tier 2 should be kept. If it does not, remove it. Do not keep shipping the current head either way: it is measurably worthless on modern models and its 0.76 threshold flags 26.9% of AI and 2/169 humans essentially at random.

### (c) Rule-tier work that survives stripping

Little, and it should be scoped honestly. The rules retain AUROC 0.7108 on stripped text and reach 25.6% detection at a 3% budget, 38.2% at 9% — non-trivial, but far below the classifier and with FPs concentrated in the same genres. The surviving escalations are `artefact_floor` and `artefact_score` (25 firings), which are genuine paste-residue artefacts and should be kept exactly as they are.

Concrete recommendations, all for the patterns workstream to apply or reject:

1. **Correct the register-robustness claim** on finding-breadth in `PROVIDER-EVAL` §4.1. Measured, it loses 88% of its firings under stripping.
2. **Keep the formatting escalations but relabel them.** They are excellent chat-export detectors (588 firings, zero human FPs) and worthless published-prose detectors. They should contribute an explicit "chat-export residue" evidence row, never a general AI verdict, so that a user pasting from ChatGPT gets the benefit and a user pasting from their CMS is not silently under-served.
3. **Do not chase the block-structure metrics** (`paraMean`, `paraCv`, `linesPerPara`). Large effect sizes, but §3.1 shows they are a corpus-sourcing artefact, and the flatten-lists test shows Tier 3 does not need them.
4. `inspectSignalsV2` still throws `RangeError("split_surrogate")` on emoji-bearing texts (2/1,896). Already logged; unchanged.

### (d) What remains undetectable

Stated plainly, with numbers:

- **gpt-3.5-era text (HC3).** Tier 3 AUROC 0.9032 but only **6.7% detection at the recommended threshold** and 0.7% at zero-FP. It is out of the training distribution and its scores sit in the human band. Any claim of era coverage must exclude it.
- **Modern Claude.** The weakest modern slice at 42.7–47.3% detection. Consistent with `PROVIDER-EVAL` §3.2: Claude's signature is rhythm and register, which is the Tier 2 channel, not the Tier 3 one — another reason the Tier 2 refit matters.
- **Short texts.** Stripping pushes 195/1,727 AI samples below 150 words (from 168). Below that length the Tier 2 extractor already returns `inconclusive` at <50 tokens; Tier 3 has no equivalent guard and should get one.
- **Human-edited AI, paraphrase and humaniser attacks.** Not measured here at all. No claim either way.
- **Anything non-English.** Out of scope, unmeasured.

Overall realistic ceiling for the next cycle, with error bars: **72–85% detection at 4–7% false positives on varied human prose**, English, article-length, covered models only, decaying from the day the cycle closes.

---

## 6. Task 4 — shipping truthfully

Tier 3 holds up materially better than the rules, so it can carry a claim the rules cannot. The wording has to survive the two things this evaluation found: the number depends on which humans you measure against, and gpt-3.5-era text is a blind spot.

**Operating point:** Tier 3, threshold **0.8533**, applied to markdown-normalised text (run the normaliser before scoring, so a chat export and a CMS paste of the same words get the same verdict — today they do not).

**Claim that is literally true and defensible:**

> Detects 57% of AI-written prose (983 of 1,727 samples) across twelve model families from seven providers, measured after stripping markdown formatting so that pasted published text is judged on its writing rather than its layout. False positives: 3 of 169 human documents (1.8%); on the 40 documents written in realistic published registers — marketing, blog, technical, journalism — 3 of 40 (7.5%, 95% CI 3–20%). Weakest against gpt-3.5-era text (7%) and modern Claude (43–47%).  Corpus, thresholds and per-provider results published with every release.

**Disclosure that must accompany it:**

1. Lead with the false-positive rate measured on the varied corpus (7.5%), not the diluted all-humans rate (1.8%). The gap between them is the single most misleading thing in this dataset and we should be the ones to point at it.
2. State the human corpus size (169, of which 40 realistic) and that the intervals are wide.
3. Name the uncovered cases — gpt-3.5-era, short texts, non-English, edited or paraphrased AI — rather than letting users discover them.
4. Stamp the training-cycle date and the covered-model list; say "not yet covered" for anything newer.
5. Never present a rules-tier formatting hit as an AI verdict. Label it "chat-export formatting residue", which is what it measures.

**What must not be claimed:** the 86.4% detection figure, or any pairing of it with "8.9% false positives". That combination is real only against a human corpus three-quarters composed of encyclopaedia and QA text, and on realistic prose the same setting misclassifies 30% of human writing.

---

## 7. Limitations

- **The AI corpus is chat, not publication.** Every AI document is an arena chat reply, normalised. Genuinely published AI prose (article-shaped, written to a brief) is not represented, and §3.1 shows the register difference is large enough to distort feature rankings. This is the largest single threat to every number here and the reason cycle 2 must generate article-shaped AI.
- **169 humans, 40 of them realistic, 10 business-marketing.** Every genre rate carries a Wilson interval 25–35 points wide. The business-marketing figures are directional, not precise.
- **Tier 3 is in-distribution.** It was trained on arena text (different samples, exact train texts excluded). Its 0.95 AUROC is an in-distribution number; the one out-of-distribution probe available (HC3) drops it to 0.9032 with near-zero usable detection.
- **20 of the 169 humans were used to select the shipped 0.857 threshold.** They are flagged `in_tier3_selection`; the recommended threshold in §4.2 was chosen with them present, which is mildly optimistic.
- **Ordered-list numbers.** The normaliser removes `1.` markers to a fixed point. A real browser copy of an `<ol>` often retains the numerals. Not separately modelled; the effect is small (residual furniture is zero either way) but it is a judgement call, documented in `strip_markdown.py` R3b.
- **Quarantine held.** `eval-samples.json` was never opened by this workstream. No weights, thresholds or corpora here were fitted on it.

---

## 8. Files

All in `services/local-engine/research/stripped-eval/`.

| File | What |
|---|---|
| `strip_markdown.py` | the normaliser (11 documented rules, fixed point) + `flatten_lists` sensitivity variant |
| `test_strip.py` | 32 unit cases + human no-op and residual-furniture audits — **run this first** |
| `build_stripped_set.py` | raw → `stripped-set.jsonl` + `strip-audit.json` |
| `score_rules.mjs` | shipped `packages/core` dist over any sample file (unmodified rules) |
| `score_tier3.py` / `score_tier3_fp32.py` | shipped int8 and fp32 classifier |
| `score_tier2.py` | GPT-2 surprisal + frozen head v2, with per-sample features |
| `analyze.py` | raw vs stripped, all tiers → `analysis.json`, `stripped-scores.json` |
| `ceiling.py` | cross-validated zero-FP ceiling → `ceiling.json` |
| `operating_curve.py` | FP-budget curve, per slice, per genre → `operating-curve.json` |
| `budget_analysis.py` | FP concentration + Tier 2 value under budget → `budget-analysis.json` |
| `stripped-scores.json` | **per-sample, every tier, raw and stripped** |

Reproduce end to end:

```sh
PY=/path/to/venv/bin/python
python test_strip.py && python build_stripped_set.py
node score_rules.mjs ../provider-eval/eval-set.jsonl rules-raw.jsonl
node score_rules.mjs stripped-set.jsonl rules-stripped.jsonl
$PY score_tier3.py stripped-set.jsonl tier3-stripped.jsonl
$PY score_tier3.py ../provider-eval/eval-set.jsonl tier3-raw.jsonl
$PY score_tier2.py stripped-set.jsonl tier2-stripped.jsonl
$PY analyze.py && $PY ceiling.py stripped && $PY operating_curve.py && $PY budget_analysis.py
```
