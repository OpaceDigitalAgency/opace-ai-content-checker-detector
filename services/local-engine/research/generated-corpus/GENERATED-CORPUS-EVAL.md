# Generated corpus - current-model article evaluation

**Opace AI Content Integrity - local engine research**  
Corpus generated 28 August 2026 via OpenRouter. Scored with the shipped rules stack
(`packages/core` dist `computeEditorialSignals` / `inspectSignalsV2`) and the shipped
Tier 3 model (`models/tier3-e5small-int8-perchannel.onnx`).

**4,016 usable samples** (4,050 generated, 34 quarantined) across **21 models** from **10 providers**, 3,100,043 words. **Actual spend $61.70** against a $75 cap.

Every rate below shows its denominator. British English throughout.

---

## Why this corpus exists

The existing AI corpus is 1,727 samples whose newest models date to roughly July 2025,
and every one of them is a **chat reply**. Nobody runs an authenticity check on a chat
reply. People check what gets published or submitted. This run fixes both problems at
once: current models, and only the registers users actually paste.

That means the comparison against `provider-eval/analysis.json` in this report changes
**two variables at once** - model era *and* register. Where that matters, it is called
out. It is the single most important caveat in this document.

## What was generated

| | |
|---|---|
| Samples (usable / generated) | 4,016 / 4,050 |
| Models | 21 |
| Words | 3,100,043 (mean 772, median 844, max 2160) |
| Registers | 19, in 5 families |
| Prompt styles | plain 1,307 / house-brief 1,338 / human-voice 1,371 |
| Temperatures | 0.7 (1,351), 1.0 (2,008), 1.2 (657) |
| Topic prompts | 106 (60 article/marketing, 46 social/academic/other), identical across every model |

Registers, by family:

| Family | Registers | Samples | Mean words |
|---|---|---:|---:|
| `article` | company blog, news piece, how-to explainer, thought-leadership | 1,244 | 925 |
| `marketing-seo` | SEO service page, landing page, category page, product description | 797 | 857 |
| `other-shared` | press release, newsletter, case study, FAQ page | 797 | 822 |
| `social-post` | LinkedIn, X thread, Facebook, Instagram | 721 | 208 |
| `academic` | essay answer, literature review, discussion section | 457 | 1009 |

---

## Headline result

| Measure | Value |
|---|---|
| Tier 3 flag rate @ 0.8533 | 39.9% (1,601/4,016) |
| Tier 3 flag rate @ 0.8397 | 56.6% (2,275/4,016) |
| Tier 3 flag rate @ 0.6256 | 71.6% (2,876/4,016) |
| Tier 3 flag rate @ 0.857 (shipped) | 12.4% (498/4,016) |
| Tier 3 mean probability | 0.666 |
| Rules score mean / median / p90 / max | 4.85 / 4 / 9 / 31 |
| Rules classification: mixed or above | 40.7% |
| Rules classification: ai_like | 0.4% |
| Rules score >= 10 | 9.0% |
| Rules score >= 25 | 0.1% |
| Mean findings per sample | 4.78 |

At the shipped 0.857 threshold the Tier 3 model flags **12.4% of current-model article
prose**. The rules stack calls **0.4%** of it `ai_like`. Neither number is a working
detector on its own; both are consistent with the calibration file's own recorded
`corpus_test_ai_tpr` of 0.167.

---

## Question 1 - has detection degraded on current models?

**No. It has improved slightly, or held flat, for every provider except xAI.**

Comparison at the shipped 0.857 threshold, against the two eras in
`provider-eval/analysis.json`. Baseline slices are 150 chat replies each; the 2026
column is this corpus.

| Provider | 2024-25 chat | 2025-26 chat | 2026 articles (this run) | n (2026) | Direction |
|---|---|---|---|---:|---|
| anthropic | 2.7% | 5.3% | **9.5%** (68/716) | 716 | **up +4.2 pt** |
| openai | 3.9% | 8.0% | **17.5%** (166/950) | 950 | **up +9.5 pt** |
| google | 9.3% | 13.3% | **17.1%** (107/625) | 625 | **up +3.8 pt** |
| xai | - | 6.7% | **3.6%** (9/250) | 250 | **down -3.1 pt** |
| deepseek | - | 7.3% | **8.1%** (20/248) | 248 | flat |
| meta | 0.0% | 6.7% | **8.0%** (20/250) | 250 | **up +1.3 pt** |
| mistral | - | 1.3% | **16.5%** (41/249) | 249 | **up +15.2 pt** |
| qwen | - | - | **8.0%** (20/250) | 250 | no baseline - new coverage |
| moonshot | - | - | **9.6%** (24/249) | 249 | no baseline - new coverage |
| zai | - | - | **10.0%** (23/229) | 229 | no baseline - new coverage |

