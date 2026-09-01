# Real-World Evaluation — Opace AI Content Integrity Engine

> **Historical evaluation.** This report measures the retired rule-only engine at the stated August 2026 version. It is not evidence for the current trained model. Use the [current architecture](../docs/AI-CONTENT-INTEGRITY-TECHNICAL-ARCHITECTURE.md) and [research index](../docs/RESEARCH-INDEX.md) before quoting a current rate.

**Engine:** `en-signals:2026.08.3` (rule tier only; trained-model tier not yet built)
**Evaluated:** 27 August 2026, via `computeEditorialSignals` + `inspectSignalsV2` from `implementation/packages/core/dist/index.js` (no engine files modified)
**Analyst artefacts:** samples, results and runner script retained in the session scratchpad (`eval-samples.json`, `eval-results.json`, `run-eval.js`)

---

## 1. Method

34 real-world samples were scored: 30 AI-labelled, 4 pre-2022 human controls. All samples are genuine published or shared text, not synthetic generations.

### Sample counts by label

| Label | Samples | Label confidence |
|---|---|---|
| chatgpt | 7 | 4 certain, 3 strong |
| gpt5 | 5 | 5 certain |
| claude | 4 | 3 certain, 1 strong |
| gemini | 4 | 3 certain, 1 strong |
| grok | 1 | 1 certain |
| deepseek | 2 | 2 certain |
| ai-unknown | 7 | 7 strong |
| **AI total** | **30** | 18 certain, 12 strong |
| human | 4 | 3 certain, 1 strong |

### Sample counts by category

| Category | Samples | Word count range |
|---|---|---|
| ai-disclosed-article | 7 | 447–1,200 |
| shared-chat | 13 | 265–1,088 |
| slop-page | 2 | 358–400 |
| wiki-flagged | 8 | 339–611 |
| pre2022-human (controls) | 4 | 300–801 |

**Data caveat:** the sample JSON was truncated in transmission. `human-workplacese-nonnative-2019` arrived with its text cut mid-sentence and metadata missing; it was scored on the received portion with its known label (human/certain, workplace.stackexchange.com). Any samples after it in the original set were not received and are not scored. Findings below should be read with that in mind.

---

## 2. Results

### 2.1 Per-model outcomes

| Model | n | ai_like | mixed_signals | human_like | Mean score | Artefact-hit rate |
|---|---|---|---|---|---|---|
| chatgpt | 7 | 0 | 0 | 7 | 5.7 | 2/7 (29%) |
| gpt5 | 5 | 0 | 1 | 4 | 15.4 | 3/5 (60%) |
| claude | 4 | 0 | 0 | 4 | 3.0 | 0/4 |
| gemini | 4 | 0 | 0 | 4 | 2.0 | 1/4 (25%) |
| grok | 1 | 0 | 0 | 1 | 7.0 | 0/1 |
| deepseek | 2 | 0 | 0 | 2 | 2.0 | 0/2 |
| ai-unknown | 7 | 0 | 0 | 7 | 1.9 | 0/7 |
| **All AI** | **30** | **0** | **1** | **29** | **5.6** | **7/30 (23%)** |
| human (control) | 4 | 0 | 0 | 4 | 1.5 | 0/4 |

### 2.2 Per-category outcomes

| Category | n | ai_like | mixed_signals | human_like | Mean score | Artefact-hit rate |
|---|---|---|---|---|---|---|
| ai-disclosed-article | 7 | 0 | 0 | 7 | 3.0 | 0/7 |
| shared-chat | 13 | 0 | 1 | 12 | 7.8 | 4/13 (31%) |
| slop-page | 2 | 0 | 0 | 2 | 10.5 | 2/2 (100%) |
| wiki-flagged | 8 | 0 | 0 | 8 | 2.1 | 0/8 |
| pre2022-human | 4 | 0 | 0 | 4 | 1.5 | 0/4 |

