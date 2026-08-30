# Detection by document length, and by the model that wrote the text

Two tables, each complete in one place, each self-contained. The first is detection and score
distribution across the whole word-count range the tool sees, roughly 50 words to 5,000 and above.
The second is detection and score distribution per AI model and per provider.

Both are measured at the **shipped** operating point on the **shipped** detector. Nothing here
changes a threshold, a model or a published claim; it is the existing shipped configuration cut two
ways it had not been cut before.

**Why this file exists.** The length figures in circulation stopped at 600 words and folded
everything above into a single long-form bucket at 95.77%. The per-model figures were published at
the older single-threshold 0.984 operating point in
[`../PER-MODEL-DETECTION.md`](../PER-MODEL-DETECTION.md), and carried detection rates but no score
distribution. Neither existed in full, in one place.

**The rule every cell here follows.** AI documents and human documents are counted, and their
probabilities averaged, **separately**. A single average across both populations describes neither.
Every cell states its denominator. Where a cell has fewer than 30 documents, it prints the count
and says so instead of printing a rate.

---

## Harness reproduction — read this before using any figure

Every number below comes from one re-score of the corpora through the reference-server scoring
path, at full precision, keeping every segment probability so both arms of the flag rule can be
applied. Before any new cut was taken, that harness was required to reproduce the published
figures it should:

| published figure | source | this run |
|---|---|---|
| 883 / 922 AI detected, fp32, `0.9855/0.9763` | [`AGGREGATION-AND-RHYTHM.md`](AGGREGATION-AND-RHYTHM.md) §6 | **883 / 922** ✅ |
| 45 / 4,636 human false positives, same point | [`AGGREGATION-AND-RHYTHM.md`](AGGREGATION-AND-RHYTHM.md) §6 | **45 / 4,636** ✅ |
| 877 / 922 and 56 / 4,636 at the prior 0.984 max-only rule | [`SEGMENT-TOKEN-FIX.md`](SEGMENT-TOKEN-FIX.md) §6.1 | **877 / 922**, **56 / 4,636** ✅ |
| short-form pilot by band at 0.9845 max-only: 44/195, 175/206, 169/208, 194/207 | [`SHORT-FORM-RETRAIN.md`](SHORT-FORM-RETRAIN.md) §7.1 | **44/195, 175/206, 169/208, 194/207** ✅ |
| short-form human false positives at 0.9845 max-only: 24 / 4,368 | [`SHORT-FORM-RETRAIN.md`](SHORT-FORM-RETRAIN.md) §8 | **24 / 4,368** ✅ |
| all 13 per-model cells at 0.984 | [`../PER-MODEL-DETECTION.md`](../PER-MODEL-DETECTION.md) §1 | **13 / 13 identical** ✅ |

All six reproduce exactly, on both corpora, from a fresh re-score. The 5,616 short-form documents
had never been scored at the shipped `0.9855/0.9763` pair before this run — the published
short-form figures were taken at a `0.9845` maximum-only threshold that does not ship — so every
short-form figure in this file is new, and the 0.9845 reproduction above is what licenses it.

### The checkpoint trap, stated so it is not walked into again

`generated-corpus/scored-tier3.json` and everything under `research/current-models/` were produced
by the **retired cycle-1 detector**. Their probabilities span 0.1427 to 0.8582 and cannot reach any
shipped flag point. **No figure in this file reuses any of them.** Provenance for every number
here: the `tier3-cycle2-e5small-fp32.onnx` file named in the table headers, SHA-256
`e313ab00de1fffd28d6157f014065b50bca8b59a8842746e54fe8b1504d2788d`, re-scored on 30 August 2026.

---

## Table 1 — detection and score distribution by document length