Same comparison on the rules stack, mean score:

| Provider | 2024-25 chat | 2025-26 chat | 2026 articles | Mean findings 2025-26 -> 2026 |
|---|---|---|---|---|
| anthropic | 5.273 | 4.24 | **4.58** | 2.34 -> 5.09 |
| openai | 5.649 | 6.06 | **4.62** | 4.1 -> 4.32 |
| google | 4.827 | 4.867 | **5.66** | 4.13 -> 5.71 |
| xai | - | 4.593 | **1.86** | 3.71 -> 1.46 |
| deepseek | - | 6.093 | **4.66** | 4.71 -> 4.84 |
| meta | 4.807 | 4.947 | **5.84** | 4.39 -> 5.01 |
| mistral | - | 6.38 | **7.1** | 4.68 -> 5.96 |
| qwen | - | - | **4.63** | - -> 4.69 |
| moonshot | - | - | **4.39** | - -> 4.59 |
| zai | - | - | **5.04** | - -> 5.58 |

### Reading this honestly

- **Detection has not degraded with model generation.** Claude Opus 5 and Sonnet 5, the
  biggest gap in the corpus, flag at 5.6% and 12.0% at the shipped threshold - above,
  not below, the 2.7% and 5.3% recorded for Claude in 2024-25 and 2025-26.
- **The one genuine regression is xAI.** Grok 4.6 flags at 3.6% (9/250) versus 6.7% for
  Grok in 2025-26, and its rules mean collapses to 1.86 with 4.0% mixed-or-above. It is
  by a wide margin the hardest model in this corpus, and the only one where a
  human-voice prompt drives detection to exactly zero (0/86).
- **The improvement is register, not virtue.** Articles carry markdown headings, bold
  labels and section furniture that chat replies often do not; those are what the rules
  stack is mostly firing on. Read the per-register table before drawing conclusions
  about model families.
- Absolute recall remains poor everywhere: 3.6% to 17.5% by provider at 0.857.

### Per model

