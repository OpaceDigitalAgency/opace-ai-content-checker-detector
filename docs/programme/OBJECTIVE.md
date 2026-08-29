# THE OBJECTIVE — binding target for all work (28 August 2026)

This file is the anchor. Any agent, or any future session after context loss, reads this
first alongside BRIEF.md. If work does not move these numbers, it is not the priority.

## The owner's goal, in their words

A free tool that credibly rivals GPTZero and is useful to teachers as well as marketers.

## Hard acceptance criteria

1. **50% or better detection on ALL long-form AI content**, per category, not on average:
   - blog posts and articles
   - academic essays, literature reviews, discussion sections
   - white papers and research documents
   - stories and creative long-form
   - company updates, case studies, press releases
   - marketing and SEO copy
2. **Scores must spread meaningfully.** Everything bunching near 0.85 is a failure even if
   accuracy is high. A confidence figure that cannot distinguish strong evidence from weak
   evidence is not credible and must not be shown to users. Calibration is a first-class
   requirement, not a refinement.
3. **Academic may score lower than marketing, but must stay credible** — comfortably above
   the 50% floor, not 0-5%.
4. **False positives as low as achievable.** Up to 9% is authorised, but the lowest rate that
   delivers the above is the target. Human business-marketing and academic writing are the
   classes that must not be smeared.
5. **Honesty rules from BRIEF.md section 5 remain binding.** No claim without measurement.

## Priority order (owner's explicit steer)

- HIGHEST: long-form — blog posts, essays, white papers, research docs, stories, company updates
- HIGH: marketing and SEO copy, case studies, press releases
- LOWER: short-form social posts. Writers accept AI for social and meta text, so a miss there
  costs little. Do not discard the data or the capability; deprioritise it in tuning trade-offs.
  Note for a future feature: detecting AI-run social PROFILES (bot accounts) is a genuinely
  different problem needing different signals, and is out of scope for this text checker.

## Where we were when this was written

Shipped model, measured on 4,050 current-model articles from 21 models against 169 held-out humans:

| FP budget | All AI | Marketing | Social | Academic |
|---|---|---|---|---|
| 1% | 31.0% | 67.5% | 4.1% | 0.4% |
| 3% | 56.5% | 87.1% | 44.6% | 4.8% |
| 5% | 68.2% | 92.0% | 67.0% | 11.3% |
| 9% | 71.5% | 93.7% | 72.6% | 13.9% |

"Write like a human" prompting: 34.9% caught at 3% FP, 54.2% at 9%.
Flagship models evade better (35%) than cheap ones (52%).

**The gap to close: academic writing, score spread, and holding 50%+ everywhere long-form.**

## Root cause already established (do not re-litigate)

The shipped classifier was trained on chat replies. Users paste published prose. Same model
writing a chat reply is detected 66% of the time; writing an article, 4%. Rules detect
markdown formatting, not writing: 66.7% raw collapses to 5.3% when formatting is stripped.
Cliché vocabulary rules fire on 40% of genuine human marketing copy and are obsolete.

## Standing instruction

Work autonomously. Acquire more human or AI data whenever it would help. Change weights,
signals, thresholds and training data freely. Do not stop at "better"; stop at the criteria
above being met and measured, or at a documented, evidenced explanation of why a criterion
cannot be met.

## Work log (append-only; every session adds here)

### 28 August 2026, evening — autonomous run begins
Owner logged off with instruction: work autonomously, acquire whatever data is needed, change
weights, signals and thresholds freely, do not stop until the criteria are met or a documented
evidenced explanation exists for why one cannot be. Do not ask questions. Document everything.

In flight at handover:
- **cycle2-train** — retraining the classifier on published-register data, with the binding
  targets above delivered to it. Must report the operating curve at 1/2/3/5/9% false positives,
  per register, provider, model tier and prompt style, plus the score distribution (spread is a
  pass/fail criterion, not a nicety).
- **longform-corpus** — acquiring the missing long-form and academic data, both human
  (open-access journals, student essays, white papers, long-form journalism, stories, corporate
  communications; 2010-2022, modern) and AI (current models, 800-2,000 words, prioritising the
  registers we fail and the models that evade: Grok 4.6, Claude Opus 5, Qwen3.8-max, DeepSeek V4
  Pro, flagship tiers). Up to $13 of the OpenRouter budget remains authorised.
- **human-corpus-v2** — 3,000+ modern human samples via pre-2022 bulk datasets (C4, CC-News,
  OpenWebText, modern open-access books) plus verified snapshots, tagged by difficulty
  (plausibly-confusable vs clearly-distinctive) and era year.
