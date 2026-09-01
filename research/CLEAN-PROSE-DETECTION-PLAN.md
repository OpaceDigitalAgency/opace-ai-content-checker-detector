# Clean-Prose Detection Plan — cracking the "human ear" into a free, local stack

> **Public research snapshot.** This first-party planning brief preserves the evidence and decisions available on its stated research date. Later model cycles supersede parts of it. Use the [current architecture](../docs/AI-CONTENT-INTEGRITY-TECHNICAL-ARCHITECTURE.md) and [research index](../docs/RESEARCH-INDEX.md) before quoting a current claim.

**Date:** 28 August 2026
**Status:** synthesis of three research angles plus one empirical prototype run on our own evaluation corpus
**Companion documents:** [`REAL-WORLD-EVAL-2026-08.md`](REAL-WORLD-EVAL-2026-08.md) (the problem in numbers); `PAID-TOOLS.md` (how the commercial tools do it) and `BRIEF.md` §5 (truthfulness boundaries that govern every number below) are internal programme records, maintained privately, not in this repository
**Scope:** detection of *clean* AI prose — the 23/30 samples our 103-rule engine scored 0–7, indistinguishable from human controls (0–4). Slop-class and carrier detection are solved elsewhere and out of scope here.
**Target:** 70%+ true-positive at low single-digit false-positive on current-model clean prose, free, local (browser or modest local machine), with no cheating and every claim benchmark-backed.

---

## 1. The honest landscape — what accuracy is actually achievable free and local

### 1.1 The one fact that shapes everything

Detector accuracy is a function of **training-data freshness, not architecture**. The ETS study (arXiv:2603.02353, March 2026) is the cleanest demonstration on record: detectors trained on GPT-4/4o/o1/o3 essays score AUC 0.34–0.61 on GPT-5 essays — chance or inverted — while the *same architecture* retrained with GPT-5 generations in the mix scores 0.97. Pangram's 99.85%/0.19% FPR (arXiv:2402.14873) is not a secret model; it is a published training loop (synthetic mirrors + iterative hard-negative mining, saturating around 40,000 examples per domain) run continuously on fresh corpora. The moat is a maintenance treadmill, and at agency scale the treadmill is affordable (§3.4).

This also explains the free-tool graveyard: every "free browser AI detector" currently shipping (zalt.me, evidano.com and kin) runs a GPT-2-era RoBERTa checkpoint. They are decorative against 2026 models. Nobody free maintains freshness — that gap is the entire opportunity.

### 1.2 The accuracy ladder by route

All figures below are published results on the benchmarks named; none transfer automatically to GPT-5.x/Claude-4.5/Gemini-3 clean prose, and nothing may be claimed for Opace until reproduced on our own versioned benchmark (BRIEF §5, §9).