| Model | Tier | n | Rules mean | Mixed+ | Findings | Tier3 mean | @0.8533 | @0.8397 | @0.6256 | @0.857 |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `google/gemini-3.6-flash` | flash-or-mini | 75 | 6.25 | 64.0% | 6.36 | 0.793 | 61.3% | 76.0% | 90.7% | 28.0% |
| `google/gemini-3.7-flash` | flash-or-mini | 250 | 5.96 | 65.2% | 6.24 | 0.748 | 59.6% | 72.4% | 84.0% | 20.0% |
| `openai/gpt-5.6-sol` | standard | 150 | 4.89 | 37.3% | 4.59 | 0.763 | 56.7% | 74.0% | 86.0% | 20.7% |
| `openai/gpt-5.6-luna-pro` | pro-flagship | 75 | 5.12 | 34.7% | 4.2 | 0.765 | 56.0% | 77.3% | 85.3% | 21.3% |
| `openai/gpt-5.6-sol-pro` | pro-flagship | 75 | 5.44 | 38.7% | 4.99 | 0.791 | 56.0% | 81.3% | 90.7% | 18.7% |
| `openai/gpt-5.6-luna` | flash-or-mini | 250 | 4.63 | 33.2% | 4.18 | 0.735 | 50.8% | 64.8% | 82.8% | 17.6% |
| `openai/gpt-5.6-terra` | standard | 250 | 4.56 | 32.8% | 4.43 | 0.729 | 50.0% | 64.4% | 82.0% | 16.4% |
| `google/gemini-3.5-flash` | flash-or-mini | 150 | 5.79 | 52.7% | 5.65 | 0.706 | 46.0% | 61.3% | 78.0% | 14.7% |
| `meta-llama/llama-4-maverick` | flash-or-mini | 250 | 5.84 | 38.0% | 5.01 | 0.681 | 45.6% | 62.4% | 74.8% | 8.0% |
| `mistralai/mistral-medium-3-5` | standard | 249 | 7.1 | 51.0% | 5.96 | 0.71 | 44.6% | 63.1% | 77.9% | 16.5% |
| `openai/gpt-5.4` | standard | 150 | 3.77 | 30.0% | 3.85 | 0.672 | 42.7% | 60.0% | 72.0% | 13.3% |
| `anthropic/claude-fable-5` | pro-flagship | 141 | 4.81 | 46.8% | 5.32 | 0.677 | 39.7% | 59.6% | 73.8% | 10.6% |
| `anthropic/claude-sonnet-5` | standard | 250 | 4.55 | 32.0% | 4.9 | 0.664 | 35.6% | 54.8% | 72.4% | 12.0% |
| `z-ai/glm-5.3` | standard | 229 | 5.04 | 52.4% | 5.58 | 0.665 | 34.5% | 55.9% | 71.2% | 10.0% |
| `moonshotai/kimi-k3` | pro-flagship | 249 | 4.39 | 36.5% | 4.59 | 0.617 | 34.1% | 52.6% | 65.1% | 9.6% |
| `anthropic/claude-opus-4.8` | pro-flagship | 75 | 4.67 | 36.0% | 4.92 | 0.637 | 32.0% | 49.3% | 66.7% | 12.0% |
| `google/gemini-3.1-pro-preview` | pro-flagship | 150 | 4.72 | 40.0% | 4.55 | 0.635 | 31.3% | 52.7% | 66.0% | 9.3% |
| `deepseek/deepseek-v4-pro-0813` | standard | 248 | 4.66 | 46.4% | 4.84 | 0.638 | 31.0% | 47.2% | 66.5% | 8.1% |
| `qwen/qwen3.8-max` | standard | 250 | 4.63 | 47.6% | 4.69 | 0.598 | 29.6% | 46.0% | 62.0% | 8.0% |
| `anthropic/claude-opus-5` | pro-flagship | 250 | 4.46 | 45.6% | 5.2 | 0.572 | 24.8% | 40.0% | 56.4% | 5.6% |
| `x-ai/grok-4.6` | standard | 250 | 1.86 | 4.0% | 1.46 | 0.462 | 13.6% | 24.4% | 39.6% | 3.6% |

### Per tier - the free-versus-paid question

| Tier | n | Rules mean | Mixed+ | Tier3 mean | @0.8533 | @0.8397 | @0.6256 | @0.857 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| flash-or-mini | 975 | 5.58 | 48.0% | 0.724 | 51.8% (505/975) | 66.5% | 80.9% | 16.1% |
| standard | 2,026 | 4.58 | 37.2% | 0.65 | 36.4% (738/2026) | 53.2% | 69.1% | 11.6% |
| pro-flagship | 1,015 | 4.67 | 40.7% | 0.642 | 35.3% (358/1015) | 54.2% | 67.8% | 10.4% |

**The more capable the model, the harder it is to detect.** Flash and mini models flag
at 51.8% (505/975) at 0.8533; pro and flagship models at 35.3% (358/1,015). A 16.5-point
gap in the same registers, on the same prompts. Free-tier users are the ones we catch.
Agencies paying for Opus 5 and Grok 4.6 are not.

---

## Question 2 - are the cliche-vocabulary rules obsolete?

**Partly. Tier 1 is alive but no longer discriminating. Tier 2 is nearly dead. Tier 3
is completely dead.**

| Vocabulary list | Samples firing | Rate |
|---|---:|---:|
| `tier1` (delve, tapestry, landscape, realm ...) | 1,008/4,016 | **25.1%** |
| `tier2` | 53/4,016 | 1.3% |
| `tier3` | 0/4,016 | **0.0%** |
| any of the three | 1,029/4,016 | 25.6% |
| `tier1_clarity` (related) | - | 11.0% |

So the owner's belief is half right, and the half that is wrong matters more.

