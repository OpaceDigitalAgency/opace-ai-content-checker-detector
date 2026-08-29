# Long-form corpus: report

Built 28 August 2026. **5,558 documents**: 4,636 human, 922 AI.

Every percentage below shows its denominator. Word counts are whitespace tokens on the stored text.


## 1. Word-count distribution

| side | documents | median words | min | max |
|---|---|---|---|---|
| human | 4,636 | 1092 | 400 | 11790 |
| AI | 922 | 1611 | 450 | 3061 |

| words | human | AI |
|---|---|---|
| 400-599 | 826 | 3 |
| 600-799 | 743 | 33 |
| 800-1,199 | 1,201 | 212 |
| 1,200-1,999 | 1,430 | 389 |
| 2,000+ | 436 | 285 |

3,810/4,636 human (82%) and 919/922 AI (100%) documents are 600 words or longer, the brief's preferred floor.


## 2. Register distribution

The two sides do not use an identical register list, and that is deliberate rather than an oversight. Human academic prose comes from published articles, which are sectioned - introduction, literature review, discussion, conclusion - while AI academic prose was commissioned as whole essays. `academic-essay` (AI) is therefore paired with `student-essay`, `academic-introduction` and `academic-conclusion` on the human side, not with a same-named class. Anyone training on this must map the registers rather than assume they line up.

| register | human | AI |
|---|---|---|
| academic-conclusion | 360 | 0 |
| academic-discussion | 420 | 113 |
| academic-essay | 0 | 132 |
| academic-introduction | 420 | 0 |
| academic-lit-review | 225 | 107 |
| company-update | 662 | 99 |
| longform-journalism | 840 | 137 |
| research-summary | 189 | 117 |
| story | 260 | 114 |
| student-essay | 420 | 0 |
| white-paper | 840 | 103 |

## 3. Human sources