| | |
|---|---|
| **Detector** | cycle-2, `tier3-cycle2-e5small-fp32.onnx`, SHA-256 `e313ab00de1fffd2…4d2788d` — the fp32 parent of the shipped int8 browser artefact, and the file the EU inference server runs |
| **Operating point** | the **shipped** pair: flagged when the strongest section reaches **0.9855**, or the second-strongest reaches **0.9763**. Applied to the temperature-calibrated probability, T = 0.8324 |
| **Pipeline** | `segments-v3` token-bounded segmentation; the reported document probability is the **maximum** across sections, exactly as `/v1/check` reports it |
| **Runtime** | Python `onnxruntime` 1.29.0, CPU, fp32 — the reference-server scoring path. **Not a browser measurement**; see the runtime note below |
| **Corpora** | **short-form**: 816 AI passages generated 29 August 2026 (`openai/gpt-5.6-sol`, `openai/gpt-5.6-luna`, four target lengths × three prompt styles) and 4,368 human passages from 9 sources. **long-form**: the 5,558-document held-out corpus of 28 August 2026 — 922 AI across 13 models, 4,636 human — hash-quarantined against every training split |
| **Measured** | 30 August 2026 |
| **Bands** | chosen from the corpora's own word-count distribution, not from round numbers. Short-form spans 45–839 words, long-form 400–11,790 |
| **Read as** | *"of documents this long, how many were flagged, and what did the two populations score"* — never as a single average across both |

Two corpora cover this range, and they overlap between 400 and 849 words. **Each row states which
corpus it comes from**; the two are never pooled into one cell, because they were generated
differently, by different models, in different registers.

| words | corpus | AI n | AI flagged | AI detection rate [95% CI] | mean p, AI | median p, AI | human n | human flagged | human false-positive rate [95% CI] | mean p, human | median p, human |
|---|---|---:|---:|---|---:|---:|---:|---:|---|---:|---:|
| under 100 | short-form | 27 | 6 | n below 30 — no rate quoted | 0.8253 | 0.9419 | 388 | 0 | **0.0%** [0.0, 1.0] | 0.1785 | 0.1069 |
| 100–199 | short-form | 172 | 29 | **16.9%** [12.0, 23.2] | 0.8457 | 0.9732 | 732 | 0 | **0.0%** [0.0, 0.5] | 0.1677 | 0.0956 |
| 200–299 | short-form | 19 | 16 | n below 30 — no rate quoted | 0.9733 | 0.9891 | 822 | 3 | **0.4%** [0.1, 1.1] | 0.2104 | 0.0884 |
| 300–399 | short-form | 228 | 193 | **84.6%** [79.4, 88.8] | 0.9688 | 0.9893 | 1,170 | 9 | **0.8%** [0.4, 1.5] | 0.2058 | 0.0768 |
| 400–599 | short-form | 199 | 161 | **80.9%** [74.9, 85.8] | 0.9605 | 0.9890 | 1,167 | 10 | **0.9%** [0.5, 1.6] | 0.3074 | 0.1825 |
| 400–599 | long-form | 3 | 3 | n below 30 — no rate quoted | 0.9881 | 0.9876 | 826 | 3 | **0.4%** [0.1, 1.1] | 0.4048 | 0.3081 |
| 600–849 | short-form | 171 | 161 | **94.2%** [89.6, 96.8] | 0.9818 | 0.9896 | 86 | 0 | **0.0%** [0.0, 4.3] | 0.4049 | 0.3368 |
| 600–849 | long-form | 52 | 46 | **88.5%** [77.0, 94.6] | 0.9866 | 0.9883 | 894 | 2 | **0.2%** [0.1, 0.8] | 0.4144 | 0.3551 |
| 850–1,199 | short-form | 0 | — | no documents | — | — | 3 | 0 | n below 30 — no rate quoted | 0.5087 | 0.4679 |
| 850–1,199 | long-form | 193 | 175 | **90.7%** [85.7, 94.0] | 0.9875 | 0.9898 | 1,050 | 30 | **2.9%** [2.0, 4.0] | 0.4735 | 0.4546 |
| 1,200–1,699 | long-form | 265 | 259 | **97.7%** [95.1, 99.0] | 0.9893 | 0.9901 | 1,237 | 3 | **0.2%** [0.1, 0.7] | 0.3694 | 0.2647 |
| 1,700–2,399 | long-form | 279 | 271 | **97.1%** [94.4, 98.5] | 0.9886 | 0.9899 | 461 | 6 | **1.3%** [0.6, 2.8] | 0.5724 | 0.6331 |
| 2,400–3,499 | long-form | 130 | 129 | **99.2%** [95.8, 99.9] | 0.9894 | 0.9901 | 134 | 0 | **0.0%** [0.0, 2.8] | 0.6565 | 0.7533 |
| 3,500–4,999 | long-form | 0 | — | no documents | — | — | 21 | 0 | n below 30 — no rate quoted | 0.6580 | 0.6988 |
| 5,000 and above | long-form | 0 | — | no documents | — | — | 13 | 1 | n below 30 — no rate quoted | 0.9049 | 0.9659 |
| **all lengths** | **short-form** | 816 | 566 | **69.4%** [66.1, 72.4] | 0.9389 | 0.9887 | 4,368 | 22 | **0.5%** [0.3, 0.8] | 0.2291 | 0.1099 |
| **all lengths** | **long-form** | 922 | 883 | **95.8%** [94.3, 96.9] | 0.9886 | 0.9900 | 4,636 | 45 | **1.0%** [0.7, 1.3] | 0.4393 | 0.3766 |