- **cycle2-corpus** — assembling the combined training corpus including HAT-Bench, whose
  progressively AI-edited essays match how people really use AI.

Spend to date: $61.70 of $75 authorised on OpenRouter (4,016 current-model articles, 21 models,
10 providers, ours to publish).

Key evidence documents produced so far, all under this folder:
- v0.1-REVIEW.md, PAID-TOOLS.md, v0.2-BUILD-LOG.md — audit, competitor analysis, build history
- research/REAL-WORLD-EVAL-2026-08.md — first real-world evaluation
- research/CLEAN-PROSE-DETECTION-PLAN.md — the routes to detecting clean prose
- services/local-engine/research/provider-eval/ — 1,896-sample per-provider study
- services/local-engine/research/stripped-eval/ — the finding that rules detect formatting
- services/local-engine/research/current-models/ — public current-model data inventory
- services/local-engine/research/generated-corpus/ — our own 4,016-article corpus
- services/local-engine/research/rule-validation/ — per-rule statistical validation
- services/local-engine/research/workbench/workbench.html — interactive calibration tool

### CORRECTED BASELINE — 28 August 2026, late evening (supersedes the table above)

The earlier operating curve was measured against 169 humans that were 76% encyclopaedic and
Q&A text. A representative corpus of **4,144 modern human samples** (1,233 of them business
and marketing copy) was then built, and the true picture is far worse:

| FP budget | All AI | Marketing | Blog/article | Academic | Case/press | Human biz-marketing FP |
|---|---|---|---|---|---|---|
| 1% | 13.1% | 31.1% | 12.5% | 0.0% | 6.1% | 1.0% |
| 3% | 20.5% | 48.4% | 18.6% | 0.0% | 12.0% | 4.3% |
| 5% | 24.6% | 57.4% | 21.6% | 0.0% | 17.3% | 8.0% |
| 9% | 28.7% | 63.9% | 25.1% | 0.4% | 24.2% | 16.6% |

**Median scores: human business-marketing 0.852, AI articles 0.848.**
Human marketing copy scores HIGHER than AI writing. For that genre the model is effectively
inverted. 42.7% of genuine human agency copy sits above the shipped flag threshold.

Every accuracy figure quoted before this point was an artefact of an unrepresentative human
corpus. The shipped model is not fit for purpose on real published content, and no threshold
choice rescues it. Only retraining can.

Also falsified: the `finding_breadth` escalation tells users "human controls peaked at 2
categories"; real humans reach 5, 6 and once 11, and it causes 135 of 139 rules-layer false
positives. That message must be corrected or the rule removed.

Assets this produced: **973 high-scoring human samples** are now available as cycle-2 hard
negatives, listed with scores and fired categories in tests/battery/HUMAN-CORPUS-V2.md.

### INDEPENDENT CONFIRMATION — training-corpus baseline, 28 August 2026

A second workstream built a 15,514-document published-register corpus (5,655 AI / 9,859 human,
balanced by register, group-aware splits, quarantined) and scored the shipped model against it.
Its findings match the corrected baseline and add three worse ones:

- **AUROC 0.528.** The shipped `tier3-config.json` claims 0.981. On published prose the model is
  barely distinguishable from a coin flip. That single number is cycle 2's entire justification.
- **Business reports score AUROC 0.276 — below chance.** The model ranks human reports as more
  AI-like than AI reports. It is inverted, not merely weak, on that register.
- **Partially-edited text is completely invisible: 0.0% recall on every edit band** (light edit,
  paraphrase, partial completion, style rewrite, and HAT-Bench v1 through v8). Detection only
  fires on fully generated text, and then only about one time in ten. This matters enormously
  because editing AI output is how people actually work.
- Marketing's apparent strength is not authorship signal: it has both the highest recall (16.2%)
  and the highest false-positive rate, with median AI 0.853 against median human 0.849. It scores
  all promotional writing highly regardless of who wrote it.

Corpus assets now available for cycle 2:
- `cycle2-corpus/corpus.jsonl` — 15,514 docs, published register both sides, licence-recorded
  (GRADTEX, HAT-Bench with edit trajectories, aita, MAGA, C4, PERSUADE 2.0, our own generated run)
- `tests/battery/human-corpus-v2.json` — 4,144 modern humans, 973 flagged as hard negatives
- `generated-corpus/` — 4,016 current-model articles across 21 models, ours to publish