**Tier 1 has not gone away.** It fires on a quarter of all current-model prose, and on
41.2% (538/1,307) of plainly-prompted samples. Compared with the chat-reply baselines
(`signals.tier1` at 12.7-32.7% across the 2024-25 and 2025-26 provider slices) it is
firing at the same rate or higher. Per model it ranges from 12.0% for
`openai/gpt-5.6-sol` to 58.0% for `meta-llama/llama-4-maverick`. Deleting it would lose
real signal.

**But it does not separate AI from human in the register that matters.** The
`human|business-marketing` baseline slice fires `signals.tier1` on 40.0% (4/10) of
genuine human marketing copy - a higher rate than 15 of the 21 models in this corpus.
Human marketing writers use 'landscape' and 'unlock' too. Tier 1 is a register detector
wearing an AI detector's badge. On a 10-sample human denominator that is weak evidence,
and it is the gap most worth closing next.

**Tier 3 is genuinely obsolete.** Zero fires in 4,016 samples. Whatever it lists, no
current model writes it. Tier 2 at 1.3% (53/4,016) is close behind.

What actually carries the rules stack now is structure, not vocabulary:

| Category | Fires on |
|---|---:|
| `markdown-furniture` | 66.8% |
| `markdown-heading` | 54.6% |
| `markdown-bold` | 41.3% |
| `formatting` | 32.1% |
| `setup-expansion-cadence` | 27.5% |
| `tier1` | 25.1% |
| `em-dash-density` | 25.0% |
| `hollow-intensifier` | 23.7% |
| `bold-label-bullets` | 17.0% |
| `uniform-list-items` | 11.0% |
| `tier1-clarity` | 11.0% |
| `uniform-sections` | 10.2% |

Five of the top six are formatting. That is a fragile place to stand: a user who pastes
plain text, or whose CMS strips markdown, removes most of the engine's evidence.

---

## Question 3 - does "write like a human" defeat detection?

**Yes, decisively. It roughly cuts detection by two thirds, and at the shipped
threshold it cuts it by six sevenths.**

Same models, same 106 topics, same temperatures. Only the instruction changes.

| Prompt style | n | Rules mean | Mixed+ | Tier1 vocab | Em dash /1k | Tier3 mean | @0.8533 | @0.8397 | @0.6256 | @0.857 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| plain | 1,307 | 6.45 | 53.9% | 41.2% (538/1307) | 4.9 | 0.736 | **55.9%** (731/1307) | 72.5% (947/1307) | 82.1% (1073/1307) | 21.0% (275/1307) |
| house-brief | 1,338 | 4.94 | 51.3% | 23.5% (315/1338) | 4.51 | 0.715 | **44.7%** (598/1338) | 63.5% (849/1338) | 79.2% (1060/1338) | 13.1% (175/1338) |
| human-voice | 1,371 | 3.22 | 17.8% | 11.3% (155/1371) | 2.01 | 0.552 | **19.8%** (272/1371) | 34.9% (479/1371) | 54.2% (743/1371) | 3.5% (48/1371) |

**The cost of one sentence in the prompt:**

- Tier 3 @ 0.8533: 55.9% -> 19.8% (**-36.1 points**, a 65% relative drop)
- Tier 3 @ 0.857 (shipped): 21.0% -> 3.5% (**-17.5 points**, an 83% relative drop)
- Rules mixed-or-above: 53.9% -> 17.8%
- Tier 1 cliche vocabulary: 41.2% -> 11.3%
- Em dashes per 1,000 words: 4.9 -> 2.01

Note the house-style brief sits between the two and is closer to plain. It is the
explicit anti-AI instruction, not general prompt sophistication, that does the damage.

### Per model, Tier 3 @ 0.8533