### What Table 1 says

**Length is the dominant axis, and the cliff is below 200 words.** Binned by *achieved* word count
rather than by the length a generator was asked for, 100–199 words detects **16.9%** (29/172) —
lower than the 22.6% published for the "100-word" band, which grouped by target length and so
included passages that came back at 200-plus words. Above 300 words the trend is upward but not
monotone — short-form reads 84.6%, then 80.9%, then 94.2%, and long-form 88.5%, 90.7%, 97.7%,
97.1%, 99.2% — so the axis is a gradient with noise on it, not a clean staircase.

**The headline is a long-document figure.** 95.77% describes a corpus whose median AI document is
1,612 words. At 600–849 words the same detector reads **88.5%** (46/52) on that corpus, and at
850–1,199 words **90.7%** (175/193). A user pasting an 800-word blog post is not getting the
headline rate.

**Human false positives do not rise with length in any straight line, and the one band that looks
bad is a register effect.** The 850–1,199 band reads 2.9% (30/1,050), three times the corpus
average. **22 of those 30 are human fiction.** Human fiction's median length is 1,190 words, so
241 of the corpus's 260 human stories land in that one band. Excluding it, the band reads **8/809 = 0.99%**, in line
with the corpus as a whole, and fiction inside the band reads 22/241 = 9.1% — the known fiction
weakness recorded in [`programme/HANDOVER.md`](../programme/HANDOVER.md) §9, reappearing here as a
length band because of where fiction happens to sit on the axis. **Do not read that cell as
"detection is unreliable around a thousand words".**

**The mean human probability climbs with length while the false-positive rate does not.** This is
arithmetic, not drift: the reported probability is the maximum across sections, and a longer
document offers more sections for the maximum to be drawn from. It is why the two populations must
never be averaged together, and why the median is printed beside the mean.

**Above 3,000 words there is no AI data at all.** The corpus's longest AI document is 3,061 words.
The 3,500–4,999 and 5,000-and-above bands contain **only human documents**, 21 and 13 of them, and
both are below the 30-document floor. **This project has not measured AI detection above 3,061
words, and no rate should be inferred for it.** The server refuses documents over 4,000 words
anyway (413, with the browser route offered), so the unmeasured range starts inside what the server
will accept and continues past it.

### The keyword-repetition arm, fenced separately

The remaining 432 short-form AI documents were generated to be **deliberately keyword-repetitive**,
as a test of the type-token-ratio evasion axis in [`SHORT-FORM-RETRAIN.md`](SHORT-FORM-RETRAIN.md)
§7.4. They are an adversarial condition, not a sample of ordinary short text, and pooling them into
the table above would understate the detector against normal copy in the same way that omitting
them would overstate it against SEO copy. Same detector, same operating point, same runtime, same
date:

