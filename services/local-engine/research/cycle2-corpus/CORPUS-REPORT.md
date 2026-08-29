# Cycle-2 corpus report

Built 2026-08-28. **15,514 documents** — 5,655 AI, 9,859 human.

Cycle 1 was trained on chat replies, and the shipped Tier 3 model shows it: the same model (claude-sonnet-4.6) is flagged 66% of the time when it writes a chat reply and 4% of the time when it writes an article. This corpus is published-register on both sides — articles, marketing and SEO copy, social posts, academic writing — and contains no chat conversations.

## Splits

Assigned by content hash, never by index: within each `(register, side, provider, era)` stratum, groups are ordered by the SHA-256 of their group key and cut at the 70/85 quantiles. Documents that share a group — the nine HAT-Bench versions of one essay, a human source and its AI edits — always land in the same split, so an edited copy of a training document cannot appear in test.

| split | AI | human | total |
|---|---|---|---|
| train | 3,907 | 3,949 | 7,856 |
| cal | 854 | 854 | 1,708 |
| test | 894 | 5,056 | 5,950 |

Train and calibration are class-balanced (4,761 AI vs 4,803 human). The test split is deliberately human-heavy: the 4,204 rows of the shipped regression battery are admitted as themselves and pinned to test, never train or calibration. Report test-set false-positive rate against that partition and test-set recall against the hash-assigned partition; do not mix them into one accuracy figure.

## Register

Register is the axis cycle 1 failed on, so it is the axis the corpus is balanced on. Each register's trainable pool is sized to `min(target, available AI, available human)`, which makes every register class-balanced by construction and makes any shortfall visible rather than hidden behind one side's surplus.

| register | AI (all) | human (all) | AI (train+cal) | human (train+cal) |
|---|---|---|---|---|
| academic | 1,300 | 1,821 | 1,094 | 1,108 |
| article | 1,300 | 2,761 | 1,092 | 1,106 |
| marketing | 1,600 | 2,843 | 1,355 | 1,360 |
| reference | 450 | 450 | 379 | 379 |
| report | 205 | 882 | 171 | 171 |
| social | 800 | 1,102 | 670 | 679 |

## Genre

| genre | AI | human | total |
|---|---|---|---|
| business-marketing | 0 | 1243 | 1243 |
| news | 778 | 426 | 1204 |
| journalism | 0 | 1053 | 1053 |
| forum-post | 206 | 800 | 1006 |
| encyclopaedic | 450 | 450 | 900 |
| student-essay | 289 | 599 | 888 |
| business-marketing-copy | 0 | 766 | 766 |
| scientific-writing | 365 | 393 | 758 |
| technical | 0 | 677 | 677 |
| consumer-review | 305 | 369 | 674 |
| blog-editorial | 0 | 646 | 646 |
| academic | 0 | 521 | 521 |
| seo-blog-post | 0 | 465 | 465 |
| tech-news | 93 | 340 | 433 |
| business-report | 205 | 205 | 410 |
| research-abstract | 275 | 80 | 355 |
| casual-forum | 0 | 302 | 302 |
| non-native | 0 | 296 | 296 |
| personal-narrative | 277 | 0 | 277 |
| seo-service-page | 241 | 0 | 241 |
| scholarly-web | 0 | 228 | 228 |
| how-to-guide | 223 | 0 | 223 |
| thought-leadership | 206 | 0 | 206 |
| company-blog | 201 | 0 | 201 |
| faq-page | 194 | 0 | 194 |
| case-study | 180 | 0 | 180 |
| product-description | 180 | 0 | 180 |
| academic-essay | 143 | 0 | 143 |
| literature-review | 143 | 0 | 143 |
| press-release | 111 | 0 | 111 |
| linkedin-post | 91 | 0 | 91 |
| facebook-post | 90 | 0 | 90 |
| x-thread | 89 | 0 | 89 |
| discussion-section | 85 | 0 | 85 |
| newsletter | 70 | 0 | 70 |
| landing-page | 61 | 0 | 61 |
| category-page | 57 | 0 | 57 |
| instagram-caption | 47 | 0 | 47 |

## Era

| era | documents | share of corpus |
|---|---|---|
| pre-2022-human | 4,960 | 32.0% |
| 2026-frontier | 4,860 | 31.3% |
| verified-authorship | 4,204 | 27.1% |
| human-labelled-undated | 695 | 4.5% |
| 2025-2026 | 474 | 3.1% |
| 2024-2025-older | 278 | 1.8% |
| 2022-2023 | 43 | 0.3% |

`human-labelled-undated` marks human text that is human by dataset construction (HAT-Bench `v0`, MAGA `model == human`) but whose collection date the source card does not publish. It meets the verifiable-authorship bar, not the pre-December-2022 bar, and is labelled that way rather than rounded up.

## Provider and model (AI side)