| Model | plain | house-brief | human-voice | Drop (plain - human) |
|---|---|---|---|---:|
| `anthropic/claude-fable-5` | 70.5% (31/44) | 42.6% (20/47) | 10.0% (5/50) | **+60.5** |
| `mistralai/mistral-medium-3-5` | 69.5% (57/82) | 51.2% (42/82) | 14.1% (12/85) | **+55.4** |
| `google/gemini-3.1-pro-preview` | 60.9% (28/46) | 30.2% (16/53) | 5.9% (3/51) | **+55.0** |
| `google/gemini-3.5-flash` | 71.7% (33/46) | 49.1% (26/53) | 19.6% (10/51) | **+52.1** |
| `anthropic/claude-opus-4.8` | 56.0% (14/25) | 30.8% (8/26) | 8.3% (2/24) | **+47.7** |
| `openai/gpt-5.4` | 63.0% (29/46) | 50.9% (27/53) | 15.7% (8/51) | **+47.3** |
| `z-ai/glm-5.3` | 54.5% (42/77) | 41.9% (31/74) | 7.7% (6/78) | **+46.8** |
| `moonshotai/kimi-k3` | 52.4% (43/82) | 44.4% (36/81) | 7.0% (6/86) | **+45.4** |
| `anthropic/claude-sonnet-5` | 54.9% (45/82) | 39.0% (32/82) | 14.0% (12/86) | **+40.9** |
| `qwen/qwen3.8-max` | 46.3% (38/82) | 36.6% (30/82) | 7.0% (6/86) | **+39.3** |
| `google/gemini-3.6-flash` | 72.0% (18/25) | 73.1% (19/26) | 37.5% (9/24) | **+34.5** |
| `google/gemini-3.7-flash` | 70.7% (58/82) | 69.5% (57/82) | 39.5% (34/86) | **+31.2** |
| `anthropic/claude-opus-5` | 39.0% (32/82) | 28.0% (23/82) | 8.1% (7/86) | **+30.9** |
| `x-ai/grok-4.6` | 29.3% (24/82) | 12.2% (10/82) | 0.0% (0/86) | **+29.3** |
| `openai/gpt-5.6-terra` | 62.2% (51/82) | 53.7% (44/82) | 34.9% (30/86) | **+27.3** |
| `deepseek/deepseek-v4-pro-0813` | 43.9% (36/82) | 32.9% (27/82) | 16.7% (14/84) | **+27.2** |
| `openai/gpt-5.6-sol-pro` | 68.0% (17/25) | 57.7% (15/26) | 41.7% (10/24) | **+26.3** |
| `openai/gpt-5.6-luna-pro` | 68.0% (17/25) | 53.8% (14/26) | 45.8% (11/24) | **+22.2** |
| `meta-llama/llama-4-maverick` | 50.0% (41/82) | 59.8% (49/82) | 27.9% (24/86) | **+22.1** |
| `openai/gpt-5.6-luna` | 58.5% (48/82) | 51.2% (42/82) | 43.0% (37/86) | **+15.5** |
| `openai/gpt-5.6-sol` | 63.0% (29/46) | 56.6% (30/53) | 51.0% (26/51) | **+12.0** |

`x-ai/grok-4.6` goes to **zero** - 0 of 86 human-voice samples flag at 0.8533. The
smallest drop is `openai/gpt-5.6-sol` at 12.0 points, and it is the only model that
stays above 50% detection under an anti-AI prompt.

---

## Question 4 - detection by register

**Register dominates everything else in this data - more than model, more than tier,
more than temperature.**

| Register family | n | Mean words | Rules mean | Mixed+ | Tier1 vocab | Tier3 mean | @0.8533 | @0.8397 | @0.6256 | @0.857 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **marketing-seo** | 797 | 857 | 6.26 | 60.6% | 32.1% | 0.819 | **77.9%** (621/797) | 88.7% | 94.5% | 33.6% |
| **other-shared** | 797 | 822 | 4.77 | 60.6% | 23.1% | 0.739 | **53.3%** (425/797) | 69.0% | 82.2% | 10.2% |
| **article** | 1,244 | 925 | 4.01 | 38.3% | 23.3% | 0.661 | **37.5%** (467/1244) | 54.1% | 70.5% | 11.7% |
| **social-post** | 721 | 208 | 5.12 | 6.0% | 5.8% | 0.675 | **11.5%** (83/721) | 44.8% | 73.1% | 0.4% |
| **academic** | 457 | 1009 | 4.35 | 32.8% | 51.6% | 0.268 | **1.1%** (5/457) | 4.8% | 14.0% | 0.0% |