| words | corpus | AI n | AI flagged | AI detection rate [95% CI] | mean p, AI | median p, AI | human n | human flagged | human false-positive rate [95% CI] | mean p, human | median p, human |
|---|---|---:|---:|---|---:|---:|---:|---:|---|---:|---:|
| under 100 | keyword-repetition | 16 | 2 | n below 30 — no rate quoted | 0.6358 | 0.9419 | 0 | — | no documents | — | — |
| 100–199 | keyword-repetition | 57 | 8 | **14.0%** [7.3, 25.3] | 0.6295 | 0.8419 | 0 | — | no documents | — | — |
| 200–299 | keyword-repetition | 9 | 3 | n below 30 — no rate quoted | 0.7776 | 0.9363 | 0 | — | no documents | — | — |
| 300–399 | keyword-repetition | 136 | 61 | **44.9%** [36.7, 53.2] | 0.7610 | 0.9809 | 0 | — | no documents | — | — |
| 400–599 | keyword-repetition | 124 | 58 | **46.8%** [38.2, 55.5] | 0.8192 | 0.9825 | 0 | — | no documents | — | — |
| 600–849 | keyword-repetition | 90 | 56 | **62.2%** [51.9, 71.5] | 0.9203 | 0.9876 | 0 | — | no documents | — | — |
| **all lengths** | **keyword-repetition** | 432 | 188 | **43.5%** [38.9, 48.2] | 0.7892 | 0.9806 | 0 | — | no documents | — | — |

The human columns are empty because there is no matched human keyword-repetition corpus; the human
side of this axis has not been generated. The length gradient survives the condition — 14.0% at
100–199 rising to 62.2% at 600–849 — but every band sits far below its counterpart above. **This is
the weakness that lands on the tool's own commercial users**, and it is recorded as such in
[`programme/HANDOVER.md`](../programme/HANDOVER.md) §9 item 2.

---

## Table 2 — detection and score distribution by the model that wrote the text

| | |
|---|---|
| **Detector** | cycle-2, `tier3-cycle2-e5small-fp32.onnx`, SHA-256 `e313ab00de1fffd2…4d2788d` |
| **Operating point** | the **shipped** pair **0.9855 / 0.9763**, minimum-evidence rule, T = 0.8324. **This is not the 0.984 point** used in [`../PER-MODEL-DETECTION.md`](../PER-MODEL-DETECTION.md) §1; the two tables are the same corpus through two operating points and their rows differ |
| **Pipeline** | `segments-v3` token-bounded segmentation, maximum across sections |
| **Runtime** | Python `onnxruntime` 1.29.0, CPU, fp32 — the reference-server scoring path |
| **Corpus** | the 5,558-document held-out long-form corpus of 28 August 2026: **922 AI documents across 13 models**, generated through OpenRouter after the cycle-2 model was trained and hash-quarantined against every training split; scored alongside 4,636 human documents at **45 / 4,636 = 0.97%** false positives |
| **Measured** | 30 August 2026 |
| **Read as** | *"of what this model writes, how much is flagged, and how confident is the detector when it reads it"* |

There is no per-model false-positive column, and there cannot be: a false positive belongs to a
human writer, not to a model. The human false-positive rate at this exact operating point is
45/4,636 = 0.97% overall, and is broken down by register in
[`../TEST-EVIDENCE.md`](../TEST-EVIDENCE.md).

### Per model

| model | n | flagged | detection rate [95% CI] | mean p | median p |
|---|---:|---:|---|---:|---:|
| `openai/gpt-5.6-luna` | 121 | 121 | **100.0%** [96.9, 100.0] | 0.9900 | 0.9901 |
| `mistralai/mistral-medium-3-5` | 41 | 41 | **100.0%** [91.4, 100.0] | 0.9899 | 0.9901 |
| `anthropic/claude-sonnet-5` | 26 | 26 | n below 30 — no rate quoted | 0.9899 | 0.9901 |
| `moonshotai/kimi-k3` | 26 | 26 | n below 30 — no rate quoted | 0.9898 | 0.9900 |
| `google/gemini-3.1-pro-preview` | 21 | 21 | n below 30 — no rate quoted | 0.9900 | 0.9901 |
| `openai/gpt-5.6-sol-pro` | 13 | 13 | n below 30 — no rate quoted | 0.9903 | 0.9903 |
| `qwen/qwen3.8-max` | 110 | 109 | **99.1%** [95.0, 99.8] | 0.9896 | 0.9900 |
| `z-ai/glm-5.3` | 67 | 66 | **98.5%** [92.0, 99.7] | 0.9897 | 0.9901 |
| `deepseek/deepseek-v4-pro-0813` | 131 | 128 | **97.7%** [93.5, 99.2] | 0.9890 | 0.9898 |
| `google/gemini-3.7-flash` | 121 | 118 | **97.5%** [93.0, 99.2] | 0.9886 | 0.9901 |
| `x-ai/grok-4.6` | 121 | 113 | **93.4%** [87.5, 96.6] | 0.9881 | 0.9895 |
| `anthropic/claude-opus-5` | 23 | 21 | n below 30 — no rate quoted | 0.9850 | 0.9901 |
| `meta-llama/llama-4-maverick` | 101 | 80 | **79.2%** [70.3, 86.0] | 0.9842 | 0.9873 |
| **all** | **922** | **883** | **95.8%** [94.3, 96.9] | **0.9886** | **0.9900** |

