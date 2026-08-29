# Provider-scale evaluation - 2026-08 (Workstream PP)

Per-provider, per-era measurement of the shipped detection stack, statistical tests of the owner's style hypotheses, and calibration recommendations. All numbers are measured, not projected. Nothing in this report was tuned on the quarantined eval-samples.json (never read by this workstream).

## 1. Data

Measurement set: `provider-eval/eval-set.jsonl`, 1,896 samples (1,727 AI + 169 human). Per-sample scores in `provider-scores.json`; aggregates in `analysis.json`. Built by `build_eval_set.py`, seed 20260828.

AI side (cap 150 per provider x era, English, non-code, answer-style, 120-700 words, mostly-ASCII):

| Slice | n | Models | Source |
|---|---|---|---|
| openai 2022-23 | 150 | gpt-3.5 ChatGPT (Dec 2022) | HC3 chatgpt answers |
| openai 2024-25 | 77 | gpt-4o-mini-2024-07-18, gpt-4o-2024-11-20 | arena-140k shards 0-1 |
| openai 2025-26 | 150 | o3, o4-mini, o3-mini, gpt-4.1(-mini), chatgpt-4o-latest-20250326 | arena-140k |
| anthropic 2024-25 | 150 | claude-3-5-sonnet-20241022, claude-3-5-haiku-20241022 | arena-140k |
| anthropic 2025-26 | 150 | claude-3-7-sonnet(±thinking), claude-opus-4, claude-sonnet-4 | arena-140k |
| google 2024-25 | 150 | gemini-2.0-flash-001, gemini-2.0-flash-thinking-exp | arena-140k |
| google 2025-26 | 150 | gemini-2.5-pro/flash/flash-lite | arena-140k |
| meta 2024-25 | 150 | llama-3.3-70b-instruct | arena-140k |
| meta 2025-26 | 150 | llama-4-maverick/scout | arena-140k |
| deepseek 2025-26 | 150 | deepseek-r1-0528, deepseek-v3-0324 | arena-140k |
| grok 2025-26 | 150 | grok-3-preview/mini, grok-4-0709 | arena-140k |
| mistral 2025-26 | 150 | mistral-medium-2505, mistral-small-3.1/2506, magistral-medium | arena-140k |

Arena source: lmarena-ai/arena-human-preference-140k (CC BY 4.0); shard 1 (train-00001-of-00007.parquet) downloaded 2026-08-28 via the research venv to top up thin slices. Both assistant responses per battle are used.