| Register | n | Mean words | Rules mean | @0.8533 | @0.6256 | Tier1 vocab |
|---|---:|---:|---:|---:|---:|---:|
| category-page | 78 | 666 | 6.33 | 88.5% (69/78) | 96.2% | 39.7% |
| seo-service-page | 350 | 909 | 6.63 | 83.7% (293/350) | 96.3% | 28.0% |
| product-description | 279 | 923 | 5.95 | 72.8% (203/279) | 93.9% | 41.9% |
| faq-page | 276 | 979 | 4.83 | 72.5% (200/276) | 91.3% | 19.9% |
| newsletter | 105 | 531 | 5.07 | 70.5% (74/105) | 91.4% | 8.6% |
| howto-explainer | 326 | 993 | 4.67 | 68.1% (222/326) | 88.3% | 19.6% |
| landing-page | 90 | 614 | 5.71 | 62.2% (56/90) | 87.8% | 11.1% |
| company-blog | 312 | 927 | 4.19 | 47.1% (147/312) | 78.2% | 21.2% |
| press-release | 157 | 543 | 5.01 | 40.1% (63/157) | 84.7% | 31.8% |
| case-study | 259 | 942 | 4.45 | 34.0% (88/259) | 67.2% | 27.0% |
| social-x-thread | 193 | 286 | 3.45 | 21.8% (42/193) | 53.4% | 6.7% |
| thought-leadership | 293 | 917 | 4.03 | 18.4% (54/293) | 57.3% | 31.4% |
| news-piece | 313 | 860 | 3.13 | 14.1% (44/313) | 56.5% | 21.7% |
| social-facebook | 186 | 160 | 3.61 | 12.4% (23/186) | 94.1% | 4.3% |
| social-instagram | 137 | 124 | 12.26 | 9.5% (13/137) | 98.5% | 7.3% |
| academic-lit-review | 169 | 919 | 4.92 | 3.0% (5/169) | 23.1% | 58.6% |
| social-linkedin | 205 | 235 | 3.28 | 2.4% (5/205) | 55.6% | 5.4% |
| academic-discussion | 95 | 854 | 3.68 | 0.0% (0/95) | 18.9% | 35.8% |
| academic-essay | 193 | 1163 | 4.17 | 0.0% (0/193) | 3.6% | 53.4% |

### What this says

- **Marketing and SEO copy is the one place detection works.** 77.9% (621/797) at
  0.8533, 94.5% at 0.6256, and category pages hit 88.5%. This is also the highest-value
  register commercially. Good news, with one caveat: the human business-marketing
  baseline scores a Tier 3 mean of 0.613 against the general human mean of 0.226, so
  some of what we are catching is 'marketing copy', not 'machine'.
- **Academic writing is effectively invisible.** 1.1% (5/457) at 0.8533; academic essays
  flag 0 of 193 at 0.8533 and 7 of 193 even at 0.6256. Continuous argued prose with
  citations, no headings and no bullets removes nearly every structural signal the
  engine relies on. If students are a target market, the engine currently cannot serve
  them. This is the largest single blind spot the run found.
- **Social posts are unreliable in a different way.** 11.5% at 0.8533, but 73.1% at
  0.6256 - the short-text scores cluster in an unstable middle band. Instagram captions
  average 124 words and post the highest rules mean in the whole corpus (12.26), driven
  by `hashtag-stuff` firing rather than by anything about authorship. Below roughly 200
  words the Tier 3 probability should not be treated as a verdict at all.
- **Length band tracks this directly**: long 43.8% (2,865), medium 60.9% (430),
  short 11.5% (721) at 0.8533.
- **Temperature barely matters**: 38.2% at 0.7 (n=1,351), 41.3% at 1.0 (n=2,008),
  39.0% at 1.2 (n=657).

---

## Spend

| Item | Amount |
|---|---:|
| Cap authorised | $75.00 |
| **Actual spend (OpenRouter `/auth/key` usage)** | **$61.70** |
| Remaining against cap | $13.30 |
| Requests billed | 4,102 |
| Cost per usable sample | $0.0154 |

| Run | Requests | Cost |
|---|---:|---:|
| pilot (2 models, 10 calls) | 10 | $0.2409 |
| cost probe (12 models) | 24 | $0.2730 |
| pass 1 - articles and marketing, 12 models x 150 | 1,800 | $21.3633 |
| cost probe (9 added models) | 18 | $0.2772 |
| pass 3c - claude-fable-5 x 150 | 150 | $12.2230 |
| pass 3b - 4 models x 75 | 300 | $7.1582 |
| pass 3a - 4 models x 150 | 600 | $10.7908 |
| pass 2 - social, academic, other, 12 models x 100 | 1,200 | $9.1385 |
| **Sum of run logs** | | **$61.4650** |

