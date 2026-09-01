# Current-model detection evaluation

> **Historical study, not current production performance.** This 28 August 2026 report evaluates
> the retired pre-Cycle-2 Tier-3 model at probability thresholds 0.8533, 0.8397 and 0.6256. The
> live classifier since 1 September 2026 is Cycle 5 (`tier3-cycle5-v1`) using the margin rule
> `max(m1, m2 + 0.34) >= 3.570935`, `segments-v3`, `raw-v1` and `features-v1`. Current per-route
> results and overlap disclosure are in [`../../../../README.md`](../../../../README.md#the-evidence-up-front)
> and [`../../../../MODEL_AND_DATA_PROVENANCE.md`](../../../../MODEL_AND_DATA_PROVENANCE.md).

Workstream CM, 28 August 2026. Owner question: our accuracy figures come from a
corpus whose newest models are roughly July 2025. Has detection degraded on the
models people actually use today, and by how much per provider?

Short answer, stated up front because it is not the answer the question expects:

- **On chat replies, degradation is real but small.** Tier 3 recall at the
  shipped 0.8533 threshold falls from **62.6 %** (baseline 2025-26 era, n=1,050)
  to **57.7 %** (Aug-Oct 2025 models, n=1,001) to **57.3 %** (Feb 2026 Anthropic,
  n=300). That is about **5 percentage points**, not a collapse.
- **On article-style prose, detection was never working.** Within one dataset,
  one register and one pipeline, 2026 models score **3.8 %** recall (n=782) and
  2022-era `gpt-3.5-turbo` scores **5.3 %** (n=150), `davinci-002` **0.0 %**
  (n=150). The prose figure is a **register** result, not an era result.
- **On deliberately human-styled prose, detection is at zero.** Seven August-2026
  frontier models writing first-person forum posts: **0.1 %** recall (n=1,050),
  mean Tier 3 probability 0.159 against a human reference mean of 0.226.

So the owner's experience — "our detection looked far weaker on current models" —
is reproduced, but the dominant cause is what the models were asked to write,
not when they were released. That distinction changes what to fix.

Human false-positive reference for every threshold below (n=169 humans from
`provider-eval/eval-set.jsonl`, unchanged): **1.8 % / 3.6 % / 8.9 %** at
0.8533 / 0.8397 / 0.6256.

---

## 1. Source inventory

### 1.1 Accepted and ingested

| # | Dataset | Licence | Rows used | Models covered | Dates | Register | Typical length |
|---|---|---|---|---|---|---|---|
| S1 | [`lmarena-ai/arena-expert-5k`](https://huggingface.co/datasets/lmarena-ai/arena-expert-5k) | Prompts CC-BY-4.0; **model outputs governed by each provider's terms of use** (verbatim from the card) | 1,001 | 47 post-mid-2025 model ids, including `gpt-5-high/chat/mini/nano`, `gpt-oss-120b/20b`, `claude-opus-4-1-20250805`, `claude-sonnet-4-5-20250929`, `gemini-2.5-flash-preview-09-2025`, `grok-4-fast`, `deepseek-v3.1*`/`v3.2-exp`, `mistral-medium-2508`, `qwen3-max/next/coder/2507`, `kimi-k2-0905`, `glm-4.5/4.6`, `mai-1-preview`, `longcat-flash-chat`, `step-3`, `ling/ring-flash-2.0` | Aug–Oct 2025 | Chat reply, real user prompts, multi-turn | median 571 w |
| S2 | [`TeichAI/Claude-Opus-4.6-Reasoning-887x`](https://huggingface.co/datasets/TeichAI/Claude-Opus-4.6-Reasoning-887x) + [`…Claude-Sonnet-4.6-Reasoning-1100x`](https://huggingface.co/datasets/TeichAI/Claude-Sonnet-4.6-Reasoning-1100x) | `apache-2.0` (declared in card front-matter) | 300 | `claude-opus-4.6`, `claude-sonnet-4.6` | Feb 2026 | Chat reply, single-turn synthetic prompts | median 269 w |
| S3 | [`elisabeth-pl-pl/GRADTEX`](https://huggingface.co/datasets/elisabeth-pl-pl/GRADTEX) (test split, `multiclass_label == MGT` only) | `cc-by-4.0` (derivative of MAGE, Apache-2.0) | 782 | `claude-sonnet-4.6`, `gpt-5.4-mini`, `gemini-3.5-flash`, `gemma-4-31b-it`, `gemma-4-e4b-it`, `qwen3.5-27b` | Feb–May 2026 | **Article prose** — news, science, tech_news, reviews, knowledge, fiction, social_media | median 253 w |
| S4 | [`mild-rgb/aita-human-vs-ai`](https://huggingface.co/datasets/mild-rgb/aita-human-vs-ai) (`label == ai` only) | `apache-2.0` | 1,050 | `openai/gpt-5.6-luna-pro`, `google/gemini-3.7-flash`, `x-ai/grok-4.6`, `deepseek/deepseek-v4-pro`, `qwen/qwen3.8-max`, `z-ai/glm-5.3`, `nvidia/nemotron-3.5-lightning` | Apr–Aug 2026 | **First-person forum narrative**, generated to a "write like a Reddit poster" prompt | median 385 w |

**Register honesty, because this project has been misled by register once already.**
S1 and S2 are chat replies — the same register as the existing corpus, so they
are the only clean era-to-era comparison. S3 is genuine article prose but skews
short and includes fiction and social media alongside news and science. S4 is
*not* neutral prose: the models were explicitly told to imitate a human forum
poster, so it measures an adversarial case, not default assistant output.
Nothing here is marketing or SEO copy, which remains the register we most care
about and have no public data for at all.

Licence caveat that applies to S1 and, in truth, to every arena-derived corpus
including the `arena-human-preference-140k` shard already in `provider-eval`:
the *prompts* are CC-BY-4.0, the *outputs* are only ever "governed by provider
terms". That is the same footing this project has already accepted, so S1 adds
no new legal exposure — but it is not an open data licence and should not be
described as one.

### 1.2 Accepted for measurement, NOT ingested — the prose probe

**EQ-Bench creative-writing-longform** —
`github.com/EQ-bench/EQ-bench-site`, `results/creative-writing-longform/*_longform_report.html`.

This is the richest source found anywhere: **208 per-model reports**, each with
156 generations embedded in `<div class="response-content">` blocks, median
1,284 words. Coverage runs right to the present — `claude-opus-5`,
`claude-sonnet-5`, `claude-fable-5`, `gpt-5.6-sol/terra/luna`, `gemini-3.5-flash`,
`gemini-3.7`-era Google, `grok-4.20-beta`, `mistral-small-4-2603`, `kimi-k3`,
`GLM-5.3`, `Qwen3.8-27B`, `deepseek-v4-pro`. It is the only public source that
covers the exact models the owner tested.

**It carries no licence.** Neither `EQ-bench/EQ-bench-site` nor
`EQ-bench/creative-writing-bench` has a `LICENSE` file (only a bundled font
licence); `about.html` states no terms. The org's older `EQ-Bench` repo is MIT
but that is a different repository and covers code.

Decision: we score it but do not redistribute it. `build_prose_probe.py`
fetches the reports to `/tmp` at run time, extracts the text, scores it, and
keeps only the scores. No probe text is stored in this repository. **Action for
the owner: ask Sam Paech for permission to redistribute; it would be the single
most valuable corpus addition available.**

Register warning: it is literary fiction written to a chapter plan. Article-
*length*, not article-*kind*.

### 1.3 Rejected, with reasons

| Source | Reason for rejection |
|---|---|
| `Crownelius/Creative-Writing-Gemini3Pro-2700x` (MIT) | **Model label is not trustworthy.** Title says Gemini 3 Pro; README body says "generated using Gemini 1.5 Pro"; every row's `metadata.source` is `glm5_farmer`; `metadata.platform` is `Gemini (gemini.google.com)`; the card quotes two different generation costs ($517.31 and $7.17). Rejected on label reliability, not licence. |
| `Manusagents/GPT-5.5-Gemini-3.1-Pro-Grok-4-…-Distillation-Dataset` (MIT) and its ~15 re-uploads | Model attribution is in the repo title only. Per-row `source_dataset` points at aggregate third-party sets, not model ids. |
| `WithinUsAI/Grok4.4_heavy_max_distill_god_seed_25k` (apache-2.0) | Prompts embed "Current base: Llama-3.3-70B" and a heavy persona wrapper. Provenance of the actual generator is unresolvable. |
| `lshx90/gdpval-gpt5`, `kevindenight/gdpval-gpt5` (MIT) | Right register (professional deliverables) but only 87 rows have `deliverable_text`, of which **19** fall in 120–1,200 words, and sampled text is meta-commentary ("I do not have live internet access…") rather than a deliverable. |
| `mild-rgb/eli5-human-vs-ai` (cc-by-4.0) | Same 2026 generators as S4 and a better register (explanatory prose) — but the published files contain **no text field at all**, only identifiers and metrics. Metadata-only. |
| Most `TeichAI/*` single-model sets (gpt-5.1, gpt-5.2, gemini-3-pro/flash, claude-4.5-opus, deepseek-v3.2, glm-4.7, minimax-m2.1, kimi-k2-thinking, grok-4-fast) | **No licence declared.** Only the two Claude 4.6 sets carry `apache-2.0`. Register is also reasoning/coding-heavy. |
| `rasbt/human-vs-ai-50k` | 50,710 rows, `gemini-3.6-flash`, `deepseek-v4-flash-0731`, `kimi-k3`, per-row source licences for the human half — but the repo licence is literally `other` with "More details coming soon". Worth revisiting if the author clarifies. |
| `OpAI-Bench1/OpAI-Bench` (apache-2.0, 289k rows, `gpt-5.4`) | Genuinely usable; deferred only because GRADTEX already covers `gpt-5.4-mini` in the same register and OpAI-Bench rows are mostly *mixed* human/AI spans, which would need careful filtering. Recommended as the next addition. |
| Stanford **HELM** public GCS bucket | 17 post-mid-2025 model runs, 1,000 verbatim WildBench replies each, median 714 words, freely downloadable, no auth. **No licence statement on the generations** (the repo's Apache-2.0 covers code). Same status as EQ-Bench: probe-able, not redistributable. |
| **PAN@CLEF 2026 Reasoning Trajectory Detection** | CC BY-NC 4.0 (verified in the LICENSE file) — non-commercial, which blocks a commercial plugin. Generators `gpt-5-nano`, `gemini-3-flash`, `k2think-v2`, `deepseek-r1`. Register is LaTeX-heavy maths solutions. |
| SemEval-2026 Task 13 | Kaggle licence `Unknown`; and it is generated *code*, not prose. |
| NLPCC 2026 Task 6, COLING 2025 GenAI Task 1, C-ReD, PAN Voight-Kampff 2025/26 | No licence statement, or explicit "no redistribution", or both. |
| RAID, MAGE, Beemo, HART, M4GT, MGTBench, DetectRL, Defactify | Clean licences, but every generator predates our existing corpus ceiling. `DetectRL-X` (MIT, ACL 2026) is worth having for the **evasion** axis — zero-width insertion, back-translation, paraphrase — but its models are GPT-4o / DeepSeek-V3 / Gemini-2.5-Flash / Qwen-Max. |
| `lmarena-ai/arena-human-preference-140k`, `search-arena-24k`, `lmsys/*`, `allenai/WildChat*` | Confirmed ceilings. 140k tops out July 2025 (our current shard). `search-arena-24k` is Mar–May 2025 despite a 2026 re-upload. `lmsys/*` newest is Jul 2024. `WildChat-4.8M` stops *before* 1 Aug 2025 and is OpenAI-only. |
| `lmarena-ai/leaderboard-dataset` (cc-by-4.0, updated daily) | **No text**, Elo records only. Useful as an authoritative registry of live model ids and dates, nothing more. |
| Lab model / system cards | Checked OpenAI GPT-5 family, Anthropic Claude 4.5/4.6, Google Gemini 3, xAI. Illustrative excerpts only; no reusable corpus. Anthropic's Petri ships seed instructions and no transcripts. |
| **rival.tips** (owner lead) | Real, and its catalogue is excellent — `/api/models` returns 332 models across 44 providers, and `grok-4.6` (2026-08-12) and three `qwen3.8-*` ids are confirmed. The "7,877 responses / 250 models / 2.14M words" figure is confirmed *verbatim on their research page* but describes an internal March 2026 analysis, not a download. **There is no bulk text export** — `/api/responses` and `/api/challenges` 404, the GitHub repo is gone, there is no HF dataset, and the generated text exists only as server-rendered HTML. Terms §9 forbids systematic scraping beyond the official APIs, and there is no open licence (RSS declares "All rights reserved"). Register is also wrong: ~86 challenges dominated by code and UI artefacts, many one-line answers, ~272 words average, with only about ten article-shaped prompts. **Reference source, not a corpus.** |
| `lmsys/chatbot_arena_conversations` | The owner's contact advised against it. Agreed — 2023, 20 models, far below our existing ceiling. |

### 1.4 What public data does not cover

Verified against `https://openrouter.ai/api/v1/models` (fetched 2026-08-28):

- **Meta has released nothing since Llama 4 (Apr 2025).** The absence of newer
  Meta samples is not a data gap, it is a product gap. `llama-4-maverick` remains
  the newest Meta model in existence.
- **Mistral post-mid-2025 is thin.** Licence-clear ingest gives 54 samples
  (`mistral-medium-2508`), below the 100 target. `mistral-medium-3-5` (Apr 2026),
  `mistral-small-2603`, `mistral-large-2512` and `ministral-*-2512` appear in no
  licence-clear public corpus. The probe covers four of them.
- **No licence-clear corpus contains** `claude-opus-5`, `claude-sonnet-5`,
  `claude-fable-5`, `gpt-5.6-*`, `gemini-3.5-flash` chat output (GRADTEX has it
  in article prose only), `gemini-3.6/3.7-flash` outside S4's forum register,
  `grok-4.5`/`4.6` outside S4, or `kimi-k3`. Everything above is measurable only
  through the unlicensed EQ-Bench probe.

---

## 2. Ingestion manifest

`current-eval-set.jsonl` — **3,133 rows**, all `side: "ai"`. Schema matches
`provider-eval/eval-set.jsonl` (`id`, `provider`, `era`, `model`, `side`,
`genre`, `text`) plus `source`, `register`, `model_release`, `licence`, `words`,
`sha256`.

Era labels are new and distinguishable from the existing `2022-23` / `2024-25` /
`2025-26`:

| Era label | Meaning | n |
|---|---|---|
| `2025-26-late` | Released Jul–Oct 2025 | 1,001 |
| `2026-mid` | Released Nov 2025 – May 2026 | 1,082 |
| `2026-current` | Released Apr–Aug 2026 | 1,050 |

Filters, applied identically to every source: 120–1,200 words; ≥97 % ASCII
(English proxy); ≥55 % alphabetic characters (rejects tables and maths dumps);
fenced code ≤20 % of characters (rejects code answers); exact-text dedupe.
3,068 candidates were dropped by these filters.

**Quarantine, enforced by text hash.** `build_current_set.py` loads the 34-sample
scratchpad `eval-samples.json` test set and drops any candidate matching either
its raw SHA-256 or a whitespace-and-case-normalised SHA-256. It also drops any
candidate matching a `corpus.jsonl` row of *any* split — stricter than
`provider-eval/build_eval_set.py`, which only excluded the train split.
Result: **0 quarantine collisions, 0 corpus collisions, 0 duplicates.** The
quarantine is clean, and it was never at risk: none of these sources shares an
origin with the scratchpad set.

Per provider (denominators for every table below):

| Provider | chat-reply | article-prose | forum-narrative | total |
|---|---|---|---|---|
| anthropic | 432 | 126 | – | **558** |
| google | 24 | 393 | 150 | **567** |
| openai | 200 | 124 | 150 | **474** |
| alibaba | 200 | 139 | 150 | **489** |
| zhipu | 119 | – | 150 | **269** |
| deepseek | 99 | – | 150 | **249** |
| grok (xAI) | 21 | – | 150 | **171** |
| nvidia | – | – | 150 | **150** |
| moonshot | 88 | – | – | **88** |
| mistral | 54 | – | – | **54** |
| microsoft | 31 | – | – | **31** |
| meituan / inclusionai / stepfun | 33 | – | – | **33** |
| **meta** | **0** | **0** | **0** | **0** |

The ≥100-per-family target is met for anthropic, google, openai, alibaba, zhipu,
deepseek and grok. It is missed for moonshot (88), mistral (54), microsoft (31)
and missed entirely for meta (0, because no such model exists).

Companion files: `current-eval-set-stripped.jsonl` (markdown removed with
`stripped-eval/strip_markdown.py`, used read-only and unmodified — 3.7 % of words
removed, 1,362 of 3,133 samples carried furniture, 102 residual markers) and
`control-eval-set.jsonl` (582 rows, §4).

---

## 3. Measurement

Engine: shipped `packages/core` `dist` (`computeEditorialSignals`,
`inspectSignalsV2`, `computeV4Metrics`) and the shipped Tier 3 model
`models/tier3-e5small-int8-perchannel.onnx`, tokenizer from `tier3/checkpoint`,
`max_len` 512, softmax over 2 logits, CPU int8. No engine file was modified.

Baselines are **recomputed** from `provider-eval/tier3-scores.jsonl`,
`provider-eval/rules-scores.jsonl`, `stripped-eval/tier3-stripped.jsonl` and
`stripped-eval/rules-stripped.jsonl` by the same code at the same thresholds, so
old and new numbers are directly comparable. `provider-eval/analysis.json` only
records the 0.857 flag rate, so it is quoted where relevant but not mixed in.

All figures are **AI recall %** — the share of AI samples flagged. Human
false-positive rate at the same thresholds, n=169: **1.8 / 3.6 / 8.9**.

### 3.1 Headline: era slices, raw and markdown-stripped

| Slice | n | RAW @0.8533 | @0.8397 | @0.6256 | STRIPPED @0.8533 | @0.8397 | @0.6256 | rules mixed+ raw | rules mixed+ stripped | mean findings |
|---|---|---|---|---|---|---|---|---|---|---|
| BASE 2022-23 (HC3 GPT-3.5) | 150 | 7.3 | 32.7 | 71.3 | 6.7 | 33.3 | 71.3 | 0.0 | 0.0 | 1.39 |
| BASE 2024-25 | 527 | 49.1 | 68.7 | 85.4 | 55.4 | 73.8 | 85.0 | 60.2 | 5.5 | 5.15 |
| BASE 2025-26 | 1,050 | 62.6 | 78.6 | 90.3 | 64.9 | 78.4 | 89.2 | 79.5 | 6.3 | 6.24 |
| NEW 2025-26-late | 1,001 | **57.7** | 71.4 | 84.3 | 56.4 | 68.3 | 79.4 | 83.1 | 9.5 | 7.70 |
| NEW 2026-mid | 1,082 | 18.7 | 31.0 | 50.8 | 18.6 | 31.8 | 50.4 | 34.6 | 9.6 | 4.09 |
| NEW 2026-current | 1,050 | **0.1** | 0.1 | 0.4 | 0.1 | 0.1 | 0.4 | 0.0 | 0.0 | 0.84 |

Read that table with care. The `2026-mid` and `2026-current` rows mix registers.
The next table separates them.

### 3.2 The same numbers, split by register

| Era × register | n | RAW @0.8533 | @0.8397 | @0.6256 | STRIPPED @0.8533 | @0.8397 | @0.6256 |
|---|---|---|---|---|---|---|---|
| BASE 2025-26 (chat reply) | 1,050 | 62.6 | 78.6 | 90.3 | 64.9 | 78.4 | 89.2 |
| NEW 2025-26-late · chat reply | 1,001 | 57.7 | 71.4 | 84.3 | 56.4 | 68.3 | 79.4 |
| NEW 2026-mid · chat reply | 300 | 57.3 | 76.0 | 91.0 | 57.0 | 79.0 | 89.3 |
| NEW 2026-mid · article prose | 782 | 3.8 | 13.7 | 35.4 | 3.8 | 13.7 | 35.4 |
| NEW 2026-current · forum narrative | 1,050 | 0.1 | 0.1 | 0.4 | 0.1 | 0.1 | 0.4 |

Within chat reply, moving from mid-2025 models to Feb-2026 models costs about
**5 points** at the shipped threshold (62.6 → 57.7 → 57.3) and nothing at all at
0.8397 for the 2026 slice (78.6 → 76.0). Changing register costs **54 points**.

Markdown stripping barely moves the new corpus: −0.4 points overall at 0.8533.
It moves the *rules* stack enormously — `mixed_signals or worse` falls from
38.5 % to 6.4 % across the whole new corpus — which reproduces the known
`stripped-eval` finding that the rules stack is largely reading markdown
furniture. On the article-prose and forum slices, stripping changes nothing at
all, because there was no furniture to remove.

### 3.3 Per provider

Chat-reply rows only, so this is comparable with the baseline. Providers with
n<25 are shown but should not be read as estimates.

| Provider | BASE 2024-25 n / @0.8533 | BASE 2025-26 n / @0.8533 | NEW chat-reply n / @0.8533 | change vs 2025-26 |
|---|---|---|---|---|
| anthropic | 150 / 33.3 | 150 / 40.0 | 432 / 59.5 | **+19.5** |
| openai | 77 / 54.5 | 150 / 68.7 | 200 / 54.5 | **−14.2** |
| google | 150 / 55.3 | 150 / 66.7 | 24 / 29.2 | −37.5 *(n=24)* |
| deepseek | – | 150 / 72.7 | 99 / 47.5 | **−25.2** |
| mistral | – | 150 / 68.7 | 54 / 70.4 | +1.7 |
| grok (xAI) | – | 150 / 58.0 | 21 / 66.7 | +8.7 *(n=21)* |
| meta | 150 / 56.0 | 150 / 63.3 | — | no newer model exists |
| alibaba (new) | – | – | 200 / 67.5 | — |
| zhipu (new) | – | – | 119 / 64.7 | — |
| moonshot (new) | – | – | 88 / 31.8 | — |
| microsoft (new) | – | – | 31 / 41.9 | — |

Per-provider movement is mixed and mostly modest. Anthropic actually improved —
`claude-sonnet-4.6` flags at 66.0 % and `claude-opus-4-1-20250805` at 64.0 %
against 40.0 % for the 2025-26 Anthropic baseline. OpenAI and DeepSeek lost
14–25 points. Google's chat-reply cell has only 24 samples and should not be
quoted; its meaningful figure is the article-prose one below.

### 3.4 Per model, chat reply, n ≥ 25

| Model | n | @0.8533 | @0.8397 | @0.6256 | Tier 3 mean |
|---|---|---|---|---|---|
| `claude-sonnet-4.6` (TeichAI) | 150 | 66.0 | 84.0 | 98.0 | 0.837 |
| `mistral-medium-2508` | 54 | 70.4 | 85.2 | 92.6 | 0.801 |
| `gpt-5-chat` | 61 | 67.2 | 82.0 | 90.2 | 0.800 |
| `claude-opus-4-1-20250805` | 75 | 64.0 | 73.3 | 84.0 | 0.746 |
| `glm-4.5` | 41 | 63.4 | 87.8 | 90.2 | 0.801 |
| `claude-opus-4-1-…-thinking-16k` | 38 | 63.2 | 71.1 | 81.6 | 0.760 |
| `qwen3-235b-a22b-instruct-2507` | 42 | 61.9 | 71.4 | 83.3 | 0.761 |
| `glm-4.5-air` | 52 | 61.5 | 78.8 | 98.1 | 0.828 |
| `claude-opus-4.6` (TeichAI) | 150 | 48.7 | 68.0 | 84.0 | 0.758 |
| `gpt-5-high` | 39 | 46.2 | 53.8 | 76.9 | 0.693 |
| `deepseek-v3.1` | 37 | 43.2 | 62.2 | 78.4 | 0.727 |
| `mai-1-preview` | 31 | 41.9 | 58.1 | 80.6 | 0.738 |
| `deepseek-v3.1-thinking` | 32 | 40.6 | 59.4 | 71.9 | 0.686 |
| `kimi-k2-0711-preview` | 70 | 30.0 | 44.3 | 65.7 | 0.631 |

### 3.5 Per model, article prose (GRADTEX)

| Model | n | @0.8533 | @0.8397 | @0.6256 | Tier 3 mean | rules mixed+ |
|---|---|---|---|---|---|---|
| `qwen3.5-27b` | 139 | 6.5 | 16.5 | 33.8 | 0.425 | 26.6 % |
| `gpt-5.4-mini` | 124 | 5.6 | 16.1 | 40.3 | 0.472 | 1.6 % |
| `gemma-4-e4b-it` | 115 | 5.2 | 14.8 | 40.9 | 0.469 | 16.5 % |
| `claude-sonnet-4.6` | 126 | 4.0 | 14.3 | 34.9 | 0.424 | 0.8 % |
| `gemini-3.5-flash` | 128 | 1.6 | 17.2 | 43.0 | 0.466 | 12.5 % |
| `gemma-4-31b-it` | 150 | 0.7 | 4.7 | 22.7 | 0.349 | 11.3 % |

`gemini-3.5-flash` is one of the three models the owner tested. At the shipped
threshold it is detected **1.6 %** of the time in article prose. Note also that
`claude-sonnet-4.6` scores 66.0 % as a chat reply and 4.0 % as article prose —
the same model, a 62-point swing driven purely by what it was asked to write.

### 3.6 Per model, forum narrative (August-2026 frontier)

| Model | n | @0.8533 | @0.8397 | @0.6256 | Tier 3 mean |
|---|---|---|---|---|---|
| `nvidia/nemotron-3.5-lightning` | 150 | 0.7 | 0.7 | 2.0 | 0.176 |
| `x-ai/grok-4.6` | 150 | 0.0 | 0.0 | 0.0 | 0.159 |
| `google/gemini-3.7-flash` | 150 | 0.0 | 0.0 | 0.7 | 0.158 |
| `deepseek/deepseek-v4-pro` | 150 | 0.0 | 0.0 | 0.0 | 0.156 |
| `z-ai/glm-5.3` | 150 | 0.0 | 0.0 | 0.0 | 0.154 |
| `openai/gpt-5.6-luna-pro` | 150 | 0.0 | 0.0 | 0.0 | 0.153 |
| `qwen/qwen3.8-max` | 150 | 0.0 | 0.0 | 0.0 | 0.153 |

Mean Tier 3 probability for these 1,050 samples is **0.159**, *below* the human
reference mean of 0.226. The detector does not merely miss this text — it rates
it as more human-like than our human corpus. The rules stack finds a mean of
0.84 signals per sample and classifies **0.0 %** as mixed-or-worse.

---

## 4. Is it the models or the register? A within-source control

The corpus above confounds era with register, so a control was built from the
one source that contains both old and new generators in the same register,
domains and pipeline: GRADTEX article prose.

`control-eval-set.jsonl`, 582 rows:

| Model | Released | n | @0.8533 | @0.8397 | @0.6256 | Tier 3 mean | rules mixed+ |
|---|---|---|---|---|---|---|---|
| `davinci-002` | 2021 | 150 | 0.0 | 11.3 | 44.0 | 0.506 | 0.0 % |
| `davinci-003` | Nov 2022 | 150 | 1.3 | 12.7 | 33.3 | 0.427 | 1.3 % |
| `gpt-3.5-turbo` | Nov 2022 | 150 | 5.3 | 20.0 | 46.7 | 0.504 | 1.3 % |
| `mistral-small-3.2-24b` | Jun 2025 | 132 | 7.6 | 18.9 | 37.9 | 0.447 | 18.9 % |
| — *2026 models, same source* — | 2026 | 782 | 3.8 | 13.7 | 35.4 | 0.431 | 11.8 % |

**Four-year-old models are detected no better than 2026 models in this
register.** `gpt-3.5-turbo` at 5.3 % versus 2026's 3.8 %; `davinci-002` at 0.0 %.
Meanwhile the same `gpt-3.5-turbo` generation in the HC3 chat corpus flags at
7.3 % and 2025-26 chat replies flag at 62.6 %.

The conclusion is uncomfortable but clear: **Tier 3 has essentially never worked
on article-style prose.** The strong headline numbers in `provider-eval` are a
property of the chat-reply register in which they were measured. Our published
accuracy figures do not describe last year's models so much as last year's
*register*.

---

## 5. Secondary probe — long-form prose, current models

EQ-Bench longform, 1,233 pieces across 32 models, median well above 1,000 words
(only pieces of 120–1,200 words were kept, up to 45 per model). Scores only;
text not redistributed. Register is literary fiction.

Overall: **22.4 / 54.9 / 82.6** at 0.8533 / 0.8397 / 0.6256, mean 0.737.

| Model | Released | n | @0.8533 | @0.8397 | @0.6256 | mean |
|---|---|---|---|---|---|---|
| `grok-4.1-fast` | Nov 2025 | 45 | 100.0 | 100.0 | 100.0 | 0.857 |
| `grok-4.20-beta` | Mar 2026 | 40 | 57.5 | 82.5 | 97.5 | 0.829 |
| `gemini-3-pro-preview` | Dec 2025 | 45 | 55.6 | 82.2 | 93.3 | 0.804 |
| `llama-4-maverick` *(newest Meta)* | Apr 2025 | 45 | 53.3 | 86.7 | 95.6 | 0.830 |
| `glm-5` | Mar 2026 | 45 | 48.9 | 68.9 | 93.3 | 0.811 |
| `gemini-3.5-flash` | May 2026 | 45 | 37.8 | 53.3 | 84.4 | 0.754 |
| `gemini-3.1-pro-preview` | Feb 2026 | 45 | 35.6 | 60.0 | 88.9 | 0.770 |
| `minimax-m2.5` | May 2026 | 45 | 24.4 | 53.3 | 86.7 | 0.766 |
| `claude-opus-4.8` | May 2026 | 45 | 22.2 | 31.1 | 71.1 | 0.658 |
| `mistral-small-4-2603` | Mar 2026 | 45 | 22.2 | 93.3 | 100.0 | 0.849 |
| `claude-fable-5` | Jun 2026 | 45 | 20.0 | 22.2 | 55.6 | 0.597 |
| `deepseek-v4-pro` | Apr 2026 | 36 | 19.4 | 36.1 | 80.6 | 0.715 |
| `kimi-k3` | Jul 2026 | 45 | 17.8 | 31.1 | 60.0 | 0.606 |
| `claude-sonnet-5` | Jun 2026 | 45 | 13.3 | 35.6 | 73.3 | 0.667 |
| `glm-5.3` | Aug 2026 | 45 | 8.9 | 22.2 | 53.3 | 0.557 |
| `mistral-large-3-2512` | Dec 2025 | 41 | 2.4 | 97.6 | 100.0 | 0.849 |
| `claude-opus-5` | Jul 2026 | 45 | **2.2** | **2.2** | **11.1** | **0.296** |
| `gpt-5.6-sol` | Jul 2026 | 45 | 0.0 | 60.0 | 93.3 | 0.794 |
| `gpt-5.6-terra` | Jul 2026 | 31 | 0.0 | 41.9 | 100.0 | 0.822 |

Two things stand out.

**`claude-opus-5` at mean 0.296.** That is close to the human reference mean of
0.226 and far below every other model here. On long-form prose, Claude Opus 5 is
effectively invisible to Tier 3.

**The 0.8533 threshold sits on a knife-edge.** Several models jump from ~2–22 %
at 0.8533 to 93–98 % at 0.8397 (`mistral-large-3`, `ministral-3-14b`,
`mistral-small-4`, `mistral-medium-3.1`, `gpt-5.6-sol`). Their probability mass
piles up in a 0.0136-wide band. A threshold chosen on 2025 chat data is landing
inside the mode of the 2026 long-form distribution, which makes the shipped
operating point unusually brittle. This is worth investigating independently of
the recency question.

Coverage caveat: `gpt-5-2025-08-07`, `gpt-5.2`, `gpt-5.4` and `gpt-5.5` produced
almost nothing inside the 120–1,200-word window (0, 0, 2 and 3 pieces) because
their chapters run longer. The OpenAI probe cells are therefore the short tail of
those models' output and are biased.

---

## 6. Verdict

**Has detection degraded on newer models?** Yes, but far less than the owner's
experience suggests, and the degradation is not the main problem.

- Chat replies, mid-2025 → early-2026 models: **−4.9 points** at the shipped
  threshold (62.6 → 57.7), **−5.3** for the Feb-2026 Anthropic slice at 0.8533
  and **−2.6** at 0.8397. Per provider the movement ranges from **+19.5**
  (anthropic) to **−25.2** (deepseek), with n from 21 to 432.
- Article prose: **3.8 %** recall on 2026 models — but **5.3 %** on
  `gpt-3.5-turbo` and **0.0 %** on `davinci-002` in the same dataset. This is a
  register failure that predates every model in question.
- Human-styled prose from August-2026 frontier models: **0.1 %** recall, mean
  probability *below* the human mean. Whether that is an era effect or a register
  effect cannot be separated — no old-model control exists in that corpus — but
  the instruction to imitate a human poster is doing at least part of the work,
  and probably most of it.

**What this means for the claims we publish.** Any accuracy figure quoted from
`provider-eval` should be described as "on chat-style assistant replies". Applied
to the pasted-article use case the plugin actually serves, the honest number is
single-digit recall at the shipped threshold, and has been all along. That is a
larger correction than anything the model-recency question raised.

**Confidence and limits.** Denominators are shown everywhere and several cells
are small (google chat-reply n=24, grok chat-reply n=21). The two era-clean
comparisons — chat reply across eras, and article prose across eras within
GRADTEX — both rest on n≥300 and are the two I would defend. The forum-narrative
result is large-n (1,050) but register-confounded. The probe is unlicensed,
fiction-only, and OpenAI-biased by the length filter.

---

## 7. Recommendations

1. **Re-describe the published figures by register** before anything else. This
   costs nothing and is the largest single correction available.
2. **Ask Sam Paech (EQ-Bench) for permission** to use and redistribute the
   longform run files. It is the only public source covering `claude-opus-5`,
   `claude-sonnet-5`, `gpt-5.6-*`, `gemini-3.5-flash` and `grok-4.20` in
   article-length prose, and it is already scored here.
3. **Investigate the 0.8533 operating point.** On 2026 long-form output, a large
   share of probability mass sits between 0.8397 and 0.8533. The shipped
   threshold may be brittle for reasons unrelated to model recency.
4. **Generate a register-matched corpus.** No public data contains business,
   marketing or SEO copy from current models, and that is the register the plugin
   serves. Costed from `https://openrouter.ai/api/v1/models` (2026-08-28), at
   200 input + 1,000 output tokens per call and 100 samples per family:
   about **$8.60** for all-flagship across eight families (worked example,
   `anthropic/claude-opus-5` at $5/$25 per M tokens: 100 × (0.0002 × 5 +
   0.001 × 25) = $2.60) or **$2.42** all-mid. Adding Mistral as a ninth family:
   $9.38 / $2.48. **But every 2026 flagship is a reasoning model and reasoning
   tokens bill as output**, so at minimum reasoning effort budget 3–8× that —
   call it **$50–75** for a clean, licence-unambiguous, register-matched corpus.
   That is the right next spend, and it is small.
5. **Add `OpAI-Bench1/OpAI-Bench`** (apache-2.0, 289k rows, `gpt-5.4`,
   ~800-word news/essay/report/abstract documents) as the next licence-clear
   article-prose source, filtering to `ai_token_ratio == 1.0`.
6. **Add `WUJUNCHAO/DetectRL-X`** (MIT) for the evasion axis — its models are
   old, but zero-width insertion, paraphrase and back-translation attacks are
   orthogonal to recency and we do not currently measure them.

---

## 8. Files

| File | What it is |
|---|---|
| `fetch_sources.sh` | Re-downloads all four ingested sources. No auth needed. |
| `run_all.sh` | Full reproduction end to end. |
| `build_current_set.py` | Builds `current-eval-set.jsonl`; enforces the quarantine. |
| `build_stripped.py` | Markdown-stripped variant via `stripped-eval/strip_markdown.py` (read-only). |
| `build_control_set.py` | Builds the GRADTEX register control. |
| `build_prose_probe.py` | Fetches and extracts the EQ-Bench probe **to `/tmp`**; text is deliberately not stored here. |
| `score_rules.mjs` | Shipped rules stack over any sample file. Copy of `provider-eval/score_rules.mjs` with input/output parameterised. |
| `score_tier3.py` | Shipped Tier 3 model over any sample file. Copy of `stripped-eval/score_tier3.py` with two extra passthrough fields. |
| `analyse.py` | Produces `analysis.json` and the console tables. |
| `current-eval-set.jsonl` | 3,133 current-model samples. |
| `current-eval-set-stripped.jsonl` | Same rows, markdown removed. |
| `control-eval-set.jsonl` | 582 register-control samples. |
| `tier3-raw / -stripped / -control.jsonl`, `rules-raw / -stripped / -control.jsonl` | Scores. |
| `analysis.json` | All figures in this document. |
| `strip-audit.json` | Per-sample stripping audit. |
| `raw/` | Downloaded sources (not committed if the repo ignores large binaries). |

Nothing outside this directory was modified. No git command was run.