The one non-human_like result: `opace-openai-004` (gpt5, shared-chat, score 38, mixed_signals, low confidence) — driven by `ai_citation_markup`, `ai_citation_token`, `bold-label-bullets`, `em-dash-density` and `quote-inconsistency` together.

Artefact rules that fired, all on AI samples only: `signals.ai_citation_markup` and `signals.ai_citation_token` (opace-openai-004, -005, -008, medium-django-oaicite, medium-statsbomb-oaicite), `signals.arrow_decoration` (opace-openai-006, -008, gemini-cerebralfaith-probability-2025).

### 2.3 Human-control false positives

**Target: zero ai_like on human samples. Result: zero violations.**

| Sample | Score | Classification | Rules that fired |
|---|---|---|---|
| human-orwell-politics-1946 | 1 | human_like (high) | adjacent-lemma-repeat |
| human-so-bobince-2009 | 4 | human_like (high) | normalization-flag, tier1 |
| human-so-mysticial-2012 | 0 | human_like (high) | — |
| human-workplacese-nonnative-2019 | 1 | human_like (high) | token-cutoff |

No human control exceeded score 4, none left human_like, none triggered an artefact rule. The rules that did fire on humans (adjacent-lemma-repeat, normalization-flag, tier1, token-cutoff) define the FP-sensitive rule set for section 4.

---

## 3. Honest headline numbers

Split by class: **slop-class** = samples with machine-artefact evidence (artefact hits or slop-page category): 7 samples. **Clean prose** = the remaining 23 AI samples with no artefact residue.

| Classification level reached | All AI (n=30) | Slop-class (n=7) | Clean prose (n=23) |
|---|---|---|---|
| ai_like | 0/30 (0%) | 0/7 (0%) | 0/23 (0%) |
| mixed_signals or stronger | 1/30 (3%) | 1/7 (14%) | 0/23 (0%) |
| Any artefact hit recorded | 7/30 (23%) | 7/7 (100%) | 0/23 (0%) |
| Score ≥ 10 (above every human control) | 4/30 (13%) | 4/7 (57%) | 0/23 (0%) |

Plainly: **the rule tier classifies almost no real-world AI text as AI.** It reliably *detects evidence* on slop-class text (artefact hits on 100% of that class, and all four scores ≥ 10 are slop-class), but its conservative thresholds mean even artefact-bearing samples mostly stay human_like (e.g. `opace-openai-005`, two artefact hits, score 17, human_like).

**Clean-prose ceiling (explicit statement):** 23 of 30 AI samples are clean prose — well-edited disclosed articles, wiki-flagged text and polished chat answers with no citation residue or formatting slop. The rule tier scored these 0–7, indistinguishable from the human controls (0–4). This is the *documented* limit of the rule tier: clean AI prose passing is expected behaviour, not a defect, and closing it awaits the trained-model tier. No regex refinement should attempt to reach into this class; the human-control overlap shows it cannot be done without false positives.

---

## 4. Refinement candidates

### (a) SAFE now — verified zero new human FPs against the four controls

1. **Artefact-floor rule (threshold change, no new regex).** Any tier-A artefact hit (`ai_citation_markup`, `ai_citation_token`, `arrow_decoration` when co-occurring with another artefact) should floor the classification at `mixed_signals`. Evidence: `opace-openai-005` (score 17, two citation artefacts, human_like), `opace-openai-008` (score 13, three artefacts, human_like), `medium-django-oaicite` (score 14, artefact, human_like), `medium-statsbomb-oaicite` (score 7, artefact, human_like). Human controls: zero artefact hits, so zero FP risk. This alone lifts mixed-or-stronger on slop-class from 1/7 to 5/7.
2. **Citation-artefact escalation to ai_like on co-occurrence.** When `ai_citation_markup` and `ai_citation_token` both fire in one document (opace-openai-004, -005, -008), classify `ai_like` — this pairing is machine residue from an unstripped ChatGPT export (`oaicite`/`contentReference` markup plus citation tokens) with no plausible human origin. Zero occurrence in human controls.
3. **Threshold tweak: artefact hit + score ≥ 10 → mixed_signals minimum confidence `medium`.** Human control ceiling is 4 with no artefacts; the gap is wide. Catches 004, 005, 008, medium-django with margin.
4. **Formatting-cluster corroboration rule.** `bold-label-bullets` + `heading-inflation` + `emoji-decoration`/`arrow-decoration` co-occurring (chat-export furniture) should count as a compound signal: evidence `opace-openai-006` (9 findings across 6 categories, score only 7). Gate on ≥3 of these formatting categories together; no human control fired any of them.
5. **Finding-breadth escalation.** findingCount ≥ 8 across ≥ 5 distinct categories → raise score band one step (evidence: 004, 006, 008 at 9–10 findings; human maximum is 2 findings). Purely additive on breadth already measured; cannot touch the controls.