### Per provider

| provider | n | flagged | detection rate [95% CI] | mean p | median p |
|---|---:|---:|---|---:|---:|
| `openai` | 134 | 134 | **100.0%** [97.2, 100.0] | 0.9900 | 0.9902 |
| `mistral` | 41 | 41 | **100.0%** [91.4, 100.0] | 0.9899 | 0.9901 |
| `moonshot` | 26 | 26 | n below 30 — no rate quoted | 0.9898 | 0.9900 |
| `qwen` | 110 | 109 | **99.1%** [95.0, 99.8] | 0.9896 | 0.9900 |
| `zai` | 67 | 66 | **98.5%** [92.0, 99.7] | 0.9897 | 0.9901 |
| `google` | 142 | 139 | **97.9%** [94.0, 99.3] | 0.9888 | 0.9901 |
| `deepseek` | 131 | 128 | **97.7%** [93.5, 99.2] | 0.9890 | 0.9898 |
| `anthropic` | 49 | 47 | **95.9%** [86.3, 98.9] | 0.9876 | 0.9901 |
| `xai` | 121 | 113 | **93.4%** [87.5, 96.6] | 0.9881 | 0.9895 |
| `meta` | 101 | 80 | **79.2%** [70.3, 86.0] | 0.9842 | 0.9873 |
| **all** | **922** | **883** | **95.8%** [94.3, 96.9] | **0.9886** | **0.9900** |

### What Table 2 says

**Adding the probability distribution changes how the detection column should be read.** All
thirteen models sit at a median probability between 0.9873 and 0.9903 — a spread of three
thousandths across the whole field. The detector is not *less certain* about the models it catches less often;
it is equally certain about most of their documents and loses a tail. `meta-llama/llama-4-maverick`
has both the lowest detection rate (79.2%) and the lowest mean (0.9842), but its **median** is
0.9873 — still above the flag point. Its misses are a minority tail, not a shifted distribution.

**`anthropic/claude-opus-5` shows the mean-versus-median split most clearly**: mean 0.9850, median
0.9901. Two documents in twenty-three drag the mean below the flag point while the median sits
above it. This is exactly why both are printed, and why a mean alone would have been misleading.

**Six rows are below 30 documents and print counts only.** `claude-sonnet-5` (26), `kimi-k3` (26),
`claude-opus-5` (23), `gemini-3.1-pro-preview` (21) and `gpt-5.6-sol-pro` (13), plus the `moonshot`
provider row. They are shown because omitting them would hide the corpus, not because 13 documents
estimate anything. A 21/23 is not "91.3%" in any sense that should travel.

**The shipped pair moves four rows against the 0.984 figures already published**, and the
movement is not all in one direction. `meta-llama/llama-4-maverick` rises from 73/101 to
**80/101** and `deepseek-v4-pro-0813` from 127/131 to **128/131**; `x-ai/grok-4.6` falls from
114/121 to **113/121** and `google/gemini-3.7-flash` from 119/121 to **118/121**. The other nine
rows are identical. Neither table is wrong: they are two operating points, and
[`../PER-MODEL-DETECTION.md`](../PER-MODEL-DETECTION.md) states 0.984 in its own header. Do not
place a row from one beside a row from the other.

The seven documents `llama-4-maverick` gains are the largest single effect the second-section arm
has on any model, and it is consistent with the length confound below: short documents have fewer
sections, so a rule that reads two of them changes more verdicts where there are only two or three
to read.

