## Harness gate — server route (fp32)

This run's scorer against the canonical full-corpus store, section by section: **1051 documents, 4984 sections, max |Δ| = 0.0e+00** after rounding to the store's 4 dp, 0 segment-count disagreements.

| published figure | expected | canonical store, shipped pair |
|---|---|---|
| AI detected | 883 unrounded (884 at 4 dp) | **884/922** ✅ |
| human false positives | 45/4,636 | **45/4636** ✅ |
| fiction (`story`) | 23/260 | **23/260** ✅ |
| academic discussion | 8/420 | **8/420** ✅ |

The AI cell reads 884 because the store holds 4 dp; `AGGREGATION-AND-RHYTHM.md` §6 records exactly this — *"At 4 dp the shipped rule reads 57 false positives and the new pair reads 884 detections; unrounded they are 56 and 883."* The scorer used for every figure below is the one just shown to be identical to that store.


---

# Server route (fp32) — 2302 rows

### 1. Headline, with denominators

| population | flagged AI | n |
|---|---|---:|
| AI originals, untouched | **65.3%** [59.8–70.5] (196/300) | 300 |
| **AI originals after an LLM rewrite** | **74.1%** [71.0–76.9] (623/841) | 841 |
| human originals, untouched (false positives) | **1.0%** [0.3–2.9] (3/300) | 300 |
| **human originals after an LLM rewrite** | **10.9%** [9.0–13.2] (94/861) | 861 |

### 2. The paired comparison — of the AI sources we detect, how many survive the rewrite?

| | |
|---|---|
| AI sources detected before rewriting | **196/300** |
| their rewrites still detected | **95.6%** [93.6–97.1] (526/550) ← **survival** |
| lost to the rewrite | **24/550** |

| rewrite strength | survives | n |
|---|---|---:|
| light | **98.8%** [95.8–99.7] (167/169) | 169 |
| medium | **96.4%** [92.7–98.2] (187/194) | 194 |
| heavy | **92.0%** [87.2–95.1] (172/187) | 187 |

| rewriting model | survives | n |
|---|---|---:|
| `deepseek/deepseek-v4-pro-0813` | **94.7%** [88.1–97.7] (89/94) | 94 |
| `google/gemini-3.7-flash` | **99.1%** [95.2–99.8] (113/114) | 114 |
| `meta-llama/llama-4-maverick` | **91.9%** [85.8–95.6] (114/124) | 124 |
| `mistralai/mistral-medium-3-5` | **95.0%** [88.9–97.9] (96/101) | 101 |
| `openai/gpt-5.6-luna` | **97.4%** [92.7–99.1] (114/117) | 117 |

Human originals wrongly flagged **before** any rewrite: **3/300**; of their 9 rewrites, 9 are flagged.

### 3. By rewrite strength


**AI original → LLM rewrite**

| group | flagged AI | n |
|---|---|---:|
| light | **67.4%** [61.5–72.9] (174/258) | 258 |
| medium | **74.8%** [69.6–79.4] (220/294) | 294 |
| heavy | **79.2%** [74.2–83.5] (229/289) | 289 |

**human original → LLM rewrite (the HAT-Bench v6–v8 analogue is `heavy`)**

| group | flagged AI | n |
|---|---|---:|
| light | **1.4%** [0.5–3.5] (4/290) | 290 |
| medium | **11.0%** [8.0–15.1] (33/299) | 299 |
| heavy | **21.0%** [16.5–26.2] (57/272) | 272 |

### 4. By rewriting model


**AI original → LLM rewrite**

| group | flagged AI | n |
|---|---|---:|
| deepseek/deepseek-v4-pro-0813 | **70.8%** [62.9–77.6] (102/144) | 144 |
| google/gemini-3.7-flash | **83.4%** [77.3–88.1] (151/181) | 181 |
| meta-llama/llama-4-maverick | **68.4%** [61.5–74.7] (128/187) | 187 |
| mistralai/mistral-medium-3-5 | **79.3%** [71.8–85.2] (111/140) | 140 |
| openai/gpt-5.6-luna | **69.3%** [62.4–75.4] (131/189) | 189 |