| Route | What it is | Published performance | On 2026 clean prose | Weight / surface |
|---|---|---|---|---|
| Rules and stylometric thresholds (our current tier) | 103 hand rules | 100% artefact-hit on slop, 0 FP on humans | **0/23 — proven ceiling, by design** | Zero, browser |
| Existing open checkpoints (e5-small-lora, ModernBERT-raid-mage, Desklib) | Trained classifiers, ≤GPT-4-era corpora | 92–99% TPR @5% FPR on RAID | Expect substantial misses (ETS decay effect); honest label "trained on ≤2024 models" | 33–150MB, browser (WebGPU/WASM) |
| Zero-shot likelihood pairs (Binoculars, Fast-DetectGPT) | Probability-structure contrast between paired LLMs | Binoculars 79% @5% FPR on RAID; Fast-DetectGPT AUROC ~0.93; Jan-2026 Llama-3-8B pair reportedly stronger on new models | Best free signal that does not go stale, but below trained classifiers at low FPR; paraphrase-weakened | 8–10GB, desktop only |
| Cheap-feature stack over a tiny LM (DivEye, spectral, UID, PHD, compression) | Statistics of the surprisal series, embedding geometry, structure | DivEye[GPT-2] AUROC 0.961 on PAN 2025 — beating Binoculars-Llama-3.1-8B (0.918); 93.6% @5% FPR on RAID incl. adversarial | Unmeasured on GPT-5-class; the mechanism (distributional evenness) is what commercial classifiers read, so plausible transfer — must be measured | ~130MB total, browser |
| Fresh-corpus retrained classifier (Pangram recipe, ours) | ModernBERT-base/e5-small fine-tuned monthly on current-model mirrors + hard negatives | ETS analogue: 0.94–0.98 AUC on every generator incl. GPT-5 when trained fresh | **90–97% TPR @ measured 1–5% FPR in covered domains, immediately after each cycle** — decaying until refreshed | 33–150MB, browser |
| Commercial (reference point) | Server-side, closed, continuously retrained | Pangram 99.85%/0.19%; GPTZero ~94%/2% FPR; Originality 93.7%/**9.2% FPR** | Correct on the owner's GPT-5.6 article | Server upload — the thing we refuse to require |

### 1.3 Honest ceiling statement

Free and local, per fresh training cycle, in covered domains and languages: **70–90% TPR at a measured 1–5% FPR is achievable** — comfortably above the brief's floor and in GPTZero-class territory. Pangram-class 99.85%/0.19% is a multi-cycle data-curation programme, not a first release. Known permanent weaknesses to document, never hide: short texts (<150 words), out-of-domain genres, non-English, heavy human post-editing, humaniser attacks, and the decay window after each new frontier model until its generations are mirrored into training. The corroborating human datapoint: heavy LLM users detect current-model AI prose at 99.3% TPR / 0% FPR by majority vote (Russell et al., ACL 2025) — the signal exists in the text; the job is measuring it.

---

## 2. What we measured ourselves — cheap signals on our own samples

The empiricist run scored 23 clean-prose AI samples against the 4–5 human controls from `eval-samples.json` across ~20 candidate signals (scripts and per-sample metrics retained in the session scratchpad: `empiricist-signals.mjs`, `empiricist-metrics.json`, `empiricist-report.json`).

### 2.1 Signals that genuinely separate

| Signal | Effect size (Cohen's d) | TPR at zero FP | Honest caveat |
|---|---|---|---|
| **Sentence-length spectral flatness** (`slFlat`) — AI sentence-length series are less noise-like, more structured | −1.60 | 18/23 (78%) | Partially a length artefact: correlates with series length (r=−0.31) and collapses to 18% on fixed 12-sentence windows. Real but smaller than the headline; needs a window-averaged estimator |
| **Lexical register** (`syMean` 1.91 vs 1.61 syllables/word; `wlMean` +0.8 chars/word) | +1.46 / +1.48 | 74% / 70% | Genre-confounded: human controls are plain-register (Orwell, Stack Overflow); AI set is formal wiki/blog prose. Unproven as an AI signal until tested on genre-matched humans |
| **Conditional compression** (`ncdDelta`) — bits/byte given an AI-corpus prior minus a human-corpus prior, pure zlib | −1.55 | 39% | Limited today by a 2.5KB human reference corpus; the only signal that *improves by shipping a bigger reference file*, at zero runtime cost. A degenerate form of exactly what trained classifiers exploit |
| Comma density and uniformity (`commaMean` up, `commaCV` down in AI) | +0.87 / −1.82 | 57% / 26% | Supporting only; Orwell sits inside the AI range |

### 2.2 The folklore, corrected

- **"Evenness" is only half-true.** On the evenness composite, rough informal human writing (Stack Overflow answers) is extremely bursty (+6.7σ, +8.2σ) — but *polished* human prose is not: Orwell (−2.05) and the non-native writer (−1.39) are **more even than the average AI sample**. An evenness tier will wave edited human writing through. Acceptable for a "machine-pattern evidence" framing; fatal for a "human vs AI" claim.
- **"Burstiness" (sentence-length CV) underperforms** at 17% TPR — the most-quoted folk signal is one of the weakest measured.
- **Dead on this data:** sentence/word/syllable autocorrelations (no rhythm memory in either class), Heaps exponent, punctuation-profile distances, sentence-opener repetition, raw compression ratios (length-confounded).

### 2.3 The binding constraint — and the combo trap

A three-signal combo (slFlat + syMean + commaMean) scored an apparent 23/23 at zero FP — and leave-one-out cross-validation exposed it as overfitting: 22/23 TPR with **2/4 human false positives**, because each human control was itself setting the threshold. With four usable human controls, a "zero-FP" threshold has a ~60% binomial upper bound on true human FPR. **The constraint is the human corpus, not the signals.** Nothing measured here credibly meets the 70%/low-FP bar yet, and nothing should ship a threshold until the human side is 30–50 genre-matched controls (pre-2022 Wikipedia leads, formal human blog posts, professional copy). That validation run is Sprint task 1 and gates everything in Tier 1 below.

---

## 3. The recommended stack, ranked by value for effort

One architecture, four tiers, each honest about what it is. Every tier feeds a single calibrated combiner (logistic/GBM head, exportable to plain JS) rather than hand-thresholded verdicts — our own eval proves hand thresholds cannot reach clean prose without human FPs.

### 3.0 Tier 0 — this week: bank the safe rule refinements (near-zero effort)

Implement the five SAFE items from `REAL-WORLD-EVAL-2026-08.md` §4(a) (artefact-floor rule, citation-artefact escalation, artefact+score threshold, formatting-cluster corroboration, finding-breadth escalation). Verified zero new human FPs; lifts slop-class mixed-or-stronger from 1/7 to 5/7. Not clean-prose work, but it is free accuracy sitting in a document.

### 3.1 Tier 1 — immediate (2–4 weeks): stylometric evidence tier v2, measured not folkloric

**What ships:** the three surviving cheap signals — window-averaged sentence-length spectral flatness, lexical register, and conditional compression against a shipped, versioned reference corpus (grown from 2.5KB to ~100KB per genre) — plus the zero-model macro-structure geometry features (paragraph-length uniformity CV/Gini, tricolon rate, list-like sentence runs, neat-conclusion overlap via first/last-paragraph similarity, punctuation-interval Weibull fit). All pure JS/zlib, zero download, every surface including the extension tier.

**Gate before any threshold ships:** re-run `empiricist-signals.mjs` unchanged against 30–50 genre-matched human controls. If syMean/wlMean and corrected slFlat hold d≥1, calibrate; if they collapse, they were genre echoes — publish that null honestly and lean on Tiers 2–3.

**Framing:** "machine-pattern evidence", contributing continuous features and evidence-panel rows ("your paragraphs are 94% length-uniform; 11 tricolons in 40 sentences") — never a standalone AI verdict. Expected standalone: perhaps 40–60% TPR at a genuinely measured low FPR; its value is explainability and ensemble features, not headline accuracy.

**Cost:** ~2 engineer-weeks + the human-corpus assembly.

### 3.2 Tier 2 — near-term (4–8 weeks): the in-browser surprisal-rhythm engine (best value in the plan)

**What ships:** one forward pass of quantised GPT-2-small (~127MB; distilGPT2 ~60MB fallback) via transformers.js/ONNX, WebGPU with WASM fallback, feeding **four published detector families from a single surprisal series**:

1. **DivEye's 9 diversity features** (moments + first/second-order dynamics of surprisal — second-order "rhythm" features carry 39.4% of its signal): AUROC 0.88–0.97 published; DivEye[GPT-2] at 0.961 beat Binoculars-Llama-3.1-8B (0.918) on PAN 2025 — a 124M model outscoring an 8B method. Reimplement from the paper (code is CC BY-NC).
2. **Spectral/FourierGPT features** (FFT of the surprisal series; 91% accuracy on GPT-4 text with GPT-2 scoring; the best-documented paraphrase-resilient statistical signal).
3. **GPT-who UID features** (44-dim; F1 0.83–0.88 on 2023-era benchmarks).
4. **GLTR-style per-token colour overlay** — the explanation layer (raised untrained human detection from 54% to 72%).

Alongside: MiniLM-L6 (~23MB) sentence embeddings for macro-structure and information-pacing features (semantic-trajectory evenness, conclusion-restatement, per-paragraph density CV), and a cheap PHD intrinsic-dimension experiment on the same embeddings. A small trained head (LR/XGBoost, weights as JSON) combines everything with Tier 1 features and rule evidence.

**Expected accuracy, stated honestly:** published numbers are pre-2025-model benchmarks; realistic expectation on 2026 clean prose is **AUROC 0.85–0.93, roughly 70–85% TPR at a 2–5% measured FPR after calibration on our fresh corpus** — at or above the brief's target, pending our benchmark. This is the owner's "rhythm and evenness" intuition made measurable, and it is the tier that reads probability structure rather than surface style, which is why clean prompting does not erase it.

**Cost:** ~3–4 engineer-weeks (model conversion is done work in the ecosystem; features are a few hundred lines; head trains in minutes on a laptop). Total download ~130–150MB, cached once, sub-second on WebGPU.

### 3.3 Tier 3 — flagship (8–12 weeks, then monthly): the fresh-corpus classifier with the published Pangram recipe

**What ships:** ModernBERT-base (149M, Apache-2.0; int8 ~150MB / q4 ~75MB in-browser) as the headline model and e5-small (33MB) as the no-wait tier, trained by us:

1. ~40k confirmed-human documents per domain from pre-2022 commercially-licensed corpora (contamination-proof);
2. context-matched "synthetic mirrors" generated fresh across GPT-5.x, Claude, Gemini, DeepSeek, Llama at varied prompts/temperatures;
3. fine-tune, then **hard-negative mine**: scan a large human pool, harvest false positives, mirror them, retrain — 2–3 iterations. This is the documented FP-killer (Pangram: 0.25% FPR, 0% on TOEFL ESL);
4. quantise, publish to the browser with a **version stamp and a public benchmark run per release**.

**Expected accuracy:** 90–97% TPR at measured 1–5% FPR in covered domains immediately post-cycle (ETS fresh-data analogue 0.94–0.98 AUC including GPT-5). Product claim stays at the brief's band — 70%+ at low single-digit FPR — until our Index proves more.

**Cost:** generation $200–1,000 per cycle + $20–80 rented GPU fine-tuning; one engineer 4–8 weeks for the pipeline, then a largely automated **monthly refresh at ~$300–1,200 all-in**. This is the freshness treadmill nobody free operates, priced at agency scale. Interim (days, optional): ship e5-small-lora/ModernBERT-raid-mage as an explicitly labelled "legacy-model detector" while the pipeline is built.

### 3.4 Tier 4 — desktop and BYOK (parallel, low effort)

Fast-DetectGPT with the Jan-2026 Llama-3-8B pair wired into the optional local engine (quantised, ~10GB, capable machines) as a stale-proof corroborator; BYOK adapters to Copyleaks/Originality per PAID-TOOLS §6.1. Skip small-pair Binoculars in-browser: TinyLlama-pair AUROC 0.821 loses to DivEye[GPT-2] at 0.961 for 10× the download — a benchmarked, citable engineering decision.

### 3.5 How the tiers combine

Final classification = calibrated stack over rule evidence (Tier-A artefacts keep their absolute floor), Tier 1 features, Tier 2 families, and the Tier 3 logit — thresholded at operating points chosen human-FP-first, with per-genre calibration and group-adaptive thresholds (arXiv:2502.04528) to hold FPR flat for non-native and style-guided writers. Every verdict renders its evidence rows; `not_run`/`inconclusive` states per BRIEF §5.

---

## 4. The award-grade innovation story (framed honestly)

Four claims, each literally true and each structurally unavailable to competitors:

1. **First maintained, fresh-corpus AI detector that runs entirely in the browser.** Commercial tools cannot go local (their business model is server upload); academic checkpoints are abandoned at their training date; existing "private" browser tools run GPT-2-era models. A monthly-versioned model with a public benchmark per release is a first, and the freshness treadmill — the actual moat in this market — becomes our recurring citable artefact.
2. **The explanations are the detector, not a veneer.** Every commercial explanation layer is post-hoc decoration of a closed neural verdict. In our stack the evidence rows — surprisal-rhythm sparkline, paragraph-symmetry score, repeated syntactic skeletons, conditional-compression delta, GLTR overlay — *are* the features the classifier weighs. That inversion (interpretable by construction) is the thesis.
3. **The human ear, operationalised.** Russell et al. proved expert readers hit 99.3% TPR / 0% FPR on current models — the "something in the rhythm" is real. DivEye's second-order surprisal dynamics, spectral flatness, macro-structure geometry and the punctuation-Weibull experiment are that percept converted into named, reproducible measurements. Several are publishable firsts regardless of outcome: no one has published human-vs-LLM punctuation-Weibull comparisons, MiniLM-vs-RoBERTa PHD transfer, or calibrated detection numbers for syntactic-template features.
4. **Honesty as the differentiator.** Published FPR before TPR, versioned corpora, reproducible thresholds, a claims ladder, and a benchmark that holds us and every vendor to the same measured standard (the Integrity Index, BRIEF §9) — against a market of marketing numbers and a 9.2%-FPR incumbent.

The one-line story: *the evenness you can feel is now measurable — shown highlighted in your own text, without your text ever leaving your machine.*

---

## 5. Risks and anti-cheating guardrails

1. **No training on test data — quarantine the eval set now.** The 34-sample REAL-WORLD-EVAL corpus and every future Index corpus are held out permanently; combiner weights, thresholds and reference corpora are fitted only on disjoint training data. The empiricist combo result (perfect apparent, collapsed under LOOCV) is the standing exhibit of why. Document splits by hash in the benchmark repo.
2. **Human-FP-first, always.** Thresholds are chosen from the FPR side; the hard-negative loop exists to hunt our own false positives; non-native, style-guided and professional template-driven human writing get dedicated FP corpora and group-wise calibration. Orwell inside the AI evenness band and the token-cutoff trap on non-native text are the local proof that this is where reputational damage lives.
3. **Published calibration or no claim.** Every shipped threshold carries corpus version, per-genre FPR/TPR and confidence intervals; every model release re-runs the public benchmark. No accuracy statement without an Index run behind it (BRIEF §5 verbatim).
4. **Declared decay.** Detection quality is stamped with its training-cycle date and covered-model list; when a new frontier model ships, the UI says "not yet covered" rather than silently degrading. Staleness is disclosed, never discovered by users.
5. **Genre and length honesty.** Short texts (<150 words), poetry, code comments, non-English: explicit `unsupported`/`inconclusive`, never a guessed verdict. The Tier-1 genre-confound gate (§3.1) must pass before any lexical-register threshold ships.
6. **No evasion promises, ever.** The same measurements that detect also explain why hand-rewritten AI text flags; publishing that mechanism is legitimate content, promising detector evasion is banned (BRIEF §5).
7. **Licence hygiene.** Reimplement CC BY-NC methods (DivEye) from the papers; verify dataset redistribution terms before publishing corpus artefacts; prefer user-pulled weights where model licences (Llama) restrict bundling.
8. **Adversarial honesty.** Humaniser/paraphrase attacks get their own benchmark category with published (worse) numbers, plus RAID-style adversarial rows in training — not silence.

---

## 6. Next sprint — concrete task list

| # | Task | Output | Effort |
|---|---|---|---|
| 1 | **Assemble 30–50 genre-matched human controls** (pre-2022 Wikipedia leads, formal human blogs, professional UK copy) and re-run `empiricist-signals.mjs` unchanged | Go/no-go on lexical-register and spectral-flatness signals; the human-FP corpus seed | 2–3 days |
| 2 | Implement REAL-WORLD-EVAL §4(a) safe rule refinements (artefact floor, citation escalation, breadth escalation) | Slop-class mixed-or-stronger 1/7 → 5/7, zero new human FPs | 1–2 days |
| 3 | Build the window-averaged spectral-flatness estimator and the versioned compression reference corpus (~100KB/genre) | Tier 1 signals in library form with per-corpus distributions | 3–4 days |
| 4 | Port the punctuation-Weibull experiment to the eval corpus ("Do language models breathe?") | First published human-vs-LLM β comparison — publishable either way | 1 day |
| 5 | Stand up GPT-2-small in transformers.js (WebGPU + WASM fallback) and port the DivEye 9-feature extractor | Working surprisal pipeline, per-sample features on our corpus | 1 week |
| 6 | Add FourierGPT spectral + UID features + GLTR overlay to the same pass; train the first LR/XGB head on public corpora (RAID/MAGE/HC3 splits) — **never on our eval set** | Tier 2 v0 with honest AUROC on held-out data | 1 week |
| 7 | Design the training-data pipeline for Tier 3: corpus sources, mirror-prompt templates, generation budget, hard-negative loop spec | Costed pipeline document; first $200 generation run | 3–4 days |
| 8 | Benchmark harness v1: versioned corpora, split hashes, FPR-first reporting, per-genre breakdown — the Integrity Index skeleton | Reproducible `bench run` producing the numbers every claim will cite | 1 week |
| 9 | (Optional, parallel) Convert e5-small-lora ONNX to the browser as the labelled "legacy-model detector" demo tier | Working end-to-end browser classifier while Tier 3 trains | 2–3 days |
| 10 | Email OTH Regensburg (DeBERTa-ConPara-v2.17, current RAID leader, no public weights) re collaboration/weights | Possible shortcut to a stronger base model | 30 min |

Sequencing: tasks 1–4 are this week and unblock Tier 1; 5–6 are the fortnight after and deliver the first measurable clean-prose detector; 7–8 start in parallel and carry the flagship. Nothing ships a user-facing accuracy claim until task 8's harness has produced it.