**Model rank and document length are confounded in this corpus, and the confound runs the wrong
way for a clean reading.** The two lowest-scoring models are also the two that wrote the shortest
documents: `llama-4-maverick` has a median of 905 words and `grok-4.6` 1,176, against 2,263 for
`gpt-5.6-luna` and 2,144 for `deepseek-v4-pro`. Restricted to documents of 1,200 words or more the
corpus detects 659/674 = 97.8%, against 224/248 = 90.3% below that. **A per-model-by-length
cross-tabulation was not produced**: at 922 documents across 13 models and 8 bands the cells would
average nine documents, which is below the floor this file applies everywhere else. The honest
statement is that Table 2's ordering is partly a length ordering, and that separating the two would
need a length-balanced generation run this project has not done.

### Short-form, per model — two models only

The short-form corpus was generated from two OpenAI models, so it supports a two-row per-model
table and no provider comparison at all. Same detector, same shipped operating point, same runtime,
measured 30 August 2026. The length × style pilot arm, 816 documents:

| model | n | flagged | detection rate [95% CI] | mean p | median p |
|---|---:|---:|---|---:|---:|
| `openai/gpt-5.6-sol` | 401 | 283 | **70.6%** [65.9, 74.8] | 0.9360 | 0.9889 |
| `openai/gpt-5.6-luna` | 415 | 283 | **68.2%** [63.6, 72.5] | 0.9417 | 0.9885 |
| **all** | **816** | **566** | **69.4%** [66.1, 72.4] | **0.9389** | **0.9887** |

The keyword-repetition arm, 432 documents, adversarial by design:

| model | n | flagged | detection rate [95% CI] | mean p | median p |
|---|---:|---:|---|---:|---:|
| `openai/gpt-5.6-sol` | 199 | 88 | **44.2%** [37.5, 51.2] | 0.7622 | 0.9797 |
| `openai/gpt-5.6-luna` | 233 | 100 | **42.9%** [36.7, 49.3] | 0.8124 | 0.9809 |
| **all** | **432** | **188** | **43.5%** [38.9, 48.2] | **0.7892** | **0.9806** |

Model makes no material difference on either arm — the intervals overlap in both — which reproduces
the finding in [`SHORT-FORM-RETRAIN.md`](SHORT-FORM-RETRAIN.md) §7.2 at the shipped operating point
rather than at the 0.9845 one it was taken at. **No per-provider short-form table exists**, because
the corpus has one provider.

---

## What is not here

- **Any browser measurement.** Every figure is fp32 through Python `onnxruntime`. The browser runs
  int8 through `onnxruntime-web`, and the two agree to a median 0.0002 in the decision region, but
  a proxy is not the thing. The browser's own full-corpus segmented curve has never been measured;
  that gap is [`programme/HANDOVER.md`](../programme/HANDOVER.md) §13 and this file does not close
  it. **Do not mix a browser figure into any cell above.**
- **AI text above 3,061 words.** No corpus in this project contains one.
- **Human short-form above about 1,000 words**, or long-form AI below 450. Each corpus stops where
  it stops, and the bands say so.
- **A per-model-by-length cross-tabulation.** See above: the cells would be too thin to mean
  anything.
- **A matched human corpus for the keyword-repetition condition.** Only the AI side exists.
- **Anything about edited text.** Every AI document here is fully model-generated. AI rewrites of a
  human original are detected 30–35%, and human text a model tidied is deliberately not flagged.

## Reproducing this

Score `longform-corpus/{ai,human}-longform.jsonl` and the short-form corpora through
`corpus-reconciliation-2026-08-29/harness.py` — which loads `segment_text` and the fp32 model from
`model-shrink/reference-server` — keeping **every** section probability at full precision rather
than the 4 dp `lf-*.jsonl` stores, because the secondary arm is decided by single-digit numbers of
documents. Flag a document when its highest section reaches 0.9855 or its second-highest reaches
0.9763. Group by the `word_count`, `model` and `provider` fields of the corpus files. Totals must
come to 883/922 and 45/4,636 on the long-form corpus; the short-form re-score must reproduce
44/195, 175/206, 169/208 and 194/207 at the older 0.9845 maximum-only threshold before any figure
at the shipped pair is trusted.

Python needs `transformers` and `onnxruntime`; the project venv is
`services/local-engine/research/current-models/.venv/bin/python3`.