| provider | documents | share of AI side |
|---|---|---|
| openai | 1,530 | 27.1% |
| google | 1,291 | 22.8% |
| alibaba | 701 | 12.4% |
| anthropic | 693 | 12.3% |
| mistral | 362 | 6.4% |
| xai | 211 | 3.7% |
| deepseek | 208 | 3.7% |
| zhipu | 190 | 3.4% |
| meta | 189 | 3.3% |
| moonshot | 157 | 2.8% |
| other | 91 | 1.6% |
| nvidia | 32 | 0.6% |

50 distinct generator models. The twenty largest:

| model | documents |
|---|---|
| gemini/gemini-2.5-flash | 251 |
| openai/gpt-5.4-2026-03-05 | 239 |
| local_qwen_tf/Qwen/Qwen3-8B | 223 |
| x-ai/grok-4.6 | 211 |
| openai/gpt-5.4 | 209 |
| google/gemini-3.7-flash | 209 |
| claude-sonnet-4.6 | 207 |
| qwen/qwen3.8-max | 206 |
| qwen3.5-27b | 202 |
| openai/gpt-5.4-nano-2026-03-17 | 197 |
| gpt-5.4-mini | 195 |
| gemini-3.5-flash | 194 |
| z-ai/glm-5.3 | 190 |
| mistral-small-3.2-24b-instruct | 188 |
| gemma-4-31b-it | 184 |
| gemma-4-e4b-it | 177 |
| openai/gpt-5.6-luna | 174 |
| anthropic/claude-sonnet-5 | 172 |
| anthropic/claude-opus-5 | 171 |
| meta-llama/llama-4-maverick | 160 |

## Edit level

A detector that only handles pure generation is not much use to someone whose users paste part-edited AI all day. HAT-Bench contributes a `v0`–`v8` trajectory per essay (v0 pure human, v8 heaviest AI editing) and GRADTEX contributes named transformation families, so the corpus carries the continuum rather than just the endpoints.

| edit_level | AI | human |
|---|---|---|
| None | 0 | 9415 |
| full-generation | 3497 | 0 |
| light-edit | 258 | 0 |
| paraphrase | 280 | 0 |
| partial-completion | 274 | 0 |
| style-rewrite | 264 | 0 |
| v0 | 0 | 444 |
| v1 | 130 | 0 |
| v2 | 136 | 0 |
| v3 | 134 | 0 |
| v4 | 134 | 0 |
| v5 | 134 | 0 |
| v6 | 145 | 0 |
| v7 | 135 | 0 |
| v8 | 134 | 0 |

## Word-count distribution

| register | side | n | p10 | p25 | median | p75 | p90 | min | max |
|---|---|---|---|---|---|---|---|---|---|
| academic | ai | 1300 | 151 | 205 | 279 | 734 | 1078 | 100 | 1400 |
| academic | human | 1821 | 160 | 213 | 341 | 628 | 1442 | 100 | 1610 |
| article | ai | 1300 | 185 | 313 | 644 | 928 | 1087 | 100 | 1392 |
| article | human | 2761 | 128 | 262 | 387 | 593 | 846 | 100 | 1558 |
| marketing | ai | 1600 | 186 | 520 | 801 | 972 | 1101 | 101 | 1391 |
| marketing | human | 2843 | 160 | 261 | 397 | 605 | 868 | 100 | 1568 |
| reference | ai | 450 | 117 | 164 | 435 | 626 | 720 | 100 | 849 |
| reference | human | 450 | 109 | 125 | 156 | 190 | 233 | 100 | 347 |
| report | ai | 205 | 311 | 439 | 546 | 628 | 720 | 109 | 872 |
| report | human | 882 | 289 | 358 | 490 | 717 | 1100 | 101 | 1575 |
| social | ai | 800 | 133 | 188 | 278 | 381 | 490 | 61 | 876 |
| social | human | 1102 | 112 | 159 | 279 | 460 | 732 | 60 | 1517 |

Overall median: AI 497 words, human 368 words. Length is a leakable shortcut, so the gap matters: a classifier that learns "long means AI" will look excellent here and fail in production.

## Baseline: the shipped Tier 3 model on this corpus

Model `tier3-e5small-int8-perchannel.onnx`, tokeniser from `tier3/checkpoint`, max_len 512, shipping threshold **0.857** from `models/tier3-config.json`. 15,514 of 15,514 documents scored. This is the *before* picture; the retrain is measured against it.

### Headline

| measure | value |
|---|---|
| AI recall at 0.857 | 6.0% (340/5655) |
| Human false-positive rate at 0.857 | 0.7% (68/9859) |
| AUROC, AI vs human | 0.528 |

### What this baseline says

`models/tier3-config.json` records the cycle-1 test AUROC as **0.981**. On this corpus it is **0.528**. That gap is the whole point of cycle 2: the cycle-1 number was measured on the register the model was trained on, and published prose is not that register.

Five things in the tables below are worth reading carefully.

1. **Recall is 6.0% (340/5655) at the shipping threshold.** The false-positive rate is fine — 0.7% (68/9859) — so the threshold is not the problem. The model is simply not separating the classes.