Known gaps recorded honestly: no licence-clear human platform-social corpus (AI social has no
human counterpart); only 205 human business reports; genre labels are machine-assigned and
unvalidated; some sources read as head-of-file byte ranges rather than uniform draws.

## ✅ CRITERIA MET — cycle-2 model, 28 August 2026 (independently verified)

Retraining on published-register data succeeded. Measured on held-out data neither model saw.

| | shipped | cycle-2 |
|---|---:|---:|
| AUROC | 0.530 | **0.970** |
| Detection @1% false positives | 6.7% | **76.9%** |
| Detection @2% false positives | 9.1% | **81.2%** |

**Criterion 1 — 50%+ on every long-form category (at 2% FP): PASS**

| category | shipped | cycle-2 |
|---|---:|---:|
| company updates, case studies, press releases | 4.5% | **100%** |
| marketing and SEO copy | 35.9% | **98.0%** |
| stories and creative long-form | 0.0% | **88.8%** |
| academic essays, lit reviews, discussion | 0.0% | **79.4%** |
| blog posts and articles | 16.1% | **77.8%** |
| white papers and research documents | 0.7% | **57.8%** |

**Criterion 2 — meaningful score spread: PASS.** Bimodal, sd 0.355, only 2.2% of samples in the
0.80-0.90 band. Human median 0.036 against AI median 0.98.

**Criterion 3 — academic credible: PASS.** 0.0% → 79.4%.

**Criterion 4 — low false positives: PASS.** Orchestrator's independent check on 900 held-out
humans at threshold 0.9110: overall 2.22%; business-marketing **1.44%** (was 42.7%);
non-native English **0.00%**; academic 6.61% (highest, and the one to watch).

**Evasion axes closed:** "write like a human" prompting 5.8% → 98.2%. Pro-flagship models
10.2% → 99.5%. The owner's own three test articles (ChatGPT, Gemini 3.5-Flash, Claude Sonnet 5)
now score 98.9%, 98.7% and 98.6% — all flagged; Gemini previously scored 47%.

**Integrity note:** the training agent declined to train on human-corpus-v2 because its manifest
forbids training use, holding it entirely in test instead, and found and fixed a topic-level
leakage defect in the upstream corpus. Both decisions make these numbers trustworthy rather than
flattering.

### Remaining gaps (work continues)
1. **Light-edit AI text: still 0%.** Heavier edits now detect (paraphrase 63.6%, style-rewrite
   64.9%, HAT-Bench v6-v8 67-70%) and the score rises monotonically with AI involvement
   (Spearman 0.574), but lightly-edited AI remains invisible. This is the top remaining priority.
2. **Business reports data-starved**: only 72 held-out rows, AUROC 0.69 against 0.93-0.99
   elsewhere. Clears the floor but must not be quoted as settled.
3. **Academic false positives 6.6%** — highest of any genre; worth targeted hard negatives.
4. Model not yet integrated into the website.

### FINAL VALIDATION ON FRESH DATA — threshold revised to 0.98

The 0.9110 threshold was fitted on the training corpus. Tested against 5,558 documents the model
had NEVER seen (922 AI long-form from 13 current models, 4,636 human long-form from Europe PMC,
GOV.UK, CRS, Global Voices, Mongabay, SEC EDGAR, PERSUADE), it detected 97.8% of AI but wrongly
flagged 6.2% of humans, reaching 21-24% on academic introductions and stories. Not acceptable.

**Revised operating point: 0.98.** Measured on the same fresh data:

| register | AI detected |
|---|---|
| company updates | 99.0% |
| white papers | 98.1% |
| research summaries | 94.9% |
| academic discussion | 93.8% |
| academic literature reviews | 92.5% |
| long-form journalism | 86.1% |
| academic essays | 84.1% |
| stories | 79.8% |
| **overall** | **90.6% (835/922)** |

**Human false positives: 1.22%** across 1,800 fresh humans. Every long-form category clears the
50% floor with margin. Shipped model on the same data: 2.5%.

Residual: the story register carries the highest human false-positive rate, and the flagged
samples come from the internet-archive-cc-texts pool the corpus author independently flagged as
the least trustworthy source — likely a data-quality artefact rather than a model defect, but
unproven either way.

### THE RULES TIER IS NOW HARMFUL — measured 28 August 2026

With the cycle-2 model working, the 113-rule writing-signals tier was re-tested on the same
fresh long-form corpus (922 AI, 1,200 human):

| tier | AI detected | human false positives |
|---|---|---|
| 113 writing rules | 45.1% | **24.8%** |
| cycle-2 model | **90.6%** | **1.22%** |