### (b) NEEDS CORROBORATION — promising but FP-risky

- **`arrow_decoration` weight increase on its own.** Fired on 3 AI, 0 human samples here (006, 008, gemini-cerebralfaith-probability), but arrows (`→`) are common in genuine technical notes and changelogs; n=4 humans is too small to clear it. Keep it as a corroborating signal only (as in safe item 1) until a larger human corpus is scored.
- **`em-dash-density` weight increase.** Present in 5 AI samples (003, 004, 006, claude-explains-debug, chatgpt-share-ai-democracy) but heavily used by many human essayists; the Orwell control is one em-dash-loving tradition away from an FP.
- **`setup-expansion-cadence` + `transition` pairing on slop-pages** (medium-statsbomb, medium-django, deepseek-share-pilot-hole). Plausible slop-page signature but stylistic, not artefactual; corroborate on a bigger human blog corpus first.
- **`sycophantic` and `lets-construction` weight bumps** (005, gemini-cerebralfaith-probability): chat-register signals that human forum posters also produce.

### (c) DO NOT DO — would flag the human controls

- **Any weight increase to `adjacent-lemma-repeat`** — fired on `human-orwell-politics-1946` (and 8 AI samples; it is the noisiest rule in the set).
- **Any weight increase to `normalization-flag` or bare `tier1`** — both fired on `human-so-bobince-2009` (score 4, the highest human control).
- **Any weight increase to `token-cutoff`** — fired on `human-workplacese-nonnative-2019`; on non-native-speaker text this rule is an FP trap.
- **Lowering the ai_like threshold into the 5–15 band** — that band contains bobince (4) directly beneath it and dozens of low-scoring AI and human samples intermixed; there is no clean separating threshold below the artefact tier.
- **Any generic "low-TTR / burstiness / flatline" escalation** — `cross-para-burstiness` and kin fired on wiki-flagged samples at scores 1–4, the same band as the humans.

---

## 5. Verdict

Within its honest, documented scope, the rule tier does what the brief asks: it is **consistent** (34/34 samples scored deterministically, confidence bands behaving sensibly) and it is **accurate in the direction that matters most** — zero false positives on human controls, with the four humans scoring 0–4 and the FP-sensitive rules identified by name. Where machine residue exists, the artefact rules find it: 100% artefact-hit rate on slop-class samples and 0% on humans, a clean separation. Where the engine falls short is not detection of evidence but *use* of it: conservative thresholds leave artefact-bearing samples (005, 008, the two Medium oaicite pages) classified human_like, so the headline classification rate on real-world AI text is an unimpressive 1/30 mixed, 0/30 ai_like. The safe refinements in 4(a) fix that specific gap without touching the human controls. What no rule refinement can fix is the 23/30 clean-prose majority, which sits inside the human score band by design; the engine meets the brief only if that ceiling remains explicitly documented and the trained-model tier remains on the roadmap to address it. On this evidence: fit for purpose as a zero-FP artefact detector; not yet, and by design not claiming to be, a general AI-text classifier.