2. **Marketing is the only register with a pulse, and it is not an authorship signal.** It has the highest recall of any register, but also the highest false-positive rate, and the median AI and median human scores are within 0.005 of each other. The model scores *all* marketing copy high, whoever wrote it, and the shipping threshold happens to sit near that median — so marketing generates both the detections and the false positives. This is exactly the register effect the cliché-rule false positives come from.

3. **On business reports the model is below chance** (AUROC 0.276): it ranks human reports as more AI-like than AI reports. With 205 documents per side that is a weak measurement, but it points the wrong way.

4. **Partially-edited text is invisible.** Every edit band — `v1` through `v8`, `light-edit`, `paraphrase`, `partial-completion`, `style-rewrite` — sits at 0.0% recall. Detection only ever fires on full generation, and only about one time in ten. A user pasting AI they have tidied up gets nothing at all.

5. **Do not read the era table as a decay curve.** It is confounded with register: the `2026-frontier` bucket is dominated by the owner's marketing generations, which is the one place any signal exists, while `2025-2026` is HAT-Bench essays, abstracts, news and reports. The difference between those rows is register, not model age.

### By register and side

| register | AI flagged | human flagged (FPR) | AUROC | median AI score | median human score |
|---|---|---|---|---|---|
| academic | 0.2% (2/1300) | 0.8% (15/1821) | 0.482 | 0.273 | 0.261 |
| article | 5.5% (71/1300) | 0.4% (12/2761) | 0.525 | 0.288 | 0.291 |
| marketing | 16.2% (260/1600) | 1.1% (32/2843) | 0.612 | 0.853 | 0.849 |
| reference | 0.7% (3/450) | 0.0% (0/450) | 0.640 | 0.166 | 0.151 |
| report | 0.0% (0/205) | 0.7% (6/882) | 0.276 | 0.150 | 0.211 |
| social | 0.5% (4/800) | 0.3% (3/1102) | 0.606 | 0.201 | 0.170 |

### AI recall by era

| era | flagged | median score |
|---|---|---|
| 2026-frontier | 6.9% (335/4860) | 0.648 |
| 2025-2026 | 0.4% (2/474) | 0.170 |
| 2024-2025-older | 1.1% (3/278) | 0.204 |
| 2022-2023 | 0.0% (0/43) | 0.669 |

### AI recall by provider

| provider | flagged | median score |
|---|---|---|
| openai | 7.2% (110/1530) | 0.527 |
| google | 5.8% (75/1291) | 0.405 |
| alibaba | 2.3% (16/701) | 0.212 |
| anthropic | 6.9% (48/693) | 0.779 |
| mistral | 8.6% (31/362) | 0.716 |
| xai | 2.8% (6/211) | 0.177 |
| deepseek | 5.8% (12/208) | 0.688 |
| zhipu | 7.9% (15/190) | 0.815 |
| meta | 6.3% (12/189) | 0.844 |
| moonshot | 8.9% (14/157) | 0.842 |
| other | 1.1% (1/91) | 0.814 |
| nvidia | 0.0% (0/32) | 0.152 |

Providers with fewer than 20 scored documents are omitted rather than given a rate.

### AI recall by edit level

| edit_level | flagged | median score |
|---|---|---|
| full-generation | 9.7% (338/3497) | 0.825 |
| light-edit | 0.0% (0/258) | 0.202 |
| paraphrase | 0.0% (0/280) | 0.211 |
| partial-completion | 0.0% (0/274) | 0.223 |
| style-rewrite | 0.0% (0/264) | 0.758 |
| v1 | 0.0% (0/130) | 0.174 |
| v2 | 0.0% (0/136) | 0.170 |
| v3 | 0.0% (0/134) | 0.169 |
| v4 | 0.0% (0/134) | 0.188 |
| v5 | 0.7% (1/134) | 0.176 |
| v6 | 0.7% (1/145) | 0.165 |
| v7 | 0.0% (0/135) | 0.197 |
| v8 | 0.0% (0/134) | 0.175 |

### Human false positives by source

| human source | flagged (false positives) | median score |
|---|---|---|
| battery-human-corpus-v2 | 1.0% (41/4164) | 0.723 |
| gradtex-human (MAGE) | 0.0% (0/2368) | 0.202 |
| c4-en-2019 | 1.3% (26/1993) | 0.847 |
| persuade-2.0 | 0.0% (0/507) | 0.166 |
| maga-human | 0.3% (1/343) | 0.158 |
| hatbench-reports-v0 | 0.0% (0/205) | 0.151 |
| hatbench-essays-v0 | 0.0% (0/92) | 0.167 |
| hatbench-abstracts-v0 | 0.0% (0/80) | 0.563 |
| hatbench-news-v0 | 0.0% (0/67) | 0.172 |
| battery-human-corpus-v1 | 0.0% (0/40) | 0.200 |