The rules flag one human document in four. They are worse than the model on both axes
simultaneously, and adding them to the verdict can only make it worse. Root cause is already
documented: they detect chat-export formatting and promotional register, not authorship, and
cliché vocabulary fires on 40% of genuine human marketing copy.

**Decision: the rules tier stops contributing to the AI verdict.** It is demoted to what it is
genuinely good at — editorial suggestions ("this phrasing is generic", "these sections are
unusually uniform") — presented as writing feedback, never as evidence of authorship, and never
counted toward the AI judgement. The deterministic character forensics (invisible carriers,
homoglyphs, watermark scan, provenance) are unaffected: they remain exact, near-zero false
positive, and genuinely useful.

This is the third time the same lesson has appeared: hand-written style rules detect register
and formatting, not authorship. Only a trained model separates the two.

## 🚀 DEPLOYED AND LIVE-VERIFIED — 28 August 2026, 21:20

Site commit `bb820686`, live at the checker. Model served (34.3 MB, HTTP 200), disclosure copy
carries the browser-measured figures, rules demoted to "Writing suggestions".

Live production test, model enabled, through the real page:

| content | score | verdict |
|---|---|---|
| owner's ChatGPT article | **98.9%** | very likely AI |
| owner's Gemini 3.5-Flash article | **98.7%** | very likely AI |
| owner's Claude Sonnet 5 article | **98.4%** | flagged (sits exactly on the threshold) |
| human office memo control | 64.9% | likely human, not flagged |

All three articles previously scored 6/100 and read as "No strong AI-style signals".

**Browser-runtime calibration note:** onnxruntime-web and Python onnxruntime disagree by a median
0.113 on this quantised model because Python applies extended int8 fusions the web build does not.
The deployment agent caught this and refitted the threshold through the shipped runtime (0.984
rather than 0.98). Shipping the Python figure would have produced 3.56% real-world false positives
while the interface claimed 1.2%. Every published number is now browser-measured.

### Open items
1. **Band boundary presentation**: a score of exactly 98.4% displayed "Uncertain" while being
   flagged. Cosmetic but confusing; the band edges need to align with the flag point.
2. **Lightly-edited AI still missed** — cycle-3 work in progress.
3. Detection falls below 200 words (67% at 200, 50% at 150, 19% at 100). Short human text is not
   falsely flagged (0/400 at 60-200 words). Both facts are disclosed on the page.
4. Business reports register remains data-starved (72 held-out rows).
5. Academic carries the highest human false-positive rate of any genre.

## CYCLE-3 VERDICT — do not ship, but it corrected an important misunderstanding (28 Aug 2026)

**The "0% on lightly-edited AI" was measuring the wrong thing.** That band in the corpus
(GRADTEX `polish`) is human writing that an LLM tidied — median 93.5% of the words are the
human author's. Flagging it would mean accusing writers who use a language model on their own
prose. Not flagging it is correct behaviour, not a defect.

Measured properly, the deployed cycle-2 model already handles the case that matters:

| scenario | cycle-2 (deployed) |
|---|---|
| AI draft, then a person tidies it | **82.3%** detected |
| AI rewrite of a human original (HAT v6-v8) | 30-35% detected |
| human text an LLM polished | deliberately not flagged |

So "generate then edit", which is how most people publish AI content, was never broken.

**Cycle-3 is not shipped.** It improves AI-rewrites-of-human (30% → 46-56%) and rank correlation
with true AI share (0.58 → 0.74), but: int8 quantisation costs it 5.2 points of recall so it
cannot run in the browser at all; stories regress 79.8% → 69.3% and journalism 89.1% → 81.0%;
and paragraph-mixed documents regress badly. The trade is not worth it for a browser tool.

**Window scoring does not transfer.** Cycle-3 gains from 120-word window aggregation because it
was trained to output an AI proportion. Tested on the deployed cycle-2 model, windowing collapses
detection from 86.4% to 1.8% — short windows fall outside its training distribution. Verified
directly rather than assumed.

**Live copy corrected** (commit `ce56ac54`): the disclosure claimed lightly-edited AI is "missed
almost entirely", which was wrong and understated the tool. It now states the measured figures.

### What cycle-3 tells us to do next
1. Buy ~300 genuinely LLM-tidied AI documents for a real held-out edit set — costed at about
   $2.10, and the single most useful purchase available.
2. The saturating soft target (AI word share clamped at 0.85) is the technique that worked; a
   future cycle should combine it with a quantisation-friendly architecture.
3. Paragraph-mixed documents remain the weakest case for every model tried.