Human side (n=169): 129 corpus.jsonl humans restricted to the **cal and test partitions only** (wikitext-103 + HC3-human; the train partition is the ML workstream's training data and is excluded) + all 40 fresh humans from `tests/battery/human-corpus-v1.json` (10 business-marketing, 8 blog-editorial, 6 technical, 6 journalism, 4 casual, 4 non-native, 2 academic).

Leakage and overlap controls:
- Any candidate whose sha256 equals a corpus **train**-split sha256 is dropped (tier2/tier3 trained on those). Kept samples carry `corpus_split` where they match cal/test rows.
- 20 of the 40 fresh humans (the `fresh_cal` ids in `eval/final-operating-point.json`) were used to SELECT the shipped tier3 threshold 0.857; they are flagged `in_tier3_selection` and the tier3 FP numbers below call this out where it matters.
- The quarantined eval-samples.json was not read.

Honest gaps:
- openai 2024-25 capped at 77, not 100+: gpt-4o-era models are nearly absent from these arena shards (134 eligible battles across two shards). Availability-limited, documented, not padded.
- No 2026 frontier outputs (arena shards end 2025-07), no claude-2/gemini-1-era text anywhere public and licensed here, so "older model" evidence for non-OpenAI providers is absent; HC3 covers only OpenAI's 2022-23 era.
- All arena text is **chat register with markdown furniture** (bullets, `**bold**`, headings). The human corpus is prose. Signals that key on markdown furniture will not transfer to AI text that has been pasted through an editor that strips or renders formatting - flagged on every affected recommendation below.
- Engine bug found in passing: `inspectSignalsV2` throws `RangeError("split_surrogate")` on 2/1,896 samples (emoji-bearing texts; finding span lands inside a surrogate pair). `computeEditorialSignals` does not throw. Logged for the patterns workstream (spawned task).

## 2. Task 1 - shipped stack, measured per provider x era

Rules = packages/core dist `computeEditorialSignals` (en-signals:2026.08.5, rhythm tier + escalation policy). Tier 3 = shipped `tier3-e5small-int8-perchannel.onnx`, tokenizer from tier3/checkpoint, max_len 512, flag threshold 0.857.

| Slice | n | Rules mean score | human/mixed/ai | % mixed-or-above | % score>=10 | % any escalation | Tier3 mean p | Tier3 flag % @0.857 |
|---|---|---|---|---|---|---|---|---|
| openai 2022-23 | 150 | 2.65 | 150/0/0 | 0.0 | 0.7 | 0.0 | 0.663 | 0.0 |
| openai 2024-25 | 77 | 5.65 | 63/14/0 | 18.2 | 14.3 | 18.2 | 0.803 | 3.9 |
| openai 2025-26 | 150 | 6.06 | 134/15/1 | 10.7 | 16.0 | 10.0 | 0.823 | 8.0 |
| anthropic 2024-25 | 150 | 5.27 | 143/6/1 | 4.7 | 14.0 | 4.0 | 0.723 | 2.7 |
| anthropic 2025-26 | 150 | 4.24 | 146/4/0 | 2.7 | 6.7 | 1.3 | 0.722 | 5.3 |
| google 2024-25 | 150 | 4.83 | 140/10/0 | 6.7 | 5.3 | 6.7 | 0.773 | 9.3 |
| google 2025-26 | 150 | 4.87 | 133/16/1 | 11.3 | 6.0 | 10.0 | 0.771 | 13.3 |
| meta 2024-25 | 150 | 4.81 | 137/13/0 | 8.7 | 6.7 | 8.7 | 0.768 | 0.0 |
| meta 2025-26 | 150 | 4.95 | 131/19/0 | 12.7 | 6.0 | 12.0 | 0.797 | 6.7 |
| deepseek 2025-26 | 150 | 6.09 | 124/26/0 | 17.3 | 13.3 | 16.7 | 0.823 | 7.3 |
| grok 2025-26 | 150 | 4.59 | 139/9/2 | 7.3 | 6.0 | 7.3 | 0.779 | 6.7 |
| mistral 2025-26 | 150 | 6.38 | 121/27/2 | 19.3 | 20.7 | 18.0 | 0.829 | 1.3 |
| **human all** | 169 | 1.37 | 169/0/0 | **0.0** | 0.0 | 0.0 | 0.226 | **0.0** |
| human business-marketing | 10 | 2.40 | 10/0/0 | 0.0 | 0.0 | 0.0 | 0.613 | 0.0 |

Escalation mix (AI side, 1,727 samples): finding_breadth 126, artefact_score 14, artefact_floor 11, formatting_cluster 5. `% score>=25` is 0.0-0.7 everywhere.

Plain reading:
- **The rules stack holds its zero-FP promise (0/169 humans above human_like) but detects only 0-19% of conversational AI per slice.** Its strongest slices are mistral (19.3%), openai 2024-25 (18.2%), deepseek (17.3%); its weakest are early ChatGPT (0.0%) and modern Claude (2.7%).
- **The shipped tier3 threshold 0.857 collapses the classifier.** Mean AI probability is 0.72-0.83, but the int8 model's scores saturate just below the threshold (AI median 0.854, max 0.858; human max 0.8564). Flag rates are 0-13.3% despite the underlying model separating well: at threshold 0.80 the same model yields 59-93% TPR per slice at 7/169 human FPs (4.1%, 5 of them business-marketing). The knife-edge is measured directly: overall AI TPR is 75.7% at 0.83, 62.5% at 0.85, 33.7% at 0.8555, and 6.4% at 0.857. This is a score-saturation/calibration problem, not a threshold-tuning problem - see §4.3.
- Top-firing rule categories per slice are dominated by `formatting` (65-95% of samples on every 2024+ slice except anthropic 2024-25 at 9.3%) and `bold-label-bullets`, yet almost none of it converts into classification: the formatting_cluster escalation needs >=3 distinct furniture categories and fired only 5 times in 1,727. On humans, `formatting` fired 0/169.
- openai 2022-23 (HC3 gpt-3.5) is invisible to both tiers as shipped: rules 0%, tier3 0% at 0.857 (mean p 0.663; 59% would flag at 0.80). Its only strong rule signature is `sentence-flatline` (31.3% vs 2.4% of humans).

## 3. Task 2 - the owner's hypotheses, tested

Human reference (n=169; biz = 10 business-marketing humans). Effect sizes are Cliff's delta of provider-vs-human distributions (|d|>=0.33 medium, >=0.474 large).

### 3.1 "Claude overuses em dashes" - REFUTED (in this register); the em-dash provider is GPT, then Grok

Em dashes (U+2014) per 1,000 words:

| Group | mean | median | p90 | max | delta vs human |
|---|---|---|---|---|---|
| human all | 0.462 | 0.0 | 1.619 | 10.072 | - |
| human business-marketing | 2.540 | 2.035 | 5.642 | 10.072 | - |
| anthropic 2024-25 | 0.034 | 0.0 | 0.0 | 5.051 | -0.100 |
| anthropic 2025-26 | 0.386 | 0.0 | 0.0 | 19.108 | -0.063 |
| openai 2025-26 | **4.537** | **2.218** | 12.766 | 24.390 | **+0.451** |
| grok 2025-26 | 3.395 | 0.0 | 11.444 | 26.178 | +0.378 |
| deepseek 2025-26 | 2.715 (provider mean) | - | - | - | +0.191 |
| mistral 2025-26 | 2.408 (provider mean) | - | - | - | +0.205 |
| google 2025-26 | 0.125 | 0.0 | 0.0 | 6.299 | -0.079 |
| openai 2022-23 | 0.000 | 0.0 | 0.0 | 0.0 | -0.107 |

Claude's arena median is zero em dashes; it uses FEWER than the human corpus. GPT-2025 is the heaviest user (medium effect), with Grok second. Crucially, human marketing copy averages 2.54/1000 with a max of 10.07/1000 - almost exactly the GPT mean - so em-dash exploitation has a direct FP cost on the audience we weight hardest. The existing `em-dash-density` rule already fires on 9.5% of humans (noisiest human-firing rule after adjacent-lemma-repeat and tier1-clarity). Do not raise its weight. Caveat: this is chat register; the owner's impression may come from Claude long-form prose, which this corpus cannot test.

### 3.2 "Claude has a distinctive rhythm" - SUPPORTED, but the signature is not what the current rules reward

Claude does separate from humans on rhythm-family metrics: shortSentShare delta +0.575, fragmentShare +0.484, registerFuncL1 +0.491, and uniquely the LOWEST spectral flatness of any provider (0.462 vs human 0.602, delta -0.501 - large). Claude 2024-25's most distinctive surface habit in this data is plain-bullet lists without bold labels (bullet-np-list 16%, chatbot phrasing 33.3%) - which is why it evades the formatting-cluster signals that catch everyone else (rules mixed-or-above: 4.7%/2.7%, the two worst modern slices). A Claude-shaped catch needs the spectral-flatness/register channel, not em dashes.

### 3.3 "Gemini is short, choppy, never fluid" - PARTLY SUPPORTED, but it is not the choppiest

Gemini 2025: shortSentShare 0.281 vs human 0.111 (delta +0.613, large), fragmentShare 0.150 vs 0.056 (+0.545). Choppiness confirmed versus humans. But deepseek (0.417/0.240, deltas +0.840/+0.762) and mistral (+0.681/+0.660) are choppier; "sentence CV is low/flat" is NOT supported (Gemini sentCv 0.611 vs human 0.542 - more varied, because fragments + long bullets widen the spread). Gemini's single most extreme marker is markdown bold: boldPer1000 delta +0.923 (google 2025), the second-highest after deepseek (+0.993). Fragment/short-sentence thresholds carry human FP cost: biz humans are themselves choppy (shortSentShare 0.276, fragmentShare 0.138), so the zero-FP thresholds sit at 0.902/0.804 and yield <=2.7% TPR (§4.2).

### 3.4 "GPT is the most fluent / hardest" - SUPPORTED for rhythm, with two qualifications

Modern GPT has the smallest rhythm deltas of any 2025 provider (shortSentShare +0.257, fragmentShare +0.299 vs 0.45-0.84 elsewhere) - closest to human sentence flow. Qualifications: (1) the rules stack still reaches 10.7-18.2% on GPT because GPT carries heavy furniture and em dashes (compressionGain delta -0.530 also separates it); (2) the genuinely hardest slice for the SHIPPED stack is not modern GPT but gpt-3.5/HC3 (0.0% rules, 0.0% tier3) and modern Claude (2.7-4.7% rules) - fluency and evasion are not the same thing.

## 4. Task 3 - calibration recommendations

Rule-file changes are the patterns workstream's to apply; everything below is a measured recommendation. FP costs are counted on all 169 held-out humans (and the 10 business-marketing humans separately). "Zero-FP" means 0/169 on this corpus, which bounds the FP rate at roughly <2.2% (95% CI, rule of three), not zero forever.

### 4.1 Zero-FP changes (0/169 human FPs measured, 0 business-marketing FPs)

R1. **Escalate on the `formatting` category alone (floor at mixed_signals).** `signals.formatting` fired on 0/169 humans and on 9.3-94.7% of AI per slice. Current setting: formatting_cluster escalation requires >=3 distinct furniture categories (fired 5/1,727). Recommended: `formatting` >=1 finding => floor mixed_signals. Measured TPR (= new mixed-or-above floor): deepseek 94.7, mistral 90.7, google-25 88.0, meta-25 84.0, google-24 82.7, openai-24 77.9, meta-24 69.3, openai-25 68.7, grok 65.3, anthropic-25 50.0, anthropic-24 9.3, openai-22 0.0. Caveat: markdown-furniture signal; will not survive format-stripped paste. Conservative variant (R1b: `formatting` + >=1 of bold-label-bullets/heading-inflation/uniform-list-items/uniform-sections/bullet-np-list) is also 0/169-FP with TPR 8.0-72.7.

R2. **Lower the finding-breadth escalation from (>=8 findings & >=5 categories) to (>=6 & >=4).** Human max was 2 findings in the original evaluation; on these 169 humans the relaxed gate fires 0 times. Measured mixed-or-above gain (current -> new floor): deepseek 17.3 -> 33.3, mistral 19.3 -> 33.3, meta-25 12.7 -> 31.3, openai-24 18.2 -> 27.3, google-24 6.7 -> 27.3, openai-25 10.7 -> 24.7, grok 7.3 -> 22.7, google-25 11.3 -> 23.3, anthropic 4.7/2.7 -> 4.7/8.0, openai-22 0.0 -> 0.0. Register-robust (no furniture dependence).

R3. **New rule: markdown bold density.** `**bold**` runs occur in 0/169 humans; any bold at all detects 15.3-99.3% per slice (anthropic-24 15.3, anthropic-25 64.7, deepseek 99.3, google-25 95.3, mistral 94.7, openai-25 84.0, openai-22 0.0). Same paste-stripping caveat as R1; recommend weighting it as artefact-class evidence (chat-export residue), which is exactly the escalation philosophy already documented.

R4. **New rule: markdown heading density.** Headings occur in 0/169 humans; any heading detects grok 68.0, mistral 67.3, deepseek 64.7, openai-25 52.7, openai-24 48.1, meta-25 28.0, google-25 18.0, anthropic-25 15.3. Same caveat.

R5. **Combined furniture gate (any bold OR any heading OR bullets > 10.75/1000).** 0/169 human FPs; TPR per slice: deepseek 99.3, google-25 96.0, meta-25 96.0, openai-25 95.3, mistral 94.7, openai-24 92.2, google-24 90.0, grok 86.7, meta-24 82.7, anthropic-24 78.0, anthropic-25 74.7, openai-22 0.0. This is the single biggest zero-FP lever available to the rules tier on chat-register text.

Also zero-FP but small: em-dash rate > 10.07/1000 (the human max) yields openai-25 18.0, grok 12.0, deepseek 10.7, mistral 8.7, all others <=1.3 - worth having as a capped artefact-style rule, but it is a GPT/Grok signal, not a Claude signal.

### 4.2 Risk-tiered (nonzero measured human FP - do NOT ship without an owner decision)

| Change | Human FP (169) | biz FP (10) | Headline TPR gain |
|---|---|---|---|
| tier3 threshold 0.857 -> 0.8555 | 1 (0.6%; a biz human that was IN the threshold-selection set) | 1 | overall 6.4% -> 33.7% |
| tier3 threshold 0.857 -> 0.85 | 4 (2.4%) | 3 | -> 62.5% |
| tier3 threshold 0.857 -> 0.80 | 7 (4.1%) | 5 | -> 75.7% (59-93 per slice) |
| em-dash > 6.59/1000 (human p99) | 2 (1.2%) | 1 | openai-25 31.3, grok 18.0, deepseek 16.0 |
| fragmentShare > 0.319 (human p99) | 2 (1.2%) | 0 | openai-25 33.3, anthropic-24 32.0, deepseek 26.7 |
| shortSentShare > 0.535 (human p99) | 2 (1.2%) | 1 | anthropic-24 44.0, openai-25 21.3, deepseek 20.7 |
| sentence-flatline & >=3 findings => mixed | 1 (0.6%, qa-finance) | 0 | openai-24 10.4, openai-22 8.0, meta-24 8.0 |

### 4.3 Tier 3: the real fix is recalibration, not a threshold nudge

The shipped int8 per-channel model's output distribution is pathological at the operating point: human max 0.8564, AI median 0.8539, threshold 0.857. Sub-0.001 score noise flips thousands of verdicts. Recommendations for the ML workstream:
1. Spread the scores (temperature scaling on the logits, calibrated on the cal partition, or ship fp32/fp16 ONNX - the fp32 reconciliation already exists in `eval/onnx-reconciliation.json`).
2. Retrain cycle 2 with the manifest below; the dominant FP source is business-marketing prose (biz human tier3 mean 0.613 vs 0.226 all-human), so biz-register human negatives are the binding constraint on any threshold below 0.857.
3. Until then, treat 0.857 as a near-zero-recall setting and let the rules escalations carry detection.

Note the optimism bias: tier3 was trained on the same arena distribution (different samples, exact train texts excluded here), so 59-93% TPR at 0.80 is an in-distribution number; the HC3 slice (out of training distribution) drops to 59% at 0.80 and 0% at 0.857.

### 4.4 Cycle-2 training-data manifest (classifier)

Priority order, all available now from sources already local or one shard-download away:

| Slice | Add (train/cal/test) | Why |
|---|---|---|
| human business-marketing (fresh press releases, product pages, agency copy - NOT the 40 battery humans, which stay held out) | 300 (210/45/45) | Binding FP constraint; current biz mean p 0.613 |
| openai 2022-23 (HC3 chatgpt, unused pool ~7,300) | 300 (210/45/45) | 0% detection at shipped threshold; era coverage |
| anthropic 2024-25 + 2025-26 (arena pools 1,362/4,382) | 300 (210/45/45) | Weakest modern rules slice; tier3 mean lowest of 2025 providers (0.722) |
| meta 2024-25 (pool 507) | 150 (105/22/23) | 0% tier3 flags at 0.857 |
| grok/deepseek/mistral 2025-26 (pools 1,583/1,259/1,600) | 150 each | Round out provider balance |
| google 2024-25 + 2025-26 (pools 719/3,332) | 150 each | Maintain balance; already best-flagged |
| format-stripped variants of 30% of all AI slices (markdown removed) | derived | Break the furniture shortcut so tier3 survives editor paste |

Everything sampled with the existing sha-mod-10 split rule and 8-gram quarantine screen against eval-samples.json at build time (as corpus/build_corpus.py already does).

## 5. Summary tables

Current detection (shipped, honest): rules mixed-or-above / tier3 flag % at 0.857:

| Provider | 2022-23 | 2024-25 | 2025-26 |
|---|---|---|---|
| openai | 0.0 / 0.0 | 18.2 / 3.9 | 10.7 / 8.0 |
| anthropic | - | 4.7 / 2.7 | 2.7 / 5.3 |
| google | - | 6.7 / 9.3 | 11.3 / 13.3 |
| meta | - | 8.7 / 0.0 | 12.7 / 6.7 |
| deepseek | - | - | 17.3 / 7.3 |
| grok | - | - | 7.3 / 6.7 |
| mistral | - | - | 19.3 / 1.3 |
| human FP | 0.0 / 0.0 | | |

Hypotheses: Claude-em-dash REFUTED (GPT/Grok own the em dash; biz humans average 2.54/1000). Claude-rhythm SUPPORTED (lowest spectral flatness, delta -0.501; but current rules catch it worst of all providers). Gemini-choppy PARTLY SUPPORTED (large fragment/short-sentence effects, but deepseek/mistral are choppier and Gemini's defining marker is markdown bold). GPT-most-fluent SUPPORTED on rhythm metrics, though gpt-3.5-era text is the stack's true blind spot.

Top 5 zero-FP calibration changes (measured 0/169 human FPs, 0 biz FPs): R5 combined furniture gate (74.7-99.3% TPR on all modern slices), R1 formatting-category floor (50-95% on non-Claude modern), R3 bold-density artefact rule (64.7-99.3% modern), R2 finding-breadth 6&4 (22.7-33.3% register-robust), R4 heading-density rule (15.3-68.0%). All furniture-based ones carry the paste-stripping caveat; R2 is the safest register-robust gain.

Files: `build_eval_set.py`, `score_rules.mjs`, `score_tier3.py`, `analyze.py`, `eval-set.jsonl`, `rules-scores.jsonl`, `tier3-scores.jsonl`, `analysis.json`, `provider-scores.json` (all in this directory).
