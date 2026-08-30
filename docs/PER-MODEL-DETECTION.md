# Per-model detection — which models this tool catches, and which it misses

> **CORRECTION, 30 August 2026 — the 5,558-document long-form corpus is not fully held out.**
> It is described below, and was published on opace.agency, as held out and hash-quarantined
> against every training split. That is false for the AI half. Of the 922 AI documents, **654 are
> independent of every cycle-2 split and 268 are not** — 168 in the training split, 72 in test, 28
> in calibration. The human half is effectively independent: 11 of 4,636 appear in a cycle-2 split.
> Every rate in this document pools both subsets.
>
> The difference has been measured at **one operating point only, and it is not the shipped one**.
> At the superseded `0.984` single-threshold rule: independent **620/654 = 94.80%**, seen-in-cycle-2
> **257/268 = 95.90%**, of which the training split alone **163/168 = 97.02%** — a gap of **1.1
> percentage points**. **No seen-against-unseen split has been measured at the shipped
> `0.9855`/`0.9763` pair**, so none is published for it, and the 1.1-point figure must not be quoted
> under a shipped-pair heading. A re-measurement at the shipped pair is outstanding.
>
> Source: [`../../services/local-engine/research/corpus-reconciliation-2026-08-29/analysis.txt`](../../services/local-engine/research/corpus-reconciliation-2026-08-29/analysis.txt), section 2.


Detection rates broken down by the model that wrote the text. Every table below states, in its
own header, the five things that decide whether a number means anything here:

**which detector checkpoint produced the scores · at which threshold · in which runtime ·
on which corpus · with n on every row.**

That is not ceremony. This project has retracted figures three times, and each retraction came
from a number that had lost one of those five. Two of them were per-model tables measured on a
detector we no longer ship. Sections 1 to 3 are the deployed model. Section 5 is the retired one,
kept because it is the record of what was replaced, and fenced off because **its numbers and the
deployed model's numbers are not comparable and must never be placed in the same table**.