**human original → LLM rewrite**

| group | flagged AI | n |
|---|---|---:|
| deepseek/deepseek-v4-pro-0813 | **7.5%** [4.4–12.4] (13/173) | 173 |
| google/gemini-3.7-flash | **19.9%** [14.9–26.0] (39/196) | 196 |
| meta-llama/llama-4-maverick | **3.3%** [1.5–6.9] (6/184) | 184 |
| mistralai/mistral-medium-3-5 | **17.9%** [12.3–25.3] (24/134) | 134 |
| openai/gpt-5.6-luna | **6.9%** [4.0–11.7] (12/174) | 174 |

### 5. By register


**AI original → LLM rewrite**

| group | flagged AI | n |
|---|---|---:|
| academic | **72.6%** [65.3–78.8] (119/164) | 164 |
| commercial-marketing | **82.8%** [76.5–87.6] (144/174) | 174 |
| fiction | **67.7%** [60.2–74.3] (113/167) | 167 |
| journalism | **72.2%** [65.0–78.4] (122/169) | 169 |
| technical-explainer | **74.9%** [67.8–80.8] (125/167) | 167 |

**human original → LLM rewrite**

| group | flagged AI | n |
|---|---|---:|
| academic | **18.2%** [13.2–24.5] (32/176) | 176 |
| commercial-marketing | **10.4%** [6.7–15.8] (18/173) | 173 |
| fiction | **16.9%** [12.0–23.2] (29/172) | 172 |
| journalism | **4.1%** [2.0–8.3] (7/170) | 170 |
| technical-explainer | **4.7%** [2.4–9.0] (8/170) | 170 |

### 6. By length — binned by achieved word count


**AI originals, untouched**

| words | flagged AI | n | median sections |
|---|---|---:|---:|
| <200 | **28.3%** [20.1–38.2] (26/92) | 92 | 1 |
| 200–399 | **76.2%** [66.1–84.0] (64/84) | 84 | 1 |
| 400–599 | **74.2%** [56.8–86.3] (23/31) | 31 | 2 |
| 600–899 | **89.2%** [81.3–94.1] (83/93) | 93 | 2 |

**AI original → LLM rewrite**

| words | flagged AI | n | median sections |
|---|---|---:|---:|
| <200 | **41.2%** [35.3–47.3] (105/255) | 255 | 1 |
| 200–399 | **85.2%** [80.5–88.8] (241/283) | 283 | 1 |
| 400–599 | **88.0%** [81.1–92.6] (110/125) | 125 | 2 |
| 600–899 | **93.8%** [89.3–96.5] (167/178) | 178 | 2 |

**human original → LLM rewrite**

| words | flagged AI | n | median sections |
|---|---|---:|---:|
| <200 | **3.1%** [1.7–5.8] (9/288) | 288 | 1 |
| 200–399 | **14.3%** [10.8–18.8] (42/293) | 293 | 1 |
| 400–599 | **23.5%** [16.8–31.9] (28/119) | 119 | 2 |
| 600–899 | **9.3%** [5.7–14.8] (15/161) | 161 | 2 |

### 7. Held-out splits


**AI original → LLM rewrite**

| group | flagged AI | n |
|---|---|---:|
| heldout_register | **74.9%** [67.8–80.8] (125/167) | 167 |
| heldout_rewriter | **79.3%** [71.8–85.2] (111/140) | 140 |
| heldout_source | **71.1%** [63.0–78.1] (96/135) | 135 |
| train | **72.9%** [68.4–77.1] (291/399) | 399 |

**human original → LLM rewrite**

| group | flagged AI | n |
|---|---|---:|
| heldout_register | **4.7%** [2.4–9.0] (8/170) | 170 |
| heldout_rewriter | **17.9%** [12.3–25.3] (24/134) | 134 |
| heldout_source | **11.3%** [7.1–17.6] (16/141) | 141 |
| train | **11.1%** [8.4–14.4] (46/416) | 416 |