The authoritative $61.6996 exceeds the run-log sum of $61.4649 by $0.23; the difference
is requests that were billed and then errored or were retried. The higher figure is the
one reported.

The pilot projected $20.48 for the original 12-model, 1,800-sample plan; that plan
landed at $21.36. The overshoot against the original $40 brief came entirely from the
owner's mid-run expansion to 21 models and 4,050 samples, under the raised $75 cap.

---

## Limitations - read before citing any number here

1. **The era comparison changes two variables.** The 2024-25 and 2025-26 baselines are
   chat replies; this corpus is articles. Any per-provider delta in Question 1 confounds
   model generation with register. The direction of travel (no degradation) is robust
   because it holds across every provider bar one, but the magnitudes are not clean.
2. **No human control was generated.** Every sample here is AI. False-positive rates are
   quoted from `provider-eval/analysis.json`, whose human business-marketing slice is
   **10 samples**. A precision claim on this corpus alone is not available, and the next
   piece of work should be a matched human article set in the same registers.
3. **Thresholds 0.8533, 0.8397 and 0.6256 do not appear anywhere in this repository.**
   They were supplied in the brief and applied as given. The shipped threshold in
   `models/tier3-calibration.json` is 0.856437 raw / 0.921765 calibrated; 0.857 is
   reported alongside so these figures stay comparable with existing analysis. Note also
   that 0.8533 and 0.8397 sit inside the knife-edge band the calibration file warns
   about (verdicts within ~0.01 raw can flip across int8 runtimes).
4. **Tier 3 truncates at 512 tokens.** Roughly the first 380 words of each sample are
   scored. For the 2,865 long samples, most of the text is never seen by the model.
5. **34 samples (0.8%) were quarantined** and 28 more hit the token ceiling. See
   `manifest.json` for the per-model breakdown. `z-ai/glm-5.3` produced 21 degenerate
   outputs; `anthropic/claude-fable-5` had 9 cut by a content filter mid-piece. No model
   refused a task.
6. **Batch pricing was unavailable.** OpenRouter's `:batch` model ids return 404 from
   `/chat/completions` and require the separate `/api/beta/batches` endpoint. Everything
   was billed at synchronous rates.
7. **Google Gemini was run with reasoning enabled** (effort `low`) because those
   endpoints reject `reasoning:{enabled:false}`. Their token counts include reasoning
   tokens; other models were run with reasoning off.
8. **Two slices are not 2026 models.** `meta-llama/llama-4-maverick` (April 2025) is the
   newest Meta instruct model on OpenRouter, and `google/gemini-3.1-pro-preview`
   (February 2026) is the newest Gemini Pro id. Neither gap is ours to close.
9. **Sample sizes differ by model** - 250 for the original twelve, 150 or 75 for the
   nine added later. Denominators are shown on every rate; do not read the 75-sample
   rows as precisely as the 250-sample ones.
10. **These are prompted articles, not deployed content.** Real users edit, re-prompt
    and paste through a CMS. This corpus is an upper bound on how machine-like current
    models are when asked once.

---

## Files

| Path | What |
|---|---|
| `generated.jsonl` | combined corpus, one row per sample, eval-set.jsonl shape plus prompt_id, prompt_style, temperature, generated_at, usage, tier, register, length_band |
| `samples/` | 105 browsable files, samples/<provider>/<provider>__<model>__<register-family>__2026-08-28.jsonl |
| `INDEX.md` | full file inventory |
| `rules-scores.jsonl` | shipped packages/core computeEditorialSignals + inspectSignalsV2 output |
| `tier3-scores.jsonl` | shipped tier3-e5small-int8-perchannel.onnx probabilities |
| `analysis.json` | all slices |
| `GENERATED-CORPUS-EVAL.md` | the report |

`INDEX.md` lists all 105 sample files with provider, exact model id, tier, register
family, prompt-style split, sample count and word count.