Corpus composition — which models generated the AI documents, and how many each wrote — is in
[section 4](#4-which-models-wrote-the-ai-documents). The owner asked for that specifically and it
was not stated anywhere public before this file.

Read alongside [`MEASURED-FINDINGS.md`](MEASURED-FINDINGS.md) (four results published in full),
[`TEST-EVIDENCE.md`](TEST-EVIDENCE.md) (the per-register companion to section 1) and
[`EVIDENCE-INDEX.md`](EVIDENCE-INDEX.md) (every artefact, with paths).

---

## 1. The headline — deployed model, shipped threshold, partly-seen corpus

| | |
|---|---|
| **Detector** | cycle-2, `tier3-cycle2-e5small-fp32.onnx` — the fp32 parent of the shipped int8 browser artefact, and the file the EU inference server runs |
| **Threshold** | **0.984**, the shipped flag point, applied to the temperature-calibrated probability (T = 0.8324) |
| **Pipeline** | `segments-v2` token-bounded segmentation, **maximum** over segments, exactly as `/v1/check` scores a document |
| **Runtime** | Python `onnxruntime` 1.29.0 on the reference server's own scoring path, CPU |
| **Corpus** | `research/longform-corpus/` — 5,558 documents (922 AI, 4,636 human). **NOT fully held out**: 654 of the 922 AI documents are independent of every cycle-2 split and 268 are not (see the correction at the top) |
| **Human false positives at the same point** | **56 of 4,636 = 1.21%** |

**AI detection by the model that wrote the document.** Denominator is that model's document count
in the corpus; the corpus was built with a near-even register mix per model, so these rows are
broadly comparable with each other.

| model | n | detected @ 0.984 (browser flag point) | detected @ 0.980 (server flag point) |
|---|---:|---:|---:|
| `openai/gpt-5.6-luna` | 121 | **100.0%** (121/121) | 100.0% (121/121) |
| `mistralai/mistral-medium-3-5` | 41 | **100.0%** (41/41) | 100.0% (41/41) |
| `anthropic/claude-sonnet-5` | 26 | **100.0%** (26/26) | 100.0% (26/26) |
| `moonshotai/kimi-k3` | 26 | **100.0%** (26/26) | 100.0% (26/26) |
| `google/gemini-3.1-pro-preview` | 21 | **100.0%** (21/21) | 100.0% (21/21) |
| `openai/gpt-5.6-sol-pro` | 13 | **100.0%** (13/13) | 100.0% (13/13) |
| `qwen/qwen3.8-max` | 110 | **99.1%** (109/110) | 99.1% (109/110) |
| `z-ai/glm-5.3` | 67 | **98.5%** (66/67) | 100.0% (67/67) |
| `google/gemini-3.7-flash` | 121 | **98.3%** (119/121) | 98.3% (119/121) |
| `deepseek/deepseek-v4-pro-0813` | 131 | **96.9%** (127/131) | 98.5% (129/131) |
| `x-ai/grok-4.6` | 121 | **94.2%** (114/121) | 96.7% (117/121) |
| `anthropic/claude-opus-5` | 23 | **91.3%** (21/23) | 91.3% (21/23) |
| `meta-llama/llama-4-maverick` | 101 | **72.3%** (73/101) | 82.2% (83/101) |
| **all 13 models** | **922** | **95.1%** (877/922) | **96.9%** (893/922) |

The two totals are the same 877/922 and 893/922 published in
[`measurements/SEGMENT-TOKEN-FIX.md`](measurements/SEGMENT-TOKEN-FIX.md) §6.1, from the same run.
This table is that run split by model. It was also **re-scored from scratch before publication**:
all 5,558 documents put back through `segment_text` and the fp32 model on a clean session,
producing the same 21,093 segments and the same 877/922, 893/922, 56/4,636 and 97/4,636, and every
per-model cell identical. The split is a slice of a published measurement, replicated, not a new
claim.

### What the table says

- **Twelve of the thirteen models are caught more than nine times in ten.** The tool is not
  model-specific in any way that matters at this operating point.
- **`meta-llama/llama-4-maverick` is the one clear miss at 72.3%**, and it is the oldest model in
  the corpus (April 2025 — the newest Meta instruct model that exists). Its weakness is
  concentrated in academic registers: 5 of 17 academic essays detected, 7 of 13 literature
  reviews, 8 of 13 discussions, against 15 of 15 for long-form journalism and 13 of 13 for
  stories. Read that as a register interaction, not a model-family result.
- **`anthropic/claude-opus-5` at 91.3% rests on 23 documents.** Two misses move it 8.7 points.
  It is the hardest model against the *retired* detector by a wide margin (section 5.2), so it is
  the row most worth re-measuring on more data, not the row to quote confidently.
- Rows with n under 30 (`claude-sonnet-5`, `kimi-k3`, `gemini-3.1-pro-preview`, `claude-opus-5`,
  `gpt-5.6-sol-pro`) are shown because omitting them would hide the corpus, not because a
  13-document 100% is an estimate of anything.

### Same corpus, same threshold, cut three other ways

| provider | n | detected @ 0.984 |
|---|---:|---:|
| openai | 134 | 100.0% (134/134) |
| mistral | 41 | 100.0% (41/41) |
| moonshot | 26 | 100.0% (26/26) |
| qwen | 110 | 99.1% (109/110) |
| google | 142 | 98.6% (140/142) |
| zai | 67 | 98.5% (66/67) |
| deepseek | 131 | 96.9% (127/131) |
| anthropic | 49 | 95.9% (47/49) |
| xai | 121 | 94.2% (114/121) |
| meta | 101 | 72.3% (73/101) |

| model tier | n | detected @ 0.984 |
|---|---:|---:|
| pro-flagship | 83 | 97.6% (81/83) |
| standard | 496 | 97.4% (483/496) |
| flash-or-mini | 343 | 91.3% (313/343) |

The flagship-versus-cheap gap has closed and reversed. On the retired detector, flash and mini
models were caught 51.8% of the time against 35.3% for pro and flagship — a 16.5-point penalty
for paying (section 5.1). Here the flagship tier is *marginally easier*, and the whole spread is
6.3 points. The flash-or-mini row is dragged by `llama-4-maverick`, which sits in that tier.

| prompt style | n | detected @ 0.984 |
|---|---:|---:|
| plain | 294 | 96.3% (283/294) |
| human-voice ("write like a human") | 318 | 95.3% (303/318) |
| house-brief | 310 | 93.9% (291/310) |

**This closes an open item.** [`MEASURED-FINDINGS.md`](MEASURED-FINDINGS.md) §1 and
[`programme/HANDOVER.md`](programme/HANDOVER.md) §9.7 both record that no prompt-style split had
been measured on a corpus independent of the generation run the model was trained against. This
corpus is that corpus — a separate later generation run — and it does carry `prompt_style`
labels. **Read the correction at the top before quoting this**: only 654 of its 922 AI documents
are independent of every cycle-2 split. The prompt-style split has been recomputed on the
independent subset alone, at the superseded `0.984` rule, and it holds: plain 200/207 = 96.62%,
house-brief 209/224 = 93.30%, human-voice 211/223 = 94.62%. The evasion axis holds on it:
95.3% against 96.3%, a 1.0-point cost for the explicit anti-AI instruction, against the
36.1-point collapse the same instruction caused on the retired detector. Those two documents
should be updated; they are not edited here because this file does not have the authority to
change a published claim, only to add a sourced measurement beside it.

### What this table is not

- **Not a browser measurement.** The browser runs int8 through `onnxruntime-web`. The fp32
  reference route is the documented proxy for it — the two disagree by a median 0.0002 in the
  decision region ([`programme/HANDOVER.md`](programme/HANDOVER.md) §4.4) — but a proxy is not
  the thing. The browser's own full-corpus segmented curve has never been measured; that gap is
  recorded in HANDOVER §13 and is not closed by this file.
- **Not a false-positive table.** Detection rates alone are half a detector. The human
  false-positive rate at this exact operating point is 1.21% overall, and it is 12.69% on human
  fiction at the server's 0.980. Per-register false positives are in
  [`TEST-EVIDENCE.md`](TEST-EVIDENCE.md).
- **Not a claim about edited text.** Every AI document here is fully model-generated. AI rewrites
  of a human original are detected 30–35%, and text a person wrote that a model tidied is
  deliberately not flagged at all.

---

## 2. The same 13 models on the exact int8 file the browser downloads

Same corpus, same deployed model family — but the int8 per-channel artefact rather than its fp32
parent, and **without segmentation**: one 512-token pass per document, the whole tail unseen.

| | |
|---|---|
| **Detector** | cycle-2, `tier3-cycle2-e5small-int8-perchannel.onnx` — the 34.3 MB file the browser fetches |
| **Threshold** | fitted to a measured false-positive rate on the 4,636 humans, not a fixed probability. The 1.22% column is the budget that matches the shipped 0.984's realised 1.21% |
| **Pipeline** | single pass, truncated at 512 tokens. **Not the shipped pipeline** |
| **Runtime** | Python `onnxruntime`, CPU |
| **Corpus** | the same 5,558 documents, 268 of whose 922 AI half the model had already seen (see the correction at the top) |
| **Source** | [`../services/local-engine/research/model-shrink/results/01-baseline.json`](../services/local-engine/research/model-shrink/results/01-baseline.json) and the per-document margins beside it |

Why publish a second view at all: the 0.984 probability threshold was refitted through
`onnxruntime-web` and cannot be carried onto Python int8 scores, because those two runtimes
disagree by a median 0.113 on this artefact. Fitting to a false-positive rate instead is the way
to compare the int8 weights honestly.

| model | n | detected @ 1% FP | @ 1.22% FP | @ 2% FP |
|---|---:|---:|---:|---:|
| `openai/gpt-5.6-sol-pro` | 13 | 100.0% (13) | 100.0% (13) | 100.0% (13) |
| `google/gemini-3.1-pro-preview` | 21 | 100.0% (21) | 100.0% (21) | 100.0% (21) |
| `anthropic/claude-sonnet-5` | 26 | 96.2% (25) | 100.0% (26) | 100.0% (26) |
| `mistralai/mistral-medium-3-5` | 41 | 97.6% (40) | 97.6% (40) | 97.6% (40) |
| `openai/gpt-5.6-luna` | 121 | 97.5% (118) | 97.5% (118) | 100.0% (121) |
| `qwen/qwen3.8-max` | 110 | 95.5% (105) | 96.4% (106) | 97.3% (107) |
| `z-ai/glm-5.3` | 67 | 95.5% (64) | 95.5% (64) | 97.0% (65) |
| `anthropic/claude-opus-5` | 23 | 91.3% (21) | 91.3% (21) | 91.3% (21) |
| `google/gemini-3.7-flash` | 121 | 89.3% (108) | 90.9% (110) | 91.7% (111) |
| `deepseek/deepseek-v4-pro-0813` | 131 | 88.5% (116) | 89.3% (117) | 93.1% (122) |
| `moonshotai/kimi-k3` | 26 | 88.5% (23) | 88.5% (23) | 92.3% (24) |
| `x-ai/grok-4.6` | 121 | 80.2% (97) | 80.2% (97) | 85.1% (103) |
| `meta-llama/llama-4-maverick` | 101 | 62.4% (63) | 64.4% (65) | 80.2% (81) |
| **all 13 models** | **922** | **88.3%** (814) | **89.0%** (821) | **92.7%** (855) |

The three totals reproduce the 814, 821 and 855 already published in `01-baseline.json`.

**Read the gap between this table and section 1 as the value of segmentation, not as a
quantisation cost.** Same weights, same corpus, same false-positive budget: 89.0% here against
95.1% with `segments-v2` max-aggregation. Averaging or truncating a long document lets a
half-machine document look human — the finding recorded in
[`programme/HANDOVER.md`](programme/HANDOVER.md) §4.2. The int8-versus-fp32 difference on this
same single-pass path is five documents in 922.

`meta-llama/llama-4-maverick` and `x-ai/grok-4.6` are the two models most helped by segmentation
(72.3% against 64.4%, and 94.2% against 80.2%), which is consistent with their misses being
documents whose machine-ness is concentrated somewhere other than the first 512 tokens.

---

## 3. Per-provider on the cycle-2 held-out training split

A third, earlier view. It is the one figure set that has a shipped-versus-retired comparison on
identical rows, which is why it is kept — but it is **per provider, not per model**, and its
threshold is a false-positive budget, not the shipped 0.984.

| | |
|---|---|
| **Detector** | cycle-2 `tier3-cycle2-e5small-int8-perchannel.onnx`, against retired cycle-1 `tier3-e5small-int8-perchannel.onnx` on the same rows |
| **Threshold** | set to 2% false positives on the held-out humans |
| **Pipeline** | single pass, truncated at 512 tokens |
| **Runtime** | Python `onnxruntime`, CPU |
| **Corpus** | 6,183 held-out rows (1,220 AI, 4,963 human) of the 15,514-document cycle-2 training corpus, split group-aware by content hash. **Held out from training, but the same corpus** — not fresh data |
| **Source** | [`../services/local-engine/research/cycle2-train/CYCLE2-REPORT.md`](../services/local-engine/research/cycle2-train/CYCLE2-REPORT.md) §"Detection by provider" |

| provider | n | retired cycle-1 | cycle-2 (deployed) |
|---|---:|---:|---:|
| deepseek | 54 | 9.3% (5/54) | **100.0%** (54/54) |
| qwen | 49 | 6.1% (3/49) | **100.0%** (49/49) |
| zai | 41 | 17.1% (7/41) | **100.0%** (41/41) |
| moonshot | 43 | 9.3% (4/43) | 97.7% (42/43) |
| meta | 51 | 11.8% (6/51) | 92.2% (47/51) |
| anthropic | 167 | 9.0% (15/167) | 89.8% (150/167) |
| xai | 57 | 1.8% (1/57) | 84.2% (48/57) |
| google | 265 | 10.9% (29/265) | 76.2% (202/265) |
| mistral | 74 | 6.8% (5/74) | 74.3% (55/74) |
| openai | 315 | 11.1% (35/315) | 71.8% (226/315) |
| alibaba | 75 | 1.3% (1/75) | 65.3% (49/75) |
| other | 15 | 0.0% (0/15) | 93.3% (14/15) |

The two columns are the same rows through two checkpoints, so the *change* is a clean
model-to-model comparison. The absolute cycle-2 column is lower than section 1 throughout because
this is a different corpus at a different threshold on an unsegmented path, and because it
includes partially-edited documents that section 1's corpus does not.

---

## 4. Which models wrote the AI documents

Three separate AI corpora exist in this project, generated at different times for different
purposes. Naming them matters: a per-model detection rate is only as meaningful as the corpus the
documents came from.

### 4.1 The long-form corpus — the source for sections 1 and 2, and what it is not

922 AI documents, generated through OpenRouter on 28 August 2026, after the cycle-2 model was
trained. **It is NOT hash-quarantined against every training split**, contrary to what this
section said until 30 August 2026: 654 of the 922 are independent of every cycle-2 split and 268
are not (168 training, 72 test, 28 calibration). See the correction at the top. Eight registers (academic essay,
literature review, discussion, research summary, white paper, company update, long-form
journalism, story), three prompt styles (plain 294, house-brief 310, human-voice 318). Paired
with 4,636 human documents from Europe PMC open access, GOV.UK, Congressional Research Service,
Global Voices, Mongabay, SEC EDGAR 10-K MD&A, PERSUADE 2.0 and an internet-archive text pool.

| model | documents |
|---|---:|
| `deepseek/deepseek-v4-pro-0813` | 131 |
| `openai/gpt-5.6-luna` | 121 |
| `google/gemini-3.7-flash` | 121 |
| `x-ai/grok-4.6` | 121 |
| `qwen/qwen3.8-max` | 110 |
| `meta-llama/llama-4-maverick` | 101 |
| `z-ai/glm-5.3` | 67 |
| `mistralai/mistral-medium-3-5` | 41 |
| `anthropic/claude-sonnet-5` | 26 |
| `moonshotai/kimi-k3` | 26 |
| `anthropic/claude-opus-5` | 23 |
| `google/gemini-3.1-pro-preview` | 21 |
| `openai/gpt-5.6-sol-pro` | 13 |
| **total** | **922** |

Manifest: [`../services/local-engine/research/longform-corpus/manifest.json`](../services/local-engine/research/longform-corpus/manifest.json).
Report and provenance: [`MANIFEST.md`](../services/local-engine/research/longform-corpus/MANIFEST.md).

### 4.2 The 4,016-article generated corpus — the source for section 5.1

Generated through OpenRouter on 28 August 2026 at a recorded spend of $61.70, across 21 models and
10 providers, 3,100,043 words, 19 registers in 5 families, 106 identical topic prompts on every
model, three prompt styles. 4,050 generated, 34 quarantined, 4,016 usable. This corpus is Opace's
own and is publishable; the per-model counts are in section 5.1's table, and the full inventory is
[`INDEX.md`](../services/local-engine/research/generated-corpus/INDEX.md).

### 4.3 The cycle-2 training corpus

15,514 documents (5,655 AI, 9,859 human) assembled from GRADTEX, HAT-Bench with its edit
trajectories, aita, MAGA, C4, PERSUADE 2.0 and Opace's own generated run, licence recorded per
source, split by content hash into 7,856 train / 1,708 calibration / 5,950 test. Its AI side is
generated by more than forty model identifiers spanning 2022 to 2026 — the largest contributors
being `x-ai/grok-4.6` (341), `qwen/qwen3.8-max` (335), `google/gemini-3.7-flash` (334),
`gemini-3-pro` (300), `z-ai/glm-5.3` (296), `meta-llama/llama-4-maverick` (289),
`openai/gpt-5.6-luna` (283), `openai/gpt-5.4` (263), `anthropic/claude-sonnet-5` (259) and
`anthropic/claude-opus-5` (257). Full manifest:
[`../services/local-engine/research/cycle2-corpus/MANIFEST.md`](../services/local-engine/research/cycle2-corpus/MANIFEST.md).

**No per-model detection table is published for this corpus**, because the model was trained on
part of it and a per-model rate over a train-and-test mixture would mean nothing. Section 3's
provider table uses the held-out split only.

---

## 5. Superseded — the retired cycle-1 detector

**Everything in this section was measured on `tier3-e5small-int8-perchannel.onnx`, the cycle-1
model that no longer ships, at thresholds that no longer ship.** It is published because the
project's record of what it replaced is part of the evidence, and because both tables below are
the largest per-model surveys in the project. It is fenced into its own section because placing
any of it beside a section 1 figure would imply a comparison that does not exist.

**The specific trap, stated plainly.** The scored file behind section 5.1
(`generated-corpus/scored-tier3.json`) contains 4,050 probabilities whose entire range is
0.1427 to 0.8582. **Not one of them can reach the shipped 0.984 flag point.** Any rate derived
from it is a rate for a detector we do not ship, at a threshold we do not use. It cannot be
rescored at 0.984 and it cannot be compared with section 1.

### 5.1 Twenty-one models, 4,016 current-model articles

| | |
|---|---|
| **Detector** | **retired** cycle-1 `tier3-e5small-int8-perchannel.onnx` |
| **Thresholds** | 0.8533 / 0.8397 / 0.6256 (analysis thresholds) and 0.857 (the cycle-1 shipped flag point). **None of these ships** |
| **Pipeline** | single pass, truncated at 512 tokens — roughly the first 380 words of each article |
| **Runtime** | Python `onnxruntime`, CPU |
| **Corpus** | `research/generated-corpus/`, 4,016 articles, 21 models, 10 providers |
| **Source** | [`GENERATED-CORPUS-EVAL.md`](../services/local-engine/research/generated-corpus/GENERATED-CORPUS-EVAL.md) §"Per model" |

| model | tier | n | @0.8533 | @0.8397 | @0.6256 | @0.857 (cycle-1 shipped) |
|---|---|---:|---:|---:|---:|---:|
| `google/gemini-3.6-flash` | flash-or-mini | 75 | 61.3% | 76.0% | 90.7% | 28.0% |
| `google/gemini-3.7-flash` | flash-or-mini | 250 | 59.6% | 72.4% | 84.0% | 20.0% |
| `openai/gpt-5.6-sol` | standard | 150 | 56.7% | 74.0% | 86.0% | 20.7% |
| `openai/gpt-5.6-luna-pro` | pro-flagship | 75 | 56.0% | 77.3% | 85.3% | 21.3% |
| `openai/gpt-5.6-sol-pro` | pro-flagship | 75 | 56.0% | 81.3% | 90.7% | 18.7% |
| `openai/gpt-5.6-luna` | flash-or-mini | 250 | 50.8% | 64.8% | 82.8% | 17.6% |
| `openai/gpt-5.6-terra` | standard | 250 | 50.0% | 64.4% | 82.0% | 16.4% |
| `google/gemini-3.5-flash` | flash-or-mini | 150 | 46.0% | 61.3% | 78.0% | 14.7% |
| `meta-llama/llama-4-maverick` | flash-or-mini | 250 | 45.6% | 62.4% | 74.8% | 8.0% |
| `mistralai/mistral-medium-3-5` | standard | 249 | 44.6% | 63.1% | 77.9% | 16.5% |
| `openai/gpt-5.4` | standard | 150 | 42.7% | 60.0% | 72.0% | 13.3% |
| `anthropic/claude-fable-5` | pro-flagship | 141 | 39.7% | 59.6% | 73.8% | 10.6% |
| `anthropic/claude-sonnet-5` | standard | 250 | 35.6% | 54.8% | 72.4% | 12.0% |
| `z-ai/glm-5.3` | standard | 229 | 34.5% | 55.9% | 71.2% | 10.0% |
| `moonshotai/kimi-k3` | pro-flagship | 249 | 34.1% | 52.6% | 65.1% | 9.6% |
| `anthropic/claude-opus-4.8` | pro-flagship | 75 | 32.0% | 49.3% | 66.7% | 12.0% |
| `google/gemini-3.1-pro-preview` | pro-flagship | 150 | 31.3% | 52.7% | 66.0% | 9.3% |
| `deepseek/deepseek-v4-pro-0813` | standard | 248 | 31.0% | 47.2% | 66.5% | 8.1% |
| `qwen/qwen3.8-max` | standard | 250 | 29.6% | 46.0% | 62.0% | 8.0% |
| `anthropic/claude-opus-5` | pro-flagship | 250 | 24.8% | 40.0% | 56.4% | 5.6% |
| `x-ai/grok-4.6` | standard | 250 | 13.6% | 24.4% | 39.6% | 3.6% |
| **all 21 models** | | **4,016** | **39.9%** | **56.6%** | **71.6%** | **12.4%** |

This is the table behind the finding that the retired detector penalised paying customers: flash
and mini tiers 51.8% (505/975) against pro and flagship 35.3% (358/1,015) at 0.8533. Section 1
shows that gap closed and slightly reversed on the deployed model.

Under an explicit "write like a human" instruction the same detector fell to **0 of 86** on
`x-ai/grok-4.6`; the full prompt-style-by-model table is in
[`MEASURED-FINDINGS.md`](MEASURED-FINDINGS.md) §1, also labelled superseded there.

### 5.2 The public-data survey — chat replies, article prose, forum posts, long-form fiction

| | |
|---|---|
| **Detector** | **retired** cycle-1 `tier3-e5small-int8-perchannel.onnx` |
| **Thresholds** | 0.8533 / 0.8397 / 0.6256. **None of these ships** |
| **Pipeline** | single pass, truncated at 512 tokens |
| **Runtime** | Python `onnxruntime`, CPU |
| **Corpus** | `research/current-models/`, 3,133 licence-cleared samples plus a 582-row register control and a 1,233-piece unredistributable probe |
| **Human reference at the same thresholds** | 169 humans: 1.8% / 3.6% / 8.9% false positives — itself a corpus later found unrepresentative |
| **Source** | [`CURRENT-MODEL-EVAL.md`](../services/local-engine/research/current-models/CURRENT-MODEL-EVAL.md) §§3.4–3.6, 4, 5 |

**Chat replies**, n ≥ 25 per row:

| model | n | @0.8533 | @0.8397 | @0.6256 |
|---|---:|---:|---:|---:|
| `mistral-medium-2508` | 54 | 70.4% | 85.2% | 92.6% |
| `gpt-5-chat` | 61 | 67.2% | 82.0% | 90.2% |
| `claude-sonnet-4.6` | 150 | 66.0% | 84.0% | 98.0% |
| `claude-opus-4-1-20250805` | 75 | 64.0% | 73.3% | 84.0% |
| `glm-4.5` | 41 | 63.4% | 87.8% | 90.2% |
| `claude-opus-4-1-…-thinking-16k` | 38 | 63.2% | 71.1% | 81.6% |
| `qwen3-235b-a22b-instruct-2507` | 42 | 61.9% | 71.4% | 83.3% |
| `glm-4.5-air` | 52 | 61.5% | 78.8% | 98.1% |
| `claude-opus-4.6` | 150 | 48.7% | 68.0% | 84.0% |
| `gpt-5-high` | 39 | 46.2% | 53.8% | 76.9% |
| `deepseek-v3.1` | 37 | 43.2% | 62.2% | 78.4% |
| `mai-1-preview` | 31 | 41.9% | 58.1% | 80.6% |
| `deepseek-v3.1-thinking` | 32 | 40.6% | 59.4% | 71.9% |
| `kimi-k2-0711-preview` | 70 | 30.0% | 44.3% | 65.7% |

**Article prose** (GRADTEX), same detector, same thresholds:

| model | n | @0.8533 | @0.8397 | @0.6256 |
|---|---:|---:|---:|---:|
| `qwen3.5-27b` | 139 | 6.5% | 16.5% | 33.8% |
| `gpt-5.4-mini` | 124 | 5.6% | 16.1% | 40.3% |
| `gemma-4-e4b-it` | 115 | 5.2% | 14.8% | 40.9% |
| `claude-sonnet-4.6` | 126 | 4.0% | 14.3% | 34.9% |
| `gemini-3.5-flash` | 128 | 1.6% | 17.2% | 43.0% |
| `gemma-4-31b-it` | 150 | 0.7% | 4.7% | 22.7% |

`claude-sonnet-4.6` scores 66.0% as a chat reply and 4.0% as an article. Same model, same
detector, same threshold — a 62-point swing driven only by what it was asked to write. That
measurement is why cycle 2 was retrained on published-register data, and it is the most important
number on this page even though the detector that produced it is retired.

**Register control, same dataset, old and new generators:**

| model | released | n | @0.8533 | @0.8397 | @0.6256 |
|---|---|---:|---:|---:|---:|
| `davinci-002` | 2021 | 150 | 0.0% | 11.3% | 44.0% |
| `davinci-003` | Nov 2022 | 150 | 1.3% | 12.7% | 33.3% |
| `gpt-3.5-turbo` | Nov 2022 | 150 | 5.3% | 20.0% | 46.7% |
| `mistral-small-3.2-24b` | Jun 2025 | 132 | 7.6% | 18.9% | 37.9% |
| 2026 models, same source | 2026 | 782 | 3.8% | 13.7% | 35.4% |

Four-year-old models were detected no better than 2026 models in the same register. The
apparent "detection is degrading on new models" effect was a register effect, not an era effect.

**Forum-narrative prose, August-2026 frontier models instructed to sound like a human poster:**

| model | n | @0.8533 | @0.8397 | @0.6256 | mean probability |
|---|---:|---:|---:|---:|---:|
| `nvidia/nemotron-3.5-lightning` | 150 | 0.7% | 0.7% | 2.0% | 0.176 |
| `x-ai/grok-4.6` | 150 | 0.0% | 0.0% | 0.0% | 0.159 |
| `google/gemini-3.7-flash` | 150 | 0.0% | 0.0% | 0.7% | 0.158 |
| `deepseek/deepseek-v4-pro` | 150 | 0.0% | 0.0% | 0.0% | 0.156 |
| `z-ai/glm-5.3` | 150 | 0.0% | 0.0% | 0.0% | 0.154 |
| `openai/gpt-5.6-luna-pro` | 150 | 0.0% | 0.0% | 0.0% | 0.153 |
| `qwen/qwen3.8-max` | 150 | 0.0% | 0.0% | 0.0% | 0.153 |

Mean 0.159 across those 1,050 samples, *below* the 0.226 human reference mean. The retired
detector rated deliberately human-styled machine prose as more human-like than the human corpus.

**Long-form literary fiction probe.** EQ-Bench creative-writing longform, 1,233 pieces across 32
models, scored but **not redistributed** — the source carries no licence, the text was fetched to
a temporary directory at run time and only the scores were kept. Nineteen models with n ≥ 31:

| model | released | n | @0.8533 | @0.8397 | @0.6256 | mean |
|---|---|---:|---:|---:|---:|---:|
| `grok-4.1-fast` | Nov 2025 | 45 | 100.0% | 100.0% | 100.0% | 0.857 |
| `grok-4.20-beta` | Mar 2026 | 40 | 57.5% | 82.5% | 97.5% | 0.829 |
| `gemini-3-pro-preview` | Dec 2025 | 45 | 55.6% | 82.2% | 93.3% | 0.804 |
| `llama-4-maverick` | Apr 2025 | 45 | 53.3% | 86.7% | 95.6% | 0.830 |
| `glm-5` | Mar 2026 | 45 | 48.9% | 68.9% | 93.3% | 0.811 |
| `gemini-3.5-flash` | May 2026 | 45 | 37.8% | 53.3% | 84.4% | 0.754 |
| `gemini-3.1-pro-preview` | Feb 2026 | 45 | 35.6% | 60.0% | 88.9% | 0.770 |
| `minimax-m2.5` | May 2026 | 45 | 24.4% | 53.3% | 86.7% | 0.766 |
| `claude-opus-4.8` | May 2026 | 45 | 22.2% | 31.1% | 71.1% | 0.658 |
| `mistral-small-4-2603` | Mar 2026 | 45 | 22.2% | 93.3% | 100.0% | 0.849 |
| `claude-fable-5` | Jun 2026 | 45 | 20.0% | 22.2% | 55.6% | 0.597 |
| `deepseek-v4-pro` | Apr 2026 | 36 | 19.4% | 36.1% | 80.6% | 0.715 |
| `kimi-k3` | Jul 2026 | 45 | 17.8% | 31.1% | 60.0% | 0.606 |
| `claude-sonnet-5` | Jun 2026 | 45 | 13.3% | 35.6% | 73.3% | 0.667 |
| `glm-5.3` | Aug 2026 | 45 | 8.9% | 22.2% | 53.3% | 0.557 |
| `mistral-large-3-2512` | Dec 2025 | 41 | 2.4% | 97.6% | 100.0% | 0.849 |
| `claude-opus-5` | Jul 2026 | 45 | **2.2%** | **2.2%** | **11.1%** | **0.296** |
| `gpt-5.6-sol` | Jul 2026 | 45 | 0.0% | 60.0% | 93.3% | 0.794 |
| `gpt-5.6-terra` | Jul 2026 | 31 | 0.0% | 41.9% | 100.0% | 0.822 |

Two caveats the source states and this page repeats: the OpenAI rows are biased because those
models' chapters run longer than the 120–1,200-word filter, so only their short tail was scored;
and several models jump from 2–22% at 0.8533 to 93–98% at 0.8397, meaning their probability mass
piled up inside a 0.0136-wide band — the retired threshold sat on a knife-edge.

---

## 6. What is not here

Recorded so the gaps are visible rather than implied away.

- **A per-model breakdown measured through the browser runtime.** Sections 1 and 3 use Python;
  section 1 uses the fp32 route that is the documented proxy for `onnxruntime-web`. The browser's
  own full-corpus segmented curve has never been measured — about five hours of compute — and is
  an open item in [`programme/HANDOVER.md`](programme/HANDOVER.md) §13.
- **Per-model false-positive rates.** There is no such thing: a false positive belongs to a human
  writer, not to a model. Per-register human false positives are in
  [`TEST-EVIDENCE.md`](TEST-EVIDENCE.md).
- **Anything below 200 words.** Detection falls to 67% at 200 words, 50% at 150 and 19% at 100.
  The denominators for those three figures are not recorded anywhere and they need re-measuring;
  that is logged in HANDOVER §9.2, and no per-model version of it exists.
- **Per-model rates on edited text.** The edit-level breakdown in
  [`CYCLE2-REPORT.md`](../services/local-engine/research/cycle2-train/CYCLE2-REPORT.md) is not cut
  by model, and the corpora behind it are not model-balanced.
- **Models that produced no licence-clear samples.** Meta has released nothing since
  `llama-4-maverick` (April 2025), so its absence from the newer slices is a product gap rather
  than a data gap.
- **Any figure for a model not named above.** If a model is not in one of these tables, this
  project has not measured it, and no rate should be inferred for it from its provider or tier.

## Reproducing these

| section | how |
|---|---|
| 1 | Score `longform-corpus/{ai,human}-longform.jsonl` through `model-shrink/reference-server/segments.py` `segment_text` and its fp32 model at T = 0.8324, take the maximum probability per document, flag at 0.984, group by the `model` field of `ai-longform.jsonl`. Totals must come to 877/922 and 56/4,636 |
| 2 | `python3 model-shrink/scripts/01_baseline.py`, then group `results/margins-cycle2-int8-perchannel-DEPLOYED.npy` by the same field, in the row order of `results/eval-rows.json` |
| 3 | `python3 cycle2-train/eval.py`, then `make_report.py` |
| 4 | `longform-corpus/manifest.json`, `generated-corpus/INDEX.md`, `cycle2-corpus/MANIFEST.md` |
| 5 | `current-models/run_all.sh` and `generated-corpus/analyze.py`. Both corpora are outside this repository — see [`programme/HANDOVER.md`](programme/HANDOVER.md) §2 |

Python here needs `transformers` and `onnxruntime`; the project venv is
`services/local-engine/research/current-models/.venv/bin/python3`.