| source | documents | median words | years | licence |
|---|---|---|---|---|
| europepmc-oa | 1,425 | 914 | 2018-2022 | CC BY |
| gov.uk | 851 | 936 | 2014-2022 | OGL v3.0 (Crown copyright) |
| globalvoices | 420 | 1019 | 2013-2021 | CC BY 3.0 |
| persuade-2.0 | 420 | 631 | not recorded | CC BY 4.0 (PERSUADE 2.0, The Learning Agency Lab); HF mirror |
| sec-edgar-10k-mdna | 420 | 1386 | 2018-2022 | US SEC EDGAR public filing (public disclosure record; SEC as |
| mongabay | 420 | 1421 | 2013-2021 | CC BY-ND 4.0 |
| crs-report | 420 | 1400 | 2018-2022 | US government work, no copyright (17 U.S.C. 105); via EveryC |
| internet-archive-cc-texts | 260 | 1190 | 2010-2022 | https://creativecommons.org/licenses/by-nc-nd/4.0/ |

## 4. AI side: models and prompt styles

| model | tier | documents | median words |
|---|---|---|---|
| deepseek/deepseek-v4-pro-0813 | standard | 131 | 2144 |
| openai/gpt-5.6-luna | flash-or-mini | 121 | 2263 |
| google/gemini-3.7-flash | flash-or-mini | 121 | 2120 |
| x-ai/grok-4.6 | standard | 121 | 1176 |
| qwen/qwen3.8-max | standard | 110 | 1457 |
| meta-llama/llama-4-maverick | flash-or-mini | 101 | 905 |
| z-ai/glm-5.3 | standard | 67 | 1849 |
| mistralai/mistral-medium-3-5 | standard | 41 | 1526 |
| anthropic/claude-sonnet-5 | standard | 26 | 1655 |
| moonshotai/kimi-k3 | pro-flagship | 26 | 1724 |
| anthropic/claude-opus-5 | pro-flagship | 23 | 1738 |
| google/gemini-3.1-pro-preview | pro-flagship | 21 | 1786 |
| openai/gpt-5.6-sol-pro | pro-flagship | 13 | 2365 |

| prompt style | documents |
|---|---|
| human-voice | 318 |
| house-brief | 310 |
| plain | 294 |

Generation cost of the delivered AI rows: **$12.33**.


## 5. Baseline: the shipped Tier 3 model on this corpus

Model `tier3-e5small-int8-perchannel.onnx` at its shipping threshold of 0.857, 512-token window. This is the *before* number the corpus exists to move; nothing here has been retrained.

**Overall AI detection on this corpus: 23/922 = 2.5%.** Against the objective's 50% floor on every long-form category, the shipped model clears it on none of them. The worst registers are not merely academic: long-form journalism, stories and academic discussion sections score 0.

Human false-positive rate at 0.857: **75/4636 = 1.6%**.

| register | AI detected @0.857 | human flagged @0.857 |
|---|---|---|
| academic-conclusion | - | 0/360 = 0.0% |
| academic-discussion | 0/113 = 0.0% | 3/420 = 0.7% |
| academic-essay | 1/132 = 0.8% | - |
| academic-introduction | - | 1/420 = 0.2% |
| academic-lit-review | 2/107 = 1.9% | 0/225 = 0.0% |
| company-update | 3/99 = 3.0% | 19/662 = 2.9% |
| longform-journalism | 0/137 = 0.0% | 5/840 = 0.6% |
| research-summary | 4/117 = 3.4% | 7/189 = 3.7% |
| story | 0/114 = 0.0% | 1/260 = 0.4% |
| student-essay | - | 0/420 = 0.0% |
| white-paper | 13/103 = 12.6% | 39/840 = 4.6% |

| model | detected @0.857 | median score |
|---|---|---|
| deepseek/deepseek-v4-pro-0813 | 1/131 = 0.8% | 0.202 |
| openai/gpt-5.6-luna | 1/121 = 0.8% | 0.327 |
| google/gemini-3.7-flash | 13/121 = 10.7% | 0.67 |
| x-ai/grok-4.6 | 0/121 = 0.0% | 0.148 |
| qwen/qwen3.8-max | 2/110 = 1.8% | 0.167 |
| meta-llama/llama-4-maverick | 3/101 = 3.0% | 0.173 |
| z-ai/glm-5.3 | 0/67 = 0.0% | 0.189 |
| mistralai/mistral-medium-3-5 | 1/41 = 2.4% | 0.843 |
| anthropic/claude-sonnet-5 | 0/26 = 0.0% | 0.171 |
| moonshotai/kimi-k3 | 1/26 = 3.8% | 0.232 |
| anthropic/claude-opus-5 | 0/23 = 0.0% | 0.157 |
| google/gemini-3.1-pro-preview | 0/21 = 0.0% | 0.16 |
| openai/gpt-5.6-sol-pro | 1/13 = 7.7% | 0.838 |

| prompt style | detected @0.857 |
|---|---|
| human-voice | 1/318 = 0.3% |
| house-brief | 4/310 = 1.3% |
| plain | 18/294 = 6.1% |

Score spread, which the objective treats as a first-class requirement:

| side | n | min | p5 | median | p95 | max |
|---|---|---|---|---|---|---|
| human | 4,636 | 0.142 | 0.144 | 0.193 | 0.856 | 0.858 |
| AI | 922 | 0.142 | 0.144 | 0.182 | 0.856 | 0.858 |

Those two rows are the finding. Human and AI long-form prose produce the same distribution to three decimal places at every quantile shown: the model is not separating them weakly, it is not separating them at all. The scores are also degenerate - they pile up near 0.14 and near 0.857 rather than spreading - which is the calibration failure the objective names as a first-class problem. A confidence figure built on this cannot be shown to a user.

One caveat on the comparison with the numbers in OBJECTIVE.md: those were measured against a different held-out human set and a different AI pool. This table is a fresh baseline on fresh data, not a restatement of that one.


## 6. Quarantine

| held-out source | texts |
|---|---|
| eval-samples.json | 34 |
| provider-eval/eval-set.jsonl | 1,896 |
| tests/battery/human-corpus-v1.json | 40 |
| tests/battery/human-corpus-v2.json | 4,144 |

Exact normalised-hash collisions: **0** (a single collision aborts the build).  
Near-duplicates dropped at 25% 12-word shingle overlap: **2**.  
Internal duplicates dropped: **505**.

